import React from 'react'
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined'
import SearchIcon from '@mui/icons-material/Search'
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd'
import LocalMoviesOutlinedIcon from '@mui/icons-material/LocalMoviesOutlined'
import MovieFilterOutlinedIcon from '@mui/icons-material/MovieFilterOutlined'
import { t } from '@utils/i18n/i18n'

export const menuItems = [
	{ text: t('nav.home'), path: '/disney-plus-clone/', icon: <HomeOutlinedIcon /> },
	{ text: t('nav.search'), path: '/disney-plus-clone/search', icon: <SearchIcon /> },
	{ text: t('nav.myList'), path: '/disney-plus-clone/mylist', icon: <PlaylistAddIcon /> },
	{ text: t('nav.movies'), path: '/disney-plus-clone/movie', icon: <LocalMoviesOutlinedIcon /> },
	{ text: t('nav.series'), path: '/disney-plus-clone/series', icon: <MovieFilterOutlinedIcon /> },
]
