import { useState, useEffect, useRef, useCallback } from 'react'
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
import NetflixPlayer from '@components/NetflixPlayer'
import StreamModal from '@components/StreamModal'
import ErrorPage from '@pages/Error'

const BACKEND_URL = 'http://localhost:8000'

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

	const [playerVisible, setPlayerVisible] = useState(false)
	const [playerStreams, setPlayerStreams] = useState([])
	const [playerTitle, setPlayerTitle] = useState('')
	const [playerLoading, setPlayerLoading] = useState(false)
	const [streamModalOpen, setStreamModalOpen] = useState(false)

	const prefetchedStreams = useRef(null)
	const prefetchStatus = useRef('idle')

	const mediaType = type === 'tv' ? 'series' : 'movie'

	useEffect(() => {
		if (mediaType !== 'movie' || !id) return
		if (prefetchStatus.current !== 'idle') return

		prefetchStatus.current = 'loading'
		fetch(`${BACKEND_URL}/api/streams/movie/${id}`)
			.then(r => r.json())
			.then(result => {
				if (result.streams?.length > 0) {
					prefetchedStreams.current = result.streams.map(s => ({
						url: `${BACKEND_URL}${s.url}`,
						label: s.description,
						lang: s.lang,
					}))
				}
				prefetchStatus.current = 'done'
			})
			.catch(() => {
				prefetchStatus.current = 'done'
			})

		return () => {
			prefetchedStreams.current = null
			prefetchStatus.current = 'idle'
		}
	}, [id, mediaType])

	const playHandler = useCallback(async () => {
		if (mediaType === 'series') {
			setStreamModalOpen(true)
			return
		}

		setPlayerTitle(data?.title || '')
		setPlayerVisible(true)

		if (prefetchedStreams.current) {
			setPlayerStreams(prefetchedStreams.current)
			setPlayerLoading(false)
			return
		}

		setPlayerLoading(true)
		setPlayerStreams([])

		const waitForPrefetch = () => new Promise(resolve => {
			const check = () => {
				if (prefetchStatus.current === 'done') {
					resolve(prefetchedStreams.current)
				} else {
					setTimeout(check, 200)
				}
			}
			check()
		})

		try {
			const streams = await waitForPrefetch()
			if (streams) {
				setPlayerStreams(streams)
			}
		} catch {
			setPlayerStreams([])
		}
		setPlayerLoading(false)
	}, [id, mediaType, data])

	const handleSeriesPlay = useCallback(async (season, episode) => {
		setStreamModalOpen(false)
		setPlayerVisible(true)
		setPlayerLoading(true)
		setPlayerTitle(`${data?.title || ''} - T${season}:E${episode}`)
		setPlayerStreams([])

		try {
			const resp = await fetch(`${BACKEND_URL}/api/streams/series/${id}/${season}/${episode}`)
			const result = await resp.json()
			if (result.streams?.length > 0) {
				setPlayerStreams(result.streams.map(s => ({
					url: `${BACKEND_URL}${s.url}`,
					label: s.description,
					lang: s.lang,
				})))
			}
		} catch {
			setPlayerStreams([])
		}
		setPlayerLoading(false)
	}, [id, data])

	const closePlayer = () => {
		setPlayerVisible(false)
		setPlayerStreams([])
		setPlayerLoading(false)
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

					{mediaType === 'series' && (
						<StreamModal
							isOpen={streamModalOpen}
							onClose={() => setStreamModalOpen(false)}
							onPlay={handleSeriesPlay}
							tmdbId={id}
							mediaType={mediaType}
							title={data.title}
							numberOfSeasons={detailsInfo.numberOfSeasons}
						/>
					)}

					{playerVisible && (
						<NetflixPlayer
							streams={playerStreams}
							title={playerTitle}
							onClose={closePlayer}
							isLoadingStreams={playerLoading}
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
