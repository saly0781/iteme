import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { usePrograms } from '../hooks/usePrograms'
import pic1 from '../assets/pic1.jpg'
import pic2 from '../assets/pic2.jpg'
import pic3 from '../assets/pic3.jpg'
import pic4 from '../assets/pic4.jpg'
import pic5 from '../assets/pic5.jpg'
import pic6 from '../assets/pic6.jpg'

const studentWork = [
  { id: 1, title: 'Late Night Shoot', programId: 'video-production', image: pic1, tall: true },
  { id: 2, title: 'Gimbal Rig', programId: 'video-production', image: pic6 },
  { id: 3, title: 'On Set', programId: 'video-production', image: pic5, tall: true },
  { id: 4, title: 'Studio Portrait', programId: 'photography', image: pic4, tall: true },
  { id: 5, title: 'Editorial Series', programId: 'photography', image: pic2 },
  { id: 6, title: 'Documentary Frame', programId: 'photography', image: pic1 },
  { id: 7, title: 'Mixing Session', programId: 'audio-production', image: pic3, tall: true },
  { id: 8, title: 'Studio Setup', programId: 'audio-production', image: pic6 },
  { id: 9, title: 'Live Take', programId: 'audio-production', image: pic2 },
]

function StudentWork() {
  const [activeFilter, setActiveFilter] = useState('all')
  const { programs } = usePrograms()

  const filters = useMemo(
    () => [{ id: 'all', name: 'All Work' }, ...programs.map((p) => ({ id: p.id, name: p.name }))],
    [programs]
  )

  const filteredWork = useMemo(() => {
    if (activeFilter === 'all') return studentWork
    return studentWork.filter((item) => item.programId === activeFilter)
  }, [activeFilter])

  return (
    <section className="container mx-auto px-6 pt-12 pb-24 md:px-12 md:pt-16 md:pb-32">
      <div className="mx-auto mb-10 max-w-2xl text-center">
        <p className="mb-4 text-sm font-bold uppercase tracking-wide text-accent">
          Student Work
        </p>

        <h1 className="mb-6 font-serif text-4xl font-semibold leading-tight text-accent md:text-6xl">
          Work from our students
        </h1>

        <p className="text-lg leading-relaxed text-muted">
          A look at what students create across our programs — filter by
          discipline to see work from a specific track.
        </p>
      </div>

      <div className="mb-12 flex flex-wrap items-center justify-center gap-3">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setActiveFilter(filter.id)}
            className={`rounded-full border px-5 py-2 text-sm font-semibold transition-all ${
              activeFilter === filter.id
                ? 'border-accent bg-accent text-white'
                : 'border-black/10 bg-darker text-muted hover:border-black/30 hover:text-accent'
            }`}
          >
            {filter.name}
          </button>
        ))}
      </div>

      {filteredWork.length > 0 ? (
        <motion.div
          layout
          className="grid auto-rows-[200px] grid-cols-2 gap-4 md:grid-cols-4 md:gap-6"
        >
          <AnimatePresence>
            {filteredWork.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.92 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={`group relative overflow-hidden rounded-xl border border-black/10 ${
                  item.tall ? 'row-span-2' : 'row-span-1'
                }`}
              >
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover grayscale transition-transform duration-700 group-hover:scale-110 group-hover:grayscale-0"
                />

                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <p className="text-center text-muted">No projects in this category yet.</p>
      )}
    </section>
  )
}

export default StudentWork
