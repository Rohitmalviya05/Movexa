import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ToggleLeft, ToggleRight, MapPin, Package, TrendingUp, Star, ChevronRight, Bell, Navigation } from 'lucide-react'
import { driverAPI, bookingAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, vehicleIcons, getErrorMessage } from '../../utils/helpers'
import { StatusBadge, Spinner, EmptyState, ErrorMessage } from '../common'
import { getSocket, emitDriverOnline, emitDriverOffline, emitLocation } from '../../services/socket'
import toast from 'react-hot-toast'

export default function DriverDashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [togglingAvail, setTogglingAvail] = useState(false)
  const [incomingRequest, setIncomingRequest] = useState(null)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    loadData()
    const socket = getSocket()
    if (socket) {
      socket.on('new_booking_request', (req) => {
        setIncomingRequest(req)
        toast('📦 New booking request!', { icon: '🔔', duration: 30000 })
      })
    }
    return () => getSocket()?.off('new_booking_request')
  }, [])

  // Auto-send GPS location every 10s when available
  useEffect(() => {
    if (!profile?.is_available) return
    const interval = setInterval(() => {
      navigator.geolocation?.getCurrentPosition(
        ({ coords }) => {
          emitLocation(coords.latitude, coords.longitude)
          driverAPI.updateLocation(coords.latitude, coords.longitude).catch(() => {})
        },
        () => {}
      )
    }, 10000)
    return () => clearInterval(interval)
  }, [profile?.is_available])

  const loadData = async () => {
    try {
      const [profRes, bookRes] = await Promise.allSettled([
        driverAPI.getProfile(),
        bookingAPI.driverBookings({ limit: 5 }),
      ])
      if (profRes.status === 'fulfilled') setProfile(profRes.value.data.data.profile)
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value.data.data?.bookings || [])
    } catch {}
    finally { setLoading(false) }
  }

  const toggleAvailability = async () => {
    if (!profile) return
    setTogglingAvail(true)
    const newVal = !profile.is_available
    try {
      await driverAPI.setAvailability(newVal)
      setProfile(p => ({ ...p, is_available: newVal }))
      if (newVal) { emitDriverOnline(); toast.success('You are now online 🟢') }
      else         { emitDriverOffline(); toast.success('You are now offline ⚫') }
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setTogglingAvail(false) }
  }

  const acceptBooking = async (bookingId) => {
    setAccepting(true)
    try {
      await bookingAPI.accept(bookingId)
      toast.success('Booking accepted! 🎉')
      setIncomingRequest(null)
      loadData()
      navigate(`/driver/bookings/${bookingId}`)
    } catch (err) {
      toast.error(getErrorMessage(err))
      setIncomingRequest(null)
    } finally { setAccepting(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  if (!profile) {
    return (
      <div className="p-5 md:p-8 max-w-xl mx-auto">
        <EmptyState
          icon="🚗"
          title="Complete your profile"
          description="Set up your driver profile to start accepting bookings"
          action={<button onClick={() => navigate('/driver/setup')} className="btn-primary">Setup Profile</button>}
        />
      </div>
    )
  }

  if (!profile.is_approved) {
    return (
      <div className="p-5 md:p-8 max-w-xl mx-auto">
        <div className="card p-8 text-center">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="font-display font-bold text-xl text-dark-100 mb-2">Approval Pending</h2>
          <p className="text-dark-400 text-sm">Your driver profile is under review. You'll be notified once approved.</p>
          <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
            <p className="text-yellow-400 text-xs font-mono">Usually takes 24–48 hours</p>
          </div>
        </div>
      </div>
    )
  }

  const activeBooking = bookings.find(b => ['driver_assigned','picked_up','in_transit'].includes(b.status))

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Incoming request banner */}
      {incomingRequest && (
        <div className="card border-brand-500/50 p-5 animate-fade-up bg-gradient-to-r from-brand-500/10 to-transparent">
          <div className="flex items-center gap-2 mb-3">
            <Bell size={18} className="text-brand-400 animate-pulse" />
            <span className="font-mono text-xs text-brand-400 uppercase tracking-widest">New Booking Request</span>
          </div>
          <div className="flex items-start gap-4">
            <span className="text-3xl">{vehicleIcons[incomingRequest.vehicleType]}</span>
            <div className="flex-1">
              <div className="text-sm text-dark-200 font-body">
                <div className="flex items-center gap-1.5 mb-1"><div className="w-2 h-2 bg-green-500 rounded-full" />{incomingRequest.pickupAddress}</div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 bg-red-500 rounded-full" />{incomingRequest.dropAddress}</div>
              </div>
              <div className="flex gap-4 mt-2 text-xs font-mono text-dark-400">
                <span>{incomingRequest.distanceKm}km</span>
                <span className="text-brand-400 font-bold">{formatCurrency(incomingRequest.totalFare)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => setIncomingRequest(null)} className="btn-secondary flex-1">Decline</button>
            <button onClick={() => acceptBooking(incomingRequest.bookingId)} disabled={accepting} className="btn-primary flex-1">
              {accepting ? <Spinner size="sm" /> : 'Accept Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Header + toggle */}
      <div className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="font-display font-bold text-2xl text-dark-50">Hey, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="text-dark-400 text-sm mt-0.5">
            {vehicleIcons[profile.vehicle_type]} {profile.vehicle_model} · {profile.vehicle_number}
          </p>
        </div>
        <button onClick={toggleAvailability} disabled={togglingAvail}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-display font-semibold text-sm transition-all
            ${profile.is_available
              ? 'border-green-500 bg-green-500/15 text-green-400 hover:bg-green-500/20'
              : 'border-dark-600 bg-dark-700 text-dark-400 hover:border-dark-500'}`}>
          {togglingAvail ? <Spinner size="sm" /> : profile.is_available
            ? <><ToggleRight size={20} /> Online</>
            : <><ToggleLeft size={20} /> Offline</>}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 animate-fade-up">
        {[
          { label: 'Rating',  value: `${parseFloat(profile.rating || 5).toFixed(1)} ⭐`, color: 'text-yellow-400' },
          { label: 'Trips',   value: profile.total_trips,                                 color: 'text-blue-400'   },
          { label: 'Status',  value: profile.is_available ? 'Online' : 'Offline',         color: profile.is_available ? 'text-green-400' : 'text-dark-400' },
        ].map((s, i) => (
          <div key={i} className="stat-card text-center">
            <div className={`font-display font-bold text-xl ${s.color}`}>{s.value}</div>
            <div className="text-xs font-mono text-dark-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active booking */}
      {activeBooking && (
        <div className="card p-5 border-blue-500/30 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-blue-400 uppercase tracking-widest">Active Booking</span>
            <StatusBadge status={activeBooking.status} />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-2xl">{vehicleIcons[activeBooking.vehicle_type]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-dark-200 truncate">{activeBooking.pickup_address}</div>
              <div className="text-xs text-dark-400 truncate">→ {activeBooking.drop_address}</div>
            </div>
            <button onClick={() => navigate(`/driver/bookings/${activeBooking.id}`)} className="btn-primary px-3 py-2 text-sm">
              View <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Recent rides */}
      <div className="animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-title">Recent Rides</h2>
          <button onClick={() => navigate('/driver/bookings')} className="btn-ghost text-sm text-brand-400">
            All rides <ChevronRight size={14} />
          </button>
        </div>
        {bookings.length === 0 ? (
          <EmptyState icon="🛣️" title="No rides yet" description={profile.is_available ? "You'll receive booking requests soon" : "Go online to receive bookings"} />
        ) : (
          <div className="space-y-3">
            {bookings.slice(0,4).map(b => (
              <div key={b.id} onClick={() => navigate(`/driver/bookings/${b.id}`)}
                className="card-hover p-4 cursor-pointer flex items-center gap-3">
                <span className="text-2xl">{vehicleIcons[b.vehicle_type]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <StatusBadge status={b.status} />
                    <span className="text-xs font-mono text-dark-500">#{b.id}</span>
                  </div>
                  <div className="text-xs text-dark-400 truncate">{b.pickup_address} → {b.drop_address}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-green-400">{formatCurrency(b.total_fare)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
