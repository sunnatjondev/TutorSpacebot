import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children, closeOnBackdropClick = true }) {
  const [availableHeight, setAvailableHeight] = useState('90dvh')

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const tg = window.Telegram?.WebApp
    let frameId = null

    const update = () => {
      if (tg && tg.viewportStableHeight && tg.viewportHeight) {
        // Telegram API: viewportStableHeight = full height, viewportHeight = current (shrinks with keyboard)
        const h = Math.min(tg.viewportHeight * 0.92, tg.viewportStableHeight * 0.9)
        setAvailableHeight(`${h}px`)
      } else if (window.visualViewport) {
        setAvailableHeight(`${window.visualViewport.height * 0.92}px`)
      }
    }

    // Telegram WebApp event
    tg?.onEvent('viewportChanged', update)
    // Browser fallback
    window.visualViewport?.addEventListener('resize', update)
    window.addEventListener('resize', update)

    frameId = window.requestAnimationFrame(update)

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      tg?.offEvent('viewportChanged', update)
      window.visualViewport?.removeEventListener('resize', update)
      window.removeEventListener('resize', update)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />
      {/* Sheet */}
      <div
        className="relative w-full max-w-[480px] bg-surface-high rounded-t-[28px] border-t border-outline-variant/50 animate-slide-up"
        style={{
          height: availableHeight,
          display: 'flex',
          flexDirection: 'column',
          transition: 'height 0.15s ease-out',
        }}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
          <h2 className="text-xl font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
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
