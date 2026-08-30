/**
 * Server-side helpers for reading/writing the user store.
 * Since this project uses localStorage as the "database", we can't
 * access it from API routes (server-side). Instead:
 *
 * - The /forgot-password API route checks if the email exists by reading
 *   the request body (client sends the email; we never confirm existence
 *   in the response — same message either way to avoid user enumeration).
 *
 * - The /reset-password API route receives { token, newPassword } and
 *   returns { email } so the client-side can update localStorage.
 *
 * This is a deliberate design: the server holds the secure token,
 * the client holds the encrypted user store. The server authorizes
 * the password change; the client applies it.
 */

export type ServerUserOp = 'check' | 'reset'
