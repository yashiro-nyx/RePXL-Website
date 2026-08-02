'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Container } from '@/components/layout/Container'
import { Button, ConditionBadge, CornerBracket, PasswordInput } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import { useAddressStore, type Address } from '@/stores/addressStore'
import { usePaymentStore, detectBrand, type SavedCard } from '@/stores/paymentStore'
import { useOrderHistoryStore, type Order } from '@/stores/orderHistoryStore'
import { useReviewStore, type Review } from '@/stores/reviewStore'
import { useProductStore } from '@/stores/productStore'
import { products as allProducts } from '@/data/products'

type Tab = 'profile' | 'orders' | 'addresses' | 'payments' | 'reviews' | 'security'

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile', label: 'Profile', icon: 'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2' },
  { id: 'orders', label: 'Orders', icon: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z' },
  { id: 'addresses', label: 'Addresses', icon: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z' },
  { id: 'payments', label: 'Payments', icon: 'M2 5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5z' },
  { id: 'reviews', label: 'My Reviews', icon: 'M12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2' },
  { id: 'security', label: 'Security', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10' },
]

export default function AccountPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const { firstName, lastName, userEmail, hydrate, logout } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    hydrate()
    useAddressStore.getState().hydrate()
    usePaymentStore.getState().hydrate()
    useOrderHistoryStore.getState().hydrate()
    useReviewStore.getState().hydrate()
  }, [hydrate])

  const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase() || '?'

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="burn-subtle pb-16 pt-24">
      <Container>
        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-56">
            <div className="sticky top-24 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-repixl-red/20">
                  <span className="font-display text-xl font-bold text-repixl-red">{initials}</span>
                </div>
                <p className="mt-3 font-display text-sm font-semibold text-repixl-text-light">
                  {firstName} {lastName}
                </p>
                <p className="font-mono text-[10px] text-repixl-muted">{userEmail}</p>
              </div>

              {/* Nav tabs */}
              <nav className="mt-6 space-y-1" aria-label="Account navigation">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'bg-repixl-red/10 text-repixl-red'
                        : 'text-repixl-text-light/70 hover:bg-repixl-bg hover:text-repixl-text-light'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={tab.icon} />
                      {tab.id === 'profile' && <circle cx="12" cy="7" r="4" />}
                      {tab.id === 'addresses' && <circle cx="12" cy="10" r="3" />}
                    </svg>
                    {tab.label}
                  </button>
                ))}

                {/* Logout */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 rounded px-3 py-2 text-left text-sm text-repixl-muted transition-colors hover:bg-repixl-bg hover:text-repixl-red"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" />
                  </svg>
                  Log Out
                </button>
              </nav>
            </div>
          </aside>

          {/* Content area */}
          <main className="flex-1">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'orders' && <OrdersTab />}
            {activeTab === 'addresses' && <AddressesTab />}
            {activeTab === 'payments' && <PaymentsTab />}
            {activeTab === 'reviews' && <ReviewsTab />}
            {activeTab === 'security' && <SecurityTab />}
          </main>
        </div>
      </Container>
    </div>
  )
}

