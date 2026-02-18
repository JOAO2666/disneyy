import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded'
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded'
import FullscreenRoundedIcon from '@mui/icons-material/FullscreenRounded'
import FullscreenExitRoundedIcon from '@mui/icons-material/FullscreenExitRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import Forward10RoundedIcon from '@mui/icons-material/Forward10Rounded'
import Replay10RoundedIcon from '@mui/icons-material/Replay10Rounded'
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded'
import { t } from '@utils/i18n/i18n'

const formatTime = (seconds) => {
	if (isNaN(seconds)) return '0:00:00'
	const h = Math.floor(seconds / 3600)
	const m = Math.floor((seconds % 3600) / 60)
	const s = Math.floor(seconds % 60)
	return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

const NetflixPlayer = ({ videoUrl, title, onClose }) => {
	const navigate = useNavigate()
	const videoRef = useRef(null)
	const containerRef = useRef(null)
	const controlsTimeoutRef = useRef(null)
	const progressRef = useRef(null)

	const [isPlaying, setIsPlaying] = useState(false)
	const [isMuted, setIsMuted] = useState(false)
	const [volume, setVolume] = useState(1)
	const [currentTime, setCurrentTime] = useState(0)
	const [duration, setDuration] = useState(0)
	const [buffered, setBuffered] = useState(0)
	const [showControls, setShowControls] = useState(true)
	const [isFullscreen, setIsFullscreen] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [showVolumeSlider, setShowVolumeSlider] = useState(false)
	const [playbackRate, setPlaybackRate] = useState(1)
	const [showSettings, setShowSettings] = useState(false)

	const hideControlsTimer = useCallback(() => {
		if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
		setShowControls(true)
		if (isPlaying) {
			controlsTimeoutRef.current = setTimeout(() => {
				setShowControls(false)
				setShowSettings(false)
				setShowVolumeSlider(false)
			}, 3000)
		}
	}, [isPlaying])

	useEffect(() => {
		hideControlsTimer()
		return () => {
			if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
		}
	}, [isPlaying, hideControlsTimer])

	useEffect(() => {
		const handleKeyDown = (e) => {
			switch (e.key) {
				case ' ':
				case 'k':
					e.preventDefault()
					togglePlay()
					break
				case 'f':
					e.preventDefault()
					toggleFullscreen()
					break
				case 'm':
					e.preventDefault()
					setIsMuted(prev => !prev)
					break
				case 'ArrowLeft':
					e.preventDefault()
					skip(-10)
					break
				case 'ArrowRight':
					e.preventDefault()
					skip(10)
					break
				case 'Escape':
					if (onClose) onClose()
					else navigate(-1)
					break
			}
		}
		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [])

	const togglePlay = () => {
		const video = videoRef.current
		if (!video) return
		if (video.paused) {
			video.play()
			setIsPlaying(true)
		} else {
			video.pause()
			setIsPlaying(false)
		}
	}

	const skip = (seconds) => {
		const video = videoRef.current
		if (!video) return
		video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration))
	}

	const toggleFullscreen = () => {
		const container = containerRef.current
		if (!container) return
		if (!document.fullscreenElement) {
			container.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {})
		} else {
			document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {})
		}
	}

	useEffect(() => {
		const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
		document.addEventListener('fullscreenchange', handleFullscreenChange)
		return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
	}, [])

	const handleTimeUpdate = () => {
		const video = videoRef.current
		if (!video) return
		setCurrentTime(video.currentTime)
		if (video.buffered.length > 0) {
			setBuffered(video.buffered.end(video.buffered.length - 1))
		}
	}

	const handleProgressClick = (e) => {
		const video = videoRef.current
		const bar = progressRef.current
		if (!video || !bar) return
		const rect = bar.getBoundingClientRect()
		const pos = (e.clientX - rect.left) / rect.width
		video.currentTime = pos * video.duration
	}

	const handleVolumeChange = (e) => {
		const vol = parseFloat(e.target.value)
		setVolume(vol)
		if (videoRef.current) {
			videoRef.current.volume = vol
			setIsMuted(vol === 0)
		}
	}

	const handleBack = () => {
		if (onClose) onClose()
		else navigate(-1)
	}

	const progress = duration ? (currentTime / duration) * 100 : 0
	const bufferProgress = duration ? (buffered / duration) * 100 : 0

	return (
		<PlayerContainer
			ref={containerRef}
			onMouseMove={hideControlsTimer}
			onClick={(e) => {
				if (e.target === e.currentTarget || e.target.tagName === 'VIDEO') togglePlay()
			}}
		>
			<Video
				ref={videoRef}
				src={videoUrl}
				onTimeUpdate={handleTimeUpdate}
				onLoadedMetadata={(e) => {
					setDuration(e.target.duration)
					setIsLoading(false)
				}}
				onWaiting={() => setIsLoading(true)}
				onPlaying={() => setIsLoading(false)}
				onCanPlay={() => setIsLoading(false)}
				muted={isMuted}
				playsInline
			/>

			<AnimatePresence>
				{isLoading && (
					<LoadingOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<Spinner />
					</LoadingOverlay>
				)}
			</AnimatePresence>

			<AnimatePresence>
				{showControls && (
					<ControlsOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.3 }}
					>
						<TopBar>
							<BackBtn onClick={handleBack}>
								<ArrowBackRoundedIcon sx={{ fontSize: 32 }} />
							</BackBtn>
							<MovieTitle>{title}</MovieTitle>
						</TopBar>

						<CenterControls>
							<CenterBtn onClick={() => skip(-10)}>
								<Replay10RoundedIcon sx={{ fontSize: 48 }} />
							</CenterBtn>
							<PlayPauseBtn onClick={togglePlay}>
								{isPlaying ? (
									<PauseRoundedIcon sx={{ fontSize: 64 }} />
								) : (
									<PlayArrowRoundedIcon sx={{ fontSize: 64 }} />
								)}
							</PlayPauseBtn>
							<CenterBtn onClick={() => skip(10)}>
								<Forward10RoundedIcon sx={{ fontSize: 48 }} />
							</CenterBtn>
						</CenterControls>

						<BottomBar>
							<ProgressContainer ref={progressRef} onClick={handleProgressClick}>
								<BufferBar style={{ width: `${bufferProgress}%` }} />
								<ProgressBar style={{ width: `${progress}%` }} />
								<ProgressThumb style={{ left: `${progress}%` }} />
							</ProgressContainer>

							<ControlsRow>
								<LeftControls>
									<ControlBtn onClick={togglePlay}>
										{isPlaying ? (
											<PauseRoundedIcon sx={{ fontSize: 28 }} />
										) : (
											<PlayArrowRoundedIcon sx={{ fontSize: 28 }} />
										)}
									</ControlBtn>

									<VolumeContainer
										onMouseEnter={() => setShowVolumeSlider(true)}
										onMouseLeave={() => setShowVolumeSlider(false)}
									>
										<ControlBtn onClick={() => setIsMuted(prev => !prev)}>
											{isMuted || volume === 0 ? (
												<VolumeOffRoundedIcon sx={{ fontSize: 28 }} />
											) : (
												<VolumeUpRoundedIcon sx={{ fontSize: 28 }} />
											)}
										</ControlBtn>
										{showVolumeSlider && (
											<VolumeSlider
												type='range'
												min='0'
												max='1'
												step='0.05'
												value={isMuted ? 0 : volume}
												onChange={handleVolumeChange}
											/>
										)}
									</VolumeContainer>

									<TimeDisplay>
										{formatTime(currentTime)} / {formatTime(duration)}
									</TimeDisplay>
								</LeftControls>

								<RightControls>
									<SettingsContainer>
										<ControlBtn onClick={() => setShowSettings(prev => !prev)}>
											<SettingsRoundedIcon sx={{ fontSize: 28 }} />
										</ControlBtn>
										{showSettings && (
											<SettingsMenu>
												<SettingsTitle>{t('player.speed')}</SettingsTitle>
												{[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
													<SpeedOption
														key={rate}
														$active={playbackRate === rate}
														onClick={() => {
															setPlaybackRate(rate)
															if (videoRef.current) videoRef.current.playbackRate = rate
														}}
													>
														{rate === 1 ? t('player.normal') : `${rate}x`}
													</SpeedOption>
												))}
											</SettingsMenu>
										)}
									</SettingsContainer>

									<ControlBtn onClick={toggleFullscreen}>
										{isFullscreen ? (
											<FullscreenExitRoundedIcon sx={{ fontSize: 28 }} />
										) : (
											<FullscreenRoundedIcon sx={{ fontSize: 28 }} />
										)}
									</ControlBtn>
								</RightControls>
							</ControlsRow>
						</BottomBar>
					</ControlsOverlay>
				)}
			</AnimatePresence>
		</PlayerContainer>
	)
}

