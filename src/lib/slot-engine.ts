import { addMinutes, format, isBefore, parseISO } from 'date-fns'
import type { Booking, Merchant, Slot, TimeSlotOption } from '@/types/database'

interface ComputeSlotsParams {
  merchant: Merchant
  dateStr: string // "YYYY-MM-DD"
  durationMin: number
  existingBookings: Booking[]
  blockedSlots: Slot[]
}

/**
 * Computes available time slots for a given date and service duration.
 */
export function computeAvailableSlots({
  merchant,
  dateStr,
  durationMin,
  existingBookings,
  blockedSlots,
}: ComputeSlotsParams): TimeSlotOption[] {
  const openTimeParts = merchant.open_time.split(':')
  const closeTimeParts = merchant.close_time.split(':')

  const openHours = parseInt(openTimeParts[0], 10)
  const openMinutes = parseInt(openTimeParts[1], 10)
  const closeHours = parseInt(closeTimeParts[0], 10)
  const closeMinutes = parseInt(closeTimeParts[1], 10)

  const intervalMin = merchant.slot_interval_min || 30
  const now = new Date()

  // Base start and end times for the selected date
  const [year, month, day] = dateStr.split('-').map(Number)
  const selectedDateObj = new Date(year, month - 1, day)
  const dayOfWeek = selectedDateObj.getDay()

  // If the shop is closed on this day of the week, return empty slots
  if (merchant.closed_days && merchant.closed_days.includes(dayOfWeek)) {
    return []
  }

  let currentSlotStart = new Date(year, month - 1, day, openHours, openMinutes, 0)
  const dayCloseTime = new Date(year, month - 1, day, closeHours, closeMinutes, 0)

  const slots: TimeSlotOption[] = []

  while (true) {
    const currentSlotEnd = addMinutes(currentSlotStart, durationMin)

    // If the service would end after closing time, stop generating slots
    if (currentSlotEnd > dayCloseTime) {
      break
    }

    const startISO = currentSlotStart.toISOString()
    const endISO = currentSlotEnd.toISOString()

    // 1. Check if the slot is in the past
    const isPast = isBefore(currentSlotStart, now)

    // 2. Check if overlapping with existing active bookings
    const isBooked = existingBookings.some((booking) => {
      if (booking.status === 'cancelled') return false
      const bStart = parseISO(booking.start_time)
      const bEnd = parseISO(booking.end_time)
      return currentSlotStart < bEnd && currentSlotEnd > bStart
    })

    // 3. Check if overlapping with blocked slots
    const isBlocked = blockedSlots.some((slot) => {
      if (!slot.is_blocked) return false
      const sStart = parseISO(slot.start_time)
      const sEnd = parseISO(slot.end_time)
      return currentSlotStart < sEnd && currentSlotEnd > sStart
    })

    // 4. Check if overlapping with daily shop break time (e.g. Lunch break 12:00 - 13:00)
    let isDuringBreak = false
    if (merchant.has_break && merchant.break_start_time && merchant.break_end_time) {
      const bStartParts = merchant.break_start_time.split(':').map(Number)
      const bEndParts = merchant.break_end_time.split(':').map(Number)
      const breakStart = new Date(year, month - 1, day, bStartParts[0], bStartParts[1], 0)
      const breakEnd = new Date(year, month - 1, day, bEndParts[0], bEndParts[1], 0)

      if (currentSlotStart < breakEnd && currentSlotEnd > breakStart) {
        isDuringBreak = true
      }
    }

    let reason: string | undefined
    if (isPast) {
      reason = 'หมดเวลาจองรอบนี้แล้ว'
    } else if (isDuringBreak) {
      reason = 'เวลาพักของร้าน (Break)'
    } else if (isBooked) {
      reason = 'มีลูกค้าจองแล้ว'
    } else if (isBlocked) {
      reason = 'ร้านปิดรับรอบนี้'
    }

    const isAvailable = !isPast && !isDuringBreak && !isBooked && !isBlocked

    slots.push({
      startTime: startISO,
      endTime: endISO,
      displayTime: `${format(currentSlotStart, 'HH:mm')} - ${format(currentSlotEnd, 'HH:mm')}`,
      isAvailable,
      reason,
    })

    // Advance by intervalMin
    currentSlotStart = addMinutes(currentSlotStart, intervalMin)
  }

  return slots
}
