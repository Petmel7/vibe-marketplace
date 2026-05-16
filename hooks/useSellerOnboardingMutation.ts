'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

type SellerOnboardingPayload = {
  businessName: string
  taxId: string | null
  bio: string | null
}

export function useSellerOnboardingMutation() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const submit = (payload: SellerOnboardingPayload) =>
    new Promise<boolean>((resolve) => {
      setErrorMessage(null)

      startTransition(async () => {
        try {
          const onboardResponse = await fetch('/api/profile/seller/onboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              businessName: payload.businessName,
              taxId: payload.taxId,
            }),
          })

          const onboardJson = await onboardResponse.json()

          if (!onboardResponse.ok || !onboardJson?.success) {
            const message = 'We could not submit your seller application. Please review your details and try again.'
            setErrorMessage(message)
            toast.error(message)
            resolve(false)
            return
          }

          if (payload.bio) {
            const profileResponse = await fetch('/api/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ bio: payload.bio }),
            })

            const profileJson = await profileResponse.json()

            if (!profileResponse.ok || !profileJson?.success) {
              const message =
                'Your seller application was saved, but we could not store the seller bio just yet. You can add it later from profile settings.'
              toast.error(message)
              router.push('/seller/onboarding?submitted=1')
              router.refresh()
              resolve(true)
              return
            }
          }

          toast.success('Seller application submitted.')
          router.push('/seller/onboarding?submitted=1')
          router.refresh()
          resolve(true)
        } catch {
          const message = 'We could not submit your seller application right now. Please try again in a moment.'
          setErrorMessage(message)
          toast.error(message)
          resolve(false)
        }
      })
    })

  return {
    errorMessage,
    isPending,
    setErrorMessage,
    submit,
  }
}
