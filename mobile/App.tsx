import { StatusBar } from 'expo-status-bar'
import * as WebBrowser from 'expo-web-browser'
import * as Notifications from 'expo-notifications'
import { useEffect, useState } from 'react'
import { ActivityIndicator, FlatList, Platform, Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from 'react-native'
import { ApiError, api, type Address, type CartItem, type Notification, type Order, type Profile, type ReturnRequest, type Review, type WishlistItem, type Product } from './src/api'
import { clearSession, loadSession, saveSession, type MobileSession } from './src/session'

type LoginResult = {
  mfaRequired?: boolean
  challenge?: string
  user?: MobileSession['user']
  tokens?: MobileSession['tokens']
}

export default function App() {
  const [session, setSession] = useState<MobileSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mfaCode, setMfaCode] = useState('')
  const [challenge, setChallenge] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [wishlist, setWishlist] = useState<WishlistItem[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [addresses, setAddresses] = useState<Address[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [reviewProductId, setReviewProductId] = useState('')
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')
  const [returnOrder, setReturnOrder] = useState('')
  const [returnDetails, setReturnDetails] = useState('')
  const [view, setView] = useState<'shop' | 'cart' | 'orders' | 'returns' | 'notifications' | 'account'>('shop')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void hydrate()
  }, [])

  async function hydrate() {
    try {
      const stored = await loadSession()
      if (stored) {
        await api.me(stored.tokens.accessToken)
        const latest = (await loadSession()) ?? stored
        setSession(latest)
        await loadProducts()
        await loadAccount(latest.tokens.accessToken)
        void registerPushToken(latest.tokens.accessToken)
      }
    } catch {
      await clearSession()
    } finally {
      setLoading(false)
    }
  }

  async function login() {
    setError('')
    try {
      const result = await api.login(email.trim(), password)
      if (result.mfaRequired && result.challenge) {
        setChallenge(result.challenge)
        return
      }
      await finishLogin(result)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to sign in')
    }
  }

  async function verifyMfa() {
    if (!challenge) return
    setError('')
    try {
      await finishLogin(await api.verifyMfa(challenge, mfaCode.trim()))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to verify MFA')
    }
  }

  async function finishLogin(result: LoginResult) {
    if (!result.user || !result.tokens) throw new Error('Invalid login response')
    const nextSession = { user: result.user, tokens: result.tokens }
    await saveSession(nextSession)
    setSession(nextSession)
    setChallenge(null)
    setPassword('')
    await loadProducts()
    await loadAccount(nextSession.tokens.accessToken)
    void registerPushToken(nextSession.tokens.accessToken)
  }

  async function loadProducts() {
    const result = await api.products()
    setProducts(result)
  }

  async function loadAccount(accessToken = session?.tokens.accessToken) {
    const stored = await loadSession()
    const currentAccessToken = stored?.tokens.accessToken ?? accessToken
    if (!currentAccessToken) return
    const [nextCart, nextWishlist, nextProfile, nextAddresses, nextOrders, nextReturns, nextNotifications, nextReviews] = await Promise.all([
      api.cart(currentAccessToken),
      api.wishlist(currentAccessToken),
      api.profile(currentAccessToken),
      api.addresses(currentAccessToken),
      api.orders(currentAccessToken),
      api.returns(currentAccessToken),
      api.notifications(currentAccessToken),
      api.reviews(currentAccessToken),
    ])
    setCart(nextCart)
    setWishlist(nextWishlist)
    setProfile(nextProfile)
    setAddresses(nextAddresses)
    setOrders(nextOrders)
    setReturns(nextReturns)
    setNotifications(nextNotifications)
    setReviews(nextReviews)
    setFirstName(nextProfile.firstName)
    setLastName(nextProfile.lastName)
  }

  async function addToCart(productId: string) {
    if (!session) return
    try {
      const stored = await loadSession()
      await api.addToCart(stored?.tokens.accessToken ?? session.tokens.accessToken, productId)
      await loadAccount()
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to update cart')
    }
  }

  async function toggleWishlist(productId: string) {
    if (!session) return
    try {
      const stored = await loadSession()
      const accessToken = stored?.tokens.accessToken ?? session.tokens.accessToken
      const exists = wishlist.some((item) => item.product.id === productId)
      if (exists) await api.removeFromWishlist(accessToken, productId)
      else await api.addToWishlist(accessToken, productId)
      setWishlist(await api.wishlist(accessToken))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to update wishlist')
    }
  }

  async function saveProfile() {
    if (!session) return
    try {
      const stored = await loadSession()
      const updated = await api.updateProfile(stored?.tokens.accessToken ?? session.tokens.accessToken, { firstName, lastName })
      setProfile(updated)
      setSession({ ...session, user: { ...session.user, firstName: updated.firstName, lastName: updated.lastName } })
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to update profile')
    }
  }

  async function checkout() {
    if (!session || cart.length === 0) return
    const address = addresses.find((entry) => entry.isDefault) ?? addresses[0]
    if (!address) {
      setView('account')
      setError('Add a delivery address before checking out.')
      return
    }
    try {
      const stored = await loadSession()
      const accessToken = stored?.tokens.accessToken ?? session.tokens.accessToken
      const result = await api.startCheckout(accessToken, {
        address,
        selectedProductIds: cart.map((item) => item.product.slug),
      })
      await WebBrowser.openBrowserAsync(result.checkoutUrl)
      await loadAccount()
      setView('orders')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to start checkout')
    }
  }

  async function submitReturn() {
    if (!session || !returnOrder.trim() || returnDetails.trim().length < 10) return
    try {
      const stored = await loadSession()
      const accessToken = stored?.tokens.accessToken ?? session.tokens.accessToken
      await api.submitReturn(accessToken, { orderNumber: returnOrder.trim(), reason: 'other', details: returnDetails.trim() })
      setReturnOrder('')
      setReturnDetails('')
      await loadAccount(accessToken)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to submit return request')
    }
  }

  async function readNotification(item: Notification) {
    if (!session || item.isRead) return
    try {
      const stored = await loadSession()
      const accessToken = stored?.tokens.accessToken ?? session.tokens.accessToken
      const updated = await api.markNotificationRead(accessToken, item.id)
      setNotifications((current) => current.map((entry) => entry.id === updated.id ? updated : entry))
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to update notification')
    }
  }

  async function registerPushToken(accessToken: string) {
    try {
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'default',
          importance: Notifications.AndroidImportance.DEFAULT,
        })
      }
      const permissions = await Notifications.getPermissionsAsync()
      const granted = permissions.granted
        ? permissions
        : await Notifications.requestPermissionsAsync()
      if (!granted.granted) return
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: process.env.EXPO_PUBLIC_EXPO_PROJECT_ID,
      })).data
      await api.registerPushToken(accessToken, token, Platform.OS)
    } catch {
      // Push registration is optional and must not block sign-in.
    }
  }

  async function submitReview() {
    if (!session || !reviewProductId || reviewComment.trim().length < 1) return
    try {
      const stored = await loadSession()
      const accessToken = stored?.tokens.accessToken ?? session.tokens.accessToken
      const review = await api.addReview(accessToken, {
        productId: reviewProductId,
        rating: Math.min(5, Math.max(1, Number.parseInt(reviewRating, 10) || 5)),
        comment: reviewComment.trim(),
      })
      setReviews((current) => [review, ...current])
      setReviewProductId('')
      setReviewComment('')
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to submit review')
    }
  }

  async function logout() {
    const stored = await loadSession()
    if (stored) await api.logout(stored.tokens.accessToken, stored.tokens.refreshToken).catch(() => undefined)
    await clearSession()
    setSession(null)
    setProducts([])
    setCart([])
    setWishlist([])
    setProfile(null)
    setAddresses([])
    setOrders([])
    setReturns([])
    setNotifications([])
  }

  if (loading) return <Centered><ActivityIndicator color="#e07a5f" /></Centered>

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authPanel}>
          <Text style={styles.eyebrow}>REPXL MOBILE</Text>
          <Text style={styles.title}>{challenge ? 'Verify your account' : 'Your camera collection'}</Text>
          <Text style={styles.subtitle}>{challenge ? 'Enter your authenticator or recovery code.' : 'Sign in to browse stock and manage your orders.'}</Text>
          {challenge ? (
            <>
              <TextInput autoFocus value={mfaCode} onChangeText={setMfaCode} placeholder="MFA code" placeholderTextColor="#8d8a84" style={styles.input} autoCapitalize="none" />
              <Button label="Verify and continue" onPress={verifyMfa} />
              <Button label="Back to sign in" onPress={() => setChallenge(null)} secondary />
            </>
          ) : (
            <>
              <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#8d8a84" style={styles.input} autoCapitalize="none" keyboardType="email-address" />
              <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#8d8a84" style={styles.input} secureTextEntry />
              <Button label="Sign in" onPress={login} />
            </>
          )}
          {!!error && <Text style={styles.error}>{error}</Text>}
        </View>
        <StatusBar style="dark" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>REPXL MOBILE</Text>
          <Text style={styles.heading}>Good to see you, {session.user.firstName}</Text>
        </View>
        <Pressable onPress={logout} accessibilityRole="button"><Text style={styles.logout}>Log out</Text></Pressable>
      </View>
      {view === 'shop' && <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshing={false}
          onRefresh={() => { void loadProducts() }}
          ListHeaderComponent={<Text style={styles.sectionTitle}>Available cameras</Text>}
          renderItem={({ item }) => {
            const wished = wishlist.some((entry) => entry.product.id === item.id)
            return <View style={styles.product}>
              <View style={styles.productImage}><Text style={styles.productImageText}>PHOTO</Text></View>
              <View style={styles.productDetails}>
                <Text style={styles.productBrand}>{item.brand}</Text>
                <Text style={styles.productName}>{item.name}</Text>
                <Text style={styles.productMeta}>PHP {item.price.toLocaleString()}  ·  {item.stock > 0 ? 'In stock' : 'Sold out'}</Text>
                <View style={styles.actions}>
                  <SmallButton label={wished ? 'Saved' : 'Wishlist'} onPress={() => { void toggleWishlist(item.id) }} secondary={wished} />
                  <SmallButton label="Add to cart" onPress={() => { void addToCart(item.id) }} disabled={item.stock < 1} />
                </View>
              </View>
            </View>
          }}
          ListEmptyComponent={<Text style={styles.subtitle}>No active products are available right now.</Text>}
        />}
      {view === 'cart' && <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View><Text style={styles.sectionTitle}>Your cart ({cart.length})</Text><Text style={styles.productMeta}>Checkout uses your default saved address and hosted PayMongo payment.</Text><Button label="Checkout" onPress={() => { void checkout() }} /></View>}
        renderItem={({ item }) => <View style={styles.simpleRow}><Text style={styles.productName}>{item.product.name}</Text><Text style={styles.productMeta}>Qty {item.quantity}  ·  PHP {(item.product.price * item.quantity).toLocaleString()}</Text></View>}
        ListEmptyComponent={<Text style={styles.subtitle}>Your cart is empty.</Text>}
      />}
      {view === 'orders' && <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Your orders</Text>}
        renderItem={({ item }) => <View style={styles.simpleRow}><Text style={styles.productName}>{item.orderNumber}</Text><Text style={styles.productMeta}>{item.status}  ·  {item.paymentStatus}  ·  PHP {item.total.toLocaleString()}</Text><Text style={styles.productMeta}>{item.deliveryStatus}  ·  {item.trackingProgress}%</Text><Text style={styles.productMeta}>{item.trackingDescription}</Text>{item.items[0] && <SmallButton label="Review purchased item" onPress={() => { setReviewProductId(item.items[0].product.id); setView('account') }} secondary />}</View>}
        ListEmptyComponent={<Text style={styles.subtitle}>Your orders will appear here after checkout.</Text>}
      />}
      {view === 'returns' && <FlatList
        data={returns}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View><Text style={styles.sectionTitle}>Request a return</Text><TextInput value={returnOrder} onChangeText={setReturnOrder} placeholder="Order number" placeholderTextColor="#8d8a84" style={styles.input} autoCapitalize="characters" /><TextInput value={returnDetails} onChangeText={setReturnDetails} placeholder="Tell us what happened (10+ characters)" placeholderTextColor="#8d8a84" style={styles.input} multiline /><Button label="Submit return request" onPress={() => { void submitReturn() }} /><Text style={styles.sectionTitle}>Previous requests</Text></View>}
        renderItem={({ item }) => <View style={styles.simpleRow}><Text style={styles.productName}>{item.orderId}</Text><Text style={styles.productMeta}>{item.status}  ·  {item.reason}</Text></View>}
        ListEmptyComponent={<Text style={styles.subtitle}>No return requests yet.</Text>}
      />}
      {view === 'notifications' && <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Notifications</Text>}
        renderItem={({ item }) => <Pressable onPress={() => { void readNotification(item) }} style={[styles.simpleRow, !item.isRead && styles.unreadRow]}><Text style={styles.productName}>{item.event}</Text><Text style={styles.productMeta}>{item.message}</Text></Pressable>}
        ListEmptyComponent={<Text style={styles.subtitle}>You are all caught up.</Text>}
      />}
      {view === 'account' && <FlatList
        data={addresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<View><Text style={styles.sectionTitle}>Your profile</Text><TextInput value={firstName} onChangeText={setFirstName} placeholder="First name" placeholderTextColor="#8d8a84" style={styles.input} /><TextInput value={lastName} onChangeText={setLastName} placeholder="Last name" placeholderTextColor="#8d8a84" style={styles.input} /><Text style={styles.productMeta}>{profile?.email}</Text><Button label="Save profile" onPress={() => { void saveProfile() }} /><Text style={styles.sectionTitle}>Saved addresses</Text></View>}
        renderItem={({ item }) => <View style={styles.simpleRow}><Text style={styles.productName}>{item.fullName}{item.isDefault ? '  ·  Default' : ''}</Text><Text style={styles.productMeta}>{item.address}, {item.city}, {item.province} {item.postalCode}</Text></View>}
        ListEmptyComponent={<Text style={styles.subtitle}>No saved addresses yet.</Text>}
        ListFooterComponent={<View><Text style={styles.sectionTitle}>Write a review</Text><TextInput value={reviewProductId} onChangeText={setReviewProductId} placeholder="Product ID from an order" placeholderTextColor="#8d8a84" style={styles.input} /><TextInput value={reviewRating} onChangeText={setReviewRating} placeholder="Rating 1-5" placeholderTextColor="#8d8a84" style={styles.input} keyboardType="number-pad" /><TextInput value={reviewComment} onChangeText={setReviewComment} placeholder="Your review" placeholderTextColor="#8d8a84" style={styles.input} multiline /><Button label="Submit review" onPress={() => { void submitReview() }} /><Text style={styles.sectionTitle}>Your reviews</Text>{reviews.map((item) => <View key={item.id} style={styles.simpleRow}><Text style={styles.productName}>{item.rating}/5</Text><Text style={styles.productMeta}>{item.comment}</Text></View>)}</View>}
      />}
      {!!error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.nav}><NavButton label="Shop" active={view === 'shop'} onPress={() => setView('shop')} /><NavButton label={`Cart ${cart.length}`} active={view === 'cart'} onPress={() => setView('cart')} /><NavButton label="Orders" active={view === 'orders'} onPress={() => setView('orders')} /><NavButton label="More" active={view === 'account' || view === 'returns' || view === 'notifications'} onPress={() => setView('account')} /></View>
      {(view === 'account' || view === 'returns' || view === 'notifications') && <View style={styles.subnav}><NavButton label="Account" active={view === 'account'} onPress={() => setView('account')} /><NavButton label={`Returns ${returns.length}`} active={view === 'returns'} onPress={() => setView('returns')} /><NavButton label={`Alerts ${notifications.filter((item) => !item.isRead).length}`} active={view === 'notifications'} onPress={() => setView('notifications')} /></View>}
      <StatusBar style="dark" />
    </SafeAreaView>
  )
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={styles.centered}>{children}</View>
}

