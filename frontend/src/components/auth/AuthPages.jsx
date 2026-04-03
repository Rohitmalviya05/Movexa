import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Truck, ArrowRight, Phone, Lock } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { ErrorMessage, Spinner } from '../common'
import { getErrorMessage } from '../../utils/helpers'
import toast from 'react-hot-toast'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ phone: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const user = await login(form)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}!`)
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your LoadGo account"
      alternate={<>Don't have an account? <Link to="/signup" className="text-brand-400 hover:text-brand-300 font-semibold">Sign up</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Mobile Number</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
            <input name="phone" value={form.phone} onChange={handle} required
              placeholder="9876543210" className="input-field pl-10" maxLength={10} />
          </div>
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-400" />
            <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handle} required
              placeholder="••••••••" className="input-field pl-10 pr-10" />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200 transition-colors">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <ErrorMessage message={error} />
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? <Spinner size="sm" /> : <>Sign In <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthLayout>
  )
}

export function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', phone: '', email: '', password: '', role: 'customer' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handle = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const user = await signup(form)
      toast.success('Account created! Welcome to LoadGo 🚛')
      navigate('/dashboard')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create account"
      subtitle="Join LoadGo and start transporting goods"
      alternate={<>Already have an account? <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold">Sign in</Link></>}
    >
      <form onSubmit={submit} className="space-y-4">
        {/* Role selector */}
        <div>
          <label className="label">I am a</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'customer', label: 'Customer', icon: '📦', desc: 'Send goods' },
              { value: 'driver',   label: 'Driver',   icon: '🚗', desc: 'Deliver goods' },
            ].map(r => (
              <button key={r.value} type="button" onClick={() => setForm(p => ({ ...p, role: r.value }))}
                className={`flex flex-col items-center gap-1 p-4 rounded-xl border-2 transition-all
                  ${form.role === r.value
                    ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                    : 'border-dark-600 bg-dark-800 text-dark-400 hover:border-dark-500'}`}>
                <span className="text-2xl">{r.icon}</span>
                <span className="font-display font-semibold text-sm">{r.label}</span>
                <span className="text-xs opacity-70">{r.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Full Name</label>
          <input name="name" value={form.name} onChange={handle} required autoComplete="name"
            placeholder="Rahul Sharma" className="input-field" />
        </div>
        <div>
          <label className="label">Mobile Number</label>
          <input name="phone" value={form.phone} onChange={handle} required autoComplete="tel" inputMode="numeric"
            placeholder="9876543210" className="input-field" maxLength={10} />
        </div>
        <div>
          <label className="label">Email <span className="text-dark-500 normal-case font-body">(optional)</span></label>
          <input name="email" type="email" value={form.email} onChange={handle} autoComplete="email"
            placeholder="you@example.com" className="input-field" />
        </div>
        <div>
          <label className="label">Password</label>
          <div className="relative">
            <input name="password" type={showPass ? 'text' : 'password'} value={form.password} onChange={handle} required autoComplete="new-password"
              placeholder="Minimum 6 characters" className="input-field pr-10" minLength={6} />
            <button type="button" onClick={() => setShowPass(p => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <ErrorMessage message={error} />
        <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
          {loading ? <Spinner size="sm" /> : <>Create Account <ArrowRight size={16} /></>}
        </button>
      </form>
    </AuthLayout>
  )
}

function AuthLayout({ title, subtitle, alternate, children }) {
  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient bg */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-brand-700/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-up">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-brand-500 to-brand-700 rounded-2xl flex items-center justify-center shadow-glow-orange mb-4">
            <Truck size={28} className="text-white" />
          </div>
          <h1 className="font-display font-bold text-3xl text-dark-50">{title}</h1>
          <p className="text-dark-400 text-sm mt-1 font-body">{subtitle}</p>
        </div>

        <div className="card p-7">{children}</div>

        <p className="text-center text-sm text-dark-400 mt-5 font-body">{alternate}</p>
      </div>
    </div>
  )
}
