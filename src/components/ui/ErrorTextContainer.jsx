import { Link } from 'react-router-dom'
import styled from 'styled-components'
import { styled as styledMUI } from '@mui/system'

import Button from '@mui/material/Button'
import { t } from '@utils/i18n/i18n'

const ErrorTextContainer = () => {
	return (
		<Container>
			<h1>{t('errors.pageNotFound')}</h1>
			<p>{t('errors.pageNotFoundDesc')}</p>
			<Link to='/disney-plus-clone/'>
				<StyledButton variant='contained'>{t('errors.backToHome')}</StyledButton>
			</Link>
		</Container>
	)
}

export default ErrorTextContainer

const Container = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	text-align: center;
	font-size: 12px;

	h1 {
		font-size: 20px;
		letter-spacing: 1px;
		margin-bottom: 0;
	}

	p {
		margin-bottom: 30px;
		width: 60%;
	}

	@media (min-width: 500px) {
		font-size: 14px;

		h1 {
			font-size: 22px;
		}
	}

	@media (min-width: 700px) {
		font-size: 16px;

		h1 {
			font-size: 24px;
		}
	}

	@media (min-width: 1000px) {
		font-size: 18px;

		h1 {
			font-size: 26px;
		}
	}
`

const StyledButton = styledMUI(Button)({
	backgroundColor: '#0158e1',
	fontSize: '10px',

	'@media (min-width: 600px)': {
		fontSize: '12px',
	},

	'@media (min-width: 900px)': {
		fontSize: '14px',
	},

	'@media (min-width: 1200px)': {
		fontSize: '16px',
	},

	'&:hover': {
		backgroundColor: '#0582f0',
	},
})
