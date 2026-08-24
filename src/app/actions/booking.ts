'use server'

import { createClient } from '@/lib/supabase/server'
import { verifySlipWithSlipOK } from '@/lib/slipok'

interface CreateBookingInput {
  merchantSlug: string
  serviceId: string
  startTime: string // ISO string
  endTime: string   // ISO string
  customerName: string
  customerPhone: string
  customerLineId?: string
  customerNotes?: string
}

export async function createBookingAction(input: CreateBookingInput) {
  const supabase = await createClient()

  // 1. Fetch merchant
  const { data: merchant, error: mError } = await supabase
    .from('merchants')
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
    .eq('merchant_id', merchant.id)
    .single()

  if (sError || !service) {
    return { success: false, error: 'ไม่พบบริการที่เลือก' }
  }

  // 3. Double check slot conflict
  const { data: existingBookings } = await supabase
    .from('bookings')
    .select('id, start_time, end_time, status')
    .eq('merchant_id', merchant.id)
    .neq('status', 'cancelled')
    .lt('start_time', input.endTime)
    .gt('end_time', input.startTime)

  if (existingBookings && existingBookings.length > 0) {
    return { success: false, error: 'ช่วงเวลานี้มีผู้จองแล้ว กรุณาเลือกรอบเวลาอื่น' }
  }

  const depositAmount = service.deposit_amount ?? merchant.default_deposit

  // 4. Create booking in pending_payment status
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .insert({
      merchant_id: merchant.id,
      service_id: service.id,
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

  // 1. Fetch booking with service & merchant
  const { data: booking, error: bError } = await supabase
    .from('bookings')
    .select('*, merchants(*), services(*)')
    .eq('id', bookingId)
    .single()

  if (bError || !booking) {
    return { success: false, error: 'ไม่พบรายการจองนี้' }
  }

  if (booking.status === 'confirmed') {
    return { success: true, message: 'คิวนี้ได้รับการยืนยันเรียบร้อยแล้ว' }
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
    const filePath = `${booking.merchant_id}/${booking.id}_${Date.now()}.${fileExt}`

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

  // 3. Verify with SlipOK
  const merchant = booking.merchants
  const verification = await verifySlipWithSlipOK(
    fileBuffer,
    Number(booking.deposit_amount),
    merchant.promptpay_id
  )

  if (!verification.success) {
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
      merchant: booking.merchants,
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
