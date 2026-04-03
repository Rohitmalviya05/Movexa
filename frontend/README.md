# 🎨 LoadGo — Frontend

A modern, dark-themed React frontend for the LoadGo logistics platform.

## Tech Stack
- **React 18** + **Vite** — blazing fast dev server & build
- **Tailwind CSS** — utility-first styling with custom design tokens
- **React Router v6** — client-side routing with auth guards
- **Socket.IO Client** — real-time driver tracking & booking events
- **Axios** — HTTP client with JWT interceptors & auto-refresh
- **React Hot Toast** — beautiful toast notifications
- **Leaflet / React-Leaflet** — maps (ready to integrate)
- **Lucide React** — consistent icon set
- **Fonts**: Syne (display) + DM Sans (body) + JetBrains Mono (mono)

## Design System
- **Dark theme** — `#080a0f` base with layered dark grays
- **Brand**: Orange (`#f97316`) with glow effects
- **Typography**: Syne for headings, DM Sans for body, JetBrains Mono for code/labels
- **Components**: Cards, badges, modals, progress steps, star ratings, avatars

## Project Structure
```
src/
├── components/
│   ├── auth/         LoginPage, SignupPage
│   ├── booking/      BookVehicle (multi-step), BookingsList, BookingDetail
│   ├── customer/     CustomerDashboard
│   ├── driver/       DriverDashboard, DriverSetup, DriverBookings, DriverEarnings
│   ├── payment/      PaymentsPage
│   └── common/       Layout, LandingPage, Settings, shared UI components
├── context/          AuthContext (global auth state)
├── services/         api.js (Axios), socket.js (Socket.IO)
├── utils/            helpers.js (formatters, constants)
├── App.jsx           Router + auth guards
└── main.jsx          Entry point
```

## Quick Start

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit VITE_API_URL to point to your backend

# Start dev server
npm run dev
```

Open http://localhost:5173

## Connecting to Backend
Edit `.env`:
```
VITE_API_URL=http://localhost:3000/api/v1
VITE_SOCKET_URL=http://localhost:3000
```

## Key Screens

### 🏠 Landing Page (`/`)
- Marketing page with vehicle types, features, CTAs
- Auto-redirects to `/dashboard` if logged in

### 🔐 Auth (`/login`, `/signup`)
- Role selector (Customer / Driver) on signup
- JWT stored in localStorage, auto-refreshed on expiry

### 📊 Customer Dashboard (`/dashboard`)
- Stats: total bookings, completed, active, total spent
- Recent bookings list with status badges
- Quick-book CTA

### 📦 Book Vehicle (`/book`)
- **4-step wizard**: Location → Load Details → Vehicle Selection → Payment
- Real-time fare estimates from backend
- Surge multiplier display
- Vehicle capacity matching by weight

### 📋 Bookings (`/bookings`, `/bookings/:id`)
- Filter by status, paginated list
- Live status tracker (step progress bar)
- Driver info + call button
- Cancel & Rate actions

### 🚗 Driver Dashboard (`/dashboard` for drivers)
- Online/Offline toggle with GPS broadcasting
- Incoming booking request overlay with Accept/Decline
- Active booking card
- Recent rides

### 🛣️ Driver Booking Detail (`/driver/bookings/:id`)
- Full route info with Google Maps deep links
- Fare breakdown
- Status flow buttons: Picked Up → In Transit → Delivered → Complete
- Cash collection confirmation

### 📊 Driver Earnings (`/driver/earnings`)
- Summary stats with date range filter
- Placeholder bar chart (connect to real data)

### 💳 Payments (`/payments`)
- Transaction history with status, amount, method

### ⚙️ Settings (`/settings`)
- Profile edit, password change, account info

## Real-Time Events
Socket.IO events automatically update UI:
- `new_booking_request` → shows overlay popup for drivers
- `booking_accepted` → toast + status update for customers
- `booking_status_updated` → live status on booking detail
- `driver_location_update` → GPS tracking (ready to wire to map)
- `payment_success` → payment confirmation toast

## Test Accounts (from backend seed)
| Role | Phone | Password |
|------|-------|----------|
| Customer | 9876543210 | password123 |
| Driver (bike) | 9876543220 | password123 |
| Driver (auto) | 9876543221 | password123 |
| Driver (pickup) | 9876543222 | password123 |
| Driver (mini truck) | 9876543223 | password123 |

## Build for Production
```bash
npm run build    # outputs to dist/
npm run preview  # preview the build locally
```
