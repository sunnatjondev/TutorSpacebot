import { fetchTrustedUser, saveTrustedRole, updateUserSettings } from '../../lib/backend'

export async function upsertTelegramUser() {
  const { user } = await fetchTrustedUser()
  return user
}

export async function saveUserRole(telegramUserOrId, role) {
  const { user } = await saveTrustedRole(role)
  return user
}

export async function updateNotificationPreferences(telegramId, payload) {
  await updateUserSettings(payload)
}
