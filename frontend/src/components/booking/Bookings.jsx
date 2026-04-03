import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ChevronRight, MapPin, Phone, Star, X, Navigation } from 'lucide-react'
import { bookingAPI } from '../../services/api'
import { formatCurrency, formatDateTime, vehicleIcons, loadTypeLabels, getErrorMessage } from '../../utils/helpers'
import { StatusBadge, Spinner, EmptyState, StarRating, Modal, ErrorMessage } from '../common'
import { getSocket, trackDriver } from '../../services/socket'
import toast from 'react-hot-toast'

export function BookingsList() {
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({})
  const [filter, setFilter] = useState('')

  useEffect(() => { load() }, [page, filter])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await bookingAPI.myBookings({ page, limit: 10, status: filter || undefined })
      setBookings(data.data?.bookings || [])
      setPagination(data.pagination || {})
    } catch {}
    finally { setLoading(false) }
  }

  const statusFilters = ['', 'pending', 'driver_assigned', 'in_transit', 'completed', 'cancelled']

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display font-bold text-2xl text-dark-50">My Bookings</h1>
        <p className="text-dark-400 text-sm mt-1">Track all your shipments</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1 animate-fade-up">
        {statusFilters.map(s => (
          <button key={s} onClick={() => { setFilter(s); setPage(1) }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono whitespace-nowrap transition-all border
              ${filter === s
                ? 'bg-brand-500 border-brand-500 text-white'
                : 'bg-dark-800 border-dark-600 text-dark-400 hover:border-dark-500'}`}>
            {s === '' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : bookings.length === 0 ? (
        <EmptyState icon="📭" title="No bookings found" description={filter ? `No ${filter} bookings` : 'Your bookings will appear here'} />
      ) : (
        <div className="space-y-3 animate-fade-up">
          {bookings.map(b => (
            <div key={b.id} onClick={() => navigate(`/bookings/${b.id}`)}
              className="card-hover p-4 cursor-pointer group">
              <div className="flex items-start gap-4">
                <div className="text-3xl mt-0.5">{vehicleIcons[b.vehicle_type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <StatusBadge status={b.status} />
                    <span className="text-xs font-mono text-dark-500">#{b.id}</span>
                    <span className="text-xs font-mono text-dark-500 ml-auto">{formatDateTime(b.created_at)}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                        <span className="text-dark-200 truncate">{b.pickup_address}</span>
                      </div>
                      <div className="w-px h-3 bg-dark-600 ml-[3px]" />
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-dark-400 truncate">{b.drop_address}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-bold text-dark-100">{formatCurrency(b.total_fare)}</div>
                  <div className="text-xs font-mono text-dark-500">{b.distance_km}km</div>
                  <ChevronRight size={16} className="text-dark-600 group-hover:text-dark-400 mt-1 ml-auto transition-colors" />
                </div>
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary px-4 py-2 text-sm">Prev</button>
              <span className="flex items-center text-sm font-mono text-dark-400">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page === pagination.totalPages} className="btn-secondary px-4 py-2 text-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function BookingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelModal, setCancelModal] = useState(false)
  const [rateModal, setRateModal] = useState(false)
  const [rating, setRating] = useState(5)
  const [review, setReview] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
    const socket = getSocket()
    if (socket) {
      socket.on('booking_status_updated', ({ bookingId, status }) => {
        if (bookingId === parseInt(id)) setBooking(prev => prev ? { ...prev, status } : prev)
      })
    }
    return () => getSocket()?.off('booking_status_updated')
  }, [id])

  useEffect(() => {
    if (booking?.status === 'driver_assigned' && booking?.driver_id) {
      trackDriver(booking.id)
    }
  }, [booking?.status])

  const load = async () => {
    try {
      const { data } = await bookingAPI.getById(id)
      setBooking(data.data.booking)
    } catch { navigate('/bookings') }
    finally { setLoading(false) }
  }

  const cancelBooking = async () => {
    setActionLoading(true); setError('')
    try {
      await bookingAPI.cancel(id, { reason: cancelReason })
      toast.success('Booking cancelled')
      setCancelModal(false)
      load()
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setActionLoading(false) }
  }

  const submitRating = async () => {
    setActionLoading(true); setError('')
    try {
      await bookingAPI.rate(id, { rating, review })
      toast.success('Rating submitted! Thanks for your feedback 🌟')
      setRateModal(false)
      load()
    } catch (err) { setError(getErrorMessage(err)) }
    finally { setActionLoading(false) }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>
  if (!booking) return null

  const canCancel = ['pending','driver_assigned'].includes(booking.status)
  const canRate = booking.status === 'completed' && !booking.customer_rating

  const statusSteps = [
    { key: 'pending',         label: 'Booked',       icon: '📋' },
    { key: 'driver_assigned', label: 'Driver Found',  icon: '🙋' },
    { key: 'picked_up',       label: 'Picked Up',     icon: '📦' },
    { key: 'in_transit',      label: 'In Transit',    icon: '🚗' },
    { key: 'delivered',       label: 'Delivered',     icon: '🏠' },
    { key: 'completed',       label: 'Completed',     icon: '✅' },
  ]
  const stepOrder = statusSteps.map(s => s.key)
  const currentStepIdx = stepOrder.indexOf(booking.status)

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto space-y-6 animate-fade-up">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/bookings')} className="btn-ghost p-2"><ChevronRight size={20} className="rotate-180" /></button>
        <div>
          <h1 className="font-display font-bold text-xl text-dark-50">Booking #{booking.id}</h1>
          <div className="mt-0.5"><StatusBadge status={booking.status} /></div>
        </div>
      </div>

      {/* Live status tracker */}
      {booking.status !== 'cancelled' && (
        <div className="card p-5">
          <h3 className="font-display font-semibold text-dark-200 mb-4 text-sm">Booking Progress</h3>
          <div className="flex items-center gap-0 overflow-x-auto">
            {statusSteps.map((s, i) => (
              <React.Fragment key={s.key}>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all
                    ${i <= currentStepIdx ? 'bg-brand-500 shadow-glow-sm' : 'bg-dark-700 border-2 border-dark-600'}`}>
                    {i < currentStepIdx ? '✓' : s.icon}
                  </div>
                  <span className={`text-xs font-mono whitespace-nowrap ${i === currentStepIdx ? 'text-brand-400' : 'text-dark-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < statusSteps.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 mb-4 min-w-[12px] ${i < currentStepIdx ? 'bg-brand-500' : 'bg-dark-700'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Vehicle & route */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{vehicleIcons[booking.vehicle_type]}</span>
          <div>
            <div className="font-display font-bold text-dark-100 capitalize">{booking.vehicle_type.replace('_',' ')}</div>
            <div className="text-xs font-mono text-dark-400">{booking.distance_km}km • {loadTypeLabels[booking.load_type]} • {booking.load_weight_kg}kg</div>
          </div>
          <div className="ml-auto text-right">
            <div className="font-display font-bold text-xl text-brand-400">{formatCurrency(booking.total_fare)}</div>
            <div className="text-xs font-mono text-dark-500 capitalize">{booking.payment_method}</div>
          </div>
        </div>
        <div className="divider" />
        <div className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1 shrink-0" />
            <div><div className="text-xs font-mono text-dark-500 mb-0.5">PICKUP</div><div className="text-dark-200">{booking.pickup_address}</div></div>
          </div>
          <div className="ml-1 w-px h-4 bg-dark-600" />
          <div className="flex items-start gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
            <div><div className="text-xs font-mono text-dark-500 mb-0.5">DROP</div><div className="text-dark-200">{booking.drop_address}</div></div>
          </div>
        </div>
      </div>

      {/* Driver info */}
      {booking.driver_name && (
        <div className="card p-5">
          <div className="text-xs font-mono text-dark-400 uppercase tracking-widest mb-3">Your Driver</div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-brand-600 to-brand-800 rounded-xl flex items-center justify-center font-display font-bold text-white text-lg">
              {booking.driver_name?.[0]}
            </div>
            <div className="flex-1">
              <div className="font-display font-bold text-dark-100">{booking.driver_name}</div>
              <div className="text-xs font-mono text-dark-400">{booking.vehicle_number} • ⭐ {parseFloat(booking.driver_rating || 5).toFixed(1)}</div>
            </div>
            <a href={`tel:${booking.driver_phone}`} className="btn-secondary px-3 py-2">
              <Phone size={16} /> Call
            </a>
          </div>
        </div>
      )}

      {/* Timing info */}
      <div className="card p-5">
        <div className="text-xs font-mono text-dark-400 uppercase tracking-widest mb-3">Timeline</div>
        <div className="space-y-2 text-sm font-body">
          {[
            ['Booked', booking.created_at],
            ['Accepted', booking.accepted_at],
            ['Picked Up', booking.picked_up_at],
            ['Delivered', booking.delivered_at],
            ['Completed', booking.completed_at],
            ['Cancelled', booking.cancelled_at],
          ].filter(([,v]) => v).map(([label, time]) => (
            <div key={label} className="flex justify-between">
              <span className="text-dark-400">{label}</span>
              <span className="text-dark-200 font-mono text-xs">{formatDateTime(time)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Customer rating */}
      {booking.customer_rating && (
        <div className="card p-4 flex items-center gap-3">
          <div className="text-2xl">⭐</div>
          <div>
            <div className="text-sm font-mono text-dark-400">Your rating</div>
            <div className="font-display font-bold text-yellow-400">{booking.customer_rating}/5</div>
            {booking.customer_review && <div className="text-sm text-dark-300 mt-0.5 italic">"{booking.customer_review}"</div>}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {canRate && (
          <button onClick={() => setRateModal(true)} className="btn-primary flex-1">
            <Star size={16} /> Rate Driver
          </button>
        )}
        {canCancel && (
          <button onClick={() => setCancelModal(true)} className="btn-secondary flex-1 text-red-400 hover:text-red-300">
            <X size={16} /> Cancel
          </button>
        )}
      </div>

      {/* Cancel modal */}
      <Modal isOpen={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Booking">
        <div className="space-y-4">
          <p className="text-dark-300 text-sm">Please let us know why you're cancelling. This helps us improve.</p>
          <div>
            <label className="label">Reason (optional)</label>
            <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)}
              placeholder="e.g. Changed my plans..." rows={3} className="input-field resize-none" />
          </div>
          <ErrorMessage message={error} />
          <div className="flex gap-3">
            <button onClick={() => setCancelModal(false)} className="btn-secondary flex-1">Keep Booking</button>
            <button onClick={cancelBooking} disabled={actionLoading} className="flex-1 btn-primary bg-red-600 hover:bg-red-700 shadow-none">
              {actionLoading ? <Spinner size="sm" /> : 'Cancel Booking'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Rate modal */}
      <Modal isOpen={rateModal} onClose={() => setRateModal(false)} title="Rate Your Experience">
        <div className="space-y-4">
          <p className="text-dark-400 text-sm">How was your delivery experience with {booking.driver_name}?</p>
          <div className="flex flex-col items-center gap-3 py-2">
            <StarRating value={rating} onChange={setRating} />
            <p className="text-sm font-mono text-dark-400">
              {['','Terrible','Bad','OK','Good','Excellent'][rating]}
            </p>
          </div>
          <div>
            <label className="label">Write a review (optional)</label>
            <textarea value={review} onChange={e => setReview(e.target.value)}
              placeholder="Share your experience..." rows={3} className="input-field resize-none" />
          </div>
          <ErrorMessage message={error} />
          <div className="flex gap-3">
            <button onClick={() => setRateModal(false)} className="btn-secondary flex-1">Skip</button>
            <button onClick={submitRating} disabled={actionLoading} className="btn-primary flex-1">
              {actionLoading ? <Spinner size="sm" /> : 'Submit Rating'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
