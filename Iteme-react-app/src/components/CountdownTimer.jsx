import { useEffect, useState } from 'react'
import { enrollmentStatus } from '../config/enrollment'

function getTimeLeft() {
  const diff = new Date(enrollmentStatus.applicationDeadline).getTime() - Date.now()
  if (diff <= 0) return null

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function CountdownTimer({ className = '' }) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const interval = setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => clearInterval(interval)
  }, [])

  if (!enrollmentStatus.isOpen || !timeLeft) return null

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <TimeBlock value={timeLeft.days} label="Days" />
      <Colon />
      <TimeBlock value={timeLeft.hours} label="Hrs" />
      <Colon />
      <TimeBlock value={timeLeft.minutes} label="Min" />
      <Colon />
      <TimeBlock value={timeLeft.seconds} label="Sec" />
    </div>
  )
}

function TimeBlock({ value, label }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-serif text-xl font-bold tabular-nums text-accent md:text-2xl">
        {String(value).padStart(2, '0')}
      </span>
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </span>
    </div>
  )
}

function Colon() {
  return <span className="pb-4 text-lg font-bold text-black/20">:</span>
}

export default CountdownTimer
