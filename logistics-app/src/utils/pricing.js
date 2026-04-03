/**
 * Haversine formula to calculate distance between two lat/lng points
 * Returns distance in kilometers
 */
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100; // round to 2 decimals
};

const toRad = (deg) => deg * (Math.PI / 180);

// Vehicle types with their capacities
const VEHICLE_TYPES = {
  bike: {
    type: 'bike',
    label: 'Bike',
    maxWeightKg: 20,
    maxVolumeCubicFt: 5,
    description: 'For small parcels and documents',
    baseFare: () => parseFloat(process.env.BIKE_BASE_FARE) || 30,
    perKm: () => parseFloat(process.env.BIKE_PER_KM) || 8,
  },
  auto: {
    type: 'auto',
    label: 'Auto / Rickshaw',
    maxWeightKg: 100,
    maxVolumeCubicFt: 20,
    description: 'For medium packages and small loads',
    baseFare: () => parseFloat(process.env.AUTO_BASE_FARE) || 50,
    perKm: () => parseFloat(process.env.AUTO_PER_KM) || 12,
  },
  pickup: {
    type: 'pickup',
    label: 'Pickup Truck',
    maxWeightKg: 750,
    maxVolumeCubicFt: 150,
    description: 'For furniture, appliances, and medium cargo',
    baseFare: () => parseFloat(process.env.PICKUP_BASE_FARE) || 100,
    perKm: () => parseFloat(process.env.PICKUP_PER_KM) || 20,
  },
  mini_truck: {
    type: 'mini_truck',
    label: 'Mini Truck',
    maxWeightKg: 2000,
    maxVolumeCubicFt: 400,
    description: 'For large loads, commercial goods, and bulk transport',
    baseFare: () => parseFloat(process.env.MINI_TRUCK_BASE_FARE) || 200,
    perKm: () => parseFloat(process.env.MINI_TRUCK_PER_KM) || 35,
  },
};

/**
 * Calculate fare for a booking
 * @param {string} vehicleType - one of: bike, auto, pickup, mini_truck
 * @param {number} distanceKm
 * @param {number} surgeMultiplier - default 1.0
 * @returns {{ baseFare, distanceFare, totalFare, surgeMultiplier, breakdown }}
 */
const calculateFare = (vehicleType, distanceKm, surgeMultiplier = 1.0) => {
  const vehicle = VEHICLE_TYPES[vehicleType];
  if (!vehicle) throw new Error(`Unknown vehicle type: ${vehicleType}`);

  const maxSurge = parseFloat(process.env.MAX_SURGE_MULTIPLIER) || 3.0;
  const surge = Math.min(surgeMultiplier, maxSurge);

  const baseFare = vehicle.baseFare();
  const distanceFare = Math.round(vehicle.perKm() * distanceKm * 100) / 100;
  const subtotal = baseFare + distanceFare;
  const totalFare = Math.round(subtotal * surge * 100) / 100;

  return {
    baseFare,
    distanceFare,
    surgeMultiplier: surge,
    surgeAmount: Math.round((totalFare - subtotal) * 100) / 100,
    totalFare,
    currency: 'INR',
    breakdown: {
      base: `₹${baseFare} (base fare)`,
      distance: `₹${vehicle.perKm()}/km × ${distanceKm}km = ₹${distanceFare}`,
      surge: surge > 1 ? `${surge}x surge pricing applied` : 'No surge',
      total: `₹${totalFare}`,
    },
  };
};

/**
 * Get available vehicle types based on load weight
 */
const getEligibleVehicles = (weightKg) => {
  return Object.values(VEHICLE_TYPES).filter(v => v.maxWeightKg >= weightKg);
};

/**
 * Get surge multiplier based on demand
 * In production this would use real demand data from DB/Redis
 */
const getSurgeMultiplier = async (lat, lng) => {
  // Placeholder: integrate with actual demand analytics
  return 1.0;
};

module.exports = {
  calculateDistance,
  calculateFare,
  getEligibleVehicles,
  getSurgeMultiplier,
  VEHICLE_TYPES,
};
