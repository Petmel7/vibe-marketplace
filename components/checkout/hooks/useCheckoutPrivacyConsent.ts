import { useEffect, useId, useRef, useState } from 'react'

const CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY = 'checkout:privacy-consent:v1'

export function useCheckoutPrivacyConsent() {
  const hintId = useId()
  const errorId = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }

    return window.localStorage.getItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY) === 'true'
  })
  const [privacyConsentError, setPrivacyConsentError] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (acceptedPrivacy) {
      window.localStorage.setItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY, 'true')
      return
    }

    window.localStorage.removeItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY)
  }, [acceptedPrivacy])

  const handlePrivacyConsentChange = (checked: boolean) => {
    setAcceptedPrivacy(checked)

    if (checked) {
      setPrivacyConsentError(null)
    }
  }

  const requirePrivacyConsent = () => {
    if (acceptedPrivacy) {
      setPrivacyConsentError(null)
      return true
    }

    setPrivacyConsentError('Підтвердіть згоду на обробку персональних даних.')
    inputRef.current?.focus()
    return false
  }

  const resetPrivacyConsent = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(CHECKOUT_PRIVACY_CONSENT_STORAGE_KEY)
    }
    setAcceptedPrivacy(false)
  }

  return {
    acceptedPrivacy,
    privacyConsentError,
    privacyConsentHintId: hintId,
    privacyConsentErrorId: errorId,
    privacyConsentRef: inputRef,
    handlePrivacyConsentChange,
    requirePrivacyConsent,
    resetPrivacyConsent,
  }
}
