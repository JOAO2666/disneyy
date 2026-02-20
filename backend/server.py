from fastapi import FastAPI, Query, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, Response
from urllib.parse import quote_plus
import requests
import time
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from netcine import search_link

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Type", "Content-Length", "Content-Range",
        "Accept-Ranges", "Content-Disposition",
    ],
)

TMDB_API_KEY = "35f3fea26d7c6bea37a8777ddbddbed3"
TMDB_BASE = "https://api.themoviedb.org/3"
TORRENTIO_BASE = "https://torrentio.strem.fun"
TORRENT_SERVER = "http://localhost:3001"  # Node.js WebTorrent server
CACHE_TTL = 3600  # 1 hora

executor = ThreadPoolExecutor(max_workers=4)

# ─── Torrent Streamer ─────────────────────────────────────────────────────────
try:
    from torrent_streamer import streamer
    TORRENT_AVAILABLE = True
    print("[OK] libtorrent disponivel - streaming de torrent ativo")
except ImportError:
    TORRENT_AVAILABLE = False
    streamer = None
    print("[AVISO] libtorrent nao disponivel - Torrentio retornara apenas metadados")

# ─── Cache ────────────────────────────────────────────────────────────────────
_cache = {}


def cache_get(key):
    entry = _cache.get(key)
    if entry and (time.time() - entry["ts"]) < CACHE_TTL:
        return entry["data"]
    if entry:
        del _cache[key]
    return None


def cache_set(key, data):
    _cache[key] = {"data": data, "ts": time.time()}


# ─── Helpers ──────────────────────────────────────────────────────────────────
_imdb_cache = {}


def get_imdb_id(tmdb_id: str, media_type: str) -> str:
    cache_key = f"imdb:{media_type}:{tmdb_id}"
    if cache_key in _imdb_cache:
        return _imdb_cache[cache_key]

    tmdb_type = "tv" if media_type == "series" else "movie"
    url = f"{TMDB_BASE}/{tmdb_type}/{tmdb_id}/external_ids?api_key={TMDB_API_KEY}"
    try:
        resp = requests.get(url, timeout=10)
        imdb_id = resp.json().get("imdb_id", "") or ""
        _imdb_cache[cache_key] = imdb_id
        return imdb_id
    except Exception:
        return ""


def build_proxy_url(stream):
    ph = stream.get("behaviorHints", {}).get("proxyHeaders", {}).get("request", {})
    return (
        f"/api/proxy?url={quote_plus(stream['url'])}"
        f"&referer={quote_plus(ph.get('Referer', ''))}"
        f"&cookie={quote_plus(ph.get('Cookie', ''))}"
        f"&ua={quote_plus(ph.get('User-Agent', ''))}"
    )


def format_streams(raw_streams):
    result = []
    for s in raw_streams:
        result.append({
            "url": build_proxy_url(s),
            "name": s.get("name", "NTC Server"),
            "description": s.get("description", ""),
            "lang": "dub" if "dublado" in s.get("description", "").lower() else "leg",
        })
    return result

import re

