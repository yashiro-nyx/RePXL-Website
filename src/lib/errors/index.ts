// RePXL shared error/message system.
//
// PROJECT RULE: Customer-facing interfaces must never expose raw validation
// objects, stack traces, database errors, internal status messages, or
// implementation-specific exception text. Route failures through these helpers.

export * from './messages'
export * from './client-errors'
// Note: api-errors.ts is server-only (imports next/server). Import it directly
// from '@/lib/errors/api-errors' in route handlers to avoid pulling
// next/server into client bundles.
