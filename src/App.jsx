import React, { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useTelegram } from './hooks/useTelegram'
import { upsertTelegramUser, joinGroupByToken } from './hooks/useSupabaseData'
import { isSupabaseConfigured } from './lib/supabase'

import RoleSelection from './pages/RoleSelection'

import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherGroups from './pages/teacher/TeacherGroups'
import GroupDetail from './pages/teacher/GroupDetail'
import TeacherSchedule from './pages/teacher/TeacherSchedule'
import TeacherFinance from './pages/teacher/TeacherFinance'
import TeacherSettings from './pages/teacher/TeacherSettings'
import AddStudent from './pages/teacher/AddStudent'

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
      const savedRole = localStorage.getItem(LS_ROLE_KEY)
      const savedTgId = localStorage.getItem(LS_TG_ID_KEY)
      const currentTgId = user ? String(user.id) : null

      const tg = window?.Telegram?.WebApp
      const startParam = tg?.initDataUnsafe?.start_param || new URLSearchParams(window.location.search).get('startapp')
      const isInvite = startParam && startParam.startsWith('join_')
      const inviteToken = isInvite ? startParam.replace('join_', '') : null

      if (isSupabaseConfigured && user) {
        try {
          let dbUser = await upsertTelegramUser(user)

          if (inviteToken) {
            const joinRes = await joinGroupByToken(user.id, inviteToken, user)
            if (joinRes.success) {
              dbUser = { ...dbUser, role: joinRes.role }
              if (tg?.showAlert) {
                tg.showAlert(`Tabriklaymiz! Siz "${joinRes.groupName}" guruhiga qo'shildingiz!`)
              } else {
                alert(`Tabriklaymiz! Siz "${joinRes.groupName}" guruhiga qo'shildingiz!`)
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthGate />} />

        <Route path="/teacher/home" element={<TeacherDashboard />} />
        <Route path="/teacher/groups" element={<TeacherGroups />} />
        <Route path="/teacher/groups/:id" element={<GroupDetail />} />
        <Route path="/teacher/schedule" element={<TeacherSchedule />} />
        <Route path="/teacher/finance" element={<TeacherFinance />} />
        <Route path="/teacher/settings" element={<TeacherSettings />} />
        <Route path="/teacher/add-student" element={<AddStudent />} />

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
