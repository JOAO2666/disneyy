import { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import { useSelector } from 'react-redux'
import Hls from 'hls.js'

// Icons
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import Forward10RoundedIcon from '@mui/icons-material/Forward10Rounded'
import Replay10RoundedIcon from '@mui/icons-material/Replay10Rounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded'
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

const UnifiedPlayer = ({ stream, title, tmdbId, mediaType, season, episode, initialTime, onClose }) => {
	const user = useSelector(state => state.user.user)
	const uid = user?.uid

	const videoRef = useRef(null)
	const playerContainerRef = useRef(null)
	const hlsRef = useRef(null)
	const idleTimerRef = useRef(null)
	const progressIntervalRef = useRef(null)

	// States
	const [isPlaying, setIsPlaying] = useState(false)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [volume, setVolume] = useState(1)
	const [isMuted, setIsMuted] = useState(false)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [isIdle, setIsIdle] = useState(false)
	const [error, setError] = useState(null)

	const videoUrl = stream?.url || ''

	// --- 1) Database Syncing ---
	const saveProgress = useCallback(async (timeVal, durationVal) => {
		if (!uid || !tmdbId || !timeVal) return
		
		try {
			const body = {
				currentTime: Math.floor(timeVal),
				duration: Math.floor(durationVal || 0),
				progress: durationVal ? parseFloat((timeVal / durationVal).toFixed(4)) : 0,
				season: season != null ? Number(season) : null,
				episode: episode != null ? Number(episode) : null,
				updatedAt: Date.now(),
				title: title || '',
				mediaType: mediaType || 'movie'
			}

			await fetch(`https://disney-plus-mk-default-rtdb.firebaseio.com/playback-progress/${uid}/${tmdbId}.json`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			})
		} catch (e) {
			console.warn('Failed to save playback progress:', e)
		}
	}, [uid, tmdbId, season, episode, title, mediaType])

	// --- 2) Time formatting utility ---
	const formatTime = (timeInSeconds) => {
		if (isNaN(timeInSeconds)) return '00:00'
		const hours = Math.floor(timeInSeconds / 3600)
		const minutes = Math.floor((timeInSeconds % 3600) / 60)
		const seconds = Math.floor(timeInSeconds % 60)

		const pad = (n) => String(n).padStart(2, '0')

		if (hours > 0) {
			return `${hours}:${pad(minutes)}:${pad(seconds)}`
		}
		return `${pad(minutes)}:${pad(seconds)}`
	}

	// --- 3) Controls Interactions ---
	const handlePlayPause = () => {
		const video = videoRef.current
		if (!video) return

		if (isPlaying) {
			video.pause()
		} else {
			video.play().catch(() => {})
		}
	}

	const handleSeek = (e) => {
		const video = videoRef.current
		if (!video) return
		const newTime = parseFloat(e.target.value)
		video.currentTime = newTime
		setCurrentTime(newTime)
	}

	const handleRewind10 = () => {
		const video = videoRef.current
		if (!video) return
		video.currentTime = Math.max(0, video.currentTime - 10)
	}

	const handleForward10 = () => {
		const video = videoRef.current
		if (!video) return
		video.currentTime = Math.min(duration, video.currentTime + 10)
	}

	const handleVolumeChange = (e) => {
		const video = videoRef.current
		if (!video) return
		const newVol = parseFloat(e.target.value)
		video.volume = newVol
		setVolume(newVol)
		setIsMuted(newVol === 0)
		video.muted = newVol === 0
	}

	const handleToggleMute = () => {
		const video = videoRef.current
		if (!video) return
		const nextMuted = !isMuted
		setIsMuted(nextMuted)
		video.muted = nextMuted
		if (!nextMuted && volume === 0) {
			setVolume(0.5)
			video.volume = 0.5
		}
	}

	const handleToggleFullscreen = () => {
		const container = playerContainerRef.current
		if (!container) return

		if (!document.fullscreenElement) {
			container.requestFullscreen()
				.then(() => setIsFullscreen(true))
				.catch(err => console.warn('Error enabling fullscreen:', err))
		} else {
			document.exitFullscreen()
				.then(() => setIsFullscreen(false))
		}
	}

	// Handle fullscreen change externally (e.g. Escape key)
	useEffect(() => {
		const onFullscreenChange = () => {
			setIsFullscreen(!!document.fullscreenElement)
		}
		document.addEventListener('fullscreenchange', onFullscreenChange)
		return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
	}, [])

	// --- 4) Idle Detection logic ---
	const resetIdleTimer = useCallback(() => {
		setIsIdle(false)
		if (idleTimerRef.current) clearTimeout(idleTimerRef.current)

		idleTimerRef.current = setTimeout(() => {
			if (isPlaying) {
				setIsIdle(true)
			}
		}, 3500)
	}, [isPlaying])

	useEffect(() => {
		resetIdleTimer()
		const handleActivity = () => resetIdleTimer()

		const el = playerContainerRef.current
		if (el) {
			el.addEventListener('mousemove', handleActivity)
			el.addEventListener('touchstart', handleActivity)
			el.addEventListener('keydown', handleActivity)
		}

		return () => {
			if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
			if (el) {
				el.removeEventListener('mousemove', handleActivity)
				el.removeEventListener('touchstart', handleActivity)
				el.removeEventListener('keydown', handleActivity)
			}
		}
	}, [resetIdleTimer])

	// --- 5) Periodic progress auto-saver ---
	useEffect(() => {
		if (isPlaying) {
			progressIntervalRef.current = setInterval(() => {
				if (videoRef.current) {
					saveProgress(videoRef.current.currentTime, videoRef.current.duration)
				}
			}, 5000)
		}

		return () => {
			if (progressIntervalRef.current) {
				clearInterval(progressIntervalRef.current)
			}
		}
	}, [isPlaying, saveProgress])

	// Clean up / save on unmount
	const handleClose = () => {
		if (videoRef.current) {
			saveProgress(videoRef.current.currentTime, videoRef.current.duration)
		}
		if (onClose) onClose()
	}

	// --- 6) Video player setup & HLS loading ---
	useEffect(() => {
		const video = videoRef.current
		if (!video || !videoUrl) return

		setIsLoading(true)
		setError(null)

		const handleLoadedMetadata = () => {
			setDuration(video.duration)
			setIsLoading(false)

			// Restore position if initialTime is provided
			if (initialTime && initialTime > 0) {
				// Prevent seeking past end of video
				const seekTime = Math.min(initialTime, video.duration - 2)
				if (seekTime > 0) {
					video.currentTime = seekTime
				}
			}
		}

		const handleTimeUpdate = () => {
			setCurrentTime(video.currentTime)
		}

		const handlePlayState = () => {
			setIsPlaying(true)
		}

		const handlePauseState = () => {
			setIsPlaying(false)
			saveProgress(video.currentTime, video.duration)
		}

		const handleWaitingState = () => {
			setIsLoading(true)
		}

		const handlePlayingState = () => {
			setIsLoading(false)
		}

		const handleVideoError = () => {
			setError('Erro ao reproduzir o vídeo. O link pode estar quebrado ou indisponível.')
			setIsLoading(false)
		}

		// Attach general event listeners
		video.addEventListener('loadedmetadata', handleLoadedMetadata)
		video.addEventListener('timeupdate', handleTimeUpdate)
		video.addEventListener('play', handlePlayState)
		video.addEventListener('pause', handlePauseState)
		video.addEventListener('waiting', handleWaitingState)
		video.addEventListener('playing', handlePlayingState)
		video.addEventListener('error', handleVideoError)

		// HLS logic
		const isHls = videoUrl.includes('.m3u8')
		if (isHls) {
			if (Hls.isSupported()) {
				const hls = new Hls({
					maxMaxBufferLength: 30,
					enableWorker: true,
					lowLatencyMode: true
				})
				hlsRef.current = hls
				hls.loadSource(videoUrl)
				hls.attachMedia(video)

				hls.on(Hls.Events.MANIFEST_PARSED, () => {
					video.play().catch(() => {
						// Autoplay block handling
						setIsPlaying(false)
					})
				})

				hls.on(Hls.Events.ERROR, (event, data) => {
					if (data.fatal) {
						switch (data.type) {
							case Hls.ErrorTypes.NETWORK_ERROR:
								hls.startLoad()
								break
							case Hls.ErrorTypes.MEDIA_ERROR:
								hls.recoverMediaError()
								break
							default:
								handleVideoError()
								break
						}
					}
				})
			} else if (video.canPlayType('application/vnd.apple.mpegurl')) {
				// Safari native HLS
				video.src = videoUrl
				video.play().catch(() => {
					setIsPlaying(false)
				})
			} else {
				setError('Este navegador não suporta a reprodução deste formato HLS.')
				setIsLoading(false)
			}
		} else {
			// Normal mp4/webm stream
			video.src = videoUrl
			video.play().catch(() => {
				setIsPlaying(false)
			})
		}

		// Cleanup on URL change / destroy
		return () => {
			if (videoRef.current) {
				// Save final position
				saveProgress(videoRef.current.currentTime, videoRef.current.duration)
			}

			video.removeEventListener('loadedmetadata', handleLoadedMetadata)
			video.removeEventListener('timeupdate', handleTimeUpdate)
			video.removeEventListener('play', handlePlayState)
			video.removeEventListener('pause', handlePauseState)
			video.removeEventListener('waiting', handleWaitingState)
			video.removeEventListener('playing', handlePlayingState)
			video.removeEventListener('error', handleVideoError)

			if (hlsRef.current) {
				hlsRef.current.destroy()
				hlsRef.current = null
			}
		}
	}, [videoUrl, initialTime, saveProgress])

	return (
		<Container ref={playerContainerRef} $isIdle={isIdle}>
			{/* Subtly hidden video element */}
			<VideoElement
				ref={videoRef}
				onClick={handlePlayPause}
				playsInline
				preload='auto'
			/>

			{/* Custom Player Controls Layout */}
			<AnimatePresence>
				{!isIdle && (
					<ControlsOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.25 }}
					>
						{/* Top Header Section */}
						<TopBar>
							<BackBtn onClick={handleClose} title='Voltar'>
								<ArrowBackRoundedIcon sx={{ fontSize: 24 }} />
							</BackBtn>
							<TitleInfo>
								<TitleText>{title || 'Reproduzindo conteúdo'}</TitleText>
								{season && episode && (
									<SubtitleText>Temporada {season} • Episódio {episode}</SubtitleText>
								)}
							</TitleInfo>
						</TopBar>

						{/* Center Action Buttons */}
						<CenterControls>
							<CircleButton onClick={handleRewind10} title='Retroceder 10s'>
								<Replay10RoundedIcon sx={{ fontSize: 28 }} />
							</CircleButton>

							<PlayPauseCircle onClick={handlePlayPause} title={isPlaying ? 'Pausar' : 'Reproduzir'}>
								{isPlaying ? (
									<PauseRoundedIcon sx={{ fontSize: 44 }} />
								) : (
									<PlayArrowRoundedIcon sx={{ fontSize: 44, marginLeft: '4px' }} />
								)}
							</PlayPauseCircle>

							<CircleButton onClick={handleForward10} title='Avançar 10s'>
								<Forward10RoundedIcon sx={{ fontSize: 28 }} />
							</CircleButton>
						</CenterControls>

						{/* Bottom Seek Bar and Secondary Controls */}
						<BottomBar>
							<TimelineContainer>
								<TimeLabel>{formatTime(currentTime)}</TimeLabel>
								<SeekBar
									type='range'
									min={0}
									max={duration || 100}
									value={currentTime}
									onChange={handleSeek}
								/>
								<TimeLabel>{formatTime(duration)}</TimeLabel>
							</TimelineContainer>

							<SecondaryControls>
								<VolumeSection>
									<IconButton onClick={handleToggleMute} title={isMuted ? 'Ativar som' : 'Desativar som'}>
										{isMuted || volume === 0 ? (
											<VolumeOffRoundedIcon sx={{ fontSize: 24 }} />
										) : (
											<VolumeUpRoundedIcon sx={{ fontSize: 24 }} />
										)}
									</IconButton>
									<VolumeSlider
										type='range'
										min={0}
										max={1}
										step={0.05}
										value={isMuted ? 0 : volume}
										onChange={handleVolumeChange}
									/>
								</VolumeSection>

								<IconButton onClick={handleToggleFullscreen} title='Tela Cheia'>
									{isFullscreen ? (
										<FullscreenExitRoundedIcon sx={{ fontSize: 28 }} />
									) : (
										<FullscreenRoundedIcon sx={{ fontSize: 28 }} />
									)}
								</IconButton>
							</SecondaryControls>
						</BottomBar>
					</ControlsOverlay>
				)}
			</AnimatePresence>

			{/* Loading overlay */}
			<AnimatePresence>
				{isLoading && !error && (
					<LoadingOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<Spinner />
						<LoadingText>Carregando Transmissão...</LoadingText>
					</LoadingOverlay>
				)}
			</AnimatePresence>

			{/* Error display */}
			<AnimatePresence>
				{error && (
					<ErrorOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
					>
						<ErrorTitle>Erro na Reprodução</ErrorTitle>
						<ErrorSub>{error}</ErrorSub>
						<CloseBtnSolid onClick={handleClose}>Voltar</CloseBtnSolid>
					</ErrorOverlay>
				)}
			</AnimatePresence>
		</Container>
	)
}

