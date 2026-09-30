import { createContext, useCallback, useContext, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback(
    (type, message) => {
      const id = `${Date.now()}-${Math.random()}`
      setToasts((prev) => [...prev, { id, type, message }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss]
  )

  const value = {
    success: (message) => push('success', message),
    error: (message) => push('error', message),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              onClick={() => dismiss(t.id)}
              className={`pointer-events-auto flex w-full max-w-sm cursor-pointer items-start gap-3 rounded-2xl px-4 py-3 text-white shadow-xl shadow-black/20 ${
                t.type === 'success' ? 'bg-teal-600' : 'bg-red-600'
              }`}
            >
              <i
                className={`fa-solid mt-0.5 ${
                  t.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'
                }`}
              ></i>
              <p className="text-sm font-medium">{t.message}</p>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}
