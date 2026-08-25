import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLineReplyMessage } from '@/lib/line'
import { buildShopMenuFlex, buildBookingSuccessFlex } from '@/lib/line-flex'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const events = body.events || []

    const supabase = await createClient()

    // Load default demo merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('slug', 'glam-studio')
      .single()

    const { data: services } = await supabase
      .from('services')
      .select('*')
      .eq('merchant_id', merchant?.id || '')
      .eq('is_active', true)
      .limit(3)

    for (const event of events) {
      const replyToken = event.replyToken
      if (!replyToken) continue

      // 1. User Follows LINE OA (Greeting)
      if (event.type === 'follow' && merchant) {
        const welcomeFlex = buildShopMenuFlex(merchant, services || [])
        await sendLineReplyMessage(replyToken, [welcomeFlex])
      }

      // 2. User sends Text message
      if (event.type === 'message' && event.message.type === 'text') {
        const userText = event.message.text.trim().toLowerCase()

        if (
          userText.includes('จอง') ||
          userText.includes('book') ||
          userText.includes('คิว') ||
          userText.includes('menu') ||
          userText.includes('บริการ')
        ) {
          if (merchant) {
            const menuFlex = buildShopMenuFlex(merchant, services || [])
            await sendLineReplyMessage(replyToken, [menuFlex])
          }
        } else if (userText.includes('เช็ค') || userText.includes('ดูคิว') || userText.includes('สถานะ')) {
          // Check upcoming booking for this user
          const lineUserId = event.source?.userId
          if (lineUserId) {
            const { data: userBooking } = await supabase
              .from('bookings')
              .select('*, merchants(*), services(*)')
              .eq('customer_line_id', lineUserId)
              .order('start_time', { ascending: false })
              .limit(1)
              .maybeSingle()

            if (userBooking && userBooking.merchants && userBooking.services) {
              const ticketFlex = buildBookingSuccessFlex(
                userBooking,
                userBooking.merchants,
                userBooking.services
              )
              await sendLineReplyMessage(replyToken, [ticketFlex])
            } else {
              await sendLineReplyMessage(replyToken, [
                {
                  type: 'text',
                  text: 'ไม่พบคิวการจองล่าสุดของคุณ สามารถแตะ "จองคิวออนไลน์" เพื่อเลือกวันและเวลาได้เลยครับ 📅',
                },
              ])
            }
          }
        } else {
          // Default quick menu reply
          if (merchant) {
            const menuFlex = buildShopMenuFlex(merchant, services || [])
            await sendLineReplyMessage(replyToken, [menuFlex])
          }
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Events processed' })
  } catch (err: unknown) {
    console.error('Error handling LINE webhook:', err)
    return NextResponse.json({ success: true }) // Return 200 to acknowledge LINE webhook
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'Q Flow LINE Webhook Gateway is Active',
    endpoints: {
      liff: 'https://liff.line.me/{LIFF_ID}',
      webhook: '/api/line/webhook',
    },
  })
}
