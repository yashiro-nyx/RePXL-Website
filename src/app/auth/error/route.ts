import { NextRequest, NextResponse } from 'next/server'
import { oauthErrorDestination } from '@/lib/mobile-oauth-redirect'

export function GET(request: NextRequest) {
  const origin = new URL(process.env.NEXTAUTH_URL || request.url).origin
  const callback = request.cookies.get('__Secure-next-auth.callback-url')?.value
    ?? request.cookies.get('next-auth.callback-url')?.value
  const destination = oauthErrorDestination(callback, origin, request.nextUrl.searchParams.get('error') || 'Default')
  return NextResponse.redirect(new URL(destination, origin))
}
