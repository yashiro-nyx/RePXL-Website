import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  fetchBannersByPlacement,
  clearBannerCache,
  BANNER_CACHE_TTL_MS,
} from './banner-client'
import {
  fetchHomepageCmsBlocks,
  clearHomepageCmsCache,
  CMS_BLOCKS_CACHE_TTL_MS,
} from './cms-client'

describe('CMS Client & Banner Client Cache Invalidation & Freshness', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    clearBannerCache()
    clearHomepageCmsCache()
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deduplicates banner queries within TTL and refetches after TTL expires', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'b-1', title: 'Banner 1' }] }),
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    // First fetch - hits network
    const res1 = await fetchBannersByPlacement('HOMEPAGE_HERO')
    expect(res1.data[0].title).toBe('Banner 1')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second fetch within TTL - serves from cache without network call
    const res2 = await fetchBannersByPlacement('HOMEPAGE_HERO')
    expect(res2.data[0].title).toBe('Banner 1')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Advance time past TTL
    vi.advanceTimersByTime(BANNER_CACHE_TTL_MS + 1000)

    // Third fetch - cache expired, hits network again for fresh admin sync
    await fetchBannersByPlacement('HOMEPAGE_HERO')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clearBannerCache immediately forces fresh banner fetch', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [{ id: 'b-1', title: 'Banner 1' }] }),
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchBannersByPlacement('HOMEPAGE_STRIP')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    clearBannerCache()

    await fetchBannersByPlacement('HOMEPAGE_STRIP')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('homepage CMS blocks cache expires after TTL and refetches updated blocks', async () => {
    let callCount = 0
    const fetchMock = vi.fn().mockImplementation(() => {
      callCount++
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [{ id: `block-${callCount}`, type: 'editorial', isPublished: true }],
          }),
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    const first = await fetchHomepageCmsBlocks()
    expect(first.data[0].id).toBe('block-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Second call within TTL - cached
    const second = await fetchHomepageCmsBlocks()
    expect(second.data[0].id).toBe('block-1')
    expect(fetchMock).toHaveBeenCalledTimes(1)

    // Advance time past TTL
    vi.advanceTimersByTime(CMS_BLOCKS_CACHE_TTL_MS + 1000)

    // Third call - cache expired, gets fresh published block from admin
    const third = await fetchHomepageCmsBlocks()
    expect(third.data[0].id).toBe('block-2')
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clearHomepageCmsCache forces immediate fresh fetch', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: [] }),
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    await fetchHomepageCmsBlocks()
    expect(fetchMock).toHaveBeenCalledTimes(1)

    clearHomepageCmsCache()

    await fetchHomepageCmsBlocks()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})

