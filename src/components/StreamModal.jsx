import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import CircularProgress from '@mui/material/CircularProgress'

const TMDB_API_KEY = '35f3fea26d7c6bea37a8777ddbddbed3'

const StreamModal = ({ isOpen, onClose, onPlay, tmdbId, title }) => {
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [seasons, setSeasons] = useState([])
	const [episodes, setEpisodes] = useState([])
	const [selectedSeason, setSelectedSeason] = useState(null)
	const [step, setStep] = useState('initial')

	useEffect(() => {
		if (!isOpen) {
			setSeasons([])
			setEpisodes([])
			setSelectedSeason(null)
			setStep('initial')
			setLoading(false)
			setError('')
			return
		}
		fetchSeasons()
	}, [isOpen, tmdbId])

	const fetchSeasons = async () => {
		setLoading(true)
		setError('')
		try {
			// Query TMDB directly for TV show details to get seasons
			const resp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${TMDB_API_KEY}&language=pt-BR`)
			if (!resp.ok) {
				throw new Error('Failed to fetch from TMDB')
			}
			const data = await resp.json()
			
			// Filter out season 0 (specials) if it has no episodes
			const validSeasons = (data.seasons || []).filter(s => s.season_number > 0 && s.episode_count > 0)
			
			if (validSeasons.length > 0) {
				setSeasons(validSeasons)
				setStep('select-season')
			} else {
				setError('Nenhuma temporada encontrada.')
			}
		} catch (err) {
			console.error('Error fetching seasons:', err)
			setError('Erro ao carregar as temporadas. Tente novamente mais tarde.')
		}
		setLoading(false)
	}

	const fetchEpisodes = async (seasonNumber) => {
		setLoading(true)
		setSelectedSeason(seasonNumber)
		try {
			// Query TMDB directly for TV show season details to get episodes
			const resp = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${TMDB_API_KEY}&language=pt-BR`)
			if (!resp.ok) {
				throw new Error('Failed to fetch from TMDB')
			}
			const data = await resp.json()
			
			if (data.episodes?.length > 0) {
				setEpisodes(data.episodes)
				setStep('select-episode')
			} else {
				setError('Nenhum episódio encontrado.')
			}
		} catch (err) {
			console.error('Error fetching episodes:', err)
			setError('Erro ao buscar episódios.')
		}
		setLoading(false)
	}

	const handleEpisodeSelect = (episodeNumber) => {
		onPlay(selectedSeason, episodeNumber)
	}

	const goBack = () => {
		if (step === 'select-episode') {
			setEpisodes([])
			setStep('select-season')
			setError('')
		} else {
			onClose()
		}
	}

	if (!isOpen) return null

	return (
		<AnimatePresence>
			<Overlay
				as={motion.div}
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				exit={{ opacity: 0 }}
				onClick={onClose}
			>
				<Modal
					as={motion.div}
					initial={{ opacity: 0, y: 50, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 50, scale: 0.95 }}
					transition={{ type: 'spring', damping: 25, stiffness: 300 }}
					onClick={(e) => e.stopPropagation()}
				>
					<ModalHeader>
						<ModalTitle>
							{step === 'select-season' && `${title} - Temporadas`}
							{step === 'select-episode' && `${title} - T${selectedSeason}`}
							{step === 'initial' && title}
						</ModalTitle>
						<CloseBtn onClick={onClose}>
							<CloseRoundedIcon />
						</CloseBtn>
					</ModalHeader>

					<ModalBody>
						{loading && (
							<LoadingContainer>
								<CircularProgress sx={{ color: '#0063e5' }} />
								<LoadingText>Carregando...</LoadingText>
							</LoadingContainer>
						)}

						{error && !loading && (
							<ErrorContainer>
								<ErrorText>{error}</ErrorText>
								<RetryBtn onClick={fetchSeasons}>Tentar novamente</RetryBtn>
							</ErrorContainer>
						)}

						{!loading && !error && step === 'select-season' && (
							<ItemList>
								{seasons.map((s) => (
									<ItemCard key={s.season_number} onClick={() => fetchEpisodes(s.season_number)}>
										<ItemInfo>
											<ItemTitle>{s.name}</ItemTitle>
											<ItemSub>{s.episode_count} episódios</ItemSub>
										</ItemInfo>
										<PlayArrowRoundedIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
									</ItemCard>
								))}
							</ItemList>
						)}

						{!loading && !error && step === 'select-episode' && (
							<>
								<BackLink onClick={goBack}>← Voltar às temporadas</BackLink>
								<ItemList>
									{episodes.map((ep) => (
										<ItemCard key={ep.episode_number} onClick={() => handleEpisodeSelect(ep.episode_number)}>
											<ItemInfo>
												<ItemTitle>E{ep.episode_number} - {ep.name}</ItemTitle>
												{ep.overview && <ItemSub>{ep.overview.substring(0, 100)}...</ItemSub>}
											</ItemInfo>
											<PlayArrowRoundedIcon sx={{ color: 'rgba(255,255,255,0.5)' }} />
										</ItemCard>
									))}
								</ItemList>
							</>
						)}
					</ModalBody>
				</Modal>
			</Overlay>
		</AnimatePresence>
	)
}