export default UnifiedPlayer

/* --- STYLES --- */

const Container = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100dvh;
	background: #000;
	z-index: 9999;
	overflow: hidden;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: ${p => p.$isIdle ? 'none' : 'default'};
`

const VideoElement = styled.video`
	width: 100%;
	height: 100%;
	object-fit: contain;
`

const ControlsOverlay = styled.div`
	position: absolute;
	inset: 0;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 20%, transparent 80%, rgba(0, 0, 0, 0.7) 100%);
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	z-index: 10;
	color: #fff;
	user-select: none;
`

const TopBar = styled.div`
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 24px 32px;
	background: linear-gradient(180deg, rgba(0,0,0,0.6) 0%, transparent 100%);
`

const TitleInfo = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
`

const TitleText = styled.h2`
	font-size: 20px;
	font-weight: 600;
	margin: 0;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.8);
`

const SubtitleText = styled.span`
	font-size: 14px;
	color: rgba(255, 255, 255, 0.6);
	font-weight: 500;
`

const CenterControls = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 40px;
`

const CircleButton = styled.button`
	background: rgba(0, 0, 0, 0.5);
	border: 1px solid rgba(255, 255, 255, 0.15);
	color: #fff;
	width: 52px;
	height: 52px;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	transition: all 0.2s;
	
	&:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: scale(1.05);
	}
	&:active {
		transform: scale(0.95);
	}
