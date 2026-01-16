let map = null;
let routeLayer = null;

function initMap() {
  if (map) return;

  const mapDiv = document.getElementById("map");
  if (!mapDiv) return;

  map = L.map("map").setView([20.5937, 78.9629], 5);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
  }).addTo(map);
}

async function geocode(place) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`
  );
  const data = await res.json();

  if (!data.length) throw new Error("Location not found");
  return { lat: data[0].lat, lon: data[0].lon };
}

async function drawRoute(start, end) {
  initMap();

  if (routeLayer) map.removeLayer(routeLayer);

  const s = await geocode(start);
  const e = await geocode(end);

  const url = `https://router.project-osrm.org/route/v1/driving/${s.lon},${s.lat};${e.lon},${e.lat}?overview=full&geometries=geojson`;
  const res = await fetch(url);
  const data = await res.json();

  routeLayer = L.geoJSON(data.routes[0].geometry).addTo(map);
  map.fitBounds(routeLayer.getBounds());
}
