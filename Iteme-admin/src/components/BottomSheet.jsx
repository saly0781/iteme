import { motion, useDragControls } from 'framer-motion'

function BottomSheet({ onClose, maxWidthClassName = 'sm:max-w-md', children }) {
  const dragControls = useDragControls()

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_e, info) => {
          if (info.offset.y > 120 || info.velocity.y > 600) onClose()
        }}
        className={`relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl sm:max-h-[88vh] sm:rounded-3xl ${maxWidthClassName}`}
      >
        <div
          onPointerDown={(e) => dragControls.start(e)}
          className="flex shrink-0 touch-none items-center justify-center pt-3 pb-2 sm:hidden"
        >
          <div className="h-1.5 w-12 rounded-full bg-black/15" />
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/35 text-white shadow-sm backdrop-blur-md transition-colors hover:bg-black/55 sm:right-5 sm:top-5"
        >
          <i className="fa-solid fa-xmark text-sm"></i>
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] sm:p-8">
          {children}
        </div>
      </motion.div>
    </div>
  )
}

export default BottomSheet
