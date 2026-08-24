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
    tagline: 'เหมาะสำหรับร้านเริ่มต้น หรือสตูดิโอขนาดกะทัดรัด',
    priceTHB: 390,
    quota: 150,
    features: [
      'โควตาสลิปตรวจอัตโนมัติ 150 สลิป/เดือน',
      'ระบบปฏิทินจองคิว 24 ชม. ไม่จำกัดจำนวนคิว',
      'LINE LIFF ดึงชื่อและโปรไฟล์ลูกค้าอัตโนมัติ',
      'ส่งตั๋วคิว Boarding Pass เข้าแชท LINE',
      'Dashboard จัดการคิวและสลิป Real-time',
      'รองรับ 1 สาขา / 1 พร้อมเพย์',
    ],
  },
  growth: {
    id: 'growth',
    name: 'Growth',
    tagline: 'ยอดนิยมที่สุด สำหรับร้านความงาม สปา คลินิกที่ลูกค้าแน่น',
    priceTHB: 790,
    quota: 500,
    popular: true,
    features: [
      'โควตาสลิปตรวจอัตโนมัติ 500 สลิป/เดือน',
      'ทุกฟีเจอร์ในแพ็กเกจ Starter',
      'ระบบตั้งเวลาพักเที่ยงรายวัน (Lunch Break Filter)',
      'Quick Block ล็อกปิดรับคิวกะทันหันใน 1 คลิก',
      'แจ้งเตือนผ่าน LINE Notify และ LINE Flex Message ทันที',
      'บริการเสริมไม่จำกัด + สลับธีมสีร้านได้',
      'ซัพพอร์ตช่วยเหลือการติดตั้งด่วน',
    ],
  },
  pro: {
    id: 'pro',
    name: 'Pro / Multi-Branch',
    tagline: 'สำหรับร้านสาขา ยอดจองสูง หรือต้องการการดูแลระดับ VIP',
    priceTHB: 1490,
    quota: 1500,
    features: [
      'โควตาสลิปตรวจอัตโนมัติ 1,500 สลิป/เดือน',
      'ทุกฟีเจอร์ในแพ็กเกจ Growth',
      'รองรับหลายสาขา / Multi-Branch Architecture',
      'ระบบวิเคราะห์ยอดมัดจำและสถิติคิวเชิงลึก',
      'ระบบคลาวด์จัดเก็บรูปสลิปความเร็วสูง (Cloudflare R2)',
      'Priority VIP Support ดูแลระบบแบบ Exclusive 24/7',
    ],
  },
}
