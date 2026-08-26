'use server'

import { createClient } from '@/lib/supabase/server'

export async function findMerchantByLineUserIdAction(lineUserId: string) {
  if (!lineUserId) {
    return { success: false, error: 'Missing LINE User ID' }
  }

  const supabase = await createClient()

  const { data: merchant, error } = await supabase
    .from('merchants')
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
