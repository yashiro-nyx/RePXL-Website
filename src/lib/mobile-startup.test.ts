import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadSession: vi.fn(),
  api: {
    products: vi.fn(), banners: vi.fn(), me: vi.fn(), cart: vi.fn(),
    wishlist: vi.fn(), profile: vi.fn(), addresses: vi.fn(), orders: vi.fn(),
    notifications: vi.fn(), reviews: vi.fn(),
  },
}));

vi.mock('../../react-native/src/services/api', () => mocks);
import { loadStartupData } from '../../react-native/src/services/startup';

describe('mobile startup readiness', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.loadSession.mockResolvedValue(null);
    for (const request of Object.values(mocks.api)) request.mockResolvedValue([]);
    mocks.api.profile.mockResolvedValue({ id: 'customer' });
  });

  it('accepts a fresh empty catalog for guests without requesting account data', async () => {
    await expect(loadStartupData()).resolves.toEqual({ products: [], banners: [], account: null });
    expect(mocks.api.me).not.toHaveBeenCalled();
    expect(mocks.api.cart).not.toHaveBeenCalled();
  });

  it('waits for all signed-in account data before becoming ready', async () => {
    mocks.loadSession.mockResolvedValue({ user: { id: 'customer' } });
    let finishReviews!: (value: unknown[]) => void;
    mocks.api.reviews.mockReturnValue(new Promise((resolve) => { finishReviews = resolve; }));
    const ready = vi.fn();
    const pending = loadStartupData().then(ready);
    await vi.waitFor(() => expect(mocks.api.reviews).toHaveBeenCalled());
    expect(ready).not.toHaveBeenCalled();
    finishReviews([]);
    await pending;
    expect(ready).toHaveBeenCalledWith(expect.objectContaining({
      account: expect.objectContaining({ profile: { id: 'customer' }, reviews: [] }),
    }));
  });

  it('rejects partial account data and can retry successfully', async () => {
    mocks.loadSession.mockResolvedValue({ user: { id: 'customer' } });
    mocks.api.notifications.mockRejectedValueOnce(new Error('Connection lost'));
    await expect(loadStartupData()).rejects.toThrow('Connection lost');
    await expect(loadStartupData()).resolves.toHaveProperty('account.notifications', []);
  });

  it('does not treat an offline saved session as a guest', async () => {
    mocks.loadSession.mockResolvedValue({ user: { id: 'customer' } });
    mocks.api.me.mockRejectedValue(new Error('Offline'));
    await expect(loadStartupData()).rejects.toThrow('Offline');
  });

  it('continues as a guest when auth handling has removed an expired session', async () => {
    mocks.loadSession.mockResolvedValueOnce({ user: { id: 'customer' } }).mockResolvedValue(null);
    mocks.api.me.mockRejectedValue(new Error('Session expired'));
    await expect(loadStartupData()).resolves.toHaveProperty('account', null);
  });

  it.each(['products', 'banners'] as const)('keeps startup blocked when %s fail', async (request) => {
    mocks.api[request].mockRejectedValue(new Error('Server unavailable'));
    await expect(loadStartupData()).rejects.toThrow('Server unavailable');
  });

  it('waits for outstanding requests after a failure before permitting a retry', async () => {
    mocks.api.products.mockRejectedValue(new Error('Catalog failed'));
    let finishBanners!: (value: unknown[]) => void;
    mocks.api.banners.mockReturnValue(new Promise((resolve) => { finishBanners = resolve; }));
    const failed = vi.fn();
    const pending = loadStartupData().catch(failed);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(failed).not.toHaveBeenCalled();
    finishBanners([]);
    await pending;
    expect(failed).toHaveBeenCalledWith(expect.objectContaining({ message: 'Catalog failed' }));
  });
});
