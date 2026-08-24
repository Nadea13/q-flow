'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Lock
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createMerchantAction } from '@/app/actions/merchant'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'

export default function OnboardingPage() {
  const router = useRouter()
  const { t, lang } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdMerchant, setCreatedMerchant] = useState<{
    slug: string
    name: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    promptpay_id: '',
    default_deposit: '200',
    admin_pin: '1234',
    slug: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createMerchantAction({
      name: formData.name,
      promptpay_id: formData.promptpay_id,
      default_deposit: Number(formData.default_deposit) || 100,
      admin_pin: formData.admin_pin || '1234',
      customSlug: formData.slug || undefined,
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between py-8 px-4 sm:px-6 transition-colors">
      <div className="max-w-md w-full mx-auto">
        {/* Top Navbar */}
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-base shadow-xs group-hover:scale-105 transition-transform">
              Q
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">QFlow</span>
          </Link>
          <NavbarControls />
        </div>

        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            {t('onboardingBadge')}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('onboardingTitle')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
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
              className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 sm:p-7 shadow-lg shadow-emerald-500/5"
            >
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3.5">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <h2 className="text-lg font-bold text-center text-slate-900 dark:text-white mb-0.5">
                {t('onboardingSuccessTitle')}
              </h2>
              <p className="text-center text-xs text-slate-600 dark:text-slate-400 mb-5">
                <strong className="text-emerald-600 dark:text-emerald-400 font-semibold">{createdMerchant.name}</strong> {t('onboardingSuccessDesc')}
              </p>

              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
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
                      className="shrink-0 text-xs bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 font-medium transition shadow-2xs active:scale-95"
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
                    className="w-full py-3 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition text-center active:scale-98"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('testBookingBtn')}
                  </Link>
                  <Link
                    href={`/${createdMerchant.slug}/dashboard`}
                    className="w-full py-3 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-700 transition text-center shadow-2xs active:scale-98"
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
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-7 shadow-xs space-y-4"
            >
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
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
                    type="number"
                    required
                    min="0"
                    step="10"
                    placeholder={t('depositPlaceholder')}
                    value={formData.default_deposit}
                    onChange={(e) => setFormData({ ...formData, default_deposit: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {t('depositHint')}
                </p>
              </div>

              {/* Field 4: Admin PIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                  {lang === 'th' ? '4. รหัส Admin PIN เข้าจัดการหลังบ้าน (4-6 หลัก)' : '4. Admin PIN Code (4-6 digits)'} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    placeholder="1234"
                    value={formData.admin_pin}
                    onChange={(e) => setFormData({ ...formData, admin_pin: e.target.value })}
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono tracking-widest"
                  />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {lang === 'th' ? 'ใช้สำหรับปลดล็อกเข้าดูหน้า Dashboard จัดการคิว (เริ่มต้น: 1234)' : 'Used to unlock and access your management Dashboard (Default: 1234)'}
                </p>
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
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-r-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-4 active:scale-98"
              >
                {loading ? (
                  <span>{t('creatingShop')}</span>
                ) : (
                  <>
                    <span>{t('createShopBtn')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>

      {/* Footer info */}
      <div className="text-center text-xs text-slate-500 dark:text-slate-500 mt-8">
        QFlow Micro-SaaS • 100% Mobile Ready • Auto PromptPay & SlipOK Verification
      </div>
    </div>
  )
}
