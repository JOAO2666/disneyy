import { BASE_URL, API_KEY } from '@utils/http/constants'
import { getLang } from '@utils/i18n/i18n'

const langMap = { en: 'en-US', pt: 'pt-BR', es: 'es-ES', fr: 'fr-FR' }

export const fetchDetailsFromId = async ({ signal, detailsId, resourceType }) => {
	const tmdbLang = langMap[getLang()] || 'en-US'
	try {
		const response = await fetch(`${BASE_URL}/${resourceType}/${detailsId}?api_key=${API_KEY}&language=${tmdbLang}&append_to_response=videos,images&include_image_language=en,null&include_video_language=en,pt,es,fr,null`, {
			signal,
		})

		if (!response.ok) {
			throw new Error('Failed to fetch details.')
		}

		const data = await response.json()

		const filteredData = {
			releaseDate: data.release_date || data.first_air_date,
			genres: data.genres.map(genre => genre.name),
			videoResults: data.videos.results,
			logos: data.images.logos,
			backdrops: data.images.backdrops || data.images.backdrop_path,
			title: data.title || data.name,
			numberOfSeasons: data.number_of_seasons,
			overview: data.overview,
			posterPath: data.poster_path,
		}

		if (filteredData.backdrops && filteredData.backdrops.length === 0) {
			filteredData.backdrops = null
		}

		return filteredData
	} catch (error) {
		console.error('An error occurred while fetching details. Please try again later.')
		return null
	}
}