# ─── Torrentio API ────────────────────────────────────────────────────────────
def parse_torrentio_title(title: str, name: str = "") -> dict:
    """
    Extrai tamanho, seeders, qualidade e tracker do Torrentio.
    Formato do title (linhas):
      Linha 1: nome do arquivo (ex: The.Shawshank.Redemption.1994.2160p.BluRay)
      Linha 2: 👤 100 💾 6.91 GB ⚙️ YTS
    Formato do name:
      Torrentio\n4k HDR
    """
    info = {"size": "", "seeders": "", "quality": "", "tracker": ""}
    full_text = title or ""

    # Tamanho: 💾 N.N GB
    size_match = re.search(r'(\d+\.?\d*)\s*(GB|MB|TB)', full_text, re.IGNORECASE)
    if size_match:
        info["size"] = f"{size_match.group(1)} {size_match.group(2).upper()}"

    # Seeders: 👤 N  (emoji pessoa + numero)
    seeders_match = re.search(r'\U0001f464\s*(\d+)', full_text)
    if not seeders_match:
        # Fallback: primeiro numero na segunda linha
        lines = full_text.split('\n')
        if len(lines) >= 2:
            num_match = re.search(r'(\d+)', lines[1])
            if num_match:
                info["seeders"] = num_match.group(1)
    if seeders_match:
        info["seeders"] = seeders_match.group(1)

    # Tracker: ⚙️ nome  (engrenagem + texto)
    tracker_match = re.search(r'\u2699\ufe0f?\s*(.+?)$', full_text, re.MULTILINE)
    if tracker_match:
        info["tracker"] = tracker_match.group(1).strip()

    # Qualidade: extrair do campo name (ex: "Torrentio\n4k HDR")
    name_text = (name or "").lower()
    title_text = full_text.lower()
    combined = f"{name_text} {title_text}"

    quality_parts = []
    if "4k" in combined or "2160p" in combined or "uhd" in combined:
        quality_parts.append("4K")
    elif "1080p" in combined:
        quality_parts.append("1080p")
    elif "720p" in combined:
        quality_parts.append("720p")
    elif "480p" in combined:
        quality_parts.append("480p")

    if "hdr10+" in combined:
        quality_parts.append("HDR10+")
    elif "hdr" in combined:
        quality_parts.append("HDR")
    if " dv " in combined or "dolby vision" in combined:
        quality_parts.append("DV")

    info["quality"] = " ".join(quality_parts)

    return info


def fetch_torrentio(imdb_id: str, media_type: str,
                    season: str = None, episode: str = None) -> list:
    stremio_type = "series" if media_type == "series" else "movie"
    if stremio_type == "series" and season and episode:
        torrentio_url = f"{TORRENTIO_BASE}/stream/{stremio_type}/{imdb_id}:{season}:{episode}.json"
    else:
        torrentio_url = f"{TORRENTIO_BASE}/stream/{stremio_type}/{imdb_id}.json"

    try:
        resp = requests.get(torrentio_url, timeout=5, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        })
        if resp.status_code != 200:
            return []

        data = resp.json()
        raw_streams = data.get("streams", [])
        result = []

        for s in raw_streams:
            info_hash = s.get("infoHash", "")
            file_idx = s.get("fileIdx", -1)
            title = s.get("title", "")
            name = s.get("name", "Torrentio")
            direct_url = s.get("url", "")

            # Extrair detalhes (tamanho, seeders, qualidade, tracker)
            details = parse_torrentio_title(title, name)

            # Idioma
            tl = title.lower()
            if "dual" in tl or "dublado" in tl or "dub" in tl:
                lang = "dub"
            elif "leg" in tl or "sub" in tl:
                lang = "leg"
            else:
                lang = "leg"

            first_line = title.split("\n")[0].strip() if title else name

            base = {
                "name": name.split("\n")[0].strip() if name else "Torrentio",
                "description": first_line,
                "lang": lang,
                "source": "torrentio",
                "size": details["size"],
                "seeders": details["seeders"],
                "quality": details["quality"],
                "tracker": details["tracker"],
            }

            # CASO 1: URL direta (Debrid)
            if direct_url and direct_url.startswith("http"):
                base["url"] = (
                    f"/api/proxy?url={quote_plus(direct_url)}"
                    f"&referer=&cookie=&ua="
                )
                result.append(base)
                continue

            # CASO 2: Torrent (infoHash)
            if info_hash:
                trackers = []
                for source in s.get("sources", []):
                    if source.startswith("tracker:"):
                        trackers.append(source.replace("tracker:", ""))

                base["url"] = (
                    f"/api/torrent/play/{info_hash}"
                    f"?file_idx={file_idx}"
                    f"&trackers={quote_plus(','.join(trackers[:8]))}"
                )
                base["info_hash"] = info_hash
                result.append(base)

        return result
    except Exception as e:
        print(f"Erro ao buscar Torrentio: {e}")
        return []


