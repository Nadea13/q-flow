'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Sparkles, Zap, Shield, ArrowRight, CreditCard } from 'lucide-react'
import { motion } from 'framer-motion'
import { PRICING_PLANS } from '@/lib/stripe'
import { createStripeCheckoutSessionAction } from '@/app/actions/stripe'
import { toast } from 'sonner'
import { useLanguage } from '@/context/LanguageContext'
import type { PlanType } from '@/types/database'

interface PricingSectionProps {
  merchantSlug?: string
  currentPlan?: PlanType
  onPlanSelected?: () => void
}

export function PricingSection({ merchantSlug, currentPlan, onPlanSelected }: PricingSectionProps) {
  const { t, lang } = useLanguage()
  const router = useRouter()
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleSelectPlan(planId: PlanType) {
    setLoadingPlan(planId)

    // Retrieve line user ID if available
    let lineUserId: string | undefined = undefined
    try {
      const cached = localStorage.getItem('qflow_admin_line_profile')
      if (cached) {
        const parsed = JSON.parse(cached)
        lineUserId = parsed.userId
      }
    } catch { }

    const res = await createStripeCheckoutSessionAction({
      merchantSlug: merchantSlug || 'public',
      planId,
      billingCycle,
      lineUserId,
    })
    setLoadingPlan(null)

    if (!res.success) {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe')
      return
    }

    if (res.url) {
      if (res.simulated) {
        toast.success(`กำลังพาคุณไปหน้าสร้างร้านพร้อมแพ็กเกจ ${PRICING_PLANS[planId].name}...`)
        router.push(res.url)
      } else {
        window.location.assign(res.url)
      }
    }
  }

  const plans = Object.values(PRICING_PLANS)

  return (
    <div className="w-full space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'th' ? 'แพ็กเกจราคาสุดคุ้ม คืนทุนตั้งแต่คิวแรก' : 'Simple, Transparent Pricing'}</span>
        </div>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {lang === 'th' ? 'เลือกระดับพลังที่เหมาะกับธุรกิจคุณ' : 'Choose the Perfect Plan for Your Business'}
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
          {lang === 'th' 
            ? 'รวมระบบตรวจสลิป SlipOK อัตโนมัติ ปฏิทิน 24 ชม. และแจ้งเตือน LINE ครบวงจร' 
            : 'Includes auto SlipOK verification, 24/7 calendar, and rich LINE notifications'}
        </p>

        {/* Billing Cycle Switcher: Monthly vs Yearly */}
        <div className="pt-2 flex items-center justify-center">
          <div className="inline-flex items-center p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-2xs">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {lang === 'th' ? 'รายเดือน (Monthly)' : 'Monthly'}
            </button>

            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer ${
                billingCycle === 'yearly'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{lang === 'th' ? 'รายปี (Yearly)' : 'Yearly'}</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[10px] font-extrabold animate-pulse">
                {lang === 'th' ? 'ประหยัด 2 เดือน' : 'Save 17%'}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Grid (4-Tier with Free Plan) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 max-w-7xl mx-auto items-stretch">
        {plans.map((p) => {
          const isPopular = p.popular
          const isCurrent = currentPlan === p.id
          const isFree = p.priceTHB === 0
          const currentPrice = isFree ? 0 : (billingCycle === 'yearly' ? p.priceYearlyTHB : p.priceTHB)
          const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(p.priceYearlyTHB / 12) : p.priceTHB

          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`relative flex flex-col justify-between rounded-3xl p-5 sm:p-6 transition-all ${
                isPopular
                  ? 'bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10 ring-2 ring-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-extrabold rounded-full shadow-md tracking-wider uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{lang === 'th' ? 'แนะนำ / ยอดนิยม' : 'Most Popular'}</span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{p.name}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 min-h-[30px] line-clamp-2">{p.tagline}</p>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-full text-[10px] font-bold shrink-0">
                      {lang === 'th' ? 'แพ็กเกจปัจจุบัน' : 'Current Plan'}
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="my-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      {isFree ? (lang === 'th' ? 'ฟรี' : 'Free') : `฿${currentPrice.toLocaleString()}`}
                    </span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {isFree ? '' : `/${billingCycle === 'yearly' ? (lang === 'th' ? 'ปี' : 'year') : (lang === 'th' ? 'เดือน' : 'month')}`}
                    </span>
                  </div>

                  {!isFree && billingCycle === 'yearly' && (
                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                      {lang === 'th' ? `เฉลี่ยเพียงเดือนละ ฿${monthlyEquivalent.toLocaleString()}` : `Equivalent to ฿${monthlyEquivalent.toLocaleString()}/mo`}
                    </div>
                  )}

                  {isFree && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                      {lang === 'th' ? 'ใช้งานได้ตลอดไป ไม่มีค่าบริการ' : 'Free forever, no credit card needed'}
                    </div>
                  )}

                  <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1.5 flex items-center gap-1 pt-1.5 border-t border-slate-200/60 dark:border-slate-700/60">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>{lang === 'th' ? `โควตา ${p.quota.toLocaleString()} คิว/เดือน` : `${p.quota.toLocaleString()} queues/mo`}</span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2 mb-6 text-xs text-slate-700 dark:text-slate-300">
                  {p.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <div className={`mt-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                        isPopular 
                          ? 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' 
                          : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="leading-tight text-[11px]">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action CTA */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{lang === 'th' ? 'ใช้งานแพ็กเกจนี้อยู่' : 'Active Plan'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(p.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-md active:scale-98 cursor-pointer ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-indigo-600/20'
                        : isFree
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    } disabled:opacity-50`}
                  >
                    {loadingPlan === p.id ? (
                      <span>{t('loading')}</span>
                    ) : (
                      <>
                        {isFree ? <Sparkles className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                        <span>
                          {merchantSlug 
                            ? (isFree 
                                ? (lang === 'th' ? 'เปลี่ยนเป็นแพ็กเกจฟรี' : 'Switch to Free')
                                : (lang === 'th' ? `อัปเกรดเป็น ${p.name}` : `Upgrade to ${p.name}`))
                            : (isFree 
                                ? (lang === 'th' ? 'เริ่มใช้งานฟรี' : 'Start Free')
                                : (lang === 'th' ? `เลือก ${p.name}` : `Choose ${p.name}`))}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="text-center pt-2">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          <span>{lang === 'th' ? 'ชำระเงินรายเดือนปลอดภัย • รองรับบัตรเครดิต/เดบิต ทุกธนาคาร • ยกเลิกได้ตลอดเวลา' : 'Secured monthly billing via Stripe • Credit/Debit Cards accepted • Cancel anytime'}</span>
        </p>
      </div>
    </div>
  )
}
