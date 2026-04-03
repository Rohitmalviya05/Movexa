import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronRight, Phone, MapPin, Package, CheckCircle2, Truck, Navigation2 } from 'lucide-react'
import { bookingAPI } from '../../services/api'
import { formatCurrency, formatDateTime, vehicleIcons, loadTypeLabels, getErrorMessage } from '../../utils/helpers'
import { StatusBadge, Spinner, ErrorMessage, Modal } from '../common'
import toast from 'react-hot-toast'

const STATUS_FLOW = [
  { from: 'driver_assigned', to: 'picked_up',  label: 'Confirm Pickup',   icon: <Package size={16} />,   color: 'btn-primary' },
  { from: 'picked_up',       to: 'in_transit', label: 'Start Transit',    icon: <Truck size={16} />,     color: 'btn-primary' },
  { from: 'in_transit',      to: 'delivered',  label: 'Mark Delivered',   icon: <Navigation2 size={16} />, color: 'btn-primary' },
  { from: 'delivered',       to: 'completed',  label: 'Complete Booking', icon: <CheckCircle2 size={16} />, color: 'btn-primary' },
]

export function DriverBookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [confirmModal, setConfirmModal] = useState(null)

  useEffect(() => { load() }, [id])

  const load = async () => {
    try {
      const { data } = await bookingAPI.getById(id)
      setBooking(data.data.booking)
    } catch { navigate('/driver/bookings') }
    finally { setLoading(false) }
  }

  const updateStatus = async (newStatus) => {
    setUpdating(true); setError('')
    try {
      await bookingAPI.updateStatus(id, newStatus)
      toast.success(`Status updated to ${newStatus.replace('_',' ')} ✅`)
      setConfirmModal(null)
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally { setUpdating(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!booking) return null

  const nextAction = STATUS_FLOW.find(s => s.from === booking.status)

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-5 animate-fade-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/driver/bookings')} className="btn-ghost p-2">
          <ChevronRight size={20} className="rotate-180" />
        </button>
        <div>
          <h1 className="font-display font-bold text-xl text-dark-50">Booking #{booking.id}</h1>
          <div className="mt-0.5"><StatusBadge status={booking.status} /></div>
        </div>
        <div className="ml-auto font-display font-bold text-2xl text-green-400">
          {formatCurrency(booking.total_fare)}
        </div>
      </div>

      {/* Route card */}
      <div className="card p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{vehicleIcons[booking.vehicle_type]}</span>
          <div>
            <div className="font-display font-semibold text-dark-100 capitalize">{booking.vehicle_type?.replace('_',' ')}</div>
            <div className="text-xs font-mono text-dark-400">{booking.distance_km}km • {loadTypeLabels[booking.load_type]} • {booking.load_weight_kg}kg</div>
          </div>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 mt-1 shrink-0" />
            <div>
              <div className="text-xs font-mono text-green-400 mb-0.5">PICKUP</div>
              <div className="text-dark-100">{booking.pickup_address}</div>
              <div className="text-xs font-mono text-dark-500 mt-0.5">
                {booking.pickup_lat?.toFixed(4)}, {booking.pickup_lng?.toFixed(4)}
              </div>
            </div>
            <a href={`https://maps.google.com/?q=${booking.pickup_lat},${booking.pickup_lng}`}
               target="_blank" rel="noopener noreferrer"
               className="ml-auto text-green-400 hover:text-green-300 shrink-0">
              <Navigation2 size={16} />
            </a>
          </div>
          <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400 mt-1 shrink-0" />
            <div>
              <div className="text-xs font-mono text-red-400 mb-0.5">DROP</div>
              <div className="text-dark-100">{booking.drop_address}</div>
              <div className="text-xs font-mono text-dark-500 mt-0.5">
                {booking.drop_lat?.toFixed(4)}, {booking.drop_lng?.toFixed(4)}
              </div>
            </div>
            <a href={`https://maps.google.com/?q=${booking.drop_lat},${booking.drop_lng}`}
               target="_blank" rel="noopener noreferrer"
               className="ml-auto text-red-400 hover:text-red-300 shrink-0">
              <Navigation2 size={16} />
            </a>
          </div>
        </div>
        {booking.notes && (
          <div className="mt-3 p-3 bg-dark-700 rounded-xl">
            <div className="text-xs font-mono text-dark-400 mb-1">CUSTOMER NOTES</div>
            <p className="text-sm text-dark-200 italic">"{booking.notes}"</p>
          </div>
        )}
      </div>

      {/* Customer info */}
      <div className="card p-5">
        <div className="text-xs font-mono text-dark-400 uppercase tracking-widest mb-3">Customer</div>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center font-display font-bold text-white">
            {booking.customer_name?.[0]}
          </div>
          <div className="flex-1">
            <div className="font-display font-semibold text-dark-100">{booking.customer_name}</div>
            <div className="text-xs font-mono text-dark-400">{booking.customer_phone}</div>
          </div>
          <a href={`tel:${booking.customer_phone}`} className="btn-secondary px-3 py-2 text-sm">
            <Phone size={15} /> Call
          </a>
        </div>
      </div>

      {/* Fare breakdown */}
      <div className="card p-5">
        <div className="text-xs font-mono text-dark-400 uppercase tracking-widest mb-3">Fare Breakdown</div>
        <div className="space-y-2 text-sm font-body">
          <div className="flex justify-between">
            <span className="text-dark-400">Base Fare</span>
            <span className="text-dark-200">{formatCurrency(booking.base_fare)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-dark-400">Distance ({booking.distance_km}km)</span>
            <span className="text-dark-200">{formatCurrency(booking.distance_fare)}</span>
          </div>
          {parseFloat(booking.surge_multiplier) > 1 && (
            <div className="flex justify-between">
              <span className="text-dark-400">Surge ({booking.surge_multiplier}x)</span>
              <span className="text-yellow-400">+{formatCurrency(booking.total_fare - booking.base_fare - booking.distance_fare)}</span>
            </div>
          )}
          <div className="divider" />
          <div className="flex justify-between font-display font-bold">
            <span className="text-dark-100">Total</span>
            <span className="text-green-400">{formatCurrency(booking.total_fare)}</span>
          </div>
          <div className="flex justify-between text-xs font-mono">
            <span className="text-dark-500">Payment Method</span>
            <span className={`capitalize ${booking.payment_method === 'cash' ? 'text-yellow-400' : 'text-blue-400'}`}>
              {booking.payment_method === 'cash' ? '💵 Cash on delivery' : '📱 UPI'}
            </span>
          </div>
        </div>
      </div>

      <ErrorMessage message={error} />

      {/* Action button */}
      {nextAction && (
        <button onClick={() => setConfirmModal(nextAction)} className={`${nextAction.color} w-full text-lg py-4`}>
          {nextAction.icon} {nextAction.label}
        </button>
      )}

      {booking.status === 'completed' && (
        <div className="card p-5 text-center border-green-500/30">
          <div className="text-4xl mb-2">🎉</div>
          <div className="font-display font-bold text-green-400 text-lg">Booking Completed!</div>
          <div className="text-sm text-dark-400 mt-1">You earned {formatCurrency(booking.total_fare)}</div>
          {booking.customer_rating && (
            <div className="mt-3 text-yellow-400 font-mono">Customer rated you {booking.customer_rating}/5 ⭐</div>
          )}
        </div>
      )}

      {/* Confirm modal */}
      <Modal isOpen={!!confirmModal} onClose={() => setConfirmModal(null)} title="Confirm Action">
        {confirmModal && (
          <div className="space-y-4">
            <p className="text-dark-300">
              Are you sure you want to <strong className="text-dark-100">{confirmModal.label}</strong>?
            </p>
            {confirmModal.to === 'completed' && booking.payment_method === 'cash' && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                <p className="text-yellow-400 text-sm">💵 Make sure you've collected <strong>{formatCurrency(booking.total_fare)}</strong> cash from the customer before completing.</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmModal(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={() => updateStatus(confirmModal.to)} disabled={updating} className="btn-primary flex-1">
                {updating ? <Spinner size="sm" /> : 'Confirm'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export function DriverBookingsList() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  useEffect(() => { load() }, [filter])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await bookingAPI.driverBookings({ limit: 20, status: filter || undefined })
      setBookings(data.data?.bookings || [])
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="font-display font-bold text-2xl text-dark-50">My Rides</h1>
        <p className="text-dark-400 text-sm mt-1">All your delivery history</p>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {['', 'driver_assigned', 'in_transit', 'completed', 'cancelled'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap border transition-all
              ${filter === s ? 'bg-brand-500 border-brand-500 text-white' : 'bg-dark-800 border-dark-600 text-dark-400 hover:border-dark-500'}`}>
            {s === '' ? 'All' : s.replace('_',' ')}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-dark-400">No rides found</div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} onClick={() => navigate(`/driver/bookings/${b.id}`)}
              className="card-hover p-4 cursor-pointer flex items-center gap-4">
              <span className="text-3xl">{vehicleIcons[b.vehicle_type]}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge status={b.status} />
                  <span className="text-xs font-mono text-dark-500">#{b.id}</span>
                </div>
                <div className="text-sm text-dark-300 truncate">{b.pickup_address}</div>
                <div className="text-xs text-dark-500 truncate">→ {b.drop_address}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-green-400">{formatCurrency(b.total_fare)}</div>
                <div className="text-xs font-mono text-dark-500">{b.distance_km}km</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