# ─── Stream endpoints ─────────────────────────────────────────────────────────
@app.get("/api/streams/{media_type}/{tmdb_id}")
def get_streams(media_type: str, tmdb_id: str):
    cache_key = f"streams:{media_type}:{tmdb_id}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    imdb_id = get_imdb_id(tmdb_id, media_type)
    if not imdb_id:
        return {"streams": [], "error": "IMDb ID não encontrado"}

    # Buscar NetCine + Torrentio em PARALELO (Torrentio priorizado)
    all_streams = []
    def _fetch_netcine():
        try:
            return format_streams(search_link(imdb_id))
        except Exception as e:
            print(f"Erro NetCine: {e}")
            return []

    def _fetch_torrentio():
        try:
            return fetch_torrentio(imdb_id, media_type)
        except Exception as e:
            print(f"Erro Torrentio: {e}")
            return []

    with ThreadPoolExecutor(max_workers=2) as executor:
        f_tt = executor.submit(_fetch_torrentio)
        f_nc = executor.submit(_fetch_netcine)
        # Torrentio primeiro (rapido)
        all_streams.extend(f_tt.result())
        # NetCine com timeout curto de 3s para não travar
        try:
            nc_result = f_nc.result(timeout=3)
            all_streams.extend(nc_result)
        except Exception:
            print("NetCine timeout - ignorando")

    result = {"streams": all_streams, "imdb_id": imdb_id}
    cache_set(cache_key, result)
    return result


@app.get("/api/streams/{media_type}/{tmdb_id}/{season}/{episode}")
def get_series_streams(media_type: str, tmdb_id: str, season: str, episode: str):
    cache_key = f"streams:{media_type}:{tmdb_id}:{season}:{episode}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    imdb_id = get_imdb_id(tmdb_id, media_type)
    if not imdb_id:
        return {"streams": [], "error": "IMDb ID não encontrado"}

    # Buscar NetCine + Torrentio em PARALELO (Torrentio priorizado)
    all_streams = []
    def _fetch_netcine():
        try:
            return format_streams(search_link(f"{imdb_id}:{season}:{episode}"))
        except Exception as e:
            print(f"Erro NetCine: {e}")
            return []

    def _fetch_torrentio():
        try:
            return fetch_torrentio(imdb_id, media_type, season, episode)
        except Exception as e:
            print(f"Erro Torrentio: {e}")
            return []

    with ThreadPoolExecutor(max_workers=2) as executor:
        f_tt = executor.submit(_fetch_torrentio)
        f_nc = executor.submit(_fetch_netcine)
        all_streams.extend(f_tt.result())
        try:
            nc_result = f_nc.result(timeout=3)
            all_streams.extend(nc_result)
        except Exception:
            print("NetCine timeout - ignorando")

    result = {"streams": all_streams, "imdb_id": imdb_id}
    cache_set(cache_key, result)
    return result


# ─── TMDB metadata endpoints ─────────────────────────────────────────────────
@app.get("/api/episodes/{tmdb_id}/{season}")
def get_episodes(tmdb_id: str, season: str):
    url = f"{TMDB_BASE}/tv/{tmdb_id}/season/{season}?api_key={TMDB_API_KEY}&language=pt-BR"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        episodes = [{
            "episode_number": ep["episode_number"],
            "name": ep.get("name", f"Episódio {ep['episode_number']}"),
            "overview": ep.get("overview", ""),
            "still_path": ep.get("still_path", ""),
        } for ep in data.get("episodes", [])]
        return {"episodes": episodes, "season_number": data.get("season_number", season)}
    except Exception:
        return {"episodes": [], "error": "Falha ao buscar episódios"}


