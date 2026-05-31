import { useState, useCallback, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useSelector } from 'react-redux'

import { fetchDetailsFromId } from '@utils/http/fetch-details-from-id'
import useScroll from '@hooks/use-scroll'
import { detailsData } from '@utils/details/details-data'
import useDetail from '@hooks/use-detail'
import useVideo from '@hooks/use-video'

import Container from '@components/ui/Container'
import Loader from '@components/ui/Loader'
import ErrorBlock from '@components/ui/ErrorBlock'
import { t } from '@utils/i18n/i18n'
import DetailBackgroundImage from '@components/ui/DetailBackgroundImage'
import { MotionContainer } from '@components/ui/MotionContainer'
import DetailLogo from '@components/ui/DetailLogo'
import Controls from '@components/ui/Controls'
import DetailParagraph from '@components/ui/DetailParagraph'
import DetailDescription from '@components/ui/DetailDescription'
import BackButton from '@components/ui/BackButton'
import VideoPlayer from '@components/VideoPlayer'
import UnifiedPlayer from '@components/UnifiedPlayer'
import StreamModal from '@components/StreamModal'
import StreamSelectionModal from '@components/StreamSelectionModal'
import ErrorPage from '@pages/Error'

const Details = ({ type }) => {
	const params = useParams()
	const id = params.id

	const { data, isPending, isError } = useQuery({
		queryKey: [`${type}-data`, id],
		queryFn: ({ signal }) => fetchDetailsFromId({ signal, detailsId: id, resourceType: type }),
	})

	useScroll()

	let detailsInfo = {}
	if (data) {
		detailsInfo = detailsData(data)
	}

	const { isAddedToWatchList, addToWatchListHandler, removeFromWatchListHandler } = useDetail({
		type,
		id,
		data,
	})

	const { videoIsVisible, videoHandler, closeVideoHandler } = useVideo()

	// Player state
	const [playerVisible, setPlayerVisible] = useState(false)
	const [playerStreams, setPlayerStreams] = useState([])
	const [playerTitle, setPlayerTitle] = useState('')

	// Stream selection modal state
	const [streamSelectionOpen, setStreamSelectionOpen] = useState(false)
	const [streamSelectionSeason, setStreamSelectionSeason] = useState(null)
	const [streamSelectionEpisode, setStreamSelectionEpisode] = useState(null)

	// Series season/episode picker state
	const [streamModalOpen, setStreamModalOpen] = useState(false)

	// Playback progress persistence
	const user = useSelector(state => state.user.user)
	const uid = user?.uid
	const [savedProgress, setSavedProgress] = useState(null)
	const [initialSeekTime, setInitialSeekTime] = useState(0)

	const mediaType = type === 'tv' ? 'series' : 'movie'

	// Fetch progress from Firebase Database
	const fetchProgress = useCallback(async () => {
		if (!uid || !id) return
		try {
			const response = await fetch(`https://disney-plus-mk-default-rtdb.firebaseio.com/playback-progress/${uid}/${id}.json`)
			if (response.ok) {
				const data = await response.json()
				if (data && data.currentTime > 0) {
					// If the user watched more than 95%, don't offer to resume
					if (data.duration && data.currentTime / data.duration > 0.95) {
						setSavedProgress(null)
					} else {
						setSavedProgress(data)
					}
				} else {
					setSavedProgress(null)
				}
			}
		} catch (e) {
			console.warn('Error fetching saved progress:', e)
		}
	}, [uid, id])

	useEffect(() => {
		fetchProgress()
	}, [fetchProgress])

	const formatProgressTime = (timeInSeconds) => {
		if (isNaN(timeInSeconds)) return '00:00'
		const minutes = Math.floor(timeInSeconds / 60)
		const seconds = Math.floor(timeInSeconds % 60)
		return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
	}

	const getResumeLabel = () => {
		if (!savedProgress) return ''
		if (mediaType === 'series' && savedProgress.season && savedProgress.episode) {
			return `Continuar T${savedProgress.season}:E${savedProgress.episode}`
		}
		return `Continuar (${formatProgressTime(savedProgress.currentTime)})`
	}

	// ── Click "Assistir" (Play from start) ──────────────────────────────────
	const playHandler = useCallback(() => {
		setInitialSeekTime(0) // Start from beginning
		if (mediaType === 'series') {
			setStreamModalOpen(true)
		} else {
			setStreamSelectionSeason(null)
			setStreamSelectionEpisode(null)
			setStreamSelectionOpen(true)
		}
	}, [mediaType])

	// ── Click "Continuar Assistindo" (Resume from saved progress) ─────────────
	const resumeHandler = useCallback(() => {
		if (!savedProgress) return
		setInitialSeekTime(savedProgress.currentTime)

		if (mediaType === 'series' && savedProgress.season && savedProgress.episode) {
			// Series: skip episode selector, open stream selection directly for that episode
			setStreamSelectionSeason(savedProgress.season)
			setStreamSelectionEpisode(savedProgress.episode)
			setStreamSelectionOpen(true)
		} else {
			// Movies: open stream selection directly
			setStreamSelectionSeason(null)
			setStreamSelectionEpisode(null)
			setStreamSelectionOpen(true)
		}
	}, [mediaType, savedProgress])

	// ── Series: após escolher episódio, mostrar streams ─────────────────────
	const handleSeriesEpisodeSelected = useCallback((season, episode) => {
		setInitialSeekTime(0) // Selected a new episode, start from 0
		setStreamModalOpen(false)
		setStreamSelectionSeason(season)
		setStreamSelectionEpisode(episode)
		setStreamSelectionOpen(true)
	}, [])

	// ── User escolheu um stream → reproduzir ───────────────────────────────
	const handleStreamSelected = useCallback((stream) => {
		setStreamSelectionOpen(false)

		const episodeLabel = streamSelectionSeason && streamSelectionEpisode
			? ` - T${streamSelectionSeason}:E${streamSelectionEpisode}`
			: ''

		setPlayerTitle(`${data?.title || ''}${episodeLabel}`)
		setPlayerStreams([stream])
		setPlayerVisible(true)
	}, [data, streamSelectionSeason, streamSelectionEpisode])

	const closePlayer = () => {
		setPlayerVisible(false)
		setPlayerStreams([])
		fetchProgress() // Refresh database progress state on close
	}

	return (
		<StyledContainer>
			{isPending && <Loader />}
			{isError && <ErrorBlock message={t('errors.somethingWrong')} />}
			{data && (
				<>
					<DetailBackgroundImage backdropUrl={detailsInfo.backdropUrl} title={data.title} />

					<MotionContainer delay={0.5}>
						<Wrapper>
							<DetailLogo data={data} logo={detailsInfo.logoUrl} />
							<Controls
								onPlay={playHandler}
								onVideoHandle={videoHandler}
								isAddedToWatchList={isAddedToWatchList}
								onRemove={removeFromWatchListHandler}
								onAdd={addToWatchListHandler}
								onResume={savedProgress ? resumeHandler : null}
								resumeLabel={savedProgress ? getResumeLabel() : ''}
							/>
							<DetailParagraph
								releaseYear={detailsInfo.releaseYear}
								numberOfSeasons={detailsInfo.numberOfSeasons}
								genres={detailsInfo.genres}
							/>
							<DetailDescription overview={detailsInfo.overview} />
							<BackButton />
						</Wrapper>
					</MotionContainer>

					{videoIsVisible && <VideoPlayer onClick={closeVideoHandler} videoUrl={detailsInfo.videoUrl} />}

					{/* Modal de temporada/episódio para séries */}
					{mediaType === 'series' && (
						<StreamModal
							isOpen={streamModalOpen}
							onClose={() => setStreamModalOpen(false)}
							onPlay={handleSeriesEpisodeSelected}
							tmdbId={id}
							mediaType={mediaType}
							title={data.title}
							numberOfSeasons={detailsInfo.numberOfSeasons}
						/>
					)}

					{/* Modal de seleção de stream (estilo Stremio) */}
					<StreamSelectionModal
						isOpen={streamSelectionOpen}
						onClose={() => setStreamSelectionOpen(false)}
						onSelectStream={handleStreamSelected}
						tmdbId={id}
						mediaType={mediaType}
						title={data.title}
						season={streamSelectionSeason}
						episode={streamSelectionEpisode}
						imdbId={data.imdb_id}
					/>

					{/* Unified HLS & MP4 Online Player */}
					{playerVisible && (
						<UnifiedPlayer
							stream={playerStreams[0]}
							title={playerTitle}
							tmdbId={id}
							mediaType={mediaType}
							season={streamSelectionSeason}
							episode={streamSelectionEpisode}
							initialTime={initialSeekTime}
							onClose={closePlayer}
						/>
					)}
				</>
			)}
			{!data && !isPending && <ErrorPage />}
		</StyledContainer>
	)
}

Details.propTypes = {
	type: PropTypes.string,
}

export default Details

const StyledContainer = styled(Container)`
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-content: center;
	text-align: center;
`

const Wrapper = styled.section`
	display: flex;
	flex-direction: column;
	justify-content: flex-start;
	align-items: start;
	margin: 0 50px;

	@media (min-width: 800px) {
		margin: 0 80px;
	}

	@media (min-width: 1200px) {
		margin: 0 100px;
	}
`

