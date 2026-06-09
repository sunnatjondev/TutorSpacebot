import React from 'react'
import { Navigate } from 'react-router-dom'

const LS_ROLE_KEY = 'ts_user_role'

export default function RouteGuard({ role, children }) {
  const savedRole = localStorage.getItem(LS_ROLE_KEY)

  if (!savedRole || savedRole !== role) {
    return <Navigate to="/" replace />
  }

  return children
}
