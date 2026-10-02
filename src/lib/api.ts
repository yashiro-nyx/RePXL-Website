import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { zodToSafeBody } from '@/lib/errors/api-errors'

// ─── Standard API Response Helpers ──────────────────────────────────────────────

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

/**
 * Customer-safe validation response (422). Returns a per-field map of friendly
 * messages (`fieldErrors`) plus a top-level `error` set to the first field's
 * message — NO Zod paths, codes, or numeric metadata. Detailed diagnostics are
 * left to server logs. Use this everywhere a ZodError is caught; never render
 * `zodError.message` to a customer.
 */
export function validationError(error: ZodError) {
  return NextResponse.json(zodToSafeBody(error), { status: 422 })
}

export function unauthorizedResponse(message = 'Unauthorized') {
  return NextResponse.json({ success: false, error: message }, { status: 401 })
}

export function forbiddenResponse(message = 'Forbidden') {
  return NextResponse.json({ success: false, error: message }, { status: 403 })
}

export function notFoundResponse(message = 'Not found') {
  return NextResponse.json({ success: false, error: message }, { status: 404 })
}

// ─── Pagination Helper ──────────────────────────────────────────────────────────

export interface PaginationParams {
  page: number
  limit: number
  skip: number
}

export function parsePagination(searchParams: URLSearchParams): PaginationParams {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '12', 10)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  pagination: PaginationParams
) {
  return NextResponse.json({
    success: true,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total,
      totalPages: Math.ceil(total / pagination.limit),
    },
  })
}
