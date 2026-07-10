
'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleUser } from 'lucide-react'
import type { SessionUser } from '@/types/auth'
import { ROLE_VALUES } from '@/lib/constants/roles'
import { getRoleAwareNavLinks } from '@/lib/auth/navigation'
import { signOutAction } from '@/features/auth/auth.actions'
import { useCurrentUser } from '@/hooks/useCurrentUser'

type AuthUserMenuProps = {
  user: SessionUser | null
}

export default function AuthUserMenu({ user }: AuthUserMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const { isAuthLoading } = useCurrentUser()
  const isLoading = !user && isAuthLoading
  const links = user ? getRoleAwareNavLinks(user) : []
  const loginHref = pathname
    ? `/login?next=${encodeURIComponent(pathname)}`
    : '/login'

  useEffect(() => {
    if (!isOpen) return

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onEscape)

    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onEscape)
    }
  }, [isOpen])

  return (
    <div ref={menuRef} className="relative inline-flex">
      {user ? (
        <button
          type="button"
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-label="Відкрити меню акаунта"
          className="ui-icon-button rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onClick={() => setIsOpen((current) => !current)}
        >
          <CircleUser
            size={24}
            color="#E8E9EA"
            className="block"
            aria-hidden="true"
          />
        </button>
      ) : (
        <Link
          aria-label={isLoading ? 'Завантаження акаунта' : 'Відкрити сторінку входу'}
          aria-busy={isLoading}
          className={`ui-icon-button rounded-full ${isLoading ? 'cursor-not-allowed opacity-70' : ''
            }`}
          href={loginHref}
          onClick={(event) => {
            if (isLoading) {
              event.preventDefault()
            }
          }}
        >
          <CircleUser
            size={24}
            color="#E8E9EA"
            className="block"
            aria-hidden="true"
          />
        </Link>
      )}

      {user && isOpen ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-3 w-72 rounded-2xl border border-panelBorder bg-panel p-3 shadow-[0_24px_64px_rgba(0,0,0,0.45)]"
        >
          <div className="rounded-2xl bg-canvas px-4 py-3">
            <p className="text-xs uppercase tracking-[0.2em] text-copy-muted">
              Ви увійшли
            </p>

            <p className="mt-2 break-all text-sm font-medium text-copy-strong">
              {user.email}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              {user.roles.map((role) => (
                <span
                  key={role}
                  className="inline-flex rounded-full bg-panel px-2.5 py-1 text-xs text-copy-primary"
                >
                  {role === ROLE_VALUES.BUYER
                    ? 'Покупець'
                    : role === ROLE_VALUES.SELLER
                      ? 'Продавець'
                      : 'Адміністратор'}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                role="menuitem"
                className="flex rounded-xl px-3 py-2 text-sm text-copy-primary transition-colors hover:bg-canvas"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <form action={signOutAction} className="mt-3">
            <button
              type="submit"
              className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-copy-primary transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Вийти
            </button>
          </form>
        </div>
      ) : null}
    </div>
  )
}
