'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function AdminSettingsPage() {
  const { firstName, lastName, userEmail, hydrate } = useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [pwError, setPwError] = useState('')
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileMsg, setProfileMsg] = useState('')

  useEffect(() => { hydrate() }, [hydrate])
  useEffect(() => { setFName(firstName); setLName(lastName) }, [firstName, lastName])

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPw.trim()) { setPwError('Enter current password.'); return }
    if (newPw.length < 6) { setPwError('New password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return }
    setPwError(''); setPwMsg('Password updated successfully.'); setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setTimeout(() => setPwMsg(''), 3000)
  }

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fName.trim() || !lName.trim()) { setProfileMsg('Name fields are required.'); return }
    useAuthStore.getState().updateProfile(fName.trim(), lName.trim(), userEmail, phone.trim())
    setProfileMsg('Profile updated.'); setTimeout(() => setProfileMsg(''), 3000)
  }

  const iClass = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-repixl-red/30 focus:bg-white focus:outline-none focus:ring-1 focus:ring-repixl-red/20'

  return (
    <div>
      <div><h1 className="text-2xl font-bold text-repixl-text-dark">Security & Settings</h1><p className="mt-0.5 text-sm text-gray-500">Manage your admin account security and profile.</p></div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Security */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-repixl-text-dark">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Current Password</label><input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={iClass} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">New Password</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={iClass} /><p className="mt-1 text-[10px] text-gray-400">Minimum 6 characters</p></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Confirm New Password</label><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={iClass} /></div>
            {pwError && <p className="text-xs text-red-500">{pwError}</p>}
            {pwMsg && <p className="text-xs text-green-500">{pwMsg}</p>}
            <button type="submit" className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700">Update Password</button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="font-semibold text-repixl-text-dark">Recent Account Activity</h3>
            <dl className="mt-3 space-y-2">
              {[['Last Login', 'Today'], ['Session Expires', 'In 24 hours'], ['Admin Since', 'Jan 2026']].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg px-3 py-2 hover:bg-gray-50"><dt className="text-xs text-gray-500">{k}</dt><dd className="text-xs font-medium text-gray-700">{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>

        {/* Profile */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="font-bold text-repixl-text-dark">Profile Settings</h2>
          <form onSubmit={handleProfileUpdate} className="mt-4 space-y-3">
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Email</label><input type="email" value={userEmail} disabled className={`${iClass} cursor-not-allowed opacity-60`} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">First Name</label><input type="text" value={fName} onChange={(e) => setFName(e.target.value)} className={iClass} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Last Name</label><input type="text" value={lName} onChange={(e) => setLName(e.target.value)} className={iClass} /></div>
            <div><label className="mb-1 block text-xs font-medium text-gray-500">Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={iClass} /></div>
            {profileMsg && <p className={`text-xs ${profileMsg.includes('updated') ? 'text-green-500' : 'text-red-500'}`}>{profileMsg}</p>}
            <button type="submit" className="rounded-xl bg-repixl-red px-5 py-2.5 text-sm font-medium text-white hover:bg-red-700">Update Profile</button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="font-semibold text-repixl-text-dark">Account Information</h3>
            <dl className="mt-3 space-y-2">
              {[['Role', 'Admin'], ['Account ID', 'ADM-001'], ['Status', 'Active']].map(([k, v]) => (
                <div key={k} className="flex justify-between rounded-lg px-3 py-2 hover:bg-gray-50"><dt className="text-xs text-gray-500">{k}</dt><dd className={`text-xs font-medium ${v === 'Active' ? 'text-green-500' : v === 'Admin' ? 'text-repixl-red' : 'text-gray-700'}`}>{v}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
