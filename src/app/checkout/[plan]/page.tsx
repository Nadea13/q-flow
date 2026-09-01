'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createStripeCheckoutSessionAction } from '@/app/actions/stripe'
import { PRICING_PLANS } from '@/lib/stripe'
import { QFlowLogo } from '@/components/QFlowLogo'
import { Sparkles, AlertCircle, ArrowRight } from 'lucide-react'
import type { PlanType } from '@/types/database'

interface PageProps {
  params: Promise<{ plan: string }>
}

export default function DynamicPlanCheckoutPage({ params }: PageProps) {
  const { plan: rawPlan } = use(params)
  const router = useRouter()
  const normalizedPlan = (rawPlan === 'free' ? 'basic' : rawPlan) as PlanType
  const [error, setError] = useState<string | null>(null)
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null)
  const hasTriggeredRef = useRef(false)

  const plan = PRICING_PLANS[normalizedPlan] || PRICING_PLANS.professional

  useEffect(() => {
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true

    async function initCheckout() {
      try {
        let lineUserId: string | undefined = undefined
        let lineDisplayName: string | undefined = undefined
        let linePictureUrl: string | undefined = undefined

        // Try getting LINE profile if opened inside LIFF
        try {
          const { initLiff } = await import('@/lib/liff')
          const liffRes = await initLiff()
          if (liffRes?.success && liffRes.profile?.userId) {
            lineUserId = liffRes.profile.userId
            lineDisplayName = liffRes.profile.displayName
            linePictureUrl = liffRes.profile.pictureUrl
            localStorage.setItem('qflow_admin_line_profile', JSON.stringify(liffRes.profile))
          }
        } catch {
          // LIFF fallback
        }

        if (!lineUserId) {
          try {
            const cached = localStorage.getItem('qflow_admin_line_profile')
            if (cached) {
              const parsed = JSON.parse(cached)
              lineUserId = parsed.userId
              lineDisplayName = parsed.displayName
              linePictureUrl = parsed.pictureUrl
            }
          } catch { }
        }

        const validPlanId: PlanType = PRICING_PLANS[normalizedPlan] ? normalizedPlan : 'professional'

        const res = await createStripeCheckoutSessionAction({
          planId: validPlanId,
          merchantSlug: 'public',
          lineUserId: lineUserId,
          lineDisplayName: lineDisplayName,
          linePictureUrl: linePictureUrl,
        })

        if (res.success && res.url) {
          setCheckoutUrl(res.url)
          if (res.simulated) {
            router.replace(res.url)
          } else {
            window.location.href = res.url
          }
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบชำระเงิน Stripe')
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
      }
    }

    initCheckout()
  }, [normalizedPlan, router])

  function handleManualOpen() {
    if (!checkoutUrl) return
    window.location.href = checkoutUrl
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-7 shadow-sm text-center space-y-6">
        <div className="flex justify-center">
          <QFlowLogo className="h-12 w-12 animate-pulse" />
        </div>

        {error ? (
          <div className="space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">ไม่สามารถเชื่อมต่อ Stripe ได้</h2>
            <p className="text-xs text-rose-500">{error}</p>
            <button
              onClick={() => router.replace('/pricing')}
              className="mt-4 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl active:scale-95 cursor-pointer"
            >
              ดูแพ็กเกจทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>แพ็กเกจ {plan.name}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              กำลังพาคุณไปหน้าชำระเงิน Stripe...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ระบบกำลังเชื่อมต่อไปยังหน้าชำระเงินทางการของ Stripe Checkout อัตโนมัติ
            </p>
            <div className="pt-2">
              {checkoutUrl ? (
                <button
                  type="button"
                  onClick={handleManualOpen}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>แตะเพื่อไปหน้าชำระเงิน Stripe ทันที</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
