'use server'

import { createClient } from '@/lib/supabase/server'
import { verifySlipWithSlipOK } from '@/lib/slipok'
import { verifyTurnstileToken } from '@/lib/turnstile'
import { logger } from '@/lib/logger'

interface CreateBookingInput {
  merchantSlug: string
  serviceId: string
  branchId?: string
  staffId?: string
  startTime: string // ISO string
  endTime: string   // ISO string
  customerName: string
  customerPhone: string
  customerLineId?: string
  customerNotes?: string
  turnstileToken?: string
}

export async function createBookingAction(input: CreateBookingInput) {
  // Verify Cloudflare Turnstile security token
  const turnstileRes = await verifyTurnstileToken(input.turnstileToken)
  if (!turnstileRes.success) {
    return { success: false, error: turnstileRes.error || 'กรุณายืนยันความปลอดภัยผ่าน Cloudflare Turnstile ก่อนทำการจอง' }
  }

  const supabase = await createClient()

  // 1. Fetch merchant
  const { data: merchant, error: mError } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', input.merchantSlug)
    .single()

  if (mError || !merchant) {
    return { success: false, error: 'ไม่พบข้อมูลร้านค้า' }
  }

  // 2. Fetch service
  const { data: service, error: sError } = await supabase
    .from('services')
    .select('*')
    .eq('id', input.serviceId)
    .eq('shop_id', merchant.id)
    .single()

  if (sError || !service) {
    return { success: false, error: 'ไม่พบบริการที่เลือก' }
  }

  // 3. Resolve Branch ID (from input, staff's branch, or merchant's default first branch)
  let resolvedBranchId = input.branchId || null
  if (!resolvedBranchId && input.staffId) {
    const { data: staffData } = await supabase
      .from('staff')
      .select('branch_id')
      .eq('id', input.staffId)
      .single()
    if (staffData?.branch_id) {
      resolvedBranchId = staffData.branch_id
    }
  }

  if (!resolvedBranchId) {
    const { data: firstBranch } = await supabase
      .from('branches')
      .select('id')
      .eq('shop_id', merchant.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (firstBranch) {
      resolvedBranchId = firstBranch.id
    }
  }

  // 4. Fetch active staff pool for this branch/shop
  let staffQuery = supabase
    .from('staff')
    .select('id, name, branch_id')
    .eq('shop_id', merchant.id)
    .eq('is_active', true)

  if (resolvedBranchId) {
    staffQuery = staffQuery.or(`branch_id.eq.${resolvedBranchId},branch_id.is.null`)
  }

  const { data: activeStaffList } = await staffQuery
  const activeStaff = activeStaffList || []
  const totalCapacity = input.staffId ? 1 : Math.max(1, activeStaff.length)

  // 5. Check overlapping active bookings for this time window
  let conflictQuery = supabase
    .from('bookings')
    .select('id, staff_id, start_time, end_time, status, created_at')
    .eq('shop_id', merchant.id)
    .neq('status', 'cancelled')
    .lt('start_time', input.endTime)
    .gt('end_time', input.startTime)

  if (resolvedBranchId) {
    conflictQuery = conflictQuery.eq('branch_id', resolvedBranchId)
  }

  const { data: rawOverlappingBookings } = await conflictQuery
  const now = new Date()

  // Filter out expired pending_payment bookings (> 10 mins)
  const activeOverlapping = (rawOverlappingBookings || []).filter((b) => {
    if (b.status === 'pending_payment' && b.created_at) {
      const createdAt = new Date(b.created_at).getTime()
      if (now.getTime() - createdAt > 10 * 60 * 1000) {
        return false
      }
    }
    return true
  })

  let assignedStaffId = input.staffId || null

  if (input.staffId) {
    // Specific staff requested: check if that specific staff already has an active booking
    const staffBooked = activeOverlapping.some((b) => b.staff_id === input.staffId)
    if (staffBooked) {
      return {
        success: false,
        error: 'ช่างหรือผู้ให้บริการท่านนี้ติดคิวในช่วงเวลาดังกล่าวแล้ว กรุณาเลือกช่างท่านอื่นหรือเลือกรอบเวลาอื่น',
      }
    }
  } else {
    // No specific staff: check if total capacity for this slot is reached
    if (activeOverlapping.length >= totalCapacity) {
      return {
        success: false,
        error: 'รอบเวลานี้มีผู้จองเต็มจำนวนแล้ว กรุณาเลือกรอบเวลาอื่น',
      }
    }

    // Auto-assign to an available staff member who is free in this time slot
    if (activeStaff.length > 0) {
      const busyStaffIds = new Set(activeOverlapping.map((b) => b.staff_id).filter(Boolean))
      const freeStaff = activeStaff.find((s) => !busyStaffIds.has(s.id))
      if (freeStaff) {
        assignedStaffId = freeStaff.id
      }
    }
  }

  const depositAmount = Number(service.deposit_amount ?? merchant.default_deposit ?? 0)
  const isZeroDeposit = depositAmount <= 0
  const initialStatus = isZeroDeposit ? 'confirmed' : 'pending_payment'

  // 6. Create booking in appropriate status (confirmed if 0 deposit, pending_payment if deposit required)
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .insert({
      shop_id: merchant.id,
      service_id: service.id,
      branch_id: resolvedBranchId,
      staff_id: assignedStaffId,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      customer_line_id: input.customerLineId?.trim() || null,
      customer_notes: input.customerNotes?.trim() || null,
      start_time: input.startTime,
      end_time: input.endTime,
      total_price: service.price,
      deposit_amount: depositAmount,
      status: initialStatus,
    })
    .select()
    .single()

  if (bError || !booking) {
    logger.error('Failed to create booking', { error: bError?.message, shopId: merchant.id, serviceId: service.id })
    return { success: false, error: bError?.message || 'เกิดข้อผิดพลาดในการสร้างคำขอจองคิว' }
  }

  logger.info('Booking created', {
    bookingId: booking.id,
    shopId: merchant.id,
    merchantSlug: merchant.slug,
    serviceId: service.id,
    status: initialStatus,
    customerName: input.customerName,
    startTime: input.startTime,
    isConfirmed: isZeroDeposit,
  })

  // 6. If 0 deposit, dispatch LINE Notification immediately
  if (isZeroDeposit) {
    try {
      const { sendLineBookingNotification } = await import('@/lib/line')
      await sendLineBookingNotification({
        booking: {
          ...booking,
          status: 'confirmed',
        },
        merchant: merchant,
        service: service,
      })
    } catch (notifyErr) {
      logger.error('Failed to dispatch LINE alert for 0 deposit booking', notifyErr)
    }
  }

  return {
    success: true,
    bookingId: booking.id,
    merchantSlug: merchant.slug,
    isConfirmed: isZeroDeposit,
  }
}

export async function verifyAndConfirmBookingAction(bookingId: string, formData: FormData) {
  const supabase = await createClient()

  // 1. Fetch booking with service, merchant, and branch
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .select('*, shops(*), services(*), branch:branches(*)')
    .eq('id', bookingId)
    .single()

  if (bError || !booking) {
    return { success: false, error: 'ไม่พบรายการจองนี้' }
  }

  if (booking.status === 'confirmed') {
    return { success: true, message: 'คิวนี้ได้รับการยืนยันเรียบร้อยแล้ว' }
  }

  if (booking.status === 'cancelled') {
    return { success: false, error: 'รายการจองนี้ถูกยกเลิกเนื่องจากเกินเวลา 10 นาทีแล้ว กรุณาทำรายการจองใหม่' }
  }

  // 1.1 Check 10-minute timeout for pending payment
  const createdAtTime = new Date(booking.created_at).getTime()
  const isExpired = Date.now() - createdAtTime > 10 * 60 * 1000
  if (isExpired && booking.status === 'pending_payment') {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    return { success: false, error: 'หมดเวลาชำระเงินมัดจำ (เกิน 10 นาที) คิวจองนี้ถูกยกเลิกแล้ว กรุณาทำการจองใหม่' }
  }

  // 1.2 Prevent excessive verify attempts on the same booking
  const rawData = (booking.slip_raw_data as Record<string, unknown>) || {}
  const attemptCount = Number(rawData._verify_attempts || 0)
  if (attemptCount >= 5) {
    return {
      success: false,
      error: 'คุณส่งตรวจสอบสลิปเกินจำนวนครั้งที่กำหนด (5 ครั้ง) กรุณาติดต่อทางร้านโดยตรงเพื่อยืนยันคิว',
    }
  }

  const file = formData.get('slip') as File
  if (!file || file.size === 0) {
    return { success: false, error: 'กรุณาเลือกไฟล์สลิปการโอนเงิน' }
  }

  const fileBytes = await file.arrayBuffer()
  const fileBuffer = Buffer.from(fileBytes)

  // 2. Upload file to Cloudflare R2 Storage (or fallback to Supabase Storage)
  let slipPublicUrl: string | null = null
  const { uploadToCloudflareR2 } = await import('@/lib/cloudflare-r2')
  const r2Res = await uploadToCloudflareR2(fileBuffer, file.name, file.type || 'image/jpeg')

  if (r2Res.success && r2Res.url) {
    slipPublicUrl = r2Res.url
  } else {
    // Fallback: Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg'
    const filePath = `${booking.shop_id}/${booking.id}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('slips').getPublicUrl(filePath)
      slipPublicUrl = publicUrlData?.publicUrl || null
    }
  }

  // 3. Verify with SlipOK (using branch PromptPay if set, else merchant PromptPay)
  const merchant = (booking.shops || booking.merchants)
  const branchPromptPay = booking.branch?.promptpay_id
  const targetPromptPayId = branchPromptPay || merchant.promptpay_id

  const verification = await verifySlipWithSlipOK(
    fileBuffer,
    Number(booking.deposit_amount),
    targetPromptPayId
  )

  if (!verification.success) {
    // Record failed attempt
    await supabase
      .from('bookings')
      .update({
        slip_raw_data: {
          ...rawData,
          _verify_attempts: attemptCount + 1,
          _last_error: verification.message,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', booking.id)

    return {
      success: false,
      error: verification.message,
    }
  }

  // 4. Check for duplicate trans_ref in database
  if (verification.transRef) {
    const { data: duplicate } = await supabase
      .from('bookings')
      .select('id, customer_name, created_at')
      .eq('slip_trans_ref', verification.transRef)
      .neq('id', booking.id)
      .maybeSingle()

    if (duplicate) {
      return {
        success: false,
        error: 'สลิปนี้ถูกใช้ยืนยันการจองในระบบแล้ว ไม่สามารถใช้ซ้ำได้ (ป้องกันสลิปวน)',
      }
    }
  }

  // 5. Update booking to confirmed
  const { error: updateError } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      slip_url: slipPublicUrl,
      slip_trans_ref: verification.transRef || null,
      slip_verified_at: new Date().toISOString(),
      slip_raw_data: verification.rawResponse || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', booking.id)

  if (updateError) {
    logger.error('Failed to update booking status to confirmed', { bookingId: booking.id, error: updateError.message })
    return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกการยืนยันคิว' }
  }

  logger.info('Booking confirmed with slip', {
    bookingId: booking.id,
    transRef: verification.transRef,
    depositAmount: booking.deposit_amount,
    shopId: booking.shop_id,
  })

  // 6. Send LINE Notification to merchant
  try {
    const { sendLineBookingNotification } = await import('@/lib/line')
    await sendLineBookingNotification({
      booking: {
        ...booking,
        status: 'confirmed',
        slip_url: slipPublicUrl,
        slip_trans_ref: verification.transRef || null,
      },
      merchant: (booking.shops || booking.merchants),
      service: booking.services,
    })
  } catch (notifyErr) {
    logger.error('Failed to dispatch LINE alert', notifyErr)
  }

  return {
    success: true,
    message: verification.message,
    transRef: verification.transRef,
  }
}

export async function expireBookingAction(bookingId: string) {
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, status')
    .eq('id', bookingId)
    .single()

  if (booking && booking.status === 'pending_payment') {
    await supabase
      .from('bookings')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    logger.info('Booking expired and cancelled', { bookingId })
  }

  return { success: true }
}

export async function searchCustomerBookingsAction(merchantSlug: string, rawQuery: string) {
  const supabase = await createClient()

  // 1. Resolve Shop
  const { data: shop, error: shopErr } = await supabase
    .from('shops')
    .select('id')
    .eq('slug', merchantSlug)
    .single()

  if (shopErr || !shop) {
    return { success: false, error: 'ไม่พบข้อมูลร้านค้านี้' }
  }

  const query = rawQuery.trim().replace(/^#/, '')
  if (!query) {
    return { success: false, error: 'กรุณากรอกเบอร์โทรศัพท์หรือรหัสคิว' }
  }

  // 2. Call RPC search_bookings
  const { data: rawBookings, error: rpcErr } = await supabase
    .rpc('search_bookings', {
      p_shop_id: shop.id,
      p_query: query
    })

  if (rpcErr) {
    logger.error('search_bookings RPC error', { error: rpcErr.message, query })
    return { success: false, error: 'เกิดข้อผิดพลาดในการค้นหาคิว' }
  }

  if (!rawBookings || rawBookings.length === 0) {
    return { success: true, bookings: [] }
  }

  // 3. Hydrate relations (services, branches, staff)
  const bookingIds = rawBookings.map((b: { id: string }) => b.id)
  const { data: enrichedBookings, error: enrichErr } = await supabase
    .from('bookings')
    .select('*, services(*), branch:branches(*), staff:staff(*)')
    .in('id', bookingIds)
    .order('start_time', { ascending: false })

  if (enrichErr) {
    return { success: true, bookings: rawBookings }
  }

  return { success: true, bookings: enrichedBookings || [] }
}
