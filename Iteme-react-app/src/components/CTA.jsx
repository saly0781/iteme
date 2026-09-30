import { Link } from 'react-router-dom'
import CountdownTimer from './CountdownTimer'

function CTA() {
  return (
    <section
      className="container mx-auto px-6 py-32 md:px-12"
      id="apply"
    >
      <div className="relative flex flex-col items-center justify-between gap-10 overflow-hidden rounded-2xl border border-black/20 bg-gray-100 p-10 md:flex-row md:p-16">

        {/* Background Image */}
        <div className="absolute inset-0 z-0 opacity-10 mix-blend-multiply">
          <img
            alt="Background"
            className="h-full w-full object-cover grayscale"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuA-T_zhy_HMFiPlWWKsQNeLhpEo5LTZrNozkY0f_rbfOztV36aVi3DLXfJKVxILKmao0--UM0wkrG8tJe9_N8bc0Ofd5X5he2VtwkZiKfCr2XtPKVZ2QBy-UejLz5ccxoGAVN0xRxqpFNYdtjBloyEUjOUVt-zJg8zszEsrAAhkhUFbyKjl70Jn4nr5Dm7FSWWTQ17uaviXE-VpTRJwe3Lk3ODxEpzRZfOWR_UgT0FCeji23dCg92bLxQ"
          />
        </div>

        <div className="relative z-10 max-w-2xl">
          <h2 className="mb-6 font-serif text-3xl font-medium leading-tight text-accent md:text-5xl">
            Ready to elevate your{' '}
            <span className="text-accent underline decoration-2 underline-offset-4">
              creative skills?
            </span>{' '}
            Enroll today.
          </h2>

          <Link
            className="group flex items-center gap-2 text-xl font-medium text-accent transition-colors hover:text-muted"
            to="/programs"
          >
            Begin Application

            <i className="fa-solid fa-arrow-right text-sm transition-transform group-hover:translate-x-1"></i>
          </Link>

          <div className="mt-8">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Applications close in
            </p>
            <CountdownTimer />
          </div>
        </div>

        {/* Decorative Disc */}
        <div className="relative z-10">
          <div className="flex h-24 w-24 animate-[spin_10s_linear_infinite] items-center justify-center rounded-full border-2 border-black/40 bg-white/50 backdrop-blur-md">
            <div className="h-8 w-8 rounded-full border-2 border-black/60 bg-black"></div>
          </div>

          <div className="absolute -bottom-4 -right-4 -z-10 h-32 w-32 border border-black/20 opacity-50"></div>

          <div className="absolute -bottom-8 -right-8 -z-10 h-32 w-32 border border-black/20 opacity-30"></div>
        </div>

      </div>
    </section>
  )
}

export default CTA