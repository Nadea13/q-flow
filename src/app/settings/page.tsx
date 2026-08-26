'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QFlowLogo } from '@/components/QFlowLogo'
import { findMerchantByLineUserIdAction } from '@/app/actions/portal'
import { AlertCircle, Sparkles } from 'lucide-react'

export default function SmartSettingsRedirect() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const hasTriggeredRef = useRef(false)

  useEffect(() => {
    if (hasTriggeredRef.current) return
    hasTriggeredRef.current = true

    async function resolveShop() {
      try {
        let lineUid: string | null = null

        // 1. Try resolving LINE profile from LIFF SDK
        try {
          const { initLiff } = await import('@/lib/liff')
          const liffRes = await initLiff()
          if (liffRes?.success && liffRes.profile?.userId) {
            lineUid = liffRes.profile.userId
            localStorage.setItem('qflow_admin_line_profile', JSON.stringify(liffRes.profile))
          }
        } catch {
          // Fallback if not inside LIFF
        }

        // 2. Fallback to localStorage saved profile
        if (!lineUid) {
          try {
            const saved = localStorage.getItem('qflow_admin_line_profile')
            if (saved) {
              const parsed = JSON.parse(saved)
              lineUid = parsed.userId || null
            }
          } catch {
            // ignore
          }
        }

        // 3. If LINE User ID is found, query Supabase for their merchant slug
        if (lineUid) {
          const res = await findMerchantByLineUserIdAction(lineUid)
          if (res.success && res.slug) {
            router.replace(`/${res.slug}/settings`)
            return
          }
        }

        // If no merchant found for this LINE account
        setLoading(false)
        setError('ไม่พบร้านค้าที่เชื่อมต่อกับบัญชี LINE นี้ กรุณาสมัครเปิดร้านก่อนเข้าสู่ระบบ')
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err)
        setLoading(false)
        setError(errorMsg)
      }
    }

    resolveShop()
  }, [router])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm text-center space-y-5">
        <div className="flex justify-center">
          <QFlowLogo className="h-10 w-10" />
        </div>

        {loading ? (
          <div className="space-y-3 py-4">
            <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">กำลังเข้าสู่หน้าตั้งค่าร้านค้าของคุณ...</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">ตรวจสอบข้อมูลร้านค้าผ่านบัญชี LINE อัตโนมัติ</p>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="w-12 h-12 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">ยังไม่มีร้านค้าในระบบ</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{error}</p>
            <div className="pt-2 flex flex-col gap-2">
              <Link
                href="/pricing"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition"
              >
                <Sparkles className="w-4 h-4" />
                <span>ดูแพ็กเกจ & สมัครเปิดร้าน</span>
              </Link>
              <Link
                href="/"
                className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200 transition"
              >
                กลับสู่หน้าหลัก
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
