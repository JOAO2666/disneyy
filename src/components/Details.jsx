import { useState, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PropTypes from 'prop-types'
import styled from 'styled-components'

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
import WebtorPlayer from '@components/WebtorPlayer'
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

	const mediaType = type === 'tv' ? 'series' : 'movie'

	// ── Click "Assistir" ────────────────────────────────────────────────────
	const playHandler = useCallback(() => {
		if (mediaType === 'series') {
			// Séries: primeiro escolher temporada/episódio
			setStreamModalOpen(true)
		} else {
			// Filmes: abrir modal de seleção de stream direto
			setStreamSelectionSeason(null)
			setStreamSelectionEpisode(null)
			setStreamSelectionOpen(true)
		}
	}, [mediaType])

	// ── Series: após escolher episódio, mostrar streams ─────────────────────
	const handleSeriesEpisodeSelected = useCallback((season, episode) => {
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

					{/* Player webtor.io */}
					{playerVisible && (
						<WebtorPlayer
							streams={playerStreams}
							title={playerTitle}
							poster={detailsInfo.backdropUrl}
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
