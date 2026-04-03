import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, TrendingUp, Clock, CheckCircle2, Plus, ArrowRight, Zap } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { bookingAPI, paymentAPI } from '../../services/api'
import { formatCurrency, formatDate, vehicleIcons, statusColors, statusLabels } from '../../utils/helpers'
import { StatusBadge, Spinner, EmptyState } from '../common'
import { getSocket } from '../../services/socket'
import toast from 'react-hot-toast'

export default function CustomerDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, totalSpent: 0 })

  useEffect(() => {
    loadData()
    const socket = getSocket()
    if (socket) {
      socket.on('booking_accepted', ({ bookingId }) => {
        toast.success('🎉 Driver found for your booking!', { duration: 4000 })
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'driver_assigned' } : b))
      })
      socket.on('booking_status_updated', ({ bookingId, status }) => {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
        if (status === 'delivered') toast.success('📦 Your goods have been delivered!')
        if (status === 'completed') toast.success('✅ Booking completed!')
      })
    }
    return () => {
      socket?.off('booking_accepted')
      socket?.off('booking_status_updated')
    }
  }, [])

  const loadData = async () => {
    try {
      const [bRes, pRes] = await Promise.allSettled([
        bookingAPI.myBookings({ limit: 5 }),
        paymentAPI.history({ limit: 100 }),
      ])
      const bData = bRes.status === 'fulfilled' ? bRes.value.data.data : { bookings: [], pagination: {} }
      const pData = pRes.status === 'fulfilled' ? pRes.value.data.data : { payments: [] }
      const allBookings = Array.isArray(bData.bookings) ? bData.bookings : []
      const allPayments = Array.isArray(pData.payments) ? pData.payments : []
      setBookings(allBookings)
      setStats({
        total: bData.pagination?.total || allBookings.length,
        completed: allBookings.filter(b => b.status === 'completed').length,
        pending: allBookings.filter(b => ['pending','driver_assigned','picked_up','in_transit'].includes(b.status)).length,
        totalSpent: allPayments.filter(p => p.status === 'success').reduce((s, p) => s + parseFloat(p.amount || 0), 0),
      })
    } catch {}
    finally { setLoading(false) }
  }

  const statCards = [
    { label: 'Total Bookings', value: stats.total,                  icon: Package,      color: 'text-blue-400',   bg: 'bg-blue-500/10' },
    { label: 'Completed',      value: stats.completed,              icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/10' },
    { label: 'Active',         value: stats.pending,                icon: Clock,        color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
    { label: 'Total Spent',    value: formatCurrency(stats.totalSpent), icon: TrendingUp, color: 'text-brand-400', bg: 'bg-brand-500/10' },
  ]

  return (
    <div className="p-5 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-display font-bold text-2xl md:text-3xl text-dark-50">
            Hey, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-dark-400 text-sm mt-1">Here's what's happening with your shipments</p>
        </div>
        <button onClick={() => navigate('/book')} className="btn-primary hidden sm:flex">
          <Plus size={18} /> Book Vehicle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card animate-fade-up" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`w-9 h-9 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className={`font-display font-bold text-xl ${s.color}`}>{loading ? '—' : s.value}</div>
            <div className="text-xs font-mono text-dark-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick book CTA */}
      <div className="relative card p-6 overflow-hidden animate-fade-up cursor-pointer group"
           onClick={() => navigate('/book')}>
        <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent pointer-events-none" />
        <div className="absolute right-6 top-1/2 -translate-y-1/2 text-7xl opacity-10 group-hover:opacity-20 transition-opacity">🚛</div>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Zap size={16} className="text-brand-400" />
              <span className="font-mono text-xs text-brand-400 uppercase tracking-widest">Quick Book</span>
            </div>
            <h3 className="font-display font-bold text-xl text-dark-50">Need to send goods?</h3>
            <p className="text-dark-400 text-sm mt-1">Bikes, Autos, Pickups & Mini Trucks available now</p>
          </div>
          <ArrowRight size={22} className="text-brand-400 shrink-0 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>

      {/* Recent bookings */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Bookings</h2>
          <button onClick={() => navigate('/bookings')} className="btn-ghost text-sm text-brand-400">
            View all <ArrowRight size={14} />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : bookings.length === 0 ? (
          <EmptyState
            icon="📦"
            title="No bookings yet"
            description="Book your first vehicle to transport goods anywhere in the city"
            action={<button onClick={() => navigate('/book')} className="btn-primary">Book Now</button>}
          />
        ) : (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)}
                className="card-hover p-4 cursor-pointer flex items-center gap-4">
                <div className="text-3xl">{vehicleIcons[b.vehicle_type] || '🚗'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={b.status} />
                    <span className="text-xs font-mono text-dark-500">#{b.id}</span>
                  </div>
                  <div className="text-sm text-dark-200 truncate font-body">{b.pickup_address}</div>
                  <div className="text-xs text-dark-500 mt-0.5">→ {b.drop_address}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-dark-100">{formatCurrency(b.total_fare)}</div>
                  <div className="text-xs font-mono text-dark-500 mt-0.5">{formatDate(b.created_at)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile book FAB */}
      <button onClick={() => navigate('/book')}
        className="fixed bottom-6 right-6 sm:hidden btn-primary rounded-full w-14 h-14 p-0 shadow-glow-orange z-30">
        <Plus size={24} />
      </button>
    </div>
  )
}
