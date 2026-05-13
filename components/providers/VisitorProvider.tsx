'use client'

import { useEffect } from 'react'

export function VisitorProvider() {
    useEffect(() => {
        fetch('/api/visitor/init', {
            method: 'POST',
        }).catch(() => { })
    }, [])

    return null
}