import { useEffect, useState } from 'react'

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Xayrli tong'
  if (hour < 17) return 'Xayrli kun'
  return 'Xayrli kech'
}

function getGreetingRu() {
  const hour = new Date().getHours()
  if (hour < 12) return '\u0414\u043e\u0431\u0440\u043e\u0435 \u0443\u0442\u0440\u043e'
  if (hour < 17) return '\u0414\u043e\u0431\u0440\u044b\u0439 \u0434\u0435\u043d\u044c'
  return '\u0414\u043e\u0431\u0440\u044b\u0439 \u0432\u0435\u0447\u0435\u0440'
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
