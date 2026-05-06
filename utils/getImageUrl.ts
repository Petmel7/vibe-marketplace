
export function getImageUrl(
    imageUrl?: string | null,
    placeholder = '/placeholder.png'
): string {
    if (!imageUrl || imageUrl.trim() === '') {
        return placeholder;
    }
    return imageUrl;
}