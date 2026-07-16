const rateLimits = new Map()

export function checkRateLimit(telegramId) {
  const now = Date.now()
  const userRate = rateLimits.get(telegramId) || { count: 0, firstRequest: now }

  if (now - userRate.firstRequest > 60000) {
    userRate.count = 1
    userRate.firstRequest = now
  } else {
    userRate.count++
  }

  rateLimits.set(telegramId, userRate)
  return userRate.count <= 100 // max 100 requests per minute
}
