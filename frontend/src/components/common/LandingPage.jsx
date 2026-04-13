import React from 'react'
import { Link } from 'react-router-dom'
import { Truck, Package, MapPin, Shield, Zap, Star, ArrowRight, CheckCircle2 } from 'lucide-react'

const features = [
  { icon: Zap,          title: 'Instant Matching',  desc: 'Get matched with nearby drivers in under 60 seconds' },
  { icon: MapPin,       title: 'Live Tracking',      desc: 'Real-time GPS tracking of your goods from pickup to delivery' },
  { icon: Shield,       title: 'Safe & Secure',      desc: 'Verified drivers, insured goods, and 24/7 support' },
  { icon: Star,         title: 'Rated Drivers',      desc: 'Book from a network of vetted, top-rated delivery partners' },
]

const vehicles = [
  { icon: '🏍️', name: 'Bike',       cap: 'Up to 20 kg',   rate: '₹8/km',  ideal: 'Documents, parcels' },
  { icon: '🛺', name: 'Auto',       cap: 'Up to 100 kg',  rate: '₹12/km', ideal: 'Groceries, boxes' },
  { icon: '🛻', name: 'Pickup',     cap: 'Up to 750 kg',  rate: '₹20/km', ideal: 'Furniture, appliances' },
  { icon: '🚛', name: 'Mini Truck', cap: 'Up to 2000 kg', rate: '₹35/km', ideal: 'Bulk cargo, construction' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-dark-950 overflow-x-hidden">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-dark-800 max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center shadow-glow-sm">
            <Truck size={20} className="text-white" />
          </div>
          <span className="font-display font-bold text-xl text-dark-50">Movexa</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-ghost text-sm">Sign In</Link>
          <Link to="/signup" className="btn-primary text-sm">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative px-6 py-24 md:py-36 text-center max-w-5xl mx-auto">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-brand-500/6 rounded-full blur-3xl" />
        </div>
        <div className="animate-fade-up relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-mono mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-400 animate-pulse-slow" />
            Now available across major cities
          </div>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl lg:text-7xl text-dark-50 leading-none tracking-tight mb-6">
            Transport Goods<br />
            <span className="text-brand-500">On Demand</span>
          </h1>
          <p className="text-dark-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-body">
            Book bikes, autos, pickups, and mini trucks in seconds. Built for small vendors and individuals who move things that matter.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup?role=customer" className="btn-primary text-base px-8 py-4">
              Book a Vehicle <ArrowRight size={18} />
            </Link>
            <Link to="/signup?role=driver" className="btn-secondary text-base px-8 py-4">
              🚗 Become a Driver
            </Link>
          </div>
        </div>
      </section>

      {/* Vehicle types */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="font-mono text-xs text-brand-400 uppercase tracking-widest mb-2">Fleet</p>
          <h2 className="font-display font-bold text-3xl text-dark-50">Every load, covered</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {vehicles.map((v, i) => (
            <div key={i} className="card-hover p-5 text-center group" style={{ animationDelay: `${i*0.1}s` }}>
              <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">{v.icon}</div>
              <div className="font-display font-bold text-dark-100 mb-1">{v.name}</div>
              <div className="text-xs font-mono text-dark-400 mb-2">{v.cap}</div>
              <div className="text-brand-400 font-display font-bold">{v.rate}</div>
              <div className="text-xs text-dark-500 mt-1">{v.ideal}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <p className="font-mono text-xs text-brand-400 uppercase tracking-widest mb-2">Why Movexa</p>
          <h2 className="font-display font-bold text-3xl text-dark-50">Built for the way you work</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((f, i) => (
            <div key={i} className="card p-6 flex gap-4">
              <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center shrink-0">
                <f.icon size={20} className="text-brand-400" />
              </div>
              <div>
                <div className="font-display font-semibold text-dark-100 mb-1">{f.title}</div>
                <div className="text-sm text-dark-400 font-body">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 max-w-3xl mx-auto text-center">
        <div className="card p-10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-500/10 to-transparent pointer-events-none" />
          <div className="text-5xl mb-4">🚛</div>
          <h2 className="font-display font-bold text-3xl text-dark-50 mb-3">Start shipping today</h2>
          <p className="text-dark-400 mb-8 font-body">Join thousands of vendors and individuals who trust Movexa for their logistics needs</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/signup" className="btn-primary px-8 py-3">
              Create Free Account <ArrowRight size={16} />
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 mt-6 text-xs font-mono text-dark-500">
            {['No subscription', 'Pay per ride', 'Cancel anytime'].map(t => (
              <span key={t} className="flex items-center gap-1"><CheckCircle2 size={12} className="text-green-500" />{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-dark-800 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 bg-brand-500 rounded-lg flex items-center justify-center">
            <Truck size={14} className="text-white" />
          </div>
          <span className="font-display font-bold text-dark-200">Movexa</span>
        </div>
        <p className="text-xs font-mono text-dark-600">© {new Date().getFullYear()} Movexa. Built for small vendors & individuals.</p>
      </footer>
    </div>
  )
}
