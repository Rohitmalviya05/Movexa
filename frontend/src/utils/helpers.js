export const formatCurrency = (amount) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)

export const formatDistance = (km) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`

export const formatDate = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export const formatTime = (dateStr) => {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
}

export const formatDateTime = (dateStr) => `${formatDate(dateStr)}, ${formatTime(dateStr)}`

export const getInitials = (name = '') =>
  name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong'

export const vehicleIcons = {
  bike:       '🏍️',
  auto:       '🛺',
  pickup:     '🛻',
  mini_truck: '🚛',
}

export const vehicleLabels = {
  bike:       'Bike',
  auto:       'Auto',
  pickup:     'Pickup',
  mini_truck: 'Mini Truck',
}

export const loadTypeLabels = {
  documents:    'Documents',
  parcel:       'Parcel',
  grocery:      'Grocery',
  furniture:    'Furniture',
  appliances:   'Appliances',
  construction: 'Construction',
  other:        'Other',
}

export const statusLabels = {
  pending:         'Finding Driver',
  accepted:        'Accepted',
  driver_assigned: 'Driver Assigned',
  picked_up:       'Picked Up',
  in_transit:      'In Transit',
  delivered:       'Delivered',
  completed:       'Completed',
  cancelled:       'Cancelled',
}

export const statusColors = {
  pending:         'text-yellow-400',
  accepted:        'text-blue-400',
  driver_assigned: 'text-blue-400',
  picked_up:       'text-indigo-400',
  in_transit:      'text-purple-400',
  delivered:       'text-teal-400',
  completed:       'text-green-400',
  cancelled:       'text-red-400',
}
