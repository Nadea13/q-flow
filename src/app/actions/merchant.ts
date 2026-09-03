'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { PRICING_PLANS } from '@/lib/stripe'
import { logger } from '@/lib/logger'

interface CreateMerchantInput {
  name: string
  promptpay_id: string
  promptpay_name?: string
  default_deposit: number
  line_user_id?: string
  phone?: string
  logo_url?: string
  open_time?: string
  close_time?: string
  customSlug?: string
  branch_name?: string
  branch_address?: string
  branch_phone?: string
  branch_promptpay_id?: string
  branch_promptpay_name?: string
  plan?: string
  // Step 3: Staff & Service
  staff_name?: string
  staff_nickname?: string
  staff_role?: string
  service_title?: string
  service_duration?: number
  service_price?: number
}

function generateSlug(name: string): string {
  const clean = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')

  const suffix = Math.floor(1000 + Math.random() * 9000)
  return clean ? `${clean}-${suffix}` : `shop-${suffix}`
}

export async function createMerchantAction(input: CreateMerchantInput) {
  const supabase = await createClient()

  const slug = input.customSlug?.trim() || generateSlug(input.name)
  const branchName = input.branch_name?.trim() || 'สาขาหลัก (Main Branch)'
  const branchAddress = input.branch_address?.trim() || null
  const branchPhone = input.branch_phone?.trim() || input.phone?.trim() || input.promptpay_id.trim()

  const plan = input.plan || undefined
  const subscriptionStatus = plan ? 'active' : undefined
  const monthlySlipQuota = plan ? (PRICING_PLANS[plan]?.quota || (plan === 'basic' || plan === 'free' ? 30 : plan === 'professional' ? 500 : plan === 'business' ? 1500 : 5000)) : undefined

  // 1. Insert merchant with fallback for schema differences
  const fullPayload: Record<string, unknown> = {
    name: input.name.trim(),
    slug: slug,
    logo_url: input.logo_url?.trim() || undefined,
    promptpay_id: input.promptpay_id.trim(),
    promptpay_name: input.promptpay_name?.trim() || input.name.trim(),
    default_deposit: input.default_deposit !== undefined && !isNaN(Number(input.default_deposit)) ? Number(input.default_deposit) : 100,
    line_user_id: input.line_user_id || undefined,
    phone: input.phone?.trim() || input.promptpay_id.trim(),
    open_time: input.open_time || '10:00:00',
    close_time: input.close_time || '20:00:00',
    slot_interval_min: 30,
    is_active: true,
    plan: plan,
    subscription_status: subscriptionStatus,
    monthly_slip_quota: monthlySlipQuota,
  }

  let { data: merchant, error: mError } = await supabase
    .from('shops')
    .insert(fullPayload)
    .select()
    .single()

  // Graceful fallback if database schema does not have the newer subscription/billing columns
  if (mError && (mError.message?.includes('schema cache') || mError.code === 'PGRST204')) {
    const basePayload: Record<string, unknown> = {
      name: input.name.trim(),
      slug: slug,
      promptpay_id: input.promptpay_id.trim(),
      promptpay_name: input.promptpay_name?.trim() || input.name.trim(),
      default_deposit: input.default_deposit !== undefined && !isNaN(Number(input.default_deposit)) ? Number(input.default_deposit) : 100,
      line_user_id: input.line_user_id || undefined,
      phone: input.phone?.trim() || input.promptpay_id.trim(),
      open_time: input.open_time || '10:00:00',
      close_time: input.close_time || '20:00:00',
      slot_interval_min: 30,
      is_active: true,
    }

    const retryRes = await supabase
      .from('shops')
      .insert(basePayload)
      .select()
      .single()

    merchant = retryRes.data
    mError = retryRes.error
  }

  if (mError || !merchant) {
    if (mError?.code === '23505') {
      return { success: false, error: 'ชื่อลิงก์ร้านค้า (Slug) นี้มีผู้ใช้งานแล้ว โปรดลองใหม่อีกครั้ง' }
    }
    return { success: false, error: mError?.message || 'ไม่สามารถสร้างร้านค้าได้' }
  }

  // Automatically authorize creator on this device
  const cookieStore = await cookies()
  cookieStore.set(`qflow_auth_${slug}`, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  // 2. Insert first branch in `branches` table
  const { data: branch } = await supabase
    .from('branches')
    .insert({
      shop_id: merchant.id,
      name: branchName,
      address: branchAddress,
      phone: branchPhone,
      promptpay_id: input.branch_promptpay_id?.trim() || null,
      promptpay_name: input.branch_promptpay_name?.trim() || null,
      open_time: input.open_time || '10:00:00',
      close_time: input.close_time || '20:00:00',
      is_active: true,
    })
    .select('id')
    .single()

  // 3. Insert initial staff
  const staffName = input.staff_name?.trim() || 'ช่างประจำร้าน'
  const { data: staff } = await supabase
    .from('staff')
    .insert({
      shop_id: merchant.id,
      branch_id: branch?.id || null,
      name: staffName,
      nickname: input.staff_nickname?.trim() || null,
      role_title: input.staff_role?.trim() || 'ผู้ให้บริการ',
      is_active: true,
    })
    .select('id')
    .single()

  // 4. Insert initial service
  const serviceTitle = input.service_title?.trim() || 'บริการทั่วไป'
  const { data: service } = await supabase
    .from('services')
    .insert({
      shop_id: merchant.id,
      title: serviceTitle,
      duration_min: Number(input.service_duration) || 60,
      price: input.service_price !== undefined && !isNaN(Number(input.service_price)) ? Number(input.service_price) : 300,
      deposit_amount: input.default_deposit !== undefined && !isNaN(Number(input.default_deposit)) ? Number(input.default_deposit) : 100,
      is_active: true,
      sort_order: 1,
    })
    .select('id')
    .single()

  // 5. Link staff with service
  if (staff?.id && service?.id) {
    await supabase.from('staff_services').insert({
      staff_id: staff.id,
      service_id: service.id,
    })
  }

  logger.info('New shop created', {
    shopId: merchant.id,
    name: merchant.name,
    slug: merchant.slug,
    plan: merchant.plan || 'free',
  })

  revalidatePath('/')
  return { success: true, merchant }
}

export async function deleteMerchantAction(shopId: string, slug: string) {
  const supabase = await createClient()

  // 1. Delete associated data (cascade or manual cleanup)
  // Staff services
  const { data: staffList } = await supabase.from('staff').select('id').eq('shop_id', shopId)
  if (staffList && staffList.length > 0) {
    const staffIds = staffList.map((s) => s.id)
    await supabase.from('staff_services').delete().in('staff_id', staffIds)
  }

  // Bookings & blocked slots
  await supabase.from('bookings').delete().eq('shop_id', shopId)
  await supabase.from('slots').delete().eq('shop_id', shopId)

  // Staff & Services & Branches
  await supabase.from('staff').delete().eq('shop_id', shopId)
  await supabase.from('services').delete().eq('shop_id', shopId)
  await supabase.from('branches').delete().eq('shop_id', shopId)

  // 2. Delete the shop
  const { error } = await supabase.from('shops').delete().eq('id', shopId)
  if (error) {
    logger.error('Failed to delete shop', { shopId, slug, error: error.message })
    return { success: false, error: error.message }
  }

  // 3. Clear auth cookie for this shop
  const cookieStore = await cookies()
  cookieStore.delete(`qflow_auth_${slug}`)

  logger.info('Shop deleted successfully', { shopId, slug })

  revalidatePath('/')
  revalidatePath('/shops')
  return { success: true }
}

