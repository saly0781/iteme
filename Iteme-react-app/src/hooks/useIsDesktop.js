import { useEffect, useState } from 'react'

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 768px)').matches
  )

  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const handleChange = (e) => setIsDesktop(e.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return isDesktop
}
