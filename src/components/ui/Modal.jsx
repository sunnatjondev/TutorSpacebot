import { useEffect } from 'react'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children, closeOnBackdropClick = true }) {
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-scrim animate-fade-in"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />
      {/* Sheet */}
      <div
        className="relative w-full max-w-[480px] bg-surface-container rounded-t-modal shadow-m3-elevation-3 animate-slide-up"
        style={{
          maxHeight: '85dvh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="m3-title-lg">{title}</h2>
          <button
            onClick={onClose}
            className="m3-btn-icon bg-surface-high"
          >
            <X size={18} />
          </button>
        </div>
        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {children}
        </div>
      </div>
    </div>
  )
}
