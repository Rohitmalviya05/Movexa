import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import { driverAPI } from '../../services/api'
import { vehicleIcons, getErrorMessage } from '../../utils/helpers'
import { ErrorMessage, Spinner } from '../common'
import toast from 'react-hot-toast'

const VEHICLE_TYPES = [
  { value: 'bike',       label: 'Bike',       desc: 'Up to 20kg parcels',     capacity: '20 kg' },
  { value: 'auto',       label: 'Auto',       desc: 'Small to medium loads',  capacity: '100 kg' },
  { value: 'pickup',     label: 'Pickup',     desc: 'Furniture & appliances', capacity: '750 kg' },
  { value: 'mini_truck', label: 'Mini Truck', desc: 'Bulk commercial goods',  capacity: '2000 kg' },
]

export default function DriverSetup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    vehicleType: '', vehicleNumber: '', vehicleModel: '', licenseNumber: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await driverAPI.createProfile(form)
      setDone(true)
      toast.success('Profile submitted for review!')
    } catch (err) {
      setError(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  if (done) {
    return (
      <div className="p-8 max-w-md mx-auto flex flex-col items-center text-center gap-6 mt-10">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
          <CheckCircle2 size={40} className="text-green-400" />
        </div>
        <div>
          <h2 className="font-display font-bold text-2xl text-dark-50">Profile Submitted!</h2>
          <p className="text-dark-400 mt-2 text-sm">Your driver profile is under review. We'll notify you once approved (usually 24–48 hours).</p>
        </div>
        <button onClick={() => navigate('/dashboard')} className="btn-primary w-full">Go to Dashboard</button>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8 max-w-lg mx-auto space-y-8 animate-fade-up">
      <div>
        <h1 className="font-display font-bold text-2xl text-dark-50">Setup Driver Profile</h1>
        <p className="text-dark-400 text-sm mt-1">Complete your profile to start earning</p>
      </div>

      <form onSubmit={submit} className="space-y-6">
        {/* Vehicle type */}
        <div>
          <label className="label">Vehicle Type</label>
          <div className="grid grid-cols-2 gap-3">
            {VEHICLE_TYPES.map(v => (
              <button key={v.value} type="button" onClick={() => set('vehicleType', v.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all
                  ${form.vehicleType === v.value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-dark-600 bg-dark-700 hover:border-dark-500'}`}>
                <div className="text-3xl mb-2">{vehicleIcons[v.value]}</div>
                <div className="font-display font-bold text-sm text-dark-100">{v.label}</div>
                <div className="text-xs text-dark-400 mt-0.5">{v.desc}</div>
                <div className="text-xs font-mono text-dark-500 mt-1">Max {v.capacity}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 space-y-4">
          <div>
            <label className="label">Vehicle Number</label>
            <input value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value.toUpperCase())}
              placeholder="MH12AB1234" required className="input-field font-mono tracking-wider" maxLength={12} />
          </div>
          <div>
            <label className="label">Vehicle Model</label>
            <input value={form.vehicleModel} onChange={e => set('vehicleModel', e.target.value)}
              placeholder="e.g. Honda Activa 6G" required className="input-field" />
          </div>
          <div>
            <label className="label">Driving License Number</label>
            <input value={form.licenseNumber} onChange={e => set('licenseNumber', e.target.value.toUpperCase())}
              placeholder="MH1220230001" required className="input-field font-mono tracking-wider" />
          </div>
        </div>

        <ErrorMessage message={error} />

        <button type="submit" disabled={loading || !form.vehicleType} className="btn-primary w-full text-base py-4">
          {loading ? <Spinner size="sm" /> : <>Submit for Review <ChevronRight size={18} /></>}
        </button>
      </form>
    </div>
  )
}
