import styled from 'styled-components'
import { OpacityMotionContainer } from '@components/ui/MotionContainer'
import ReactPlayer from 'react-player'
import { t } from '@utils/i18n/i18n'

const VideoPlayer = ({ onClick, videoUrl }) => {
	return (
		<VideoWrapper onClick={onClick}>
			<OpacityMotionContainer>
				<>
					{videoUrl && <ReactPlayer width='70vw' height='50vh' url={videoUrl} controls={true} />}
					{!videoUrl && <p>{t('errors.noTrailer')}</p>}
				</>
			</OpacityMotionContainer>
		</VideoWrapper>
	)
}

export default VideoPlayer

const VideoWrapper = styled.div`
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.8);
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 9999;
`
