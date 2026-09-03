'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  isToday,
} from 'date-fns'
import { th } from 'date-fns/locale'

interface FormattedDateInputProps {
  value: string // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void
  min?: string
  max?: string
  required?: boolean
  className?: string
  align?: 'left' | 'right'
}

export function FormattedDateInput({
  value,
  onChange,
  className = '',
  align = 'left',
}: FormattedDateInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Current selected date object
  const selectedDateObj = useMemo(() => {
    if (!value) return new Date()
    try {
      const parsed = parseISO(value)
      return isNaN(parsed.getTime()) ? new Date() : parsed
    } catch {
      return new Date()
    }
  }, [value])

  // Current view month in calendar
  const [viewMonth, setViewMonth] = useState<Date>(selectedDateObj)

  // Sync viewMonth when selected value changes
  useEffect(() => {
    if (value) {
      try {
        const parsed = parseISO(value)
        if (!isNaN(parsed.getTime())) {
          setViewMonth(parsed)
        }
      } catch {}
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Generate calendar days grid (Sunday - Saturday)
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(viewMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 })
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 })
    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [viewMonth])

  // Day names: อา., จ., อ., พ., พฤ., ศ., ส.
  const weekDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

  // Month navigation
  function handlePrevMonth() {
    setViewMonth((prev) => subMonths(prev, 1))
  }

  function handleNextMonth() {
    setViewMonth((prev) => addMonths(prev, 1))
  }

  function handleSelectDay(day: Date) {
    const formatted = format(day, 'yyyy-MM-dd')
    onChange(formatted)
    setIsOpen(false)
  }

  function handleJumpToday() {
    const todayObj = new Date()
    const formatted = format(todayObj, 'yyyy-MM-dd')
    onChange(formatted)
    setViewMonth(todayObj)
    setIsOpen(false)
  }

  // Display text formatted: "25/08/2026"
  const displayFormatted = value
    ? format(selectedDateObj, 'dd/MM/yyyy')
    : 'dd/mm/yyyy'

  // Thai Buddhist Year representation in header: "สิงหาคม 2569 (2026)"
  const monthTitle = format(viewMonth, 'MMMM yyyy', { locale: th })

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-9 flex items-center justify-center gap-2 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border rounded-xl transition cursor-pointer shadow-xs group ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'border-slate-300 dark:border-slate-800'
        }`}
      >
        <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors shrink-0" />
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-wide">
          {displayFormatted}
        </span>
      </button>

      {/* Modern Popover Calendar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } top-full mt-1.5 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-4 select-none overflow-hidden`}
          >
            {/* Header: Month / Year Title & Month Switchers */}
            <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <CalendarIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white capitalize">
                  {monthTitle}
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                  title="เดือนก่อนหน้า"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95 cursor-pointer"
                  title="เดือนถัดไป"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Weekdays Header */}
            <div className="grid grid-cols-7 text-center mb-1">
              {weekDays.map((wd, i) => (
                <div
                  key={wd}
                  className={`text-[11px] font-bold py-1 ${
                    i === 0 ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {wd}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                const isSelected = isSameDay(day, selectedDateObj)
                const isCurrentMonth = isSameMonth(day, viewMonth)
                const isTodayDate = isToday(day)

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectDay(day)}
                    className={`h-8 w-8 mx-auto rounded-xl text-xs font-mono font-semibold transition flex items-center justify-center cursor-pointer active:scale-95 relative ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-extrabold shadow-sm scale-105'
                        : isCurrentMonth
                        ? 'text-slate-800 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-400'
                        : 'text-slate-300 dark:text-slate-600 opacity-40 hover:opacity-80'
                    }`}
                  >
                    <span>{format(day, 'd')}</span>
                    {/* Small Dot indicator for Today if not selected */}
                    {isTodayDate && !isSelected && (
                      <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Footer Quick Action (Jump to Today) */}
            <div className="pt-3 mt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={handleJumpToday}
                className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>เลือกวันนี้ ({format(new Date(), 'dd/MM/yyyy')})</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
