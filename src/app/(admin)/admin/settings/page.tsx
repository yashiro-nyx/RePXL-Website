'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function AdminSettingsPage() {
  const { firstName, lastName, userEmail, userPhone, hydrate, updateProfile, changePassword } = useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [profileLoading, setProfileLoading] = useState(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Populate form fields when auth store hydrates
  useEffect(() => {
    setFName(firstName)
    setLName(lastName)
    setPhone(userPhone)
  }, [firstName, lastName, userPhone])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwMsg('')
    if (!currentPw.trim()) { setPwError('Enter your current password.'); return }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (!/[A-Z]/.test(newPw)) { setPwError('New password must contain at least one uppercase letter.'); return }
    if (!/\d/.test(newPw)) { setPwError('New password must contain at least one number.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwLoading(true)
    // Use the shared changePassword action which calls POST /api/auth/change-password
    const success = await changePassword(currentPw, newPw)
    setPwLoading(false)
    if (!success) {
      setPwError('Current password is incorrect.')
      return
    }
    setPwMsg('Password updated successfully.')
    setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwMsg(''), 3000)
  }

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileMsg('')
    if (!fName.trim() || !lName.trim()) { setProfileMsg('Name fields are required.'); return }
    setProfileLoading(true)
    // updateProfile calls PUT /api/auth/me which persists to the database
    await updateProfile(fName.trim(), lName.trim(), userEmail, phone.trim())
    setProfileLoading(false)
    setProfileMsg('Profile updated.')
    setTimeout(() => setProfileMsg(''), 3000)
  }

  const iClass = 'w-full rounded-xl border border-repixl-muted/20 bg-repixl-bg px-4 py-2.5 text-sm text-repixl-text-light placeholder:text-repixl-muted focus:border-repixl-red/30 focus:bg-repixl-charcoal focus:outline-none focus:ring-1 focus:ring-repixl-red/20'

  return (
    <div>
      <div><h1 className="text-2xl font-bold text-repixl-text-light">Security & Settings</h1><p className="mt-0.5 text-sm text-repixl-muted">Manage your admin account security and profile.</p></div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Security */}
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-sm">
          <h2 className="font-bold text-repixl-text-light">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Current Password</label><input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoComplete="current-password" className={iClass} /></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">New Password</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" className={iClass} /><p className="mt-1 text-[10px] text-repixl-muted">Minimum 8 characters, 1 uppercase, 1 number</p></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Confirm New Password</label><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" className={iClass} /></div>
            {pwError && <p className="text-xs text-red-400">{pwError}</p>}
            {pwMsg && <p className="text-xs text-repixl-success">{pwMsg}</p>}
            <button type="submit" disabled={pwLoading} className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {pwLoading ? 'Updating…' : 'Update Password'}
            </button>
          </form>

          <div className="mt-6 border-t border-repixl-muted/10 pt-5">
            <h3 className="font-semibold text-repixl-text-light">Recent Account Activity</h3>
            <dl className="mt-3 space-y-2">
              {[['Last Login', 'Today'], ['Role', 'Admin'], ['Status', 'Active']].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg px-3 py-2 hover:bg-repixl-bg"><dt className="text-xs text-repixl-muted">{k}</dt><dd className="text-xs font-medium text-repixl-text-light/80">{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>

        {/* Profile */}
        <div className="rounded-2xl border border-repixl-muted/20 bg-repixl-charcoal p-6 shadow-sm">
          <h2 className="font-bold text-repixl-text-light">Profile Settings</h2>
          <form onSubmit={handleProfileUpdate} className="mt-4 space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Email</label><input type="email" value={userEmail} disabled className={`${iClass} cursor-not-allowed opacity-60`} /></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">First Name</label><input type="text" value={fName} onChange={(e) => setFName(e.target.value)} className={iClass} /></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Last Name</label><input type="text" value={lName} onChange={(e) => setLName(e.target.value)} className={iClass} /></div>
            <div><label className="mb-1 block text-xs font-medium text-repixl-muted">Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={iClass} /></div>
            {profileMsg && <p className={`text-xs ${profileMsg === 'Profile updated.' ? 'text-repixl-success' : 'text-red-400'}`}>{profileMsg}</p>}
            <button type="submit" disabled={profileLoading} className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
              {profileLoading ? 'Saving…' : 'Update Profile'}
            </button>
          </form>

          <div className="mt-6 border-t border-repixl-muted/10 pt-5">
            <h3 className="font-semibold text-repixl-text-light">Account Information</h3>
            <dl className="mt-3 space-y-2">
              {[['Role', 'Admin'], ['Email', userEmail || '—'], ['Status', 'Active']].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg px-3 py-2 hover:bg-repixl-bg"><dt className="text-xs text-repixl-muted">{k}</dt><dd className={`text-xs font-medium ${v === 'Active' ? 'text-repixl-success' : v === 'Admin' ? 'text-repixl-red' : 'text-repixl-text-light/80'}`}>{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
