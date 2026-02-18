import { OpacityMotionContainer } from '@components/ui/MotionContainer'
import GridContainer from '@components/ui/GridContainer'
import Title from '@components/ui/Title'
import Loader from '@components/ui/Loader'
import ErrorBlock from '@components/ui/ErrorBlock'
import { t } from '@utils/i18n/i18n'

const SearchResults = ({ query, data, isLoading, isError }) => {
	return (
		<OpacityMotionContainer>
			<>
				<Title>{t('search.resultsFor')} {query}</Title>
				{isLoading && <Loader />}
				{isError && <ErrorBlock message={t('errors.somethingWrong')} />}
				{data?.length > 0 && (
					<OpacityMotionContainer>
						<GridContainer movies={data} />
					</OpacityMotionContainer>
				)}
				{data?.length === 0 && !isLoading && <p>{t('search.noResults')}</p>}
			</>
		</OpacityMotionContainer>
	)
}

export default SearchResults
