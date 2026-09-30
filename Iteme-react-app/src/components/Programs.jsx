import { Link } from 'react-router-dom'

function Programs() {
  return (
    <section
      className="container mx-auto px-6 py-24 md:px-12 md:py-32"
      id="programs"
    >
      <div className="flex flex-col items-center gap-16 md:flex-row">

        <div className="relative mx-auto w-full text-center">

          <p className="mb-4 text-sm font-bold uppercase tracking-wide text-accent">
            Core Disciplines
          </p>

          <h2 className="mb-6 font-serif text-4xl font-semibold leading-tight text-accent md:text-6xl">
            Shape your creative
            <br />
            future with us
          </h2>

          <div className="mb-12 grid w-full grid-cols-1 gap-8 md:grid-cols-3">

            <ProgramCard
              title="Cinematography"
              description="Master lighting, composition, and narrative storytelling for film and digital media."
            />

            <ProgramCard
              title="Professional Photography"
              description="From commercial studio techniques to compelling editorial and documentary storytelling."
            />

            <ProgramCard
              title="Music Production"
              description="Expert instruction in audio engineering, mixing, synthesis, and mastering."
            />

          </div>

          <div className="relative inline-block">
            <Link
              className="inline-block rounded-sm bg-accent px-10 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-105 hover:bg-gray-800"
              to="/programs"
            >
              View Curriculum
            </Link>
          </div>

        </div>
      </div>
    </section>
  )
}

function ProgramCard({ title, description }) {
  return (
    <div className="rounded-xl border border-black/10 bg-darker p-8 text-left transition-colors hover:border-black/40">
      <h4 className="mb-3 text-xl font-bold text-accent">
        {title}
      </h4>

      <p className="text-sm leading-relaxed text-muted">
        {description}
      </p>
    </div>
  )
}

export default Programs