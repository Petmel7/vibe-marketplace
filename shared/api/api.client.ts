
import { getSupabaseBrowser }
    from '@/lib/supabase-browser'

import {
    ApiError,
    UnauthorizedError,
} from './api.errors'

import type {
    ApiResponse,
} from './api.types'

type RequestOptions = Omit<
    RequestInit,
    'body'
> & {
    body?: unknown
    auth?: boolean
}

async function getAccessToken() {
    const {
        data: { session },
    } = await getSupabaseBrowser().auth.getSession()

    return session?.access_token ?? null
}

async function request<T>(
    url: string,
    options?: RequestOptions,
): Promise<T> {
    const headers = new Headers(
        options?.headers,
    )

    headers.set(
        'Content-Type',
        'application/json',
    )

    if (options?.auth) {
        const token =
            await getAccessToken()

        if (!token) {
            throw new UnauthorizedError()
        }

        headers.set(
            'Authorization',
            `Bearer ${token}`,
        )
    }

    const response = await fetch(url, {
        ...options,
        headers,
        body: options?.body
            ? JSON.stringify(options.body)
            : undefined,
    })

    let json: ApiResponse<T>

    try {
        json = await response.json()
    } catch {
        throw new ApiError(
            'Invalid server response',
            response.status,
        )
    }

    if (!response.ok || !json.success) {
        throw new ApiError(
            json.success === false
                ? json.error.message
                : 'Request failed',
            response.status,
            json.success === false
                ? json.error.code
                : undefined,
        )
    }

    return json.data
}

export const apiClient = {
    get<T>(
        url: string,
        options?: RequestOptions,
    ) {
        return request<T>(url, {
            ...options,
            method: 'GET',
        })
    },

    post<T>(
        url: string,
        body?: unknown,
        options?: RequestOptions,
    ) {
        return request<T>(url, {
            ...options,
            method: 'POST',
            body,
        })
    },

    patch<T>(
        url: string,
        body?: unknown,
        options?: RequestOptions,
    ) {
        return request<T>(url, {
            ...options,
            method: 'PATCH',
            body,
        })
    },

    delete<T>(
        url: string,
        options?: RequestOptions,
    ) {
        return request<T>(url, {
            ...options,
            method: 'DELETE',
        })
    },
}
