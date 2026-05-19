/**
 * Converts a human-readable name into a URL-safe slug.
 *
 * Rules:
 * - Lowercase
 * - Trim leading/trailing whitespace
 * - Spaces (and consecutive spaces) → single hyphen
 * - Remove any character that is not a lowercase letter, digit, or hyphen
 * - Collapse consecutive hyphens into one
 * - Strip leading/trailing hyphens
 * - Truncate to 100 characters
 *
 * Example: "My Cool Store!" → "my-cool-store"
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}
