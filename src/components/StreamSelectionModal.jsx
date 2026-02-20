import { useState, useEffect } from 'react'
import styled from 'styled-components'
import { motion, AnimatePresence } from 'framer-motion'
import CloseRoundedIcon from '@mui/icons-material/CloseRounded'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded'
import CircularProgress from '@mui/material/CircularProgress'
import StorageRoundedIcon from '@mui/icons-material/StorageRounded'
import { fetchTorrentioStreams } from '@utils/http/fetch-torrentio-streams'

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

    // 1) Torrentio primeiro (instantâneo)
    if (imdbIdProp) {
      try {
        const torrentio = await fetchTorrentioStreams(imdbIdProp, torrentioType, season, episode)
        if (torrentio.imdb_id) setImdbId(torrentio.imdb_id)
        if (torrentio.streams?.length > 0) {
          setStreams(torrentio.streams)
          setLoading(false)
          setError('')
          return
        }
      } catch (e) {
        console.warn('Torrentio falhou, tentando backend:', e)
      }
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
        setStreams(data.streams)
      } else {
        setError(mediaType === 'tv' ? 'Nenhum stream encontrado para este episódio.' : 'Nenhum stream encontrado para este conteúdo.')
      }
    } catch {
      setError(mediaType === 'tv'
        ? 'Nenhum stream encontrado para este episódio. Tente outro ou verifique se o título tem ID no IMDB.'
        : 'Nenhum stream encontrado. Verifique sua conexão ou tente outro título.')
    }
    setLoading(false)
  }

  const handleSelect = (stream) => {
    const isMagnet = stream.url && stream.url.startsWith('magnet:')
    onSelectStream({
      url: isMagnet ? stream.url : `${BACKEND_URL}${stream.url}`,
      label: stream.description,
      lang: stream.lang,
      imdbId: imdbId || imdbIdProp,
      isMagnet: !!isMagnet,
      fileIdx: stream.fileIdx,
    })
  }

  const handleDownload = (e, stream) => {
    e.stopPropagation()
    if (!stream?.url?.startsWith('magnet:')) return
    const blob = new Blob([stream.url], { type: 'application/x-bittorrent' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${title || 'download'}.magnet`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  if (!isOpen) return null

  const torrentStreams = streams.filter(s => s.source === 'torrentio')
  const directStreams = streams.filter(s => s.source !== 'torrentio')
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
              <ModalSubtitle>Selecione um stream para assistir</ModalSubtitle>
            </ModalTitleArea>
            <CloseBtn onClick={onClose} aria-label="Fechar">
              <CloseRoundedIcon sx={{ fontSize: 22 }} />
            </CloseBtn>
          </ModalHeader>

          <ModalBody>
            {loading && (
              <LoadingContainer>
                <CircularProgress size={48} thickness={4} sx={{ color: '#0063e5' }} />
                <LoadingText>Buscando conexões de alta velocidade...</LoadingText>
              </LoadingContainer>
            )}

            {error && !loading && (
              <ErrorContainer>
                <ErrorText>{error}</ErrorText>
                <RetryBtn onClick={fetchStreams}>Tentar Novamente</RetryBtn>
              </ErrorContainer>
            )}

            {!loading && !error && streams.length > 0 && (
              <>
                {directStreams.length > 0 && (
                  <>
                    <SectionTitle>
                      <StorageRoundedIcon sx={{ fontSize: 18, color: '#0063e5' }} />
                      Servidores Diretos Premium
                    </SectionTitle>
                    <StreamList>
                      {directStreams.map((s, i) => (
                        <StreamCard key={`direct-${i}`} onClick={() => handleSelect(s)}>
                          <StreamInfo>
                            <StreamLabel>{s.description || s.name || 'Stream'}</StreamLabel>
                            <StreamMeta>
                              {s.quality && <QualityBadge>{s.quality}</QualityBadge>}
                              {s.lang === 'dub' && <LangBadge $dub>DUB</LangBadge>}
                              {s.lang === 'leg' && <LangBadge>LEG</LangBadge>}
                              <SourceBadge>Direto</SourceBadge>
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

                {torrentStreams.length > 0 && (
                  <>
                    <SectionTitle>
                      <span role="img" aria-label="magnet" style={{ fontSize: '18px' }}>🚀</span>
                      Rede Torrentio (Ultra Rápida)
                      <StreamCount>{torrentStreams.length} conexões globais</StreamCount>
                    </SectionTitle>
                    <StreamList>
                      {torrentStreams.map((s, i) => (
                        <StreamCard key={`torrent-${i}`}>
                          <StreamInfo>
                            <StreamLabel title={s.description || s.name}>{s.description || s.name}</StreamLabel>
                            <StreamMeta>
                              {s.quality && <QualityBadge>{s.quality}</QualityBadge>}
                              {s.lang === 'dub' && <LangBadge $dub>DUB</LangBadge>}
                              {s.lang === 'leg' && <LangBadge>LEG</LangBadge>}
                              {s.size && (
                                <SizeBadge>
                                  <StorageRoundedIcon sx={{ fontSize: 14 }} />
                                  {s.size}
                                </SizeBadge>
                              )}
                              {s.seeders != null && s.seeders > 0 && (
                                <SeedersBadge>
                                  &#x1F464; {s.seeders} Sementes
                                </SeedersBadge>
                              )}
                              {s.tracker && (
                                <TrackerBadge>{s.tracker}</TrackerBadge>
                              )}
                            </StreamMeta>
                          </StreamInfo>
                          <StreamActions>
                            <PrimaryPlayBtn onClick={() => handleSelect(s)}>
                              <PlayArrowRoundedIcon sx={{ fontSize: 20 }} />
                              <span>Assistir Agora</span>
                            </PrimaryPlayBtn>
                            <IconButton $download onClick={(e) => handleDownload(e, s)} title="Baixar Arquivo">
                              <DownloadRoundedIcon sx={{ fontSize: 20 }} />
                            </IconButton>
                          </StreamActions>
                        </StreamCard>
                      ))}
                    </StreamList>
                  </>
                )}
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
    border: 2px solid rgba(15, 17, 24, 0.85); /* "marge" fake */
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

const SizeBadge = styled(BaseBadge)`
  background: rgba(255, 255, 255, 0.06);
  color: #b0b5c4;
  border: 1px solid rgba(255, 255, 255, 0.05);
`

const SeedersBadge = styled(BaseBadge)`
  background: rgba(0, 200, 83, 0.15);
  color: #00e676;
  border: 1px solid rgba(0, 200, 83, 0.2);
  text-shadow: 0 0 10px rgba(0, 230, 118, 0.3);
`

const TrackerBadge = styled(BaseBadge)`
  background: rgba(255, 193, 7, 0.1);
  color: #ffd54f;
  border: 1px solid rgba(255, 193, 7, 0.2);
`

const SourceBadge = styled(BaseBadge)`
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.5);
`

/* BOTÕES PREMIUM */
const StreamActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;

  @media (max-width: 600px) { 
    width: 100%; 
    margin-top: 8px; 
    gap: 8px;
  }
`

const PrimaryPlayBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px 10px 16px;
  border-radius: 30px; /* Pill shape */
  border: none;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  background: #f9f6ee; /* Quase branco pro play */
  color: #040b16; /* Fundo hiper escuro */
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: #fff;
    transform: scale(1.03);
    box-shadow: 0 4px 12px rgba(255,255,255,0.2);
  }
  
  &:active { transform: scale(0.97); }

  @media (max-width: 600px) {
    flex: 1;
  }
`

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: #a0a5b5;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.12);
    color: #fff;
    border-color: rgba(255, 255, 255, 0.2);
  }

  &:active { transform: scale(0.92); }
`

const PlayIcon = styled(PrimaryPlayBtn)`
  padding: 0;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  
  svg {
    margin-left: 2px; /* Centro ótico */
  }
`

