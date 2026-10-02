import { describe, expect, it } from 'vitest'
import { OrderStatus } from '@prisma/client'
import { isWithinReturnWindow as serverWindow } from './returns'
import { REASON_OPTIONS as webReasons } from './returnReasons'
import { isWithinReturnWindow, REASON_OPTIONS, validateReturnInput, type ReturnInput } from '../../react-native/src/utils/returns'

const now = new Date('2026-10-02T00:00:00Z')
describe('mobile return policy parity', () => {
  it('uses exactly the website reasons and evidence requirements', () => {
    expect(REASON_OPTIONS).toEqual(webReasons)
  })
  it.each(Object.values(OrderStatus).flatMap((status) => [null, -1, 0, 30, 30.001].map((age) => ({ status, age }))))('matches the server window for $status at age $age', ({ status, age }) => {
    const date = age === null ? null : new Date(now.getTime() - age * 86400000)
    expect(isWithinReturnWindow({ status, deliveredAt: date?.toISOString(), completedAt: date?.toISOString() }, now.getTime()))
      .toBe(serverWindow({ status, deliveredAt: date, completedAt: date }, now))
  })
  const input: ReturnInput = { orderNumber: 'RPX-1', selectedItemIds: ['item1'], reason: 'other', imagePublicIds: [] }
  it('allows optional details and photos for other reasons', () => { expect(validateReturnInput(input)).toBeNull() })
  it('requires a selected item', () => { expect(validateReturnInput({ ...input, selectedItemIds: [] })).toContain('Select') })
  it.each(REASON_OPTIONS.filter((reason) => reason.evidenceRequired))('requires evidence for $value', ({ value }) => {
    expect(validateReturnInput({ ...input, reason: value })).toContain('photo')
    expect(validateReturnInput({ ...input, reason: value, imagePublicIds: ['repixl/returns/photo'] })).toBeNull()
  })
  it('rejects short details and too many images', () => {
    expect(validateReturnInput({ ...input, details: 'short' })).toContain('10 and 1000')
    expect(validateReturnInput({ ...input, imagePublicIds: Array(6).fill('photo') })).toContain('5')
  })
})
