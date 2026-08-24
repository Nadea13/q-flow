import Stripe from 'stripe'
import type { PlanType } from '@/types/database'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key', {
  apiVersion: '2025-02-24.acacia' as Stripe.LatestApiVersion,
  typescript: true,
})

export interface PricingPlan {
  id: PlanType
  name: string
  tagline: string
  priceTHB: number
  quota: number
  popular?: boolean
  features: string[]
}

export const PRICING_PLANS: Record<PlanType, PricingPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    tagline: 'เหมาะสำหรับร้านเริ่มต้น สตูดิโอขนาดกะทัดรัด หรือฟรีแลนซ์',
    priceTHB: 590,
    quota: 300,
    features: [
      'โควตาสลิปตรวจอัตโนมัติ 300 สลิป/เดือน (เฉลี่ย ~10 คิว/วัน)',
      'ระบบปฏิทินจองคิว 24 ชม. ไม่จำกัดจำนวนคิว',
      'LINE LIFF ดึงชื่อและโปรไฟล์ลูกค้าอัตโนมัติ',
      'ส่งตั๋วคิว Boarding Pass เข้าแชท LINE ลูกค้า',
      'Dashboard จัดการคิวและสลิป Real-time',
      'รองรับ 1 สาขา / 1 บัญชีพร้อมเพย์',
      'ระบบรักษาความปลอดภัย Admin PIN Code',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'ยอดนิยมที่สุด สำหรับร้านความงาม สปา คลินิก ที่ต้องการระบบเต็มรูปแบบ',
    priceTHB: 1290,
    quota: 1000,
    popular: true,
    features: [
      'โควตาสลิปตรวจอัตโนมัติ 1,000 สลิป/เดือน (เฉลี่ย ~33+ คิว/วัน)',
      'ทุกฟีเจอร์ในแพ็กเกจ Starter',
      'ระบบตั้งเวลาพักเที่ยงรายวัน (Lunch Break Filter)',
      'Quick Block ล็อกปิดรับคิวกะทันหันใน 1 คลิก',
      'แจ้งเตือนผ่าน LINE Notify และ LINE Flex Message ทันที',
      'บริการเสริมไม่จำกัด + ปรับแต่งแบรนด์ร้านได้',
      'จัดเก็บรูปสลิปบนคลาวด์ความเร็วสูง (Cloudflare R2)',
      'ระบบวิเคราะห์ยอดมัดจำและสถิติคิวเชิงลึก',
      'Priority Support ดูแลระบบแบบพิเศษด่วน',
    ],
  },
}
