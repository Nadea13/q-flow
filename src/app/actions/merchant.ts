'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateMerchantInput {
  name: string
  promptpay_id: string
  promptpay_name?: string
  default_deposit: number
  admin_pin?: string
  line_user_id?: string
  phone?: string
  logo_url?: string
  open_time?: string
  close_time?: string
  customSlug?: string
  branch_name?: string
  branch_address?: string
  branch_phone?: string
  plan?: string
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
  const pin = input.admin_pin?.trim() || '1234'
  const branchName = input.branch_name?.trim() || 'สาขาหลัก (Main Branch)'
  const branchAddress = input.branch_address?.trim() || null
  const branchPhone = input.branch_phone?.trim() || input.phone?.trim() || input.promptpay_id.trim()

  const plan = input.plan || undefined
  const subscriptionStatus = plan ? 'active' : undefined
  const monthlySlipQuota = plan === 'enterprise' ? 5000 : plan === 'business' ? 1500 : plan === 'professional' ? 500 : undefined

  // 1. Insert merchant
  const { data: merchant, error: mError } = await supabase
    .from('shops')
    .insert({
      name: input.name.trim(),
      slug: slug,
      logo_url: input.logo_url?.trim() || undefined,
      promptpay_id: input.promptpay_id.trim(),
      promptpay_name: input.promptpay_name?.trim() || input.name.trim(),
      default_deposit: input.default_deposit !== undefined && !isNaN(Number(input.default_deposit)) ? Number(input.default_deposit) : 100,
      admin_pin: pin,
      line_user_id: input.line_user_id || undefined,
      phone: input.phone?.trim() || input.promptpay_id.trim(),
      open_time: input.open_time || '10:00:00',
      close_time: input.close_time || '20:00:00',
      branch_name: branchName,
      branch_address: branchAddress,
      slot_interval_min: 30,
      is_active: true,
      plan: plan,
      subscription_status: subscriptionStatus,
      monthly_slip_quota: monthlySlipQuota,
    })
    .select()
    .single()

  if (mError) {
    if (mError.code === '23505') {
      return { success: false, error: 'ชื่อลิงก์ร้านค้า (Slug) นี้มีผู้ใช้งานแล้ว โปรดลองใหม่อีกครั้ง' }
    }
    return { success: false, error: mError.message }
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
  await supabase
    .from('branches')
    .insert({
      shop_id: merchant.id,
      name: branchName,
      address: branchAddress,
      phone: branchPhone,
      open_time: input.open_time || '10:00:00',
      close_time: input.close_time || '20:00:00',
      is_active: true,
    })

  revalidatePath('/')
  return { success: true, merchant }
}
