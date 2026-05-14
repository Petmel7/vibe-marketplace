import type { CartDto } from "@/features/cart/cart.dto"

export async function fetchCart(sessionId: string) {
    const res = await fetch('/api/cart', {
        headers: { 'x-session-id': sessionId },
    })

    return res.json() as Promise<{
        success: boolean
        data: CartDto
    }>
}

export async function updateCartItem(
    sessionId: string,
    itemId: string,
    quantity: number,
) {
    const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'x-session-id': sessionId,
        },
        body: JSON.stringify({ quantity }),
    })

    return res.json()
}

export async function removeCartItem(
    sessionId: string,
    itemId: string,
) {
    const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE',
        headers: { 'x-session-id': sessionId },
    })

    return res.json()
}