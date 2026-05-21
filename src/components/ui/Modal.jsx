import React, { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function Modal({ isOpen, onClose, title, children }) {
  const [keyboardOffset, setKeyboardOffset] = useState(0)

  // Lock scroll behind modal
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  // Move modal up when keyboard opens (visualViewport API)
  useEffect(() => {
    if (!isOpen) return
    const vv = window.visualViewport
    if (!vv) return

    const update = () => {
      const offset = window.innerHeight - vv.height - vv.offsetTop
      setKeyboardOffset(Math.max(0, offset))
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()

    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      setKeyboardOffset(0)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Sheet — slides up above keyboard */}
      <div
        className="relative w-full max-w-[480px] bg-surface-high rounded-t-[28px] border-t border-outline-variant/50 p-6 animate-slide-up"
        style={{
          maxHeight: '90vh',
          overflowY: 'auto',
          paddingBottom: `${keyboardOffset + 32}px`,
          transition: 'padding-bottom 0.15s ease-out',
        }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-on-surface">{title}</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant active:scale-90 transition-transform"
          >
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
