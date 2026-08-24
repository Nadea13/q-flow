'use client'

import React, { useMemo } from 'react'
import { Clock } from 'lucide-react'

interface TimePicker24hProps {
  value: string // 'HH:mm' e.g. '10:00', '13:30'
  onChange: (timeStr: string) => void
  stepMinutes?: number // default 15 or 30
  minTime?: string
  maxTime?: string
  required?: boolean
  className?: string
  disabled?: boolean
}

export function TimePicker24h({
  value,
  onChange,
  stepMinutes = 30,
  minTime = '00:00',
  maxTime = '23:59',
  required = false,
  className = '',
  disabled = false,
}: TimePicker24hProps) {
  // Generate 24-hour options in stepMinutes intervals
  const timeOptions = useMemo(() => {
    const options: string[] = []
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m += stepMinutes) {
        const hh = String(h).padStart(2, '0')
        const mm = String(m).padStart(2, '0')
        const timeStr = `${hh}:${mm}`
        if (timeStr >= minTime && timeStr <= maxTime) {
          options.push(timeStr)
        }
      }
    }
    // Also ensure current value is present if not aligned with stepMinutes
    if (value && !options.includes(value)) {
      options.push(value)
      options.sort()
    }
    return options
  }, [stepMinutes, minTime, maxTime, value])

  // Normalize 2-digit HH:mm
  const normalizedValue = value ? value.slice(0, 5) : '10:00'

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <Clock className="w-3.5 h-3.5" />
      </div>

      <select
        value={normalizedValue}
        required={required}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-8 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {timeOptions.map((time) => (
          <option key={time} value={time} className="font-mono text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 py-1">
            {time} น. (24h)
          </option>
        ))}
      </select>

      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] font-mono text-slate-400 dark:text-slate-500 font-semibold">
        น.
      </div>
    </div>
  )
}
