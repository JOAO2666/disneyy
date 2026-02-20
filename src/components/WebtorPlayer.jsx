import { useState, useEffect, useRef, useCallback } from 'react'
import styled, { keyframes } from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'

const WEBTOR_ID = 'webtor-embed-disney'

const WebtorPlayer = ({ streams, title, poster, onClose }) => {
	const containerRef = useRef(null)
	const timerRef = useRef(null)

	const [error, setError] = useState(false)
	const [isIdle, setIsIdle] = useState(false)
	const [isWebtorLoading, setIsWebtorLoading] = useState(true)

	const stream = streams?.[0]
	const magnet = stream?.url?.startsWith('magnet:') ? stream.url : null
	const imdbId = stream?.imdbId || ''

	// --- 1) Idle detection logic ---
	const resetIdleTimer = useCallback(() => {
		setIsIdle(false)
		if (timerRef.current) clearTimeout(timerRef.current)

		timerRef.current = setTimeout(() => {
			setIsIdle(true)
		}, 3000)
	}, [])

	useEffect(() => {
		resetIdleTimer()
		const handleActivity = () => resetIdleTimer()

		const el = containerRef.current
		if (el) {
			el.addEventListener('mousemove', handleActivity)
			el.addEventListener('touchstart', handleActivity)
			el.addEventListener('keydown', handleActivity)
		}

		return () => {
			if (timerRef.current) clearTimeout(timerRef.current)
			if (el) {
				el.removeEventListener('mousemove', handleActivity)
				el.removeEventListener('touchstart', handleActivity)
				el.removeEventListener('keydown', handleActivity)
			}
		}
	}, [resetIdleTimer])


	// --- 2) Webtor SDK Loader ---
	useEffect(() => {
		if (!magnet) {
			setError(true)
			setIsWebtorLoading(false)
			return
		}

		setError(false)
		setIsWebtorLoading(true)

		const loadWebtor = () => {
			window.webtor = window.webtor || []
			window.webtor.push({
				id: WEBTOR_ID,
				magnet,
				width: '100%',
				height: '100%',
				controls: true,
				header: false,
				title: title || '',
				// Omitindo a propriedade "poster" para manter a inicialização padrão
				// do Webtor. Isso evita que o botão de play interno fique descentralizado.
				imdbId: imdbId ? String(imdbId).replace(/^tt/, '') : undefined,
				lang: 'pt',
				userLang: 'pt',
				autoplay: true,
				on: {
					error: () => {
						setError(true)
						setIsWebtorLoading(false)
					},
					inited: () => {
						// Player rodando ou pronto para rodar
						setIsWebtorLoading(false)
					},
					open: () => {
						setIsWebtorLoading(false)
					}
				},
			})

			// Fallback: Se o Webtor não emitir 'inited' rápido por alguma falha na rede ou link vazio
			setTimeout(() => {
				setIsWebtorLoading(false)
			}, 10000)
		}

		if (document.querySelector('script[src*="webtor"][src*="embed-sdk"]')) {
			loadWebtor()
		} else {
			const script = document.createElement('script')
			script.src = 'https://cdn.jsdelivr.net/npm/@webtor/embed-sdk-js/dist/index.min.js'
			script.charset = 'utf-8'
			script.async = true
			script.onload = loadWebtor
			document.body.appendChild(script)
		}

		return () => {
			// Cleanup global if needed
		}
	}, [magnet, imdbId, title, poster])


	const handleBack = () => {
		if (onClose) onClose()
	}

	return (
		<Container ref={containerRef}>
			{/* Top Header/Gradient - hides when idle */}
			<AnimatePresence>
				{!isIdle && !error && (
					<TopHeader
						as={motion.div}
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						transition={{ duration: 0.3 }}
					>
						<BackBtn onClick={handleBack} aria-label="Voltar">
							<ArrowBackRoundedIcon sx={{ fontSize: 28 }} />
						</BackBtn>
						{title && <TitleText>{title}</TitleText>}
					</TopHeader>
				)}
			</AnimatePresence>

			{/* Loading State Overlay */}
			<AnimatePresence>
				{isWebtorLoading && !error && (
					<LoadingOverlay
						as={motion.div}
						initial={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.5 }}
					>
						<Spinner />
						<LoadingText>Conectando ao Torrent...</LoadingText>
					</LoadingOverlay>
				)}
			</AnimatePresence>

			{/* Error State */}
			<AnimatePresence>
				{error && (
					<ErrorOverlay
						as={motion.div}
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
					>
						<ErrorTitle>
							{magnet ? 'Erro ao carregar o vídeo' : 'Nenhum Magnet Link'}
						</ErrorTitle>
						<ErrorSub>
							{magnet
								? 'Não foi possível reproduzir este torrent. Pode estar sem pares ativos.'
								: 'Selecione um stream válido da lista para assistir.'}
						</ErrorSub>
						<BackBtnSolid onClick={handleBack}>Voltar</BackBtnSolid>
					</ErrorOverlay>
				)}
			</AnimatePresence>

			{/* Player Wrapper */}
			{!error && <WebtorWrap id={WEBTOR_ID} />}
		</Container>
	)
}

