/**
 * Telegram WebApp hook
 * Works with real Telegram SDK when inside Telegram,
 * and falls back to mock data in browser dev mode.
 */

import { useEffect, useState } from 'react'

const MOCK_USER = {
  id: 123456789,
  first_name: 'Alex',
  last_name: 'Mercer',
  username: 'alexmercer',
  photo_url: null,
  language_code: 'uz',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Xayrli tong'
  if (h < 17) return 'Xayrli kun'
  return 'Xayrli kech'
}

function getGreetingRu() {
  const h = new Date().getHours()
  if (h < 12) return 'Доброе утро'
  if (h < 17) return 'Добрый день'
  return 'Добрый вечер'
}

export function useTelegram() {
  const tg = window?.Telegram?.WebApp
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (tg) {
      tg.ready()
      tg.expand()
      // Disable closing confirmation
      tg.enableClosingConfirmation?.()

      const tgUser = tg.initDataUnsafe?.user
      setUser(tgUser || MOCK_USER)
    } else {
      // Browser dev mode
      setUser(MOCK_USER)
    }
    setReady(true)
  }, [])

  const displayName = user?.first_name || 'User'

  const showBackButton = (callback) => {
    if (tg?.BackButton) {
      tg.BackButton.show()
      tg.BackButton.onClick(callback)
    }
  }

  const hideBackButton = () => {
    if (tg?.BackButton) {
      tg.BackButton.hide()
      tg.BackButton.offClick()
    }
  }

  const showMainButton = (text, callback) => {
    if (tg?.MainButton) {
      tg.MainButton.setText(text)
      tg.MainButton.show()
      tg.MainButton.onClick(callback)
    }
  }

  const hideMainButton = () => {
    if (tg?.MainButton) {
      tg.MainButton.hide()
      tg.MainButton.offClick()
    }
  }

  const haptic = {
    light: () => tg?.HapticFeedback?.impactOccurred('light'),
    medium: () => tg?.HapticFeedback?.impactOccurred('medium'),
    heavy: () => tg?.HapticFeedback?.impactOccurred('heavy'),
    success: () => tg?.HapticFeedback?.notificationOccurred('success'),
    error: () => tg?.HapticFeedback?.notificationOccurred('error'),
    warning: () => tg?.HapticFeedback?.notificationOccurred('warning'),
    selection: () => tg?.HapticFeedback?.selectionChanged(),
  }

  const openLink = (url) => {
    if (tg) {
      tg.openLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const openTelegramLink = (url) => {
    if (tg) {
      tg.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  return {
    tg,
    user,
    ready,
    displayName,
    greeting: getGreeting(),
    greetingRu: getGreetingRu(),
    isInTelegram: !!tg,
    showBackButton,
    hideBackButton,
    showMainButton,
    hideMainButton,
    haptic,
    openLink,
    openTelegramLink,
    themeParams: tg?.themeParams || {},
  }
}

/**
 * Hook to show Telegram back button on sub-pages
 * Automatically shows on mount and hides on unmount
 */
export function useTelegramBackButton(callback) {
  const { showBackButton, hideBackButton } = useTelegram()

  useEffect(() => {
    showBackButton(callback)
    return () => hideBackButton()
  }, [callback]) // eslint-disable-line
}
