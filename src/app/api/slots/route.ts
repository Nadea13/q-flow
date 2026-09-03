import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeAvailableSlots } from '@/lib/slot-engine'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const merchantSlug = searchParams.get('merchantSlug')
  const dateStr = searchParams.get('date') // YYYY-MM-DD
  const durationMin = parseInt(searchParams.get('duration') || '60', 10)
  const branchId = searchParams.get('branchId') || undefined
  const staffId = searchParams.get('staffId') || undefined

  if (!merchantSlug || !dateStr) {
    return NextResponse.json({ error: 'Missing merchantSlug or date' }, { status: 400 })
  }

  const supabase = await createClient()

  // 1. Fetch merchant
  const { data: merchant, error: mError } = await supabase
    .from('shops')
    .select('*')
    .eq('slug', merchantSlug)
    .single()

  if (mError || !merchant) {
    return NextResponse.json({ error: 'Merchant not found' }, { status: 404 })
  }

  // Fetch branch if requested
  let branch = null
  if (branchId) {
    const { data: bData } = await supabase
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single()
    branch = bData
  }

  // 2. Fetch existing bookings for that date (in Bangkok UTC+7)
  const startOfDay = `${dateStr}T00:00:00+07:00`
  const endOfDay = `${dateStr}T23:59:59+07:00`

  let bookingsQuery = supabase
    .from('bookings')
    .select('*')
    .eq('shop_id', merchant.id)
    .neq('status', 'cancelled')
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)

  if (branchId) {
    bookingsQuery = bookingsQuery.eq('branch_id', branchId)
  }

  const { data: bookings } = await bookingsQuery

  // 3. Fetch blocked slots
  const { data: blockedSlots } = await supabase
    .from('slots')
    .select('*')
    .eq('shop_id', merchant.id)
    .gte('start_time', startOfDay)
    .lte('start_time', endOfDay)

  // 4. Fetch active staff for capacity computation
  let staffQuery = supabase
    .from('staff')
    .select('*')
    .eq('shop_id', merchant.id)
    .eq('is_active', true)

  if (branchId) {
    staffQuery = staffQuery.or(`branch_id.eq.${branchId},branch_id.is.null`)
  }

  const { data: staffList } = await staffQuery

  const slots = computeAvailableSlots({
    merchant,
    branch,
    staffId,
    staffList: staffList || [],
    dateStr,
    durationMin,
    existingBookings: bookings || [],
    blockedSlots: blockedSlots || [],
  })

  return NextResponse.json({ slots, merchant, branch })
}
