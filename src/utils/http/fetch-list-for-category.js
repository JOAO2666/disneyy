import { BASE_URL, API_KEY } from '@utils/http/constants'
import { getLang } from '@utils/i18n/i18n'

const langMap = { en: 'en-US', pt: 'pt-BR', es: 'es-ES', fr: 'fr-FR' }

export const fetchListForCategory = async ({ signal, resourceType, category }) => {
	const tmdbLang = langMap[getLang()] || 'en-US'
	try {
		const endpoint = resourceType === 'movie' ? 'discover/movie' : resourceType === 'series' ? 'discover/tv' : null

		if (!endpoint) {
			throw new Error('Invalid type.')
		}

		const response = await fetch(`${BASE_URL}/${endpoint}?with_watch_providers=337&with_genres=${category}&language=${tmdbLang}&api_key=${API_KEY}`, {
			signal,
		})

		if (!response.ok) {
			throw new Error('Failed to fetch data based on selected category.')
		}

		const data = await response.json()

		const filteredData = data.results
			.filter(item => item.poster_path)
			.map(item => ({
				...item,
			}))

		return filteredData
	} catch (error) {
		console.error('An error occurred while fetching resource list for category. Please try again later.')
		return null
	}
}
