'use server'

import { createClient } from '@/lib/supabase/server'
import { verifySlipWithSlipOK } from '@/lib/slipok'
import { verifyTurnstileToken } from '@/lib/turnstile'

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
  // Verify Turnstile security token
  if (input.turnstileToken) {
    const turnstileRes = await verifyTurnstileToken(input.turnstileToken)
    if (!turnstileRes.success) {
      return { success: false, error: turnstileRes.error || 'การตรวจสอบความปลอดภัยล้มเหลว (Bot detected)' }
    }
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

  // 3. Double check slot conflict (if staff specified, check conflict for that staff; otherwise check merchant)
  let conflictQuery = supabase
    .from('bookings')
    .select('id, start_time, end_time, status')
    .eq('shop_id', merchant.id)
    .neq('status', 'cancelled')
    .lt('start_time', input.endTime)
    .gt('end_time', input.startTime)

  if (input.staffId) {
    conflictQuery = conflictQuery.eq('staff_id', input.staffId)
  }

  const { data: existingBookings } = await conflictQuery

  if (existingBookings && existingBookings.length > 0) {
    return { success: false, error: 'ช่วงเวลานี้มีผู้จองกับผู้ให้บริการท่านนี้แล้ว กรุณาเลือกรอบเวลาอื่น' }
  }

  // 4. Resolve Branch ID (from input, staff's branch, or merchant's default first branch)
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

  const depositAmount = service.deposit_amount ?? merchant.default_deposit

  // 5. Create booking in pending_payment status
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .insert({
      shop_id: merchant.id,
      service_id: service.id,
      branch_id: resolvedBranchId,
      staff_id: input.staffId || null,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone.trim(),
      customer_line_id: input.customerLineId?.trim() || null,
      customer_notes: input.customerNotes?.trim() || null,
      start_time: input.startTime,
      end_time: input.endTime,
      total_price: service.price,
      deposit_amount: depositAmount,
      status: 'pending_payment',
    })
    .select()
    .single()

  if (bError || !booking) {
    return { success: false, error: bError?.message || 'เกิดข้อผิดพลาดในการสร้างคำขอจองคิว' }
  }

  return {
    success: true,
    bookingId: booking.id,
    merchantSlug: merchant.slug,
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
    return { success: false, error: 'เกิดข้อผิดพลาดในการบันทึกการยืนยันคิว' }
  }

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
    console.error('Failed to dispatch LINE alert', notifyErr)
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
  }

  return { success: true }
}
