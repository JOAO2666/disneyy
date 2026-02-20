import styled from 'styled-components'

import disneyLogo from '@images/disney-logo.svg'
import { t } from '@utils/i18n/i18n'

const Footer = () => {
	const currentYear = new Date().getFullYear()

	return (
		<StyledFooter>
			<Wrapper>
				<StyledLogo src={disneyLogo} alt='Logo of Disney+ App'></StyledLogo>
				<StyledParagraph>
					&copy; {currentYear}, {t('footer.codedBy')} <a href='https://github.com/JOAO2666'>João Emanuel</a>
				</StyledParagraph>
			</Wrapper>
		</StyledFooter>
	)
}

export default Footer

const StyledFooter = styled.footer`
	width: 100%;
	height: 100px;
	position: absolute;
	bottom: 0;
`

const Wrapper = styled.section`
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	padding: 10px;
	background-color: #030408;
`

const StyledLogo = styled.img`
	height: 50px;
`

const StyledParagraph = styled.p`
	margin: 5px 0;
	font-size: 12px;
`
