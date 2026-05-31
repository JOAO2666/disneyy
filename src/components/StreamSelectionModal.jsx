import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import CircularProgress from '@mui/material/CircularProgress'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import { fetchAddonStreams } from '@utils/http/fetch-addon-streams'

const BACKEND_URL = 'http://localhost:8000'

const StreamSelectionModal = ({ isOpen, onClose, onSelectStream, tmdbId, mediaType, title, season, episode, imdbId: imdbIdProp }) => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [streams, setStreams] = useState([])
  const [imdbId, setImdbId] = useState(imdbIdProp || '')

  useEffect(() => {
    setImdbId(imdbIdProp || '')
  }, [imdbIdProp])

  useEffect(() => {
    if (!isOpen) {
      setStreams([])
      setLoading(false)
      setError('')
      return
    }
    fetchStreams()
  }, [isOpen, tmdbId, mediaType, title, season, episode, imdbIdProp])

  const fetchStreams = async () => {
    setLoading(true)
    setError('')
    setStreams([])

    const torrentioType = mediaType === 'tv' ? 'series' : 'movie'

    // 1) Fetch from FrostStream and FenixFlix
    try {
      const addonStreams = await fetchAddonStreams(imdbIdProp, torrentioType, season, episode, tmdbId)
      if (addonStreams?.length > 0) {
        setStreams(addonStreams)
        setLoading(false)
        setError('')
        return
      }
    } catch (e) {
      console.warn('Addon streams failed, trying fallback backend:', e)
    }

    // 2) Fallback: backend
    try {
      let url
      if (mediaType === 'tv' && season && episode) {
        url = `${BACKEND_URL}/api/streams/series/${tmdbId}/${season}/${episode}`
      } else {
        url = `${BACKEND_URL}/api/streams/movie/${tmdbId}`
      }
      const resp = await fetch(url)
      const data = await resp.json()
      if (data.imdb_id) setImdbId(data.imdb_id)

      if (data.streams?.length > 0) {
        // Filter out torrent streams to only keep direct HLS/HTTP streams
        const directBackend = data.streams.filter(s => s.url && s.url.startsWith('http') && !s.url.startsWith('magnet:'))
        if (directBackend.length > 0) {
          setStreams(directBackend.map(s => ({
            ...s,
            source: s.source || 'backend'
          })))
          setLoading(false)
          setError('')
          return
        }
      }
      setError(mediaType === 'tv' ? 'Nenhum stream online encontrado para este episódio.' : 'Nenhum stream online encontrado para este conteúdo.')
    } catch {
      setError(mediaType === 'tv'
        ? 'Nenhum stream online encontrado para este episódio. Tente outro ou verifique se o título tem ID no IMDB.'
        : 'Nenhum stream online encontrado. Verifique sua conexão ou tente outro título.')
    }
    setLoading(false)
  }

  const handleSelect = (stream) => {
    const isDirectExternal = stream.url && stream.url.startsWith('http')
    onSelectStream({
      url: isDirectExternal ? stream.url : `${BACKEND_URL}${stream.url}`,
      label: stream.description,
      lang: stream.lang,
      imdbId: imdbId || imdbIdProp,
      isMagnet: false,
      source: stream.source,
    })
  }

  if (!isOpen) return null

  const directStreams = streams.filter(s => s.url && s.url.startsWith('http') && !s.url.startsWith('magnet:'))
  const episodeLabel = season && episode ? ` - T${season}:E${episode}` : ''

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
          initial={{ opacity: 0, y: 100, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Fundo de desfoque estilo Glassmorphism */}
          <GlassBg />

          <ModalHeader>
            <ModalTitleArea>
              <ModalTitle>{title}{episodeLabel}</ModalTitle>
              <ModalSubtitle>Selecione um player online para assistir</ModalSubtitle>
            </ModalTitleArea>
            <CloseBtn onClick={onClose} aria-label="Fechar">
              <CloseRoundedIcon sx={{ fontSize: 22 }} />
            </CloseBtn>
          </ModalHeader>

          <ModalBody>
            {loading && (
              <LoadingContainer>
                <CircularProgress size={48} thickness={4} sx={{ color: '#0063e5' }} />
                <LoadingText>Buscando conexões online premium...</LoadingText>
              </LoadingContainer>
            )}

            {error && !loading && (
              <ErrorContainer>
                <ErrorText>{error}</ErrorText>
                <RetryBtn onClick={fetchStreams}>Tentar Novamente</RetryBtn>
              </ErrorContainer>
            )}

            {!loading && !error && directStreams.length > 0 && (
              <>
                <SectionTitle>
                  <StorageRoundedIcon sx={{ fontSize: 18, color: '#0063e5' }} />
                  Servidores de Transmissão Direta
                  <StreamCount>{directStreams.length} links disponíveis</StreamCount>
                </SectionTitle>
                <StreamList>
                  {directStreams.map((s, i) => (
                    <StreamCard key={`direct-${i}`} onClick={() => handleSelect(s)}>
                      <StreamInfo>
                        <StreamLabel title={s.description}>{s.description || s.name || 'Stream Premium'}</StreamLabel>
                        <StreamMeta>
                          {s.quality && <QualityBadge>{s.quality}</QualityBadge>}
                          {s.lang === 'dub' && <LangBadge $dub>DUB</LangBadge>}
                          {s.lang === 'leg' && <LangBadge>LEG</LangBadge>}
                          
                          {s.source === 'froststream' && <SourceBadge $frost>FrostStream</SourceBadge>}
                          {s.source === 'fenixflix' && <SourceBadge $fenix>FENIXFLIX</SourceBadge>}
                          {s.source !== 'froststream' && s.source !== 'fenixflix' && <SourceBadge>Premium</SourceBadge>}
                        </StreamMeta>
                      </StreamInfo>
                      <PlayIcon>
                        <PlayArrowRoundedIcon sx={{ fontSize: 26 }} />
                      </PlayIcon>
                    </StreamCard>
                  ))}
                </StreamList>
              </>
            )}
          </ModalBody>
        </Modal>
      </Overlay>
    </AnimatePresence>
  )
}

