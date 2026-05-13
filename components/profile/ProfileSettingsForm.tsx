'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { SessionUser } from '@/types/auth'
import type { UserProfileDto } from '@/features/profile/profile.dto'
import { signOutAction } from '@/features/auth/auth.actions'

export default function ProfileSettingsForm({
  user,
  profile,
}: {
  user: SessionUser
  profile: UserProfileDto | null
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [formState, setFormState] = useState({
    displayName: profile?.displayName ?? '',
    bio: profile?.bio ?? '',
    phoneNumber: profile?.phoneNumber ?? '',
    avatarUrl: profile?.avatarUrl ?? '',
  })

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setErrorMessage(null)

    startTransition(async () => {
      const response = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: formState.displayName || null,
          bio: formState.bio || null,
          phoneNumber: formState.phoneNumber || null,
          avatarUrl: formState.avatarUrl || null,
        }),
      })

      const json = await response.json()
      if (!response.ok || !json.success) {
        setErrorMessage(json.error?.message ?? 'Could not save profile settings.')
        return
      }

      setMessage('Profile settings saved.')
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <section className="ui-elevated-panel p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-panelBorder bg-panel text-xl font-semibold text-copy-strong">
            {formState.displayName?.trim().charAt(0) || user.email.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-copy-strong">Account settings</h2>
            <p className="text-sm text-copy-muted">Update your buyer profile and account presentation.</p>
          </div>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Display name</span>
            <input
              className="ui-surface-input"
              value={formState.displayName}
              onChange={(event) => setFormState((current) => ({ ...current, displayName: event.target.value }))}
            />
          </label>

          <label className="space-y-2">
            <span className="block text-sm font-medium text-copy-strong">Phone number</span>
            <input
              className="ui-surface-input"
              value={formState.phoneNumber}
              onChange={(event) => setFormState((current) => ({ ...current, phoneNumber: event.target.value }))}
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="block text-sm font-medium text-copy-strong">Avatar URL</span>
            <input
              className="ui-surface-input"
              value={formState.avatarUrl}
              onChange={(event) => setFormState((current) => ({ ...current, avatarUrl: event.target.value }))}
              placeholder="https://example.com/avatar.jpg"
            />
          </label>

          <label className="space-y-2 sm:col-span-2">
            <span className="block text-sm font-medium text-copy-strong">Bio</span>
            <textarea
              className="ui-surface-input min-h-32 resize-y"
              value={formState.bio}
              onChange={(event) => setFormState((current) => ({ ...current, bio: event.target.value }))}
            />
          </label>

          <div className="sm:col-span-2 flex flex-col gap-3 sm:flex-row">
            <button type="submit" className="ui-primary-button" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        </form>

        {message ? (
          <p className="mt-4 rounded-2xl border border-brand-success/30 bg-brand-success/10 px-4 py-3 text-sm text-copy-primary">
            {message}
          </p>
        ) : null}
        {errorMessage ? (
          <p className="mt-4 rounded-2xl border border-brand-danger/30 bg-brand-danger/10 px-4 py-3 text-sm text-copy-primary">
            {errorMessage}
          </p>
        ) : null}
      </section>

      <section className="ui-panel p-5 sm:p-6">
        <h3 className="text-base font-semibold text-copy-strong">Account metadata</h3>
        <dl className="mt-4 grid gap-3 text-sm text-copy-secondary sm:grid-cols-2">
          <div>
            <dt className="text-copy-muted">Email</dt>
            <dd className="mt-1 break-all text-copy-primary">{user.email}</dd>
          </div>
          <div>
            <dt className="text-copy-muted">Profile created</dt>
            <dd className="mt-1 text-copy-primary">
              {profile ? new Date(profile.createdAt).toLocaleDateString('uk-UA') : 'Not available'}
            </dd>
          </div>
          <div>
            <dt className="text-copy-muted">Last updated</dt>
            <dd className="mt-1 text-copy-primary">
              {profile ? new Date(profile.updatedAt).toLocaleDateString('uk-UA') : 'Not available'}
            </dd>
          </div>
          <div>
            <dt className="text-copy-muted">Security</dt>
            <dd className="mt-1 text-copy-primary">Ready for future MFA and account security flows.</dd>
          </div>
        </dl>

        <form action={signOutAction} className="mt-5">
          <button type="submit" className="ui-secondary-button w-full sm:w-auto">
            Sign out
          </button>
        </form>
      </section>
    </div>
  )
}
