'use client'

import { useState } from 'react'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  getDay, 
  isBefore, 
  isSameDay, 
  startOfToday,
  isSameMonth
} from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'

interface BookingCalendarProps {
  selectedDate: string // "YYYY-MM-DD"
  onSelectDate: (dateStr: string) => void
  closedDays?: number[] // Array of closed day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  lang: 'th' | 'en'
}

export function BookingCalendar({
  selectedDate,
  onSelectDate,
  closedDays = [],
  lang,
}: BookingCalendarProps) {
  const today = startOfToday()
  const [viewDate, setViewDate] = useState<Date>(() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Date(y, m - 1, d || 1)
  })

  const dateLocale = lang === 'th' ? th : enUS

  const monthStart = startOfMonth(viewDate)
  const monthEnd = endOfMonth(viewDate)
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd })

  const startDayOfWeek = getDay(monthStart)
  const emptyDays = Array.from({ length: startDayOfWeek })

  const isCurrentOrPastMonth = !isSameMonth(viewDate, today) && isBefore(viewDate, today)
  const canGoPrevious = !isSameMonth(viewDate, today) && !isCurrentOrPastMonth

  function handlePrevMonth() {
    if (canGoPrevious) {
      setViewDate((d) => subMonths(d, 1))
    }
  }

  function handleNextMonth() {
    setViewDate((d) => addMonths(d, 1))
  }

  const selectedDateObj = (() => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    return new Date(y, m - 1, d)
  })()

  const weekDays = lang === 'th' 
    ? ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      {/* Month & Navigation Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white capitalize">
            {format(viewDate, 'MMMM yyyy', { locale: dateLocale })}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={!canGoPrevious}
            onClick={handlePrevMonth}
            className={`w-8 h-8 rounded-xl flex items-center justify-center transition border ${
              canGoPrevious
                ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 active:scale-95'
                : 'bg-transparent border-transparent text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-30'
            }`}
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleNextMonth}
            className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-750 active:scale-95 flex items-center justify-center transition"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {weekDays.map((w, idx) => (
          <div
            key={idx}
            className={`text-[11px] font-semibold py-1 ${
              closedDays.includes(idx)
                ? 'text-rose-500/80 dark:text-rose-400/80 font-bold'
                : idx === 0 || idx === 6
                ? 'text-rose-500/90 dark:text-rose-400/90'
                : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {w}
            {closedDays.includes(idx) && (
              <span className="block text-[8px] text-rose-500 font-normal leading-none mt-0.5">
                {lang === 'th' ? 'ปิด' : 'Off'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {emptyDays.map((_, i) => (
          <div key={`empty-${i}`} className="h-10 sm:h-11" />
        ))}

        {daysInMonth.map((dayDate) => {
          const isPast = isBefore(dayDate, today)
          const dayOfWeek = getDay(dayDate)
          const isClosedDay = closedDays.includes(dayOfWeek)
          const isDisabled = isPast || isClosedDay
          const isSelected = isSameDay(dayDate, selectedDateObj)
          const isCurrentDay = isSameDay(dayDate, today)
          const dayNum = format(dayDate, 'd')

          return (
            <button
              key={dayDate.toISOString()}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectDate(format(dayDate, 'yyyy-MM-dd'))}
              title={isClosedDay ? (lang === 'th' ? 'ร้านปิดทำการในวันนี้' : 'Shop closed on this day') : undefined}
              className={`h-10 sm:h-11 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition-all relative ${
                isClosedDay
                  ? 'text-rose-400/70 dark:text-rose-500/50 bg-rose-50/30 dark:bg-rose-950/20 cursor-not-allowed border border-dashed border-rose-200/60 dark:border-rose-900/40 select-none'
                  : isPast
                  ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed line-through opacity-40 select-none'
                  : isSelected
                  ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm ring-2 ring-indigo-500/30 font-bold scale-[1.03]'
                  : isCurrentDay
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 active:scale-95'
                  : 'text-slate-700 dark:text-slate-200 bg-slate-50/60 dark:bg-slate-800/30 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-800/80 border border-slate-200 dark:border-slate-800 active:scale-95'
              }`}
            >
              <span>{dayNum}</span>
              {isClosedDay ? (
                <span className="text-[8px] text-rose-500 font-normal scale-90 leading-none">
                  {lang === 'th' ? 'ปิด' : 'Closed'}
                </span>
              ) : isCurrentDay && !isSelected ? (
                <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Selected Date Summary */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          {lang === 'th' ? 'วันที่เลือก:' : 'Selected:'}{' '}
          <strong className="text-slate-900 dark:text-white font-semibold">
            {format(selectedDateObj, 'dd/MM/yyyy')}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => {
            onSelectDate(format(today, 'yyyy-MM-dd'))
            setViewDate(today)
          }}
          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
        >
          {lang === 'th' ? 'เลือกวันนี้' : 'Select Today'}
        </button>
      </div>
    </div>
  )
}
