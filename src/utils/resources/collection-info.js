import { t } from '@utils/i18n/i18n'

export const collectionInfo = {
	disney: {
		fetchQuery: 'discover/movie?with_companies=2',
		mediaType: 'movie',
		collectionHeader: t('collections.disney'),
	},
	pixar: {
		fetchQuery: 'discover/movie?with_companies=3',
		mediaType: 'movie',
		collectionHeader: t('collections.pixar'),
	},
	marvel: {
		fetchQuery: 'discover/movie?with_companies=420',
		mediaType: 'movie',
		collectionHeader: t('collections.marvel'),
	},
	starwars: {
		fetchQuery: 'search/movie?query=star%20wars',
		mediaType: 'movie',
		collectionHeader: t('collections.starWars'),
	},
	nationalgeographic: {
		fetchQuery: 'discover/movie?with_companies=7521',
		mediaType: 'movie',
		collectionHeader: t('collections.nationalGeographic'),
	},
	star: {
		fetchQuery: 'discover/tv?with_networks=2739',
		mediaType: 'series',
		collectionHeader: t('collections.star'),
	},
}
