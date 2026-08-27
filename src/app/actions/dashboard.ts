'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { BookingStatus } from '@/types/database'

export async function updateBookingStatusAction(
  bookingId: string,
  status: BookingStatus,
  merchantSlug: string
) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('bookings')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', bookingId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${merchantSlug}/dashboard`)
  return { success: true }
}

export async function createManualBookingAction(input: {
  merchantId: string
  merchantSlug: string
  serviceId: string
  branchId?: string
  staffId?: string
  startTime: string
  endTime: string
  customerName: string
  customerPhone?: string
  customerLineId?: string
  notes?: string
  depositAmount: number
  status: BookingStatus
}) {
  const supabase = await createClient()

  // Resolve branch_id from input, staff's branch, or first branch
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
      .eq('merchant_id', input.merchantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()
    if (firstBranch) {
      resolvedBranchId = firstBranch.id
    }
  }

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      merchant_id: input.merchantId,
      service_id: input.serviceId,
      branch_id: resolvedBranchId,
      staff_id: input.staffId || null,
      start_time: input.startTime,
      end_time: input.endTime,
      customer_name: input.customerName.trim(),
      customer_phone: input.customerPhone?.trim() || '-',
      customer_line_id: input.customerLineId?.trim() || null,
      customer_notes: input.notes?.trim() || 'โทรจอง / ลงคิวหน้าร้านโดยแอดมิน',
      deposit_amount: Number(input.depositAmount) || 0,
      status: input.status,
    })
    .select('*, services(*)')
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  return { success: true, booking: data }
}

