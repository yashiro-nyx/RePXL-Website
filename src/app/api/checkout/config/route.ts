import { NextResponse } from 'next/server'
import { isPaymongoConfigured, isTestMode } from '@/lib/paymongo'

export const dynamic = 'force-dynamic'

export async function GET() {
  const configured = isPaymongoConfigured()
  const testMode = isTestMode()

  return NextResponse.json({
    success: true,
    data: {
      isConfigured: configured,
      isTestMode: testMode,
      publicKey: process.env.NEXT_PUBLIC_PAYMONGO_PUBLIC_KEY ?? '',
      testCard: {
        number: '4111 1111 1111 1111',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'Test Buyer',
      },
      testCard3DS: {
        number: '4000 0000 0000 0002',
        expiry: '12/28',
        cvc: '123',
        cardholderName: 'Test 3DS Buyer',
      },
      testGcash: {
        phone: '09171234567',
      },
    },
  })
}

