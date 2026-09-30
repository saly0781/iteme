import { useCallback, useEffect, useRef, useState } from 'react'

const GAP = 2 // px, matches gap-2
const ROTATE_DEG = 25
const SCALE_MIN = 0.75
const OPACITY_MIN = 0.4
const RANGE = 5 // card-widths from center before fully receded

function Carousel({ items, className = '' }) {
  const trackRef = useRef(null)
  const cardRefs = useRef([])
  const rafRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const updateWheel = useCallback(() => {
    const container = trackRef.current
    if (!container) return

    const containerCenter = container.scrollLeft + container.clientWidth / 2
    let closestIndex = 0
    let closestDistance = Infinity

    cardRefs.current.forEach((card, index) => {
      if (!card) return

      const cardCenter = card.offsetLeft + card.offsetWidth / 2
      const slot = (cardCenter - containerCenter) / (card.offsetWidth + GAP)
      const clamped = Math.max(-RANGE, Math.min(RANGE, slot))
      const t = Math.min(Math.abs(clamped) / RANGE, 1)

      const rotate = -clamped * ROTATE_DEG
      const scale = 1 - t * (1 - SCALE_MIN)
      const opacity = 1 - t * (1 - OPACITY_MIN)
      const translateZ = -t * 100

      card.style.transform = `rotateY(${rotate}deg) translateZ(${translateZ}px) scale(${scale})`
      card.style.opacity = String(opacity)
      card.style.zIndex = String(Math.round((1 - t) * 100))

      const distancePx = Math.abs(cardCenter - containerCenter)
      if (distancePx < closestDistance) {
        closestDistance = distancePx
        closestIndex = index
      }
    })

    setActiveIndex(closestIndex)
  }, [])

  useEffect(() => {
    const container = trackRef.current
    if (!container) return

    function handleScroll() {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateWheel)
    }

    updateWheel()
    container.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [items, updateWheel])

  function goTo(index) {
    cardRefs.current[index]?.scrollIntoView({
      behavior: 'smooth',
      inline: 'center',
      block: 'nearest',
    })
  }

  return (
    <div className={className}>
      <div
        ref={trackRef}
        style={{ perspective: '1200px' }}
        className="no-scrollbar relative -mx-6 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto px-6 py-6"
      >
        {items.map((item, index) => (
          <div
            key={item.alt}
            ref={(el) => (cardRefs.current[index] = el)}
            style={{ willChange: 'transform', backfaceVisibility: 'hidden' }}
            className="img-overlay aspect-[3/4] w-[50%] max-w-[220px] shrink-0 snap-center overflow-hidden rounded-xl border border-black/10 shadow-lg"
          >
            <img
              alt={item.alt}
              className={`h-full w-full object-cover transition-all duration-300 ease-out ${
                index === activeIndex ? 'grayscale-0' : 'grayscale brightness-75'
              }`}
              src={item.src}
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-center gap-2">
        {items.map((item, index) => (
          <button
            key={item.alt}
            type="button"
            aria-label={`Go to slide ${index + 1}`}
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              index === activeIndex ? 'w-6 bg-accent' : 'w-1.5 bg-black/20'
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default Carousel
