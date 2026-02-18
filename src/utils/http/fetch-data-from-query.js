import { BASE_URL, API_KEY } from '@utils/http/constants'
import { getLang } from '@utils/i18n/i18n'

const langMap = { en: 'en-US', pt: 'pt-BR', es: 'es-ES', fr: 'fr-FR' }

export const fetchDataFromQuery = async ({ signal, query }) => {
	const tmdbLang = langMap[getLang()] || 'en-US'
	try {
		const response = await fetch(`${BASE_URL}/search/multi?query=${query}&language=${tmdbLang}&api_key=${API_KEY}`, { signal })

		if (!response.ok) {
			throw new Error('Failed to fetch data based on entered query.')
		}
		const data = await response.json()

		const filteredData = data.results
			.filter(item => (item.media_type === 'movie' || item.media_type === 'tv') && item.poster_path)
			.map(item => ({
				...item,
				media_type: item.media_type === 'movie' ? 'movie' : 'series',
			}))

		return filteredData
	} catch (error) {
		console.error('An error occurred while fetching search results. Please try again later.')
		return null
	}
}
