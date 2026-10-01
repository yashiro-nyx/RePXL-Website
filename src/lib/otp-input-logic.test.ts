import { describe, it, expect } from 'vitest'
import {
  sanitizeOtp,
  typeDigit,
  pasteDigits,
  backspace,
  deleteAt,
  moveFocus,
  OTP_DEFAULT_LENGTH,
} from './otp-input-logic'

describe('OTP input logic', () => {
  it('default length is 6', () => {
    expect(OTP_DEFAULT_LENGTH).toBe(6)
  })

  it('sanitize keeps digits only, capped to length', () => {
    expect(sanitizeOtp('12a3b4')).toBe('1234')
    expect(sanitizeOtp('1234567')).toBe('123456')
    expect(sanitizeOtp('abc')).toBe('')
  })

  describe('typeDigit — auto-advance', () => {
    it('places a digit and advances focus', () => {
      const t = typeDigit('', 0, '1')
      expect(t.value).toBe('1')
      expect(t.focus).toBe(1)
      expect(t.complete).toBe(false)
    })
    it('typing sequentially builds the code and stays in range', () => {
      let v = ''
      for (let i = 0; i < 6; i++) v = typeDigit(v, i, String(i + 1)).value
      expect(v).toBe('123456')
      // The final keystroke reports complete + clamps focus to the last box.
      const last = typeDigit('12345', 5, '6')
      expect(last.value).toBe('123456')
      expect(last.complete).toBe(true)
      expect(last.focus).toBe(5)
    })
    it('rejects non-numeric input (no change)', () => {
      const t = typeDigit('12', 2, 'a')
      expect(t.value).toBe('12')
    })
    it('multi-char autofill into one box distributes across boxes', () => {
      const t = typeDigit('', 0, '123456')
      expect(t.value).toBe('123456')
      expect(t.complete).toBe(true)
    })
  })

  describe('pasteDigits — distribute from index', () => {
    it('pasting 123456 into box 0 fills all boxes', () => {
      const t = pasteDigits('', 0, '123456')
      expect(t.value).toBe('123456')
      expect(t.complete).toBe(true)
    })
    it('strips non-digits and caps to length', () => {
      const t = pasteDigits('', 0, '12-34-56-78')
      expect(t.value).toBe('123456')
    })
    it('paste starting mid-way fills from that index', () => {
      const t = pasteDigits('12', 2, '3456')
      expect(t.value).toBe('123456')
    })
  })

  it('full-code paste in any box replaces all six digits', () => {
    expect(pasteDigits('98', 3, '123456').value).toBe('123456')
  })
  it('editing a middle box preserves later positions', () => {
    const cleared = backspace('123456', 2)
    expect(cleared.value).toBe('12 456')
    expect(cleared.complete).toBe(false)
    expect(typeDigit(cleared.value, 2, '9').value).toBe('129456')
  })

  describe('backspace', () => {
    it('clears the current box when it has a digit (focus stays)', () => {
      const t = backspace('123', 2)
      expect(t.value).toBe('12')
      expect(t.focus).toBe(2)
    })
    it('on an empty box, clears the previous box and moves focus back', () => {
      const t = backspace('12', 2) // box 2 empty
      expect(t.value).toBe('1')
      expect(t.focus).toBe(1)
    })
    it('at box 0 with empty value does nothing harmful', () => {
      const t = backspace('', 0)
      expect(t.value).toBe('')
      expect(t.focus).toBe(0)
    })
  })

  describe('deleteAt / moveFocus', () => {
    it('delete clears the current box only', () => {
      // Clearing a middle box must not shift the remaining digits.
      expect(deleteAt('123', 1).value).toBe('1 3')
    })
    it('arrow navigation clamps to [0, length-1]', () => {
      expect(moveFocus(0, -1)).toBe(0)
      expect(moveFocus(5, 1)).toBe(5)
      expect(moveFocus(2, 1)).toBe(3)
      expect(moveFocus(2, -1)).toBe(1)
    })
  })
})
