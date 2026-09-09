import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { adminProductService, cameraSaveError } from './adminProductService'
import { ApiClientError } from '@/lib/api-client'
import { useProductStore } from '@/stores/productStore'
import { useToastStore } from '@/stores/toastStore'
import { productUpdateSchema } from '@/lib/validations'
import { apiToClientProduct, clientToApiProduct, type ApiProduct } from '@/lib/mappers'

const camera: ApiProduct = { id: 'canon-id', slug: 'canon', name: 'Canon PowerShot', brand: 'Canon',
  series: 'PowerShot', price: 4299, condition: 'EXCELLENT', image: '/camera.svg', stock: 11,
  description: 'Complete authoritative description', status: 'INACTIVE', megapixels: 4,
  zoom: '3x', storage: 'SD', year: 2005, serialNumber: null, conditionNotes: null }
const fetchMock = vi.fn()
const response = (data: unknown, pagination?: unknown) => new Response(JSON.stringify({ success: true, data, pagination }))
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
  fetchMock.mockReset()
  useProductStore.setState({ products: [], loading: false })
  useToastStore.setState({ toasts: [] })
})
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('authoritative admin product reads', () => {
  it('keeps Canon available independently of page and search results', async () => {
    fetchMock.mockResolvedValueOnce(response(['Canon', 'Sony']))
      .mockResolvedValueOnce(response([{ ...camera, brand: 'Sony' }], { total: 19, totalPages: 2 }))
      .mockResolvedValueOnce(response([], { total: 0, totalPages: 0 }))
    const brands = await adminProductService.brands()
    await adminProductService.list(2, 10)
    await adminProductService.list(1, 10, 'Sony', 'no matches')
    expect(brands).toEqual(['Canon', 'Sony'])
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/products/brands')
  })
  it('combines brand and search and omits brand for All Brands', async () => {
    fetchMock.mockImplementation(async () => response([], { total: 0, totalPages: 0 }))
    await adminProductService.list(1, 10, 'Canon', ' PowerShot ')
    const query = new URL(fetchMock.mock.calls[0][0], 'http://localhost').searchParams
    expect(query.get('brand')).toBe('Canon')
    expect(query.get('search')).toBe('PowerShot')
    expect(query.get('status')).toContain('INACTIVE')
    await adminProductService.list(1, 10)
    expect(new URL(fetchMock.mock.calls[1][0], 'http://localhost').searchParams.has('brand')).toBe(false)
  })
  it('loads an inactive edit record absent from the storefront store with all required fields', async () => {
    fetchMock.mockResolvedValue(response(camera))
    const product = await adminProductService.get('canon')
    expect(product.description).toBe(camera.description)
    expect(product.status).toBe('inactive')
    expect(productUpdateSchema.safeParse(clientToApiProduct(product)).success).toBe(true)
    expect(useProductStore.getState().products).toEqual([])
  })
  it('always requests a fresh edit record and list after a mutation', async () => {
    fetchMock.mockResolvedValueOnce(response(camera)).mockResolvedValueOnce(response({ ...camera, price: 4500 }))
      .mockResolvedValueOnce(response([{ ...camera, price: 4500 }], { total: 1, totalPages: 1 }))
    expect((await adminProductService.get('canon')).price).toBe(4299)
    expect((await adminProductService.get('canon')).price).toBe(4500)
    expect((await adminProductService.list(1, 10)).products[0].price).toBe(4500)
    for (const [, options] of fetchMock.mock.calls) expect(options).toEqual({ credentials: 'include', cache: 'no-store' })
  })
  it.each(['get', 'brands', 'list'] as const)('rejects failed %s reads instead of fake empty success', async method => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Database unavailable' }), { status: 500 }))
    const operation = method === 'get' ? adminProductService.get('canon') : method === 'list' ? adminProductService.list(1, 10) : adminProductService.brands()
    await expect(operation).rejects.toBeInstanceOf(ApiClientError)
  })
})

describe('save results and hydration', () => {
  it('reproduces missing edit fields being rejected before any save', () => {
    const body = clientToApiProduct({ ...apiToClientProduct(camera), series: '', description: '', specs: { megapixels: 0, zoom: '', storage: '', year: 2000 } })
    expect(productUpdateSchema.safeParse(body).success).toBe(false)
  })
  it('updates from the successful PUT response without a false failure toast', async () => {
    useProductStore.setState({ products: [apiToClientProduct(camera)] })
    fetchMock.mockResolvedValue(response({ ...camera, price: 4500 }))
    await useProductStore.getState().updateProduct('canon', { price: 4500 })
    expect(fetchMock).toHaveBeenCalledWith('/api/products/canon', expect.objectContaining({ method: 'PUT', body: '{"price":4500}' }))
    expect(useProductStore.getState().products[0].price).toBe(4500)
    expect(useToastStore.getState().toasts).toHaveLength(0)
  })
  it('does not turn rejected mutations into success or update local state', async () => {
    useProductStore.setState({ products: [apiToClientProduct(camera)] })
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ success: false, error: 'Validation failed', details: ['description: Description is required'] }), { status: 422 }))
    await expect(useProductStore.getState().updateProduct('canon', { description: '' })).rejects.toThrow('Validation failed')
    expect(useProductStore.getState().products[0].description).toBe(camera.description)
  })
  it('shows validation details and session failures distinctly', () => {
    expect(cameraSaveError(new ApiClientError('Validation failed', 422, ['series: Series is required']))).toBe('series: Series is required')
    expect(cameraSaveError(new ApiClientError('Unauthorized', 401))).toContain('Sign in again')
    expect(cameraSaveError(new TypeError('Network unavailable'))).toContain('could not confirm')
  })
  it('preserves normal in-flight hydrate deduplication and releases it after completion', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise<Response>(r => { resolve = r }))
    const first = useProductStore.getState().hydrate()
    const second = useProductStore.getState().hydrate()
    expect(first).toBe(second)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    resolve(response([camera]))
    await first
    fetchMock.mockResolvedValueOnce(response([camera]))
    await useProductStore.getState().hydrate()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
  it('does not let an in-flight storefront hydrate block an admin refresh', async () => {
    let resolve!: (response: Response) => void
    fetchMock.mockReturnValueOnce(new Promise<Response>(r => { resolve = r }))
    const pending = useProductStore.getState().hydrate()
    fetchMock.mockResolvedValueOnce(response([{ ...camera, price: 4500 }], { total: 1, totalPages: 1 }))
    expect((await adminProductService.list(1, 10)).products[0].price).toBe(4500)
    resolve(response([camera]))
    await pending
  })
})
