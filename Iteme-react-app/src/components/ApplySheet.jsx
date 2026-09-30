import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { enrollmentStatus } from '../config/enrollment'
import { formatRWF } from '../data/programs'
import { SESSION_TYPES, sessionLabel } from '../data/sessions'
import { usePrograms } from '../hooks/usePrograms'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import BottomSheet from './BottomSheet'
import LoadingSpinner from './LoadingSpinner'

const APPLICATION_FEE_ENABLED = false
const APPLICATION_FEE = 5000

const incomeBrackets = [
  'Below 500,000 RWF / year',
  '500,000 – 1,500,000 RWF / year',
  '1,500,000 – 3,000,000 RWF / year',
  'Above 3,000,000 RWF / year',
]

const paymentMethods = [
  { id: 'mobile_money', label: 'Mobile Money', icon: 'fa-mobile-screen-button' },
  { id: 'card', label: 'Card', icon: 'fa-credit-card' },
]

const steps = ['Session', 'Enrollment', 'Payment', 'Review']

const initialData = {
  sessionSlot: '',
  enrollmentType: 'full',
  hasExperience: null,
  paymentMethod: 'mobile_money',
  householdIncome: '',
  scholarshipReason: '',
}

function ApplySheet() {
  const { applyProgramId, closeApply } = useAuth()

  return (
    <AnimatePresence>
      {applyProgramId && <ApplyContent programId={applyProgramId} onClose={closeApply} />}
    </AnimatePresence>
  )
}

function ApplyContent({ programId, onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { programs, loading: programsLoading } = usePrograms()
  const selectedProgram = programs.find((p) => p.id === programId)

  const [step, setStep] = useState(0)
  const [data, setData] = useState(initialData)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    if (!selectedProgram || data.sessionSlot) return
    const firstSession = Object.keys(selectedProgram.schedule)[0]
    if (firstSession) setData((prev) => ({ ...prev, sessionSlot: firstSession }))
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only seed the default once the program loads
  }, [selectedProgram])

  if (programsLoading) {
    return (
      <BottomSheet onClose={onClose}>
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      </BottomSheet>
    )
  }

  if (!selectedProgram) return null

  if (!enrollmentStatus.isOpen) {
    return (
      <BottomSheet onClose={onClose}>
        <div className="text-center">
          <i className="fa-solid fa-calendar-days mb-4 text-4xl text-accent"></i>

          <h1 className="mb-3 font-serif text-2xl font-semibold text-accent">
            Enrollment is currently closed
          </h1>

          <p className="text-muted">
            Applications for this cohort have closed. Our next enrollment
            window opens on{' '}
            <span className="font-semibold text-accent">
              {enrollmentStatus.nextEnrollmentDate}
            </span>
            .
          </p>
        </div>
      </BottomSheet>
    )
  }

  function update(field, value) {
    setData((prev) => ({ ...prev, [field]: value }))
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function validateStep(current) {
    const next = {}

    if (current === 0 && !data.sessionSlot) {
      next.sessionSlot = 'Select a session'
    }

    if (current === 1 && data.enrollmentType === 'scholarship') {
      if (!data.householdIncome) next.householdIncome = 'Select a household income range'
      if (!data.scholarshipReason.trim()) next.scholarshipReason = 'This field is required'
    }

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleNext() {
    if (validateStep(step)) {
      setStep((s) => Math.min(s + 1, steps.length - 1))
    }
  }

  function handleBack() {
    setErrors({})
    setStep((s) => Math.max(s - 1, 0))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!validateStep(step)) return

    setSubmitting(true)
    setSubmitError('')

    const { error } = await supabase.from('enrollments').upsert(
      {
        student_id: user.id,
        program_id: selectedProgram.id,
        session: data.sessionSlot,
        status: 'active',
        approval_status: 'pending',
        application_fee_paid: APPLICATION_FEE_ENABLED,
        payment_method: data.paymentMethod,
        enrollment_type: data.enrollmentType,
        has_experience: data.hasExperience,
        household_income: data.enrollmentType === 'scholarship' ? data.householdIncome : null,
        scholarship_reason:
          data.enrollmentType === 'scholarship' ? data.scholarshipReason : null,
      },
      { onConflict: 'student_id,program_id' }
    )

    setSubmitting(false)

    if (error) {
      setSubmitError(error.message || 'Something went wrong submitting your application.')
      return
    }

    setSubmitted(true)
  }

  function handleGoToDashboard() {
    onClose()
    navigate('/dashboard')
  }

  return (
    <BottomSheet onClose={onClose} maxWidthClassName="sm:max-w-2xl">
      <div className="mb-6 flex items-center gap-4">
        <div className="img-overlay h-14 w-14 shrink-0 overflow-hidden rounded-xl">
          <img
            alt={selectedProgram.name}
            src={selectedProgram.image}
            className="h-full w-full object-cover grayscale"
          />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Applying for
          </p>
          <p className="font-serif text-lg font-semibold text-accent">{selectedProgram.name}</p>
        </div>
      </div>

      {submitted ? (
        <Confirmation
          data={data}
          selectedProgram={selectedProgram}
          onGoToDashboard={handleGoToDashboard}
        />
      ) : (
        <>
          <Stepper step={step} />

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {step === 0 && (
              <StepSession data={data} update={update} selectedProgram={selectedProgram} />
            )}

            {step === 1 && (
              <StepEnrollment
                data={data}
                errors={errors}
                update={update}
                selectedProgram={selectedProgram}
              />
            )}

            {step === 2 && <StepPayment data={data} update={update} />}

            {step === 3 && <StepReview data={data} selectedProgram={selectedProgram} />}

            {submitError && <p className="text-sm font-medium text-red-600">{submitError}</p>}

            <div className="flex items-center justify-between pt-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={step === 0}
                className="rounded-full px-6 py-3 text-sm font-medium text-accent transition-opacity disabled:opacity-0"
              >
                Back
              </button>

              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-[1.02] hover:bg-gray-800 disabled:opacity-60"
                >
                  {submitting
                    ? 'Submitting...'
                    : APPLICATION_FEE_ENABLED
                      ? `Pay ${formatRWF(APPLICATION_FEE)} & Submit`
                      : 'Submit Application'}
                </button>
              )}
            </div>
          </form>
        </>
      )}
    </BottomSheet>
  )
}

