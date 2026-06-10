import React, { useState } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../../i18n/index.jsx'

export function CustomDatePickerModal({ isOpen, onClose, selectedDate, onSelectDate, haptic }) {
  const { lang } = useI18n()
  const [currentMonth, setCurrentMonth] = useState(() => new Date(selectedDate || new Date()))

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth()

  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 
    'Iyul', 'Avgust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ]
  const monthNamesRu = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
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
  for (let i = 0; i < firstDayIndex; i++) {
    days.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i))
  }

  const isSameDay = (d1, d2) => {
    if (!d1 || !d2) return false
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate()
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
          {weekdayLabels.map((lbl, idx) => (
            <span key={idx} className="text-[11px] font-bold text-on-surface-variant py-1">
              {lbl}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((dateObj, idx) => {
            if (!dateObj) {
              return <div key={`empty-${idx}`} />
            }

            const isSelected = isSameDay(dateObj, selectedDate)
            const isToday = isSameDay(dateObj, new Date())

            return (
              <button
                key={`day-${idx}`}
                onClick={() => {
                  haptic?.selection()
                  onSelectDate(dateObj)
                  onClose()
                }}
                className={`h-9 w-full rounded-xl text-sm font-semibold flex items-center justify-center transition-all duration-150 ${
                  isSelected
                    ? 'bg-brand text-white shadow-glow-sm font-bold'
                    : isToday
                      ? 'bg-surface-high border border-brand/50 text-primary font-bold'
                      : 'text-on-surface hover:bg-surface-high active:scale-90'
                }`}
              >
                {dateObj.getDate()}
              </button>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