// ─── Profile Tab ───
function ProfileTab() {
  const { firstName, lastName, userEmail, userPhone, updateProfile } = useAuthStore()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState(false)

  useEffect(() => { setFirst(firstName); setLast(lastName); setEmail(userEmail); setPhone(userPhone) }, [firstName, lastName, userEmail, userPhone])

  const hasChanges = first !== firstName || last !== lastName || email !== userEmail || phone !== userPhone

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!first.trim()) errs.first = 'First name is required.'
    if (!last.trim()) errs.last = 'Last name is required.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address.'
    if (phone.trim()) {
      const digits = phone.replace(/[\s\-+()]/g, '')
      if (!/^\d{7,15}$/.test(digits)) errs.phone = 'Enter a valid phone number.'
    }
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    updateProfile(first.trim(), last.trim(), email.trim(), phone.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <h2 className="text-center font-display text-lg font-semibold text-repixl-text-light">Profile Information</h2>
      <form onSubmit={handleSave} noValidate className="mt-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="p-first" className="mb-1 block text-center text-xs text-repixl-text-light/70">First Name</label>
            <input id="p-first" type="text" value={first} onChange={(e) => setFirst(e.target.value)} className={inputClass(errors.first)} />
            {errors.first && <p className="mt-1 text-xs text-red-400">{errors.first}</p>}
          </div>
          <div>
            <label htmlFor="p-last" className="mb-1 block text-center text-xs text-repixl-text-light/70">Last Name</label>
            <input id="p-last" type="text" value={last} onChange={(e) => setLast(e.target.value)} className={inputClass(errors.last)} />
            {errors.last && <p className="mt-1 text-xs text-red-400">{errors.last}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="p-email" className="mb-1 block text-center text-xs text-repixl-text-light/70">Email</label>
          <input id="p-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass(errors.email)} />
          {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
        </div>
        <div>
          <label htmlFor="p-phone" className="mb-1 block text-center text-xs text-repixl-text-light/70">Phone Number</label>
          <input id="p-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 912 345 6789" className={inputClass(errors.phone)} />
          {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
        </div>
        <div>
          <label htmlFor="p-birth" className="mb-1 block text-center text-xs text-repixl-text-light/70">Birth Date</label>
          <input id="p-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className={inputClass()} />
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button type="submit" variant="primary" size="md" disabled={!hasChanges} className={!hasChanges ? 'opacity-50 cursor-not-allowed' : ''}>Update Profile</Button>
          {saved && <span className="flex items-center gap-1.5 text-sm text-repixl-success" role="status"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Saved</span>}
        </div>
      </form>
    </div>
  )
}

// ─── Orders Tab ───
function OrdersTab() {
  const allOrders = useOrderHistoryStore((s) => s.orders)
  const userEmail = useAuthStore((s) => s.userEmail)
  const orders = allOrders.filter((o) => o.userEmail === userEmail)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)
  const allProducts = useProductStore((s) => s.products)

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-repixl-muted/10 bg-repixl-charcoal py-16 text-center">
        <h2 className="font-display text-lg font-semibold text-repixl-text-light">Order History</h2>
        <p className="mt-2 text-sm text-repixl-muted">No orders yet. Start shopping!</p>
        <Link href="/products" className="mt-4"><Button variant="primary" size="sm">Browse Cameras</Button></Link>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-center font-display text-lg font-semibold text-repixl-text-light">Order History</h2>
      <div className="mt-6 space-y-4">
        {orders.map((order) => (
          <div key={order.orderNumber} className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-repixl-text-light">Order #{order.orderNumber}</p>
                <p className="mt-0.5 text-xs text-repixl-muted">Placed on {order.date}</p>
                <p className="mt-0.5 text-sm text-repixl-text-light">Total: <span className="font-semibold">${order.total}</span></p>
              </div>
              <span className="rounded bg-repixl-success/15 px-2 py-0.5 font-mono text-[9px] uppercase text-repixl-success">{order.status}</span>
            </div>
            <button onClick={() => setDetailOrder(order)} className="mt-3 rounded border border-repixl-muted/20 px-3 py-1.5 text-xs text-repixl-text-light/70 transition-colors hover:border-repixl-muted/50 hover:text-repixl-text-light">View Details</button>
          </div>
        ))}
      </div>

      {/* Order Details Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-lg border border-repixl-muted/20 bg-repixl-bg p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-repixl-text-light">Order Details</h3>
              <button onClick={() => setDetailOrder(null)} className="text-repixl-muted hover:text-repixl-text-light"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-repixl-text-light">Order #{detailOrder.orderNumber}</p>
                  <p className="text-xs text-repixl-muted">Placed on {detailOrder.date}</p>
                </div>
                <span className="rounded bg-repixl-success/15 px-2 py-0.5 font-mono text-[9px] uppercase text-repixl-success">{detailOrder.status}</span>
              </div>
              <div className="rounded border border-repixl-muted/10 bg-repixl-charcoal p-3">
                <p className="text-center text-xs font-medium text-repixl-text-light/70">Shipping Address</p>
                <p className="mt-1 text-center text-sm text-repixl-text-light">{detailOrder.fullName}</p>
                <p className="text-center text-xs text-repixl-muted">{detailOrder.address}, {detailOrder.city} {detailOrder.postalCode}</p>
              </div>
              <div className="flex justify-end"><p className="text-sm text-repixl-text-light">Total: <span className="font-display font-bold">${detailOrder.total}</span></p></div>
              {/* Items table */}
              <table className="w-full text-sm">
                <thead className="border-b border-repixl-muted/10"><tr><th className="py-2 text-left text-xs text-repixl-muted">Item</th><th className="py-2 text-right text-xs text-repixl-muted">Price</th><th className="py-2 text-right text-xs text-repixl-muted">Qty</th><th className="py-2 text-right text-xs text-repixl-muted">Subtotal</th></tr></thead>
                <tbody className="divide-y divide-repixl-muted/10">
                  {detailOrder.items.map((item) => {
                    const product = allProducts.find((p) => p.slug === item.slug)
                    return (
                      <tr key={item.slug}>
                        <td className="py-2"><div className="flex items-center gap-2"><div className="h-8 w-8 overflow-hidden rounded bg-repixl-charcoal">{product && <img src={product.image} alt="" className="h-full w-full object-contain" />}</div><span className="text-repixl-text-light">{product?.name || item.slug}</span></div></td>
                        <td className="py-2 text-right font-mono text-repixl-text-light/70">${product?.price || 0}</td>
                        <td className="py-2 text-right font-mono text-repixl-text-light/70">1</td>
                        <td className="py-2 text-right font-mono text-repixl-text-light">${product?.price || 0}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="flex justify-center pt-2"><button onClick={() => setDetailOrder(null)} className="rounded bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">Close</button></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Addresses Tab ───
function AddressesTab() {
  const addresses = useAddressStore((s) => s.addresses)
  const addAddress = useAddressStore((s) => s.addAddress)
  const updateAddress = useAddressStore((s) => s.updateAddress)
  const removeAddress = useAddressStore((s) => s.removeAddress)
  const setDefault = useAddressStore((s) => s.setDefault)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleSave = (data: Omit<Address, 'id'>) => {
    if (editingId) updateAddress(editingId, data)
    else addAddress(data)
    setFormOpen(false); setEditingId(null)
  }

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) : undefined

  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Saved Addresses</h2>
        {!formOpen && <Button variant="secondary" size="sm" onClick={() => { setEditingId(null); setFormOpen(true) }}>+ Add</Button>}
      </div>
      {addresses.length === 0 && !formOpen && <p className="mt-4 text-sm text-repixl-muted">No saved addresses yet.</p>}
      {addresses.length > 0 && !formOpen && (
        <ul className="mt-4 space-y-3">
          {addresses.map((addr) => (
            <li key={addr.id} className="rounded border border-repixl-muted/10 bg-repixl-bg p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-repixl-text-light">{addr.fullName}</p>
                    {addr.isDefault && <span className="rounded bg-repixl-success/15 px-1.5 py-0.5 font-mono text-[9px] uppercase text-repixl-success">Default</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-repixl-text-light/60">{addr.address}, {addr.city} {addr.postalCode}</p>
                  {addr.phone && <p className="font-mono text-[10px] text-repixl-muted">{addr.phone}</p>}
                </div>
                <div className="flex gap-2">
                  {!addr.isDefault && <button type="button" onClick={() => setDefault(addr.id)} className="text-[10px] text-repixl-muted hover:text-repixl-text-light">Default</button>}
                  <button type="button" onClick={() => { setEditingId(addr.id); setFormOpen(true) }} className="text-[10px] text-repixl-muted hover:text-repixl-text-light">Edit</button>
                  <button type="button" onClick={() => removeAddress(addr.id)} className="text-[10px] text-repixl-muted hover:text-repixl-red">Delete</button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && <AddressForm initial={editingAddress} onSave={handleSave} onCancel={() => { setFormOpen(false); setEditingId(null) }} />}
    </div>
  )
}

function AddressForm({ initial, onSave, onCancel }: { initial?: Address; onSave: (d: Omit<Address, 'id'>) => void; onCancel: () => void }) {
  const [fullName, setFullName] = useState(initial?.fullName ?? '')
  const [address, setAddress] = useState(initial?.address ?? '')
  const [city, setCity] = useState(initial?.city ?? '')
  const [postalCode, setPostalCode] = useState(initial?.postalCode ?? '')
  const [phone, setPhone] = useState(initial?.phone ?? '')
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    if (!fullName.trim()) errs.fullName = 'Required.'
    if (!address.trim()) errs.address = 'Required.'
    if (!city.trim()) errs.city = 'Required.'
    if (!/^\d{4,6}$/.test(postalCode.replace(/\s/g, ''))) errs.postalCode = '4–6 digits.'
    if (phone.trim() && !/^\d{7,15}$/.test(phone.replace(/[\s\-+()]/g, ''))) errs.phone = 'Invalid phone.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave({ fullName: fullName.trim(), address: address.trim(), city: city.trim(), postalCode: postalCode.trim(), phone: phone.trim(), isDefault })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 rounded border border-repixl-muted/10 bg-repixl-bg p-4">
      <div><label htmlFor="a-name" className="mb-1 block text-xs text-repixl-text-light/70">Full Name</label><input id="a-name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass(errors.fullName)} />{errors.fullName && <p className="mt-1 text-xs text-red-400">{errors.fullName}</p>}</div>
      <div><label htmlFor="a-street" className="mb-1 block text-xs text-repixl-text-light/70">Street Address</label><input id="a-street" type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass(errors.address)} />{errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="a-city" className="mb-1 block text-xs text-repixl-text-light/70">City</label><input id="a-city" type="text" value={city} onChange={(e) => setCity(e.target.value)} className={inputClass(errors.city)} />{errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}</div>
        <div><label htmlFor="a-zip" className="mb-1 block text-xs text-repixl-text-light/70">Postal Code</label><input id="a-zip" type="text" inputMode="numeric" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputClass(errors.postalCode)} />{errors.postalCode && <p className="mt-1 text-xs text-red-400">{errors.postalCode}</p>}</div>
      </div>
      <div><label htmlFor="a-phone" className="mb-1 block text-xs text-repixl-text-light/70">Phone (optional)</label><input id="a-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass(errors.phone)} />{errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}</div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red" /><span className="text-xs text-repixl-text-light/70">Set as default</span></label>
      <div className="flex gap-3 pt-2"><Button type="submit" variant="primary" size="sm">{initial ? 'Update' : 'Save'}</Button><button type="button" onClick={onCancel} className="text-xs text-repixl-muted hover:text-repixl-text-light">Cancel</button></div>
    </form>
  )
}

// ─── Payments Tab ───
function PaymentsTab() {
  const cards = usePaymentStore((s) => s.cards)
  const addCard = usePaymentStore((s) => s.addCard)
  const removeCard = usePaymentStore((s) => s.removeCard)
  const setDefault = usePaymentStore((s) => s.setDefault)
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Payment Methods</h2>
        {!formOpen && <Button variant="secondary" size="sm" onClick={() => setFormOpen(true)}>+ Add Card</Button>}
      </div>
      {cards.length === 0 && !formOpen && <p className="mt-4 text-sm text-repixl-muted">No saved cards yet.</p>}
      {cards.length > 0 && !formOpen && (
        <ul className="mt-4 space-y-3">
          {cards.map((card) => (
            <li key={card.id} className="flex items-center justify-between rounded border border-repixl-muted/10 bg-repixl-bg p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-14 items-center justify-center rounded border border-repixl-muted/20 bg-repixl-charcoal"><span className="font-mono text-[9px] font-bold text-repixl-text-light/70">{card.brand}</span></div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm text-repixl-text-light">•••• {card.last4}</p>
                    {card.isDefault && <span className="rounded bg-repixl-success/15 px-1.5 py-0.5 font-mono text-[9px] uppercase text-repixl-success">Default</span>}
                  </div>
                  <p className="text-xs text-repixl-muted">{card.cardholderName} · {card.expiry}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {!card.isDefault && <button type="button" onClick={() => setDefault(card.id)} className="text-[10px] text-repixl-muted hover:text-repixl-text-light">Default</button>}
                <button type="button" onClick={() => removeCard(card.id)} aria-label={`Remove card ending in ${card.last4}`} className="text-[10px] text-repixl-muted hover:text-repixl-red">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {formOpen && <CardForm onSave={(d) => { addCard(d); setFormOpen(false) }} onCancel={() => setFormOpen(false)} />}
    </div>
  )
}

function CardForm({ onSave, onCancel }: { onSave: (d: Omit<SavedCard, 'id'>) => void; onCancel: () => void }) {
  const [cardNumber, setCardNumber] = useState('')
  const [expiry, setExpiry] = useState('')
  const [name, setName] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const errs: Record<string, string> = {}
    const digits = cardNumber.replace(/\s/g, '')
    if (!/^\d{16}$/.test(digits)) errs.cardNumber = '16 digits required.'
    const m = expiry.trim().match(/^(\d{2})\s*\/\s*(\d{2})$/)
    if (!m) errs.expiry = 'MM/YY format.'
    else { const mo = parseInt(m[1]); const yr = parseInt(m[2]) + 2000; if (mo < 1 || mo > 12 || new Date(yr, mo) <= new Date()) errs.expiry = 'Invalid or expired.' }
    if (!name.trim()) errs.name = 'Required.'
    setErrors(errs)
    if (Object.keys(errs).length > 0) return
    onSave({ last4: digits.slice(-4), brand: detectBrand(digits[0]), expiry: expiry.trim(), cardholderName: name.trim(), isDefault })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-3 rounded border border-repixl-muted/10 bg-repixl-bg p-4">
      <div><label htmlFor="c-num" className="mb-1 block text-xs text-repixl-text-light/70">Card Number</label><input id="c-num" type="text" inputMode="numeric" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="1234 5678 9012 3456" className={`font-mono ${inputClass(errors.cardNumber)}`} />{errors.cardNumber && <p className="mt-1 text-xs text-red-400">{errors.cardNumber}</p>}</div>
      <div className="grid grid-cols-2 gap-3">
        <div><label htmlFor="c-exp" className="mb-1 block text-xs text-repixl-text-light/70">Expiry</label><input id="c-exp" type="text" value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="MM / YY" className={`font-mono ${inputClass(errors.expiry)}`} />{errors.expiry && <p className="mt-1 text-xs text-red-400">{errors.expiry}</p>}</div>
        <div><label htmlFor="c-name" className="mb-1 block text-xs text-repixl-text-light/70">Name on Card</label><input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass(errors.name)} />{errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}</div>
      </div>
      <label className="flex items-center gap-2"><input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="h-3.5 w-3.5 rounded border-repixl-muted/30 bg-repixl-charcoal text-repixl-red" /><span className="text-xs text-repixl-text-light/70">Set as default</span></label>
      <div className="flex gap-3 pt-2"><Button type="submit" variant="primary" size="sm">Save Card</Button><button type="button" onClick={onCancel} className="text-xs text-repixl-muted hover:text-repixl-text-light">Cancel</button></div>
    </form>
  )
}

// ─── Reviews Tab (placeholder) ───
function ReviewsTab() {
  const { userEmail } = useAuthStore()
  const allReviews = useReviewStore((s) => s.reviews)
  const reviews = allReviews.filter((r) => r.reviewerEmail === userEmail)
  const deleteReview = useReviewStore((s) => s.deleteReview)
  const [searchQuery, setSearchQuery] = useState('')

  const avgRating = reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0'
  const latestDate = reviews.length > 0 ? reviews[0].date : '-'
  const filteredReviews = searchQuery.trim() ? reviews.filter((r) => {
    const product = allProducts.find((p) => p.slug === r.productSlug)
    return product?.name.toLowerCase().includes(searchQuery.toLowerCase())
  }) : reviews

  return (
    <div>
      <h2 className="text-center font-display text-lg font-semibold text-repixl-text-light">My Reviews</h2>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4 text-center">
          <p className="font-display text-xl font-bold text-repixl-text-light">{reviews.length}</p>
          <p className="mt-0.5 text-[10px] text-repixl-muted">Total Reviews</p>
        </div>
        <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4 text-center">
          <p className="font-display text-xl font-bold text-repixl-text-light">{avgRating}</p>
          <p className="mt-0.5 text-[10px] text-repixl-muted">Average Rating Given</p>
        </div>
        <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4 text-center">
          <p className="font-display text-sm font-bold text-repixl-text-light">{latestDate}</p>
          <p className="mt-0.5 text-[10px] text-repixl-muted">Latest Review</p>
        </div>
      </div>

      {/* Search */}
      <div className="mt-5">
        <input type="search" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search reviews by camera name..." className="w-full rounded border border-repixl-muted/20 bg-repixl-bg px-3 py-2 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:border-repixl-muted/50 focus:outline-none" />
      </div>

      {/* Reviews list or empty state */}
      {filteredReviews.length === 0 ? (
        <div className="mt-8 flex flex-col items-center py-10 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
          <p className="mt-4 font-display text-sm font-semibold text-repixl-text-light/60">No Reviews Yet</p>
          <p className="mt-1 text-xs text-repixl-muted">You haven&apos;t written any reviews yet. Start exploring cameras and share your thoughts!</p>
          <Link href="/products" className="mt-4"><Button variant="primary" size="sm">Browse Cameras</Button></Link>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {filteredReviews.map((review) => {
            const product = allProducts.find((p) => p.slug === review.productSlug)
            return (
              <div key={review.id} className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/products/${review.productSlug}`} className="text-sm font-medium text-repixl-text-light hover:underline">{product?.name || review.productSlug}</Link>
                    <div className="mt-1 flex gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill={i < review.rating ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" className={i < review.rating ? 'text-repixl-warning' : 'text-repixl-muted/40'}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-repixl-muted">{review.date}</span>
                    <Link href={`/products/${review.productSlug}`} className="text-[10px] text-repixl-muted hover:text-repixl-text-light">Edit</Link>
                    <button type="button" onClick={() => deleteReview(review.id)} className="text-[10px] text-repixl-muted hover:text-repixl-red">Delete</button>
                  </div>
                </div>
                <p className="mt-2 text-sm text-repixl-text-light/70">{review.comment}</p>
                {review.verifiedPurchase && <span className="mt-2 inline-block rounded bg-repixl-success/15 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-repixl-success">Verified Purchase</span>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Security Tab (placeholder) ───
function SecurityTab() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const changePassword = useAuthStore((s) => s.changePassword)

  const passwordRequirements = [
    { label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ]

  const allMet = passwordRequirements.every((r) => r.test(newPassword))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!currentPassword.trim()) { setError('Enter your current password.'); return }
    if (!allMet) { setError('New password does not meet requirements.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    const success = changePassword(currentPassword, newPassword)
    if (!success) { setError('Current password is incorrect.'); return }
    setSaved(true)
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-6">
      <h2 className="font-mono text-[10px] uppercase tracking-widest text-repixl-muted">Security</h2>
      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="sec-current" className="mb-1 block text-xs text-repixl-text-light/70">Current Password</label>
          <PasswordInput id="sec-current" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div>
          <label htmlFor="sec-new" className="mb-1 block text-xs text-repixl-text-light/70">New Password</label>
          <PasswordInput id="sec-new" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          {/* Live password checklist */}
          <ul className="mt-2.5 space-y-1" aria-label="Password requirements">
            {passwordRequirements.map((req) => {
              const met = req.test(newPassword)
              return (
                <li key={req.label} className="flex items-center gap-2">
                  {met ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-success"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-repixl-muted/40"><circle cx="12" cy="12" r="10" /></svg>
                  )}
                  <span className={`text-[11px] ${met ? 'text-repixl-success' : 'text-repixl-muted/60'}`}>{req.label}</span>
                </li>
              )
            })}
          </ul>
        </div>
        <div>
          <label htmlFor="sec-confirm" className="mb-1 block text-xs text-repixl-text-light/70">Confirm New Password</label>
          <PasswordInput id="sec-confirm" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
        {error && <p className="text-xs text-red-400" role="alert">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" variant="primary" size="md" disabled={!allMet} className={!allMet ? 'opacity-50 cursor-not-allowed' : ''}>
            Update Password
          </Button>
          {saved && <span className="flex items-center gap-1.5 text-sm text-repixl-success" role="status"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>Password updated</span>}
        </div>
      </form>

      {/* Recent Account Activity */}
      <div className="mt-6 rounded-lg border border-repixl-muted/10 bg-repixl-charcoal p-5">
        <h3 className="text-center text-sm font-semibold text-repixl-text-light">Recent Account Activity</h3>
        <dl className="mt-4 space-y-3">
          <div className="flex justify-between rounded px-2 py-1">
            <dt className="text-xs font-medium text-repixl-text-light/70">Last Login:</dt>
            <dd className="text-xs text-repixl-text-light">Today</dd>
          </div>
          <div className="flex justify-between rounded px-2 py-1">
            <dt className="text-xs font-medium text-repixl-text-light/70">Account Created:</dt>
            <dd className="text-xs text-repixl-text-light">{new Date().toLocaleDateString()}</dd>
          </div>
          <div className="flex justify-between rounded px-2 py-1">
            <dt className="text-xs font-medium text-repixl-text-light/70">Profile Last Updated:</dt>
            <dd className="text-xs text-repixl-text-light">{new Date().toLocaleDateString()}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}

// ─── Shared ───
function inputClass(error?: string): string {
  return `w-full rounded border px-3 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted/50 focus:outline-none ${
    error ? 'border-red-400/60 bg-red-400/5 focus:border-red-400' : 'border-repixl-muted/20 bg-repixl-bg focus:border-repixl-muted/50'
  }`
}
