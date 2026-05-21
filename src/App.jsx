import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useTelegram } from './hooks/useTelegram'
import { upsertTelegramUser } from './hooks/useSupabaseData'
import { isSupabaseConfigured } from './lib/supabase'

// Pages
import RoleSelection from './pages/RoleSelection'

// Teacher pages
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherGroups from './pages/teacher/TeacherGroups'
import GroupDetail from './pages/teacher/GroupDetail'
import TeacherSchedule from './pages/teacher/TeacherSchedule'
import TeacherFinance from './pages/teacher/TeacherFinance'
import TeacherSettings from './pages/teacher/TeacherSettings'
import AddStudent from './pages/teacher/AddStudent'

// Student pages
import StudentDashboard from './pages/student/StudentDashboard'
import StudentGroups from './pages/student/StudentGroups'
import StudentSchedule from './pages/student/StudentSchedule'
import StudentFinance from './pages/student/StudentFinance'
import StudentSettings from './pages/student/StudentSettings'

const LS_ROLE_KEY = 'ts_user_role'
const LS_TG_ID_KEY = 'ts_tg_id'

function AuthGate() {
  const { user, ready } = useTelegram()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!ready) return

    async function checkUser() {
      // ── Step 1: localStorage — fastest, works offline ──────────────
      const savedRole = localStorage.getItem(LS_ROLE_KEY)
      const savedTgId = localStorage.getItem(LS_TG_ID_KEY)

      // If we have a saved role for THIS Telegram user → redirect immediately
      if (savedRole && savedTgId && user && String(user.id) === savedTgId) {
        navigate(savedRole === 'teacher' ? '/teacher/home' : '/student/home', { replace: true })
        setChecking(false)

        // Still upsert in background to keep Supabase in sync (no await)
        if (isSupabaseConfigured && user) upsertTelegramUser(user).catch(() => {})
        return
      }

      // ── Step 2: Try Supabase if no local role ───────────────────────
      if (isSupabaseConfigured && user) {
        try {
          const dbUser = await upsertTelegramUser(user)
          if (dbUser?.role) {
            // Save to localStorage for next time
            localStorage.setItem(LS_ROLE_KEY, dbUser.role)
            localStorage.setItem(LS_TG_ID_KEY, String(user.id))
            navigate(dbUser.role === 'teacher' ? '/teacher/home' : '/student/home', { replace: true })
            setChecking(false)
            return
          }
        } catch (e) {
          console.error('[Auth] Supabase check failed:', e)
        }
      }

      // ── Step 3: No role found → show role selection ─────────────────
      setChecking(false)
    }

    checkUser()
  }, [ready, user])

  if (checking) {
    return (
      <div className="min-h-screen bg-surface-lowest flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-brand/20 flex items-center justify-center animate-pulse-glow">
            <div className="w-6 h-6 rounded-full bg-brand animate-spin-slow" />
          </div>
          <p className="text-on-surface-variant text-sm animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    )
  }

  return <RoleSelection />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthGate />} />

        {/* Teacher Routes */}
        <Route path="/teacher/home" element={<TeacherDashboard />} />
        <Route path="/teacher/groups" element={<TeacherGroups />} />
        <Route path="/teacher/groups/:id" element={<GroupDetail />} />
        <Route path="/teacher/schedule" element={<TeacherSchedule />} />
        <Route path="/teacher/finance" element={<TeacherFinance />} />
        <Route path="/teacher/settings" element={<TeacherSettings />} />
        <Route path="/teacher/add-student" element={<AddStudent />} />

        {/* Student Routes */}
        <Route path="/student/home" element={<StudentDashboard />} />
        <Route path="/student/groups" element={<StudentGroups />} />
        <Route path="/student/schedule" element={<StudentSchedule />} />
        <Route path="/student/finance" element={<StudentFinance />} />
        <Route path="/student/settings" element={<StudentSettings />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
