'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js'
import { Sparkles, ShieldCheck, Lock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  planName: string
  priceTHB: number
  planId: string
  lineUserId?: string
  isSimulated?: boolean
}

export function StripeEmbeddedForm({ planName, priceTHB, planId, lineUserId, isSimulated }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (isSimulated) {
      setLoading(true)
      setTimeout(() => {
        setSuccess(true)
        toast.success('ชำระเงินสำเร็จ (โหมดทดสอบ)')
        setTimeout(() => {
          const lineQuery = lineUserId ? `&line_uid=${encodeURIComponent(lineUserId)}` : ''
          router.replace(`/onboarding?plan=${planId}&status=success${lineQuery}`)
        }, 1200)
      }, 1000)
      return
    }

    if (!stripe || !elements) {
      return
    }

    setLoading(true)
    setErrorMessage(null)

    const siteUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const lineQuery = lineUserId ? `&line_uid=${encodeURIComponent(lineUserId)}` : ''
    const returnUrl = `${siteUrl}/onboarding?plan=${planId}&status=success${lineQuery}`

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: returnUrl,
      },
    })

    if (error) {
      setErrorMessage(error.message || 'การชำระเงินไม่สำเร็จ กรุณาตรวจสอบข้อมูลบัตร')
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">ชำระเงินสำเร็จแล้ว!</h3>
        <p className="text-xs text-slate-500">กำลังนำคุณไปตั้งชื่อร้านและเปิดระบบ...</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex justify-between items-center">
        <div>
          <div className="text-xs text-slate-500 font-medium">ยอดชำระแพ็กเกจ</div>
          <div className="text-base font-extrabold text-slate-900 dark:text-white">{planName}</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-extrabold text-indigo-600 dark:text-indigo-400">
            ฿{priceTHB.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-400">ตัดยอดรายเดือน</div>
        </div>
      </div>

      {isSimulated ? (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 space-y-1">
          <div className="font-bold flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>โหมดทดสอบ (Simulated Test Mode)</span>
          </div>
          <p className="text-[11px]">สามารถกดปุ่มยืนยันเพื่อทดสอบ Flow เปิดร้านได้ทันทีโดยไม่ต้องใส่บัตรจริง</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          <PaymentElement options={{ layout: 'tabs' }} />
        </div>
      )}

      {errorMessage && (
        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-xs text-rose-600 dark:text-rose-400 font-medium">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || (!isSimulated && !stripe)}
        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>{loading ? 'กำลังประมวลผล...' : `ยืนยันชำระเงิน ฿${priceTHB.toLocaleString()}`}</span>
      </button>

      <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
        <span>ระบบความปลอดภัยมาตรฐานสากล PCI-DSS โดย Stripe</span>
      </div>
    </form>
  )
}
