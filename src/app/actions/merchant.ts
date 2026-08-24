'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateMerchantInput {
  name: string
  promptpay_id: string
  promptpay_name?: string
  default_deposit: number
  phone?: string
  open_time?: string
  close_time?: string
  customSlug?: string
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

  // 1. Insert merchant
  const { data: merchant, error: mError } = await supabase
    .from('merchants')
    .insert({
      name: input.name.trim(),
      slug: slug,
      promptpay_id: input.promptpay_id.trim(),
      promptpay_name: input.promptpay_name?.trim() || input.name.trim(),
      default_deposit: Number(input.default_deposit) || 100,
      phone: input.phone?.trim() || input.promptpay_id.trim(),
      open_time: input.open_time || '10:00:00',
      close_time: input.close_time || '20:00:00',
      slot_interval_min: 30,
      is_active: true,
    })
    .select()
    .single()

  if (mError) {
    if (mError.code === '23505') {
      return { success: false, error: 'ชื่อลิงก์ร้านค้า (Slug) นี้มีผู้ใช้งานแล้ว โปรดลองใหม่อีกครั้ง' }
    }
    return { success: false, error: mError.message }
  }

  // 2. Insert default sample service
  await supabase.from('services').insert({
    merchant_id: merchant.id,
    title: 'บริการทั่วไป (Standard Service)',
    description: 'บริการมาตรฐานของร้าน',
    duration_min: 60,
    price: 500,
    deposit_amount: Number(input.default_deposit) || 100,
    is_active: true,
    sort_order: 1,
  })

  revalidatePath('/')
  return { success: true, merchant }
}
