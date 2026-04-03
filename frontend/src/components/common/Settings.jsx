import React, { useState } from 'react'
import { User, Lock, Bell, Shield, ChevronRight, Save } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { authAPI } from '../../services/api'
import { Avatar, ErrorMessage, Spinner } from '../common'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function Settings() {
  const { user, updateUser } = useAuth()
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '' })
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passLoading, setPassLoading]       = useState(false)
  const [profileError, setProfileError]     = useState('')
  const [passError, setPassError]           = useState('')

  const saveProfile = async (e) => {
    e.preventDefault()
    setProfileLoading(true); setProfileError('')
    try {
      const { data } = await authAPI.updateProfile(profileForm)
      updateUser(data.data.user)
      toast.success('Profile updated ✓')
    } catch (err) {
      setProfileError(getErrorMessage(err))
    } finally { setProfileLoading(false) }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    if (passForm.newPassword !== passForm.confirm) {
      setPassError('Passwords do not match'); return
    }
    setPassLoading(true); setPassError('')
    try {
      await authAPI.changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword })
      toast.success('Password changed ✓')
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' })
    } catch (err) {
      setPassError(getErrorMessage(err))
    } finally { setPassLoading(false) }
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-8">
      <div className="animate-fade-up">
        <h1 className="font-display font-bold text-2xl text-dark-50">Settings</h1>
        <p className="text-dark-400 text-sm mt-1">Manage your account preferences</p>
      </div>

      {/* Profile header */}
      <div className="card p-6 flex items-center gap-5 animate-fade-up">
        <Avatar name={user?.name} size="lg" />
        <div>
          <div className="font-display font-bold text-xl text-dark-50">{user?.name}</div>
          <div className="text-sm font-mono text-dark-400">{user?.phone}</div>
          <div className="mt-1">
            <span className={`badge ${user?.role === 'driver' ? 'bg-brand-500/15 text-brand-400 border-brand-500/20' : 'bg-blue-500/15 text-blue-400 border-blue-500/20'}`}>
              {user?.role}
            </span>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="card p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-brand-400" />
          <h2 className="font-display font-semibold text-dark-100">Personal Information</h2>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <div>
            <label className="label">Full Name</label>
            <input value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
              className="input-field" placeholder="Your name" required />
          </div>
          <div>
            <label className="label">Email Address</label>
            <input type="email" value={profileForm.email} onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
              className="input-field" placeholder="your@email.com" />
          </div>
          <div>
            <label className="label">Phone Number</label>
            <input value={user?.phone} disabled className="input-field opacity-50 cursor-not-allowed" />
            <p className="text-xs font-mono text-dark-500 mt-1">Phone number cannot be changed</p>
          </div>
          <ErrorMessage message={profileError} />
          <button type="submit" disabled={profileLoading} className="btn-primary">
            {profileLoading ? <Spinner size="sm" /> : <><Save size={16} /> Save Changes</>}
          </button>
        </form>
      </div>

      {/* Password form */}
      <div className="card p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-5">
          <Lock size={18} className="text-brand-400" />
          <h2 className="font-display font-semibold text-dark-100">Change Password</h2>
        </div>
        <form onSubmit={changePassword} className="space-y-4">
          <div>
            <label className="label">Current Password</label>
            <input type="password" value={passForm.currentPassword}
              onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
              className="input-field" placeholder="••••••••" required />
          </div>
          <div>
            <label className="label">New Password</label>
            <input type="password" value={passForm.newPassword}
              onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
              className="input-field" placeholder="Minimum 6 characters" minLength={6} required />
          </div>
          <div>
            <label className="label">Confirm New Password</label>
            <input type="password" value={passForm.confirm}
              onChange={e => setPassForm(p => ({ ...p, confirm: e.target.value }))}
              className="input-field" placeholder="Repeat password" required />
          </div>
          <ErrorMessage message={passError} />
          <button type="submit" disabled={passLoading} className="btn-primary">
            {passLoading ? <Spinner size="sm" /> : <><Lock size={16} /> Update Password</>}
          </button>
        </form>
      </div>

      {/* Account info */}
      <div className="card p-6 animate-fade-up">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={18} className="text-brand-400" />
          <h2 className="font-display font-semibold text-dark-100">Account</h2>
        </div>
        <div className="space-y-3 text-sm font-body">
          {[
            ['Account ID',   `#${user?.id}`],
            ['Role',         user?.role],
            ['Verified',     user?.is_verified ? '✅ Yes' : '❌ No'],
            ['Member since', new Date(user?.created_at || Date.now()).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between py-2 border-b border-dark-700 last:border-0">
              <span className="text-dark-400">{k}</span>
              <span className="text-dark-200 font-mono capitalize">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
