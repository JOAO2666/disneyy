import styled from 'styled-components'
import { t } from '@utils/i18n/i18n'

const DetailParagraph = ({ releaseYear, numberOfSeasons, genres }) => {
	return (
		<InfoParagraph>
			{releaseYear} {numberOfSeasons && (numberOfSeasons > 1 ? `• ${numberOfSeasons} ${t('detail.seasons')}` : `• 1 ${t('detail.season')}`)} • {genres}
		</InfoParagraph>
	)
}

export default DetailParagraph

const InfoParagraph = styled.p`
	margin: 15px 0 25px;
	text-align: left;

	@media (min-width: 800px) {
		font-size: 16px;
	}

	@media (min-width: 1000px) {
		font-size: 18px;
	}
`
