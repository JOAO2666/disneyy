/**
 * Service to fetch direct streams from FrostStream and FENIXFLIX Stremio addons.
 */

/**
 * Helper to parse resolution/quality from a stream title.
 */
function getQualityFromTitle(text = '') {
	const t = text.toLowerCase()
	if (t.includes('2160p') || t.includes('4k') || t.includes('ultra hd')) return '4K'
	if (t.includes('1080p') || t.includes('fhd') || t.includes('full hd')) return '1080p'
	if (t.includes('720p') || t.includes('hd')) return '720p'
	if (t.includes('480p') || t.includes('sd')) return '480p'
	return 'HD'
}

/**
 * Helper to parse language/audio from a stream title.
 */
function getLangFromTitle(text = '') {
	const t = text.toLowerCase()
	if (t.includes('dublado') || t.includes('dub') || t.includes('dual') || t.includes('pt-br') || t.includes('portugues') || t.includes('português')) {
		return 'dub'
	}
	if (t.includes('legendado') || t.includes('leg') || t.includes('subbed') || t.includes('legendas')) {
		return 'leg'
	}
	return 'leg'
}

/**
 * Fetches streams from FrostStream and FENIXFLIX addons for a given IMDb or TMDB ID.
 * Filters out torrent/magnet streams to keep only direct playback streams.
 * 
 * @param {string} imdbId - The IMDb ID (e.g. tt1234567)
 * @param {'movie'|'series'} type - The media type
 * @param {number} [season] - The season number
 * @param {number} [episode] - The episode number
 * @param {string|number} [tmdbId] - The TMDB ID
 * @returns {Promise<Array>} List of structured stream objects
 */
export async function fetchAddonStreams(imdbId, type, season, episode, tmdbId) {
	const streams = []

	// Determine standard Stremio ID formats
	const id = type === 'series' && season != null && episode != null
		? `${imdbId}:${season}:${episode}`
		: imdbId

	const fenixId = id || (type === 'series' && season != null && episode != null ? `tmdb:${tmdbId}:${season}:${episode}` : `tmdb:${tmdbId}`)

	const promises = []

	// 1. FrostStream (if IMDb ID is present)
	if (imdbId && imdbId.startsWith('tt')) {
		const frostUrl = `https://froststream.cloutteam.com/stream/${type}/${id}.json`
		promises.push(
			fetch(frostUrl)
				.then(async (res) => {
					if (!res.ok) return []
					const data = await res.json()
					const rawStreams = data.streams || []
					return rawStreams
						.filter(s => s.url && s.url.startsWith('http') && !s.url.startsWith('magnet:'))
						.map(s => ({
							source: 'froststream',
							description: s.title || s.name || 'FrostStream Direct Stream',
							name: s.name || 'FrostStream',
							quality: getQualityFromTitle(s.title || s.name),
							lang: getLangFromTitle(s.title || s.name),
							url: s.url,
						}))
				})
				.catch((err) => {
					console.warn('FrostStream fetch failed:', err)
					return []
				})
		)
	}

	// 2. FENIXFLIX (supports IMDb ID or TMDB ID prefix)
	if (fenixId) {
		const fenixUrl = `https://fenixflix-ur9u.onrender.com/stream/${type}/${fenixId}.json`
		promises.push(
			fetch(fenixUrl)
				.then(async (res) => {
					if (!res.ok) return []
					const data = await res.json()
					const rawStreams = data.streams || []
					return rawStreams
						.filter(s => s.url && s.url.startsWith('http') && !s.url.startsWith('magnet:'))
						.map(s => ({
							source: 'fenixflix',
							description: s.title || s.name || 'FENIXFLIX Direct Stream',
							name: s.name || 'FENIXFLIX',
							quality: getQualityFromTitle(s.title || s.name),
							lang: getLangFromTitle(s.title || s.name),
							url: s.url,
						}))
				})
				.catch((err) => {
					console.warn('FENIXFLIX fetch failed:', err)
					return []
				})
		)
	}

	try {
		const results = await Promise.all(promises)
		// Flatten array
		results.forEach(resList => {
			streams.push(...resList)
		})
	} catch (e) {
		console.error('Error combining addon streams:', e)
	}

	return streams
}
