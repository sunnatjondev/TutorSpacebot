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

/**
 * Auth gate — checks Supabase for returning user.
 * If Supabase is not configured, always shows role selection.
 */
function AuthGate() {
  const { user, ready } = useTelegram()
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (!ready) return

    async function checkUser() {
      if (!isSupabaseConfigured || !user) {
        setChecking(false)
        return
      }

      try {
        const dbUser = await upsertTelegramUser(user)
        if (dbUser?.role === 'teacher') {
          navigate('/teacher/home', { replace: true })
        } else if (dbUser?.role === 'student') {
          navigate('/student/home', { replace: true })
        }
        // else: no role yet — stay on role selection
      } catch (e) {
        console.error('Auth check failed:', e)
      } finally {
        setChecking(false)
      }
    }

    checkUser()
  }, [ready, user])

  if (checking && isSupabaseConfigured) {
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
        {/* Auth gate / Role Selection */}
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

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
