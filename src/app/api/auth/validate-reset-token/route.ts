import { NextRequest, NextResponse } from 'next/server'
import { validateResetToken } from '@/lib/resetTokens'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valid: false }, { status: 400 })
    }
    const email = await validateResetToken(token)
    if (!email) {
      return NextResponse.json({ valid: false, message: 'Reset link is invalid or has expired.' }, { status: 400 })
    }
    return NextResponse.json({ valid: true })
  } catch {
    return NextResponse.json({ valid: false }, { status: 400 })
  }
}
