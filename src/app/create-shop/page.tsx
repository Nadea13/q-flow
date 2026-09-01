'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Store,
  QrCode,
  DollarSign,
  Copy,
  ExternalLink,
  Check,
  Building2,
  Phone,
  Clock,
  User,
  Scissors,
  Sparkles,
  CreditCard
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { createMerchantAction } from '@/app/actions/merchant'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'
import { ThaiAddressSelector } from '@/components/ThaiAddressSelector'
import { TimePicker24h } from '@/components/TimePicker24h'
import { PRICING_PLANS } from '@/lib/stripe'

function CreateShopContent() {
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

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
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
    // Step 1: Shop & Payment & URL
    name: '',
    slug: '',
    promptpay_id: '',
    promptpay_name: '',
    default_deposit: '100',

    // Step 2: Branch & Operating Hours
    branch_name: 'สาขาหลัก',
    branch_phone: '',
    branch_promptpay_id: '',
    branch_promptpay_name: '',
    branch_address: '',
    open_time: '10:00',
    close_time: '20:00',

    // Step 3: Staff & Service
    staff_name: '',
    staff_role: 'ผู้ให้บริการประจำร้าน',
    service_title: 'บริการพื้นฐาน',
    service_duration: '60',
    service_price: '300',
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
            staff_name: prev.staff_name ? prev.staff_name : (res.profile?.displayName || 'ช่างประจำร้าน'),
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

  function handleNextStep() {
    setError(null)
    if (currentStep === 1) {
      if (!formData.name.trim()) {
        setError(lang === 'th' ? 'กรุณากรอกชื่อร้านค้า' : 'Please enter your shop name')
        return
      }
      if (!formData.promptpay_id.trim()) {
        setError(lang === 'th' ? 'กรุณากรอกเบอร์โทรหรือเลขบัตรประชาชนสำหรับพร้อมเพย์' : 'Please enter PromptPay ID')
        return
      }
      if (!formData.default_deposit || isNaN(Number(formData.default_deposit))) {
        setError(lang === 'th' ? 'กรุณาระบุจำนวนเงินมัดจำ' : 'Please enter default deposit amount')
        return
      }
      setCurrentStep(2)
      return
    }

    if (currentStep === 2) {
      if (!formData.branch_name.trim()) {
        setError(lang === 'th' ? 'กรุณาระบุชื่อสาขา' : 'Please enter branch name')
        return
      }
      setCurrentStep(3)
      return
    }
  }

  function handlePrevStep() {
    setError(null)
    if (currentStep === 3) setCurrentStep(2)
    else if (currentStep === 2) setCurrentStep(1)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await createMerchantAction({
      name: formData.name,
      promptpay_id: formData.promptpay_id,
      promptpay_name: formData.promptpay_name.trim() || undefined,
      default_deposit: formData.default_deposit !== '' && !isNaN(Number(formData.default_deposit)) ? Number(formData.default_deposit) : 100,
      admin_pin: '1234',
      line_user_id: lineAdminProfile?.userId,
      customSlug: formData.slug || undefined,
      branch_name: formData.branch_name || undefined,
      branch_address: formData.branch_address || undefined,
      branch_phone: formData.branch_phone || undefined,
      branch_promptpay_id: formData.branch_promptpay_id.trim() || undefined,
      branch_promptpay_name: formData.branch_promptpay_name.trim() || undefined,
      open_time: `${formData.open_time}:00`,
      close_time: `${formData.close_time}:00`,
      plan: validPlan || undefined,
      // Step 3
      staff_name: formData.staff_name.trim() || undefined,
      staff_role: formData.staff_role.trim() || undefined,
      service_title: formData.service_title.trim() || undefined,
      service_duration: Number(formData.service_duration) || 60,
      service_price: Number(formData.service_price) || 0,
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

  const stepTitles = [
    { num: 1, title: lang === 'th' ? 'ข้อมูลร้าน & URL' : 'Shop & URL', desc: lang === 'th' ? 'ชื่อร้าน และบัญชีรับเงิน' : 'Profile & Payment' },
    { num: 2, title: lang === 'th' ? 'สาขา & เวลาทำการ' : 'Branch & Hours', desc: lang === 'th' ? 'ที่ตั้ง และเวลาเปิดปิด' : 'Location & Time' },
    { num: 3, title: lang === 'th' ? 'ช่าง & บริการ' : 'Staff & Service', desc: lang === 'th' ? 'ช่างและบริการแรก' : 'Specialist & Service' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans antialiased">
      <div className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QFlowLogo className="h-7 w-7" />
            <span className="font-bold text-lg text-slate-900 dark:text-white">Q Flow Shop Setup</span>
          </div>
          <NavbarControls />
        </div>

        {/* Step Wizard Header */}
        {!createdMerchant && (
          <div className="pt-1">
            <div className="flex items-center justify-between relative mb-2">
              <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
              <div 
                className="absolute top-4 left-6 h-0.5 bg-indigo-600 dark:bg-indigo-500 -translate-y-1/2 z-0 transition-all duration-300" 
                style={{ width: currentStep === 1 ? '0%' : currentStep === 2 ? 'calc(50% - 12px)' : 'calc(100% - 48px)' }}
              />

              {stepTitles.map((s) => {
                const isActive = currentStep === s.num
                const isDone = currentStep > s.num
                return (
                  <div key={s.num} className="relative z-10 flex flex-col items-center">
                    <button
                      type="button"
                      onClick={() => {
                        if (s.num < currentStep) setCurrentStep(s.num as 1 | 2 | 3)
                      }}
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${isDone
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : isActive
                            ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-950/60 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                        }`}
                    >
                      {isDone ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                    </button>
                    <span className={`text-[10px] font-bold mt-1.5 transition-colors ${isActive ? 'text-indigo-600 dark:text-indigo-400' : isDone ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'
                      }`}>
                      {s.title}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

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
              <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2">
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
            /* Multi-step Form */
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* LINE Account Link Banner */}
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

              {/* ================= STEP 1: SHOP PROFILE & URL & PROMPTPAY ================= */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === 'th' ? '1. ข้อมูลร้านค้า & ลิงก์ URL' : '1. Shop Profile & URL'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'กำหนดชื่อร้าน URL และบัญชีพร้อมเพย์สำหรับรับเงินมัดจำ' : 'Set your store name, booking URL, and PromptPay details'}
                    </p>
                  </div>

                  {/* Shop Name */}
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

                  {/* Custom Slug / URL */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {lang === 'th' ? 'URL ร้านค้า (Slug)' : 'Shop URL (Slug)'}
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
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {lang === 'th' ? 'ลิงก์ที่ลูกค้าใช้เข้าจองคิว (หากไม่ระบุ ระบบจะสร้างให้อัตโนมัติ)' : 'Link for booking (auto-generated if left empty)'}
                    </p>
                  </div>

                  {/* PromptPay ID */}
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

                  {/* PromptPay Account Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {lang === 'th' ? 'ชื่อบัญชีพร้อมเพย์รับเงิน' : 'PromptPay Account Name'}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder={lang === 'th' ? 'เช่น นาย สมชาย ใจดี, ร้าน นวดแผนไทย' : 'e.g. Somchai Jaidee, Thai Massage Shop'}
                        value={formData.promptpay_name}
                        onChange={(e) => setFormData({ ...formData, promptpay_name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                      {lang === 'th' ? 'แสดงให้ลูกค้าตรวจสอบชื่อบัญชีก่อนสแกนโอนเงิน' : 'Display account holder name for customers to verify'}
                    </p>
                  </div>

                  {/* Deposit Amount */}
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

                  {/* Step 1 Actions */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'ถัดไป (ตั้งค่าสาขา)' : 'Next (Branch Setup)'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ================= STEP 2: BRANCH & OPERATING HOURS ================= */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === 'th' ? '2. ข้อมูลสาขาแรก & เวลาทำการ' : '2. First Branch & Operating Hours'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'ตั้งค่าสาขาแรกและเวลาเปิด-ปิดร้านเพื่อเปิดรอบคิว' : 'Configure first branch location and daily operating hours'}
                    </p>
                  </div>

                  {/* Branch Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {lang === 'th' ? 'ชื่อสาขา' : 'Branch Name'} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="เช่น สาขาหลัก, สาขาสยามสแควร์"
                        value={formData.branch_name}
                        onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
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
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                      />
                    </div>
                  </div>

                  {/* Branch Operating Hours (Open / Close Time) */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{lang === 'th' ? 'เวลาเปิดร้าน' : 'Opening Time'}</span>
                      </label>
                      <TimePicker24h
                        value={formData.open_time}
                        onChange={(val) => setFormData({ ...formData, open_time: val })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{lang === 'th' ? 'เวลาปิดร้าน' : 'Closing Time'}</span>
                      </label>
                      <TimePicker24h
                        value={formData.close_time}
                        onChange={(val) => setFormData({ ...formData, close_time: val })}
                      />
                    </div>
                  </div>

                  {/* Branch PromptPay (Optional) - Matching รูปที่ 3 */}
                  <div className="p-3.5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl space-y-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <CreditCard className="w-4 h-4 text-indigo-500" />
                      <span>{lang === 'th' ? 'บัญชีพร้อมเพย์เฉพาะสาขานี้ (ไม่บังคับ)' : 'Branch PromptPay Account (Optional)'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'th' ? 'เลขพร้อมเพย์สาขา' : 'Branch PromptPay ID'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'th' ? 'เว้นว่างไว้หากใช้บัญชีหลักร้าน' : 'Leave empty to use main shop account'}
                          value={formData.branch_promptpay_id}
                          onChange={(e) => setFormData({ ...formData, branch_promptpay_id: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'th' ? 'ชื่อบัญชีพร้อมเพย์สาขา' : 'Branch PromptPay Name'}
                        </label>
                        <input
                          type="text"
                          placeholder={lang === 'th' ? 'เช่น ร้าน... สาขา 2' : 'e.g. Shop Branch 2'}
                          value={formData.branch_promptpay_name}
                          onChange={(e) => setFormData({ ...formData, branch_promptpay_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Branch Geo Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {lang === 'th' ? 'ที่ตั้งสาขา' : 'Branch Location'}
                    </label>
                    <ThaiAddressSelector
                      initialAddress={formData.branch_address}
                      onChange={(fullAddr) => setFormData({ ...formData, branch_address: fullAddr })}
                      lang={lang}
                    />
                  </div>

                  {/* Step 2 Actions */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      className="py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ย้อนกลับ' : 'Back'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleNextStep}
                      className="py-3 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer"
                    >
                      <span>{lang === 'th' ? 'ถัดไป (ช่าง & บริการ)' : 'Next (Staff & Service)'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* ================= STEP 3: STAFF & SERVICE SETUP ================= */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                  <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      {lang === 'th' ? '3. ตั้งค่าช่าง & บริการแรก' : '3. Staff Specialist & First Service'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'เพิ่มผู้ให้บริการและบริการแรกของคุณ (เพิ่มหรือแก้ไขเพิ่มเติมได้ใน Dashboard)' : 'Add your first service specialist and service catalog item'}
                    </p>
                  </div>

                  {/* Section A: Staff Specialist */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                        <User className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === 'th' ? 'ข้อมูลผู้ให้บริการ / ช่างคนแรก' : 'First Staff / Specialist'}
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'th' ? 'ชื่อช่าง / ผู้ให้บริการ' : 'Staff Name'}
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น ช่างเอก, หมอแอน"
                          value={formData.staff_name}
                          onChange={(e) => setFormData({ ...formData, staff_name: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'th' ? 'ตำแหน่ง / ความเชี่ยวชาญ' : 'Role / Specialist Title'}
                        </label>
                        <input
                          type="text"
                          placeholder="เช่น Senior Stylist, ช่างเล็บ"
                          value={formData.staff_role}
                          onChange={(e) => setFormData({ ...formData, staff_role: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Section B: Service Details */}
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                        <Scissors className="w-3.5 h-3.5" />
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {lang === 'th' ? 'ข้อมูลบริการแรก' : 'First Service'}
                      </h4>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        {lang === 'th' ? 'ชื่อบริการ' : 'Service Title'}
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ตัดผม + สระไดร์, ทำสีผม, ทำเล็บเจล"
                        value={formData.service_title}
                        onChange={(e) => setFormData({ ...formData, service_title: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'th' ? 'ระยะเวลา (นาที)' : 'Duration (mins)'}
                        </label>
                        <input
                          type="number"
                          step="15"
                          min="15"
                          placeholder="60"
                          value={formData.service_duration}
                          onChange={(e) => setFormData({ ...formData, service_duration: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          {lang === 'th' ? 'ราคาบริการ (บาท)' : 'Price (THB)'}
                        </label>
                        <input
                          type="number"
                          step="50"
                          min="0"
                          placeholder="300"
                          value={formData.service_price}
                          onChange={(e) => setFormData({ ...formData, service_price: e.target.value })}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Step 3 Actions */}
                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={handlePrevStep}
                      disabled={loading}
                      className="py-3 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-98 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ย้อนกลับ' : 'Back'}</span>
                    </button>

                    <button
                      type="submit"
                      disabled={loading}
                      className="py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-600/25 flex items-center justify-center gap-1.5 transition disabled:opacity-50 active:scale-98 cursor-pointer"
                    >
                      {loading ? (
                        <span>{t('creatingShop')}</span>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>{lang === 'th' ? 'เสร็จสิ้น (สร้างร้านค้า)' : 'Finish & Create'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

            </form>
          )}
        </AnimatePresence>

        {/* Powered by Q Flow Footer */}
        <div className="flex justify-center items-center text-center text-xs text-slate-400 dark:text-slate-500 pt-1">
          <span>Powered by <span className='font-bold'>Q Flow</span></span>
        </div>
      </div>
    </div>
  )
}

export default function CreateShopPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CreateShopContent />
    </Suspense>
  )
}
