"""
Torrent Streamer – usa libtorrent para baixar torrents sequencialmente
e servir o vídeo via HTTP (StreamingResponse do FastAPI).
"""

import libtorrent as lt
import os
import time
import tempfile
import threading
from pathlib import Path

VIDEO_EXTENSIONS = {'.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm', '.m4v', '.ts'}

DOWNLOAD_DIR = os.path.join(tempfile.gettempdir(), 'torrent_streams')
os.makedirs(DOWNLOAD_DIR, exist_ok=True)


class TorrentStreamer:
    """Gerencia uma sessão libtorrent e torrents ativos."""

    def __init__(self):
        settings = {
            'user_agent': 'libtorrent/2.0',
            'listen_interfaces': '0.0.0.0:6881',
            'enable_dht': True,
            'enable_lsd': True,
            'enable_natpmp': True,
            'enable_upnp': True,
            'anonymous_mode': False,
            'connections_limit': 200,
            'download_rate_limit': 0,   # sem limite
            'upload_rate_limit': 50000, # ~50 KB/s upload
        }
        self.session = lt.session(settings)
        self.session.add_dht_router('router.utorrent.com', 6881)
        self.session.add_dht_router('router.bittorrent.com', 6881)
        self.session.add_dht_router('dht.transmissionbt.com', 6881)
        self.session.add_dht_router('router.bitcomet.com', 6881)

        self.torrents = {}      # info_hash -> handle
        self.torrent_info = {}  # info_hash -> {file_idx, file_path, added_at, ...}
        self._lock = threading.Lock()

        # Thread de limpeza
        self._cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self._cleanup_thread.start()

    def start_torrent(self, info_hash: str, file_idx: int = -1,
                      trackers: list = None) -> dict:
        """
        Inicia ou retoma um torrent.

        Args:
            info_hash: Hash do torrent (hexadecimal, 40 chars)
            file_idx: Índice do arquivo de vídeo dentro do torrent (-1 = auto)
            trackers: Lista de URLs de trackers

        Returns:
            dict com status do torrent
        """
        info_hash = info_hash.lower().strip()

        with self._lock:
            if info_hash in self.torrents:
                return self._get_status(info_hash)

        # Construir magnet link
        magnet = f"magnet:?xt=urn:btih:{info_hash}"
        if trackers:
            for tracker in trackers:
                magnet += f"&tr={tracker}"

        # Criar diretório específico para este torrent
        save_path = os.path.join(DOWNLOAD_DIR, info_hash[:16])
        os.makedirs(save_path, exist_ok=True)

        params = lt.parse_magnet_uri(magnet)
        params.save_path = save_path
        params.flags |= lt.torrent_flags.sequential_download

        handle = self.session.add_torrent(params)
        handle.set_flags(lt.torrent_flags.sequential_download)

        with self._lock:
            self.torrents[info_hash] = handle
            self.torrent_info[info_hash] = {
                'file_idx': file_idx,
                'file_path': None,
                'save_path': save_path,
                'added_at': time.time(),
                'last_access': time.time(),
            }

        # Esperar metadados em background
        threading.Thread(
            target=self._wait_metadata,
            args=(info_hash,),
            daemon=True
        ).start()

        return self._get_status(info_hash)

    def _wait_metadata(self, info_hash: str):
        """Espera os metadados do torrent e configura prioridades."""
        handle = self.torrents.get(info_hash)
        if not handle:
            return

        # Esperar até 60 segundos pelos metadados
        for _ in range(120):
            if handle.has_metadata():
                break
            time.sleep(0.5)

        if not handle.has_metadata():
            return

        ti = handle.get_torrent_info()
        file_idx = self.torrent_info[info_hash]['file_idx']

        # Se file_idx == -1, selecionar o maior arquivo de vídeo
        if file_idx < 0:
            best_idx = -1
            best_size = 0
            for i in range(ti.num_files()):
                f = ti.files().file_path(i)
                ext = os.path.splitext(f)[1].lower()
                size = ti.files().file_size(i)
                if ext in VIDEO_EXTENSIONS and size > best_size:
                    best_idx = i
                    best_size = size
            if best_idx < 0:
                # Sem arquivo de vídeo encontrado, pegar o maior arquivo
                for i in range(ti.num_files()):
                    size = ti.files().file_size(i)
                    if size > best_size:
                        best_idx = i
                        best_size = size
            file_idx = max(best_idx, 0)

        # Configurar prioridades: só baixar o arquivo desejado
        num_files = ti.num_files()
        priorities = [0] * num_files
        priorities[file_idx] = 7  # máxima prioridade
        handle.prioritize_files(priorities)

        # Priorizar as primeiras peças do arquivo
        self._prioritize_first_pieces(handle, ti, file_idx)

        # Salvar informações do arquivo
        file_path = os.path.join(
            self.torrent_info[info_hash]['save_path'],
            ti.files().file_path(file_idx)
        )

        with self._lock:
            self.torrent_info[info_hash]['file_idx'] = file_idx
            self.torrent_info[info_hash]['file_path'] = file_path
            self.torrent_info[info_hash]['file_size'] = ti.files().file_size(file_idx)

    def _prioritize_first_pieces(self, handle, ti, file_idx):
        """Prioriza as primeiras peças do arquivo para início rápido."""
        fs = ti.files()
        file_offset = fs.file_offset(file_idx)
        file_size = fs.file_size(file_idx)
        piece_length = ti.piece_length()

        first_piece = file_offset // piece_length
        num_pieces_total = ti.num_pieces()

        # Priorizar as primeiras 50 peças (ou ~10MB, o que vier primeiro)
        pieces_to_prioritize = min(50, (10 * 1024 * 1024) // piece_length + 1)

        # Também priorizar as últimas peças (para o moov atom dos MP4)
        last_piece = min(
            (file_offset + file_size) // piece_length,
            num_pieces_total - 1
        )

        for i in range(num_pieces_total):
            if first_piece <= i < first_piece + pieces_to_prioritize:
                handle.piece_priority(i, 7)
            elif last_piece - 5 <= i <= last_piece:
                handle.piece_priority(i, 7)

    def get_status(self, info_hash: str) -> dict:
        """Retorna o status atual do torrent."""
        info_hash = info_hash.lower().strip()
        with self._lock:
            if info_hash in self.torrent_info:
                self.torrent_info[info_hash]['last_access'] = time.time()
            return self._get_status(info_hash)

    def _get_status(self, info_hash: str) -> dict:
        """Status interno (sem lock)."""
        handle = self.torrents.get(info_hash)
        if not handle:
            return {'error': 'Torrent não encontrado', 'state': 'not_found'}

        s = handle.status()
        info = self.torrent_info.get(info_hash, {})

        state_map = {
            0: 'queued',
            1: 'checking',
            2: 'downloading_metadata',
            3: 'downloading',
            4: 'finished',
            5: 'seeding',
            6: 'allocating',
            7: 'checking_resume',
        }

        result = {
            'info_hash': info_hash,
            'state': state_map.get(s.state, 'unknown'),
            'progress': round(s.progress * 100, 1),
            'download_rate': s.download_rate,
            'download_rate_human': f"{s.download_rate / 1024:.0f} KB/s",
            'upload_rate': s.upload_rate,
            'num_peers': s.num_peers,
            'num_seeds': s.num_seeds,
            'has_metadata': handle.has_metadata(),
            'file_path': info.get('file_path'),
            'file_size': info.get('file_size', 0),
        }

        # Verificar se já temos buffer suficiente para streaming
        if handle.has_metadata() and info.get('file_path'):
            file_path = info['file_path']
            if os.path.exists(file_path):
                downloaded = os.path.getsize(file_path)
                result['downloaded_bytes'] = downloaded
                # Pronto para streaming quando tiver pelo menos 5MB ou 2%
                min_buffer = min(5 * 1024 * 1024, info.get('file_size', 0) * 0.02)
                result['ready'] = downloaded >= min_buffer
            else:
                result['downloaded_bytes'] = 0
                result['ready'] = False
        else:
            result['downloaded_bytes'] = 0
            result['ready'] = False

        return result

    def get_file_path(self, info_hash: str) -> str | None:
        """Retorna o caminho do arquivo de vídeo, se disponível."""
        info_hash = info_hash.lower().strip()
        with self._lock:
            info = self.torrent_info.get(info_hash)
            if info:
                info['last_access'] = time.time()
                return info.get('file_path')
        return None

    def get_file_size(self, info_hash: str) -> int:
        """Retorna o tamanho total do arquivo."""
        info_hash = info_hash.lower().strip()
        with self._lock:
            info = self.torrent_info.get(info_hash)
            if info:
                return info.get('file_size', 0)
        return 0

    def stop_torrent(self, info_hash: str):
        """Para e remove um torrent."""
        info_hash = info_hash.lower().strip()
        with self._lock:
            handle = self.torrents.pop(info_hash, None)
            self.torrent_info.pop(info_hash, None)
        if handle:
            self.session.remove_torrent(handle)

    def _cleanup_loop(self):
        """Remove torrents inativos há mais de 30 minutos."""
        while True:
            time.sleep(60)
            now = time.time()
            to_remove = []
            with self._lock:
                for ih, info in self.torrent_info.items():
                    if now - info['last_access'] > 1800:  # 30 min
                        to_remove.append(ih)
            for ih in to_remove:
                self.stop_torrent(ih)


# Instância global
streamer = TorrentStreamer()
