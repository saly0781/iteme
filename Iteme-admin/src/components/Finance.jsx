import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  LabelList,
} from 'recharts'
import { useAllEnrollments } from '../hooks/useAllEnrollments'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { formatRWF } from '../data/programs'
import { sessionLabel } from '../data/sessions'
import logoIcon from '../assets/Iteme_logo.svg'
import BottomSheet from './BottomSheet'
import IconField from './IconField'
import LoadingSpinner from './LoadingSpinner'

const expenseCategories = ['rent', 'salaries', 'equipment', 'marketing', 'utilities', 'other']
const paymentMethods = ['mobile_money', 'card', 'cash', 'bank_transfer']

// Sequential (single-hue) shading: rank 0 = darkest/heaviest, fading toward
// the lightest permitted step so the "more is darker" convention holds
// without introducing a categorical palette for categories with no
// established brand color.
function sequentialOpacity(index, total) {
  if (total <= 1) return 1
  const min = 0.35
  return 1 - (index / (total - 1)) * (1 - min)
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl bg-black px-3 py-2 text-xs font-semibold text-white shadow-lg">
      {label && <p className="mb-0.5 font-normal text-white/60">{label}</p>}
      <p>{formatRWF(payload[0].value)}</p>
    </div>
  )
}

function Finance() {
  const toast = useToast()
  const { enrollments, loading: enrollmentsLoading } = useAllEnrollments()
  const [payments, setPayments] = useState([])
  const [expenses, setExpenses] = useState([])
  const [fixedExpenses, setFixedExpenses] = useState([])
  const [loading, setLoading] = useState(true)

  const [paymentForm, setPaymentForm] = useState({
    enrollmentId: '',
    amount: '',
    method: 'mobile_money',
    note: '',
  })
  const [paymentSearch, setPaymentSearch] = useState('')
  const [expenseForm, setExpenseForm] = useState({
    category: 'rent',
    description: '',
    amount: '',
    fixedExpenseId: '',
  })
  const [fixedForm, setFixedForm] = useState({ label: '', category: 'rent', amount: '' })
  const [savingPayment, setSavingPayment] = useState(false)
  const [savingExpense, setSavingExpense] = useState(false)
  const [savingFixed, setSavingFixed] = useState(false)
  const [formError, setFormError] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showFixedForm, setShowFixedForm] = useState(false)
  const [receiptTarget, setReceiptTarget] = useState(null)

  function loadFinance() {
    setLoading(true)
    return Promise.all([
      supabase
        .from('payments')
        .select('*, profiles(full_name)')
        .order('paid_at', { ascending: false }),
      supabase.from('expenses').select('*').order('spent_at', { ascending: false }),
      supabase.from('fixed_expenses').select('*').eq('active', true).order('category').order('label'),
    ]).then(([paymentsRes, expensesRes, fixedRes]) => {
      if (paymentsRes.error) console.error('Could not load payments:', paymentsRes.error)
      if (expensesRes.error) console.error('Could not load expenses:', expensesRes.error)
      if (fixedRes.error) console.error('Could not load fixed expenses:', fixedRes.error)
      setPayments(paymentsRes.data || [])
      setExpenses(expensesRes.data || [])
      setFixedExpenses(fixedRes.data || [])
      setLoading(false)
    })
  }

  useEffect(() => {
    loadFinance()
  }, [])

  const enrollmentById = useMemo(() => {
    const map = new Map()
    enrollments.forEach((e) => map.set(e.id, e))
    return map
  }, [enrollments])

  const activeEnrollments = useMemo(
    () => enrollments.filter((e) => e.approval_status === 'approved' && e.status === 'active'),
    [enrollments]
  )

  const matchingEnrollments = useMemo(() => {
    const q = paymentSearch.trim().toLowerCase()
    if (!q) return activeEnrollments
    return activeEnrollments.filter((e) => {
      const p = e.profiles
      return (
        p?.full_name?.toLowerCase().includes(q) ||
        p?.email?.toLowerCase().includes(q) ||
        p?.phone?.includes(q) ||
        p?.student_code?.includes(q) ||
        p?.id_passport?.includes(q)
      )
    })
  }, [activeEnrollments, paymentSearch])

  const selectedPaymentEnrollment = enrollmentById.get(paymentForm.enrollmentId)

  const paidByEnrollment = useMemo(() => {
    const map = new Map()
    payments.forEach((p) => {
      map.set(p.enrollment_id, (map.get(p.enrollment_id) || 0) + Number(p.amount))
    })
    return map
  }, [payments])

  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const netProfit = totalRevenue - totalExpenses

  const revenueTrend = useMemo(() => {
    const now = new Date()
    const months = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-US', { month: 'short' }), amount: 0 })
    }
    const byKey = new Map(months.map((m) => [m.key, m]))
    payments.forEach((p) => {
      const d = new Date(p.paid_at)
      const bucket = byKey.get(`${d.getFullYear()}-${d.getMonth()}`)
      if (bucket) bucket.amount += Number(p.amount)
    })
    return months
  }, [payments])

  const revenueByProgram = useMemo(() => {
    const map = new Map()
    payments.forEach((p) => {
      const program = enrollmentById.get(p.enrollment_id)?.program
      const key = program?.id || 'unknown'
      const existing = map.get(key) || {
        id: key,
        name: program?.name || 'Unknown',
        color: program?.color || '#0b0b0b',
        amount: 0,
      }
      existing.amount += Number(p.amount)
      map.set(key, existing)
    })
    return [...map.values()].sort((a, b) => b.amount - a.amount)
  }, [payments, enrollmentById])

  const expensesByCategory = useMemo(() => {
    const map = new Map()
    expenses.forEach((e) => {
      map.set(e.category, (map.get(e.category) || 0) + Number(e.amount))
    })
    return [...map.entries()]
      .map(([category, amount]) => ({
        category: category.charAt(0).toUpperCase() + category.slice(1),
        amount,
      }))
      .sort((a, b) => b.amount - a.amount)
  }, [expenses])

  const outstanding = useMemo(() => {
    return activeEnrollments
      .map((e) => {
        const expected = Number(e.fee) || 0
        const paid = paidByEnrollment.get(e.id) || 0
        return { ...e, expected, paid, balance: expected - paid }
      })
      .filter((e) => e.balance > 0)
      .sort((a, b) => b.balance - a.balance)
  }, [activeEnrollments, paidByEnrollment])

  const expectedTuition = activeEnrollments.reduce((sum, e) => sum + (Number(e.fee) || 0), 0)
  const outstandingTuitionTotal = outstanding.reduce((sum, e) => sum + e.balance, 0)

  const fixedExpensesWithProgress = useMemo(() => {
    const now = new Date()
    const paidThisMonth = new Map()
    expenses.forEach((e) => {
      if (!e.fixed_expense_id) return
      const d = new Date(e.spent_at)
      if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth()) return
      paidThisMonth.set(e.fixed_expense_id, (paidThisMonth.get(e.fixed_expense_id) || 0) + Number(e.amount))
    })
    return fixedExpenses.map((f) => {
      const paid = paidThisMonth.get(f.id) || 0
      return { ...f, paidThisMonth: paid, remaining: Math.max(0, Number(f.amount) - paid) }
    })
  }, [fixedExpenses, expenses])

  const totalExpectedFixed = fixedExpenses.reduce((sum, f) => sum + Number(f.amount), 0)
  const totalPaidFixed = fixedExpensesWithProgress.reduce((sum, f) => sum + f.paidThisMonth, 0)

  const transactions = useMemo(() => {
    const paymentRows = payments.map((p) => ({
      id: `payment-${p.id}`,
      paymentId: p.id,
      date: p.paid_at,
      type: 'in',
      label: enrollmentById.get(p.enrollment_id)?.profiles?.full_name || 'Unknown student',
      sub: `${enrollmentById.get(p.enrollment_id)?.program?.name || ''} · ${p.method.replace('_', ' ')}`,
      amount: Number(p.amount),
    }))
    const expenseRows = expenses.map((e) => ({
      id: `expense-${e.id}`,
      date: e.spent_at,
      type: 'out',
      label: e.description || e.category,
      sub: e.category,
      amount: Number(e.amount),
    }))
    return [...paymentRows, ...expenseRows].sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [payments, expenses, enrollmentById])

  async function handleAddPayment(e) {
    e.preventDefault()
    setFormError('')
    if (!paymentForm.enrollmentId || !paymentForm.amount) {
      setFormError('Pick a student and enter an amount.')
      return
    }
    setSavingPayment(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('payments').insert({
      enrollment_id: paymentForm.enrollmentId,
      amount: Number(paymentForm.amount),
      method: paymentForm.method,
      note: paymentForm.note || null,
      recorded_by: userData?.user?.id,
    })
    setSavingPayment(false)
    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }
    setPaymentForm({ enrollmentId: '', amount: '', method: 'mobile_money', note: '' })
    setPaymentSearch('')
    setShowPaymentForm(false)
    toast.success(`Payment of ${formatRWF(Number(paymentForm.amount))} recorded.`)
    loadFinance()
  }

  function openReceipt(paymentId) {
    const payment = payments.find((p) => p.id === paymentId)
    if (!payment) return

    const enrollment = enrollmentById.get(payment.enrollment_id)
    const fee = Number(enrollment?.fee) || 0
    const paidSoFar = paidByEnrollment.get(payment.enrollment_id) || 0

    setReceiptTarget({
      receiptNo: payment.id.slice(0, 8).toUpperCase(),
      date: payment.paid_at,
      studentName: enrollment?.profiles?.full_name || 'Unknown student',
      programName: enrollment?.program?.name || enrollment?.program_id || '',
      session: enrollment?.session,
      amount: Number(payment.amount),
      method: payment.method,
      note: payment.note,
      recordedBy: payment.profiles?.full_name,
      fee,
      paidSoFar,
      balance: Math.max(fee - paidSoFar, 0),
    })
    // Let React commit the new print content before the browser snapshots
    // the page for printing.
    setTimeout(() => window.print(), 0)
  }

  async function handleAddExpense(e) {
    e.preventDefault()
    setFormError('')
    if (!expenseForm.amount) {
      setFormError('Enter an amount.')
      return
    }
    setSavingExpense(true)
    const { data: userData } = await supabase.auth.getUser()
    const { error } = await supabase.from('expenses').insert({
      category: expenseForm.category,
      description: expenseForm.description || null,
      amount: Number(expenseForm.amount),
      recorded_by: userData?.user?.id,
      fixed_expense_id: expenseForm.fixedExpenseId || null,
    })
    setSavingExpense(false)
    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }
    setExpenseForm({ category: 'rent', description: '', amount: '', fixedExpenseId: '' })
    setShowExpenseForm(false)
    toast.success(`Expense of ${formatRWF(Number(expenseForm.amount))} recorded.`)
    loadFinance()
  }

  async function handleAddFixed(e) {
    e.preventDefault()
    setFormError('')
    if (!fixedForm.label || !fixedForm.amount) {
      setFormError('Enter a label and amount.')
      return
    }
    setSavingFixed(true)
    const { error } = await supabase.from('fixed_expenses').insert({
      label: fixedForm.label,
      category: fixedForm.category,
      amount: Number(fixedForm.amount),
    })
    setSavingFixed(false)
    if (error) {
      setFormError(error.message)
      toast.error(error.message)
      return
    }
    setFixedForm({ label: '', category: 'rent', amount: '' })
    setShowFixedForm(false)
    toast.success(`${fixedForm.label} added as a fixed cost.`)
    loadFinance()
  }

  if (loading || enrollmentsLoading) {
    return (
      <div className="flex justify-center py-24">
        <LoadingSpinner />
      </div>
    )
  }

  return (
    <div className="px-4 py-6 md:px-8">
      <div className="print:hidden">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-slate-900 sm:text-3xl">Finance</h1>
          <p className="text-sm text-slate-500">Revenue, expenses, and outstanding balances.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setFormError('')
              setPaymentSearch('')
              setShowPaymentForm(true)
            }}
            className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-all hover:scale-[1.02] hover:bg-gray-800"
          >
            <i className="fa-solid fa-money-bill-wave"></i>
            Record payment
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError('')
              setShowExpenseForm(true)
            }}
            className="flex items-center gap-2 rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-black/5"
          >
            <i className="fa-solid fa-receipt"></i>
            Record expense
          </button>
          <button
            type="button"
            onClick={() => {
              setFormError('')
              setShowFixedForm(true)
            }}
            className="flex items-center gap-2 rounded-full border border-black/15 px-5 py-2.5 text-sm font-medium text-slate-900 transition-colors hover:bg-black/5"
          >
            <i className="fa-solid fa-calendar-check"></i>
            Add fixed cost
          </button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard value={formatRWF(totalRevenue)} label="Total revenue" tone="text-teal-600" />
        <StatCard value={formatRWF(totalExpenses)} label="Total expenses" tone="text-red-500" />
        <StatCard
          value={formatRWF(netProfit)}
          label="Net"
          tone={netProfit >= 0 ? 'text-slate-900' : 'text-red-500'}
        />
      </div>

      <div className="mb-6">
        <h2 className="mb-3 font-serif text-lg font-bold text-slate-900">Tuition forecast</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard value={formatRWF(expectedTuition)} label="Expected from active students" />
          <StatCard value={formatRWF(totalRevenue)} label="Received so far" tone="text-teal-600" />
          <StatCard value={formatRWF(outstandingTuitionTotal)} label="Still owed" tone="text-red-500" />
        </div>
      </div>

      <div className="mb-6 rounded-3xl bg-[#F4F4F6] p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Revenue trend</h2>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={revenueTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0b0b0b" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#0b0b0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#e1e0d9" />
              <XAxis
                dataKey="label"
                axisLine={{ stroke: '#c3c2b7' }}
                tickLine={false}
                tick={{ fill: '#898781', fontSize: 12 }}
              />
              <YAxis hide />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="amount"
                stroke="#0b0b0b"
                strokeWidth={2}
                strokeLinecap="round"
                fill="url(#revenueFill)"
                dot={{ r: 4, fill: '#0b0b0b', strokeWidth: 2, stroke: '#F4F4F6' }}
                activeDot={{ r: 6, fill: '#0b0b0b', strokeWidth: 2, stroke: '#F4F4F6' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl bg-[#F4F4F6] p-5">
          <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Revenue by program</h2>
          {revenueByProgram.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No payments recorded yet.</p>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={revenueByProgram}
                  margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#0b0b0b', fontSize: 12, fontWeight: 600 }}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                  <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
                    {revenueByProgram.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                    <LabelList
                      dataKey="amount"
                      position="right"
                      formatter={formatRWF}
                      fill="#0b0b0b"
                      fontSize={12}
                      fontWeight={600}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-[#F4F4F6] p-5">
          <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Outstanding balances</h2>
          {outstanding.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Everyone's paid up.</p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {outstanding.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{e.profiles?.full_name}</p>
                    <p className="truncate text-xs text-slate-400">{e.program?.name}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-red-500">{formatRWF(e.balance)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl bg-[#F4F4F6] p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Expenses by category</h2>
        {expensesByCategory.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No expenses recorded yet.</p>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={expensesByCategory}
                margin={{ top: 0, right: 56, left: 0, bottom: 0 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="category"
                  width={90}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#0b0b0b', fontSize: 12, fontWeight: 600 }}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                <Bar dataKey="amount" radius={[0, 4, 4, 0]} maxBarSize={24}>
                  {expensesByCategory.map((entry, i) => (
                    <Cell
                      key={entry.category}
                      fill="#0b0b0b"
                      fillOpacity={sequentialOpacity(i, expensesByCategory.length)}
                    />
                  ))}
                  <LabelList
                    dataKey="amount"
                    position="right"
                    formatter={formatRWF}
                    fill="#0b0b0b"
                    fontSize={12}
                    fontWeight={600}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-3xl bg-[#F4F4F6] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-bold text-slate-900">Payroll & fixed costs</h2>
          <p className="text-xs text-slate-500">
            {formatRWF(totalPaidFixed)} paid of {formatRWF(totalExpectedFixed)} expected this month
          </p>
        </div>
        {fixedExpensesWithProgress.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No recurring costs yet — add rent or a teacher's salary.
          </p>
        ) : (
          <div className="space-y-3">
            {fixedExpensesWithProgress.map((f) => (
              <div key={f.id} className="rounded-2xl bg-white p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">{f.label}</p>
                    <p className="truncate text-xs capitalize text-slate-400">{f.category}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">{formatRWF(f.amount)}/mo</p>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F4F4F6]">
                  <div
                    className={`h-full rounded-full ${f.remaining === 0 ? 'bg-teal-500' : 'bg-slate-900'}`}
                    style={{ width: `${Math.min(100, (f.paidThisMonth / Number(f.amount)) * 100)}%` }}
                  ></div>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  {f.remaining === 0
                    ? 'Paid in full this month'
                    : `${formatRWF(f.remaining)} still owed this month`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showPaymentForm && (
          <BottomSheet onClose={() => setShowPaymentForm(false)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">Record a payment</h2>
            <p className="mb-6 text-sm text-muted">Log money received from a student.</p>

            <form onSubmit={handleAddPayment} className="space-y-3">
              {selectedPaymentEnrollment ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-accent">
                      {selectedPaymentEnrollment.profiles?.full_name}
                    </p>
                    <p className="truncate text-xs text-muted">{selectedPaymentEnrollment.program?.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPaymentForm({ ...paymentForm, enrollmentId: '' })}
                    className="shrink-0 text-xs font-semibold text-accent underline underline-offset-4"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <div>
                  <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                    <i className="fa-solid fa-magnifying-glass text-muted"></i>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Search by name, email, phone, or Student ID..."
                      className="w-full bg-transparent text-sm text-accent outline-none placeholder:text-muted"
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                    />
                  </label>

                  <div className="mt-2 max-h-52 space-y-1 overflow-y-auto">
                    {matchingEnrollments.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted">No matching active students.</p>
                    ) : (
                      matchingEnrollments.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => {
                            setPaymentForm({ ...paymentForm, enrollmentId: e.id })
                            setPaymentSearch('')
                          }}
                          className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-darker"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-accent">
                              {e.profiles?.full_name}
                            </p>
                            <p className="truncate text-xs text-muted">
                              {e.program?.name}
                              {e.profiles?.student_code ? ` · #${e.profiles.student_code}` : ''}
                              {e.profiles?.email ? ` · ${e.profiles.email}` : ''}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}

              <IconField
                icon="fa-money-bill"
                type="number"
                min="1"
                placeholder="Amount (RWF)"
                value={paymentForm.amount}
                onChange={(v) => setPaymentForm({ ...paymentForm, amount: v })}
              />

              <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                <i className="fa-solid fa-credit-card text-muted"></i>
                <select
                  className="w-full bg-transparent text-sm text-accent outline-none"
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, method: e.target.value })}
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </label>

              <IconField
                icon="fa-note-sticky"
                placeholder="Note (optional)"
                value={paymentForm.note}
                onChange={(v) => setPaymentForm({ ...paymentForm, note: v })}
              />

              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={savingPayment}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-money-bill-wave"></i>
                {savingPayment ? 'Saving...' : 'Add payment'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showExpenseForm && (
          <BottomSheet onClose={() => setShowExpenseForm(false)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">Record an expense</h2>
            <p className="mb-6 text-sm text-muted">Log money spent by the school.</p>

            <form onSubmit={handleAddExpense} className="space-y-3">
              <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                <i className="fa-solid fa-tags text-muted"></i>
                <select
                  className="w-full bg-transparent text-sm text-accent outline-none"
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              {fixedExpenses.length > 0 && (
                <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                  <i className="fa-solid fa-calendar-check text-muted"></i>
                  <select
                    className="w-full bg-transparent text-sm text-accent outline-none"
                    value={expenseForm.fixedExpenseId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, fixedExpenseId: e.target.value })}
                  >
                    <option value="">Ad-hoc (not a recurring cost)</option>
                    {fixedExpenses.map((f) => (
                      <option key={f.id} value={f.id}>
                        Applies to: {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <IconField
                icon="fa-align-left"
                placeholder="Description (optional)"
                value={expenseForm.description}
                onChange={(v) => setExpenseForm({ ...expenseForm, description: v })}
              />

              <IconField
                icon="fa-money-bill"
                type="number"
                min="1"
                placeholder="Amount (RWF)"
                value={expenseForm.amount}
                onChange={(v) => setExpenseForm({ ...expenseForm, amount: v })}
              />

              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={savingExpense}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-receipt"></i>
                {savingExpense ? 'Saving...' : 'Add expense'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showFixedForm && (
          <BottomSheet onClose={() => setShowFixedForm(false)}>
            <h2 className="mb-1 font-serif text-2xl font-bold text-accent">Add a fixed cost</h2>
            <p className="mb-6 text-sm text-muted">
              A recurring monthly obligation — rent, a salary, a subscription.
            </p>

            <form onSubmit={handleAddFixed} className="space-y-3">
              <IconField
                icon="fa-tag"
                placeholder="Label (e.g. Studio rent)"
                value={fixedForm.label}
                onChange={(v) => setFixedForm({ ...fixedForm, label: v })}
              />

              <label className="flex items-center gap-3 rounded-lg border border-black/15 bg-darker px-4 py-3">
                <i className="fa-solid fa-tags text-muted"></i>
                <select
                  className="w-full bg-transparent text-sm text-accent outline-none"
                  value={fixedForm.category}
                  onChange={(e) => setFixedForm({ ...fixedForm, category: e.target.value })}
                >
                  {expenseCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>

              <IconField
                icon="fa-money-bill"
                type="number"
                min="1"
                placeholder="Amount per month (RWF)"
                value={fixedForm.amount}
                onChange={(v) => setFixedForm({ ...fixedForm, amount: v })}
              />

              {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

              <button
                type="submit"
                disabled={savingFixed}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
              >
                <i className="fa-solid fa-calendar-check"></i>
                {savingFixed ? 'Saving...' : 'Add fixed cost'}
              </button>
            </form>
          </BottomSheet>
        )}
      </AnimatePresence>

      <div className="mt-6 rounded-3xl bg-[#F4F4F6] p-5">
        <h2 className="mb-4 font-serif text-lg font-bold text-slate-900">Recent transactions</h2>
        {transactions.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 20).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-2xl bg-white p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{t.label}</p>
                  <p className="truncate text-xs text-slate-400">
                    {t.sub} · {new Date(t.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <p
                    className={`text-sm font-semibold ${
                      t.type === 'in' ? 'text-teal-600' : 'text-red-500'
                    }`}
                  >
                    {t.type === 'in' ? '+' : '-'}
                    {formatRWF(t.amount)}
                  </p>
                  {t.type === 'in' && (
                    <button
                      type="button"
                      onClick={() => openReceipt(t.paymentId)}
                      aria-label="Print receipt"
                      title="Print receipt"
                      className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-black/5 hover:text-slate-900"
                    >
                      <i className="fa-solid fa-receipt text-xs"></i>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {receiptTarget && (
        <div className="hidden print:block">
          <div className="mb-6 flex items-center justify-between border-b-2 border-black pb-4">
            <div className="flex items-center gap-3">
              <img src={logoIcon} alt="" className="h-12 w-12 object-contain" />
              <div>
                <p className="font-serif text-lg font-bold text-black">ITEME HUB</p>
                <p className="text-xs uppercase tracking-wide text-black/60">Payment Receipt</p>
              </div>
            </div>
            <div className="text-right text-xs text-black/60">
              <p>Receipt No. {receiptTarget.receiptNo}</p>
              <p>{new Date(receiptTarget.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
          </div>

          <div className="space-y-4 text-sm text-black">
            <ReceiptRow label="Received From" value={receiptTarget.studentName} />
            <ReceiptRow
              label="For"
              value={`${receiptTarget.programName}${receiptTarget.session ? ` · ${sessionLabel(receiptTarget.session)} session` : ''}`}
            />
            <ReceiptRow label="Payment Method" value={receiptTarget.method.replace('_', ' ')} />
            {receiptTarget.note && <ReceiptRow label="Note" value={receiptTarget.note} />}
            {receiptTarget.recordedBy && <ReceiptRow label="Recorded By" value={receiptTarget.recordedBy} />}

            <div className="mt-4 flex items-center justify-between border-y-2 border-black py-4">
              <p className="font-serif text-lg font-bold text-black">Amount Paid</p>
              <p className="font-serif text-2xl font-bold text-black">{formatRWF(receiptTarget.amount)}</p>
            </div>

            {receiptTarget.fee > 0 && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-semibold text-black">{formatRWF(receiptTarget.fee)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-black/50">Total Fee</p>
                </div>
                <div>
                  <p className="font-semibold text-black">{formatRWF(receiptTarget.paidSoFar)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-black/50">Paid to Date</p>
                </div>
                <div>
                  <p className="font-semibold text-black">{formatRWF(receiptTarget.balance)}</p>
                  <p className="text-[10px] uppercase tracking-wide text-black/50">Balance Owing</p>
                </div>
              </div>
            )}

            <div className="flex items-end justify-between pt-10">
              <div className="w-56 border-t border-black pt-1 text-xs text-black/60">
                Finance office signature
              </div>
              <p className="text-xs text-black/40">Thank you for your payment.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReceiptRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-black/20 pb-2">
      <span className="font-semibold text-black">{label}</span>
      <span className="capitalize text-black/80">{value}</span>
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

export default Finance
