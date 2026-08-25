import { buildBookingSuccessFlex, buildMerchantAlertFlex } from './line-flex'
import type { Booking, Merchant, Service } from '@/types/database'

interface SendBookingNotificationParams {
  booking: Booking
  merchant: Merchant
  service: Service
}

/**
 * Sends a push message via LINE Messaging API
 */
export async function sendLinePushMessage(toUserId: string, messages: unknown[]) {
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelToken || !toUserId) return { success: false, error: 'Missing token or userId' }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        to: toUserId,
        messages,
      }),
    })

    const data = await res.json().catch(() => ({}))
    return { success: res.ok, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

/**
 * Replies to an event via LINE Messaging API
 */
export async function sendLineReplyMessage(replyToken: string, messages: unknown[]) {
  const channelToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!channelToken || !replyToken) return { success: false, error: 'Missing token or replyToken' }

  try {
    const res = await fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${channelToken}`,
      },
      body: JSON.stringify({
        replyToken,
        messages,
      }),
    })

    const data = await res.json().catch(() => ({}))
    return { success: res.ok, data }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return { success: false, error: msg }
  }
}

/**
 * Sends Booking notifications (both to Customer and Merchant/Admin)
 */
export async function sendLineBookingNotification({
  booking,
  merchant,
  service,
}: SendBookingNotificationParams): Promise<{ success: boolean; message?: string }> {
  // 1. Send Flex Message Confirmation to Customer (if booked via LINE LIFF)
  if (booking.customer_line_id && booking.customer_line_id.startsWith('U')) {
    try {
      const customerFlex = buildBookingSuccessFlex(booking, merchant, service)
      await sendLinePushMessage(booking.customer_line_id, [customerFlex])
    } catch (err) {
      console.error('Failed to send Customer LINE ticket', err)
    }
  }

  // 2. Send Flex Alert to Merchant / Admin (if LINE Messaging API configured)
  const adminUserId = merchant.line_user_id || process.env.LINE_ADMIN_USER_ID
  if (adminUserId) {
    try {
      const merchantFlex = buildMerchantAlertFlex(booking, merchant, service)
      await sendLinePushMessage(adminUserId, [merchantFlex])
    } catch (err) {
      console.error('Failed to send Merchant LINE Push', err)
    }
  }

  // 3. Fallback / Additional LINE Notify (if merchant configured LINE Notify Token)
  const notifyToken = merchant.line_notify_token || process.env.LINE_NOTIFY_DEFAULT_TOKEN
  if (notifyToken) {
    try {
      const message = `
🎉 [Q Flow] มีคิวจองใหม่ & ยืนยันสลิปแล้ว!
----------------------------------
🏢 ร้าน: ${merchant.name}
🔖 รหัสคิว: #${booking.id.slice(0, 8).toUpperCase()}
✂️ บริการ: ${service.title} (${service.duration_min} นาที)
👤 ลูกค้า: ${booking.customer_name} (${booking.customer_phone})
💰 มัดจำ: ฿${Number(booking.deposit_amount).toLocaleString()} บาท
🏷️ Ref: ${booking.slip_trans_ref || '-'}
----------------------------------
ดู Dashboard: ${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/${merchant.slug}/dashboard
      `.trim()

      const params = new URLSearchParams()
      params.append('message', message)
      if (booking.slip_url) {
        params.append('imageThumbnail', booking.slip_url)
        params.append('imageFullsize', booking.slip_url)
      }

      await fetch('https://notify-api.line.me/api/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Bearer ${notifyToken}`,
        },
        body: params,
      })
      return { success: true, message: 'Sent via LINE Notify' }
    } catch (err) {
      console.error('Failed to send LINE Notify', err)
    }
  }

  return { success: true, message: 'LINE alerts dispatched' }
}
