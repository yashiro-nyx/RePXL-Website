import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { NextRequest } from 'next/server'
const mock = vi.hoisted(() => ({ cookies: new Map<string, string>(), user: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), log: vi.fn(), count: vi.fn() }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: (key: string) => ({ value: mock.cookies.get(key) }) }) }))
vi.mock('@/lib/prisma', () => ({ prisma: {
  user: { findUnique: mock.user }, product: { findMany: mock.findMany, findUnique: mock.findUnique, update: mock.update, count: mock.count }, adminLog: { create: mock.log },
} }))
import { GET as brands } from '@/app/api/admin/products/brands/route'
import { GET as list } from '@/app/api/products/route'
import { PUT } from '@/app/api/products/[slug]/route'
const row = { id: 'product', slug: 'canon', name: 'Canon', brand: 'Canon', price: 4299 }
function session(cookie = 'repixl-admin-session-token', age = 0) {
  const payload = Buffer.from(JSON.stringify({ userId: 'admin', iat: Date.now() - age })).toString('base64url')
  mock.cookies.set(cookie, `${payload}.${createHmac('sha256', 'admin-product-test').update(payload).digest('base64url')}`)
}
function put(body: unknown) { return PUT(new NextRequest('http://localhost/api/products/canon', { method: 'PUT', body: JSON.stringify(body) }), { params: { slug: 'canon' } }) }
beforeEach(() => {
  vi.resetAllMocks(); mock.cookies.clear(); vi.stubEnv('NEXTAUTH_SECRET', 'admin-product-test')
  mock.user.mockResolvedValue({ id: 'admin', role: 'ADMIN', firstName: 'Test', lastName: 'Admin', isArchived: false })
  mock.findUnique.mockResolvedValue(row); mock.findMany.mockResolvedValue([{ brand: 'Canon' }, { brand: 'Sony' }]); mock.count.mockResolvedValue(2)
})
afterEach(() => vi.unstubAllEnvs())
describe('admin product authorization and responses', () => {
  it.each(['none', 'customer-cookie', 'wrong-role', 'archived', 'expired', 'forged'])('rejects %s access before database reads/writes', async kind => {
    if (kind !== 'none') session(kind === 'customer-cookie' ? 'repixl-session-token' : undefined, kind === 'expired' ? 3_600_001 : 0)
    if (kind === 'wrong-role') mock.user.mockResolvedValue({ id: 'admin', role: 'CUSTOMER', isArchived: false })
    if (kind === 'archived') mock.user.mockResolvedValue({ id: 'admin', role: 'ADMIN', isArchived: true })
    if (kind === 'forged') mock.cookies.set('repixl-admin-session-token', 'forged.token')
    expect((await brands()).status).toBe(401)
    expect((await put({ price: 4500 })).status).toBe(401)
    expect(mock.findMany).not.toHaveBeenCalled(); expect(mock.update).not.toHaveBeenCalled()
  })
  it('queries every brand independently of paginated/filtered product rows', async () => {
    session()
    expect(await (await brands()).json()).toEqual({ success: true, data: ['Canon', 'Sony'] })
    expect(mock.findMany).toHaveBeenCalledWith({ select: { brand: true }, distinct: ['brand'], orderBy: { brand: 'asc' } })
  })
  it('keeps brand and search in the same paginated database filter', async () => {
    await list(new NextRequest('http://localhost/api/products?page=2&limit=10&brand=Canon&search=PowerShot&status=ACTIVE,INACTIVE'))
    expect(mock.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10,
      where: expect.objectContaining({ brand: { equals: 'Canon', mode: 'insensitive' }, OR: expect.arrayContaining([{ name: { contains: 'PowerShot', mode: 'insensitive' } }]) }) }))
  })
  it('accepts a valid admin even when a customer cookie is also present', async () => {
    session(); session('repixl-session-token')
    mock.update.mockResolvedValue({ ...row, price: 4500 })
    const response = await put({ price: 4500 })
    expect(response.status).toBe(200)
    expect((await response.json()).data.price).toBe(4500)
    expect(mock.update).toHaveBeenCalledWith({ where: { slug: 'canon' }, data: { price: 4500 } })
    expect(mock.log).toHaveBeenCalledOnce()
  })
  it('returns the actual validation details without changing the product', async () => {
    session()
    const response = await put({ description: '', series: '', megapixels: 0 })
    expect(response.status).toBe(422)
    expect((await response.json()).details).toContain('description: Description is required')
    expect(mock.update).not.toHaveBeenCalled()
  })
})
