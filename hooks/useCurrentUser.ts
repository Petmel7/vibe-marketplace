'use client'

import { useContext } from 'react'
import { AuthSessionContext } from '@/components/auth/AuthSessionProvider'

export function useCurrentUser() {
  const context = useContext(AuthSessionContext)

  if (!context) {
    throw new Error('useCurrentUser must be used within AuthSessionProvider')
  }

  return context
}
