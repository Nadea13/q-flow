'use server'

import { createClient } from '@/lib/supabase/server'

export async function findMerchantByLineUserIdAction(lineUserId: string) {
  if (!lineUserId) {
    return { success: false, error: 'Missing LINE User ID' }
  }

  const supabase = await createClient()

  const { data: merchant, error } = await supabase
    .from('shops')
    .select('id, name, slug')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !merchant) {
    return { success: false, error: 'ไม่พบร้านค้าที่เชื่อมต่อกับบัญชี LINE นี้' }
  }

  return { success: true, slug: merchant.slug, name: merchant.name }
}

export async function listShopsByLineUserIdAction(lineUserId: string) {
  if (!lineUserId) {
    return { success: false, error: 'Missing LINE User ID', shops: [], merchants: [] }
  }

  const supabase = await createClient()

  const { data: shops, error } = await supabase
    .from('shops')
    .select('id, name, slug, logo_url, plan, subscription_status, created_at')
    .eq('line_user_id', lineUserId)
    .order('created_at', { ascending: false })

  if (error) {
    return { success: false, error: error.message, shops: [], merchants: [] }
  }

  return { success: true, shops: shops || [], merchants: shops || [] }
}

export const findShopByLineUserIdAction = findMerchantByLineUserIdAction
export const listMerchantsByLineUserIdAction = listShopsByLineUserIdAction

