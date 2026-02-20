/**
 * Busca streams do addon Torrentio (Stremio) - mostra links instantaneamente como no Stremio.
 * Torrentio: https://torrentio.strem.fun/language=portuguese/manifest.json
 */

const TORRENTIO_BASE = 'https://torrentio.strem.fun/language=portuguese'

/**
 * Converte resposta do Torrentio para o formato usado pelo modal/player.
 * @param {string} imdbId - ex: tt0137523
 * @param {'movie'|'series'} type
 * @param {number} [season]
 * @param {number} [episode]
 * @returns {Promise<{ streams: Array, imdb_id: string }>}
 */
export async function fetchTorrentioStreams(imdbId, type, season, episode) {
	if (!imdbId || !imdbId.startsWith('tt')) {
		return { streams: [], imdb_id: imdbId || '' }
	}

	let path
	if (type === 'series' && season != null && episode != null) {
		path = `stream/series/${imdbId}:${season}:${episode}.json`
	} else if (type === 'movie') {
		path = `stream/movie/${imdbId}.json`
	} else {
		return { streams: [], imdb_id: imdbId }
	}

	const url = `${TORRENTIO_BASE}/${path}`
	const resp = await fetch(url)
	if (!resp.ok) return { streams: [], imdb_id: imdbId }

	const data = await resp.json()
	const rawStreams = data.streams || []

	const streams = rawStreams.map((s) => {
		const infoHash = s.infoHash || ''
		const trackers = s.sources || []
		const tr = trackers.map((t) => `&tr=${encodeURIComponent(t)}`).join('')
		const magnet = infoHash ? `magnet:?xt=urn:btih:${infoHash}${tr}` : ''

		return {
			source: 'torrentio',
			description: s.title || s.name || `${s.tag || 'Stream'}`,
			name: s.name || s.title,
			quality: s.tag || null,
			lang: (s.title || '').toLowerCase().includes('dublado') ? 'dub' : 'leg',
			size: s.size || null,
			seeders: s.seeders ?? null,
			tracker: Array.isArray(s.sources) && s.sources[0] ? s.sources[0].replace(/^https?:\/\//, '').split('/')[0] : null,
			url: magnet,
			infoHash,
			fileIdx: s.fileIdx != null ? s.fileIdx : -1,
		}
	})

	return { streams, imdb_id: imdbId }
}
