import React from 'react'

class ErrorBoundary extends React.Component {
	state = { hasError: false, error: null }

	static getDerivedStateFromError(error) {
		return { hasError: true, error }
	}

	render() {
		if (this.state.hasError) {
			return (
				<div style={{
					minHeight: '100vh',
					background: '#040b3e',
					color: '#fff',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					justifyContent: 'center',
					padding: 24,
					fontFamily: 'Roboto, sans-serif',
					textAlign: 'center',
				}}>
					<h1 style={{ margin: '0 0 16px', fontSize: 20 }}>Algo deu errado</h1>
					<p style={{ margin: '0 0 24px', opacity: 0.8, fontSize: 14 }}>
						Recarregue a página. Se o problema continuar, abra: <strong>http://localhost:5173/disney-plus-clone/</strong>
					</p>
					<button
						onClick={() => window.location.reload()}
						style={{
							background: '#0063e5',
							color: '#fff',
							border: 'none',
							padding: '12px 24px',
							borderRadius: 8,
							fontSize: 14,
							cursor: 'pointer',
						}}
					>
						Recarregar
					</button>
				</div>
			)
		}
		return this.props.children
	}
}

export default ErrorBoundary
