/**
 * Identifies the owner of a recently-viewed list.
 * Exactly one field is set, matching the DB CHECK constraint that enforces
 * one non-null identifier column per row.
 */
export type ViewedIdentifier = { userId: string } | { sessionId: string }