`

const PlayPauseCircle = styled(CircleButton)`
	width: 76px;
	height: 76px;
	background: #f9f6ee;
	color: #040b16;
	border: none;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);

	&:hover {
		background: #fff;
		transform: scale(1.08);
	}
`

const BottomBar = styled.div`
	padding: 20px 32px 32px;
	display: flex;
	flex-direction: column;
	gap: 16px;
	background: linear-gradient(0deg, rgba(0,0,0,0.6) 0%, transparent 100%);
`

const TimelineContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
`

const TimeLabel = styled.span`
	font-size: 13px;
	font-weight: 600;
	font-variant-numeric: tabular-nums;
	color: rgba(255, 255, 255, 0.7);
	min-width: 45px;
`

const SeekBar = styled.input`
	flex: 1;
	height: 4px;
	border-radius: 2px;
	background: rgba(255, 255, 255, 0.25);
	outline: none;
	cursor: pointer;
	appearance: none;
	transition: height 0.15s;

	&:hover {
		height: 6px;
	}

	&::-webkit-slider-runnable-track {
		height: 100%;
	}

	&::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		background: #0063e5;
		cursor: pointer;
		margin-top: -5px; /* adjustment depending on track height */
		box-shadow: 0 2px 6px rgba(0,0,0,0.4);
		transition: transform 0.1s;
		
		&:hover {
			transform: scale(1.2);
		}
	}
`

