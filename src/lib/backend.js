const rawBackendUrl = import.meta.env.VITE_BACKEND_URL
const backendUrl = rawBackendUrl ? rawBackendUrl.replace(/\/+$/, '') : ''
let cachedSession = null

export const isBackendConfigured = Boolean(backendUrl)

export function getTelegramInitData() {
  return window?.Telegram?.WebApp?.initData || ''
}

async function requestBackend(path, payload = {}) {
  if (!isBackendConfigured) {
    throw new Error('Backend URL is not configured')
  }

  const initData = getTelegramInitData()
  if (!initData) {
    throw new Error('Telegram initData is unavailable')
  }

  const response = await fetch(`${backendUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ...payload, initData }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || 'Backend request failed')
  }

  return data
}

export function fetchTrustedUser() {
  return fetchTrustedSession()
}

export async function fetchTrustedSession() {
  const data = await requestBackend('/api/auth/session')
  cachedSession = data.session?.accessToken ? data.session : null
  return data
}

export async function getTrustedAccessToken() {
  if (!isBackendConfigured || !getTelegramInitData()) return null

  const nowSeconds = Math.floor(Date.now() / 1000)
  if (cachedSession?.accessToken && cachedSession.expiresAt > nowSeconds + 60) {
    return cachedSession.accessToken
  }

  try {
    const { session } = await fetchTrustedSession()
    return session?.accessToken || null
  } catch (error) {
    console.warn('[Backend] Supabase JWT unavailable:', error)
    return null
  }
}

export async function saveTrustedRole(role) {
  const data = await requestBackend('/api/auth/role', { role })
  cachedSession = data.session?.accessToken ? data.session : null
  return data
}

export async function joinTrustedInvite(inviteToken) {
  const data = await requestBackend('/api/invites/join', { inviteToken })
  cachedSession = data.session?.accessToken ? data.session : null
  return data
}
