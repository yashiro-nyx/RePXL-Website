import { api, loadSession } from './api';

// Wait for every request to settle before allowing a retry, so a failed attempt
// cannot race with the next one or publish a partially populated account.
export async function loadStartupData() {
  const accountRequest = async () => {
    if (!(await loadSession())) return null;
    try {
      await api.me();
      const results = await Promise.allSettled([
        api.cart(), api.wishlist(), api.profile(), api.addresses(),
        api.orders(), api.notifications(), api.reviews(),
      ] as const);
      const [cart, wishlist, profile, addresses, orders, notifications, reviews] = results.map((result) => {
        if (result.status === 'rejected') throw result.reason;
        return result.value;
      }) as [
        Awaited<ReturnType<typeof api.cart>>, Awaited<ReturnType<typeof api.wishlist>>,
        Awaited<ReturnType<typeof api.profile>>, Awaited<ReturnType<typeof api.addresses>>,
        Awaited<ReturnType<typeof api.orders>>, Awaited<ReturnType<typeof api.notifications>>,
        Awaited<ReturnType<typeof api.reviews>>,
      ];
      return { cart, wishlist, profile, addresses, orders, notifications, reviews };
    } catch (error) {
      // Only a session removed by the API's authoritative auth handling permits
      // guest startup. Network failures must leave the saved session intact.
      if (!(await loadSession())) return null;
      throw error;
    }
  };

  const [products, banners, account] = await Promise.allSettled([
    api.products(), api.banners(), accountRequest(),
  ]);
  if (products.status === 'rejected') throw products.reason;
  if (banners.status === 'rejected') throw banners.reason;
  if (account.status === 'rejected') throw account.reason;
  return { products: products.value, banners: banners.value, account: account.value };
}
