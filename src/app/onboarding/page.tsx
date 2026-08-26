'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Store, 
  QrCode, 
  DollarSign, 
  Copy, 
  ExternalLink,
  Check,
  Building2,
  Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createMerchantAction } from '@/app/actions/merchant'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'
import { ThaiAddressSelector } from '@/components/ThaiAddressSelector'
import { PRICING_PLANS } from '@/lib/stripe'

function OnboardingContent() {
  const { t, lang } = useLanguage()
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const planParam = searchParams.get('plan')
  const validPlan = planParam && PRICING_PLANS[planParam] ? planParam : null

  // If no package is subscribed / selected, redirect to /pricing
  useEffect(() => {
    if (!validPlan) {
      router.replace('/pricing')
    }
  }, [validPlan, router])

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdMerchant, setCreatedMerchant] = useState<{
    slug: string
    name: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  // LINE Profile State
  const [lineAdminProfile, setLineAdminProfile] = useState<{
    displayName: string
    pictureUrl?: string
    userId: string
  } | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    promptpay_id: '',
    default_deposit: '200',
    slug: '',
    branch_name: 'สาขาหลัก (Main Branch)',
    branch_address: '',
    branch_phone: '',
  })

  const lineUidParam = searchParams.get('line_uid')

  // Detect LINE LIFF on mount
  useEffect(() => {
    async function checkLiff() {
      try {
        const { initLiff } = await import('@/lib/liff')
        const res = await initLiff()
        if (res.success && res.profile) {
          const profileData = {
            displayName: res.profile.displayName,
            pictureUrl: res.profile.pictureUrl,
            userId: res.profile.userId,
          }
          setLineAdminProfile(profileData)
          localStorage.setItem('qflow_admin_line_profile', JSON.stringify(profileData))

          // Auto-fill shop name if empty
          setFormData((prev) => ({
            ...prev,
            name: prev.name ? prev.name : `${res.profile?.displayName || 'Shop'}'s Studio`,
          }))
          return
        }
      } catch {
        // LIFF fallback
      }

      // If line_uid came from Stripe redirect query param
      if (lineUidParam) {
        setLineAdminProfile((prev) => prev || { displayName: 'LINE Admin', userId: lineUidParam })
      }
    }

    checkLiff()
  }, [lineUidParam])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createMerchantAction({
      name: formData.name,
      promptpay_id: formData.promptpay_id,
      default_deposit: Number(formData.default_deposit) || 100,
      admin_pin: '1234',
      line_user_id: lineAdminProfile?.userId,
      customSlug: formData.slug || undefined,
      branch_name: formData.branch_name || undefined,
      branch_address: formData.branch_address || undefined,
      branch_phone: formData.branch_phone || undefined,
      plan: validPlan || undefined,
    })

    setLoading(false)

    if (!res.success || !res.merchant) {
      setError(res.error || t('errorOccurred'))
      return
    }

    setCreatedMerchant({
      slug: res.merchant.slug,
      name: res.merchant.name,
    })
  }

  if (!validPlan) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">{lang === 'th' ? 'กำลังนำคุณไปเลือกแพ็กเกจ...' : 'Redirecting to pricing plans...'}</p>
        </div>
      </div>
    )
  }

  const bookingUrl = createdMerchant
    ? typeof window !== 'undefined'
      ? `${window.location.origin}/${createdMerchant.slug}/book`
      : `/${createdMerchant.slug}/book`
    : ''

  function copyLink() {
    if (bookingUrl) {
      navigator.clipboard.writeText(bookingUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans antialiased">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <QFlowLogo className="h-7 w-7" />
            <span className="font-bold text-sm text-slate-900 dark:text-white">Q Flow Merchant Setup</span>
          </div>
          <NavbarControls />
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            {t('onboardingBadge')}
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('onboardingTitle')}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('onboardingSubtitle')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* Success Card */}
          {createdMerchant ? (
            <motion.div 
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 text-center"
            >
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('onboardingSuccessTitle')}
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{createdMerchant.name}</strong> {t('onboardingSuccessDesc')}
              </p>

              <div className="space-y-3 pt-2">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-left">
                  <label className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1">
                    {t('yourBookingLink')}
                  </label>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-mono truncate font-medium">
                      {bookingUrl}
                    </span>
                    <button
                      onClick={copyLink}
                      type="button"
                      className="shrink-0 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 font-medium transition shadow-2xs active:scale-95 cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{t('copied')}</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t('copy')}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <Link
                    href={`/${createdMerchant.slug}/book`}
                    className="w-full py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition text-center active:scale-98"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('testBookingBtn')}
                  </Link>
                  <Link
                    href={`/${createdMerchant.slug}/dashboard`}
                    className="w-full py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition text-center shadow-2xs active:scale-98"
                  >
                    {t('gotoDashboardBtn')}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : (
            /* Form Card */
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {/* LINE Account Link Card */}
              {lineAdminProfile && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    {lineAdminProfile.pictureUrl ? (
                      <img
                        src={lineAdminProfile.pictureUrl}
                        alt={lineAdminProfile.displayName}
                        className="w-9 h-9 rounded-full object-cover border border-emerald-500/40"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#06C755] text-white font-bold text-xs flex items-center justify-center">
                        L
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <span>{lineAdminProfile.displayName}</span>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(LINE Owner)</span>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        {lang === 'th' ? 'เชื่อมต่อบัญชี LINE เป็นเจ้าของร้านอัตโนมัติ' : 'Linked as Merchant Admin'}
                      </p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              {/* Field 1: Shop Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {t('shopNameLabel')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Store className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={t('shopNamePlaceholder')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Field 2: PromptPay ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {t('promptpayLabel')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder={t('promptpayPlaceholder')}
                    value={formData.promptpay_id}
                    onChange={(e) => setFormData({ ...formData, promptpay_id: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {t('promptpayHint')}
                </p>
              </div>

              {/* Field 3: Deposit Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {t('depositLabel')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder={t('depositPlaceholder')}
                    value={formData.default_deposit}
                    onChange={(e) => setFormData({ ...formData, default_deposit: e.target.value.replace(/\D/g, '') })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                  {t('depositHint')}
                </p>
              </div>

              {/* Field 4: First Branch & Location */}
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-3.5">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                    <Building2 className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === 'th' ? '4. ข้อมูลสาขาแรกของร้าน' : '4. First Branch Details'}
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'ตั้งค่าสาขาแรกเพื่อเริ่มเปิดรับคิว (เพิ่มสาขาได้ภายหลัง)' : 'Configure your initial branch'}
                    </p>
                  </div>
                </div>

                {/* Branch Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {lang === 'th' ? 'ชื่อสาขา' : 'Branch Name'}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น สาขาหลัก, สาขาสยามสแควร์"
                    value={formData.branch_name}
                    onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>

                {/* Branch Phone */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {lang === 'th' ? 'เบอร์โทรศัพท์สาขา (ถ้ามี)' : 'Branch Phone (Optional)'}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="text"
                      placeholder="เช่น 02-123-4567, 081-234-5678"
                      value={formData.branch_phone}
                      onChange={(e) => setFormData({ ...formData, branch_phone: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                {/* Branch Geo Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    {lang === 'th' ? 'ที่ตั้งสาขา (Geo Thai Address)' : 'Branch Location'}
                  </label>
                  <ThaiAddressSelector
                    initialAddress={formData.branch_address}
                    onChange={(fullAddr) => setFormData({ ...formData, branch_address: fullAddr })}
                    lang={lang}
                  />
                </div>
              </div>

              {/* Optional Custom Slug */}
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                  {t('customSlugLabel')}
                </label>
                <div className="flex items-center">
                  <span className="px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-r-0 border-slate-300 dark:border-slate-800 rounded-l-xl text-xs text-slate-500 dark:text-slate-400 font-mono select-none">
                    qflow.app/
                  </span>
                  <input
                    type="text"
                    placeholder="my-shop"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-r-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-4 active:scale-98 cursor-pointer"
              >
                {loading ? (
                  <span>{t('creatingShop')}</span>
                ) : (
                  <>
                    <span>{t('createShopBtn')}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
          Q Flow • 100% Mobile Ready • Auto PromptPay & SlipOK
        </div>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  )
}