export default StreamSelectionModal

/* --- STYLES --- */

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100dvh;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(8px);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;

  @media (max-width: 600px) {
    padding: 0;
    align-items: flex-end; /* Bottom sheet para celular */
  }
`

const Modal = styled.div`
  position: relative;
  background: rgba(15, 17, 24, 0.85); /* Tom muito escuro mas transparente */
  border-radius: 20px;
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 40px 100px -20px rgba(0, 0, 0, 1), inset 0 1px 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;

  /* Borda sutil de vidro */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 20px;
    padding: 1px;
    background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0.02) 100%);
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask-composite: exclude;
    pointer-events: none;
    z-index: 2;
  }

  @media (max-width: 600px) {
    max-height: 90dvh;
    border-radius: 24px 24px 0 0;
    &::before { border-radius: 24px 24px 0 0; }
  }
`

const GlassBg = styled.div`
  position: absolute;
  inset: 0;
  backdrop-filter: blur(24px) saturate(150%);
  -webkit-backdrop-filter: blur(24px) saturate(150%);
  z-index: 0;
  pointer-events: none;
`

const ModalHeader = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 28px 32px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 600px) {
    padding: 24px 24px 16px;
  }
`

const ModalTitleArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
  min-width: 0;
`

const ModalTitle = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-shadow: 0 2px 4px rgba(0,0,0,0.5);

  @media (max-width: 600px) { font-size: 18px; }
`

const ModalSubtitle = styled.span`
  color: #a0a5b5;
  font-size: 14px;
  font-weight: 500;
`

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  flex-shrink: 0;
  margin-left: 16px;
  
  &:hover { 
    background: rgba(255, 255, 255, 0.15); 
    transform: scale(1.05);
  }
  &:active { transform: scale(0.95); }
`

const ModalBody = styled.div`
  position: relative;
  z-index: 2;
  padding: 20px 32px 32px;
  overflow-y: auto;
  flex: 1;
  -webkit-overflow-scrolling: touch;

  /* Custom Scrollbar Premium */
  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { 
    background: rgba(255, 255, 255, 0.15); 
    border-radius: 10px; 
    border: 2px solid rgba(15, 17, 24, 0.85);
  }

  @media (max-width: 600px) {
    padding: 16px 24px 32px;
  }
