import { Link } from 'react-router-dom'

const projects = [
  {
    alt: 'Cinematography still',
    className: 'col-span-1 row-span-2',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkYyfe7sbEIV-QwxlxiGUXbQUosnW1nz5HmYKblPDLsqyCkiiWs8f-e9Gvq_yrbH8DA-P2z6BKj-XmvqDugVsOyZO8mtMoTsnDcOZmnVcPxryOPlQcir2BJmPzigp7DgKcYQS9hdG2dZjT50NWckMU9ZELY8MiL1iPfxzAsSIDxGcSlW2Y0_WoUsulXaqorF0FWAoJck5lms3mf1hZTa-qZ50M0d6U5t1YX5KOBG-Qz1cYFje1A_Ivmg'
  },
  {
    alt: 'Editorial Photography',
    className: 'col-span-1 row-span-1',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCPpzBheLqo3ZP648qlZXvBJ1ZzU7Kve2qZTMNLtBZJu2xVS6y598I9fsTmyAWXIN2sJYOfZFzgnrzh28Vfm46B0NcIcl-wBUCoZ3FlcnuQ_3fI453WbVCCBkrZFZli3qPFPd4PI_Pkg7lTGlrT3pI-u_AEAOPwaPZHU-mXGYeq5Bvc_MW9ifyUQ6DR5kh2U2_Pc9hOoXAVlrNAoppJIJU8MdmHOKyLsnoSCVtTO1QXLCrQ0zCD9CrWmw'
  },
  {
    alt: 'Music Production Session',
    className: 'col-span-1 row-span-1',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBZGP6Eqr6u-T0ZI7jDvMwFoqYtUi64iv1l-L0HnSFIghRh6bCdLrIn1WHRz08q4WDOKMr4svB8N7ABgP0s8-3kCwDAuL-a_J0_6TAU56JDzCESpbUngMcsXT8DIyn8g2n_95FTtzQs0LJwcV3rvtZk2y3HFZ29C2ul6_FOF6U2D2xfJDixJzSJKLpRzRSVrVhNF9RMfdDDD2faXhpabiZZ67GFgm2xi2xjt_xD2tcX-xMIA1lWJTQBhQ'
  },
  {
    alt: 'Short Film Project',
    className: 'col-span-2 row-span-2 hidden md:block',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCuaHRSrJBceqDdiBqic1hMJdJXMsNpHS--STtPZRC8TCUnuRLdMpgbT65esEpxfULvFPhvxQLqbn8qzCgqnTjqZDW50jYfTmNjctKO0j3Q9lm4XyL3zd7VSWj8_SWyIxE53wC-1opqHpNyomikxBkYSakLoJXYcKrx9KGjo8gXKXX_-LaxWfMOj9pknjhqYk-Ld_q2UoBLZJXaO6AeUSkXl0fYpMKznnOCSpBWw6HD7nudR5cw4bnJ7Q'
  },
  {
    alt: 'Commercial Shoot',
    className: 'col-span-1 row-span-1 hidden md:block',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBd_kBojLRBY0BMNMQX75YYatSwpZI-3XUzQeHyD0qQ8JsJ0L3QfWzjwiTugRBR4w87c-WWeYytHl3XC3NB82FeteyhRQNq3AUdVCdfuZ_LXlhREERWr3JXjPNHKEdbjvCDZLkevqHngfRp8QHfAFci30JlmGsg_kJljBA0966ov7mZz8qNnUgoAproawefpGwzavvyfFa_idrWiIRg0bEv8eWX0qj3unkXbOZ64AhnQ9Pl0ioLhcx2kw'
  },
  {
    alt: 'Audio Wave Visualization',
    className: 'col-span-1 row-span-1 hidden md:block',
    src: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDmN-ukQPCRxS0YhB6hkHb-YK4-X_4RJUH1eUIMuRujws0YSiTFBxz96iWvlvIm-GyrlcLawH_seudncHhtYHVG9PHK8Z0CfLMDhj3P0KDXiXF1oAmeY8lc75I4LjUaQAFozDANJpaNBJuiPJCpBHTlLa4WaxrGtb8e5fWSdaR0YHEuvs4FwtNnY_2zoFjhfR4X-QtMsju3TT46i5TyR-HNcd0hbGRxl73_RjkubjOHa5aBIEuV-3LqZg'
  }
]

function Showcase() {
  return (
    <section
      className="relative container mx-auto rounded-3xl border border-black/10 bg-darker px-6 py-20 md:px-12"
      id="showcase"
    >
      <div className="mb-12 flex items-center justify-center">
        <h2 className="mx-auto max-w-2xl text-center font-serif text-4xl font-semibold leading-tight text-accent md:text-5xl">
          Student Showcase
          <br />
          of outstanding work
        </h2>
      </div>

      <div className="grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {projects.map((project) => (
          <div
            key={project.alt}
            className={`${project.className} group relative overflow-hidden rounded-xl border border-black/10`}
          >
            <img
              src={project.src}
              alt={project.alt}
              className="h-full w-full object-cover grayscale transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
            />
          </div>
        ))}
      </div>

      <div className="mt-12 flex justify-center">
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-accent bg-transparent px-8 py-3 text-sm text-accent transition-colors hover:bg-accent hover:text-white"
          to="/student-work"
        >
          Explore all projects
          <i className="fa-solid fa-arrow-right text-xs"></i>
        </Link>
      </div>
    </section>
  )
}

export default Showcase