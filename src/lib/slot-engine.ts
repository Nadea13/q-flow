import { addMinutes, isBefore, parseISO } from 'date-fns'
import type { Booking, Branch, Merchant, Slot, Staff, TimeSlotOption } from '@/types/database'
import { createBangkokDate, formatBangkokTime } from './date-utils'

interface ComputeSlotsParams {
  merchant: Merchant
  branch?: Branch | null
  staffId?: string | null
  staffList?: Staff[] | null
  dateStr: string // "YYYY-MM-DD"
  durationMin: number
  existingBookings: Booking[]
  blockedSlots: Slot[]
}

/**
 * Computes available time slots for a given date and service duration,
 * taking into account staff capacity (multi-staff / multi-chair concurrency).
 */
export function computeAvailableSlots({
  merchant,
  branch,
  staffId,
  staffList,
  dateStr,
  durationMin,
  existingBookings,
  blockedSlots,
}: ComputeSlotsParams): TimeSlotOption[] {
  const openTime = branch?.open_time || merchant.open_time
  const closeTime = branch?.close_time || merchant.close_time

  const intervalMin = merchant.slot_interval_min || 30
  const now = new Date()

  // Base start and end times for the selected date (use Bangkok time for day of week)
  const selectedDateBangkok = createBangkokDate(dateStr, '12:00:00')
  const dayOfWeek = selectedDateBangkok.getDay()

  // Check weekly closed days (from branch if defined, else from merchant)
  const closedDays = branch?.closed_days?.length ? branch.closed_days : (merchant.closed_days || [])
  if (closedDays.includes(dayOfWeek)) {
    return []
  }

  let currentSlotStart = createBangkokDate(dateStr, openTime)
  const dayCloseTime = createBangkokDate(dateStr, closeTime)

  // Determine active staff pool for this branch/shop
  const activeStaff = (staffList || []).filter((s) => {
    if (!s.is_active) return false
    if (branch?.id && s.branch_id && s.branch_id !== branch.id) return false
    return true
  })

  // Total simultaneous capacity for this branch/shop
  // If specific staffId requested: capacity = 1
  // If no staff registered: fallback capacity = 1
  // Otherwise: capacity = number of active staff
  const isSpecificStaff = Boolean(staffId)
  const totalCapacity = isSpecificStaff ? 1 : Math.max(1, activeStaff.length)

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

    // 2. Overlapping active bookings
    const overlappingBookings = existingBookings.filter((booking) => {
      if (booking.status === 'cancelled') return false
      // Filter out expired pending_payment reservations (> 10 mins)
      if (booking.status === 'pending_payment' && booking.created_at) {
        const createdAt = new Date(booking.created_at).getTime()
        if (now.getTime() - createdAt > 10 * 60 * 1000) {
          return false
        }
      }
      const bStart = parseISO(booking.start_time)
      const bEnd = parseISO(booking.end_time)
      return currentSlotStart < bEnd && currentSlotEnd > bStart
    })

    let isBooked = false
    let bookedCount = 0

    if (isSpecificStaff) {
      // If a specific staff is requested, check if that staff has a booking
      const staffBooked = overlappingBookings.some((b) => {
        if (b.staff_id) {
          return b.staff_id === staffId
        }
        return overlappingBookings.length >= (activeStaff.length || 1)
      })
      isBooked = staffBooked
      bookedCount = staffBooked ? 1 : 0
    } else {
      // No specific staff: check against total capacity of available staff
      bookedCount = overlappingBookings.length
      isBooked = bookedCount >= totalCapacity
    }

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
      const breakStart = createBangkokDate(dateStr, breakStartStr)
      const breakEnd = createBangkokDate(dateStr, breakEndStr)

      if (currentSlotStart < breakEnd && currentSlotEnd > breakStart) {
        isDuringBreak = true
      }
    }

    let reason: string | undefined
    if (isPast) {
      reason = 'หมดเวลาจอง'
    } else if (isDuringBreak) {
      reason = 'เวลาพัก'
    } else if (isBlocked) {
      reason = 'ปิดรับรอบนี้'
    } else if (isBooked) {
      reason = isSpecificStaff ? 'ช่างติดคิวแล้ว' : 'คิวเต็มแล้ว'
    }

    const isAvailable = !isPast && !isDuringBreak && !isBooked && !isBlocked
    const remainingCapacity = Math.max(0, totalCapacity - bookedCount)

    slots.push({
      startTime: startISO,
      endTime: endISO,
      displayTime: `${formatBangkokTime(currentSlotStart)} - ${formatBangkokTime(currentSlotEnd)}`,
      isAvailable,
      reason,
      capacity: totalCapacity,
      bookedCount,
      remainingCapacity,
    })

    // Advance by intervalMin
    currentSlotStart = addMinutes(currentSlotStart, intervalMin)
  }

  return slots
}
