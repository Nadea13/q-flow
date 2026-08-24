'use client'

import React, { useRef } from 'react'
import { Calendar as CalendarIcon } from 'lucide-react'
import { format, parseISO } from 'date-fns'

interface FormattedDateInputProps {
  value: string // 'YYYY-MM-DD'
  onChange: (dateStr: string) => void
  min?: string
  max?: string
  required?: boolean
  className?: string
}

export function FormattedDateInput({
  value,
  onChange,
  min,
  max,
  required,
  className = '',
}: FormattedDateInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  let displayDate = ''
  if (value) {
    try {
      const parsed = parseISO(value)
      if (!isNaN(parsed.getTime())) {
        displayDate = format(parsed, 'dd/MM/yyyy')
      }
    } catch {}
  }

  return (
    <div
      onClick={() => {
        try {
          inputRef.current?.showPicker?.()
        } catch {
          inputRef.current?.focus()
        }
      }}
      className={`relative flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl hover:border-indigo-500/60 dark:hover:border-indigo-500/60 transition group cursor-pointer ${className}`}
    >
      <div className="flex items-center gap-2 shrink-0">
        <CalendarIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 transition-colors" />
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-white tracking-wide">
          {displayDate || 'dd/mm/yyyy'}
        </span>
      </div>

      <span className="text-[10px] text-slate-400 font-mono group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
        (dd/mm/yyyy)
      </span>

      {/* Hidden standard date input that activates native picker */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
      />
    </div>
  )
}