function Button({ label, onPress, secondary = false }: { label: string; onPress: () => void; secondary?: boolean }) {
  return <Pressable onPress={onPress} style={[styles.button, secondary && styles.secondaryButton]}><Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text></Pressable>
}

function SmallButton({ label, onPress, secondary = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[styles.smallButton, secondary && styles.smallSecondaryButton, disabled && styles.disabledButton]}><Text style={[styles.smallButtonText, secondary && styles.smallSecondaryButtonText]}>{label}</Text></Pressable>
}

function NavButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={styles.navButton}><Text style={[styles.navText, active && styles.navTextActive]}>{label}</Text></Pressable>
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f3ed' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f7f3ed' },
  authPanel: { flex: 1, justifyContent: 'center', padding: 28 },
  eyebrow: { color: '#b55238', fontSize: 12, fontWeight: '700', letterSpacing: 2 },
  title: { color: '#24211e', fontSize: 38, fontWeight: '700', lineHeight: 44, marginTop: 12, marginBottom: 12 },
  subtitle: { color: '#6d6861', fontSize: 16, lineHeight: 23, marginBottom: 24 },
  input: { backgroundColor: '#fffdf9', borderColor: '#ded6cb', borderRadius: 8, borderWidth: 1, color: '#24211e', fontSize: 16, marginBottom: 12, paddingHorizontal: 16, paddingVertical: 14 },
  button: { alignItems: 'center', backgroundColor: '#b55238', borderRadius: 8, marginTop: 4, paddingVertical: 15 },
  buttonText: { color: '#fffaf4', fontSize: 16, fontWeight: '700' },
  secondaryButton: { backgroundColor: 'transparent', marginTop: 10 },
  secondaryButtonText: { color: '#b55238' },
  error: { color: '#a13d32', fontSize: 14, marginTop: 16 },
  header: { alignItems: 'flex-start', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 22, paddingTop: 18 },
  heading: { color: '#24211e', fontSize: 25, fontWeight: '700', marginTop: 8, maxWidth: 260 },
  logout: { color: '#b55238', fontSize: 14, fontWeight: '700', marginTop: 8 },
  list: { padding: 22, paddingBottom: 40 },
  sectionTitle: { color: '#24211e', fontSize: 20, fontWeight: '700', marginBottom: 14, marginTop: 24 },
  product: { backgroundColor: '#fffdf9', borderRadius: 10, flexDirection: 'row', marginBottom: 12, overflow: 'hidden', padding: 12 },
  productImage: { alignItems: 'center', backgroundColor: '#e8e0d5', borderRadius: 7, height: 92, justifyContent: 'center', width: 92 },
  productImageText: { color: '#8a8177', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  productDetails: { justifyContent: 'center', paddingLeft: 14, flex: 1 },
  productBrand: { color: '#b55238', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  productName: { color: '#24211e', fontSize: 17, fontWeight: '700', marginVertical: 5 },
  productMeta: { color: '#6d6861', fontSize: 13 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  smallButton: { backgroundColor: '#b55238', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 },
  smallButtonText: { color: '#fffaf4', fontSize: 12, fontWeight: '700' },
  smallSecondaryButton: { backgroundColor: '#ead9cd' },
  smallSecondaryButtonText: { color: '#9a4936' },
  disabledButton: { opacity: 0.45 },
  simpleRow: { backgroundColor: '#fffdf9', borderRadius: 8, marginBottom: 10, padding: 16 },
  unreadRow: { borderColor: '#b55238', borderWidth: 1 },
  nav: { borderTopColor: '#ded6cb', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 10, paddingTop: 12 },
  subnav: { backgroundColor: '#fffdf9', borderTopColor: '#ded6cb', borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 8, paddingTop: 8 },
  navButton: { alignItems: 'center', flex: 1 },
  navText: { color: '#8d8a84', fontSize: 13, fontWeight: '600' },
  navTextActive: { color: '#b55238' },
})
