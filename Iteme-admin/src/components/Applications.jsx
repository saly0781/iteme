import { useState } from 'react'
import { useAllEnrollments } from '../hooks/useAllEnrollments'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { formatRWF } from '../data/programs'
import LoadingSpinner from './LoadingSpinner'

const tabs = ['Pending', 'Approved', 'Rejected', 'All']

const statusBadge = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-teal-100 text-teal-700',
  rejected: 'bg-red-100 text-red-700',
}

function Applications() {
  const toast = useToast()
  const { enrollments, loading, refresh } = useAllEnrollments()
  const [tab, setTab] = useState('Pending')
  const [savingId, setSavingId] = useState(null)

  async function setApproval(id, approval_status) {
    setSavingId(id)
    const { error } = await supabase.from('enrollments').update({ approval_status }).eq('id', id)
    if (error) {
      console.error('Could not update application:', error)
      toast.error(error.message)
    } else {
      toast.success(approval_status === 'approved' ? 'Application approved.' : 'Application rejected.')
    }
    await refresh()
    setSavingId(null)
  }

  async function setStatus(id, status) {
    setSavingId(id)
    const { error } = await supabase
      .from('enrollments')
      .update({ status, completed_at: status === 'completed' ? new Date().toISOString() : null })
      .eq('id', id)
    if (error) {
      console.error('Could not update enrollment status:', error)
      toast.error(error.message)
    } else {
      toast.success(`Enrollment marked ${status}.`)
    }
    await refresh()
    setSavingId(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  const filtered = enrollments.filter((e) => {
    if (tab === 'Pending') return e.approval_status === 'pending'
    if (tab === 'Approved') return e.approval_status === 'approved'
    if (tab === 'Rejected') return e.approval_status === 'rejected'
    return true
  })

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Applications</h1>
        <p className="text-sm text-slate-500">Review and approve program applications.</p>
      </div>

      <div className="mb-6 flex items-center gap-5 border-b border-black/5 text-sm">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 pb-3 font-semibold transition-colors ${
              tab === t
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">Nothing here.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="flex flex-col gap-3 rounded-3xl bg-[#F4F4F6] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-900">
                    {e.profiles?.full_name || 'Unknown student'}
                  </p>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      statusBadge[e.approval_status] || statusBadge.pending
                    }`}
                  >
                    {e.approval_status}
                  </span>
                  {e.status !== 'active' && (
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      {e.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500">{e.profiles?.email}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {e.program?.name || e.program_id} · {e.session} ·{' '}
                  {e.enrollment_type === 'scholarship' ? 'Scholarship' : 'Full payment'}
                  {e.fee != null && ` · ${formatRWF(Number(e.fee))}`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {e.approval_status === 'pending' && (
                  <>
                    <button
                      type="button"
                      disabled={savingId === e.id}
                      onClick={() => setApproval(e.id, 'approved')}
                      className="rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-105 disabled:opacity-60"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      disabled={savingId === e.id}
                      onClick={() => setApproval(e.id, 'rejected')}
                      className="rounded-full border border-black/15 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:border-black/30 disabled:opacity-60"
                    >
                      Reject
                    </button>
                  </>
                )}

                {e.approval_status === 'approved' && (
                  <select
                    value={e.status}
                    disabled={savingId === e.id}
                    onChange={(ev) => setStatus(e.id, ev.target.value)}
                    className="rounded-full border border-black/15 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="withdrawn">Withdrawn</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Applications
