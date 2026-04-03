import React from 'react'
import { X, PackageX, AlertTriangle } from 'lucide-react'
import { statusLabels } from '../../utils/helpers'

export function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-10 h-10' }
  return (
    <div className={`${sizes[size]} border-2 border-dark-600 border-t-brand-500 rounded-full animate-spin ${className}`} />
  )
}

export function LoadingScreen({ message = 'Loading...' }) {
  return (
    <div className="fixed inset-0 bg-dark-950 flex flex-col items-center justify-center gap-4 z-50">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-dark-700 border-t-brand-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center text-2xl">🚛</div>
      </div>
      <p className="font-mono text-sm text-dark-400 animate-pulse">{message}</p>
    </div>
  )
}

export function DotLoader() {
  return (
    <div className="dot-loader flex items-center gap-1">
      <span /><span /><span />
    </div>
  )
}

export function StatusBadge({ status }) {
  return <span className={`status-${status}`}>{statusLabels[status] || status}</span>
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  if (!isOpen) return null
  const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} card animate-fade-up`}>
        <div className="flex items-center justify-between p-5 border-b border-dark-700">
          <h2 className="font-display font-bold text-lg text-dark-50">{title}</h2>
          <button onClick={onClose} className="btn-ghost p-2 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export function EmptyState({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-5xl mb-4 opacity-40">{icon || <PackageX className="w-12 h-12 text-dark-500" />}</div>
      <h3 className="font-display font-semibold text-dark-200 text-lg mb-2">{title}</h3>
      {description && <p className="text-dark-400 text-sm mb-6 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

export function ErrorMessage({ message }) {
  if (!message) return null
  return (
    <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
      <AlertTriangle size={16} className="shrink-0" />
      {message}
    </div>
  )
}

export function Avatar({ name = '', size = 'md', className = '' }) {
  const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-14 h-14 text-lg' }
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center font-display font-bold text-white ${className}`}>
      {initials}
    </div>
  )
}

export function StarRating({ value, onChange, readonly = false }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => !readonly && onChange?.(star)}
          className={`text-2xl transition-transform ${!readonly && 'hover:scale-110 cursor-pointer'} ${star <= value ? 'text-yellow-400' : 'text-dark-600'}`}
        >★</button>
      ))}
    </div>
  )
}

export function ProgressSteps({ steps, current }) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center gap-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono font-bold transition-all
              ${i < current ? 'bg-brand-500 text-white' :
                i === current ? 'bg-brand-500/20 border-2 border-brand-500 text-brand-400' :
                'bg-dark-700 text-dark-500 border-2 border-dark-600'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs font-mono whitespace-nowrap ${i === current ? 'text-brand-400' : 'text-dark-500'}`}>
              {step}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-1 mb-4 ${i < current ? 'bg-brand-500' : 'bg-dark-700'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
