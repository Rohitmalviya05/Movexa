import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Navigation, Weight, ChevronRight, Check, CreditCard, Banknote, Info, MapPinned } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { bookingAPI } from '../../services/api'
import { formatCurrency, vehicleIcons, loadTypeLabels, getErrorMessage } from '../../utils/helpers'
import { ErrorMessage, Spinner, ProgressSteps, DotLoader } from '../common'
import toast from 'react-hot-toast'

const STEPS = ['Location', 'Load', 'Vehicle', 'Payment']
const LOAD_TYPES = ['documents','parcel','grocery','furniture','appliances','construction','other']

const markerIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

function LocationMarker({ position, setPosition, type, onClick }) {
  useMapEvents({
    click(e) {
      if (onClick) {
        onClick(e.latlng.lat, e.latlng.lng)
      }
    }
  })
  return position ? <Marker position={position} icon={type === 'pickup' ? greenIcon : redIcon} /> : null
}

function MapUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 14)
  }, [center, map])
  return null
}

export default function BookVehicle() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showMap, setShowMap] = useState(false)
  const [mapMode, setMapMode] = useState('pickup')
  const [form, setForm] = useState({
    pickupAddress: '', pickupLat: 22.7533, pickupLng: 75.8937,
    dropAddress: '', dropLat: 22.7196, dropLng: 75.8577,
    loadType: '', loadWeightKg: '',
    vehicleType: '',
    paymentMethod: 'cash',
    notes: '',
  })
  const [estimates, setEstimates] = useState([])
  const [loadingEstimate, setLoadingEstimate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (step === 2 && form.loadWeightKg) fetchEstimates()
  }, [step])

  const fetchAddress = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      )
      const data = await response.json()
      return data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    }
  }

  const handleMapClick = async (lat, lng) => {
    const address = await fetchAddress(lat, lng)
    if (mapMode === 'pickup') {
      set('pickupLat', lat)
      set('pickupLng', lng)
      set('pickupAddress', address)
    } else {
      set('dropLat', lat)
      set('dropLng', lng)
      set('dropAddress', address)
    }
    setShowMap(false)
  }

  const openMapFor = (mode) => {
    setMapMode(mode)
    setShowMap(true)
  }

  const fetchEstimates = async () => {
    setLoadingEstimate(true)
    try {
      const { data } = await bookingAPI.estimate({
        pickup_lat: form.pickupLat, pickup_lng: form.pickupLng,
        drop_lat: form.dropLat, drop_lng: form.dropLng,
        load_weight_kg: form.loadWeightKg,
      })
      setEstimates(data.data?.estimates || [])
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoadingEstimate(false)
    }
  }

  const next = () => { setError(''); setStep(s => s + 1) }
  const back = () => { setError(''); setStep(s => s - 1) }

  const submit = async () => {
    console.log('Submit clicked, form state:', form)
    setSubmitting(true); setError('')
    try {
      const bookingData = {
        pickupAddress: form.pickupAddress || '',
        pickupLat: parseFloat(form.pickupLat) || 0,
        pickupLng: parseFloat(form.pickupLng) || 0,
        dropAddress: form.dropAddress || '',
        dropLat: parseFloat(form.dropLat) || 0,
        dropLng: parseFloat(form.dropLng) || 0,
        loadType: form.loadType || '',
        loadWeightKg: parseFloat(form.loadWeightKg) || 0,
        vehicleType: form.vehicleType || '',
        paymentMethod: form.paymentMethod || 'cash',
        notes: form.notes || '',
      }
      console.log('Sending booking data:', JSON.stringify(bookingData, null, 2))
      const response = await bookingAPI.create(bookingData)
      console.log('Booking response:', response)
      toast.success('Booking created! Finding nearby drivers... 🔍', { duration: 5000 })
      navigate(`/bookings/${response.data.data.booking.id}`)
    } catch (err) {
      console.error('Booking error:', err.response || err)
      const msg = err.response?.data?.message || err.response?.data?.data?.message || err.message
      setError(msg || 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const pickupPos = [parseFloat(form.pickupLat), parseFloat(form.pickupLng)]
  const dropPos = [parseFloat(form.dropLat), parseFloat(form.dropLng)]
  const mapCenter = mapMode === 'pickup' ? pickupPos : dropPos

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1 className="font-display font-bold text-2xl text-dark-50 mb-1">Book a Vehicle</h1>
        <p className="text-dark-400 text-sm">Transport your goods safely and on time</p>
      </div>

      <div className="mb-8 animate-fade-up">
        <ProgressSteps steps={STEPS} current={step} />
      </div>

      {/* Map Modal */}
      {showMap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setShowMap(false)} />
          <div className="relative w-full max-w-2xl h-[500px] bg-dark-900 rounded-2xl overflow-hidden border border-dark-700">
            <div className="absolute top-4 left-4 z-10 bg-dark-800 px-4 py-2 rounded-xl border border-dark-600">
              <span className="font-mono text-sm text-dark-200">
                {mapMode === 'pickup' ? '📍 Click to set pickup location' : '📍 Click to set drop location'}
              </span>
            </div>
            <button onClick={() => setShowMap(false)} 
              className="absolute top-4 right-4 z-10 bg-dark-800 p-2 rounded-xl border border-dark-600 text-dark-200 hover:bg-dark-700">
              ✕
            </button>
            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={pickupPos} type="pickup" onClick={handleMapClick} />
              {form.dropLat && form.dropLng && (
                <Marker position={dropPos} icon={redIcon} />
              )}
              <MapUpdater center={mapCenter} />
            </MapContainer>
          </div>
        </div>
      )}

      <div className="card p-6 animate-fade-up">
        {step === 0 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-dark-50 flex items-center gap-2">
              <MapPin size={20} className="text-brand-400" /> Pickup & Drop Locations
            </h2>
            
            <div>
              <label className="label">Pickup Address</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-3.5 w-3 h-3 bg-green-500 rounded-full border-2 border-green-300" />
                  <input value={form.pickupAddress} onChange={e => set('pickupAddress', e.target.value)} required
                    placeholder="Enter pickup address" className="input-field pl-9" />
                </div>
                <button type="button" onClick={() => openMapFor('pickup')}
                  className="btn-secondary px-3" title="Pick from map">
                  <MapPinned size={18} />
                </button>
              </div>
              <p className="text-xs font-mono text-dark-500 mt-1 flex items-center gap-1">
                <MapPinned size={12} /> Click map icon to select from map
              </p>
            </div>

            <div>
              <label className="label">Drop Address</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-3.5 w-3 h-3 bg-red-500 rounded-full border-2 border-red-300" />
                  <input value={form.dropAddress} onChange={e => set('dropAddress', e.target.value)} required
                    placeholder="Enter drop address" className="input-field pl-9" />
                </div>
                <button type="button" onClick={() => openMapFor('drop')}
                  className="btn-secondary px-3" title="Pick from map">
                  <MapPinned size={18} />
                </button>
              </div>
            </div>

            <ErrorMessage message={error} />
            <button onClick={next} disabled={!form.pickupAddress || !form.dropAddress} className="btn-primary w-full">
              Continue <ChevronRight size={16} />
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-dark-50 flex items-center gap-2">
              <Weight size={20} className="text-brand-400" /> Load Details
            </h2>
            <div>
              <label className="label">Load Type</label>
              <div className="grid grid-cols-2 gap-2">
                {LOAD_TYPES.map(lt => (
                  <button key={lt} type="button" onClick={() => set('loadType', lt)}
                    className={`px-3 py-2.5 rounded-xl text-sm font-body border-2 transition-all text-left
                      ${form.loadType === lt
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-dark-600 bg-dark-700 text-dark-300 hover:border-dark-500'}`}>
                    {loadTypeLabels[lt]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Approximate Weight (kg)</label>
              <input type="number" min="0.1" max="5000" step="0.1"
                value={form.loadWeightKg} onChange={e => set('loadWeightKg', e.target.value)}
                placeholder="e.g. 25" className="input-field" />
              <p className="text-xs font-mono text-dark-500 mt-1.5 flex items-center gap-1">
                <Info size={12} /> This helps match the right vehicle for your load
              </p>
            </div>
            <div>
              <label className="label">Notes <span className="text-dark-500 normal-case font-body">(optional)</span></label>
              <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                placeholder="Any special instructions for the driver..." rows={3}
                className="input-field resize-none" maxLength={500} />
            </div>
            <ErrorMessage message={error} />
            <div className="flex gap-3">
              <button onClick={back} className="btn-secondary flex-1">Back</button>
              <button onClick={next} disabled={!form.loadType || !form.loadWeightKg} className="btn-primary flex-1">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-dark-50">Choose Vehicle</h2>
            {loadingEstimate ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <DotLoader />
                <p className="text-sm text-dark-400 font-mono">Calculating fares...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {estimates.map(est => (
                  <button key={est.vehicleType} type="button" onClick={() => set('vehicleType', est.vehicleType)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all
                      ${form.vehicleType === est.vehicleType
                        ? 'border-brand-500 bg-brand-500/10'
                        : 'border-dark-600 bg-dark-700 hover:border-dark-500'}`}>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{vehicleIcons[est.vehicleType]}</span>
                      <div className="flex-1">
                        <div className="font-display font-bold text-dark-50">{est.label}</div>
                        <div className="text-xs text-dark-400 mt-0.5">{est.description}</div>
                        <div className="text-xs font-mono text-dark-500 mt-1">Up to {est.maxWeightKg}kg • {est.distanceKm} km</div>
                      </div>
                      <div className="text-right">
                        <div className="font-display font-bold text-xl text-brand-400">{formatCurrency(est.totalFare)}</div>
                        {est.surgeMultiplier > 1 && (
                          <div className="text-xs text-yellow-400 font-mono">{est.surgeMultiplier}x surge</div>
                        )}
                      </div>
                      {form.vehicleType === est.vehicleType && (
                        <Check size={18} className="text-brand-400 shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <ErrorMessage message={error} />
            <div className="flex gap-3">
              <button onClick={back} className="btn-secondary flex-1">Back</button>
              <button onClick={next} disabled={!form.vehicleType || loadingEstimate} className="btn-primary flex-1">
                Continue <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-display font-semibold text-lg text-dark-50 flex items-center gap-2">
              <CreditCard size={20} className="text-brand-400" /> Payment & Confirm
            </h2>

            <div className="bg-dark-700 rounded-xl p-4 space-y-2 text-sm font-body">
              <div className="flex justify-between"><span className="text-dark-400">Pickup</span><span className="text-dark-200 text-right max-w-[60%] truncate">{form.pickupAddress}</span></div>
              <div className="flex justify-between"><span className="text-dark-400">Drop</span><span className="text-dark-200 text-right max-w-[60%] truncate">{form.dropAddress}</span></div>
              <div className="flex justify-between"><span className="text-dark-400">Vehicle</span><span className="text-dark-200">{vehicleIcons[form.vehicleType]} {form.vehicleType}</span></div>
              <div className="flex justify-between"><span className="text-dark-400">Load</span><span className="text-dark-200">{form.loadWeightKg}kg — {loadTypeLabels[form.loadType]}</span></div>
              <div className="divider my-2" />
              <div className="flex justify-between font-display font-bold text-base">
                <span className="text-dark-200">Total Fare</span>
                <span className="text-brand-400">
                  {formatCurrency(estimates.find(e => e.vehicleType === form.vehicleType)?.totalFare || 0)}
                </span>
              </div>
            </div>

            <div>
              <label className="label">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'cash', icon: <Banknote size={20} />, label: 'Cash', desc: 'Pay on delivery' },
                  { value: 'upi', icon: <CreditCard size={20} />, label: 'UPI', desc: 'Pay digitally' },
                ].map(pm => (
                  <button key={pm.value} type="button" onClick={() => set('paymentMethod', pm.value)}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                      ${form.paymentMethod === pm.value
                        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                        : 'border-dark-600 bg-dark-700 text-dark-300 hover:border-dark-500'}`}>
                    {pm.icon}
                    <div>
                      <div className="font-display font-semibold text-sm">{pm.label}</div>
                      <div className="text-xs opacity-70">{pm.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <ErrorMessage message={error} />
            <div className="flex gap-3">
              <button onClick={back} className="btn-secondary flex-1">Back</button>
              <button onClick={submit} disabled={submitting} className="btn-primary flex-1">
                {submitting ? <Spinner size="sm" /> : <><Check size={16} /> Confirm Booking</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}