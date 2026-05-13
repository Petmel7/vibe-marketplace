import { cookies } from 'next/headers'
import {
    VISITOR_COOKIE_MAX_AGE,
    VISITOR_COOKIE_NAME,
} from './visitor.constants'

export async function getOrCreateVisitorId() {
    const cookieStore = await cookies()

    const existing =
        cookieStore.get(VISITOR_COOKIE_NAME)?.value

    if (existing) {
        return existing
    }

    const visitorId = crypto.randomUUID()

    cookieStore.set(VISITOR_COOKIE_NAME, visitorId, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: VISITOR_COOKIE_MAX_AGE,
    })

    return visitorId
}

export async function getVisitorId() {
    const cookieStore = await cookies()

    return (
        cookieStore.get(VISITOR_COOKIE_NAME)?.value ??
        null
    )
}

export async function clearVisitorId() {
    const cookieStore = await cookies()

    cookieStore.delete(VISITOR_COOKIE_NAME)
}