export default NetflixPlayer

const PlayerContainer = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: #000;
	z-index: 9999;
	cursor: ${({ $showControls }) => ($showControls ? 'default' : 'none')};
`

const Video = styled.video`
	width: 100%;
	height: 100%;
	object-fit: contain;
`

const LoadingOverlay = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	align-items: center;
	justify-content: center;
	pointer-events: none;
`

const Spinner = styled.div`
	width: 50px;
	height: 50px;
	border: 4px solid rgba(255, 255, 255, 0.2);
	border-top-color: #e50914;
	border-radius: 50%;
	animation: spin 0.8s linear infinite;

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
`

const ControlsOverlay = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	background: linear-gradient(
		to bottom,
		rgba(0, 0, 0, 0.7) 0%,
		transparent 20%,
		transparent 80%,
		rgba(0, 0, 0, 0.85) 100%
	);
`

const TopBar = styled.div`
	display: flex;
	align-items: center;
	padding: 20px 24px;
	gap: 16px;
`

const BackBtn = styled.button`
	background: none;
	border: none;
	color: #fff;
	cursor: pointer;
	display: flex;
	align-items: center;
	padding: 8px;
	border-radius: 50%;
	transition: background 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
	}
`

const MovieTitle = styled.h2`
	color: #fff;
	font-size: 20px;
	font-weight: 600;
	margin: 0;
	text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);

	@media (min-width: 768px) {
		font-size: 24px;
	}
