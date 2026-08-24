'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, Sparkles, Zap, Shield, ArrowRight, CreditCard, ChevronRight } from 'lucide-react'
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
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

  async function handleSelectPlan(planId: PlanType) {
    if (!merchantSlug) {
      // Redirect to onboarding
      window.location.href = '/onboarding'
      return
    }

    setLoadingPlan(planId)
    const res = await createStripeCheckoutSessionAction({
      merchantSlug,
      planId,
    })
    setLoadingPlan(null)

    if (!res.success) {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe')
      return
    }

    if (res.url) {
      if (res.simulated) {
        toast.success(`อัปเกรดเป็นแพ็กเกจ ${PRICING_PLANS[planId].name} เรียบร้อยแล้ว!`)
        if (onPlanSelected) onPlanSelected()
      } else {
        window.location.href = res.url
      }
    }
  }

  const plans = Object.values(PRICING_PLANS)

  return (
    <div className="w-full space-y-8">
      <div className="text-center max-w-2xl mx-auto space-y-2">
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
      </div>

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 lg:gap-6 max-w-6xl mx-auto items-stretch">
        {plans.map((p) => {
          const isPopular = p.popular
          const isCurrent = currentPlan === p.id

          return (
            <motion.div
              key={p.id}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`relative flex flex-col justify-between rounded-3xl p-6 sm:p-7 transition-all ${
                isPopular
                  ? 'bg-white dark:bg-slate-900 border-2 border-indigo-600 dark:border-indigo-500 shadow-xl shadow-indigo-600/10'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm'
              }`}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3.5 py-1 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-extrabold rounded-full shadow-md tracking-wide uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 fill-current" />
                  <span>{lang === 'th' ? 'แนะนำ / ยอดนิยม' : 'Most Popular'}</span>
                </div>
              )}

              <div>
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">{p.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{p.tagline}</p>
                  </div>
                  {isCurrent && (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 rounded-full text-[10px] font-bold shrink-0">
                      {lang === 'th' ? 'แพ็กเกจปัจจุบัน' : 'Current Plan'}
                    </span>
                  )}
                </div>

                {/* Price Display */}
                <div className="my-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                      ฿{p.priceTHB.toLocaleString()}
                    </span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? '/เดือน' : '/month'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px]">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      ⚡ โควตา {p.quota.toLocaleString()} สลิป/เดือน
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="space-y-2.5 mb-6 text-xs text-slate-700 dark:text-slate-300">
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

              {/* Action CTA */}
              <div>
                {isCurrent ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 font-bold text-xs cursor-default flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{lang === 'th' ? 'ใช้งานแพ็กเกจนี้อยู่' : 'Active Plan'}</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleSelectPlan(p.id)}
                    disabled={loadingPlan !== null}
                    className={`w-full py-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-md active:scale-98 ${
                      isPopular
                        ? 'bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-indigo-600/20'
                        : 'bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900'
                    } disabled:opacity-50`}
                  >
                    {loadingPlan === p.id ? (
                      <span>{t('loading')}</span>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>
                          {merchantSlug 
                            ? (lang === 'th' ? `อัปเกรดเป็น ${p.name}` : `Upgrade to ${p.name}`)
                            : (lang === 'th' ? `เริ่มต้นใช้งาน ${p.name}` : `Get Started with ${p.name}`)}
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
          <span>{lang === 'th' ? 'ชำระเงินปลอดภัยผ่าน Stripe • รองรับบัตรเครดิต/เดบิต และพร้อมเพย์ • ยกเลิกได้ตลอดเวลา' : 'Secured with Stripe • Card & PromptPay accepted • Cancel anytime'}</span>
        </p>
      </div>
    </div>
  )
}
