import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { consumeResetToken } from '@/lib/resetTokens'

const MIN_PASSWORD_LENGTH = 8

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ message: 'Missing reset token.' }, { status: 400 })
    }
    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
        { status: 400 }
      )
    }
    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json({ message: 'Password must contain at least one uppercase letter.' }, { status: 400 })
    }
    if (!/\d/.test(newPassword)) {
      return NextResponse.json({ message: 'Password must contain at least one number.' }, { status: 400 })
    }

    // Consume the token (single-use, atomically validates expiry + unused state)
    const email = await consumeResetToken(token)
    if (!email) {
      return NextResponse.json(
        { message: 'Reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Update the user's password directly in the database.
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Token was valid but no matching account — respond generically.
      return NextResponse.json(
        { message: 'Reset link is invalid or has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    })

    return NextResponse.json({ success: true, email })
  } catch (err) {
    console.error('[reset-password]', err)
    return NextResponse.json({ message: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
