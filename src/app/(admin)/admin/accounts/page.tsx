'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

interface AdminAccount { id: string; username: string; email: string; firstName: string; lastName: string; phone: string; role: 'admin' | 'super-admin'; created: string }

const initialAdmins: AdminAccount[] = [
  { id: '1', username: 'admin', email: 'admin@repixl-admin.com', firstName: 'Admin', lastName: 'User', phone: '', role: 'admin', created: 'Jan 2026' },
  { id: '2', username: 'super', email: 'super@repixl-admin.com', firstName: 'System', lastName: 'Administrator', phone: '', role: 'super-admin', created: 'Jan 2026' },
]

export default function AdminAccountsPage() {
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin)
  const router = useRouter()
  const [admins, setAdmins] = useState<AdminAccount[]>(initialAdmins)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [pwModalId, setPwModalId] = useState<string | null>(null)

  useEffect(() => { useAuthStore.getState().hydrate(); if (!isSuperAdmin) router.push('/admin') }, [isSuperAdmin, router])
  if (!isSuperAdmin) return null

  const openAdd = () => { setEditingId(null); setModalOpen(true) }
  const openEdit = (id: string) => { setEditingId(id); setModalOpen(true) }

  const handleSave = (data: Omit<AdminAccount, 'id' | 'created'>) => {
    if (editingId) {
      setAdmins(admins.map((a) => a.id === editingId ? { ...a, ...data } : a))
    } else {
      setAdmins([...admins, { ...data, id: `a-${Date.now()}`, created: 'Jul 2026' }])
    }
    setModalOpen(false); setEditingId(null)
  }

  const deleteAdmin = (id: string) => setAdmins(admins.filter((a) => a.id !== id))

  const editing = editingId ? admins.find((a) => a.id === editingId) : null

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Admin Management</h1>
        <span className="rounded bg-amber-500/15 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-400">Super Admin</span>
      </div>

      {/* Sub-header card */}
      <div className="mt-4 rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-white">Admin Accounts</h2>
            <p className="mt-0.5 text-xs text-slate-500">Manage administrator access and permissions</p>
          </div>
          <button onClick={openAdd} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" x2="19" y1="8" y2="14" /><line x1="22" x2="16" y1="11" y2="11" /></svg>
            Add New Admin
          </button>
        </div>

        {/* Table */}
        <div className="mt-4 overflow-hidden rounded-lg border border-slate-700/30">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-700/50 bg-slate-800/60">
              <tr>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Username</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Email</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Name</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Role</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Created</th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {admins.map((a) => (
                <tr key={a.id} className="transition-colors hover:bg-slate-700/20">
                  <td className="px-4 py-3 text-slate-200">{a.username}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{a.email}</td>
                  <td className="px-4 py-3 text-slate-300">{a.firstName} {a.lastName}</td>
                  <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${a.role === 'super-admin' ? 'bg-amber-500/15 text-amber-400' : 'bg-blue-500/15 text-blue-400'}`}>{a.role === 'super-admin' ? 'Super Admin' : 'Admin'}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-500">{a.created}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(a.id)} className="flex h-7 w-7 items-center justify-center rounded bg-blue-500/10 text-blue-400 transition-colors hover:bg-blue-500/20" aria-label="Edit">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                      </button>
                      <button onClick={() => setPwModalId(a.id)} className="flex h-7 w-7 items-center justify-center rounded bg-amber-500/10 text-amber-400 transition-colors hover:bg-amber-500/20" aria-label="Change password">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
                      </button>
                      <button onClick={() => deleteAdmin(a.id)} className="flex h-7 w-7 items-center justify-center rounded bg-red-500/10 text-red-400 transition-colors hover:bg-red-500/20" aria-label="Delete">
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {modalOpen && <AdminModal existing={editing} onSave={handleSave} onClose={() => { setModalOpen(false); setEditingId(null) }} />}

      {/* Password Change Modal */}
      {pwModalId && <PasswordModal admin={admins.find((a) => a.id === pwModalId)!} onClose={() => setPwModalId(null)} />}
    </div>
  )
}

function PasswordModal({ admin, onClose }: { admin: AdminAccount; onClose: () => void }) {
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const requirements = [
    { label: 'At least 6 characters', test: (p: string) => p.length >= 6 },
    { label: 'One uppercase letter', test: (p: string) => /[A-Z]/.test(p) },
    { label: 'One lowercase letter', test: (p: string) => /[a-z]/.test(p) },
    { label: 'One number', test: (p: string) => /\d/.test(p) },
    { label: 'One special character (!@#$%^&*)', test: (p: string) => /[!@#$%^&*]/.test(p) },
  ]

  const allMet = requirements.every((r) => r.test(newPw))

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!allMet) { setError('Password does not meet all requirements.'); return }
    if (newPw !== confirmPw) { setError('Passwords do not match.'); return }
    setError('')
    setMsg('Password updated successfully.')
    setNewPw(''); setConfirmPw('')
    setTimeout(() => onClose(), 1500)
  }

  const iClass = 'w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>
            Change Password
          </h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-800 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <p className="text-xs text-slate-400">Changing password for: <span className="font-medium text-slate-200">{admin.username}</span> ({admin.email})</p>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">New Password <span className="text-red-400">*</span></label>
            <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="Enter new password" className={iClass} />
            {/* Requirements checklist */}
            <ul className="mt-2 space-y-1">
              {requirements.map((req) => {
                const met = req.test(newPw)
                return (
                  <li key={req.label} className="flex items-center gap-2">
                    {met ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><path d="M20 6 9 17l-5-5" /></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600"><circle cx="12" cy="12" r="10" /></svg>
                    )}
                    <span className={`text-[10px] ${met ? 'text-green-400' : 'text-slate-600'}`}>{req.label}</span>
                  </li>
                )
              })}
            </ul>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Confirm Password <span className="text-red-400">*</span></label>
            <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="Re-enter password" className={iClass} />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {msg && <p className="text-xs text-green-400">{msg}</p>}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/50 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200">Cancel</button>
            <button type="submit" disabled={!allMet} className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${allMet ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 cursor-not-allowed opacity-50'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AdminModal({ existing, onSave, onClose }: { existing?: AdminAccount | null; onSave: (data: Omit<AdminAccount, 'id' | 'created'>) => void; onClose: () => void }) {
  const [username, setUsername] = useState(existing?.username ?? '')
  const [email, setEmail] = useState(existing?.email ?? '')
  const [firstName, setFirstName] = useState(existing?.firstName ?? '')
  const [lastName, setLastName] = useState(existing?.lastName ?? '')
  const [phone, setPhone] = useState(existing?.phone ?? '')
  const [password, setPassword] = useState('')
  const [isSuperAdmin, setIsSuperAdmin] = useState(existing?.role === 'super-admin')
  const [error, setError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) { setError('Username is required.'); return }
    if (!email.trim()) { setError('Email is required.'); return }
    if (!existing && password.length < 6) { setError('Password must be at least 6 characters.'); return }
    setError('')
    onSave({
      username: username.trim(),
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      role: isSuperAdmin ? 'super-admin' : 'admin',
    })
  }

  const iClass = 'w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none'

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 pt-12 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-700/50 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700/50 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">{existing ? 'Edit Admin' : 'Add New Admin'}</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {error && <div className="mx-6 mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          {/* Username + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Username <span className="text-red-400">*</span></label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" className={iClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Email <span className="text-red-400">*</span></label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin@example.com" className={iClass} />
            </div>
          </div>

          {/* First + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" className={iClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Last Name</label>
              <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" className={iClass} />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className={iClass} />
          </div>

          {/* Password */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-300">Password <span className="text-red-400">*</span></label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 characters" className={iClass} />
            {existing && <p className="mt-1 text-[10px] text-slate-600">Leave blank to keep current password (edit mode)</p>}
          </div>

          {/* Super Admin checkbox */}
          <label className="flex items-start gap-3 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
            <input type="checkbox" checked={isSuperAdmin} onChange={(e) => setIsSuperAdmin(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/30" />
            <div>
              <p className="text-sm font-medium text-slate-200">Super Admin (Full System Access)</p>
              <p className="text-[11px] text-slate-500">Super admins can manage other admin accounts</p>
            </div>
          </label>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 border-t border-slate-700/50 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-700/50 px-4 py-2 text-sm text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200">Cancel</button>
            <button type="submit" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
              Save Admin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
