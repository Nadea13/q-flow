'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Elements } from '@stripe/react-stripe-js'
import { createStripePaymentIntentAction } from '@/app/actions/stripe'
import { StripeEmbeddedForm } from '@/components/StripeEmbeddedForm'
import { PRICING_PLANS } from '@/lib/stripe'
import { QFlowLogo } from '@/components/QFlowLogo'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import type { PlanType } from '@/types/database'

const stripePromise = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null

interface PageProps {
  params: Promise<{ plan: string }>
}

export default function DynamicPlanCheckoutPage({ params }: PageProps) {
  const { plan: rawPlan } = use(params)
  const router = useRouter()
  const planParam = rawPlan as PlanType
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [isSimulated, setIsSimulated] = useState(false)
  const [lineUserId, setLineUserId] = useState<string | undefined>(undefined)
  const hasTriggeredRef = useRef(false)

  const plan = PRICING_PLANS[planParam] || PRICING_PLANS.professional

  useEffect(() => {
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true

    async function initIntent() {
      try {
        let uid: string | undefined = undefined

        // Try getting LINE profile if opened inside LIFF
        try {
          const { initLiff } = await import('@/lib/liff')
          const liffRes = await initLiff()
          if (liffRes?.success && liffRes.profile?.userId) {
            uid = liffRes.profile.userId
            setLineUserId(uid)
            localStorage.setItem('qflow_admin_line_profile', JSON.stringify(liffRes.profile))
          }
        } catch {
          // LIFF fallback
        }

        const res = await createStripePaymentIntentAction({
          planId: plan.id,
          lineUserId: uid,
        })

        if (res.success && res.clientSecret) {
          setClientSecret(res.clientSecret)
          setIsSimulated(Boolean(res.simulated))
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อระบบ Stripe')
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setError(errorMsg)
      }
    }

    initIntent()
  }, [plan.id])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QFlowLogo className="h-7 w-7" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">Q Flow Subscriptions</span>
          </div>
          <button
            onClick={() => router.replace('/pricing')}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
            title="กลับ"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950 text-rose-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">เกิดข้อผิดพลาด</h2>
            <p className="text-xs text-rose-500">{error}</p>
            <button
              onClick={() => router.replace('/pricing')}
              className="mt-3 px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold rounded-xl active:scale-95 cursor-pointer"
            >
              ดูแพ็กเกจทั้งหมด
            </button>
          </div>
        ) : clientSecret ? (
          isSimulated ? (
            <StripeEmbeddedForm
              planName={plan.name}
              priceTHB={plan.priceTHB}
              planId={plan.id}
              lineUserId={lineUserId}
              isSimulated={true}
            />
          ) : (
            stripePromise && (
              <Elements
                stripe={stripePromise}
                options={{
                  clientSecret: clientSecret,
                  appearance: {
                    theme: 'stripe',
                    variables: {
                      colorPrimary: '#4f46e5',
                      borderRadius: '12px',
                    },
                  },
                }}
              >
                <StripeEmbeddedForm
                  planName={plan.name}
                  priceTHB={plan.priceTHB}
                  planId={plan.id}
                  lineUserId={lineUserId}
                  isSimulated={false}
                />
              </Elements>
            )
          )
        ) : (
          <div className="text-center py-10 space-y-3">
            <div className="w-7 h-7 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500">กำลังเตรียมฟอร์มชำระเงินของ Stripe...</p>
          </div>
        )}
      </div>
    </div>
  )
}
