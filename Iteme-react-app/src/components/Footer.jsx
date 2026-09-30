import { Link } from 'react-router-dom'
import ApplyButton from './ApplyButton'

function Footer() {
  return (
    <footer className="border-t border-black/10 bg-darker pt-16 pb-8">
      <div className="container mx-auto px-6 md:px-12">

        <div className="mb-12 flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">

          {/* Brand */}
          <div>
            <a
              className="mb-4 flex items-center gap-2"
              href="#"
            >
              <span className="text-2xl font-bold tracking-tight text-accent">
                ITEME HUB
              </span>
            </a>

            <p className="max-w-xs text-sm font-medium text-muted">
              A premier training academy dedicated to professional short
              courses in media, design, and technology. Empowering the next
              generation of creators and builders.
            </p>
          </div>

          {/* Links + Social */}
          <div className="flex flex-col items-end gap-6">

            <nav className="flex flex-wrap gap-6 text-sm font-semibold">
              <Link
                className="text-muted transition-colors hover:text-accent"
                to="/programs"
              >
                Programs
              </Link>

              <Link
                className="text-muted transition-colors hover:text-accent"
                to="/student-work"
              >
                Student Work
              </Link>

              <a
                className="text-muted transition-colors hover:text-accent"
                href="#faculty"
              >
                Faculty
              </a>

              <ApplyButton
                variant="text"
                className="text-muted transition-colors hover:text-accent"
              />
            </nav>

            <div className="flex gap-4">

              <a
                className="text-muted transition-colors hover:text-accent"
                href="#"
                aria-label="Instagram"
              >
                <i className="fa-brands fa-instagram text-lg"></i>
              </a>

              <a
                className="text-muted transition-colors hover:text-accent"
                href="#"
                aria-label="LinkedIn"
              >
                <i className="fa-brands fa-linkedin-in text-lg"></i>
              </a>

              <a
                className="text-muted transition-colors hover:text-accent"
                href="#"
                aria-label="Twitter"
              >
                <i className="fa-brands fa-twitter text-lg"></i>
              </a>

              <a
                className="text-muted transition-colors hover:text-accent"
                href="#"
                aria-label="YouTube"
              >
                <i className="fa-brands fa-youtube text-lg"></i>
              </a>

            </div>
          </div>

        </div>
      </div>
    </footer>
  )
}

export default Footer