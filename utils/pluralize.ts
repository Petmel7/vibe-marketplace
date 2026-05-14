export function pluralizeItems(count: number): string {
    if (count === 1) return 'Товари'
    if (count >= 2 && count <= 4) return 'Товар'
    return 'Товарів'
}