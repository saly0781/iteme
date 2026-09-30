import { Link } from 'react-router-dom'
import { enrollmentStatus } from '../config/enrollment'

function ApplyButton({ className = '', variant = 'solid', fullWidth = false, onClick }) {
  const { isOpen, nextEnrollmentDate } = enrollmentStatus
  const label = isOpen ? 'Apply Now' : `Next Enrollment: ${nextEnrollmentDate}`

  if (variant === 'text') {
    return (
      <Link to="/programs" onClick={onClick} className={className}>
        {label}
      </Link>
    )
  }

  return (
    <div
      className={`inline-block rounded-full ${isOpen ? 'orbit-glow p-[2px]' : ''} ${
        fullWidth ? 'w-full' : ''
      }`}
    >
      <Link
        to="/programs"
        onClick={onClick}
        className={`flex items-center justify-center gap-2 rounded-full transition-all active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 ${
          isOpen
            ? 'bg-accent text-white hover:bg-gray-800'
            : 'border border-black/15 bg-darker text-muted hover:border-black/30'
        } ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        {!isOpen && <i className="fa-solid fa-calendar-days text-xs"></i>}
        {label}
      </Link>
    </div>
  )
}

export default ApplyButton
