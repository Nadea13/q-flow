'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Sparkles, 
  Check, 
  X, 
  ArrowRight, 
  CreditCard, 
  ShieldCheck, 
  Zap, 
  Clock, 
  HelpCircle, 
  Calendar, 
  MessageSquare, 
  Building2, 
  TrendingUp,
  CheckCircle2,
  ChevronRight
} from 'lucide-react'
import { motion } from 'framer-motion'
import { PRICING_PLANS } from '@/lib/stripe'
import { createStripeCheckoutSessionAction } from '@/app/actions/stripe'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { toast } from 'sonner'
import type { PlanType } from '@/types/database'

export default function PricingPage() {
  const { t, lang } = useLanguage()
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleSubscribe(planId: PlanType) {
    setLoadingPlan(planId)
    const res = await createStripeCheckoutSessionAction({
      merchantSlug: 'public',
      planId,
    })
    setLoadingPlan(null)

    if (!res.success) {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe')
      return
    }

    if (res.url) {
      if (res.simulated) {
        toast.success(`กำลังพาคุณไปหน้าสร้างร้านพร้อมแพ็กเกจ ${PRICING_PLANS[planId].name}...`)
        window.location.href = res.url
      } else {
        window.location.href = res.url
      }
    }
  }

  const comparisonCategories = [
    {
      category: lang === 'th' ? 'โควตาสลิป & ระบบชำระเงิน' : 'Slip Quota & Payment',
      features: [
        {
          name: lang === 'th' ? 'โควตาสลิปตรวจอัตโนมัติ (SlipOK API)' : 'Monthly Auto-verified Slips',
          starter: '150 สลิป/เดือน',
          growth: '500 สลิป/เดือน',
          highlight: true,
        },
        {
          name: lang === 'th' ? 'ตรวจยอดเงิน ตรงบัญชี และป้องกันสลิปใช้ซ้ำ 100%' : 'Amount, Account & Duplicate Slip Check',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'QR Code พร้อมเพย์สร้างอัตโนมัติ' : 'Dynamic PromptPay QR Code',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'จัดเก็บรูปสลิปบนคลาวด์ความเร็วสูง (Cloudflare R2)' : 'Cloudflare R2 Slip Storage',
          starter: true,
          growth: true,
        },
      ],
    },
    {
      category: lang === 'th' ? 'ระบบจองคิว & ปฏิทินร้าน' : 'Queue & Booking Engine',
      features: [
        {
          name: lang === 'th' ? 'ระบบปฏิทินจองคิว 24 ชม. ไม่จำกัดจำนวนคิว' : '24/7 Unlimited Bookings Calendar',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'บล็อกวันย้อนหลัง & ป้องกันรอบชนอัตโนมัติ' : 'Past Dates Disabled & Conflict Free',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'ระบบล็อกเวลาพักเที่ยงรายวัน (Lunch Break)' : 'Daily Lunch Break Filter',
          starter: false,
          growth: true,
        },
        {
          name: lang === 'th' ? 'Quick Block ปิดรับคิวกะทันหันใน 1 คลิก' : 'Quick Block Slots in 1-Click',
          starter: false,
          growth: true,
        },
        {
          name: lang === 'th' ? 'กำหนดช่วงความถี่รอบจอง (15, 30, 60 นาที)' : 'Configurable Slot Intervals',
          starter: true,
          growth: true,
        },
      ],
    },
    {
      category: lang === 'th' ? 'การเชื่อมต่อ LINE & แจ้งเตือน' : 'LINE & Notification System',
      features: [
        {
          name: lang === 'th' ? 'LINE LIFF ดึงชื่อและโปรไฟล์ผู้จองอัตโนมัติ' : 'LINE LIFF Auto Profile Pre-fill',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'ส่งตั๋วคิว Boarding Pass เข้าแชท LINE ลูกค้า' : 'LINE Flex Message Booking Pass',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'LINE OA Webhook ตอบกลับอัตโนมัติ' : 'LINE OA Webhook Auto-responder',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'LINE Notify แจ้งเตือนสลิปเข้าเจ้าของร้าน' : 'Instant LINE Notify for Merchant',
          starter: false,
          growth: true,
        },
      ],
    },
    {
      category: lang === 'th' ? 'การบริหารจัดการ & การดูแล' : 'Management & Support',
      features: [
        {
          name: lang === 'th' ? 'จำนวนบริการที่สร้างได้' : 'Maximum Services',
          starter: '5 บริการ',
          growth: 'ไม่จำกัด',
        },
        {
          name: lang === 'th' ? 'ระบบวิเคราะห์ยอดมัดจำและสถิติคิวเชิงลึก' : 'Advanced Analytics & Deposit Trends',
          starter: false,
          growth: true,
        },
        {
          name: lang === 'th' ? 'ระบบรักษาความปลอดภัย Admin PIN Code' : 'Admin PIN Code Security',
          starter: true,
          growth: true,
        },
        {
          name: lang === 'th' ? 'ระดับการดูแลและซัพพอร์ต' : 'Support SLA',
          starter: 'มาตรฐาน (Standard)',
          growth: 'ซัพพอร์ตด่วนพิเศษ (Priority Support)',
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
        ? 'ได้ตลอดเวลา ไม่มีข้อผูกมัดใดๆ คุณสามารถจัดการการสมัครสมาชิก บัตรเครดิต หรือยกเลิกได้เองผ่าน Stripe Customer Portal ในคลิกเดียว'
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
              <div className="h-8 w-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-base shadow-xs group-hover:scale-105 transition-transform">
                Q
              </div>
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
            <Link
              href="/onboarding"
              className="text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3.5 sm:px-4 py-2 rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <span>{t('openShop60s')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
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
          <span>{lang === 'th' ? 'ระบบเก็บเงินรายเดือนผ่าน Stripe • คืนทุนไวตั้งแต่คิวแรก' : 'Stripe Monthly Subscriptions • ROI from Day 1'}</span>
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

      {/* 2 PRICING CARDS */}
      <section className="pb-16 px-4 sm:px-6 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {Object.values(PRICING_PLANS).map((p) => {
            const isPopular = p.popular

            return (
              <motion.div
                key={p.id}
                whileHover={{ y: -5 }}
                transition={{ duration: 0.2 }}
                className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-8 transition-all ${
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
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{p.name}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 min-h-[32px]">{p.tagline}</p>
                    </div>
                  </div>

                  {/* Price Box */}
                  <div className="my-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        ฿{p.priceTHB.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {lang === 'th' ? '/เดือน' : '/month'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60 text-xs">
                      <span className="font-bold text-indigo-600 dark:text-indigo-400">
                        ⚡ โควตา {p.quota.toLocaleString()} สลิป/เดือน
                      </span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-3 mb-8 text-xs text-slate-700 dark:text-slate-300">
                    {p.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5">
                        <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                          isPopular 
                            ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Stripe Checkout Button */}
                <div>
                  <button
                    onClick={() => handleSubscribe(p.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition shadow-md active:scale-98 ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-indigo-600/25'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    } disabled:opacity-50`}
                  >
                    {loadingPlan === p.id ? (
                      <span>{t('loading')}</span>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>{lang === 'th' ? `สมัครแพ็กเกจ ${p.name} ผ่าน Stripe` : `Subscribe ${p.name} via Stripe`}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-2">
                    {lang === 'th' ? 'ชำระเงินรายเดือนปลอดภัยผ่าน Stripe Checkout' : 'Secure monthly billing via Stripe Checkout'}
                  </p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* DETAILED FEATURE COMPARISON TABLE */}
      <section className="py-16 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-8">
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
                  <th className="p-4 sm:p-5 text-xs font-bold text-slate-700 dark:text-slate-300 w-1/2">
                    {lang === 'th' ? 'ฟังก์ชันการทำงาน' : 'Capabilities'}
                  </th>
                  <th className="p-4 sm:p-5 text-xs font-bold text-slate-900 dark:text-white text-center w-1/4">
                    Starter <br />
                    <span className="font-normal text-[11px] text-slate-500">฿590/ด.</span>
                  </th>
                  <th className="p-4 sm:p-5 text-xs font-bold text-indigo-600 dark:text-indigo-400 text-center w-1/4 bg-indigo-50/50 dark:bg-indigo-950/20">
                    Growth (แนะนำ) <br />
                    <span className="font-normal text-[11px] text-indigo-500">฿1,290/ด.</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {comparisonCategories.map((cat, cIdx) => (
                  <tr key={cIdx} className="contents">
                    <tr className="bg-slate-100/60 dark:bg-slate-800/40">
                      <td colSpan={3} className="px-4 py-2.5 font-bold text-slate-800 dark:text-slate-200 text-[11px] uppercase tracking-wider">
                        {cat.category}
                      </td>
                    </tr>
                    {cat.features.map((feat, fIdx) => (
                      <tr key={fIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="p-4 sm:p-5 font-semibold text-slate-800 dark:text-slate-200">
                          {feat.name}
                        </td>
                        
                        {/* Starter Column */}
                        <td className="p-4 text-center">
                          {typeof feat.starter === 'boolean' ? (
                            feat.starter ? (
                              <Check className="w-4 h-4 text-emerald-500 mx-auto stroke-[2.5]" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-bold text-slate-700 dark:text-slate-300">{feat.starter}</span>
                          )}
                        </td>

                        {/* Growth Column */}
                        <td className="p-4 text-center bg-indigo-50/20 dark:bg-indigo-950/10">
                          {typeof feat.growth === 'boolean' ? (
                            feat.growth ? (
                              <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mx-auto stroke-[2.5]" />
                            ) : (
                              <X className="w-4 h-4 text-slate-300 dark:text-slate-600 mx-auto" />
                            )
                          ) : (
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{feat.growth}</span>
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
      <footer className="border-t border-slate-200 dark:border-slate-850 py-10 bg-white dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
              Q
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">QFlow Micro-SaaS</span>
            <span>• Powered by Stripe Billing</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/" className="hover:text-indigo-600 dark:hover:text-indigo-400">Home</Link>
            <Link href="/onboarding" className="hover:text-indigo-600 dark:hover:text-indigo-400">{t('openShop60s')}</Link>
            <Link href="/glam-studio/book" className="hover:text-indigo-600 dark:hover:text-indigo-400">Demo Booking</Link>
            <Link href="/glam-studio/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">Demo Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
