import { NextRequest } from 'next/server'
import { getCurrentAdmin } from '@/lib/auth-helpers'
import { successResponse, errorResponse, unauthorizedResponse } from '@/lib/api'
import {
  advanceReturn,
  describeReturn,
  loadReturn,
  processReturnRefund,
  ReturnFlowError,
} from '@/lib/return-service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'
const paramsSchema = z.object({
  id: z.string().cuid('Invalid return request ID'),
})
const actionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('review') }),
  z.object({
    action: z.literal('approve'),
    returnInstructions: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal('instructions'),
    returnInstructions: z.string().trim().min(10).max(2000),
  }),
  z.object({
    action: z.literal('reject'),
    rejectionReason: z.string().trim().min(1).max(500),
  }),
  z.object({ action: z.literal('receive') }),
  z.object({
    action: z.literal('inspect'),
    inspectionNotes: z.string().trim().min(10).max(1000),
    restock: z.boolean().default(false),
  }),
])
const refundSchema = z.object({
  includeShipping: z.boolean().default(false),
  manualReference: z.string().trim().min(3).max(150).optional(),
  checkOnly: z.boolean().optional(),
})
type Params = { params: Promise<{ id: string }> }
function failure(error: unknown) {
  if (error instanceof ReturnFlowError)
    return errorResponse(error.message, error.status)
  if (error instanceof z.ZodError)
    return errorResponse(
      error.issues.map((issue) => issue.message).join(' '),
      422
    )
  console.error(
    '[admin return]',
    error instanceof Error ? error.name : 'Unknown error'
  )
  return errorResponse(
    'Unable to update this return. Please refresh and try again.',
    500
  )
}
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    if (!(await getCurrentAdmin()))
      return unauthorizedResponse('Admin access required')
    const { id } = paramsSchema.parse(await params)
    return successResponse(describeReturn(await loadReturn(id)))
  } catch (error) {
    return failure(error)
  }
}
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) return unauthorizedResponse('Admin access required')
    const { id } = paramsSchema.parse(await params)
    const body = await request.json()
    // Older review/rejection calls still work; approval always needs return instructions.
    const action =
      body.action ??
      (
        {
          UNDER_REVIEW: 'review',
          APPROVED: 'approve',
          REJECTED: 'reject',
        } as Record<string, string>
      )[body.status]
    return successResponse(
      await advanceReturn(id, actionSchema.parse({ ...body, action }), admin)
    )
  } catch (error) {
    return failure(error)
  }
}
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const admin = await getCurrentAdmin()
    if (!admin) return unauthorizedResponse('Admin access required')
    const { id } = paramsSchema.parse(await params)
    const text = await request.text()
    const input = refundSchema.parse(text ? JSON.parse(text) : {})
    return successResponse(await processReturnRefund(id, input, admin))
  } catch (error) {
    return failure(error)
  }
}
