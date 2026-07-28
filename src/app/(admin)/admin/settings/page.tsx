'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'

export default function AdminSettingsPage() {
  const { firstName, lastName, userEmail, hydrate } = useAuthStore()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwMsg, setPwMsg] = useState('')
  const [fName, setFName] = useState('')
  const [lName, setLName] = useState('')
  const [phone, setPhone] = useState('')
  const [profileMsg, setProfileMsg] = useState('')

  useEffect(() => { hydrate() }, [hydrate])
  useEffect(() => { setFName(firstName); setLName(lastName); setPhone(useAuthStore.getState().userPhone) }, [firstName, lastName])

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentPw.trim()) { setPwMsg('Enter current password.'); return }
    if (newPw.length < 6) { setPwMsg('New password must be at least 6 characters.'); return }
    if (newPw !== confirmPw) { setPwMsg('Passwords do not match.'); return }
    setPwMsg(''); setCurrentPw(''); setNewPw(''); setConfirmPw('')
    setPwMsg('Password updated successfully.')
    setTimeout(() => setPwMsg(''), 3000)
  }

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fName.trim() || !lName.trim()) { setProfileMsg('Name fields are required.'); return }
    useAuthStore.getState().updateProfile(fName.trim(), lName.trim(), userEmail, phone.trim())
    setProfileMsg('Profile updated.')
    setTimeout(() => setProfileMsg(''), 3000)
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-500/10 text-slate-400">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" /></svg>
        </div>
        <h1 className="text-xl font-semibold text-white">Security & Settings</h1>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {/* Security */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-red-500/10 text-red-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg></span>
            Change Password
          </h2>
          <form onSubmit={handlePasswordChange} className="mt-4 space-y-3">
            <div><label className="mb-1 block text-xs text-slate-400">Current Password</label><input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs text-slate-400">New Password</label><input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" /><p className="mt-0.5 text-[10px] text-slate-600">Minimum 6 characters</p></div>
            <div><label className="mb-1 block text-xs text-slate-400">Confirm New Password</label><input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" /></div>
            {pwMsg && <p className={`text-xs ${pwMsg.includes('success') ? 'text-green-400' : 'text-red-400'}`}>{pwMsg}</p>}
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">Update Password</button>
          </form>

          <div className="mt-6 border-t border-slate-700/50 pt-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              Session Information
            </h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20"><dt className="text-xs text-slate-500">Last Login</dt><dd className="font-mono text-xs text-slate-300">Today</dd></div>
              <div className="flex justify-between rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20"><dt className="text-xs text-slate-500">Session Expires</dt><dd className="font-mono text-xs text-slate-300">In 24 hours</dd></div>
              <div className="flex justify-between rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20"><dt className="text-xs text-slate-500">Admin Since</dt><dd className="font-mono text-xs text-slate-300">Jan 2026</dd></div>
            </dl>
            <button className="mt-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-400 transition-colors hover:bg-red-500/20">Logout All Sessions</button>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5 backdrop-blur-sm transition-shadow hover:shadow-lg hover:shadow-slate-900/50">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-purple-500/10 text-purple-400"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg></span>
            Profile Settings
          </h2>
          <form onSubmit={handleProfileUpdate} className="mt-4 space-y-3">
            <div><label className="mb-1 block text-xs text-slate-400">Email</label><input type="email" value={userEmail} disabled className="w-full rounded-lg border border-slate-700/50 bg-slate-900/30 px-3 py-2 text-sm text-slate-500 opacity-60" /></div>
            <div><label className="mb-1 block text-xs text-slate-400">First Name</label><input type="text" value={fName} onChange={(e) => setFName(e.target.value)} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" /></div>
            <div><label className="mb-1 block text-xs text-slate-400">Last Name</label><input type="text" value={lName} onChange={(e) => setLName(e.target.value)} className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none" /></div>
            <div className="col-span-2"><label className="mb-1 block text-xs text-slate-400">Phone Number</label><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none" /></div>
            {profileMsg && <p className={`text-xs ${profileMsg.includes('updated') ? 'text-green-400' : 'text-red-400'}`}>{profileMsg}</p>}
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">Update Profile</button>
          </form>

          <div className="mt-6 border-t border-slate-700/50 pt-4">
            <h3 className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></svg>
              Account Information
            </h3>
            <dl className="mt-3 space-y-2">
              <div className="flex justify-between rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20"><dt className="text-xs text-slate-500">Role</dt><dd className="font-mono text-xs text-blue-400">Admin</dd></div>
              <div className="flex justify-between rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20"><dt className="text-xs text-slate-500">Account ID</dt><dd className="font-mono text-xs text-slate-300">ADM-001</dd></div>
              <div className="flex justify-between rounded-lg px-2 py-1 transition-colors hover:bg-slate-700/20"><dt className="text-xs text-slate-500">Status</dt><dd className="font-mono text-xs text-green-400">Active</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
