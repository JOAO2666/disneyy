export const customMovies = {
	hamnet: {
		id: 'hamnet',
		tmdbId: '858024',
		title: 'Hamnet - A Vida Antes de Hamlet',
		year: 2025,
		genres: 'Drama, Histórico',
		overview:
			'Baseado no aclamado romance de Maggie O\'Farley, o filme explora a história da família de William Shakespeare e a perda devastadora de seu filho Hamnet, que inspirou a criação de uma das maiores obras da literatura mundial. Uma história comovente sobre amor, luto e o poder transformador da arte.',
		backdropUrl:
			'https://image.tmdb.org/t/p/original/iIvQnZyzgx9TkbrOgcXx0p7aLiq.jpg',
		posterUrl:
			'https://image.tmdb.org/t/p/original/iIvQnZyzgx9TkbrOgcXx0p7aLiq.jpg',
		driveFileId: '1TF6KC_y1L5id9MIwTJKGgpB7MEVfni3M',
		quality: '1080p WEB-DL',
		audio: 'DUAL 5.1',
	},
}

export const findMovieByTmdbId = (tmdbId) => {
	return Object.values(customMovies).find(movie => movie.tmdbId === String(tmdbId))
}

export const getPlayerUrl = (movie) => {
	const encodedName = encodeURIComponent(movie.title)
	const encodedDriveId = encodeURIComponent(movie.driveFileId)
	return `/disney-plus-clone/disney-player/index.html?nome=${encodedName}&drive=${encodedDriveId}`
}

export const getDriveEmbedUrl = (fileId) => {
	return `https://drive.google.com/file/d/${fileId}/preview`
}
