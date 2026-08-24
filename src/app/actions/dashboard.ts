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
  return { success: true }
}
