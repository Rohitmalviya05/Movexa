import React, { useEffect, useState } from 'react'
import { TrendingUp, Calendar, DollarSign, Package } from 'lucide-react'
import { driverAPI } from '../../services/api'
import { formatCurrency } from '../../utils/helpers'
import { Spinner } from '../common'

export default function DriverEarnings() {
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState('30d')

  const ranges = [
    { label: '7 Days',  value: '7d',  days: 7  },
    { label: '30 Days', value: '30d', days: 30 },
    { label: '90 Days', value: '90d', days: 90 },
  ]

  useEffect(() => { load() }, [range])

  const load = async () => {
    setLoading(true)
    const days = ranges.find(r => r.value === range)?.days || 30
    const from = new Date(Date.now() - days * 86400 * 1000).toISOString()
    const to   = new Date().toISOString()
    try {
      const { data } = await driverAPI.earnings({ from, to })
      setEarnings(data.data.earnings)
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-dark-50">Earnings</h1>
          <p className="text-dark-400 text-sm mt-0.5">Your income overview</p>
        </div>
        <div className="flex gap-2">
          {ranges.map(r => (
            <button key={r.value} onClick={() => setRange(r.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all
                ${range === r.value ? 'bg-brand-500 border-brand-500 text-white' : 'bg-dark-800 border-dark-600 text-dark-400'}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-up">
            {[
              { label: 'Total Earned',  value: formatCurrency(earnings?.total_earnings || 0), icon: TrendingUp,  color: 'text-green-400',  bg: 'bg-green-500/10'  },
              { label: 'Total Trips',   value: earnings?.total_trips || 0,                     icon: Package,     color: 'text-blue-400',   bg: 'bg-blue-500/10'   },
              { label: 'Avg per Trip',  value: formatCurrency(earnings?.avg_fare || 0),        icon: DollarSign,  color: 'text-brand-400',  bg: 'bg-brand-500/10'  },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ animationDelay: `${i*0.08}s` }}>
                <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <s.icon size={18} className={s.color} />
                </div>
                <div className={`font-display font-bold text-2xl ${s.color}`}>{s.value}</div>
                <div className="text-xs font-mono text-dark-400">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Placeholder chart area */}
          <div className="card p-6 animate-fade-up">
            <div className="flex items-center gap-2 mb-4">
              <Calendar size={16} className="text-dark-400" />
              <span className="font-mono text-xs text-dark-400 uppercase tracking-widest">Daily Earnings</span>
            </div>
            <div className="h-32 flex items-end gap-1.5">
              {Array.from({ length: 14 }, (_, i) => {
                const h = Math.random() * 80 + 10
                return (
                  <div key={i} className="flex-1 bg-brand-500/20 hover:bg-brand-500/40 rounded-t transition-colors relative group"
                    style={{ height: `${h}%` }}>
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-dark-700 text-xs font-mono text-dark-200 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity">
                      ₹{Math.round(h * 8)}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs font-mono text-dark-600">
              <span>14 days ago</span><span>Today</span>
            </div>
          </div>

          {(earnings?.total_trips || 0) === 0 && (
            <div className="card p-8 text-center animate-fade-up">
              <div className="text-4xl mb-3">🛣️</div>
              <p className="font-display font-semibold text-dark-300">No trips in this period</p>
              <p className="text-sm text-dark-500 mt-1">Go online to start earning</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
