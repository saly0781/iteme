import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useTransform } from 'framer-motion'
import { enrollmentStatus } from '../config/enrollment'
import CountdownTimer from './CountdownTimer'
import Carousel from './Carousel'
import pic1 from '../assets/pic1.jpg'
import pic2 from '../assets/pic2.jpg'
import pic3 from '../assets/pic3.jpg'
import pic4 from '../assets/pic4.jpg'
import pic5 from '../assets/pic5.jpg'
import pic6 from '../assets/pic6.jpg'

const collage = [
  { alt: 'Filming on location', src: pic1, offset: 'md:translate-y-6' },
  { alt: 'Cinematography setup', src: pic2, offset: 'md:-translate-y-4', shadow: true },
  { alt: 'Music production session', src: pic3, offset: 'md:translate-y-8' },
  { alt: 'Photography student at work', src: pic4, offset: 'md:-translate-y-2' },
  { alt: 'Film production set', src: pic5, offset: 'md:translate-y-6' },
  { alt: 'Gimbal rig on set', src: pic6, offset: 'md:-translate-y-6' },
]

function Hero() {
  const { isOpen } = enrollmentStatus
  const collageRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: collageRef,
    offset: ['start end', 'end start'],
  })
  const parallaxY = useTransform(scrollYProgress, [0, 1], [-30, 30])

  return (
    <section className="relative z-10 container mx-auto px-6 md:px-12">

      {/* Hero Text */}
      <div className="relative mx-auto mb-16 max-w-4xl text-center">

        <div className="absolute -top-10 left-10 text-2xl text-accent/50 animate-pulse">
          ✦
        </div>

        <div className="absolute right-10 top-20 text-xl text-accent/50 animate-pulse delay-150">
          ✦
        </div>

        <h1 className="mb-6 font-serif text-5xl font-semibold leading-tight text-accent md:text-7xl">
          Master the Art
          <br />
          <span className="font-normal italic">
            of Creation.
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted">
          Professional training in Video, Photography, and Music Production.
          <br />
          Join our academy to get completely clear on your creative
          <br className="hidden md:block" />
          vision and build a career in media arts.
        </p>

        <div className={`inline-block rounded-full ${isOpen ? 'orbit-glow-sm' : ''}`}>
          <Link
            className="inline-flex items-center gap-2 rounded-full bg-accent px-8 py-3 font-medium text-white shadow-lg shadow-black/10 transition-all hover:scale-105 hover:bg-gray-800"
            to="/programs"
          >
            <i className="fa-solid fa-arrow-right text-lg"></i>
            Start Your Journey
          </Link>
        </div>

        {isOpen && (
          <div className="mt-5 flex flex-col items-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted">
              Applications close in
            </p>
            <CountdownTimer />
          </div>
        )}
      </div>

      {/* Hero Image Collage */}
      <motion.div ref={collageRef} style={{ y: parallaxY }} className="relative mb-24">

        {/* Mobile: swipeable carousel */}
        <Carousel items={collage} className="md:hidden" />

        {/* Desktop: staggered grid */}
        <div className="hidden gap-5 md:grid md:grid-cols-6">
          {collage.map((item, index) => (
            <motion.div
              key={item.alt}
              className={`img-overlay group aspect-[3/4] overflow-hidden rounded-xl border border-black/10 transition-transform duration-500 ${item.offset} ${
                item.shadow ? 'shadow-2xl' : ''
              }`}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <img
                alt={item.alt}
                className="h-full w-full object-cover grayscale transition-transform duration-700 ease-out group-hover:scale-110 group-hover:grayscale-0"
                src={item.src}
              />
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Statistics */}
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-8 border-y border-black/10 py-10 text-center md:grid-cols-4">

        <Stat number="500+" label="Active Students" />

        <Stat number="3" label="Core Tracks" />

        <Stat number="12" label="State-of-the-art Studios" />

        <Stat number="30+" label="Industry Faculty" />

      </div>
    </section>
  )
}

function Stat({ number, label }) {
  return (
    <div>
      <h3 className="mb-2 font-serif text-4xl font-bold text-accent md:text-5xl">
        {number}
      </h3>

      <p className="text-sm font-semibold uppercase tracking-wider text-muted">
        {label}
      </p>
    </div>
  )
}

export default Hero