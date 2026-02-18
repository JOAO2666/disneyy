import useWatchList from '@hooks/use-watchlist'

import styled from 'styled-components'
import Container from '@components/ui/Container'
import { OpacityMotionContainer } from '@components/ui/MotionContainer'
import GridContainer from '@components/ui/GridContainer'
import Title from '@components/ui/Title'
import { t } from '@utils/i18n/i18n'

const MyListPage = () => {
	const resourceArray = useWatchList()

	return (
		<StyledContainer>
			<Title>{t('myList.title')}</Title>
			<OpacityMotionContainer>
				<Wrapper>
					{resourceArray.length > 0 && <GridContainer movies={resourceArray} />}
					{resourceArray.length === 0 && (
						<InfoParagraph>{t('myList.empty')}</InfoParagraph>
					)}
				</Wrapper>
			</OpacityMotionContainer>
		</StyledContainer>
	)
}

export default MyListPage

const StyledContainer = styled(Container)`
	margin-top: 30px;
	padding: 60px;
	text-align: center;
`

const Wrapper = styled.section`
	padding-bottom: 60px;
	width: 100%;
	text-align: left;
`

const InfoParagraph = styled.p`
	@media (min-width: 600px) {
		font-size: 18px;
	}

	@media (min-width: 1000px) {
		font-size: 20px;
	}
`
