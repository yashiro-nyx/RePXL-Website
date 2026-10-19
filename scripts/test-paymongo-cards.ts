/** Live sandbox smoke test; uses the application's PayMongo client, never the DB. */
import assert from 'node:assert/strict'
import {
  attachPaymentMethod,
  checkPaymongoPaymentStatus,
  createPaymentIntent,
  createPaymentMethod,
} from '../src/lib/paymongo'

async function main() {
  assert.match(
    process.env.PAYMONGO_SECRET_KEY ?? '',
    /^sk_test_/,
    'Refusing to run: configure a PayMongo test secret key first.'
  )

  // Bound network waits without changing the application client.
  const originalFetch = globalThis.fetch
  globalThis.fetch = (input, init) => originalFetch(input, {
    ...init,
    signal: AbortSignal.timeout(20_000),
  })

  const run = `repxl-card-smoke-${Date.now()}`
  const futureYear = new Date().getUTCFullYear() + 3
  let failed = 0
  let passed = 0
  const results: Array<{ scenario: string; result: string; detail: string }> = []

  async function scenario(name: string, test: () => Promise<string>) {
    try {
      const detail = await test()
      passed++
      results.push({ scenario: name, result: 'PASS', detail })
    } catch (error) {
      failed++
      // Do not print gateway payloads, credentials, client keys, or card details.
      const detail = error instanceof assert.AssertionError
        ? 'Unexpected gateway status or response; inspect this scenario.'
        : 'Gateway request failed; check test credentials and network access.'
      results.push({ scenario: name, result: 'FAIL', detail })
    }
    console.log(JSON.stringify(results.at(-1)))
  }

  try {
    const cards: Array<[string, string, RegExp?]> = [
      ['Visa immediate capture', '4343434343434345'],
      ['Mastercard 3DS handoff', '5555555555554444'],
      ['Visa 3DS handoff', '4120000000000007'],
      ['Expired-card decline', '4200000000000018', /card has expired/i],
      ['Invalid-CVC decline', '4300000000000017', /cvc number is invalid/i],
      ['Insufficient-funds decline', '5100000000000198', /insufficient funds/i],
    ]
    for (const [name, number, declineReason] of cards) {
      await scenario(name, async () => {
        const intent = await createPaymentIntent({
          amount: 10000,
          paymentMethodAllowed: ['card'],
          description: `RePXL sandbox smoke: ${name}`,
          metadata: { testRun: run },
        })
        const method = await createPaymentMethod({
          type: 'card',
          card: { cardNumber: number, expMonth: 12, expYear: futureYear, cvc: '123' },
          billing: { name: 'RePXL Sandbox Test', email: 'sandbox@repxl.invalid' },
        })
        let attached
        try {
          attached = await attachPaymentMethod(intent.id, {
            paymentMethodId: method.id,
            clientKey: intent.attributes.client_key,
            returnUrl: 'http://localhost:3000/checkout/success',
          })
        } catch (error) {
          if (!declineReason) throw error
          assert.ok(error instanceof Error)
          assert.match(error.message, declineReason)
          const verified = await checkPaymongoPaymentStatus({ paymentIntentId: intent.id })
          assert.equal(verified.isPaid, false)
          assert.equal(verified.status, 'awaiting_payment_method')
          return 'Declined during attach; verification remains unpaid.'
        }
        const status = attached.attributes.status
        console.log(JSON.stringify({ scenario: name, observedStatus: status }))
        if (name.includes('immediate')) {
          assert.equal(status, 'succeeded')
          assert.match(attached.attributes.payments?.[0]?.id ?? '', /^pay_/)
          for (const ids of [{ paymentSessionId: intent.id }, { paymentIntentId: intent.id }]) {
            const verified = await checkPaymongoPaymentStatus(ids)
            assert.equal(verified.isPaid, true)
            assert.equal(verified.paymentId, attached.attributes.payments?.[0]?.id)
          }
          return 'Captured; both intent/session verification paths agree on payment reference.'
        }
        if (name.includes('3DS')) {
          assert.equal(status, 'awaiting_next_action')
          const redirect = new URL(attached.attributes.next_action?.redirect?.url ?? '')
          assert.equal(redirect.protocol, 'https:')
          assert.ok(redirect.hostname.endsWith('.paymongo.com'))
          assert.equal((await checkPaymongoPaymentStatus({ paymentIntentId: intent.id })).isPaid, false)
          return 'Authentication URL returned; payment remains unpaid before authorization.'
        }
        assert.equal(status, 'awaiting_payment_method')
        assert.ok(attached.attributes.last_payment_error?.failed_code)
        assert.equal((await checkPaymongoPaymentStatus({ paymentIntentId: intent.id })).isPaid, false)
        return `Declined (${attached.attributes.last_payment_error?.failed_code}); verification remains unpaid.`
      })
    }

    for (const [name, number, year, cvc, expected] of [
      ['Invalid card number', '1234567890123456', futureYear, '123', /card_number/i],
      ['Expired input date', '4343434343434345', 2020, '123', /exp_year|expir/i],
      ['Short CVC input', '4343434343434345', futureYear, '12', /cvc/i],
    ] as const) {
      await scenario(name, async () => {
        await assert.rejects(createPaymentMethod({
          type: 'card',
          card: { cardNumber: number, expMonth: 1, expYear: year, cvc },
          billing: { name: 'RePXL Sandbox Test', email: 'sandbox@repxl.invalid' },
        }), expected)
        return 'Rejected during payment method creation.'
      })
    }
    console.log(JSON.stringify({ run, passed, failed, scope: 'Real PayMongo test API; no website orders or database writes; 3DS handoff only.' }))
    if (failed) process.exitCode = 1
  } finally {
    globalThis.fetch = originalFetch
  }
}

main().catch(() => {
  console.error('Sandbox test could not start. Confirm a sk_test_ key is configured; credentials were not printed.')
  process.exitCode = 1
})
