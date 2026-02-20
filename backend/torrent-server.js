import express from 'express';
import cors from 'cors';
import WebTorrent from 'webtorrent';

const app = express();
const PORT = 3001;

// WebTorrent - download only, zero upload
const client = new WebTorrent({
    uploadLimit: 0,
    maxConns: 50,
    dht: true,
    lsd: true,
    tracker: {
        announce: false,
        getAnnounceOpts: () => ({ uploaded: 0, downloaded: 0, numwant: 10 })
    }
});

const torrents = {};

app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── Helper: carregar ou recuperar torrent ────────────────────────────────────
function getOrLoadTorrent(magnetOrHash, trackers = []) {
    return new Promise((resolve, reject) => {
        const existing = client.torrents.find(t =>
            t.infoHash === magnetOrHash ||
            (magnetOrHash.includes && magnetOrHash.includes(t.infoHash))
        );

        if (existing) {
            torrents[existing.infoHash] = existing;
            resolve(existing);
            return;
        }

        let torrentId = magnetOrHash;
        if (/^[a-f0-9]{40}$/i.test(magnetOrHash)) {
            torrentId = `magnet:?xt=urn:btih:${magnetOrHash}`;
            trackers.forEach(tr => {
                torrentId += `&tr=${encodeURIComponent(tr)}`;
            });
        }

        const torrent = client.add(torrentId, { upload: false, maxConns: 20 });

        torrent.on('ready', () => {
            torrents[torrent.infoHash] = torrent;
            torrent.addedAt = Date.now();

            const videoExts = ['mp4', 'mkv', 'avi', 'webm', 'mov', 'm4v', 'ts'];
            torrent.files.forEach(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                if (videoExts.includes(ext)) {
                    file.select();
                } else {
                    file.deselect();
                }
            });

            resolve(torrent);
        });

        torrent.on('error', (err) => reject(err));
        setTimeout(() => reject(new Error('Timeout carregando torrent')), 60000);
    });
}

// ─── Endpoints ───────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
    res.json({ status: 'ok', torrents: Object.keys(torrents).length });
});

app.post('/api/torrents', async (req, res) => {
    const { torrentId, trackers } = req.body;
    if (!torrentId) return res.status(400).json({ error: 'torrentId required' });

    try {
        const torrent = await getOrLoadTorrent(torrentId, trackers || []);
        const files = torrent.files.map((file, i) => ({
            index: i,
            name: file.name,
            size: file.length,
            progress: file.progress,
        }));

        res.json({
            infoHash: torrent.infoHash,
            name: torrent.name,
            size: torrent.length,
            files,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/torrents/:hash', (req, res) => {
    const torrent = torrents[req.params.hash];
    if (!torrent) return res.status(404).json({ error: 'Not found' });

    const files = torrent.files.map((file, i) => ({
        index: i,
        name: file.name,
        size: file.length,
        downloaded: file.downloaded,
        progress: file.progress,
    }));

    res.json({
        infoHash: torrent.infoHash,
        name: torrent.name,
        size: torrent.length,
        downloaded: torrent.downloaded,
        progress: torrent.progress,
        downloadSpeed: torrent.downloadSpeed,
        peers: torrent.numPeers,
        files,
    });
});

app.get('/api/torrents/:hash/files/:fileIdx/stream', (req, res) => {
    const torrent = torrents[req.params.hash];
    if (!torrent) return res.status(404).json({ error: 'Torrent not found' });

    const fileIdx = parseInt(req.params.fileIdx, 10);
    const file = torrent.files[fileIdx];
    if (!file) return res.status(404).json({ error: 'File not found' });

    torrent.resume();
    file.select();

    const range = req.headers.range;

    if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : file.length - 1;
        const chunkSize = end - start + 1;

        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${file.length}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
        });

        const stream = file.createReadStream({ start, end });
        stream.pipe(res);
        stream.on('error', () => res.end());
        res.on('close', () => stream.destroy());
    } else {
        res.writeHead(200, {
            'Content-Length': file.length,
            'Content-Type': 'video/mp4',
            'Access-Control-Allow-Origin': '*',
        });

        const stream = file.createReadStream();
        stream.pipe(res);
        stream.on('error', () => res.end());
        res.on('close', () => stream.destroy());
    }
});

app.delete('/api/torrents/:hash', (req, res) => {
    const torrent = torrents[req.params.hash];
    if (!torrent) return res.status(404).json({ error: 'Not found' });

    client.remove(torrent, { destroyStore: true }, () => {
        delete torrents[req.params.hash];
        res.json({ ok: true });
    });
});

// Cleanup: remove torrents inativos (>30 min)
setInterval(() => {
    const now = Date.now();
    Object.entries(torrents).forEach(([hash, torrent]) => {
        if (torrent.addedAt && (now - torrent.addedAt) > 30 * 60 * 1000) {
            client.remove(torrent, { destroyStore: true }, () => {
                delete torrents[hash];
                console.log(`Cleanup: removido ${hash}`);
            });
        }
    });
}, 5 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Torrent server rodando em http://localhost:${PORT}`);
    console.log('WebTorrent ativo - download only, zero upload');
});
