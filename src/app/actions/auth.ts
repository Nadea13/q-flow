'use server'

import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

/**
 * Verifies Merchant Admin PIN Code and creates a secure session cookie
 */
export async function verifyMerchantPinAction(slug: string, pin: string) {
  const supabase = await createClient()

  const { data: merchant, error } = await supabase
    .from('shops')
    .select('id, slug')
    .eq('slug', slug)
    .single()

  if (error || !merchant) {
    return { success: false, error: 'ไม่พบร้านค้านี้' }
  }

  const validPin = '1234'
  if (pin.trim() !== validPin) {
    return { success: false, error: 'รหัส PIN ไม่ถูกต้อง' }
  }

  // Set secure cookie for this specific merchant slug
  const cookieStore = await cookies()
  cookieStore.set(`qflow_auth_${slug}`, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    path: '/',
  })

  return { success: true }
}

/**
 * Verifies LINE LIFF User ID against merchant line_user_id
 */
export async function verifyMerchantLiffAction(slug: string, lineUserId: string) {
  if (!lineUserId) return { success: false, error: 'Missing LINE User ID' }

  const supabase = await createClient()
  const { data: merchant, error } = await supabase
    .from('shops')
    .select('id, slug, line_user_id')
    .eq('slug', slug)
    .single()

  if (error || !merchant) {
    return { success: false, error: 'ไม่พบร้านค้านี้' }
  }

  // If merchant has no line_user_id linked yet, link this first admin line user!
  if (!merchant.line_user_id) {
    await supabase
      .from('shops')
      .update({ line_user_id: lineUserId })
      .eq('id', merchant.id)
  } else if (merchant.line_user_id !== lineUserId) {
    return { success: false, error: 'บัญชี LINE นี้ไม่ใช่ผู้ดูแลของร้านนี้' }
  }

  const cookieStore = await cookies()
  cookieStore.set(`qflow_auth_${slug}`, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
  })

  return { success: true }
}

/**
 * Checks if current user has an active session for this merchant
 */
export async function checkMerchantAuthAction(slug: string) {
  const cookieStore = await cookies()
  const authCookie = cookieStore.get(`qflow_auth_${slug}`)
  return { isAuthenticated: authCookie?.value === 'authenticated' }
}

/**
 * Clears merchant session
 */
export async function logoutMerchantAction(slug: string) {
  const cookieStore = await cookies()
  cookieStore.delete(`qflow_auth_${slug}`)
  return { success: true }
}
