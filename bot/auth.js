import { createHmac, timingSafeEqual } from 'node:crypto'
import { config } from './config.js'

function base64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

export function signSupabaseAppJwt(userRow) {
  if (!config.SUPABASE_JWT_SECRET) return null

  const nowSeconds = Math.floor(Date.now() / 1000)
  const expiresAt = nowSeconds + config.SUPABASE_APP_JWT_TTL_SECONDS
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = {
    aud: 'authenticated',
    exp: expiresAt,
    iat: nowSeconds,
    iss: 'tutorspace-bot',
    sub: String(userRow.id),
    role: 'authenticated',
    telegram_id: userRow.telegram_id,
    app_role: userRow.role || 'student',
  }

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`
  const signature = createHmac('sha256', config.SUPABASE_JWT_SECRET).update(unsignedToken).digest()
  return {
    accessToken: `${unsignedToken}.${base64Url(signature)}`,
    expiresAt,
  }
}

export function verifyTelegramInitData(initData) {
  if (typeof initData !== 'string' || !initData) {
    throw new Error('Telegram initData is required')
  }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) throw new Error('Telegram initData hash is missing')

  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(config.BOT_TOKEN).digest()
  const calculatedHash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  const expected = Buffer.from(hash, 'hex')
  const actual = Buffer.from(calculatedHash, 'hex')

  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Telegram initData hash is invalid')
  }

  const authDate = Number(params.get('auth_date') || 0)
  const nowSeconds = Math.floor(Date.now() / 1000)
  if (!authDate || (config.INIT_DATA_MAX_AGE_SECONDS > 0 && nowSeconds - authDate > config.INIT_DATA_MAX_AGE_SECONDS)) {
    throw new Error('Telegram initData is expired')
  }

  const telegramUser = JSON.parse(params.get('user') || 'null')
  if (!telegramUser?.id) throw new Error('Telegram user is missing')

  return telegramUser
}
