'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Check } from 'lucide-react'

interface TimePicker24hProps {
  value: string // 'HH:mm' e.g. '10:00', '13:30'
  onChange: (timeStr: string) => void
  className?: string
  disabled?: boolean
  align?: 'left' | 'right'
}

const ITEM_HEIGHT = 40 // exactly 40px per item
const VISIBLE_ROWS = 5 // 5 items visible
const CONTAINER_HEIGHT = ITEM_HEIGHT * VISIBLE_ROWS // 200px
const PADDING_OFFSET = ITEM_HEIGHT * 2 // 80px (centers the 3rd row)

export function TimePicker24h({
  value,
  onChange,
  className = '',
  disabled = false,
  align = 'left',
}: TimePicker24hProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const hourScrollRef = useRef<HTMLDivElement>(null)
  const minuteScrollRef = useRef<HTMLDivElement>(null)

  // Normalize HH:mm from prop
  const normalizedValue = value ? value.slice(0, 5) : '10:00'
  const [propH, propM] = useMemo(() => {
    const parts = normalizedValue.split(':')
    const h = parts[0] ? parts[0].padStart(2, '0') : '10'
    const m = parts[1] ? parts[1].padStart(2, '0') : '00'
    return [h, m]
  }, [normalizedValue])

  // Draft state displayed in popover
  const [selectedH, setSelectedH] = useState(propH)
  const [selectedM, setSelectedM] = useState(propM)

  // Hours (00 - 23)
  const hours = useMemo(() => {
    const list: string[] = []
    for (let i = 0; i < 24; i++) {
      list.push(String(i).padStart(2, '0'))
    }
    return list
  }, [])

  // Minutes (00 - 59)
  const minutes = useMemo(() => {
    const list: string[] = []
    for (let i = 0; i < 60; i++) {
      list.push(String(i).padStart(2, '0'))
    }
    return list
  }, [])

  // Flag to avoid firing onChange while we programmatically jump to the initial position
  const isInitializingRef = useRef(false)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Instant scroll jump to exact hour and minute
  const jumpToTime = useCallback((h: string, m: string) => {
    isInitializingRef.current = true
    setSelectedH(h)
    setSelectedM(m)

    const hourIdx = Number(h)
    const minIdx = Number(m)

    if (hourScrollRef.current) {
      hourScrollRef.current.scrollTop = hourIdx * ITEM_HEIGHT
    }
    if (minuteScrollRef.current) {
      minuteScrollRef.current.scrollTop = minIdx * ITEM_HEIGHT
    }

    setTimeout(() => {
      isInitializingRef.current = false
    }, 50)
  }, [])

  // On open, immediately set and jump to the exact time currently in input
  useEffect(() => {
    if (isOpen) {
      jumpToTime(propH, propM)
      const frame = requestAnimationFrame(() => {
        jumpToTime(propH, propM)
      })
      return () => cancelAnimationFrame(frame)
    }
  }, [isOpen, propH, propM, jumpToTime])

  // Handle Hour Scroll
  const handleHourScroll = useCallback(() => {
    const el = hourScrollRef.current
    if (!el || isInitializingRef.current) return

    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(23, rawIndex))
    const currentHour = String(clampedIndex).padStart(2, '0')

    setSelectedH(currentHour)

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      onChange(`${currentHour}:${selectedM}`)
    }, 50)
  }, [onChange, selectedM])

  // Handle Minute Scroll
  const handleMinuteScroll = useCallback(() => {
    const el = minuteScrollRef.current
    if (!el || isInitializingRef.current) return

    const rawIndex = Math.round(el.scrollTop / ITEM_HEIGHT)
    const clampedIndex = Math.max(0, Math.min(59, rawIndex))
    const currentMinute = String(clampedIndex).padStart(2, '0')

    setSelectedM(currentMinute)

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    debounceTimerRef.current = setTimeout(() => {
      onChange(`${selectedH}:${currentMinute}`)
    }, 50)
  }, [onChange, selectedH])

  // Click on a specific hour item
  function handleSelectHourItem(h: string) {
    setSelectedH(h)
    onChange(`${h}:${selectedM}`)
    if (hourScrollRef.current) {
      hourScrollRef.current.scrollTo({
        top: Number(h) * ITEM_HEIGHT,
        behavior: 'smooth',
      })
    }
  }

  // Click on a specific minute item
  function handleSelectMinuteItem(m: string) {
    setSelectedM(m)
    onChange(`${selectedH}:${m}`)
    if (minuteScrollRef.current) {
      minuteScrollRef.current.scrollTo({
        top: Number(m) * ITEM_HEIGHT,
        behavior: 'smooth',
      })
    }
  }

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

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-900 border rounded-xl text-xs font-mono font-bold text-slate-900 dark:text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs group ${
          isOpen
            ? 'border-indigo-500 ring-2 ring-indigo-500/20'
            : 'border-slate-300 dark:border-slate-800'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
          <span className="tracking-wide text-xs">{normalizedValue}</span>
        </div>
        <span className="text-[10px] font-sans text-slate-400 dark:text-slate-500 font-semibold">
          น.
        </span>
      </button>

      {/* Dual Column Scroll Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } top-full mt-1.5 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 p-3 overflow-hidden select-none`}
          >
            {/* Header / Current Time Preview */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>เลือกเวลา (24 ชั่วโมง)</span>
              </div>
              <div className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-800/80 rounded-lg text-xs font-mono font-extrabold text-indigo-600 dark:text-indigo-300">
                {selectedH}:{selectedM} น.
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-2 text-center text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 uppercase tracking-wider">
              <span>ชั่วโมง</span>
              <span>นาที</span>
            </div>

            {/* Dual Scroll Wheel Area */}
            <div
              className="relative grid grid-cols-2 gap-2 overflow-hidden rounded-xl bg-slate-50/50 dark:bg-slate-950/40"
              style={{ height: `${CONTAINER_HEIGHT}px` }}
            >
              {/* Highlight selection bar in center */}
              <div
                className="absolute left-1 right-1 pointer-events-none rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/70 z-0 shadow-2xs"
                style={{
                  top: `${PADDING_OFFSET}px`,
                  height: `${ITEM_HEIGHT}px`,
                }}
              />

              {/* Hours Column (00 - 23) */}
              <div
                ref={hourScrollRef}
                onScroll={handleHourScroll}
                className="relative z-10 overflow-y-auto pr-1 border-r border-slate-100 dark:border-slate-800/80 snap-y snap-mandatory"
                style={{
                  paddingTop: `${PADDING_OFFSET}px`,
                  paddingBottom: `${PADDING_OFFSET}px`,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {hours.map((h) => {
                  const isSelected = selectedH === h
                  return (
                    <button
                      key={h}
                      type="button"
                      onClick={() => handleSelectHourItem(h)}
                      style={{ height: `${ITEM_HEIGHT}px` }}
                      className={`w-full flex items-center justify-center text-xs font-mono transition-all duration-150 snap-center cursor-pointer ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400 font-extrabold text-sm scale-110'
                          : 'text-slate-400 dark:text-slate-500 font-medium hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {h}
                    </button>
                  )
                })}
              </div>

              {/* Minutes Column (00 - 59) */}
              <div
                ref={minuteScrollRef}
                onScroll={handleMinuteScroll}
                className="relative z-10 overflow-y-auto pr-1 snap-y snap-mandatory"
                style={{
                  paddingTop: `${PADDING_OFFSET}px`,
                  paddingBottom: `${PADDING_OFFSET}px`,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {minutes.map((m) => {
                  const isSelected = selectedM === m
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleSelectMinuteItem(m)}
                      style={{ height: `${ITEM_HEIGHT}px` }}
                      className={`w-full flex items-center justify-center text-xs font-mono transition-all duration-150 snap-center cursor-pointer ${
                        isSelected
                          ? 'text-indigo-600 dark:text-indigo-400 font-extrabold text-sm scale-110'
                          : 'text-slate-400 dark:text-slate-500 font-medium hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Footer Confirm Action */}
            <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  onChange(`${selectedH}:${selectedM}`)
                  setIsOpen(false)
                }}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold transition active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Check className="w-3.5 h-3.5" />
                <span>ตกลง ({selectedH}:{selectedM} น.)</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