`

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 24px;
`

const LoadingText = styled.p`
  color: #a0a5b5;
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  animation: pulse 2s infinite ease-in-out;

  @keyframes pulse {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }
`

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 0;
  gap: 20px;
`

const ErrorText = styled.p`
  color: #ff5252;
  font-size: 16px;
  font-weight: 500;
  margin: 0;
  text-align: center;
`

const RetryBtn = styled.button`
  background: linear-gradient(135deg, #0063e5 0%, #0046a3 100%);
  color: #fff;
  border: none;
  padding: 12px 28px;
  border-radius: 30px;
  font-weight: 600;
  cursor: pointer;
  font-size: 15px;
  box-shadow: 0 8px 16px rgba(0, 99, 229, 0.25);
  transition: all 0.2s;
  
  &:hover { transform: translateY(-2px); box-shadow: 0 12px 20px rgba(0, 99, 229, 0.4); }
  &:active { transform: translateY(0); }
`

const SectionTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #e1e6f0;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin: 24px 0 16px;
  &:first-child { margin-top: 4px; }
`

const StreamCount = styled.span`
  color: #80869b;
  font-size: 12px;
  font-weight: 600;
  text-transform: none;
  margin-left: auto;
  letter-spacing: 0;
  background: rgba(255,255,255,0.06);
  padding: 4px 10px;
  border-radius: 12px;
`

const StreamList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const StreamCard = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.03);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  gap: 16px;
  cursor: pointer;

  &:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
    transform: translateY(-2px);
    box-shadow: 0 12px 24px rgba(0,0,0,0.3);
  }

  @media (max-width: 600px) { 
    padding: 16px; 
    flex-wrap: wrap; 
    gap: 12px;
    &:hover { transform: none; box-shadow: none; }
  }
`

const StreamInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-width: 0;
`

const StreamLabel = styled.span`
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  letter-spacing: 0.3px;

  @media (max-width: 600px) { font-size: 14px; }
`

const StreamMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`

/* BADGES MODERNOS (Pílulas) */
const BaseBadge = styled.span`
  font-size: 11px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 20px;
  letter-spacing: 0.5px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`

const LangBadge = styled(BaseBadge)`
  background: ${p => p.$dub ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.05) 100%)' : 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.05) 100%)'};
  color: ${p => p.$dub ? '#81c784' : '#64b5f6'};
  border: 1px solid ${p => p.$dub ? 'rgba(76, 175, 80, 0.3)' : 'rgba(33, 150, 243, 0.3)'};
`

const QualityBadge = styled(BaseBadge)`
  background: linear-gradient(135deg, rgba(156, 39, 176, 0.2) 0%, rgba(156, 39, 176, 0.05) 100%);
  color: #ce93d8;
  border: 1px solid rgba(156, 39, 176, 0.3);
`

const SourceBadge = styled(BaseBadge)`
  background: ${p => p.$frost ? 'linear-gradient(135deg, rgba(0, 99, 229, 0.2) 0%, rgba(0, 99, 229, 0.05) 100%)' : p.$fenix ? 'linear-gradient(135deg, rgba(233, 30, 99, 0.2) 0%, rgba(233, 30, 99, 0.05) 100%)' : 'rgba(255, 255, 255, 0.06)'};
  color: ${p => p.$frost ? '#00b0ff' : p.$fenix ? '#ff4081' : 'rgba(255, 255, 255, 0.5)'};
  border: 1px solid ${p => p.$frost ? 'rgba(0, 99, 229, 0.3)' : p.$fenix ? 'rgba(233, 30, 99, 0.3)' : 'rgba(255, 255, 255, 0.05)'};
`

const PlayIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #f9f6ee;
  color: #040b16;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  
  svg {
    margin-left: 2px; /* Centro ótico */
  }

  ${StreamCard}:hover & {
    background: #fff;
    transform: scale(1.08);
    box-shadow: 0 4px 12px rgba(255,255,255,0.25);
  }
`

