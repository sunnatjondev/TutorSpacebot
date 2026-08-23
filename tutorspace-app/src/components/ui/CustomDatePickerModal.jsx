import { useState } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../../i18n/index.jsx'

export function CustomDatePickerModal({ isOpen, onClose, selectedDate, onSelectDate, haptic, markedDates = [] }) {
  const { lang } = useI18n()
  const [currentMonth, setCurrentMonth] = useState(() => new Date(selectedDate || new Date()))

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ]
  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
  ]

  const isRu = lang === 'ru'
  const displayMonth = isRu ? monthNamesRu[month] : monthNames[month]

  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7

  const handlePrevMonth = () => {
    haptic?.light()
    setCurrentMonth(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    haptic?.light()
    setCurrentMonth(new Date(year, month + 1, 1))
  }

  const days = []
  for (let index = 0; index < firstDayIndex; index += 1) {
    days.push(null)
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push(new Date(year, month, day))
  }

  const isSameDay = (left, right) => {
    if (!left || !right) return false
    return left.getFullYear() === right.getFullYear() &&
      left.getMonth() === right.getMonth() &&
      left.getDate() === right.getDate()
  }

  const weekdayLabels = isRu
    ? ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
    : ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya']

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isRu ? 'Выбор даты' : 'Sana tanlash'}>
      <div className="space-y-4 text-on-surface">
        <div className="flex items-center justify-between px-1">
          <button
            onClick={handlePrevMonth}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-lg active:scale-90 transition-transform text-on-surface"
          >
            &lt;
          </button>
          <span className="font-extrabold text-base text-on-surface">{displayMonth} {year}</span>
          <button
            onClick={handleNextMonth}
            className="w-9 h-9 rounded-full bg-surface-container flex items-center justify-center font-bold text-lg active:scale-90 transition-transform text-on-surface"
          >
            &gt;
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {weekdayLabels.map((label) => (
            <span key={label} className="text-[11px] font-bold text-on-surface-variant py-1">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((dateObj, index) => {
            if (!dateObj) {
              return <div key={`empty-${index}`} />
            }

            const isSelected = isSameDay(dateObj, selectedDate)
            const isToday = isSameDay(dateObj, new Date())
            const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`
            const hasLesson = markedDates.some((d) => {
              if (typeof d === 'string') return d === dateKey || d.startsWith(dateKey)
              return isSameDay(d, dateObj)
            })

            return (
              <button
                key={`day-${index}`}
                onClick={() => {
                  haptic?.selection()
                  onSelectDate(dateObj)
                  onClose()
                }}
                className={`h-10 w-full rounded-xl text-sm font-semibold flex flex-col items-center justify-center relative transition-all duration-150 ${
                  isSelected
                    ? 'bg-brand text-on-primary shadow-glow-sm font-bold'
                    : isToday
                      ? 'bg-surface-high border border-brand/50 text-primary font-bold'
                      : 'text-on-surface hover:bg-surface-high active:scale-90'
                }`}
              >
                <span>{dateObj.getDate()}</span>
                {hasLesson && (
                  <span
                    className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                      isSelected ? 'bg-on-primary' : 'bg-primary shadow-glow-primary'
                    }`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
