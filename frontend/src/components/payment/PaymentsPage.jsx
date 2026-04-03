import React, { useEffect, useState } from 'react'
import { CreditCard, CheckCircle2, Clock, XCircle, ArrowRight } from 'lucide-react'
import { paymentAPI } from '../../services/api'
import { formatCurrency, formatDateTime } from '../../utils/helpers'
import { Spinner, EmptyState, StatusBadge } from '../common'

const payStatusIcon = { success: <CheckCircle2 size={14} className="text-green-400" />, pending: <Clock size={14} className="text-yellow-400" />, failed: <XCircle size={14} className="text-red-400" />, initiated: <Clock size={14} className="text-blue-400" /> }
const payStatusColor = { success: 'text-green-400', pending: 'text-yellow-400', failed: 'text-red-400', initiated: 'text-blue-400' }

export default function PaymentsPage() {
  const [payments, setPayments] = useState([])
  const [pagination, setPagination] = useState({})
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totals, setTotals] = useState({ paid: 0, pending: 0 })

  useEffect(() => { load() }, [page])

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await paymentAPI.history({ page, limit: 15 })
      const list = data.data?.payments || []
      setPayments(list)
      setPagination(data.pagination || {})
      if (page === 1) {
        setTotals({
          paid:    list.filter(p => p.status === 'success').reduce((s, p) => s + parseFloat(p.amount), 0),
          pending: list.filter(p => p.status === 'pending').reduce((s, p) => s + parseFloat(p.amount), 0),
        })
      }
    } catch {}
    finally { setLoading(false) }
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="font-display font-bold text-2xl text-dark-50">Payments</h1>
        <p className="text-dark-400 text-sm mt-1">Your transaction history</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 animate-fade-up">
        <div className="stat-card">
          <div className="w-9 h-9 bg-green-500/10 rounded-xl flex items-center justify-center mb-3">
            <CheckCircle2 size={18} className="text-green-400" />
          </div>
          <div className="font-display font-bold text-xl text-green-400">{formatCurrency(totals.paid)}</div>
          <div className="text-xs font-mono text-dark-400">Total Paid</div>
        </div>
        <div className="stat-card">
          <div className="w-9 h-9 bg-yellow-500/10 rounded-xl flex items-center justify-center mb-3">
            <Clock size={18} className="text-yellow-400" />
          </div>
          <div className="font-display font-bold text-xl text-yellow-400">{formatCurrency(totals.pending)}</div>
          <div className="text-xs font-mono text-dark-400">Pending</div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : payments.length === 0 ? (
        <EmptyState icon={<CreditCard className="w-12 h-12 text-dark-500" />} title="No payments yet" description="Your payment history will appear here" />
      ) : (
        <div className="space-y-3 animate-fade-up">
          {payments.map(p => (
            <div key={p.id} className="card p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center
                ${p.status === 'success' ? 'bg-green-500/15' : p.status === 'failed' ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
                {payStatusIcon[p.status] || <Clock size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-mono font-medium capitalize ${payStatusColor[p.status] || 'text-dark-300'}`}>
                    {p.status}
                  </span>
                  <span className="text-xs font-mono text-dark-600">#{p.id}</span>
                </div>
                <div className="text-xs text-dark-400 truncate mt-0.5">
                  {p.pickup_address && `${p.pickup_address} → ${p.drop_address}`}
                </div>
                <div className="text-xs font-mono text-dark-500 mt-0.5">{formatDateTime(p.created_at)}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="font-display font-bold text-dark-100">{formatCurrency(p.amount)}</div>
                <div className="text-xs font-mono text-dark-500 capitalize">{p.payment_method}</div>
              </div>
            </div>
          ))}

          {pagination.totalPages > 1 && (
            <div className="flex justify-center gap-3 pt-4">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-secondary px-4 py-2 text-sm">Prev</button>
              <span className="flex items-center text-sm font-mono text-dark-400">{page} / {pagination.totalPages}</span>
              <button onClick={() => setPage(p => Math.min(pagination.totalPages, p+1))} disabled={page === pagination.totalPages} className="btn-secondary px-4 py-2 text-sm">Next</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
