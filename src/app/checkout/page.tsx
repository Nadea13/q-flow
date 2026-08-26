'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createStripeCheckoutSessionAction } from '@/app/actions/stripe'
import { PRICING_PLANS } from '@/lib/stripe'
import { QFlowLogo } from '@/components/QFlowLogo'
import { Sparkles, AlertCircle } from 'lucide-react'
import type { PlanType } from '@/types/database'

function CheckoutRedirectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const planParam = (searchParams.get('plan') || 'professional') as PlanType
  const merchantSlug = searchParams.get('slug') || undefined
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function initCheckout() {
      try {
        let lineUserId: string | undefined = undefined

        // Try getting LINE profile if opened inside LIFF
        try {
          const { initLiff } = await import('@/lib/liff')
          const liffRes = await initLiff()
          if (liffRes.success && liffRes.profile?.userId) {
            lineUserId = liffRes.profile.userId
            localStorage.setItem('qflow_admin_line_profile', JSON.stringify(liffRes.profile))
          }
        } catch {
          // LIFF fallback
        }

        const validPlanId: PlanType = PRICING_PLANS[planParam] ? planParam : 'professional'

        const res = await createStripeCheckoutSessionAction({
          planId: validPlanId,
          merchantSlug: merchantSlug,
          lineUserId: lineUserId,
        })

        if (res.success && res.url) {
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
  }, [planParam, merchantSlug, router])

  const planName = PRICING_PLANS[planParam]?.name || 'Professional'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center space-y-6">
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
              className="mt-4 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl active:scale-95"
            >
              ดูแพ็กเกจทั้งหมด
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>แพ็กเกจ {planName}</span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              กำลังพาคุณไปหน้าชำระเงิน Stripe...
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ระบบกำลังเชื่อมต่อและส่งต่อไปยัง Stripe Checkout ที่ปลอดภัย กรุณารอสักครู่
            </p>
            <div className="pt-3">
              <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CheckoutRedirectContent />
    </Suspense>
  )
}