export default WebtorPlayer

// --- STYLES --- //

const Container = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh; /* fallback */
	height: 100dvh; /* dynamic viewport height para mobile */
	background: #000;
	z-index: 9999;
	overflow: hidden;
`

const TopHeader = styled.div`
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 120px;
	padding: env(safe-area-inset-top, 20px) 24px 20px;
	display: flex;
	align-items: flex-start;
	gap: 16px;
	background: linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%);
	z-index: 10;
	pointer-events: none; /* so clicks pass through the gradient */
`

const BackBtn = styled.button`
	pointer-events: auto;
	background: rgba(0, 0, 0, 0.4);
	backdrop-filter: blur(8px);
	border: 1px solid rgba(255, 255, 255, 0.1);
	color: #fff;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 48px;
	height: 48px;
	border-radius: 50%;
	transition: all 0.2s ease;
	flex-shrink: 0;
	
	&:hover {
		background: rgba(255, 255, 255, 0.15);
		transform: scale(1.05);
	}
	&:active {
		transform: scale(0.95);
	}

	/* Touch target ampliado via padding invisível se necessário */
	@media (max-width: 768px) {
		width: 44px;
		height: 44px;
	}
`

const TitleText = styled.h2`
	color: #fff;
	font-size: 20px;
	font-weight: 600;
	margin: 8px 0 0 0;
	text-shadow: 0px 2px 4px rgba(0,0,0,0.8);
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;

	@media (max-width: 768px) {
		font-size: 16px;
		margin-top: 10px;
	}
`

const WebtorWrap = styled.div`
	width: 100%;
	height: 100%;
	iframe {
		width: 100% !important;
		height: 100% !important;
		border: none;
	}
`

// --- LOADING OVERLAY --- /

const LoadingOverlay = styled.div`
	position: absolute;
	inset: 0;
	background: #000;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 20px;
	z-index: 5;
`

const spin = keyframes`
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
`

const Spinner = styled.div`
	width: 50px;
	height: 50px;
	border: 4px solid rgba(255, 255, 255, 0.1);
	border-top-color: #0063e5; /* Disney blue */
	border-radius: 50%;
	animation: ${spin} 1s linear infinite;
`

const LoadingText = styled.p`
	color: rgba(255, 255, 255, 0.7);
	font-size: 16px;
	font-weight: 500;
	margin: 0;
	letter-spacing: 0.5px;
`

// --- ERROR OVERLAY --- /

const ErrorOverlay = styled.div`
	position: absolute;
	inset: 0;
	background: #0c0e15;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 16px;
	z-index: 5;
	padding: 24px;
	text-align: center;
`

const ErrorTitle = styled.h2`
	color: #fff;
	font-size: 22px;
	margin: 0;
	font-weight: 600;
`

const ErrorSub = styled.p`
	color: rgba(255, 255, 255, 0.6);
	font-size: 15px;
	margin: 0;
	max-width: 360px;
	line-height: 1.5;
`

const BackBtnSolid = styled.button`
	background: #0063e5; /* Disney blue */
	color: #fff;
	border: none;
	padding: 14px 32px;
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
