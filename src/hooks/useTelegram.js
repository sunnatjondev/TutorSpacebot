import { useEffect, useState } from 'react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Xayrli tong'
  if (hour < 17) return 'Xayrli kun'
  return 'Xayrli kech'
}

function getGreetingRu() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Доброе утро'
  if (hour < 17) return 'Добрый день'
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
      tg.enableClosingConfirmation?.()
      setUser(tg.initDataUnsafe?.user || null)
    } else {
      setUser(null)
    }

    setReady(true)
  }, [tg])

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
    } else if (url) {
      window.open(url, '_blank')
    }
  }

  const openTelegramLink = (url) => {
    if (tg) {
      tg.openTelegramLink(url)
    } else if (url) {
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

export function useTelegramBackButton(callback) {
  const { showBackButton, hideBackButton } = useTelegram()

  useEffect(() => {
    showBackButton(callback)
    return () => hideBackButton()
  }, [callback]) // eslint-disable-line react-hooks/exhaustive-deps
}
