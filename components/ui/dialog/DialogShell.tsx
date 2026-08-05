'use client'

import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'

function getFocusableElements(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(','),
    ),
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true')
}

export default function DialogShell({
  open,
  children,
  labelledBy,
  describedBy,
  onClose,
  closeOnEscape = true,
  closeOnOutsideClick = true,
  initialFocusRef,
  className,
  panelClassName,
  useDefaultClassNames = true,
}: {
  open: boolean
  children: ReactNode
  labelledBy: string
  describedBy?: string
  onClose: () => void
  closeOnEscape?: boolean
  closeOnOutsideClick?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  className?: string
  panelClassName?: string
  useDefaultClassNames?: boolean
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const focusTarget = initialFocusRef?.current ?? getFocusableElements(panelRef.current ?? document.body)[0] ?? panelRef.current
    focusTarget?.focus()

    return () => {
      document.body.style.overflow = previousOverflow
      previousFocusRef.current?.focus()
    }
  }, [initialFocusRef, open])

  if (!open || typeof document === 'undefined') {
    return null
  }

  const handleBackdropMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && event.target === event.currentTarget) {
      onClose()
    }
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && closeOnEscape) {
      event.stopPropagation()
      onClose()
      return
    }

    if (event.key !== 'Tab' || !panelRef.current) {
      return
    }

    const focusableElements = getFocusableElements(panelRef.current)
    if (focusableElements.length === 0) {
      event.preventDefault()
      panelRef.current.focus()
      return
    }

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault()
      lastElement.focus()
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault()
      firstElement.focus()
    }
  }

  return createPortal(
    <div
      className={clsx(
        useDefaultClassNames
          ? 'fixed inset-0 z-50 flex items-center justify-center bg-background/80 px-4 py-6 backdrop-blur-sm'
          : '',
        className,
      )}
      onMouseDown={handleBackdropMouseDown}
      onKeyDown={handleKeyDown}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={clsx(
          useDefaultClassNames
            ? 'w-full max-w-lg rounded-[28px] border border-panelBorder bg-background p-6 shadow-2xl'
            : '',
          panelClassName,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