export default StreamModal

const Overlay = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: rgba(0, 0, 0, 0.75);
	z-index: 9000;
	display: flex;
	align-items: center;
	justify-content: center;
	backdrop-filter: blur(4px);
`

const Modal = styled.div`
	background: #1a1d29;
	border-radius: 16px;
	width: 90%;
	max-width: 520px;
	max-height: 80vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
	border: 1px solid rgba(255, 255, 255, 0.08);
`

const ModalHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20px 24px;
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`

const ModalTitle = styled.h3`
	color: #f9f6ee;
	margin: 0;
	font-size: 18px;
	font-weight: 600;
`

const CloseBtn = styled.button`
	background: rgba(255, 255, 255, 0.08);
	border: none;
	color: #f9f6ee;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	transition: background 0.2s;
	&:hover { background: rgba(255, 255, 255, 0.15); }
`

const ModalBody = styled.div`
	padding: 16px 24px 24px;
	overflow-y: auto;
	flex: 1;
	&::-webkit-scrollbar { width: 6px; }
	&::-webkit-scrollbar-track { background: transparent; }
	&::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 3px; }
`

const LoadingContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 48px 0;
	gap: 16px;
`

const LoadingText = styled.p`
	color: rgba(255, 255, 255, 0.6);
	font-size: 14px;
	margin: 0;
`

const ErrorContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 32px 0;
	gap: 16px;
`

const ErrorText = styled.p`
	color: #ff6b6b;
	font-size: 14px;
	margin: 0;
	text-align: center;
`

const RetryBtn = styled.button`
	background: #0063e5;
	color: #fff;
	border: none;
	padding: 10px 24px;
	border-radius: 8px;
	cursor: pointer;
	font-size: 14px;
	&:hover { background: #0080ff; }
`

const ItemList = styled.div`
	display: flex;
	flex-direction: column;
	gap: 8px;
`

const ItemCard = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 14px 16px;
	background: rgba(255, 255, 255, 0.04);
	border-radius: 10px;
	cursor: pointer;
	transition: all 0.2s;
	border: 1px solid transparent;
	&:hover {
		background: rgba(255, 255, 255, 0.08);
		border-color: rgba(255, 255, 255, 0.1);
	}
`

const ItemInfo = styled.div`
	display: flex;
	flex-direction: column;
	gap: 4px;
	flex: 1;
	min-width: 0;
`

const ItemTitle = styled.span`
	color: #f9f6ee;
	font-size: 15px;
	font-weight: 500;
`

const ItemSub = styled.span`
	color: rgba(255, 255, 255, 0.45);
	font-size: 13px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`

const BackLink = styled.button`
	background: none;
	border: none;
	color: #0063e5;
	cursor: pointer;
	font-size: 14px;
	padding: 0;
	margin-bottom: 12px;
	&:hover { color: #0080ff; }
`
