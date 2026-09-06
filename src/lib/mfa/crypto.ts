import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'crypto'
import { Secret, TOTP } from 'otpauth'

export function encryptionKey() {
  const value = process.env.MFA_ENCRYPTION_KEY ?? ''
  if (!/^[a-fA-F0-9]{64}$/.test(value))
    throw new Error('MFA crypto configuration unavailable')
  return Buffer.from(value, 'hex')
}
export function encryptSecret(secret: string, userId: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv)
  cipher.setAAD(Buffer.from(`repixl:mfa:v1:${userId}`))
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
  ])
  return [
    'v1',
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
  ].join('.')
}
export function decryptSecret(value: string, userId: string) {
  const [version, iv, ciphertext, tag] = value.split('.')
  if (version !== 'v1' || !iv || !ciphertext || !tag)
    throw new Error('Invalid MFA ciphertext')
  const cipher = createDecipheriv(
    'aes-256-gcm',
    encryptionKey(),
    Buffer.from(iv, 'base64url')
  )
  cipher.setAAD(Buffer.from(`repixl:mfa:v1:${userId}`))
  cipher.setAuthTag(Buffer.from(tag, 'base64url'))
  return Buffer.concat([
    cipher.update(Buffer.from(ciphertext, 'base64url')),
    cipher.final(),
  ]).toString('utf8')
}
export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex')
export function generateSecret() {
  return new Secret({ size: 20 }).base32
}
export function authenticator(secret: string, email = 'Customer') {
  return new TOTP({
    issuer: 'RePIXL',
    label: email,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: Secret.fromBase32(secret),
  })
}
export function validStep(
  secret: string,
  code: string,
  lastStep: number,
  now = Date.now()
): number | null {
  if (!/^\d{6}$/.test(code)) return null
  const delta = authenticator(secret).validate({
    token: code,
    timestamp: now,
    window: 1,
  })
  if (delta === null) return null
  const step = Math.floor(now / 30000) + delta
  return step > lastStep ? step : null
}
export function recoveryCodes() {
  return Array.from({ length: 10 }, () =>
    randomBytes(16).toString('hex').match(/.{4}/g)!.join('-')
  )
}
export function recoveryHash(code: string) {
  return digest(code.toLowerCase().replace(/[-\s]/g, ''))
}
export function matchesHash(a: string, b: string) {
  const aa = Buffer.from(a, 'hex'),
    bb = Buffer.from(b, 'hex')
  return aa.length === bb.length && timingSafeEqual(aa, bb)
}
