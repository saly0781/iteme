import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList, ResponsiveContainer } from 'recharts'
import { useAuth } from '../context/AuthContext'
import { useAllEnrollments } from '../hooks/useAllEnrollments'
import { usePrograms } from '../hooks/usePrograms'
import { supabase } from '../lib/supabase'
import { formatRWF } from '../data/programs'
import { sessionLabel } from '../data/sessions'
import LoadingSpinner from './LoadingSpinner'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-lg">
      {label && <p className="mb-0.5 font-normal text-white/60">{label}</p>}
      <p>{payload[0].value} enrolled</p>
    </div>
  )
}

function AdminHome() {
  const { profile } = useAuth()
  const { enrollments, loading: enrollmentsLoading } = useAllEnrollments()
  const { programs, loading: programsLoading } = usePrograms()
  const needsFinance = profile?.role === 'admin' || profile?.role === 'accountant'

  const [todaySessions, setTodaySessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [financeLoading, setFinanceLoading] = useState(needsFinance)

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)

    supabase
      .from('class_sessions')
      .select('program_id, session, topic')
      .eq('session_date', today)
      .then(({ data, error }) => {
        if (error) console.error('Could not load today\'s classes:', error)
        setTodaySessions(data || [])
        setSessionsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!needsFinance) {
      setFinanceLoading(false)
      return
    }
    setFinanceLoading(true)
    Promise.all([
      supabase.from('payments').select('*'),
      supabase.from('expenses').select('*'),
    ]).then(([paymentsRes, expensesRes]) => {
      if (paymentsRes.error) console.error('Could not load payments:', paymentsRes.error)
      if (expensesRes.error) console.error('Could not load expenses:', expensesRes.error)
      setPayments(paymentsRes.data || [])
      setExpenses(expensesRes.data || [])
      setFinanceLoading(false)
    })
  }, [needsFinance])

  if (enrollmentsLoading || sessionsLoading || financeLoading || programsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  const pending = enrollments.filter((e) => e.approval_status === 'pending')
  const activeEnrollments = enrollments.filter(
    (e) => e.approval_status === 'approved' && e.status === 'active'
  )
  const activeStudentIds = new Set(
    enrollments.filter((e) => e.status === 'active').map((e) => e.student_id)
  )

  const enrollmentsByProgram = programs.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    count: enrollments.filter((e) => e.program_id === p.id && e.status === 'active').length,
  }))

  const now = new Date()
  const isThisMonth = (dateStr) => {
    const d = new Date(dateStr)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }
  const thisMonthRevenue = payments
    .filter((p) => isThisMonth(p.paid_at))
    .reduce((sum, p) => sum + Number(p.amount), 0)
  const thisMonthExpenses = expenses
    .filter((e) => isThisMonth(e.spent_at))
    .reduce((sum, e) => sum + Number(e.amount), 0)

  const paidByEnrollment = new Map()
  payments.forEach((p) => {
    paidByEnrollment.set(p.enrollment_id, (paidByEnrollment.get(p.enrollment_id) || 0) + Number(p.amount))
  })
  const outstandingTotal = activeEnrollments.reduce((sum, e) => {
    const expected = Number(e.fee) || 0
    const paid = paidByEnrollment.get(e.id) || 0
    return sum + Math.max(0, expected - paid)
  }, 0)
  const expectedTuition = activeEnrollments.reduce((sum, e) => sum + (Number(e.fee) || 0), 0)

  const greeting = (
    <div className="mb-6 rounded-3xl bg-[#F4F4F6] p-4 sm:p-8">
      <h1 className="mb-1 font-serif text-lg font-bold text-slate-900 sm:text-3xl">
        Welcome, {profile?.full_name?.split(' ')[0] || 'there'}
      </h1>
      <p className="text-xs text-slate-500 sm:text-base">Here's what needs your attention today.</p>
    </div>
  )

  // ── Accountant: finance-only summary ──────────────────────────────
  if (profile?.role === 'accountant') {
    return (
      <div className="px-4 py-6 md:px-8">
        {greeting}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard value={formatRWF(expectedTuition)} label="Expected from active students" />
          <StatCard value={formatRWF(thisMonthRevenue)} label="Revenue this month" tone="text-teal-600" />
          <StatCard value={formatRWF(thisMonthExpenses)} label="Expenses this month" tone="text-red-500" />
          <StatCard value={formatRWF(outstandingTotal)} label="Outstanding balance" tone="text-red-500" />
        </div>

        <Link
          to="/finance"
          className="flex items-center justify-between rounded-3xl bg-[#F4F4F6] p-6 transition-colors hover:bg-black/5"
        >
          <div>
            <h2 className="font-serif text-lg font-bold text-slate-900">Finance</h2>
            <p className="text-sm text-slate-500">Revenue, expenses, and outstanding balances.</p>
          </div>
          <i className="fa-solid fa-arrow-right text-slate-400"></i>
        </Link>
      </div>
    )
  }

  // ── Teacher: classroom-only summary ────────────────────────────────
  if (profile?.role === 'teacher') {
    return (
      <div className="px-4 py-6 md:px-8">
        {greeting}

        <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard value={pending.length} label="Pending applications" />
          <StatCard value={activeStudentIds.size} label="Active students" />
          <StatCard value={todaySessions.length} label="Classes today" />
          <StatCard value={programs.length} label="Programs offered" />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <PendingApplicationsPanel pending={pending} />
          <ClassesTodayPanel todaySessions={todaySessions} programs={programs} />
        </div>
      </div>
    )
  }

  // ── Admin (CEO): the full company picture ──────────────────────────
  return (
    <div className="px-4 py-6 md:px-8">
      {greeting}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard value={pending.length} label="Pending applications" />
        <StatCard value={activeStudentIds.size} label="Active students" />
        <StatCard value={todaySessions.length} label="Classes today" />
        <StatCard value={programs.length} label="Programs offered" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard value={formatRWF(thisMonthRevenue)} label="Revenue this month" tone="text-teal-600" />
        <StatCard value={formatRWF(thisMonthExpenses)} label="Expenses this month" tone="text-red-500" />
        <StatCard value={formatRWF(outstandingTotal)} label="Outstanding balance" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PendingApplicationsPanel pending={pending} />
        <ClassesTodayPanel todaySessions={todaySessions} programs={programs} />
      </div>

      <div className="mt-6 rounded-3xl bg-[#F4F4F6] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-slate-900">Active enrollments by program</h2>
          <Link to="/finance" className="text-xs font-semibold text-slate-500 underline">
            View finances
          </Link>
        </div>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={enrollmentsByProgram}
              margin={{ top: 0, right: 32, left: 0, bottom: 0 }}
            >
              <XAxis type="number" hide allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#0b0b0b', fontSize: 12, fontWeight: 600 }}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {enrollmentsByProgram.map((entry) => (
                  <Cell key={entry.id} fill={entry.color} />
                ))}
                <LabelList dataKey="count" position="right" fill="#0b0b0b" fontSize={12} fontWeight={600} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function PendingApplicationsPanel({ pending }) {
  return (
    <div className="rounded-3xl bg-[#F4F4F6] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-slate-900">Pending applications</h2>
        <Link to="/applications" className="text-xs font-semibold text-slate-500 underline">
          View all
        </Link>
      </div>

      {pending.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Nothing waiting on you.</p>
      ) : (
        <div className="space-y-3">
          {pending.slice(0, 5).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {e.profiles?.full_name || 'Unknown student'}
                </p>
                <p className="truncate text-xs text-slate-400">
                  {e.program?.name || e.program_id} · {e.session}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ClassesTodayPanel({ todaySessions, programs }) {
  return (
    <div className="rounded-3xl bg-[#F4F4F6] p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-serif text-lg font-bold text-slate-900">Classes today</h2>
        <Link to="/attendance" className="text-xs font-semibold text-slate-500 underline">
          Mark attendance
        </Link>
      </div>

      {todaySessions.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">No classes scheduled today.</p>
      ) : (
        <div className="space-y-3">
          {todaySessions.map((s, i) => {
            const program = programs.find((p) => p.id === s.program_id)
            return (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white p-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: program?.color || '#0F172A' }}
                ></span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {program?.name || s.program_id}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {sessionLabel(s.session)} · {program?.schedule[s.session]?.time}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, tone }) {
  return (
    <div className="rounded-3xl bg-[#F4F4F6] p-5">
      <p className={`mb-1 font-serif text-2xl font-bold sm:text-3xl ${tone || 'text-slate-900'}`}>{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  )
}

export default AdminHome
