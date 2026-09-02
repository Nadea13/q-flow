'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { QFlowLogo } from '@/components/QFlowLogo'
import { listShopsByLineUserIdAction } from '@/app/actions/portal'
import { syncStripeSessionAction } from '@/app/actions/stripe'
import { PRICING_PLANS } from '@/lib/stripe'
import { toast } from 'sonner'
import { Plus, Sparkles, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { NavbarControls } from '@/components/NavbarControls'
import { useLanguage } from '@/context/LanguageContext'
import { createClient } from '@/lib/supabase/client'

interface ShopItem {
  id: string
  name: string
  slug: string
  logo_url?: string | null
  plan?: string | null
  subscription_status?: string | null
  created_at?: string
}

function ShopsPortalContent() {
  const { lang } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [shops, setShops] = useState<ShopItem[]>([])
  const [loading, setLoading] = useState(true)
  const [lineProfile, setLineProfile] = useState<{ displayName?: string; pictureUrl?: string; userId?: string } | null>(null)

  const sessionId = searchParams.get('session_id')
  const upgradedPlanId = searchParams.get('upgraded')

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

        // 3. If returning from Stripe checkout, sync session
        if (sessionId) {
          await syncStripeSessionAction(sessionId)
          const planName = upgradedPlanId && PRICING_PLANS[upgradedPlanId] ? PRICING_PLANS[upgradedPlanId].name : ''
          toast.success(lang === 'th' ? `อัปเกรดเป็น ${planName || 'แพ็กเกจใหม่'} เรียบร้อยแล้ว!` : `Upgraded to ${planName || 'plan'} successfully!`)
          router.replace('/shops')
        } else if (upgradedPlanId) {
          const planName = PRICING_PLANS[upgradedPlanId] ? PRICING_PLANS[upgradedPlanId].name : upgradedPlanId
          toast.success(lang === 'th' ? `เลือกแพ็กเกจ ${planName} เรียบร้อยแล้ว!` : `Selected ${planName} plan successfully!`)
          router.replace('/shops')
        }

        // 4. Query all shops for this LINE User ID
        if (lineUid) {
          const res = await listShopsByLineUserIdAction(lineUid)
          if (res.success && res.shops) {
            setShops(res.shops)
          }
          setLoading(false)
        } else {
          // If not logged in, immediately redirect to LINE Login
          const { loginWithLine } = await import('@/lib/liff')
          const redirectUri = typeof window !== 'undefined' ? `${window.location.origin}/shops` : ''
          if (redirectUri) {
            await loginWithLine(redirectUri)
          }
        }
      } catch (err) {
        console.error('Failed to load user shops:', err)
        setLoading(false)
      }
    }

    loadShops()

    // Real-time listener for shops updates
    const supabase = createClient()
    const channel = supabase
      .channel('portal-shops-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        () => {
          loadShops()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sessionId, upgradedPlanId, router, lang])

  async function handleCreateNewShop() {
    router.push('/pricing')
  }

  function handleSelectShop(slug: string) {
    router.push(`/${slug}/dashboard`)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Top Navbar */}
      <header className="border-b border-slate-200/80 dark:border-slate-850/80 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <QFlowLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">QFlow</span>
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
              <span>{lang === 'th' ? 'ศูนย์รวมร้านค้าของคุณ' : 'Store Management Workspace'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {lang === 'th' ? 'เลือกร้านค้าที่คุณต้องการจัดการ' : 'Select a Shop to Manage'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              {lang === 'th'
                ? 'เข้าสู่แดชบอร์ดหลังร้านเพื่อจัดการคิว ตรวจสอบสลิป หรือสร้างร้านค้าใหม่'
                : 'Enter your shop dashboard to manage bookings, verify slips, or add a new branch.'}
            </p>
          </div>

          {loading || !lineProfile ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-400">
                {!lineProfile
                  ? (lang === 'th' ? 'กำลังนำคุณไปหน้าเข้าสู่ระบบ LINE...' : 'Redirecting to LINE Login...')
                  : (lang === 'th' ? 'กำลังโหลดรายการร้านค้าของคุณ...' : 'Loading your stores...')}
              </p>
            </div>
          ) : (
            /* Shops Grid */
            <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 pt-4">
              {/* Existing Shops Cards */}
              {shops.map((shop) => (
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
                  {lang === 'th' ? 'สร้างร้านใหม่' : 'Create New Shop'}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {lang === 'th' ? 'เพิ่มระบบจองคิว' : 'Add Queue System'}
                </span>
              </motion.div>
            </div>
          )}
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/80 dark:border-slate-850/80 bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-sans mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 sm:gap-8">
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

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Systems Operational</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-[11px] font-semibold text-indigo-700 dark:text-indigo-400">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Secure Multi-Store Portal</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
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
                    <Link href="/pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition">
                      {lang === 'th' ? 'แพ็กเกจราคา' : 'Pricing Plans'}
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleCreateNewShop}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold text-indigo-600 dark:text-indigo-400 text-left cursor-pointer"
                    >
                      {lang === 'th' ? 'เปิดร้านค้าใหม่' : 'Create New Shop'}
                    </button>
                  </li>
                </ul>
              </div>

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
                </ul>
              </div>

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
                    <Link href="/shops" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition font-semibold text-indigo-600 dark:text-indigo-400">
                      {lang === 'th' ? 'หน้ารวมร้านค้าของคุณ (/shops)' : 'My Stores (/shops)'}
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200/80 dark:border-slate-850/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 dark:text-slate-500">
            <div>
              <span>© {new Date().getFullYear()} QFlow Platform. All rights reserved.</span>
            </div>
            <div className="flex items-center justify-center gap-4">
              <span>Powered by <span className='font-bold'>QFlow</span></span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function ShopsPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <QFlowLogo className="h-10 w-10 animate-pulse text-indigo-600" />
      </div>
    }>
      <ShopsPortalContent />
    </Suspense>
  )
}