export async function createBlockedSlotAction(input: {
  merchantId: string
  merchantSlug: string
  startTime: string
  endTime: string
  reason?: string
}) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('slots')
    .insert({
      merchant_id: input.merchantId,
      start_time: input.startTime,
      end_time: input.endTime,
      reason: input.reason || 'แอดมินปิดรับคิว',
      is_blocked: true,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  return { success: true, slot: data }
}

export async function deleteBlockedSlotAction(slotId: string, merchantSlug: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('slots').delete().eq('id', slotId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${merchantSlug}/dashboard`)
  return { success: true }
}

export async function saveServiceAction(input: {
  id?: string
  merchantId: string
  merchantSlug: string
  title: string
  description?: string
  duration_min: number
  price: number
  deposit_amount?: number
  is_active?: boolean
}) {
  const supabase = await createClient()

  if (input.id) {
    // Update
    const { error } = await supabase
      .from('services')
      .update({
        title: input.title.trim(),
        description: input.description?.trim() || null,
        duration_min: Number(input.duration_min) || 60,
        price: Number(input.price) || 0,
        deposit_amount: input.deposit_amount ? Number(input.deposit_amount) : null,
        is_active: input.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)

    if (error) return { success: false, error: error.message }
  } else {
    // Create
    const { error } = await supabase.from('services').insert({
      merchant_id: input.merchantId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      duration_min: Number(input.duration_min) || 60,
      price: Number(input.price) || 0,
      deposit_amount: input.deposit_amount ? Number(input.deposit_amount) : null,
      is_active: true,
      sort_order: 99,
    })

    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  return { success: true }
}

export async function deleteServiceAction(serviceId: string, merchantSlug: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('services').delete().eq('id', serviceId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${merchantSlug}/dashboard`)
  return { success: true }
}

export async function updateMerchantBranchAction(input: {
  merchantId: string
  merchantSlug: string
  branch_name: string
  branch_address?: string
  branch_phone?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('merchants')
    .update({
      branch_name: input.branch_name.trim(),
      branch_address: input.branch_address?.trim() || null,
      branch_phone: input.branch_phone?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.merchantId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  return { success: true }
}

export async function updateMerchantSettingsAction(input: {
  merchantId: string
  merchantSlug: string
  name: string
  logo_url?: string | null
  phone?: string
  promptpay_id: string
  promptpay_name?: string
  default_deposit: number
  open_time: string
  close_time: string
  has_break?: boolean
  break_start_time?: string | null
  break_end_time?: string | null
  closed_days?: number[]
  branch_name?: string
  branch_address?: string
  branch_phone?: string
  slot_interval_min: number
  line_notify_token?: string
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('merchants')
    .update({
      name: input.name.trim(),
      logo_url: input.logo_url !== undefined ? input.logo_url : undefined,
      phone: input.phone?.trim() || null,
      promptpay_id: input.promptpay_id.trim(),
      promptpay_name: input.promptpay_name?.trim() || null,
      default_deposit: Number(input.default_deposit) || 100,
      open_time: input.open_time,
      close_time: input.close_time,
      has_break: input.has_break ?? false,
      break_start_time: input.has_break && input.break_start_time ? input.break_start_time : null,
      break_end_time: input.has_break && input.break_end_time ? input.break_end_time : null,
      closed_days: input.closed_days ?? [],
      branch_name: input.branch_name?.trim() || null,
      branch_address: input.branch_address?.trim() || null,
      branch_phone: input.branch_phone?.trim() || null,
      slot_interval_min: Number(input.slot_interval_min) || 30,
      line_notify_token: input.line_notify_token?.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.merchantId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  revalidatePath(`/${input.merchantSlug}/settings`)
  revalidatePath(`/${input.merchantSlug}/book`)
  return { success: true }
}

export async function uploadMerchantLogoAction(formData: FormData) {
  const supabase = await createClient()
  const merchantId = formData.get('merchantId') as string
  const merchantSlug = formData.get('merchantSlug') as string
  const file = formData.get('logo') as File

  if (!merchantId || !merchantSlug) {
    return { success: false, error: 'Merchant identifier missing' }
  }

  if (!file || file.size === 0) {
    return { success: false, error: 'กรุณาเลือกรูปภาพโปรไฟล์ร้าน' }
  }

  // Validate size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, error: 'ขนาดรูปภาพต้องไม่เกิน 5 MB' }
  }

  const fileBytes = await file.arrayBuffer()
  const fileBuffer = Buffer.from(fileBytes)

  let logoPublicUrl: string | null = null

  // 1. Try upload to Cloudflare R2
  const { uploadToCloudflareR2 } = await import('@/lib/cloudflare-r2')
  const r2Res = await uploadToCloudflareR2(fileBuffer, `logo_${file.name}`, file.type || 'image/jpeg')

  if (r2Res.success && r2Res.url) {
    logoPublicUrl = r2Res.url
  } else {
    // 2. Fallback to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg'
    const filePath = `logos/${merchantId}_${Date.now()}.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('slips')
      .upload(filePath, fileBuffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true,
      })

    if (!uploadError) {
      const { data: publicUrlData } = supabase.storage.from('slips').getPublicUrl(filePath)
      logoPublicUrl = publicUrlData?.publicUrl || null
    }
  }

  if (!logoPublicUrl) {
    return { success: false, error: 'ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง' }
  }

  // Update merchant record
  const { error: updateError } = await supabase
    .from('merchants')
    .update({
      logo_url: logoPublicUrl,
      updated_at: new Date().toISOString(),
    })
    .eq('id', merchantId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  revalidatePath(`/${merchantSlug}/dashboard`)
  revalidatePath(`/${merchantSlug}/settings`)
  revalidatePath(`/${merchantSlug}/book`)

  return { success: true, url: logoPublicUrl }
}

// -------------------------------------------------------------
// BRANCH CRUD ACTIONS
// -------------------------------------------------------------
export async function saveBranchAction(input: {
  id?: string
  merchantId: string
  merchantSlug: string
  name: string
  address?: string
  phone?: string
  promptpay_id?: string
  promptpay_name?: string
  open_time?: string
  close_time?: string
  has_break?: boolean
  break_start_time?: string | null
  break_end_time?: string | null
  closed_days?: number[]
  is_active?: boolean
}) {
  const supabase = await createClient()

  // Enforce branch limit based on merchant plan
  if (!input.id) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('plan')
      .eq('id', input.merchantId)
      .single()

    const plan = merchant?.plan || 'professional'
    const maxBranches = plan === 'professional' ? 2 : plan === 'business' ? 5 : Infinity

    const { count } = await supabase
      .from('branches')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', input.merchantId)

    if (count !== null && count >= maxBranches) {
      return {
        success: false,
        error: `แพ็กเกจ ${plan === 'professional' ? 'Professional' : 'Business'} รองรับสูงสุด ${maxBranches} สาขา (กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มสาขา)`
      }
    }
  }

  const payload = {
    merchant_id: input.merchantId,
    name: input.name.trim(),
    address: input.address?.trim() || null,
    phone: input.phone?.trim() || null,
    promptpay_id: input.promptpay_id?.trim() || null,
    promptpay_name: input.promptpay_name?.trim() || null,
    open_time: input.open_time || '10:00:00',
    close_time: input.close_time || '20:00:00',
    has_break: input.has_break ?? true,
    break_start_time: input.has_break && input.break_start_time ? input.break_start_time : null,
    break_end_time: input.has_break && input.break_end_time ? input.break_end_time : null,
    closed_days: input.closed_days || [],
    is_active: input.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  if (input.id) {
    const { error } = await supabase
      .from('branches')
      .update(payload)
      .eq('id', input.id)

    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase.from('branches').insert(payload)
    if (error) return { success: false, error: error.message }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  revalidatePath(`/${input.merchantSlug}/book`)
  return { success: true }
}

export async function deleteBranchAction(branchId: string, merchantSlug: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('branches').delete().eq('id', branchId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/${merchantSlug}/dashboard`)
  revalidatePath(`/${merchantSlug}/book`)
  return { success: true }
}

// -------------------------------------------------------------
// STAFF & PROVIDER CRUD ACTIONS
// -------------------------------------------------------------
export async function saveStaffAction(input: {
  id?: string
  merchantId: string
  merchantSlug: string
  branchId?: string | null
  name: string
  nickname?: string
  role_title?: string
  avatar_url?: string
  is_active?: boolean
  serviceIds?: string[] // Array of service IDs this staff provides
}) {
  const supabase = await createClient()

  // Enforce staff limit based on merchant plan
  if (!input.id) {
    const { data: merchant } = await supabase
      .from('merchants')
      .select('plan')
      .eq('id', input.merchantId)
      .single()

    const plan = merchant?.plan || 'professional'
    const maxStaff = plan === 'professional' ? 5 : plan === 'business' ? 20 : Infinity

    const { count } = await supabase
      .from('staff')
      .select('*', { count: 'exact', head: true })
      .eq('merchant_id', input.merchantId)

    if (count !== null && count >= maxStaff) {
      return {
        success: false,
        error: `แพ็กเกจ ${plan === 'professional' ? 'Professional' : 'Business'} รองรับช่างสูงสุด ${maxStaff} ท่าน (กรุณาอัปเกรดแพ็กเกจเพื่อเพิ่มช่าง)`
      }
    }
  }

  const payload = {
    merchant_id: input.merchantId,
    branch_id: input.branchId || null,
    name: input.name.trim(),
    nickname: input.nickname?.trim() || null,
    role_title: input.role_title?.trim() || 'ช่างผู้ให้บริการ',
    avatar_url: input.avatar_url?.trim() || null,
    is_active: input.is_active ?? true,
    updated_at: new Date().toISOString(),
  }

  let staffId = input.id

  if (staffId) {
    const { error } = await supabase
      .from('staff')
      .update(payload)
      .eq('id', staffId)

    if (error) return { success: false, error: error.message }
  } else {
    const { data: newStaff, error } = await supabase
      .from('staff')
      .insert(payload)
      .select('id')
      .single()

    if (error || !newStaff) return { success: false, error: error?.message || 'Failed to create staff' }
    staffId = newStaff.id
  }

  // Update staff_services associations if serviceIds provided
  if (input.serviceIds !== undefined && staffId) {
    // Delete existing
    await supabase.from('staff_services').delete().eq('staff_id', staffId)

    // Insert selected
    if (input.serviceIds.length > 0) {
      const inserts = input.serviceIds.map((svcId) => ({
        staff_id: staffId as string,
        service_id: svcId,
      }))
      await supabase.from('staff_services').insert(inserts)
    }
  }

  revalidatePath(`/${input.merchantSlug}/dashboard`)
  revalidatePath(`/${input.merchantSlug}/book`)
  return { success: true, staffId }
}

export async function deleteStaffAction(staffId: string, merchantSlug: string) {
  const supabase = await createClient()

  const { error } = await supabase.from('staff').delete().eq('id', staffId)
  if (error) return { success: false, error: error.message }

  revalidatePath(`/${merchantSlug}/dashboard`)
  revalidatePath(`/${merchantSlug}/book`)
  return { success: true }
}

