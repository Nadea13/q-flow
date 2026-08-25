import { addMinutes, format, isBefore, parseISO } from 'date-fns'
import type { Booking, Branch, Merchant, Slot, TimeSlotOption } from '@/types/database'

interface ComputeSlotsParams {
  merchant: Merchant
  branch?: Branch | null
  staffId?: string | null
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
  branch,
  staffId,
  dateStr,
  durationMin,
  existingBookings,
  blockedSlots,
}: ComputeSlotsParams): TimeSlotOption[] {
  const openTime = branch?.open_time || merchant.open_time
  const closeTime = branch?.close_time || merchant.close_time

  const openTimeParts = openTime.split(':')
  const closeTimeParts = closeTime.split(':')

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

  // Check weekly closed days (from branch if defined, else from merchant)
  const closedDays = branch?.closed_days?.length ? branch.closed_days : (merchant.closed_days || [])
  if (closedDays.includes(dayOfWeek)) {
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
      // If staffId is specified, only conflict if booking is for the same staff
      if (staffId && booking.staff_id && booking.staff_id !== staffId) {
        return false
      }
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

    // 4. Check if overlapping with daily shop / branch break time (e.g. Lunch break 12:00 - 13:00)
    let isDuringBreak = false
    const hasBreak = branch?.has_break ?? merchant.has_break
    const breakStartStr = branch?.break_start_time || merchant.break_start_time
    const breakEndStr = branch?.break_end_time || merchant.break_end_time

    if (hasBreak && breakStartStr && breakEndStr) {
      const bStartParts = breakStartStr.split(':').map(Number)
      const bEndParts = breakEndStr.split(':').map(Number)
      const breakStart = new Date(year, month - 1, day, bStartParts[0], bStartParts[1], 0)
      const breakEnd = new Date(year, month - 1, day, bEndParts[0], bEndParts[1], 0)

      if (currentSlotStart < breakEnd && currentSlotEnd > breakStart) {
        isDuringBreak = true
      }
    }

    let reason: string | undefined
    if (isPast) {
      reason = 'หมดเวลาจอง'
    } else if (isDuringBreak) {
      reason = 'เวลาพัก'
    } else if (isBooked) {
      reason = 'จองแล้ว'
    } else if (isBlocked) {
      reason = 'ปิดรับรอบนี้'
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
