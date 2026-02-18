import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { userActions } from '@store/slices/user-slice'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { auth } from '@/firebase'
import { t } from '@utils/i18n/i18n'

const useAuthentication = () => {
	const navigate = useNavigate()
	const dispatch = useDispatch()
	const [error, setError] = useState(null)
	let errorText

	const signIn = async data => {
		try {
			await signInWithEmailAndPassword(auth, data.email, data.password)
			navigate('/disney-plus-clone/')

			localStorage.setItem('lastEnteredEmail', data.email)
			localStorage.removeItem('signInEmail')
			localStorage.removeItem('signUpEmail')
		} catch (error) {
			console.error(error)
			if (error.code === 'auth/invalid-credential') {
				errorText = t('auth.invalidCredentials')
				setError(errorText)

				localStorage.setItem('signUpEmail', data.email)
			}
		}
	}

	const signUp = async data => {
		try {
			await createUserWithEmailAndPassword(auth, data.email, data.password)
			await signInWithEmailAndPassword(auth, data.email, data.password)
			await updateProfile(auth.currentUser, { displayName: data.userName })

			dispatch(
				userActions.signInUser({
					uid: auth.currentUser.uid,
					email: auth.currentUser.email,
					userName: auth.currentUser.displayName,
				})
			)

			navigate('/disney-plus-clone/')

			localStorage.setItem('signInEmail', data.email)
			localStorage.removeItem('signUpEmail')
		} catch (error) {
			console.error(error)
			if (error.code === 'auth/email-already-in-use') {
				errorText = t('auth.emailInUse')
				setError(errorText)

				localStorage.setItem('signInEmail', data.email)
			}
		}
	}

	return { signIn, signUp, error }
}

export default useAuthentication
