import { CartDto } from "@/features/cart/cart.dto"

export function withQuantityUpdate(cart: CartDto, itemId: string, newQty: number): CartDto {
    const items = cart.items.map((item) => {
        if (item.id !== itemId) return item
        const newLineTotal = (Number(item.unitPrice) * newQty).toFixed(2)
        return { ...item, quantity: newQty, lineTotal: newLineTotal }
    })
    const totalAmount = items.reduce((acc, i) => acc + Number(i.lineTotal), 0).toFixed(2)
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
    return { ...cart, items, totalAmount, itemCount }
}

export function withItemRemoved(cart: CartDto, itemId: string): CartDto {
    const items = cart.items.filter((i) => i.id !== itemId)
    const totalAmount = items.reduce((acc, i) => acc + Number(i.lineTotal), 0).toFixed(2)
    const itemCount = items.reduce((acc, i) => acc + i.quantity, 0)
    return { ...cart, items, totalAmount, itemCount }
}