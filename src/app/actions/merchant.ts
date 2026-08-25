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
    .from('merchants')
    .insert({
      name: input.name.trim(),
      slug: slug,
      promptpay_id: input.promptpay_id.trim(),
      promptpay_name: input.promptpay_name?.trim() || input.name.trim(),
      default_deposit: Number(input.default_deposit) || 100,
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
  const { data: firstBranch } = await supabase
    .from('branches')
    .insert({
      merchant_id: merchant.id,
      name: branchName,
      address: branchAddress,
      phone: branchPhone,
      open_time: input.open_time || '10:00:00',
      close_time: input.close_time || '20:00:00',
      is_active: true,
    })
    .select()
    .single()

  // 3. Insert default sample service
  const { data: defaultService } = await supabase
    .from('services')
    .insert({
      merchant_id: merchant.id,
      title: 'บริการทั่วไป (Standard Service)',
      description: 'บริการมาตรฐานของร้าน',
      duration_min: 60,
      price: 500,
      deposit_amount: Number(input.default_deposit) || 100,
      is_active: true,
      sort_order: 1,
    })
    .select()
    .single()

  // 4. Insert default staff member linked to the first branch & service
  if (firstBranch && defaultService) {
    const { data: defaultStaff } = await supabase
      .from('staff')
      .insert({
        merchant_id: merchant.id,
        branch_id: firstBranch.id,
        name: 'ช่างประจำร้าน (Master Specialist)',
        nickname: 'ช่างเอก',
        role_title: 'ช่างผู้ให้บริการหลัก',
        is_active: true,
      })
      .select()
      .single()

    if (defaultStaff) {
      await supabase.from('staff_services').insert({
        staff_id: defaultStaff.id,
        service_id: defaultService.id,
      })
    }
  }

  revalidatePath('/')
  return { success: true, merchant }
}
