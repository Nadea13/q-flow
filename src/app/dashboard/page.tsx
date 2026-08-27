'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { QFlowLogo } from '@/components/QFlowLogo'
import { listMerchantsByLineUserIdAction } from '@/app/actions/portal'
import { Plus, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { NavbarControls } from '@/components/NavbarControls'

interface MerchantItem {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  plan?: string | null
  subscription_status?: string | null
  created_at?: string
}

export default function ShopSelectionPortalPage() {
  const router = useRouter()
  const [merchants, setMerchants] = useState<MerchantItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lineProfile, setLineProfile] = useState<{ displayName?: string; pictureUrl?: string; userId?: string } | null>(null)

  useEffect(() => {
    async function loadShops() {
      try {
        let lineUid: string | null = null

        // 1. Try resolving LINE profile from LIFF SDK
        try {
          const { initLiff } = await import('@/lib/liff')
          const liffRes = await initLiff()
          if (liffRes?.success && liffRes.profile?.userId) {
            lineUid = liffRes.profile.userId
            setLineProfile(liffRes.profile)
            localStorage.setItem('qflow_admin_line_profile', JSON.stringify(liffRes.profile))
          }
        } catch { }

        // 2. Fallback to localStorage saved profile
        if (!lineUid) {
          try {
            const saved = localStorage.getItem('qflow_admin_line_profile')
            if (saved) {
              const parsed = JSON.parse(saved)
              lineUid = parsed.userId || null
              setLineProfile(parsed)
            }
          } catch { }
        }

        // 3. Query all shops for this LINE User ID
        if (lineUid) {
          const res = await listMerchantsByLineUserIdAction(lineUid)
          if (res.success && res.merchants) {
            setMerchants(res.merchants)
          }
        }
      } catch (err) {
        console.error('Failed to load user shops:', err)
      } finally {
        setLoading(false)
      }
    }

    loadShops()
  }, [])

  async function handleCreateNewShop() {
    router.push('/pricing')
  }

  function handleSelectShop(slug: string) {
    router.push(`/${slug}/dashboard`)
  }

  async function handleLineLogin() {
    try {
      const { loginWithLine } = await import('@/lib/liff')
      const redirectUri = `${window.location.origin}/dashboard`
      await loginWithLine(redirectUri)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('ไม่สามารถเปิด LINE Login ได้: ' + msg)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-850/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <QFlowLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">Q Flow</span>
          </Link>

          <div className="flex items-center gap-3">
            <NavbarControls />
            {lineProfile && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-xs">
                {lineProfile.pictureUrl ? (
                  <img
                    src={lineProfile.pictureUrl}
                    alt={lineProfile.displayName || 'LINE'}
                    className="w-5 h-5 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#06C755] text-white flex items-center justify-center text-[10px] font-bold">
                    L
                  </div>
                )}
                <span className="font-medium truncate max-w-[120px] text-slate-700 dark:text-slate-300">
                  {lineProfile.displayName || 'LINE Admin'}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 max-w-4xl mx-auto w-full my-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full text-center space-y-8"
        >
          {/* Brand Header */}
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Merchant Workspace Portal</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              เลือกร้านค้าที่คุณต้องการจัดการ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              เข้าสู่แดชบอร์ดหลังร้านเพื่อจัดการคิว ตรวจสอบสลิป หรือสร้างร้านค้าใหม่
            </p>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">กำลังโหลดรายการร้านค้าของคุณ...</p>
            </div>
          ) : !lineProfile ? (
            /* Not Logged in state */
            <div className="max-w-md mx-auto p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-[#06C755]/10 text-[#06C755] flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 fill-[#06C755]" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.608.391.084.922.258 1.057.592.121.303.079.777.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.646 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.589-3.843 2.589-5.993z" />
                </svg>
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">เข้าสู่ระบบเพื่อดูร้านค้าของคุณ</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  กรุณาเข้าสู่ระบบด้วย LINE เพื่อเชื่อมต่อร้านค้าที่คุณเป็นเจ้าของ
                </p>
              </div>
              <button
                onClick={handleLineLogin}
                className="w-full py-3.5 px-4 bg-[#06C755] hover:bg-[#05b34c] active:scale-98 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2.5 shadow-md shadow-[#06C755]/25 transition cursor-pointer"
              >
                <svg className="w-5 h-5 fill-white shrink-0" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.019 9.608.391.084.922.258 1.057.592.121.303.079.777.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.646 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.589-3.843 2.589-5.993z" />
                </svg>
                <span>เข้าสู่ระบบด้วย LINE</span>
              </button>
            </div>
          ) : (
            /* Shops Grid */
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 pt-4">
              {/* Existing Shops Cards */}
              {merchants.map((shop) => (
                <motion.div
                  key={shop.id}
                  whileHover={{ y: -6, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectShop(shop.slug)}
                  className="flex flex-col items-center group cursor-pointer w-36 sm:w-44"
                >
                  <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 group-hover:border-indigo-600 dark:group-hover:border-indigo-500 shadow-md group-hover:shadow-xl group-hover:shadow-indigo-600/15 flex items-center justify-center p-4 transition-all relative overflow-hidden">
                    {shop.logo_url ? (
                      <img
                        src={shop.logo_url}
                        alt={shop.name}
                        className="w-full h-full object-cover rounded-2xl"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white flex items-center justify-center font-bold text-2xl shadow-inner">
                        {shop.name.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {shop.plan && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-extrabold text-[9px] uppercase border border-indigo-200/60 dark:border-indigo-800/60">
                        {shop.plan}
                      </span>
                    )}
                  </div>
                  <span className="mt-3 text-sm font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition truncate max-w-full">
                    {shop.name}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                    /{shop.slug}
                  </span>
                </motion.div>
              ))}

              {/* Add New Shop Button */}
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateNewShop}
                className="flex flex-col items-center group cursor-pointer w-36 sm:w-44"
              >
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-slate-100/80 dark:bg-slate-900/50 border-2 border-dashed border-slate-300 dark:border-slate-700 group-hover:border-indigo-600 dark:group-hover:border-indigo-500 group-hover:bg-indigo-50/50 dark:group-hover:bg-indigo-950/30 flex items-center justify-center transition-all shadow-2xs">
                  <div className="w-12 h-12 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition shadow-sm">
                    <Plus className="w-6 h-6 stroke-[2.5]" />
                  </div>
                </div>
                <span className="mt-3 text-sm font-bold text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition">
                  สร้างร้านใหม่
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  เพิ่มระบบจองคิว
                </span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 dark:border-slate-850/80 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
        <p>© {new Date().getFullYear()} Q Flow Platform • Secure Multi-Store Portal</p>
      </footer>
    </div>
  )
}