const SecondaryControls = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
`

const VolumeSection = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`

const VolumeSlider = styled.input`
	width: 80px;
	height: 3px;
	border-radius: 2px;
	background: rgba(255, 255, 255, 0.25);
	outline: none;
	appearance: none;
	cursor: pointer;

	&::-webkit-slider-thumb {
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: #fff;
	}
`

const IconButton = styled.button`
	background: none;
	border: none;
	color: #fff;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 4px;
	border-radius: 50%;
	transition: background 0.2s;
	
	&:hover {
		background: rgba(255, 255, 255, 0.1);
	}
`

const BackBtn = styled(IconButton)`
	background: rgba(0, 0, 0, 0.4);
	width: 44px;
	height: 44px;
	border: 1px solid rgba(255, 255, 255, 0.1);
	&:hover {
		background: rgba(255, 255, 255, 0.15);
	}
`

// --- OVERLAYS ---

const LoadingOverlay = styled.div`
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.8);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 20px;
	z-index: 20;
`

const spin = keyframes`
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
`

const Spinner = styled.div`
	width: 50px;
	height: 50px;
	border: 4px solid rgba(255, 255, 255, 0.1);
	border-top-color: #0063e5;
	border-radius: 50%;
	animation: ${spin} 1s linear infinite;
`

const LoadingText = styled.p`
	color: rgba(255, 255, 255, 0.8);
	font-size: 16px;
	font-weight: 500;
	margin: 0;
	letter-spacing: 0.5px;
`

const ErrorOverlay = styled.div`
	position: absolute;
	inset: 0;
	background: #0c0e15;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	z-index: 30;
	padding: 24px;
	text-align: center;
`

const ErrorTitle = styled.h2`
	color: #ff5252;
	font-size: 24px;
	margin: 0;
	font-weight: 600;
`

const ErrorSub = styled.p`
	color: rgba(255, 255, 255, 0.6);
	font-size: 15px;
	margin: 0;
	max-width: 400px;
	line-height: 1.5;
`

const CloseBtnSolid = styled.button`
	background: #0063e5;
	color: #fff;
	border: none;
	padding: 12px 32px;
	border-radius: 8px;
	cursor: pointer;
	font-size: 15px;
	font-weight: 600;
	margin-top: 12px;
	transition: background 0.2s;

	&:hover {
		background: #0073ff;
	}
`
