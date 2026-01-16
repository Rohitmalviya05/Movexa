const pricing = {
  bikeParcel: { base: 20, perKm: 6 },
  pickup: { base: 80, perKm: 12 },
  tempo: { base: 120, perKm: 18 },
  miniTruck: { base: 180, perKm: 25 },
  truck: { base: 300, perKm: 35 }
};

const cargoMultipliers = {
  small: 1.0,
  medium: 1.15,
  large: 1.35
};

function calculateFare({ vehicleType, distanceKm, cargoSize, needsHelper }) {
  const baseFare = pricing[vehicleType].base + pricing[vehicleType].perKm * distanceKm;
  const helperFee = needsHelper ? 150 : 0;

  return Math.round(baseFare * cargoMultipliers[cargoSize] + helperFee);
}

module.exports = { pricing, cargoMultipliers, calculateFare };
