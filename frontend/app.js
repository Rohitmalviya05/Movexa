// ✅ Change this for deployment
const API_BASE = "http://localhost:5000";

let token = localStorage.getItem("token") || "";
let role = localStorage.getItem("role") || "";

let calculatedFare = null;

let driverAvailableBookingId = null;
let driverCurrentBookingId = null;

let driverAutoTimer = null;
let customerAutoTimer = null;

const el = (id) => document.getElementById(id);
const show = (id) => el(id).classList.remove("hidden");
const hide = (id) => el(id).classList.add("hidden");

function setSubtitle(text) {
  el("userSubtitle").innerText = text;
}

function setActiveTab(tab) {
  el("tabCustomer").classList.remove("active");
  el("tabDriver").classList.remove("active");
  if (tab === "customer") el("tabCustomer").classList.add("active");
  if (tab === "driver") el("tabDriver").classList.add("active");
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  token = "";
  role = "";

  if (driverAutoTimer) clearInterval(driverAutoTimer);
  if (customerAutoTimer) clearInterval(customerAutoTimer);

  hide("customerScreen");
  hide("driverScreen");
  hide("bottomNav");
  hide("logoutBtn");

  show("authScreen");
  setSubtitle("Goods transport for vendors");
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

// ---------------- AUTH ----------------
async function signup() {
  const res = await fetch(`${API_BASE}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: el("authName").value,
      email: el("authEmail").value,
      password: el("authPassword").value,
      role: el("authRole").value
    })
  });

  const data = await safeJson(res);
  el("authMsg").innerText = data.message || data.error || "Done";
}

async function login() {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: el("authEmail").value,
      password: el("authPassword").value
    })
  });

  const data = await safeJson(res);

  if (!res.ok) {
    el("authMsg").innerText = data.error || "Login failed";
    return;
  }

  token = data.token;
  role = data.user.role;

  localStorage.setItem("token", token);
  localStorage.setItem("role", role);

  el("authMsg").innerText = "";

  hide("authScreen");
  show("logoutBtn");
  show("bottomNav");

  if (role === "customer") {
    setSubtitle("Customer mode active");
    switchTab("customer");
  } else {
    setSubtitle("Driver mode active");
    switchTab("driver");
  }
}

async function loadMe() {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (data.user && data.user.role === "driver") {
    el("driverOnlineStatus").innerText = data.user.isOnline ? "Online" : "Offline";
  }
}

// Auto open if already logged in
(async function initApp() {
  if (!token || !role) return;

  hide("authScreen");
  show("logoutBtn");
  show("bottomNav");

  if (role === "customer") {
    setSubtitle("Customer mode active");
    switchTab("customer");
  } else {
    setSubtitle("Driver mode active");
    switchTab("driver");
    await loadMe();
  }
})();

// ---------------- TAB SWITCH ----------------
function switchTab(tab) {
  if (tab === "customer") {
    show("customerScreen");
    hide("driverScreen");
    setActiveTab("customer");
    setTimeout(initMap, 200);

    loadCustomerBookings();

    if (customerAutoTimer) clearInterval(customerAutoTimer);
    customerAutoTimer = setInterval(() => {
      loadCustomerBookings();
    }, 5000);
  }

  if (tab === "driver") {
    show("driverScreen");
    hide("customerScreen");
    setActiveTab("driver");

    loadMe();
    loadDriverCurrent();
    refreshAvailable();

    if (driverAutoTimer) clearInterval(driverAutoTimer);
    driverAutoTimer = setInterval(() => {
      loadDriverCurrent();
      refreshAvailable();
      loadMe();
    }, 5000);
  }
}

// ---------------- CUSTOMER ----------------
function autoSuggestVehicle() {
  const cargo = el("cargoSize").value;

  if (cargo === "small") el("vehicle").value = "bikeParcel";
  if (cargo === "medium") el("vehicle").value = "tempo";
  if (cargo === "large") el("vehicle").value = "miniTruck";
}

async function calculateFare() {
  const res = await fetch(`${API_BASE}/api/route-fare`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pickup: el("pickup").value,
      drop: el("drop").value,
      vehicleType: el("vehicle").value,
      cargoSize: el("cargoSize").value,
      needsHelper: el("needsHelper").checked
    })
  });

  const data = await safeJson(res);

  if (!res.ok) {
    el("fareInfo").innerText = data.error || "Failed";
    return;
  }

  calculatedFare = data;
  el("fareInfo").innerText =
    `Distance: ${data.distanceKm} km | Time: ${data.durationMin} min | Fare: ₹${data.fare}`;

  drawRoute(el("pickup").value, el("drop").value);
}

async function createBooking() {
  if (!calculatedFare) {
    el("bookingResult").innerText = "Please calculate fare first.";
    return;
  }

  const res = await fetch(`${API_BASE}/api/bookings/create`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      pickup: calculatedFare.pickup,
      drop: calculatedFare.drop,
      vehicleType: calculatedFare.vehicleType,
      cargoSize: calculatedFare.cargoSize,
      needsHelper: calculatedFare.needsHelper,
      distanceKm: calculatedFare.distanceKm,
      durationMin: calculatedFare.durationMin,
      fare: calculatedFare.fare
    })
  });

  const data = await safeJson(res);

  if (!res.ok) {
    el("bookingResult").innerText = data.error || "Booking failed";
    return;
  }

  el("bookingResult").innerText = "Booking Created ✅";
  loadCustomerBookings();
}

async function loadCustomerBookings() {
  const res = await fetch(`${API_BASE}/api/bookings/my`, {
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!data.bookings) {
    el("customerBookingsList").innerHTML = "<p class='smallText'>No bookings</p>";
    return;
  }

  if (data.bookings.length === 0) {
    el("customerBookingsList").innerHTML = "<p class='smallText'>No bookings found.</p>";
    return;
  }

  el("customerBookingsList").innerHTML = data.bookings
    .slice(0, 6)
    .map(
      (b) => `
      <div style="padding:10px;border-bottom:1px solid #e5e7eb;">
        <b>${b.pickup}</b> → <b>${b.drop}</b><br/>
        Vehicle: ${b.vehicleType} | Cargo: ${b.cargoSize}<br/>
        Fare: ₹${b.fare} | Status: <b>${b.status}</b>
      </div>
    `
    )
    .join("");
}

// ---------------- DRIVER ----------------
async function toggleOnline() {
  const res = await fetch(`${API_BASE}/api/bookings/driver/online-toggle`, {
    method: "POST",
    headers: authHeaders()
  });

  const data = await safeJson(res);
  el("driverOnlineStatus").innerText = data.isOnline ? "Online" : "Offline";
}

async function loadDriverCurrent() {
  const res = await fetch(`${API_BASE}/api/bookings/driver/current`, {
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!data.booking) {
    el("driverCurrentBox").innerHTML = "<p class='smallText'>No current booking.</p>";
    driverCurrentBookingId = null;
    return;
  }

  const b = data.booking;
  driverCurrentBookingId = b._id;

  el("driverCurrentBox").innerHTML = `
    <b>${b.pickup}</b> → <b>${b.drop}</b><br/>
    Fare: ₹${b.fare}<br/>
    Status: <b>${b.status}</b>
  `;
}

async function refreshAvailable() {
  const res = await fetch(`${API_BASE}/api/bookings/available`, {
    headers: authHeaders()
  });

  const data = await safeJson(res);

  // if driver is busy or offline etc.
  if (!res.ok) {
    el("driverAvailableBox").innerHTML = "<p class='smallText'>Not available now.</p>";
    el("driverAvailableStatus").innerText = data.error || "";
    driverAvailableBookingId = null;
    return;
  }

  if (!data.booking) {
    el("driverAvailableBox").innerHTML = "<p class='smallText'>No available booking.</p>";
    el("driverAvailableStatus").innerText = data.message || "";
    driverAvailableBookingId = null;
    return;
  }

  const b = data.booking;
  driverAvailableBookingId = b._id;

  el("driverAvailableBox").innerHTML = `
    <b>${b.pickup}</b> → <b>${b.drop}</b><br/>
    Vehicle: ${b.vehicleType} | Cargo: ${b.cargoSize}<br/>
    Fare: ₹${b.fare}<br/>
    Status: <b>${b.status}</b>
  `;

  el("driverAvailableStatus").innerText = "";
}

async function acceptAvailable() {
  if (!driverAvailableBookingId) {
    el("driverAvailableStatus").innerText = "No booking to accept.";
    return;
  }

  const res = await fetch(`${API_BASE}/api/bookings/accept/${driverAvailableBookingId}`, {
    method: "POST",
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!res.ok) {
    el("driverAvailableStatus").innerText = data.error || "Failed";
    return;
  }

  el("driverAvailableStatus").innerText = "Accepted ✅";

  loadDriverCurrent();
  refreshAvailable();
}

async function startCurrent() {
  if (!driverCurrentBookingId) {
    el("driverStatus").innerText = "No current booking.";
    return;
  }

  const res = await fetch(`${API_BASE}/api/bookings/start/${driverCurrentBookingId}`, {
    method: "POST",
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!res.ok) {
    el("driverStatus").innerText = data.error || "Failed";
    return;
  }

  el("driverStatus").innerText = "Started ✅";
  loadDriverCurrent();
}

async function completeCurrent() {
  if (!driverCurrentBookingId) {
    el("driverStatus").innerText = "No current booking.";
    return;
  }

  const res = await fetch(`${API_BASE}/api/bookings/complete/${driverCurrentBookingId}`, {
    method: "POST",
    headers: authHeaders()
  });

  const data = await safeJson(res);

  if (!res.ok) {
    el("driverStatus").innerText = data.error || "Failed";
    return;
  }

  el("driverStatus").innerText = "Completed ✅";
  loadDriverCurrent();
  refreshAvailable();
}