function Stepper({ step }) {
  return (
    <div className="flex items-center">
      {steps.map((label, index) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-2">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-colors ${
                index < step
                  ? 'border-accent bg-accent text-white'
                  : index === step
                    ? 'border-accent text-accent'
                    : 'border-black/20 text-muted'
              }`}
            >
              {index < step ? <i className="fa-solid fa-check text-xs"></i> : index + 1}
            </div>
            <span
              className={`hidden text-center text-xs font-semibold sm:block ${
                index <= step ? 'text-accent' : 'text-muted'
              }`}
            >
              {label}
            </span>
          </div>

          {index < steps.length - 1 && (
            <div
              className={`mx-2 h-px flex-1 transition-colors ${
                index < step ? 'bg-accent' : 'bg-black/10'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

function StepSession({ data, update, selectedProgram }) {
  const availableSessions = Object.entries(selectedProgram.schedule)

  return (
    <div className="space-y-6">
      <span className="mb-2 block text-sm font-semibold text-accent">
        Which session works for you?
      </span>

      {availableSessions.length === 0 ? (
        <p className="text-sm text-muted">
          This program doesn't have any sessions open yet — check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {availableSessions.map(([id, info]) => {
            const sessionType = SESSION_TYPES.find((s) => s.id === id)
            return (
              <RadioCard
                key={id}
                selected={data.sessionSlot === id}
                onClick={() => update('sessionSlot', id)}
                icon={sessionType?.icon || 'fa-clock'}
                title={sessionLabel(id)}
                description={info.time}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function StepEnrollment({ data, errors, update, selectedProgram }) {
  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block text-sm font-semibold text-accent">
          Do you already have experience in this area?
        </span>

        <div className="grid grid-cols-2 gap-4">
          <RadioCard
            selected={data.hasExperience === true}
            onClick={() => update('hasExperience', true)}
            icon="fa-check"
            title="Yes"
          />
          <RadioCard
            selected={data.hasExperience === false}
            onClick={() => update('hasExperience', false)}
            icon="fa-xmark"
            title="No"
          />
        </div>
      </div>

      <div>
        <span className="mb-2 block text-sm font-semibold text-accent">
          How would you like to enroll?
        </span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <RadioCard
            selected={data.enrollmentType === 'full'}
            onClick={() => update('enrollmentType', 'full')}
            icon="fa-money-bill-wave"
            title="Pay full fee"
            description={formatRWF(selectedProgram.fee)}
          />

          <RadioCard
            selected={data.enrollmentType === 'scholarship'}
            onClick={() => update('enrollmentType', 'scholarship')}
            icon="fa-graduation-cap"
            title="Apply for a scholarship"
            description="Financial aid based on need"
          />
        </div>
      </div>

      {data.enrollmentType === 'scholarship' && (
        <div className="space-y-6">
          <Field
            label="Household income range"
            htmlFor="householdIncome"
            error={errors.householdIncome}
          >
            <select
              id="householdIncome"
              className="input"
              value={data.householdIncome}
              onChange={(e) => update('householdIncome', e.target.value)}
            >
              <option value="" disabled>
                Select a range
              </option>
              {incomeBrackets.map((bracket) => (
                <option key={bracket} value={bracket}>
                  {bracket}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Why are you requesting a scholarship?"
            htmlFor="scholarshipReason"
            error={errors.scholarshipReason}
          >
            <textarea
              id="scholarshipReason"
              rows="4"
              className="input resize-none"
              placeholder="Tell us about your financial situation and goals..."
              value={data.scholarshipReason}
              onChange={(e) => update('scholarshipReason', e.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function StepPayment({ data, update }) {
  return (
    <div className="space-y-6">
      <div>
        <span className="mb-2 block text-sm font-semibold text-accent">Payment method</span>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {paymentMethods.map((method) => (
            <RadioCard
              key={method.id}
              selected={data.paymentMethod === method.id}
              onClick={() => update('paymentMethod', method.id)}
              icon={method.icon}
              title={method.label}
            />
          ))}
        </div>
      </div>

      {APPLICATION_FEE_ENABLED ? (
        <div className="rounded-lg border border-accent/30 bg-white p-4">
          <p className="text-sm font-semibold text-accent">Application fee</p>
          <p className="text-2xl font-bold text-accent">{formatRWF(APPLICATION_FEE)}</p>
          <p className="mt-1 text-sm text-muted">
            A one-time fee required to submit and process your application, charged via{' '}
            {paymentMethods.find((m) => m.id === data.paymentMethod)?.label.toLowerCase()}.
            {data.enrollmentType === 'full'
              ? ' Your program tuition will be due separately after your application is approved.'
              : ' Your scholarship request will be reviewed after this fee is paid.'}
          </p>
        </div>
      ) : (
        <p className="rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-muted">
          No payment is required to submit your application right now.
        </p>
      )}
    </div>
  )
}

function StepReview({ data, selectedProgram }) {
  const isScholarship = data.enrollmentType === 'scholarship'

  return (
    <div className="space-y-6">
      <ReviewRow label="Program" value={selectedProgram.name} />
      <ReviewRow label="Session" value={sessionLabel(data.sessionSlot)} />
      <ReviewRow
        label="Enrollment type"
        value={isScholarship ? 'Scholarship application' : 'Full payment'}
      />

      {isScholarship && <ReviewRow label="Household income" value={data.householdIncome} />}

      <ReviewRow
        label="Payment method"
        value={paymentMethods.find((m) => m.id === data.paymentMethod)?.label}
      />

      {APPLICATION_FEE_ENABLED ? (
        <div className="rounded-lg border border-accent/30 bg-white p-4">
          <p className="text-sm font-semibold text-accent">Due now</p>
          <p className="text-2xl font-bold text-accent">{formatRWF(APPLICATION_FEE)}</p>
          <p className="mt-1 text-sm text-muted">
            {isScholarship
              ? 'Application fee only — tuition is waived pending scholarship review.'
              : `Application fee. Program tuition of ${formatRWF(selectedProgram.fee)} is due after approval.`}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-accent/30 bg-white p-4">
          <p className="text-sm font-semibold text-accent">Due now</p>
          <p className="text-2xl font-bold text-accent">0 RWF</p>
          <p className="mt-1 text-sm text-muted">
            {isScholarship
              ? 'Tuition is waived pending scholarship review.'
              : `Program tuition of ${formatRWF(selectedProgram.fee)} is due after approval.`}
          </p>
        </div>
      )}
    </div>
  )
}

function Confirmation({ data, selectedProgram, onGoToDashboard }) {
  const isScholarship = data.enrollmentType === 'scholarship'

  return (
    <div className="py-4 text-center">
      <i className="fa-solid fa-circle-check mb-4 text-4xl text-accent"></i>

      <h2 className="mb-2 font-serif text-2xl font-semibold text-accent">
        Application submitted
      </h2>

      <p className="mx-auto max-w-sm text-muted">
        Your application for {selectedProgram.name} has been received.{' '}
        {isScholarship
          ? 'Our financial aid committee will review your scholarship request.'
          : `Once approved, you'll receive payment instructions for your ${formatRWF(selectedProgram.fee)} tuition.`}{' '}
        You can track your approval status from your dashboard.
      </p>

      <button
        type="button"
        onClick={onGoToDashboard}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-105 hover:bg-gray-800"
      >
        Go to Dashboard
        <i className="fa-solid fa-arrow-right text-xs"></i>
      </button>
    </div>
  )
}

function RadioCard({ selected, onClick, icon, title, description }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        selected
          ? 'border-accent bg-white'
          : 'border-black/10 bg-white hover:border-black/30'
      }`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          selected ? 'bg-accent text-white' : 'bg-darker text-accent'
        }`}
      >
        <i className={`fa-solid ${icon} text-sm`}></i>
      </div>

      <div>
        <p className="text-sm font-semibold text-accent">{title}</p>
        {description && <p className="text-xs text-muted">{description}</p>}
      </div>
    </button>
  )
}

function ReviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-black/10 pb-3 text-sm">
      <span className="font-semibold text-accent">{label}</span>
      <span className="max-w-[60%] truncate text-right text-muted">{value || '—'}</span>
    </div>
  )
}

function Field({ label, htmlFor, error, children }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-accent">
        {label}
      </label>
      {children}
      {error && <p className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  )
}

export default ApplySheet
