'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check, Search } from 'lucide-react'

export interface DropdownOption<T = string> {
  value: T
  label: string
  sublabel?: string | null
  icon?: React.ReactNode
  avatarUrl?: string | null
  avatarFallback?: string
}

interface CustomDropdownProps<T = string> {
  value: T
  onChange: (value: T) => void
  options: DropdownOption<T>[]
  placeholder?: string
  prefixIcon?: React.ReactNode
  className?: string
  dropdownWidth?: string
  align?: 'left' | 'right'
  disabled?: boolean
  searchable?: boolean
  searchPlaceholder?: string
}

export function CustomDropdown<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  prefixIcon,
  className = '',
  dropdownWidth = 'w-64',
  align = 'left',
  disabled = false,
  searchable = false,
  searchPlaceholder = 'ค้นหา...',
}: CustomDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Find currently selected option
  const selectedOption = options.find((opt) => opt.value === value)

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase().trim()
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q)
      const matchSub = opt.sublabel ? opt.sublabel.toLowerCase().includes(q) : false
      return matchLabel || matchSub
    })
  }, [options, searchQuery])

  // Focus search input on open
  useEffect(() => {
    if (isOpen && searchable) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen, searchable])

  // Close on click outside
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
        className={`w-full h-9 inline-flex items-center justify-between gap-2 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-2xs transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
          isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''
        }`}
      >
        <div className="flex items-center gap-2 min-w-0 truncate text-left">
          {selectedOption?.avatarUrl ? (
            <img
              src={selectedOption.avatarUrl}
              alt={selectedOption.label}
              className="w-5 h-5 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
            />
          ) : selectedOption?.avatarFallback ? (
            <div className="w-5 h-5 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0">
              {selectedOption.avatarFallback}
            </div>
          ) : (
            prefixIcon || selectedOption?.icon
          )}

          <span className={`truncate font-semibold ${selectedOption ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500 font-normal'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 3, scale: 0.97 }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
            className={`absolute ${
              align === 'right' ? 'right-0' : 'left-0'
            } top-full mt-1.5 ${dropdownWidth} max-w-[92vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 overflow-hidden`}
          >
            {/* Optional Search Bar */}
            {searchable && (
              <div className="relative px-1 pt-1 pb-1">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 pr-0.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400 dark:text-slate-500">
                  ไม่พบข้อมูลที่ค้นหา
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = opt.value === value
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => {
                        onChange(opt.value)
                        setIsOpen(false)
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl text-xs transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/80 dark:border-indigo-800/80'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {opt.avatarUrl ? (
                          <img
                            src={opt.avatarUrl}
                            alt={opt.label}
                            className="w-7 h-7 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                          />
                        ) : opt.avatarFallback ? (
                          <div className="w-7 h-7 rounded-lg bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            {opt.avatarFallback}
                          </div>
                        ) : (
                          opt.icon && <div className="shrink-0">{opt.icon}</div>
                        )}

                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {opt.label}
                          </div>
                          {opt.sublabel && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 ml-2" />
                      )}
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