`

const CenterControls = styled.div`
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 40px;
`

const CenterBtn = styled.button`
	background: none;
	border: none;
	color: rgba(255, 255, 255, 0.85);
	cursor: pointer;
	display: flex;
	align-items: center;
	padding: 8px;
	border-radius: 50%;
	transition: all 0.2s;

	&:hover {
		color: #fff;
		transform: scale(1.1);
	}
`

const PlayPauseBtn = styled.button`
	background: rgba(255, 255, 255, 0.15);
	border: 2px solid rgba(255, 255, 255, 0.3);
	color: #fff;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 80px;
	height: 80px;
	border-radius: 50%;
	transition: all 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.25);
		transform: scale(1.1);
	}
`

const BottomBar = styled.div`
	padding: 0 24px 20px;
`

const ProgressContainer = styled.div`
	position: relative;
	width: 100%;
	height: 5px;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 3px;
	cursor: pointer;
	margin-bottom: 12px;
	transition: height 0.15s;

	&:hover {
		height: 8px;
	}

	&:hover div:last-child {
		opacity: 1;
		transform: translateY(-50%) scale(1);
	}
`

const BufferBar = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	background: rgba(255, 255, 255, 0.35);
	border-radius: 3px;
	pointer-events: none;
`

const ProgressBar = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	height: 100%;
	background: #e50914;
	border-radius: 3px;
	pointer-events: none;
`

const ProgressThumb = styled.div`
	position: absolute;
	top: 50%;
	width: 16px;
	height: 16px;
	background: #e50914;
	border-radius: 50%;
	transform: translateY(-50%) scale(0);
	opacity: 0;
	transition: all 0.15s;
	pointer-events: none;
	margin-left: -8px;
`

const ControlsRow = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
`

const LeftControls = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`

const RightControls = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`

const ControlBtn = styled.button`
	background: none;
	border: none;
	color: #fff;
	cursor: pointer;
	display: flex;
	align-items: center;
	padding: 6px;
	border-radius: 4px;
	transition: all 0.2s;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
	}
`

const VolumeContainer = styled.div`
	display: flex;
	align-items: center;
	gap: 4px;
`

const VolumeSlider = styled.input`
	width: 80px;
	height: 4px;
	appearance: none;
	background: rgba(255, 255, 255, 0.3);
	border-radius: 2px;
	outline: none;
	cursor: pointer;

	&::-webkit-slider-thumb {
		appearance: none;
		width: 14px;
		height: 14px;
		background: #fff;
		border-radius: 50%;
		cursor: pointer;
	}

	&::-moz-range-thumb {
		width: 14px;
		height: 14px;
		background: #fff;
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}
`

const TimeDisplay = styled.span`
	color: #fff;
	font-size: 13px;
	font-variant-numeric: tabular-nums;
	margin-left: 8px;
	user-select: none;

	@media (min-width: 768px) {
		font-size: 14px;
	}
`

const SettingsContainer = styled.div`
	position: relative;
`

const SettingsMenu = styled.div`
	position: absolute;
	bottom: 48px;
	right: 0;
	background: rgba(20, 20, 20, 0.95);
	border-radius: 8px;
	padding: 12px 0;
	min-width: 140px;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
	backdrop-filter: blur(10px);
`

const SettingsTitle = styled.div`
	color: rgba(255, 255, 255, 0.5);
	font-size: 12px;
	text-transform: uppercase;
	letter-spacing: 1px;
	padding: 4px 16px 8px;
`

const SpeedOption = styled.button`
	display: block;
	width: 100%;
	background: ${({ $active }) => ($active ? 'rgba(229, 9, 20, 0.3)' : 'none')};
	border: none;
	color: ${({ $active }) => ($active ? '#e50914' : '#fff')};
	font-size: 14px;
	font-weight: ${({ $active }) => ($active ? '600' : '400')};
	padding: 8px 16px;
	cursor: pointer;
	text-align: left;
	transition: background 0.15s;

	&:hover {
		background: rgba(255, 255, 255, 0.1);
	}
`
