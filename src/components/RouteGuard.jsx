import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { upsertTelegramUser } from '../hooks/api/auth'
import { useTelegram } from '../hooks/useTelegram'
import { isBackendConfigured } from '../lib/backend'
import { isSupabaseConfigured } from '../lib/supabase'

const LS_ROLE_KEY = 'ts_user_role'
const LS_TG_ID_KEY = 'ts_tg_id'

function RouteLoading() {
  return (
    <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
      <div className="h-10 w-10 rounded-full border-2 border-brand/30 border-t-brand animate-spin" />
    </div>
  )
}

export default function RouteGuard({ role, children }) {
  const { user, ready } = useTelegram()
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    if (!ready) return

    let cancelled = false

    async function checkAccess() {
      if (!user?.id) {
        setStatus('denied')
        return
      }

      try {
        const dbUser = await upsertTelegramUser(user)
        if (cancelled) return

        if (dbUser?.role === role) {
          localStorage.setItem(LS_ROLE_KEY, dbUser.role)
          localStorage.setItem(LS_TG_ID_KEY, String(user.id))
          setStatus('allowed')
          return
        }

        setStatus('denied')
      } catch (error) {
        console.warn('[RouteGuard] role check failed:', error)

        if (!isBackendConfigured && !isSupabaseConfigured) {
          const savedRole = localStorage.getItem(LS_ROLE_KEY)
          const savedTgId = localStorage.getItem(LS_TG_ID_KEY)
          setStatus(savedRole === role && savedTgId === String(user.id) ? 'allowed' : 'denied')
          return
        }

        if (!cancelled) setStatus('denied')
      }
    }

    checkAccess()

    return () => {
      cancelled = true
    }
  }, [ready, role, user])

  if (status === 'checking') return <RouteLoading />

  if (status !== 'allowed') {
    return <Navigate to="/" replace />
  }

  return children
}
