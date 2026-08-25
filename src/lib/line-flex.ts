import { format } from 'date-fns'
import type { Booking, Merchant, Service } from '@/types/database'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

/**
 * Builds a modern Flex Message Ticket for customer confirmation
 */
export function buildBookingSuccessFlex(
  booking: Booking,
  merchant: Merchant,
  service: Service
) {
  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)
  const dateFormatted = format(startTime, 'dd/MM/yyyy')
  const timeFormatted = `${format(startTime, 'HH:mm')} - ${format(endTime, 'HH:mm')} น.`

  const bookingUrl = `${SITE_URL}/${merchant.slug}/booking/${booking.id}`

  return {
    type: 'flex',
    altText: `🎉 ยืนยันการจองคิวสำเร็จ: ${service.title} (${dateFormatted})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F172A',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'QFLOW BOOKING PASS',
            color: '#38BDF8',
            size: 'xxs',
            weight: 'bold',
            letterSpacing: '2px',
          },
          {
            type: 'text',
            text: '🎉 จองคิวสำเร็จแล้ว',
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'md',
          },
          {
            type: 'text',
            text: merchant.name,
            color: '#94A3B8',
            size: 'xs',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'รหัสคิว:',
                color: '#64748B',
                size: 'xs',
                flex: 2,
              },
              {
                type: 'text',
                text: `#${booking.id.slice(0, 8).toUpperCase()}`,
                color: '#0F172A',
                size: 'xs',
                weight: 'bold',
                align: 'end',
                flex: 4,
              },
            ],
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'บริการ',
                    color: '#64748B',
                    size: 'xs',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: service.title,
                    color: '#0F172A',
                    size: 'xs',
                    weight: 'bold',
                    align: 'end',
                    flex: 4,
                    wrap: true,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'วันที่',
                    color: '#64748B',
                    size: 'xs',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: dateFormatted,
                    color: '#0F172A',
                    size: 'xs',
                    align: 'end',
                    flex: 4,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'เวลา',
                    color: '#64748B',
                    size: 'xs',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: timeFormatted,
                    color: '#4F46E5',
                    size: 'xs',
                    weight: 'bold',
                    align: 'end',
                    flex: 4,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'ผู้จอง',
                    color: '#64748B',
                    size: 'xs',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: booking.customer_name,
                    color: '#0F172A',
                    size: 'xs',
                    align: 'end',
                    flex: 4,
                  },
                ],
              },
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: 'มัดจำแล้ว',
                    color: '#10B981',
                    size: 'sm',
                    weight: 'bold',
                    flex: 2,
                  },
                  {
                    type: 'text',
                    text: `฿${Number(booking.deposit_amount).toLocaleString()} บาท`,
                    color: '#10B981',
                    size: 'sm',
                    weight: 'bold',
                    align: 'end',
                    flex: 4,
                  },
                ],
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#F8FAFC',
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#4F46E5',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'ดูบัตรคิว / ใบเสร็จ',
              uri: bookingUrl,
            },
          },
        ],
      },
    },
  }
}

/**
 * Builds a Flex Message Alert for Merchant / Admin
 */
