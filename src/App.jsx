import { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useTelegram } from './hooks/useTelegram'
import { upsertTelegramUser } from './hooks/api/auth'
import { joinGroupByToken } from './hooks/api/useStudent'
import { isBackendConfigured } from './lib/backend'
import { LS_ROLE_KEY, LS_TG_ID_KEY } from './lib/constants'
import RouteGuard from './components/RouteGuard'

const RoleSelection = lazy(() => import('./pages/RoleSelection'))
const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'))
const TeacherGroups = lazy(() => import('./pages/teacher/TeacherGroups'))
const GroupDetail = lazy(() => import('./pages/teacher/GroupDetail'))
const TeacherSchedule = lazy(() => import('./pages/teacher/TeacherSchedule'))
const TeacherFinance = lazy(() => import('./pages/teacher/TeacherFinance'))
const TeacherSettings = lazy(() => import('./pages/teacher/TeacherSettings'))
const Subscription = lazy(() => import('./pages/teacher/Subscription'))
const AddStudent = lazy(() => import('./pages/teacher/AddStudent'))
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'))
const StudentGroups = lazy(() => import('./pages/student/StudentGroups'))
const StudentSchedule = lazy(() => import('./pages/student/StudentSchedule'))
const StudentFinance = lazy(() => import('./pages/student/StudentFinance'))
const StudentSettings = lazy(() => import('./pages/student/StudentSettings'))



function LoadingScreen() {
  return (
    <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
      <div className="flex flex-col items-center gap-5">
        <div className="h-10 w-10 rounded-full border-[3px] border-surface-container-highest border-t-brand animate-spin" />
        <p className="m3-label text-on-surface-variant font-medium animate-pulse">Yuklanmoqda...</p>
      </div>
    </div>
  )
}

function AuthGate() {
  const { user, ready } = useTelegram()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!ready) return

    async function checkUser() {
      const savedRole = localStorage.getItem(LS_ROLE_KEY)
      const savedTgId = localStorage.getItem(LS_TG_ID_KEY)
      const currentTgId = user ? String(user.id) : null

      const tg = window?.Telegram?.WebApp
      const startParam = tg?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('startapp')
      const isInvite = startParam && startParam.startsWith('invite_')
      const inviteToken = isInvite ? startParam.replace('invite_', '') : null

      if (isBackendConfigured && user) {
        try {
          let dbUser = await upsertTelegramUser(user)

          if (inviteToken) {
            const joinRes = await joinGroupByToken(inviteToken)
            if (joinRes.success) {
              dbUser = { ...dbUser, role: joinRes.role }
              if (tg?.showAlert) {
                tg.showAlert(`Tabriklaymiz! Siz "${joinRes.groupName}" guruhiga qo'shildingiz! 🎉`)
              } else {
                alert(`Tabriklaymiz! Siz "${joinRes.groupName}" guruhiga qo'shildingiz! 🎉`)
              }
            } else {
              const errMsg = 'Guruh topilmadi yoki taklif havolasi yaroqsiz ❌'
              if (tg?.showAlert) {
                tg.showAlert(errMsg)
              } else {
                alert(errMsg)
              }
            }
          }

          if (dbUser?.role) {
            localStorage.setItem(LS_ROLE_KEY, dbUser.role)
            localStorage.setItem(LS_TG_ID_KEY, currentTgId)
            navigate(dbUser.role === 'teacher' ? '/teacher/home' : '/student/home', { replace: true })
            setChecking(false)
            return
          }
        } catch (error) {
          console.error('[Auth] Supabase check failed:', error)
        }
      }

      if (savedRole && savedTgId && currentTgId && savedTgId === currentTgId) {
        navigate(savedRole === 'teacher' ? '/teacher/home' : '/student/home', { replace: true })
        setChecking(false)
        return
      }

      if (savedTgId && currentTgId && savedTgId !== currentTgId) {
        localStorage.removeItem(LS_ROLE_KEY)
        localStorage.removeItem(LS_TG_ID_KEY)
      }

      setChecking(false)
    }

    checkUser()
  }, [ready, user, navigate])

  if (checking) {
    return <LoadingScreen />
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center px-6">
        <div className="max-w-sm text-center space-y-3">
          <h1 className="text-2xl font-extrabold text-on-surface">TutorSpace</h1>
          <p className="text-on-surface-variant text-sm">
            Ilovani ishga tushirish uchun TutorSpace mini app&apos;ni Telegram ichida oching.
          </p>
        </div>
      </div>
    )
  }

  return <RoleSelection />
}

function ScrollToTop() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
    const timer = setTimeout(() => {
      window.scrollTo(0, 0)
      document.querySelectorAll('.page-wrapper').forEach((el) => {
        el.scrollTop = 0
      })
      document.querySelectorAll('.overflow-y-auto').forEach((el) => {
        el.scrollTop = 0
      })
    }, 100)
    return () => clearTimeout(timer)
  }, [pathname])

  return null
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<AuthGate />} />

          <Route path="/teacher/home" element={<RouteGuard role="teacher"><TeacherDashboard /></RouteGuard>} />
          <Route path="/teacher/groups" element={<RouteGuard role="teacher"><TeacherGroups /></RouteGuard>} />
          <Route path="/teacher/groups/:id" element={<RouteGuard role="teacher"><GroupDetail /></RouteGuard>} />
          <Route path="/teacher/schedule" element={<RouteGuard role="teacher"><TeacherSchedule /></RouteGuard>} />
          <Route path="/teacher/finance" element={<RouteGuard role="teacher"><TeacherFinance /></RouteGuard>} />
          <Route path="/teacher/settings" element={<RouteGuard role="teacher"><TeacherSettings /></RouteGuard>} />
          <Route path="/teacher/subscription" element={<RouteGuard role="teacher"><Subscription /></RouteGuard>} />
          <Route path="/teacher/add-student" element={<RouteGuard role="teacher"><AddStudent /></RouteGuard>} />

          <Route path="/student/home" element={<RouteGuard role="student"><StudentDashboard /></RouteGuard>} />
          <Route path="/student/groups" element={<RouteGuard role="student"><StudentGroups /></RouteGuard>} />
          <Route path="/student/schedule" element={<RouteGuard role="student"><StudentSchedule /></RouteGuard>} />
          <Route path="/student/finance" element={<RouteGuard role="student"><StudentFinance /></RouteGuard>} />
          <Route path="/student/settings" element={<RouteGuard role="student"><StudentSettings /></RouteGuard>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
