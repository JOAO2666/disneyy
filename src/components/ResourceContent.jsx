import React from 'react'
import PropTypes from 'prop-types'
import GridContainer from '@components/ui/GridContainer'
import { OpacityMotionContainer } from '@components/ui/MotionContainer'
import Loader from '@components/ui/Loader'
import ErrorBlock from '@components/ui/ErrorBlock'
import { t } from '@utils/i18n/i18n'

const ResourceContent = ({ isPending, isError, isSuccess, data, resourceList, type }) => (
	<>
		{isPending && <Loader />}
		{isError && <ErrorBlock message={t('errors.somethingWrong')} />}
		{isSuccess && !data.length && <p>{t('errors.noData')}</p>}
		{isSuccess && data.length > 0 && (
			<OpacityMotionContainer>
				<GridContainer movies={resourceList} path={type} />
			</OpacityMotionContainer>
		)}
	</>
)

ResourceContent.propTypes = {
	isPending: PropTypes.bool,
	isError: PropTypes.bool,
	isSuccess: PropTypes.bool,
	data: PropTypes.array,
	resourceList: PropTypes.array,
	type: PropTypes.string,
}

export default ResourceContent