export function buildMerchantAlertFlex(
  booking: Booking,
  merchant: Merchant,
  service: Service
) {
  const startTime = new Date(booking.start_time)
  const dateFormatted = `${format(startTime, 'dd/MM/yyyy HH:mm')} น.`
  const dashboardUrl = `${SITE_URL}/${merchant.slug}/dashboard`

  return {
    type: 'flex',
    altText: `🔔 มีคิวใหม่: ${service.title} (${booking.customer_name})`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#1E1B4B',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'QFLOW MERCHANT ALERT',
            color: '#818CF8',
            size: 'xxs',
            weight: 'bold',
            letterSpacing: '2px',
          },
          {
            type: 'text',
            text: '✨ มีคิวใหม่ (ตรวจสลิปแล้ว)',
            color: '#FFFFFF',
            size: 'lg',
            weight: 'bold',
            margin: 'sm',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
        spacing: 'sm',
        contents: [
          {
            type: 'text',
            text: service.title,
            color: '#0F172A',
            size: 'md',
            weight: 'bold',
          },
          {
            type: 'text',
            text: `📅 ${dateFormatted} น. (${service.duration_min} นาที)`,
            color: '#4F46E5',
            size: 'xs',
            weight: 'bold',
          },
          {
            type: 'separator',
            margin: 'md',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `👤 ลูกค้า: ${booking.customer_name} (${booking.customer_phone})`,
                color: '#334155',
                size: 'xs',
              },
              {
                type: 'text',
                text: `💰 ยอดมัดจำ: ฿${Number(booking.deposit_amount).toLocaleString()} บาท`,
                color: '#10B981',
                size: 'xs',
                weight: 'bold',
              },
              {
                type: 'text',
                text: `🏷️ Ref: ${booking.slip_trans_ref || '-'}`,
                color: '#64748B',
                size: 'xxs',
              },
            ],
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        backgroundColor: '#F8FAFC',
        paddingAll: '14px',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#0F172A',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'เปิด Dashboard',
              uri: dashboardUrl,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'uri',
              label: 'โทรหาลูกค้า',
              uri: `tel:${booking.customer_phone}`,
            },
          },
        ],
      },
    },
  }
}

/**
 * Builds a Shop Welcome & Booking Menu Flex for LINE Bot
 */
export function buildShopMenuFlex(merchant: Merchant, services: Service[]) {
  const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID
  const bookUrl = liffId 
    ? `https://liff.line.me/${liffId}`
    : `${SITE_URL}/${merchant.slug}/book`

  return {
    type: 'flex',
    altText: `ยินดีต้อนรับสู่ ${merchant.name} - จองคิวออนไลน์ 24 ชม.`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#0F172A',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'ONLINE BOOKING',
            color: '#38BDF8',
            size: 'xxs',
            weight: 'bold',
            letterSpacing: '2px',
          },
          {
            type: 'text',
            text: merchant.name,
            color: '#FFFFFF',
            size: 'xl',
            weight: 'bold',
            margin: 'xs',
          },
          {
            type: 'text',
            text: `เปิดบริการ ${merchant.open_time.slice(0, 5)} - ${merchant.close_time.slice(0, 5)} น.`,
            color: '#94A3B8',
            size: 'xs',
            margin: 'xs',
          },
        ],
      },
      body: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#FFFFFF',
        paddingAll: '20px',
        contents: [
          {
            type: 'text',
            text: 'เลือกบริการที่ต้องการและจองรอบเวลาได้ทันทีใน 3 คลิก พร้อมตรวจสลิปอัตโนมัติ',
            color: '#475569',
            size: 'xs',
            wrap: true,
          },
          {
            type: 'separator',
            margin: 'lg',
          },
          {
            type: 'box',
            layout: 'vertical',
            margin: 'md',
            spacing: 'sm',
            contents: services.slice(0, 3).map((svc) => ({
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'text',
                  text: `✂️ ${svc.title}`,
                  color: '#1E293B',
                  size: 'xs',
                  weight: 'bold',
                  flex: 4,
                },
                {
                  type: 'text',
                  text: `฿${Number(svc.price).toLocaleString()}`,
                  color: '#4F46E5',
                  size: 'xs',
                  align: 'end',
                  flex: 2,
                },
              ],
            })),
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        backgroundColor: '#F8FAFC',
        paddingAll: '16px',
        contents: [
          {
            type: 'button',
            style: 'primary',
            color: '#4F46E5',
            height: 'md',
            action: {
              type: 'uri',
              label: '📅 จองคิวออนไลน์ทันที',
              uri: bookUrl,
            },
          },
        ],
      },
    },
  }
}
