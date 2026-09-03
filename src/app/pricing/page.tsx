'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  CreditCard, 
  Zap, 
  HelpCircle,
  ShieldCheck,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PRICING_PLANS } from '@/lib/stripe'
import { createStripeCheckoutSessionAction } from '@/app/actions/stripe'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'
import { toast } from 'sonner'
import type { PlanType } from '@/types/database'

export default function PricingPage() {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [showFreeConfirmModal, setShowFreeConfirmModal] = useState(false)

  async function proceedToCheckout(planId: PlanType, lineUid?: string, lineDisplayName?: string, linePictureUrl?: string) {
    setLoadingPlan(planId)
    const res = await createStripeCheckoutSessionAction({
      merchantSlug: 'public',
      planId,
      lineUserId: lineUid,
      lineDisplayName,
      linePictureUrl,
    })
    setLoadingPlan(null)

    if (!res.success) {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ')
      return
    }

    if (res.url) {
      if (res.simulated || planId === 'basic' || planId === 'free') {
        toast.success(`กำลังพาคุณไปหน้าสร้างร้านพร้อมแพ็กเกจ ${PRICING_PLANS[planId].name}...`)
        router.push(res.url)
      } else {
        window.location.assign(res.url)
      }
    }
  }

  function handleSubscribe(planId: PlanType) {
    if (planId === 'basic' || planId === 'free') {
      setShowFreeConfirmModal(true)
      return
    }
    executeSubscribe(planId)
  }

  async function executeSubscribe(planId: PlanType) {
    setShowFreeConfirmModal(false)

    // 1. Check if LIFF profile is already present
    try {
      const { initLiff } = await import('@/lib/liff')
      const liffRes = await initLiff()
      if (liffRes?.success && liffRes.profile?.userId) {
        localStorage.setItem('qflow_admin_line_profile', JSON.stringify(liffRes.profile))
        await proceedToCheckout(planId, liffRes.profile.userId, liffRes.profile.displayName, liffRes.profile.pictureUrl)
        return
      }
    } catch { }

    // 2. Check localStorage
    try {
      const cached = localStorage.getItem('qflow_admin_line_profile')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.userId) {
          await proceedToCheckout(planId, parsed.userId, parsed.displayName, parsed.pictureUrl)
          return
        }
      }
    } catch { }

    // 3. Directly redirect to LINE Login
    try {
      const { loginWithLine } = await import('@/lib/liff')
      const redirectUri = (planId === 'basic' || planId === 'free')
        ? `${window.location.origin}/create-shop?plan=basic`
        : `${window.location.origin}/checkout/${planId}`
      await loginWithLine(redirectUri)
    } catch {
      // Fallback if LINE Login fails or LIFF ID not set
      await proceedToCheckout(planId)
    }
  }

  const comparisonCategories = [
    {
      category: lang === 'th' ? 'ข้อมูลทั่วไป & ราคา' : 'General & Pricing',
      features: [
        {
          name: lang === 'th' ? 'เหมาะสำหรับ' : 'Target Audience',
          free: 'ร้านค้าขนาดเล็ก / ทดลองใช้ระบบ',
          professional: 'ร้านค้าบริการเดี่ยว / สตูดิโอ / ฟรีแลนซ์',
          business: 'ร้านเสริมสวย / คลินิกความงาม 2-5 สาขา',
          enterprise: 'แฟรนไชส์ / คลินิกใหญ่ / เชนธุรกิจ',
        },
        {
          name: lang === 'th' ? 'ราคาค่าบริการ (รายเดือน)' : 'Monthly Fee',
          free: '0 บาท / เดือน (ฟรี)',
          professional: '790 บาท / เดือน',
          business: '1,590 บาท / เดือน',
          enterprise: '3,990 บาท / เดือน',
          highlight: true,
        },
        {
          name: lang === 'th' ? 'ราคาค่าบริการ (รายปี - ลด 2 เดือน)' : 'Yearly Fee (Save 2 Months)',
          free: '0 บาท / ปี (ฟรี)',
          professional: '7,900 บาท / ปี',
          business: '15,900 บาท / ปี',
          enterprise: '39,900 บาท / ปี',
        },
      ],
    },
    {
      category: lang === 'th' ? 'โครงสร้างร้าน สาขา และช่าง' : 'Merchants, Branches & Staff',
      features: [
        {
          name: lang === 'th' ? 'จำนวนร้านค้า (Merchants)' : 'Number of Merchants',
          free: '1 ร้านค้า',
          professional: '1 ร้านค้า',
          business: 'สูงสุด 2 ร้านค้า',
          enterprise: 'ไม่จำกัด (Unlimited)',
        },
        {
          name: lang === 'th' ? 'จำนวนสาขา (Branches)' : 'Number of Branches',
          free: '1 สาขา',
          professional: 'สูงสุด 2 สาขา',
          business: 'สูงสุด 5 สาขา',
          enterprise: 'ไม่จำกัด (Unlimited)',
        },
        {
          name: lang === 'th' ? 'จำนวนช่าง / ผู้ให้บริการ (Staff)' : 'Number of Staff / Specialists',
          free: '1 ท่าน',
          professional: 'สูงสุด 5 ท่าน',
          business: 'สูงสุด 20 ท่าน',
          enterprise: 'ไม่จำกัด (Unlimited)',
        },
        {
          name: lang === 'th' ? 'การผูกบัญชีรับเงิน' : 'Payment Account Linking',
          free: 'พร้อมเพย์ร้านค้า',
          professional: 'แยกบัญชีพร้อมเพย์รายสาขา',
          business: 'แยกบัญชีพร้อมเพย์รายสาขา',
          enterprise: 'แยกบัญชีพร้อมเพย์อิสระตามสาขา/ร้าน',
        },
      ],
    },
    {
      category: lang === 'th' ? 'โควตาคิว & ตรวจสอบอัตโนมัติ' : 'Queue Quota & Verification',
      features: [
        {
          name: lang === 'th' ? 'โควตาคิวอัตโนมัติ' : 'Monthly Auto-verified Queues',
          free: '30 คิว / เดือน (~1 คิว/วัน)',
          professional: '500 คิว / เดือน (~16 คิว/วัน)',
          business: '1,500 คิว / เดือน (~50 คิว/วัน)',
          enterprise: '5,000 คิว / เดือน (~165 คิว/วัน)',
          highlight: true,
        },
        {
          name: lang === 'th' ? 'สิทธิ์ซื้อโควตาคิวส่วนเกิน' : 'Overage Queue Rate',
          free: 'อัปเกรดเพื่อเพิ่มคิว',
          professional: '0.60 บาท / คิว',
          business: '0.50 บาท / คิว',
          enterprise: '0.40 บาท / คิว',
        },
        {
          name: lang === 'th' ? 'ตรวจยอดเงิน ตรงบัญชี และป้องกันสลิปใช้ซ้ำ 100%' : 'Amount, Account & Duplicate Slip Check',
          free: true,
          professional: true,
          business: true,
          enterprise: true,
        },
        {
          name: lang === 'th' ? 'จัดเก็บรูปสลิปบนคลาวด์ความเร็วสูง (Cloudflare R2)' : 'Cloudflare R2 Slip Storage',
          free: true,
          professional: true,
          business: true,
          enterprise: true,
        },
      ],
    },
    {
      category: lang === 'th' ? 'การเชื่อมต่อ LINE & แจ้งเตือน' : 'LINE & Notification System',
      features: [
        {
          name: lang === 'th' ? 'บริการ Setup LINE' : 'LINE Setup Service',
          free: 'ตั้งค่าด้วยตนเอง (Self-serve)',
          professional: 'ทีมงานตั้งค่า & เชื่อม LINE ให้',
          business: 'ทีมงานตั้งค่า & เชื่อม LINE ให้',
          enterprise: 'Setup LINE OA + Rich Menu + Flex Message ครบวงจร',
        },
        {
          name: lang === 'th' ? 'การแจ้งเตือนคิวใหม่' : 'New Queue Notification',
          free: 'LINE Notify เข้ากลุ่มแอดมิน',
          professional: 'LINE Notify เข้ากลุ่มแอดมิน',
          business: 'LINE Notify เข้ากลุ่มแอดมิน',
          enterprise: 'LINE Notify + Flex Message สรุปประจำวัน',
        },
      ],
    },
    {
      category: lang === 'th' ? 'ฟังก์ชันระบบ & การปรับแต่งแบรนด์' : 'System Features & Branding',
      features: [
        {
          name: lang === 'th' ? 'ระบบปฏิทินจองคิว 24 ชม.' : '24/7 Booking Calendar',
          free: true,
          professional: true,
          business: true,
          enterprise: true,
        },
        {
          name: lang === 'th' ? 'Dashboard จัดการคิว Real-time' : 'Real-time Queue Dashboard',
          free: true,
          professional: true,
          business: true,
          enterprise: true,
        },
        {
          name: lang === 'th' ? 'Custom Branding / White-label' : 'Custom Branding',
          free: 'โลโก้ร้านค้า + ป้าย QFlow',
          professional: 'โลโก้ร้านค้า + ป้าย QFlow',
          business: 'White-label (ซ่อนป้าย QFlow)',
          enterprise: '100% White-label + รองรับ Custom Domain',
        },
        {
          name: lang === 'th' ? 'ระดับการซัพพอร์ต (Support)' : 'Support Tier',
          free: 'Standard Support',
          professional: 'Standard Support (LINE Official)',
          business: 'Priority Support',
          enterprise: 'Dedicated VIP Support (กลุ่ม LINE ส่วนตัว)',
        },
      ],
    },
  ]

  const pricingFaqs = [
    {
      q: lang === 'th' ? 'ระบบตรวจสลิปอัตโนมัติทำงานอย่างไร ปลอดภัยไหม?' : 'How does automated slip verification work?',
      a: lang === 'th' 
        ? 'ระบบเชื่อมต่อกับ SlipOK API อย่างเป็นทางการ โดยอ่าน QR Code บนสลิปโอนเงินของลูกค้าแบบ Real-time และตรวจสอบยอดเงิน ชื่อบัญชีปลายทาง และป้องกันการใช้สลิปซ้ำ 100% ทำให้ร้านได้รับเงินมัดจำจริงก่อนล็อกคิว' 
        : 'The system connects with official SlipOK API to verify QR codes in real-time, matching exact deposit amounts and receiver accounts while preventing duplicate reused slips.',
    },
    {
      q: lang === 'th' ? 'ถ้าใช้โควตาสลิปหมดระหว่างเดือน จะเกิดอะไรขึ้น?' : 'What happens if I exceed my monthly slip quota?',
      a: lang === 'th'
        ? 'ร้านค้าสามารถกดอัปเกรดแพ็กเกจผ่านแถบ "บิลลิ่ง" ใน Dashboard เพื่อเพิ่มโควตาได้ทันทีตลอดเวลา โดยระบบจะยังคงเปิดรับคิวต่อเนื่องไม่สะดุด'
        : 'You can upgrade your plan instantly from your Dashboard Billing tab anytime to increase your quota without interrupting bookings.',
    },
    {
      q: lang === 'th' ? 'สามารถยกเลิกหรือเปลี่ยนแพ็กเกจได้ตลอดเวลาไหม?' : 'Can I cancel or switch plans anytime?',
      a: lang === 'th'
        ? 'ได้ตลอดเวลา ไม่มีข้อผูกมัดใดๆ คุณสามารถจัดการการสมัครสมาชิก บัตรเครดิต หรือยกเลิกได้เอง Customer Portal ในคลิกเดียว'
        : 'Yes, anytime with no lock-in contracts. You can manage your cards, invoices, or cancel anytime via the Stripe Customer Portal.',
    },
    {
      q: lang === 'th' ? 'รองรับการชำระเงินผ่านช่องทางใดบ้าง?' : 'What payment methods are supported for subscription?',
      a: lang === 'th'
        ? 'รองรับการชำระเงินรายเดือนผ่านบัตรเครดิตและบัตรเดบิตทุกธนาคาร (Visa, Mastercard, JCB, American Express) ระบบจะตัดยอดอัตโนมัติทุก 30 วัน'
        : 'All major Credit and Debit cards are supported (Visa, Mastercard, JCB, AMEX) with automatic monthly billing.',
    },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans antialiased">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <QFlowLogo className="h-8 w-8 group-hover:scale-105 transition-transform" />
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">QFlow</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            <Link href="/" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'หน้าแรก' : 'Home'}
            </Link>
            <Link href="/#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'วิธีใช้งาน' : 'How It Works'}
            </Link>
            <Link href="/#features" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'จุดเด่น' : 'Features'}
            </Link>
            <Link href="/pricing" className="text-indigo-600 dark:text-indigo-400 font-bold transition">
              {lang === 'th' ? 'แพ็กเกจราคา' : 'Pricing'}
            </Link>
          </div>

          <div className="flex items-center gap-2.5">
            <NavbarControls />
            <button
              onClick={() => handleSubscribe('professional')}
              className="text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3.5 sm:px-4 py-2 rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <span>{t('openShopNow')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-12 sm:pt-16 pb-12 px-4 sm:px-6 max-w-5xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold mb-4"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>{lang === 'th' ? 'ระบบเก็บเงินรายเดือน • คืนทุนไวตั้งแต่คิวแรก' : 'Stripe Monthly Subscriptions • ROI from Day 1'}</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
        >
          {lang === 'th' ? 'เลือกแพ็กเกจที่ลงตัวกับขนาดร้านคุณ' : 'Simple Pricing Plans for High Growth'}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
        >
          {lang === 'th'
            ? 'ทุกแพ็กเกจรวมระบบตรวจสลิปอัตโนมัติ SlipOK, ระบบปฏิทิน 24 ชม., และการเชื่อมต่อ LINE OA ครบวงจร สมัครแล้วเริ่มใช้งานได้ทันที'
            : 'Every plan includes automated SlipOK verification, 24/7 dynamic calendar, and full LINE OA integration.'}
        </motion.p>
      </section>

      {/* 4 PRICING CARDS (Including Free Plan) */}
      <section className="pb-16 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch">
          {Object.values(PRICING_PLANS).map((p) => {
            const isPopular = p.popular
            const isFree = p.priceTHB === 0

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all ${
                  isPopular
                    ? 'bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-extrabold rounded-full shadow-md tracking-wider uppercase flex items-center gap-1">
                    <Zap className="w-3 h-3 fill-current" />
                    <span>{lang === 'th' ? 'แนะนำ / ยอดนิยม' : 'Most Popular'}</span>
                  </div>
                )}

                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">{p.tagline}</p>
                    </div>
                  </div>

                  {/* Price Box */}
                  <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {isFree ? (lang === 'th' ? 'ฟรี' : 'Free') : `฿${p.priceTHB.toLocaleString()}`}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {isFree ? '' : (lang === 'th' ? '/เดือน' : '/month')}
                      </span>
                    </div>

                    {!isFree ? (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        รายปี ฿{p.priceYearlyTHB.toLocaleString()} / ปี <span className="text-emerald-600 dark:text-emerald-400 font-semibold">(ประหยัด 2 เดือน)</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {lang === 'th' ? 'ใช้งานได้ตลอดไป ไม่มีค่าบริการ' : 'Free forever, no card needed'}
                      </div>
                    )}

                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        ⚡ โควตา {p.quota.toLocaleString()} คิว/เดือน
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-2.5 mb-6 text-xs text-slate-700 dark:text-slate-300">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                          isPopular 
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug text-[11px]">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Checkout Button */}
                <div>
                  <button
                    onClick={() => handleSubscribe(p.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-md active:scale-98 cursor-pointer ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-indigo-600/25'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    } disabled:opacity-50`}
                  >
                    {loadingPlan === p.id ? (
                      <span>{t('loading')}</span>
                    ) : (
                      <>
                        {isFree ? <Sparkles className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        <span>{isFree ? (lang === 'th' ? 'เริ่มใช้งานฟรี' : 'Start Free') : (lang === 'th' ? `สมัคร ${p.name}` : `Subscribe ${p.name}`)}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
                    {isFree 
                      ? (lang === 'th' ? 'เริ่มเปิดร้านได้ทันที ไม่ต้องผูกบัตร' : 'Instant activation, no card required')
                      : (lang === 'th' ? 'ชำระเงินรายเดือนปลอดภัย Checkout' : 'Secure monthly billing via Stripe Checkout')}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* DETAILED FEATURE COMPARISON TABLE */}
      <section className="py-16 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'th' ? 'ตารางเปรียบเทียบฟีเจอร์อย่างละเอียด' : 'Detailed Feature Breakdown'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'th' ? 'ดูความแตกต่างของทุกฟังก์ชันในแต่ละแพ็กเกจ' : 'Compare every capability side-by-side.'}
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-3xl bg-white dark:bg-slate-900 shadow-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80">
                  <th className="p-3 sm:p-4 text-xs font-bold text-slate-700 dark:text-slate-300 w-1/3">
                    {lang === 'th' ? 'ฟังก์ชันการทำงาน / รายละเอียด' : 'Capabilities'}
                  </th>
                  <th className="p-3 sm:p-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-center w-1/6 bg-slate-50/60 dark:bg-slate-850/40">
                    Basic (ฟรี) <br />
                    <span className="font-normal text-[10px] text-slate-500">฿0 / ฟรี</span>
                  </th>
                  <th className="p-3 sm:p-4 text-xs font-bold text-slate-900 dark:text-white text-center w-1/6">
                    Professional <br />
                    <span className="font-normal text-[10px] text-slate-500">฿790/ด. (฿7,900/ปี)</span>
                  </th>
                  <th className="p-3 sm:p-4 text-xs font-bold text-indigo-600 dark:text-indigo-400 text-center w-1/6 bg-indigo-50/50 dark:bg-indigo-950/20">
                    Business (แนะนำ) <br />
                    <span className="font-normal text-[10px] text-indigo-500">฿1,590/ด. (฿15,900/ปี)</span>
                  </th>
                  <th className="p-3 sm:p-4 text-xs font-bold text-amber-600 dark:text-amber-400 text-center w-1/6 bg-amber-50/30 dark:bg-amber-950/10">
                    Enterprise <br />
                    <span className="font-normal text-[10px] text-amber-600">฿3,990/ด. (฿39,900/ปี)</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {comparisonCategories.map((cat, cIdx) => (
                  <tr key={cIdx} className="contents">
                    <tr className="bg-slate-100/60 dark:bg-slate-800/40">
                      <td colSpan={5} className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
                        {cat.category}
                      </td>
                    </tr>
                    {cat.features.map((feat, fIdx) => (
                      <tr key={fIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="p-3 sm:p-4 font-semibold text-slate-800 dark:text-slate-200">
                          {feat.name}
                        </td>
                        
                        {/* Free Column */}
                        <td className="p-3 text-center bg-slate-50/40 dark:bg-slate-900/40">
                          {typeof feat.free === 'boolean' ? (
                            feat.free ? (
                              <Check className="w-4 h-4 text-emerald-500 mx-auto stroke-[2.5]" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-medium text-[11px] text-slate-700 dark:text-slate-300">{feat.free}</span>
                          )}
                        </td>

                        {/* Professional Column */}
                        <td className="p-3 text-center">
                          {typeof feat.professional === 'boolean' ? (
                            feat.professional ? (
                              <Check className="w-4 h-4 text-emerald-500 mx-auto stroke-[2.5]" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-medium text-[11px] text-slate-700 dark:text-slate-300">{feat.professional}</span>
                          )}
                        </td>

                        {/* Business Column */}
                        <td className="p-3 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                          {typeof feat.business === 'boolean' ? (
                            feat.business ? (
                              <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mx-auto stroke-[2.5]" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-bold text-[11px] text-indigo-600 dark:text-indigo-400">{feat.business}</span>
                          )}
                        </td>

                        {/* Enterprise Column */}
                        <td className="p-3 text-center bg-amber-50/10 dark:bg-amber-950/5">
                          {typeof feat.enterprise === 'boolean' ? (
                            feat.enterprise ? (
                              <Check className="w-4 h-4 text-amber-500 mx-auto stroke-[2.5]" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-bold text-[11px] text-amber-600 dark:text-amber-400">{feat.enterprise}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI & COST BREAKDOWN */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-indigo-800/60">
          <div className="max-w-2xl">
            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-300 text-xs font-semibold inline-block mb-3">
              ⚡ ROI Analysis & Value
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {lang === 'th' ? 'ทำไม QFlow ถึงคุ้มค่าตั้งแต่วันแรก?' : 'Why QFlow pays for itself on Day 1'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed font-normal">
              {lang === 'th' 
                ? 'แค่ป้องกันลูกค้าเบี้ยวคิว (No-Show) ได้เพียง 1-2 คิวต่อเดือน หรือประหยัดเวลาแอดมินนั่งเช็คสลิปวันละ 1 ชั่วโมง มูลค่าที่ได้ก็เกินค่าบริการรายเดือนหลายเท่าตัวแล้วครับ'
                : 'Preventing just 1-2 customer no-shows per month or saving 1 hour of manual slip checking daily covers the subscription cost multiple times over.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-slate-700/60">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xl sm:text-2xl font-extrabold text-emerald-400">0 คิวเบี้ยว</div>
              <p className="text-xs text-slate-300 mt-1">เก็บมัดจำจริงเข้าบัญชีอัตโนมัติก่อนล็อกคิว</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xl sm:text-2xl font-extrabold text-indigo-300">ประหยัด 30 ชม./ด.</div>
              <p className="text-xs text-slate-300 mt-1">ไม่ต้องนั่งตอบแชทถามรอบว่างและตรวจสลิปเอง</p>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="text-xl sm:text-2xl font-extrabold text-amber-300">รับยอด 24 ชม.</div>
              <p className="text-xs text-slate-300 mt-1">ลูกค้าจองดึกแค่ไหนก็ล็อกคิวได้ทันที</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING FAQ */}
      <section className="py-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {lang === 'th' ? 'คำถามที่พบบ่อยเกี่ยวกับแพ็กเกจ' : 'Pricing FAQ'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'th' ? 'ข้อมูลสำคัญเกี่ยวกับการสมัคร การคิดเงิน และการดูแล' : 'Common questions regarding subscription and billing.'}
          </p>
        </div>

        <div className="space-y-3">
          {pricingFaqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-6 leading-relaxed font-normal">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-sans">
        {/* Main Footer Content */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 sm:gap-8">
            {/* Brand & Mission Column */}
            <div className="md:col-span-5 space-y-4">
              <Link href="/" className="inline-flex items-center gap-2.5 group">
                <QFlowLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  QFlow
                </span>
              </Link>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm">
                {lang === 'th'
                  ? 'ระบบจองคิวออนไลน์และตรวจสลิปมัดจำอัตโนมัติ 100% ผ่าน LINE OA & Web สำหรับร้านบริการ SME ยุคใหม่'
                  : 'Automated queue booking & instant deposit slip verification via LINE OA & Web for modern service businesses.'}
              </p>

              {/* Status & Security Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Systems Operational</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Stripe & SSL Secured</span>
                </div>
              </div>
            </div>

            {/* Links Columns */}
            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Col 1: ผลิตภัณฑ์ (Product) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {lang === 'th' ? 'ผลิตภัณฑ์' : 'Product'}
                </h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'ฟีเจอร์ทั้งหมด' : 'Features'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#how-it-works" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'ขั้นตอนการทำงาน' : 'How It Works'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold text-indigo-600 dark:text-indigo-400">
                      {lang === 'th' ? 'แพ็กเกจราคา' : 'Pricing Plans'}
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={() => handleSubscribe('professional')}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold text-indigo-600 dark:text-indigo-400 text-left cursor-pointer"
                    >
                      {lang === 'th' ? 'เปิดร้านค้าทันที' : 'Start Free'}
                    </button>
                  </li>
                </ul>
              </div>

              {/* Col 2: สำหรับธุรกิจ (Solutions) */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {lang === 'th' ? 'เหมาะกับใคร' : 'Solutions'}
                </h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/#audiences" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'ร้านตัดผม & ซาลอน' : 'Hair Salons'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#audiences" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'คลินิกความงาม' : 'Beauty Clinics'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#audiences" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'สปา & นวดเพื่อสุขภาพ' : 'Spa & Wellness'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/#audiences" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'สตูดิโอทำเล็บ & ขนตา' : 'Nails & Lashes'}
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Col 3: ตัวอย่าง & ซัพพอร์ต (Demos & Support) */}
              <div className="space-y-3 col-span-2 sm:col-span-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  {lang === 'th' ? 'ทดลอง & ซัพพอร์ต' : 'Demo & Support'}
                </h4>
                <ul className="space-y-2 text-xs">
                  <li>
                    <Link href="/demo/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'แดชบอร์ดหลังร้าน (Demo)' : 'Dashboard Demo'}
                    </Link>
                  </li>
                  <li>
                    <Link href="/demo/book" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'หน้าจองคิวลูกค้า (Demo)' : 'Booking Demo'}
                    </Link>
                  </li>
                  <li>
                    <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'คำถามที่พบบ่อย (FAQ)' : 'Help Center'}
                    </a>
                  </li>
                  <li>
                    <Link href="/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'เลือกร้านค้าของคุณ' : 'Store Portal'}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Legal Sub-footer */}
        <div className="border-t border-slate-200/80 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-500">
            <div>
              <span>© {new Date().getFullYear()} QFlow Platform. All rights reserved.</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <span>Powered by <span className='font-bold'>QFlow</span></span>
              <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-2">
                <Link href="/terms" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition">
                  {lang === 'th' ? 'เงื่อนไขบริการ' : 'Terms of Service'}
                </Link>
                <span>•</span>
                <Link href="/privacy" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition">
                  {lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Confirmation Modal for Free Plan */}
      <AnimatePresence>
        {showFreeConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 relative"
            >
              <button
                type="button"
                onClick={() => setShowFreeConfirmModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {lang === 'th' ? 'ยืนยันการเลือกแพ็กเกจ QFlow Basic?' : 'Confirm QFlow Basic Selection?'}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {lang === 'th' 
                    ? 'แพ็กเกจ QFlow Basic (ฟรี) จะรองรับโควตา 30 คิว/เดือน, 1 ร้านค้า, 1 สาขา และ 1 ผู้ให้บริการ คุณต้องการดำเนินการต่อหรือไม่?' 
                    : 'The QFlow Basic Plan includes 30 bookings/month, 1 shop, 1 branch, and 1 staff member. Do you wish to proceed?'}
                </p>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>โควตารองรับ 30 คิว/เดือน (ฟรีตลอดไป)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>1 ร้านค้า • 1 สาขา • 1 ผู้ให้บริการ</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFreeConfirmModal(false)}
                  className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
                >
                  {lang === 'th' ? 'ยกเลิก' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={() => executeSubscribe('basic')}
                  disabled={loadingPlan !== null}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {lang === 'th' ? 'ยืนยันเลือกแพ็กเกจ Basic' : 'Confirm Basic Plan'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
