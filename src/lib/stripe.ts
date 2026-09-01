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
  priceYearlyTHB: number
  quota: number
  popular?: boolean
  merchantsCount: string
  branchesCount: string
  staffCount: string
  lineSetup: string
  overageRate: string
  supportTier: string
  features: string[]
}

export const PRICING_PLANS: Record<string, PricingPlan> = {
  free: {
    id: 'free',
    name: 'Q Flow Free',
    tagline: 'เหมาะสำหรับร้านค้าขนาดเล็กเริ่มต้นทดลองใช้ระบบ',
    priceTHB: 0,
    priceYearlyTHB: 0,
    quota: 30,
    merchantsCount: '1 ร้านค้า',
    branchesCount: '1 สาขา',
    staffCount: '1 ท่าน',
    lineSetup: 'ตั้งค่าและเชื่อม LINE ด้วยตนเอง',
    overageRate: 'อัปเกรดเพื่อเพิ่มคิว',
    supportTier: 'Standard Support',
    features: [
      'รองรับ 1 ร้านค้า',
      'รองรับ 1 สาขา',
      'รองรับช่าง / ผู้ให้บริการ 1 ท่าน',
      'โควตารองรับ 30 คิว/เดือน',
      'ระบบปฏิทินจองคิว 24 ชม.',
      'Dashboard จัดการคิว Real-time',
      'Standard Support',
    ],
  },
  professional: {
    id: 'professional',
    name: 'Q Flow Professional',
    tagline: 'เหมาะสำหรับร้านค้าบริการเดี่ยว / สตูดิโอ / ฟรีแลนซ์',
    priceTHB: 790,
    priceYearlyTHB: 7900,
    quota: 500,
    merchantsCount: '1 ร้านค้า',
    branchesCount: 'สูงสุด 2 สาขา',
    staffCount: 'สูงสุด 5 ท่าน',
    lineSetup: 'ทีมงานตั้งค่า & เชื่อม LINE ให้',
    overageRate: '0.60 บาท / คิว',
    supportTier: 'Standard Support (LINE Official)',
    features: [
      'รองรับ 1 ร้านค้า',
      'รองรับสูงสุด 2 สาขา',
      'รองรับช่าง / ผู้ให้บริการสูงสุด 5 ท่าน',
      'โควตารองรับ 500 คิว/เดือน',
      'แยกบัญชีพร้อมเพย์รายสาขา',
      'บริการทีมงานช่วยตั้งค่า & เชื่อมต่อ LINE ให้พร้อมใช้',
      'ระบบปฏิทินจองคิว 24 ชม.',
      'Dashboard จัดการคิว Real-time',
      'Standard Support (LINE Official)',
    ],
  },
  business: {
    id: 'business',
    name: 'Q Flow Business',
    tagline: 'ร้านเสริมสวย / คลินิกความงาม 2-5 สาขา และสตูดิโอที่มีทีมช่างหลายท่าน',
    priceTHB: 1590,
    priceYearlyTHB: 15900,
    quota: 1500,
    popular: true,
    merchantsCount: 'สูงสุด 2 ร้านค้า',
    branchesCount: 'สูงสุด 5 สาขา',
    staffCount: 'สูงสุด 20 ท่าน',
    lineSetup: 'ทีมงานตั้งค่า & เชื่อม LINE ให้',
    overageRate: '0.50 บาท / คิว',
    supportTier: 'Priority Support',
    features: [
      'รองรับสูงสุด 2 ร้านค้า',
      'รองรับสูงสุด 5 สาขา',
      'รองรับช่าง / ผู้ให้บริการสูงสุด 20 ท่าน',
      'โควตารองรับ 1,500 คิว/เดือน',
      'แยกบัญชีพร้อมเพย์รายสาขา',
      'บริการทีมงานช่วยตั้งค่า & เชื่อมต่อ LINE ให้',
      'ระบบปฏิทินจองคิว 24 ชม. + Dashboard Real-time',
      'Priority Support ดูแลระบบระดับพิเศษ',
    ],
  },
  enterprise: {
    id: 'enterprise',
    name: 'Q Flow Enterprise',
    tagline: 'แฟรนไชส์ / คลินิกใหญ่ / เชนธุรกิจ ไร้ข้อจำกัดเรื่องสาขาและช่าง',
    priceTHB: 3990,
    priceYearlyTHB: 39900,
    quota: 5000,
    merchantsCount: 'ไม่จำกัด (Unlimited)',
    branchesCount: 'ไม่จำกัด (Unlimited)',
    staffCount: 'ไม่จำกัด (Unlimited)',
    lineSetup: 'Setup LINE OA + Rich Menu + Flex Message ครบวงจร',
    overageRate: '0.40 บาท / คิว',
    supportTier: 'Dedicated VIP Support (กลุ่ม LINE ส่วนตัว)',
    features: [
      'ไม่จำกัดจำนวนร้านค้า (Unlimited Merchants)',
      'ไม่จำกัดจำนวนสาขา (Unlimited Branches)',
      'ไม่จำกัดจำนวนช่าง / ผู้ให้บริการ (Unlimited Staff)',
      'โควตารองรับ 5,000 คิว/เดือน',
      'แยกบัญชีพร้อมเพย์อิสระตามสาขา/ร้าน',
      'ระบบปฏิทินจองคิว 24 ชม. + Dashboard Real-time',
      'Setup LINE OA + Rich Menu + Flex Message ครบวงจร',
      'Dedicated VIP Support',
    ],
  },
}
