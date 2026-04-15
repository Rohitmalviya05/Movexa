import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, MapPin, CreditCard, Settings,
  LogOut, Menu, X, Truck, BarChart3, ChevronRight, Bell
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { Avatar } from '../common'
import toast from 'react-hot-toast'

const customerNav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/book',          icon: Package,          label: 'Book a Vehicle' },
  { to: '/bookings',      icon: MapPin,           label: 'My Bookings' },
  { to: '/payments',      icon: CreditCard,       label: 'Payments' },
  { to: '/settings',      icon: Settings,         label: 'Settings' },
]

const driverNav = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/driver/bookings', icon: Package,        label: 'My Rides' },
  { to: '/driver/earnings', icon: BarChart3,      label: 'Earnings' },
  { to: '/settings',      icon: Settings,         label: 'Settings' },
]

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = user?.role === 'driver' ? driverNav : customerNav

  const handleLogout = async () => {
    try {
      await logout()
      toast.success('Logged out')
      navigate('/login')
    } catch {
      navigate('/login')
    }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-700">
        <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-glow-sm">
          <Truck size={20} className="text-white" />
        </div>
        <div>
          <span className="font-display font-bold text-dark-50 text-lg leading-none">Movexa</span>
          <div className="text-xs font-mono text-dark-400 capitalize">{user?.role}</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span className="flex-1">{label}</span>
            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100" />
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4 border-t border-dark-700">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-dark-700 transition-colors cursor-pointer mb-2"
             onClick={() => navigate('/settings')}>
          <Avatar name={user?.name} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-display font-semibold text-dark-100 truncate">{user?.name}</div>
            <div className="text-xs font-mono text-dark-400 truncate">{user?.phone}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-dark-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-dark-900 border-r border-dark-700 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-dark-900 border-r border-dark-700 flex flex-col animate-slide-right">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-700">
          <button onClick={() => setSidebarOpen(true)} className="btn-ghost p-2">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-500 rounded-lg flex items-center justify-center">
              <Truck size={16} className="text-white" />
            </div>
            <span className="font-display font-bold text-dark-50">Movexa</span>
          </div>
          <button className="btn-ghost p-2 relative">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full" />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto bg-dark-950">
          {children}
        </main>
      </div>
    </div>
  )
}
