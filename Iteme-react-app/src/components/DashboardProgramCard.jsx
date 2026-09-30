import { useAuth } from '../context/AuthContext'
import { formatRWF, getTotals } from '../data/programs'

function DashboardProgramCard({ program, isEnrolled = false }) {
  const { openProgramDetail } = useAuth()
  const { applied, limit } = getTotals(program)
  const seatsLeft = Math.max(limit - applied, 0)

  return (
    <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img alt={program.name} src={program.image} className="h-full w-full object-cover" />

        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
            program.isOpen ? 'bg-white text-slate-900' : 'bg-slate-900/80 text-white'
          }`}
        >
          {program.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="mb-1 truncate text-sm font-semibold text-slate-900">{program.name}</h3>

        <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
          <span className="truncate">
            {program.isOpen ? `${seatsLeft} seats left` : `Next: ${program.nextIntakeDate}`}
          </span>
          <span className="shrink-0 font-semibold text-slate-900">{formatRWF(program.fee)}</span>
        </div>

        {isEnrolled ? (
          <span className="inline-flex items-center justify-center gap-1.5 rounded-full bg-teal-100 px-3 py-1.5 text-[11px] font-semibold text-teal-700">
            <i className="fa-solid fa-circle-check text-[10px]"></i>
            Enrolled
          </span>
        ) : (
          <button
            type="button"
            onClick={() => openProgramDetail(program.id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition-all ${
              program.isOpen
                ? 'bg-slate-900 text-white hover:bg-slate-700'
                : 'border border-slate-200 bg-white text-slate-900 hover:border-slate-300'
            }`}
          >
            {program.isOpen ? 'Apply Now' : 'Next Intake'}
          </button>
        )}
      </div>
    </div>
  )
}

export default DashboardProgramCard
