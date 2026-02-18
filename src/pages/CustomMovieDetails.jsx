import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'

import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import ArrowBackIosNewRoundedIcon from '@mui/icons-material/ArrowBackIosNewRounded'
import HighQualityRoundedIcon from '@mui/icons-material/HighQualityRounded'
import SurroundSoundRoundedIcon from '@mui/icons-material/SurroundSoundRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'

import Container from '@components/ui/Container'
import { MotionContainer } from '@components/ui/MotionContainer'
import { customMovies, getPlayerUrl, getDriveEmbedUrl } from '@utils/custom-movies'
import { t } from '@utils/i18n/i18n'

const CustomMovieDetails = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const [isPlayerOpen, setIsPlayerOpen] = useState(false)

	const movie = customMovies[id]

	if (!movie) {
		return (
			<StyledContainer>
				<NotFound>
					<h2>{t('player.movieNotFound')}</h2>
					<BackBtn onClick={() => navigate(-1)}>{t('player.back')}</BackBtn>
				</NotFound>
			</StyledContainer>
		)
	}

	const handlePlay = () => {
		window.open(getPlayerUrl(movie), '_blank')
	}

	const handlePlayEmbed = () => {
		setIsPlayerOpen(true)
	}

	return (
		<>
			<StyledContainer>
				<BackgroundImage>
					<img src={movie.backdropUrl} alt={movie.title} />
				</BackgroundImage>

				<MotionContainer delay={0.3}>
					<ContentWrapper>
						<TitleSection>
							<MovieTitle>{movie.title}</MovieTitle>
						</TitleSection>

						<ControlsSection>
							<PlayButton onClick={handlePlay}>
								<PlayArrowRoundedIcon sx={{ fontSize: 28 }} />
								<span>{t('player.watch')}</span>
							</PlayButton>

							<PlayEmbedButton onClick={handlePlayEmbed}>
								<PlayArrowRoundedIcon sx={{ fontSize: 22 }} />
								<span>{t('player.watch')} (Drive)</span>
							</PlayEmbedButton>

							<BackButton onClick={() => navigate(-1)}>
								<ArrowBackIosNewRoundedIcon sx={{ fontSize: 18 }} />
							</BackButton>
						</ControlsSection>

						<MetaInfo>
							<Year>{movie.year}</Year>
							<Separator>•</Separator>
							<Genres>{movie.genres}</Genres>
						</MetaInfo>

						<BadgesRow>
							{movie.quality && (
								<Badge>
									<HighQualityRoundedIcon sx={{ fontSize: 16 }} />
									{movie.quality}
								</Badge>
							)}
							{movie.audio && (
								<Badge>
									<SurroundSoundRoundedIcon sx={{ fontSize: 16 }} />
									{movie.audio}
								</Badge>
							)}
						</BadgesRow>

						<Overview>{movie.overview}</Overview>
					</ContentWrapper>
				</MotionContainer>
			</StyledContainer>

			<AnimatePresence>
				{isPlayerOpen && (
					<PlayerOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
					>
						<ClosePlayerButton onClick={() => setIsPlayerOpen(false)}>
							<CloseRoundedIcon sx={{ fontSize: 28 }} />
						</ClosePlayerButton>

						<StyledIframe
							src={getDriveEmbedUrl(movie.driveFileId)}
							allow='autoplay; encrypted-media; fullscreen'
							allowFullScreen
							frameBorder='0'
							title={movie.title}
						/>
					</PlayerOverlay>
				)}
			</AnimatePresence>
		</>
	)
}

export default CustomMovieDetails

const StyledContainer = styled(Container)`
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-content: center;
	min-height: 100vh;
`

const BackgroundImage = styled.div`
	position: fixed;
	right: 0;
	top: 0;
	width: 100%;
	height: 100%;
	opacity: 0.4;
	z-index: -1;

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	&::after {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		width: 100%;
		height: 60%;
		background: linear-gradient(to top, #1a1d29 0%, transparent 100%);
	}
`

const ContentWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: flex-start;
	margin: 0 50px;
	padding-top: 30vh;

	@media (min-width: 800px) {
		margin: 0 80px;
		padding-top: 25vh;
	}

	@media (min-width: 1200px) {
		margin: 0 100px;
		max-width: 700px;
	}
`

const TitleSection = styled.div`
	margin-bottom: 24px;
`

const MovieTitle = styled.h1`
	font-size: 32px;
	font-weight: 700;
	color: #f9f6ee;
	text-align: left;
	text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);
	line-height: 1.2;

	@media (min-width: 800px) {
		font-size: 44px;
	}

	@media (min-width: 1200px) {
		font-size: 52px;
	}
`

const ControlsSection = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
`

const PlayButton = styled.button`
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 10px 28px;
	background: #f9f6ee;
	color: #000;
	border: none;
	border-radius: 6px;
	font-size: 16px;
	font-weight: 600;
	cursor: pointer;
	transition: all 0.25s;

	&:hover {
		background: rgba(249, 246, 238, 0.8);
		transform: scale(1.02);
	}

	@media (min-width: 800px) {
		font-size: 18px;
		padding: 12px 36px;
	}
`

const PlayEmbedButton = styled.button`
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 10px 20px;
	background: rgba(255, 255, 255, 0.15);
	color: #f9f6ee;
	border: 1px solid rgba(255, 255, 255, 0.3);
	border-radius: 6px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.25s;

	&:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.02);
	}

	@media (min-width: 800px) {
		font-size: 15px;
		padding: 12px 24px;
	}
`

const BackButton = styled.button`
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	background: rgba(0, 0, 0, 0.6);
	border: none;
	border-radius: 50%;
	color: #f9f6ee;
	cursor: pointer;
	transition: background 0.2s;

	&:hover {
		background: #000;
	}
`

const MetaInfo = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
	color: rgba(249, 246, 238, 0.8);
	font-size: 15px;
	margin-bottom: 12px;

	@media (min-width: 800px) {
		font-size: 17px;
	}
`

const Year = styled.span`
	font-weight: 500;
`

const Separator = styled.span`
	opacity: 0.5;
`

const Genres = styled.span``

const BadgesRow = styled.div`
	display: flex;
	gap: 10px;
	margin-bottom: 20px;
`

const Badge = styled.span`
	display: flex;
	align-items: center;
	gap: 5px;
	padding: 4px 12px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.15);
	border-radius: 4px;
	color: rgba(249, 246, 238, 0.9);
	font-size: 12px;
	font-weight: 500;
	backdrop-filter: blur(4px);
`

const Overview = styled.p`
	color: rgba(249, 246, 238, 0.85);
	font-size: 15px;
	line-height: 1.8;
	text-align: left;
	margin: 0;

	@media (min-width: 800px) {
		font-size: 16px;
	}

	@media (min-width: 1200px) {
		font-size: 18px;
	}
`

const NotFound = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 80vh;
	gap: 20px;
	color: #f9f6ee;
`

const BackBtn = styled.button`
	padding: 10px 24px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.2);
	border-radius: 6px;
	color: #f9f6ee;
	cursor: pointer;
	font-size: 14px;
	transition: background 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}
`

const PlayerOverlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: #000;
	z-index: 9999;
`

const ClosePlayerButton = styled.button`
	position: absolute;
	top: 16px;
	right: 16px;
	z-index: 10000;
	background: rgba(0, 0, 0, 0.6);
	border: none;
	color: #fff;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 44px;
	height: 44px;
	border-radius: 50%;
	transition: background 0.2s;
	backdrop-filter: blur(4px);

	&:hover {
		background: rgba(0, 0, 0, 0.9);
	}
`

const StyledIframe = styled.iframe`
	width: 100%;
	height: 100%;
	border: none;
`
