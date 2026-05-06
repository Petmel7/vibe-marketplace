export function getCategoryImage(imageUrl?: string | null): string {
    if (!imageUrl || imageUrl.trim() === '') {
        return '/placeholder.png'
    }
    return imageUrl
}