@app.get("/api/seasons/{tmdb_id}")
def get_seasons(tmdb_id: str):
    url = f"{TMDB_BASE}/tv/{tmdb_id}?api_key={TMDB_API_KEY}&language=pt-BR"
    try:
        resp = requests.get(url, timeout=10)
        data = resp.json()
        seasons = [{
            "season_number": s["season_number"],
            "name": s.get("name", f"Temporada {s['season_number']}"),
            "episode_count": s.get("episode_count", 0),
        } for s in data.get("seasons", []) if s["season_number"] > 0]
        return {"seasons": seasons, "name": data.get("name", "")}
    except Exception:
        return {"seasons": [], "error": "Falha ao buscar temporadas"}


# ─── Torrent play via Node.js WebTorrent server ──────────────────────────────
@app.get("/api/torrent/play/{info_hash}")
async def torrent_play(
    request: Request,
    info_hash: str,
    file_idx: int = Query(-1),
    trackers: str = Query(""),
):
    """
    Adiciona o torrent ao servidor Node.js WebTorrent local
    e faz proxy do stream de video.
    """
    info_hash = info_hash.lower().strip()

    # Construir magnet link
    tracker_list = [t.strip() for t in trackers.split(",") if t.strip()]
    magnet = f"magnet:?xt=urn:btih:{info_hash}"
    for tr in tracker_list:
        magnet += f"&tr={quote_plus(tr)}"

    try:
        # 1. Adicionar torrent ao servidor Node.js
        add_resp = requests.post(
            f"{TORRENT_SERVER}/api/torrents",
            json={"torrentId": magnet, "trackers": tracker_list},
            timeout=65,
        )

        if add_resp.status_code != 200:
            raise HTTPException(status_code=502, detail="Falha ao iniciar torrent")

        torrent_data = add_resp.json()
        actual_hash = torrent_data.get("infoHash", info_hash)

        # 2. Determinar arquivo para streaming
        files = torrent_data.get("files", [])
        video_exts = ('.mp4', '.mkv', '.avi', '.webm', '.mov', '.m4v', '.ts')
        target_idx = file_idx

        if target_idx < 0 or target_idx >= len(files):
            # Encontrar maior arquivo de video
            best = (-1, 0)
            for f in files:
                if any(f["name"].lower().endswith(e) for e in video_exts):
                    if f["size"] > best[1]:
                        best = (f["index"], f["size"])
            target_idx = best[0] if best[0] >= 0 else 0

        # 3. Proxy do stream de video do Node.js server
        stream_url = f"{TORRENT_SERVER}/api/torrents/{actual_hash}/files/{target_idx}/stream"

        proxy_headers = {}
        range_header = request.headers.get("range")
        if range_header:
            proxy_headers["Range"] = range_header

        stream_resp = requests.get(
            stream_url,
            headers=proxy_headers,
            stream=True,
            timeout=120,
        )

        response_headers = {
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
        }
        ct = stream_resp.headers.get("Content-Type", "video/mp4")
        cl = stream_resp.headers.get("Content-Length")
        cr = stream_resp.headers.get("Content-Range")
        if cl:
            response_headers["Content-Length"] = cl
        if cr:
            response_headers["Content-Range"] = cr

        return StreamingResponse(
            stream_resp.iter_content(chunk_size=512 * 1024),
            status_code=stream_resp.status_code,
            media_type=ct,
            headers=response_headers,
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro torrent play: {e}")
        raise HTTPException(status_code=502, detail=f"Erro ao iniciar stream: {str(e)}")


# ─── Torrent stats proxy ─────────────────────────────────────────────────────
@app.get("/api/torrent/stats/{info_hash}")
def torrent_stats(info_hash: str):
    """Proxy stats from Node.js WebTorrent server."""
    info_hash = info_hash.lower().strip()
    try:
        resp = requests.get(
            f"{TORRENT_SERVER}/api/torrents/{info_hash}",
            timeout=5,
        )
        if resp.status_code == 200:
            return resp.json()
        return {"peers": 0, "downloadSpeed": 0, "progress": 0, "infoHash": info_hash}
    except Exception:
        return {"peers": 0, "downloadSpeed": 0, "progress": 0, "infoHash": info_hash}


# ─── Subtitles via OpenSubtitles ──────────────────────────────────────────────
@app.get("/api/subtitles/{imdb_id}")
def get_subtitles(imdb_id: str, lang: str = "pob"):
    """
    Busca legendas do OpenSubtitles.
    lang: pob = Portugues (Brasil), por = Portugues (Portugal), eng = English
    """
    cache_key = f"subs:{imdb_id}:{lang}"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    try:
        # Usar a API REST do OpenSubtitles
        search_url = f"https://rest.opensubtitles.org/search/imdbid-{imdb_id.replace('tt', '')}/sublanguageid-{lang}"
        resp = requests.get(search_url, timeout=10, headers={
            "User-Agent": "TemporaryUserAgent",
            "Accept": "application/json",
        })

        if resp.status_code != 200:
            return {"subtitles": []}

        data = resp.json()
        subs = []
        seen = set()

        for item in data[:20]:  # Limitar a 20 resultados
            sub_url = item.get("SubDownloadLink", "")
            name = item.get("SubFileName", "")
            lang_name = item.get("LanguageName", lang)
            rating = item.get("SubRating", "0")

            if sub_url and sub_url not in seen:
                seen.add(sub_url)
                # Converter .gz para URL direta de SRT
                srt_url = sub_url.replace(".gz", "")
                subs.append({
                    "url": f"/api/proxy?url={quote_plus(srt_url)}&referer=&cookie=&ua=",
                    "name": name,
                    "lang": lang_name,
                    "rating": rating,
                })

        result = {"subtitles": subs}
        cache_set(cache_key, result)
        return result

    except Exception as e:
        print(f"Erro ao buscar legendas: {e}")
        return {"subtitles": []}



# ─── Video proxy ──────────────────────────────────────────────────────────────
def _build_upstream_headers(ua: str, referer: str, cookie: str) -> dict:
    headers = {
        "User-Agent": ua or "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    if referer:
        headers["Referer"] = referer
    if cookie:
        headers["Cookie"] = cookie
    return headers


@app.head("/api/proxy")
async def proxy_head(
    request: Request,
    url: str = Query(...),
    referer: str = Query(""),
    cookie: str = Query(""),
    ua: str = Query(""),
):
    headers = _build_upstream_headers(ua, referer, cookie)
    try:
        resp = requests.head(url, headers=headers, timeout=15, allow_redirects=True)
        return Response(
            content=b"",
            status_code=200,
            headers={
                "Content-Type": resp.headers.get("Content-Type", "video/mp4"),
                "Content-Length": resp.headers.get("Content-Length", "0"),
                "Accept-Ranges": "bytes",
                "Access-Control-Allow-Origin": "*",
            },
        )
    except Exception:
        return Response(content=b"", status_code=200, headers={
            "Accept-Ranges": "bytes",
            "Content-Type": "video/mp4",
            "Access-Control-Allow-Origin": "*",
        })


@app.get("/api/proxy")
async def proxy_stream(
    request: Request,
    url: str = Query(...),
    referer: str = Query(""),
    cookie: str = Query(""),
    ua: str = Query(""),
):
    if not url:
        raise HTTPException(status_code=400, detail="URL is required")

    headers = _build_upstream_headers(ua, referer, cookie)

    range_header = request.headers.get("range")
    if range_header:
        headers["Range"] = range_header

    try:
        resp = requests.get(url, headers=headers, stream=True, timeout=30, allow_redirects=True)

        response_headers = {
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": "*",
        }
        cl = resp.headers.get("Content-Length")
        cr = resp.headers.get("Content-Range")
        if cl:
            response_headers["Content-Length"] = cl
        if cr:
            response_headers["Content-Range"] = cr

        return StreamingResponse(
            resp.iter_content(chunk_size=512 * 1024),
            status_code=resp.status_code,
            media_type=resp.headers.get("Content-Type", "video/mp4"),
            headers=response_headers,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Proxy error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
