'use client'

import { useState, useMemo } from 'react'
import { Sun, CloudSun, Sunset, Moon, Check } from 'lucide-react'
import type { TimeSlotOption } from '@/types/database'

interface SegmentedTimeSlotPickerProps {
  slots: TimeSlotOption[]
  selectedSlot: TimeSlotOption | null
  onSelectSlot: (slot: TimeSlotOption) => void
  durationMin?: number
  accentColor?: 'indigo' | 'emerald'
  lang?: 'th' | 'en'
}

type TimePeriod = 'all' | 'morning' | 'afternoon' | 'evening' | 'night'

export function SegmentedTimeSlotPicker({
  slots,
  selectedSlot,
  onSelectSlot,
  durationMin = 30,
  accentColor = 'emerald',
  lang = 'th',
}: SegmentedTimeSlotPickerProps) {
  const [activePeriod, setActivePeriod] = useState<TimePeriod>('all')

  // Categorize slots into 4 distinct day periods
  const { morningSlots, afternoonSlots, eveningSlots, nightSlots } = useMemo(() => {
    const morning: TimeSlotOption[] = []
    const afternoon: TimeSlotOption[] = []
    const evening: TimeSlotOption[] = []
    const night: TimeSlotOption[] = []

    slots.forEach((slot) => {
      const date = new Date(slot.startTime)
      const hour = date.getHours()

      if (hour < 12) {
        morning.push(slot)
      } else if (hour < 16) {
        afternoon.push(slot)
      } else if (hour < 19) {
        evening.push(slot)
      } else {
        night.push(slot)
      }
    })

    return {
      morningSlots: morning,
      afternoonSlots: afternoon,
      eveningSlots: evening,
      nightSlots: night,
    }
  }, [slots])

  const morningAvail = morningSlots.filter((s) => s.isAvailable).length
  const afternoonAvail = afternoonSlots.filter((s) => s.isAvailable).length
  const eveningAvail = eveningSlots.filter((s) => s.isAvailable).length
  const nightAvail = nightSlots.filter((s) => s.isAvailable).length
  const totalAvail = slots.filter((s) => s.isAvailable).length

  // Build section list dynamically (only include periods that have slots)
  const filteredSections = useMemo(() => {
    const sections: {
      id: TimePeriod
      title: string
      timeRange: string
      icon: typeof Sun
      colorClass: string
      slots: TimeSlotOption[]
      availableCount: number
    }[] = []

    if (activePeriod === 'all' || activePeriod === 'morning') {
      if (morningSlots.length > 0) {
        sections.push({
          id: 'morning',
          title: lang === 'th' ? 'รอบเช้า' : 'Morning',
          timeRange: lang === 'th' ? 'ก่อน 12:00 น.' : 'Before 12:00',
          icon: Sun,
          colorClass: 'text-amber-500',
          slots: morningSlots,
          availableCount: morningAvail,
        })
      }
    }

    if (activePeriod === 'all' || activePeriod === 'afternoon') {
      if (afternoonSlots.length > 0) {
        sections.push({
          id: 'afternoon',
          title: lang === 'th' ? 'รอบบ่าย' : 'Afternoon',
          timeRange: '12:00 - 15:59 น.',
          icon: CloudSun,
          colorClass: 'text-orange-500',
          slots: afternoonSlots,
          availableCount: afternoonAvail,
        })
      }
    }

    if (activePeriod === 'all' || activePeriod === 'evening') {
      if (eveningSlots.length > 0) {
        sections.push({
          id: 'evening',
          title: lang === 'th' ? 'รอบเย็น' : 'Late Afternoon / Evening',
          timeRange: '16:00 - 18:59 น.',
          icon: Sunset,
          colorClass: 'text-rose-500',
          slots: eveningSlots,
          availableCount: eveningAvail,
        })
      }
    }

    if (activePeriod === 'all' || activePeriod === 'night') {
      if (nightSlots.length > 0) {
        sections.push({
          id: 'night',
          title: lang === 'th' ? 'รอบค่ำ' : 'Night',
          timeRange: lang === 'th' ? '19:00 น. เป็นต้นไป' : '19:00 onwards',
          icon: Moon,
          colorClass: 'text-indigo-400',
          slots: nightSlots,
          availableCount: nightAvail,
        })
      }
    }

    return sections
  }, [activePeriod, morningSlots, afternoonSlots, eveningSlots, nightSlots, morningAvail, afternoonAvail, eveningAvail, nightAvail, lang])

  // Styling helpers based on accentColor
  const isEmerald = accentColor === 'emerald'
  const activeBtnClass = isEmerald
    ? 'border-emerald-600 bg-emerald-600 dark:bg-emerald-600 text-white shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
    : 'border-indigo-600 bg-indigo-600 dark:bg-indigo-600 text-white shadow-md shadow-indigo-600/20 ring-2 ring-indigo-500/30'

  const activeTabClass = isEmerald
    ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold shadow-2xs'
    : 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 font-bold shadow-2xs'

  const hoverBtnClass = isEmerald
    ? 'hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/30'
    : 'hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30'

  const subtextSelectedClass = isEmerald
    ? 'text-emerald-100 dark:text-emerald-100 font-medium'
    : 'text-indigo-100 dark:text-indigo-100 font-medium'

  return (
    <div className="space-y-3.5">
      {/* 1. Quick Period Filter Tabs */}
      {slots.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setActivePeriod('all')}
            className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer border ${
              activePeriod === 'all'
                ? activeTabClass
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {lang === 'th' ? 'ทั้งหมด' : 'All'} ({totalAvail})
          </button>

          {morningSlots.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePeriod('morning')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer border ${
                activePeriod === 'morning'
                  ? activeTabClass
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              <span>{lang === 'th' ? 'รอบเช้า' : 'Morning'}</span>
              <span className="text-[10px] opacity-80 font-bold">({morningAvail})</span>
            </button>
          )}

          {afternoonSlots.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePeriod('afternoon')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer border ${
                activePeriod === 'afternoon'
                  ? activeTabClass
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5 text-orange-500" />
              <span>{lang === 'th' ? 'รอบบ่าย' : 'Afternoon'}</span>
              <span className="text-[10px] opacity-80 font-bold">({afternoonAvail})</span>
            </button>
          )}

          {eveningSlots.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePeriod('evening')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer border ${
                activePeriod === 'evening'
                  ? activeTabClass
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Sunset className="w-3.5 h-3.5 text-rose-500" />
              <span>{lang === 'th' ? 'รอบเย็น' : 'Evening'}</span>
              <span className="text-[10px] opacity-80 font-bold">({eveningAvail})</span>
            </button>
          )}

          {nightSlots.length > 0 && (
            <button
              type="button"
              onClick={() => setActivePeriod('night')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition cursor-pointer border ${
                activePeriod === 'night'
                  ? activeTabClass
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
              <span>{lang === 'th' ? 'รอบค่ำ' : 'Night'}</span>
              <span className="text-[10px] opacity-80 font-bold">({nightAvail})</span>
            </button>
          )}
        </div>
      )}

      {/* 2. Grouped Slot Sections */}
      <div className="space-y-4 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
        {filteredSections.map((section) => {
          const SectionIcon = section.icon
          return (
            <div key={section.id} className="space-y-2">
              {/* Section Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <SectionIcon className={`w-3.5 h-3.5 ${section.colorClass}`} />
                  <span>{section.title}</span>
                  <span className="text-[10px] font-normal text-slate-400 dark:text-slate-500">
                    ({section.timeRange})
                  </span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    section.availableCount > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {section.availableCount > 0
                    ? lang === 'th'
                      ? `ว่าง ${section.availableCount} รอบ`
                      : `${section.availableCount} open`
                    : lang === 'th'
                    ? 'เต็มทุกรอบ'
                    : 'Fully booked'}
                </span>
              </div>

              {/* Slot Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {section.slots.map((slot) => {
                  const isSelected = selectedSlot?.startTime === slot.startTime
                  const parts = slot.displayTime.split(' - ')
                  const startTimeStr = parts[0] || slot.displayTime
                  const endTimeStr = parts[1] || ''

                  if (!slot.isAvailable) {
                    return (
                      <div
                        key={slot.startTime}
                        className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 text-center opacity-40 select-none flex flex-col items-center justify-center min-h-[54px]"
                      >
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 line-through">
                          {startTimeStr} น.
                        </span>
                        {slot.reason && (
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
                            {slot.reason}
                          </span>
                        )}
                      </div>
                    )
                  }

                  return (
                    <button
                      key={slot.startTime}
                      type="button"
                      onClick={() => onSelectSlot(slot)}
                      className={`p-2.5 rounded-xl border text-center transition-all active:scale-95 flex flex-col items-center justify-center min-h-[54px] cursor-pointer relative ${
                        isSelected
                          ? activeBtnClass
                          : `bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs ${hoverBtnClass}`
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-extrabold">{startTimeStr} น.</span>
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {endTimeStr && (
                          <span
                            className={`text-[10px] ${
                              isSelected
                                ? subtextSelectedClass
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                          >
                            เสร็จ ~{endTimeStr} น.
                          </span>
                        )}
                        {slot.capacity && slot.capacity > 1 && (
                          <span
                            className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-md ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : (slot.bookedCount || 0) > 0
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {(slot.bookedCount || 0) > 0
                              ? `เหลือ ${slot.remainingCapacity}`
                              : `${slot.capacity} คิว`}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
