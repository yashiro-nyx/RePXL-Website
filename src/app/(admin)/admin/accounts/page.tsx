'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface AdminAccount { id: string; username: string; email: string; firstName: string; lastName: string; phone: string; role: 'admin' | 'super-admin'; created: string }

const initialAdmins: AdminAccount[] = [
  { id: '1', username: 'admin', email: 'admin@repixl-admin.com', firstName: 'Admin', lastName: 'User', phone: '', role: 'admin', created: 'Jan 2026' },
  { id: '2', username: 'super', email: 'super@repixl-admin.com', firstName: 'System', lastName: 'Administrator', phone: '', role: 'super-admin', created: 'Jan 2026' },
]

const iClass = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:bg-repixl-charcoal focus:outline-none'

export default function AdminAccountsPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminAccount[]>(initialAdmins)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pwModalId, setPwModalId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  useEffect(() => { useAuthStore.getState().hydrate(); if (!isSuperAdmin) router.push('/admin') }, [isSuperAdmin, router])
  if (!isSuperAdmin) return null

  const handleSave = (data: Omit<AdminAccount, 'id'|'created'>) => {
    if (editingId) setAdmins(admins.map((a) => a.id === editingId ? { ...a, ...data } : a))
    else setAdmins([...admins, { ...data, id: `a-${Date.now()}`, created: 'Jul 2026' }])
    setModalOpen(false); setEditingId(null)
  }

  const editing = editingId ? admins.find((a) => a.id === editingId) : undefined

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <div><h1 className="text-2xl font-bold text-repixl-text-light">Admin Management</h1><p className="mt-0.5 text-sm text-repixl-muted">Manage administrator access and permissions.</p></div>
        <span className="rounded-full bg-repixl-red/10 px-3 py-1 text-xs font-semibold text-repixl-red">Super Admin</span>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-sm">
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
          <div><p className="font-semibold text-repixl-text-light">Admin Accounts</p><p className="text-xs text-repixl-muted">Manage administrator access</p></div>
          <button onClick={() => { setEditingId(null); setModalOpen(true) }} className="flex items-center gap-2 rounded-xl bg-repixl-red px-4 py-2 text-sm font-medium text-white hover:bg-red-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
            Add New Admin
          </button>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-repixl-muted/10 bg-repixl-bg/50">
            <tr>{['Username','Email','Name','Role','Created','Actions'].map((h) => <th key={h} className="px-5 py-3.5 text-[10px] font-semibold uppercase tracking-wider text-repixl-muted">{h}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-repixl-muted/10">
            {admins.map((a) => (
              <tr key={a.id} className="transition-colors hover:bg-repixl-bg/60">
                <td className="px-5 py-3.5 font-medium text-repixl-text-light">{a.username}</td>
                <td className="px-5 py-3.5 font-mono text-xs text-repixl-muted">{a.email}</td>
                <td className="px-5 py-3.5 text-repixl-text-light/80">{a.firstName} {a.lastName}</td>
                <td className="px-5 py-3.5"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${a.role === 'super-admin' ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-repixl-red/5 text-repixl-red border-repixl-red/20'}`}>{a.role === 'super-admin' ? 'Super Admin' : 'Admin'}</span></td>
                <td className="px-5 py-3.5 text-xs text-repixl-muted">{a.created}</td>
                <td className="px-5 py-3.5">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingId(a.id); setModalOpen(true) }} className="flex h-7 w-7 items-center justify-center rounded-lg bg-repixl-red/5 text-repixl-red hover:bg-repixl-red/10"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg></button>
                    <button onClick={() => setPwModalId(a.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></button>
                    <button onClick={() => setConfirmDeleteId(a.id)} className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/></svg></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && <AdminModal existing={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditingId(null) }} />}
      {pwModalId && <PasswordModal admin={admins.find((a) => a.id === pwModalId)!} onClose={() => setPwModalId(null)} />}

      {/* Delete confirmation */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-80 rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-2xl text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-red-400"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </div>
            <p className="font-semibold text-repixl-text-light">Delete this admin?</p>
            <p className="mt-1 text-xs text-repixl-muted">This action cannot be undone.</p>
            <p className="mt-2 font-mono text-xs text-repixl-red">{admins.find((a) => a.id === confirmDeleteId)?.username}</p>
            <div className="mt-4 flex justify-center gap-3">
              <button onClick={() => { setAdmins(admins.filter((x) => x.id !== confirmDeleteId)); setConfirmDeleteId(null) }} className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600">Delete</button>
              <button onClick={() => setConfirmDeleteId(null)} className="flex-1 rounded-xl border border-repixl-muted/20 px-4 py-2 text-sm text-repixl-muted hover:text-repixl-text-light">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminModal({ existing, onSave, onClose }: { existing?: AdminAccount|null; onSave: (d: Omit<AdminAccount,'id'|'created'>) => void; onClose: () => void }) {
  const [username, setUsername] = useState(existing?.username ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [firstName, setFirstName] = useState(existing?.firstName ?? '')
  const [lastName, setLastName] = useState(existing?.lastName ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [password, setPassword] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(existing?.role === 'super-admin')
  const [error, setError] = useState('')

  const c = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:bg-repixl-charcoal focus:outline-none'

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !email.trim()) { setError('Username and email are required.'); return }
    if (!existing && password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    onSave({ username: username.trim(), email: email.trim(), firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), role: isSuperAdmin ? 'super-admin' : 'admin' })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4">
          <h2 className="font-bold text-repixl-text-light">{existing ? 'Edit Admin' : 'Add New Admin'}</h2>
          <button onClick={onClose} className="text-repixl-muted hover:text-repixl-text-light/70"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>
        </div>
        {error && <div className="mx-6 mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-2 text-xs text-red-400">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Username <span className="text-red-400">*</span></label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" className={c} /></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Email <span className="text-red-400">*</span></label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className={c} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">First Name</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={c} /></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Last Name</label><input value={lastName} onChange={(e) => setLastName(e.target.value)} className={c} /></div>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Phone</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={c} /></div>
          <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Password <span className="text-red-400">*</span></label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className={c} />{existing && <p className="mt-1 text-[10px] text-repixl-muted">Leave blank to keep current password</p>}</div>
          <label className="flex items-start gap-3 rounded-xl border border-repixl-muted/20 bg-repixl-bg p-4 cursor-pointer hover:bg-repixl-muted/10">
            <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)} className="mt-0.5 h-4 w-4 rounded text-repixl-red focus:ring-repixl-red/30" />
            <div><p className="text-sm font-medium text-repixl-text-light">Super Admin (Full System Access)</p><p className="text-[11px] text-repixl-muted">Super admins can manage other admin accounts</p></div>
          </label>
          <div className="flex gap-3 border-t border-repixl-muted/10 pt-4"><button type="submit" className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700">Save Admin</button><button type="button" onClick={onClose} className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-text-light/70 hover:bg-repixl-bg">Cancel</button></div>
        </form>
      </div>
    </div>
  )
}

function PasswordModal({ admin, onClose }: { admin: AdminAccount; onClose: () => void }) {
  const [newPw, setNewPw] = useState(''); const [confirmPw, setConfirmPw] = useState(''); const [msg, setMsg] = useState(''); const [error, setError] = useState('')
  const reqs = [{ label: 'At least 8 characters', test: (p: string) => p.length >= 8 }, { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) }, { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) }, { label: 'One number', test: (p: string) => /\d/.test(p) }, { label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) }]
  const allMet = reqs.every((r) => r.test(newPw))
  const c = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:bg-repixl-charcoal focus:outline-none'
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!allMet) { setError('Requirements not met.'); return } if (newPw !== confirmPw) { setError('Passwords do not match.'); return } setError(''); setMsg('Password updated!'); setNewPw(''); setConfirmPw(''); setTimeout(onClose, 1500) }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal shadow-2xl">
        <div className="flex items-center justify-between border-b border-repixl-muted/10 px-6 py-4"><h2 className="font-bold text-repixl-text-light">Change Password</h2><button onClick={onClose} className="text-repixl-muted hover:text-repixl-text-light/70"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-xs text-repixl-muted">For: <span className="font-medium text-repixl-text-light">{admin.username}</span></p>
          <div><label className="mb-1 block text-xs font-medium text-repixl-muted">New Password</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={c} />
            <ul className="mt-2 space-y-1">{reqs.map((r) => { const met = r.test(newPw); return <li key={r.label} className="flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={met ? 'text-green-400' : 'text-repixl-muted/40'}>{met ? <path d="M20 6 9 17l-5-5"/> : <circle cx="12" cy="12" r="10"/>}</svg><span className={`text-[10px] ${met ? 'text-green-400' : 'text-repixl-muted'}`}>{r.label}</span></li>})}</ul>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Confirm Password</label><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={c} /></div>
          {error && <p className="text-xs text-red-500">{error}</p>}{msg && <p className="text-xs text-green-500">{msg}</p>}
          <div className="flex gap-3 border-t border-repixl-muted/10 pt-4"><button type="submit" disabled={!allMet} className={`rounded-xl px-5 py-2.5 text-sm font-medium text-white ${allMet ? 'bg-repixl-red hover:bg-red-700' : 'bg-repixl-muted/30 cursor-not-allowed'}`}>Update Password</button><button type="button" onClick={onClose} className="rounded-xl border border-repixl-muted/20 px-5 py-2.5 text-sm text-repixl-text-light/70 hover:bg-repixl-bg">Cancel</button></div>
        </form>
      </div>
    </div>
  )
}
