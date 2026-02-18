import { t, getLang } from '@utils/i18n/i18n'

export const BASE_URL = 'https://api.themoviedb.org/3'
export const API_KEY = '35f3fea26d7c6bea37a8777ddbddbed3'

const tmdbLang = (() => {
	const lang = getLang()
	const map = { en: 'en-US', pt: 'pt-BR', es: 'es-ES', fr: 'fr-FR' }
	return map[lang] || 'en-US'
})()

export const categories = [
	{
		category: 'popular-movies',
		type: 'movie',
		title: t('categories.popularMovies'),
		path: `${BASE_URL}/discover/movie?with_watch_providers=337&watch_region=US&language=${tmdbLang}&sort_by=popularity.desc&api_key=${API_KEY}`,
	},
	{
		category: 'popular-series',
		type: 'series',
		title: t('categories.popularSeries'),
		path: `${BASE_URL}/discover/tv?with_watch_providers=337&watch_region=US&language=${tmdbLang}&sort_by=popularity.desc&api_key=${API_KEY}`,
	},
	{
		category: 'upcoming-movies',
		type: 'movie',
		title: t('categories.upcomingMovies'),
		path: `${BASE_URL}/movie/upcoming?region=US&language=${tmdbLang}&api_key=${API_KEY}`,
	},
	{
		category: 'top-rated-movies',
		type: 'movie',
		title: t('categories.topRatedMovies'),
		path: `${BASE_URL}/movie/top_rated?region=US&language=${tmdbLang}&api_key=${API_KEY}`,
	},
	{
		category: 'top-rated-series',
		type: 'series',
		title: t('categories.topRatedSeries'),
		path: `${BASE_URL}/tv/top_rated?region=US&language=${tmdbLang}&api_key=${API_KEY}`,
	},
]
