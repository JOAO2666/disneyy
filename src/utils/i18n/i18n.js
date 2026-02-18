import { createContext, useContext } from 'react'
import translations from './translations'

const getDeviceLanguage = () => {
	const lang = navigator.language || navigator.userLanguage || 'en'
	const shortLang = lang.split('-')[0].toLowerCase()
	return translations[shortLang] ? shortLang : 'en'
}

const currentLang = getDeviceLanguage()

export const t = (key) => {
	const keys = key.split('.')
	let value = translations[currentLang]
	for (const k of keys) {
		if (value && value[k] !== undefined) {
			value = value[k]
		} else {
			let fallback = translations['en']
			for (const fk of keys) {
				if (fallback && fallback[fk] !== undefined) {
					fallback = fallback[fk]
				} else {
					return key
				}
			}
			return fallback
		}
	}
	return value
}

export const getLang = () => currentLang

export const I18nContext = createContext({ t, lang: currentLang })

export const useI18n = () => useContext(I18nContext)
