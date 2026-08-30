'use client'

import { useEffect, useState, use, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Clock,
  Settings,
  Sparkles,
  Coffee,
  KeyRound,
  LogOut,
  CreditCard,
  Building2,
  MapPin,
  Phone,
  CalendarDays,
  Globe,
  Store,
  ArrowLeft,
  Plus,
  Trash2,
  Edit3,
  Sun,
  Moon,
  User,
  Share2,
  Camera,
  Upload,
  Copy,
  Check
} from 'lucide-react'
import { QFlowLogo } from '@/components/QFlowLogo'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  updateMerchantSettingsAction,
  uploadMerchantLogoAction,
  saveBranchAction,
  deleteBranchAction
} from '@/app/actions/dashboard'
import { createMerchantAction } from '@/app/actions/merchant'
import {
  checkMerchantAuthAction,
  verifyMerchantPinAction,
  verifyMerchantLiffAction,
  logoutMerchantAction
} from '@/app/actions/auth'
import { createStripeCustomerPortalAction } from '@/app/actions/stripe'
import { PRICING_PLANS } from '@/lib/stripe'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { CustomDropdown } from '@/components/CustomDropdown'
import { TimePicker24h } from '@/components/TimePicker24h'
import { ThaiAddressSelector } from '@/components/ThaiAddressSelector'
import { PricingSection } from '@/components/PricingSection'
import type { Booking, Merchant, Branch, Staff } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function SettingsPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t, lang, toggleLang } = useLanguage()
  const { theme, toggleTheme } = useTheme()

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [verifyingPin, setVerifyingPin] = useState(false)
  const [lineProfile, setLineProfile] = useState<{
    displayName: string
    pictureUrl?: string
    userId: string
  } | null>(null)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Core Data
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)

  // Active Sub-Tab synced with URL: 'shop' (ตั้งค่าร้าน) | 'billing' (แพ็กเกจ & บิลลิ่ง)
  const tabParam = searchParams.get('tab')
  const initialTab: 'shop' | 'billing' = tabParam === 'billing' ? 'billing' : 'shop'
  const [activeTab, setActiveTabState] = useState<'shop' | 'billing'>(initialTab)

  // Ensure default URL query ?tab=shop if no tab param is present or if URL changes
  useEffect(() => {
    if (!tabParam) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('tab', 'shop')
      router.replace(`/${slug}/settings?${params.toString()}`, { scroll: false })
      setActiveTabState('shop')
    } else if (tabParam === 'shop' || tabParam === 'billing') {
      setActiveTabState(tabParam)
    }
  }, [tabParam, router, slug, searchParams])

  function setActiveTab(tab: 'shop' | 'billing') {
    setActiveTabState(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.replace(`/${slug}/settings?${params.toString()}`, { scroll: false })
  }

  // Branch Edit/New Modal state
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null)
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false)

  // New Merchant/Shop Modal state
  const [isNewShopModalOpen, setIsNewShopModalOpen] = useState(false)
  const [creatingShop, setCreatingShop] = useState(false)
  const [newShopForm, setNewShopForm] = useState({
    name: '',
    promptpay_id: '',
    promptpay_name: '',
    default_deposit: '100',
    slug: '',
    branch_name: 'สาขาหลัก (Main Branch)',
    branch_address: '',
    branch_phone: '',
  })

  // Lock background scroll when any modal is open
  const isAnyModalOpen = Boolean(isBranchModalOpen || isNewShopModalOpen)
  useEffect(() => {
    if (isAnyModalOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isAnyModalOpen])

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
    logo_url: '',
    phone: '',
    promptpay_id: '',
    promptpay_name: '',
    default_deposit: '100',
    open_time: '10:00',
    close_time: '20:00',
    has_break: true,
    break_start_time: '12:00',
    break_end_time: '13:00',
    closed_days: [] as number[],
    branch_name: '',
    branch_address: '',
    branch_phone: '',
    slot_interval_min: '30',
    line_notify_token: '',
  })
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !merchant) return

    setUploadingLogo(true)
    const formData = new FormData()
    formData.append('merchantId', merchant.id)
    formData.append('merchantSlug', slug)
    formData.append('logo', file)

    const res = await uploadMerchantLogoAction(formData)
    setUploadingLogo(false)

    if (res.success && res.url) {
      toast.success(lang === 'th' ? 'อัปเดตรูปโปรไฟล์ร้านเรียบร้อยแล้ว!' : 'Shop profile photo updated!')
      setSettingsForm((prev) => ({ ...prev, logo_url: res.url || '' }))
      setMerchant((prev) => prev ? { ...prev, logo_url: res.url } : null)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการอัปโหลดรูป')
    }

    if (logoInputRef.current) {
      logoInputRef.current.value = ''
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  // Check Authentication & Load initial data
  useEffect(() => {
    async function initAuthAndData() {
      try {
        const cachedProfile = localStorage.getItem('q flow_admin_line_profile')
        if (cachedProfile) {
          setLineProfile(JSON.parse(cachedProfile))
        }
      } catch { }

      const authStatus = await checkMerchantAuthAction(slug)
      if (authStatus.isAuthenticated) {
        setIsAuthenticated(true)
        await loadSettingsData()
        return
      }

      try {
        const { initLiff } = await import('@/lib/liff')
        const liffRes = await initLiff()
        if (liffRes.success && liffRes.profile?.userId) {
          const profileData = {
            displayName: liffRes.profile.displayName,
            pictureUrl: liffRes.profile.pictureUrl,
            userId: liffRes.profile.userId,
          }
          setLineProfile(profileData)
          localStorage.setItem('q flow_admin_line_profile', JSON.stringify(profileData))

          const liffAuth = await verifyMerchantLiffAction(slug, liffRes.profile.userId)
          if (liffAuth.success) {
            setIsAuthenticated(true)
            await loadSettingsData()
            return
          }
        }
      } catch { }

      setIsAuthenticated(false)
      setLoading(false)
    }

    initAuthAndData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function loadSettingsData() {
    setLoading(true)
    const supabase = createClient()

    const { data: mData } = await supabase
      .from('shops')
      .select('*')
      .eq('slug', slug)
      .single()

    if (!mData) {
      setLoading(false)
      return
    }

    setMerchant(mData)
    setSettingsForm({
      name: mData.name || '',
      logo_url: mData.logo_url || '',
      phone: mData.phone || '',
      promptpay_id: mData.promptpay_id || '',
      promptpay_name: mData.promptpay_name || '',
      default_deposit: String(mData.default_deposit || 100),
      open_time: mData.open_time?.slice(0, 5) || '10:00',
      close_time: mData.close_time?.slice(0, 5) || '20:00',
      has_break: mData.has_break ?? true,
      break_start_time: mData.break_start_time?.slice(0, 5) || '12:00',
      break_end_time: mData.break_end_time?.slice(0, 5) || '13:00',
      closed_days: mData.closed_days || [],
      branch_name: mData.branch_name || 'สาขาหลัก (Main Branch)',
      branch_address: mData.branch_address || '',
      branch_phone: mData.branch_phone || '',
      slot_interval_min: String(mData.slot_interval_min || 30),
      line_notify_token: mData.line_notify_token || '',
    })

    const [branchRes, staffRes, bookingRes] = await Promise.all([
      supabase.from('branches').select('*').eq('shop_id', mData.id).order('created_at', { ascending: true }),
      supabase.from('staff').select('*, branch:branches(*), staff_services(*, service:services(*))').eq('shop_id', mData.id).order('created_at', { ascending: true }),
      supabase.from('bookings').select('*, services(*), branch:branches(*), staff:staff(*)').eq('shop_id', mData.id).order('start_time', { ascending: true }),
    ])

    setBranches(branchRes.data || [])
    setStaffList((staffRes.data as unknown as Staff[]) || [])
    setBookings(bookingRes.data || [])
    setLoading(false)
  }

  // Handle PIN Login
  async function handleVerifyPin(e: React.FormEvent) {
    e.preventDefault()
    setVerifyingPin(true)
    setPinError(null)

    const res = await verifyMerchantPinAction(slug, pinInput)
    setVerifyingPin(false)

    if (!res.success) {
      setPinError(res.error || 'รหัส PIN ไม่ถูกต้อง')
      return
    }

    setIsAuthenticated(true)
    await loadSettingsData()
  }

  // Handle LINE Login on Desktop / Web
  const [loggingInWithLine, setLoggingInWithLine] = useState(false)
  async function handleLineLogin() {
    try {
      setLoggingInWithLine(true)
      const { loginWithLine } = await import('@/lib/liff')
      await loginWithLine()
    } catch (err: unknown) {
      setLoggingInWithLine(false)
      const msg = err instanceof Error ? err.message : String(err)
      toast.error('ไม่สามารถเปิดหน้า LINE Login ได้: ' + msg)
    }
  }

  // Handle Logout
  async function handleLogout() {
    await logoutMerchantAction(slug)
    localStorage.removeItem('q flow_admin_line_profile')
    setIsAuthenticated(false)
  }

  // Handle Save Settings
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant) return

    const res = await updateMerchantSettingsAction({
      merchantId: merchant.id,
      merchantSlug: slug,
      name: settingsForm.name,
      logo_url: settingsForm.logo_url || null,
      phone: settingsForm.phone,
      promptpay_id: settingsForm.promptpay_id,
      promptpay_name: settingsForm.promptpay_name,
      default_deposit: Number(settingsForm.default_deposit),
      open_time: `${settingsForm.open_time}:00`,
      close_time: `${settingsForm.close_time}:00`,
      has_break: settingsForm.has_break,
      break_start_time: settingsForm.has_break ? `${settingsForm.break_start_time}:00` : null,
      break_end_time: settingsForm.has_break ? `${settingsForm.break_end_time}:00` : null,
      closed_days: settingsForm.closed_days,
      branch_name: settingsForm.branch_name,
      branch_address: settingsForm.branch_address,
      branch_phone: settingsForm.branch_phone,
      slot_interval_min: Number(settingsForm.slot_interval_min),
      line_notify_token: settingsForm.line_notify_token,
    })

    if (res.success) {
      toast.success(t('settingsSaved'))
      loadSettingsData()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการบันทึก')
    }
  }

  // Handle Save Branch
  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant || !editingBranch) return
    if (!editingBranch.name?.trim()) {
      toast.error('กรุณากรอกชื่อสาขา')
      return
    }

    const res = await saveBranchAction({
      id: editingBranch.id,
      merchantId: merchant.id,
      merchantSlug: slug,
      name: editingBranch.name,
      address: editingBranch.address || undefined,
      phone: editingBranch.phone || undefined,
      promptpay_id: editingBranch.promptpay_id || undefined,
      promptpay_name: editingBranch.promptpay_name || undefined,
      open_time: editingBranch.open_time || '10:00',
      close_time: editingBranch.close_time || '20:00',
      has_break: editingBranch.has_break ?? true,
      break_start_time: editingBranch.break_start_time || '12:00',
      break_end_time: editingBranch.break_end_time || '13:00',
      closed_days: editingBranch.closed_days || [],
      is_active: editingBranch.is_active ?? true,
    })

    if (res.success) {
      toast.success(t('settingsSaved'))
      setIsBranchModalOpen(false)
      setEditingBranch(null)
      loadSettingsData()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  // Handle Delete Branch
  async function handleDeleteBranch(branchId: string) {
    if (confirm('ต้องการลบสาขานี้หรือไม่?')) {
      const res = await deleteBranchAction(branchId, slug)
      if (res.success) {
        toast.success(t('delete'))
        loadSettingsData()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาด')
      }
    }
  }

  // Check Plan limit and open New Shop modal
  function handleOpenNewShop() {
    if (!merchant) return
    const plan = merchant.plan || 'professional'
    const maxMerchants = plan === 'enterprise' ? Infinity : plan === 'business' ? 2 : 1

    if (maxMerchants <= 1) {
      toast.error(
        lang === 'th'
          ? `แพ็กเกจปัจจุบัน (${PRICING_PLANS[plan]?.name || 'Professional'}) รองรับ 1 ร้านค้าเท่านั้น กรุณาอัปเกรดเป็น Business (2 ร้าน) หรือ Enterprise เพื่อเพิ่มร้านค้า`
          : `Your current plan allows 1 merchant only. Please upgrade to Business or Enterprise to add more shops.`,
        {
          action: {
            label: lang === 'th' ? 'ดูแพ็กเกจ' : 'Upgrade',
            onClick: () => setActiveTab('billing'),
          },
          duration: 6000,
        }
      )
      return
    }

    setNewShopForm({
      name: '',
      promptpay_id: merchant.promptpay_id || '',
      promptpay_name: merchant.promptpay_name || '',
      default_deposit: String(merchant.default_deposit || 100),
      slug: '',
      branch_name: 'สาขาหลัก (Main Branch)',
      branch_address: '',
      branch_phone: '',
    })
    setIsNewShopModalOpen(true)
  }

  // Handle Create New Shop
  async function handleCreateNewShop(e: React.FormEvent) {
    e.preventDefault()
    if (!newShopForm.name.trim()) {
      toast.error(lang === 'th' ? 'กรุณากรอกชื่อร้านค้า' : 'Please enter shop name')
      return
    }
    if (!newShopForm.promptpay_id.trim()) {
      toast.error(lang === 'th' ? 'กรุณากรอกเลขพร้อมเพย์' : 'Please enter PromptPay number')
      return
    }

    setCreatingShop(true)
    const res = await createMerchantAction({
      name: newShopForm.name,
      promptpay_id: newShopForm.promptpay_id,
      promptpay_name: newShopForm.promptpay_name || undefined,
      default_deposit: Number(newShopForm.default_deposit) || 100,
      admin_pin: merchant?.admin_pin || '1234',
      line_user_id: merchant?.line_user_id || undefined,
      customSlug: newShopForm.slug || undefined,
      branch_name: newShopForm.branch_name || undefined,
      branch_address: newShopForm.branch_address || undefined,
      branch_phone: newShopForm.branch_phone || undefined,
      plan: merchant?.plan || 'business',
    })
    setCreatingShop(false)

    if (res.success && res.merchant) {
      toast.success(lang === 'th' ? `สร้างร้าน ${res.merchant.name} สำเร็จแล้ว!` : `Shop ${res.merchant.name} created!`)
      setIsNewShopModalOpen(false)
      router.push(`/${res.merchant.slug}/settings`)
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการสร้างร้านค้า')
    }
  }

  if (loading || isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-white">เข้าสู่ระบบหลังร้าน</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">กรุณากรอกรหัส PIN 4 หลัก เพื่อจัดการร้านค้า</p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <input
                type="password"
                maxLength={6}
                autoFocus
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white"
              />
              {pinError && <p className="text-xs text-rose-500 text-center mt-2 font-medium">{pinError}</p>}
            </div>

            <button
              type="submit"
              disabled={pinInput.length < 4 || verifyingPin}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition active:scale-98 shadow-2xs cursor-pointer"
            >
              {verifyingPin ? 'กำลังตรวจสอบ...' : (lang === 'th' ? 'เข้าสู่ระบบด้วยรหัส PIN' : 'Sign in with PIN')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
            <span className="bg-white dark:bg-slate-900 px-3 text-[11px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {lang === 'th' ? 'หรือ' : 'OR'}
            </span>
            <div className="border-t border-slate-200 dark:border-slate-800 w-full" />
          </div>

          {/* LINE Login Button */}
          <button
            type="button"
            onClick={handleLineLogin}
            disabled={loggingInWithLine}
            className="w-full py-3 bg-[#06C755] hover:bg-[#05b34c] active:bg-[#049f43] text-white font-bold rounded-2xl transition shadow-md shadow-[#06C755]/20 active:scale-98 cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2.5 disabled:opacity-50"
          >
            {loggingInWithLine ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>กำลังเชื่อมต่อ LINE...</span>
              </span>
            ) : (
              <>
                <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                  <path d="M24 10.304c0-5.369-5.383-9.738-12-9.738-6.616 0-12 4.369-12 9.738 0 4.814 4.269 8.846 10.035 9.608.391.082.922.258 1.057.592.122.303.079.778.039 1.085l-.171 1.027c-.053.303-.242 1.186 1.039.647 1.281-.54 6.911-4.069 9.428-6.967 1.739-1.907 2.573-3.844 2.573-5.292z" />
                </svg>
                <span>{lang === 'th' ? 'เข้าสู่ระบบด้วย LINE' : 'Log in with LINE'}</span>
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              {lang === 'th'
                ? 'เข้าสู่ระบบสะดวกด้วยการสแกน QR Code ผ่านแอป LINE บนมือถือ'
                : 'Scan QR code with your LINE app to log in instantly'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!merchant) return null

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 sm:pb-6 transition-colors font-sans antialiased">
      {/* Top Navbar - Matching Dashboard exactly */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchant.name}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0"
              />
            ) : (
              <Link href="/" aria-label="กลับสู่หน้าแรก Q Flow" className="inline-flex items-center gap-2 group shrink-0">
                <QFlowLogo className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:scale-105" />
              </Link>
            )}
            <div className="min-w-0 flex flex-col justify-center">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight truncate max-w-[130px] sm:max-w-xs">{merchant.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Back to Dashboard Button */}
            <Link
              href={`/${slug}/dashboard`}
              className="h-9 w-9 xs:w-auto xs:px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 shrink-0"
              title="กลับหน้าแดชบอร์ด"
            >
              <ArrowLeft className="w-4 h-4 xs:w-3.5 xs:h-3.5 shrink-0" />
              <span className="hidden xs:inline">{lang === 'th' ? 'แดชบอร์ด' : 'Dashboard'}</span>
            </Link>

            {/* Copy Customer Booking Link Button (1:1 Aspect Ratio - Matches Dropdown height) */}
            <button
              type="button"
              onClick={() => {
                const bookUrl = `${window.location.origin}/${slug}/book`
                navigator.clipboard.writeText(bookUrl)
                setCopiedLink(true)
                toast.success(lang === 'th' ? 'คัดลอกลิงก์จองคิวเรียบร้อยแล้ว!' : 'Booking link copied to clipboard!')
                setTimeout(() => setCopiedLink(false), 2000)
              }}
              aria-label={lang === 'th' ? 'คัดลอกลิงก์จองคิว' : 'Copy Booking Link'}
              title={copiedLink ? (lang === 'th' ? 'คัดลอกแล้ว!' : 'Copied!') : (lang === 'th' ? 'คัดลอกลิงก์จองคิว' : 'Copy Booking Link')}
              className={`w-9 h-9 rounded-xl border transition active:scale-95 shadow-2xs aspect-square shrink-0 flex items-center justify-center cursor-pointer ${
                copiedLink
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800'
                  : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-slate-300 dark:border-slate-800'
              }`}
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>

            {/* Profile Dropdown Menu (1:1 Aspect Ratio - Matches Dropdown height) */}
            <div className="relative shrink-0" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-800 transition active:scale-95 focus:outline-none flex items-center justify-center aspect-square shadow-2xs cursor-pointer"
                aria-label="User Profile Menu"
              >
                {lineProfile?.pictureUrl ? (
                  <img
                    src={lineProfile.pictureUrl}
                    alt={lineProfile.displayName || 'LINE Profile'}
                    className="w-6 h-6 rounded-lg object-cover border border-emerald-500/60 shadow-xs"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-linear-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                    {lineProfile?.displayName ? lineProfile.displayName.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                  </div>
                )}
              </button>

              <AnimatePresence>
                {userMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 overflow-hidden"
                  >
                    {/* User Info Header */}
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 mb-1.5">
                      <div className="flex items-center gap-2.5">
                        {lineProfile?.pictureUrl ? (
                          <img
                            src={lineProfile.pictureUrl}
                            alt={lineProfile.displayName || 'LINE Profile'}
                            className="w-9 h-9 rounded-xl object-cover border border-emerald-500/60 shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                            {lineProfile?.displayName ? lineProfile.displayName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {lineProfile?.displayName || merchant?.name || 'LINE Admin'}
                          </p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                              {lineProfile ? 'LINE Connected' : merchant?.line_user_id ? 'LINE Linked' : 'Admin Signed In'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Actions */}
                    <div className="pt-1 space-y-1">
                      {/* Share Booking Link in Menu */}
                      <button
                        type="button"
                        onClick={() => {
                          const bookUrl = `${window.location.origin}/${slug}/book`
                          if (navigator.share) {
                            navigator.share({
                              title: `จองคิวออนไลน์ - ${merchant.name}`,
                              text: `จองคิวทำนัดหมายร้าน ${merchant.name} ผ่านระบบ Q Flow`,
                              url: bookUrl,
                            }).catch(() => { })
                          } else {
                            navigator.clipboard.writeText(bookUrl)
                            setCopiedLink(true)
                            toast.success(lang === 'th' ? 'คัดลอกลิงก์จองคิวเรียบร้อยแล้ว!' : 'Booking link copied to clipboard!')
                            setTimeout(() => setCopiedLink(false), 2500)
                          }
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          <span>{lang === 'th' ? 'แชร์ลิงก์จองคิว' : 'Share Booking Link'}</span>
                        </div>
                        {copiedLink ? (
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">คัดลอกแล้ว!</span>
                        ) : null}
                      </button>

                      {/* Language Switcher */}
                      <button
                        type="button"
                        onClick={toggleLang}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <span>{lang === 'th' ? 'ภาษา (Language)' : 'Language'}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80">
                          {lang === 'th' ? 'TH' : 'EN'}
                        </span>
                      </button>

                      {/* Theme Switcher */}
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          {theme === 'dark' ? (
                            <Moon className="w-4 h-4 text-indigo-400" />
                          ) : (
                            <Sun className="w-4 h-4 text-amber-500" />
                          )}
                          <span>{lang === 'th' ? 'ธีมการแสดงผล' : 'Theme'}</span>
                        </div>
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {theme === 'dark' ? (lang === 'th' ? 'โหมดมืด' : 'Dark') : (lang === 'th' ? 'โหมดสว่าง' : 'Light')}
                        </span>
                      </button>

                      <div className="border-t border-slate-100 dark:border-slate-800/80 my-1 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false)
                            handleLogout()
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition cursor-pointer"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>ออกจากระบบ</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Tab Navigation - Desktop Segmented Pill (Hidden on Mobile) */}
        <div className="hidden sm:flex gap-2 overflow-x-auto scrollbar-none no-scrollbar flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('shop')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${activeTab === 'shop'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ตั้งค่าร้านค้า & สาขา' : 'Shop & Branch Settings'}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('billing')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${activeTab === 'billing'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'แพ็กเกจ & บิลลิ่ง' : 'Plans & Billing'}</span>
          </button>
        </div>

        {/* TAB 1: SHOP & BRANCH SETTINGS */}
        {activeTab === 'shop' && (
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 space-y-6 w-full shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('shopSettingsTitle')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {lang === 'th' ? 'กำหนดข้อมูลทั่วไป เวลาเปิด-ปิด และการรับเงินมัดจำ' : 'General info, operating hours, and PromptPay deposit settings'}
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenNewShop}
                className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/80 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'เพิ่มร้านค้าใหม่' : '+ Add New Shop'}</span>
              </button>
            </div>

            {/* SHOP LOGO / PROFILE SECTION */}
            <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative group shrink-0">
                  {settingsForm.logo_url || merchant?.logo_url ? (
                    <img
                      src={settingsForm.logo_url || merchant?.logo_url || ''}
                      alt={settingsForm.name}
                      className="w-16 h-16 aspect-square rounded-2xl object-cover border-2 border-indigo-500/40 shadow-sm shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 aspect-square rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800/80 shadow-2xs shrink-0">
                      <Store className="w-8 h-8" />
                    </div>
                  )}
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center text-white">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{t('shopLogoLabel')}</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 max-w-sm">
                    {lang === 'th'
                      ? 'รูปโปรไฟล์ร้านจะแสดงในหน้าจองคิวลูกค้า, หน้าตั๋วคิว และหน้าแดชบอร์ด (รองรับ JPG, PNG สูงสุด 5MB)'
                      : 'Shop profile picture will appear on customer booking, ticket, and dashboard pages (JPG, PNG up to 5MB)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={uploadingLogo}
                  onClick={() => logoInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition active:scale-95 shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{uploadingLogo ? t('uploadingLogo') : t('uploadLogoBtn')}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('shopName')}</label>
                <input
                  type="text"
                  required
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('shopPhone')}</label>
                <input
                  type="text"
                  value={settingsForm.phone}
                  onChange={(e) => setSettingsForm({ ...settingsForm, phone: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('promptpayNumber')}</label>
                <input
                  type="text"
                  required
                  value={settingsForm.promptpay_id}
                  onChange={(e) => setSettingsForm({ ...settingsForm, promptpay_id: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('promptpayAccountName')}</label>
                <input
                  type="text"
                  value={settingsForm.promptpay_name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, promptpay_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              {/* BRANCHES MANAGEMENT SECTION */}
              <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span>{lang === 'th' ? 'จัดการและแก้ไขสาขาของร้าน' : 'Branch Management & Details'}</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">({branches.length})</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {lang === 'th' ? 'เพิ่ม แก้ไขข้อมูลที่ตั้ง เบอร์โทร และเวลาเปิด-ปิดของแต่ละสาขา' : 'Manage addresses, contact, and hours for each branch'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBranch({
                        open_time: merchant.open_time || '10:00',
                        close_time: merchant.close_time || '20:00',
                        has_break: merchant.has_break ?? true,
                        break_start_time: merchant.break_start_time || '12:00',
                        break_end_time: merchant.break_end_time || '13:00',
                        closed_days: merchant.closed_days || [],
                        is_active: true,
                      })
                      setIsBranchModalOpen(true)
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addNewBranchBtn')}</span>
                  </button>
                </div>

                {branches.length === 0 ? (
                  <div className="p-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1">
                    <Building2 className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{t('noBranchesYet')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {branches.map((b) => {
                      const branchStaffCount = staffList.filter((s) => s.branch_id === b.id).length
                      return (
                        <div
                          key={b.id}
                          className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-2.5"
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs">
                                  <Building2 className="w-3.5 h-3.5" />
                                </div>
                                <h5 className="font-bold text-slate-900 dark:text-white text-xs">{b.name}</h5>
                              </div>
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                                {branchStaffCount} ช่าง
                              </span>
                            </div>

                            {b.address && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-2 flex items-start gap-1">
                                <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
                                <span className="line-clamp-2">{b.address}</span>
                              </p>
                            )}

                            {b.phone && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 text-slate-400" />
                                <span>{b.phone}</span>
                              </p>
                            )}

                            <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                              <Clock className="w-3 h-3 text-amber-500" />
                              <span>{b.open_time?.slice(0, 5) || '10:00'} - {b.close_time?.slice(0, 5) || '20:00'} น.</span>
                            </div>
                          </div>

                          <div className="flex justify-end gap-1.5 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBranch(b)
                                setIsBranchModalOpen(true)
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{t('edit')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteBranch(b.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={t('delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* WEEKLY CLOSED DAYS SECTION */}
              <div className="sm:col-span-2 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-rose-500" />
                    {t('closedDaysTitle')}
                  </label>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('closedDaysDesc')}
                  </p>
                </div>

                <div className="grid grid-cols-7 gap-1.5 pt-1">
                  {[
                    { day: 0, label: 'อา', full: 'อาทิตย์', en: 'Sun' },
                    { day: 1, label: 'จ', full: 'จันทร์', en: 'Mon' },
                    { day: 2, label: 'อ', full: 'อังคาร', en: 'Tue' },
                    { day: 3, label: 'พ', full: 'พุธ', en: 'Wed' },
                    { day: 4, label: 'พฤ', full: 'พฤหัสฯ', en: 'Thu' },
                    { day: 5, label: 'ศ', full: 'ศุกร์', en: 'Fri' },
                    { day: 6, label: 'ส', full: 'เสาร์', en: 'Sat' },
                  ].map((item) => {
                    const isClosed = settingsForm.closed_days.includes(item.day)
                    return (
                      <button
                        key={item.day}
                        type="button"
                        onClick={() => {
                          const nextClosedDays = isClosed
                            ? settingsForm.closed_days.filter((d) => d !== item.day)
                            : [...settingsForm.closed_days, item.day]
                          setSettingsForm({ ...settingsForm, closed_days: nextClosedDays })
                        }}
                        className={`py-2.5 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition border active:scale-95 ${isClosed
                          ? 'bg-rose-500 text-white border-rose-600 shadow-xs font-bold'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                      >
                        <span>{lang === 'th' ? item.label : item.en}</span>
                        <span className={`text-[9px] mt-0.5 font-normal ${isClosed ? 'text-rose-100 font-bold' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {isClosed ? (lang === 'th' ? 'ปิด' : 'Off') : (lang === 'th' ? 'เปิด' : 'Open')}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* LUNCH BREAK SECTION */}
              <div className="sm:col-span-2 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="has_break"
                    checked={settingsForm.has_break}
                    onChange={(e) => setSettingsForm({ ...settingsForm, has_break: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="has_break" className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5 cursor-pointer">
                    <Coffee className="w-4 h-4" />
                    {t('enableDailyBreak')}
                  </label>
                </div>

                {settingsForm.has_break && (
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">{t('breakStartTime')}</label>
                      <TimePicker24h
                        value={settingsForm.break_start_time || '12:00'}
                        onChange={(val) => setSettingsForm({ ...settingsForm, break_start_time: val })}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">{t('breakEndTime')}</label>
                      <TimePicker24h
                        value={settingsForm.break_end_time || '13:00'}
                        onChange={(val) => setSettingsForm({ ...settingsForm, break_end_time: val })}
                      />
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  ระบบจะไม่เปิดให้ลูกค้าจองรอบคิวที่ตรงกับช่วงเวลาพักนี้โดยอัตโนมัติ
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('defaultDepositAmount')}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={settingsForm.default_deposit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_deposit: e.target.value.replace(/\D/g, '') })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('slotInterval')}</label>
                <CustomDropdown
                  value={settingsForm.slot_interval_min}
                  onChange={(val) => setSettingsForm({ ...settingsForm, slot_interval_min: val })}
                  prefixIcon={<Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                  dropdownWidth="w-full sm:w-60"
                  className="w-full"
                  options={[
                    {
                      value: '15',
                      label: t('every15Min'),
                      sublabel: 'รอบคิวทุกๆ 15 นาที',
                      icon: <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                    },
                    {
                      value: '30',
                      label: t('every30Min'),
                      sublabel: 'รอบคิวทุกๆ 30 นาที (แนะนำ)',
                      icon: <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                    },
                    {
                      value: '60',
                      label: t('every60Min'),
                      sublabel: 'รอบคิวทุกๆ 1 ชั่วโมง',
                      icon: <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                    },
                  ]}
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-98 cursor-pointer"
            >
              {t('saveSettingsBtn')}
            </button>
            {/* Powered by Q Flow Footer */}
            <div className="flex justify-center items-center">
              <div className="text-[11px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 font-medium transition">
                Powered by Q Flow
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: BILLING & SUBSCRIPTION */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Active Plan & Slip Quota Status Card */}
            {(() => {
              const hasActiveSub = Boolean(merchant.plan && merchant.subscription_status === 'active')
              const planKey = merchant.plan || 'none'
              const activePlanInfo = PRICING_PLANS[planKey]
              const planDisplayName = hasActiveSub && activePlanInfo ? activePlanInfo.name : (lang === 'th' ? 'ยังไม่ได้สมัครแพ็กเกจ' : 'No Active Subscription')
              const planMonthlyQuota = hasActiveSub ? (merchant.monthly_slip_quota || activePlanInfo?.quota || 0) : 0

              const currentMonthStr = format(new Date(), 'yyyy-MM')
              const actualUsedSlips = bookings.filter((b) => {
                if (b.status !== 'confirmed') return false
                if (!b.slip_url && !b.slip_trans_ref) return false
                const bookingMonth = (b.slip_verified_at || b.created_at || '').slice(0, 7)
                return bookingMonth === currentMonthStr
              }).length

              const remainingSlips = Math.max(0, planMonthlyQuota - actualUsedSlips)
              const usagePercent = planMonthlyQuota > 0
                ? Math.min(100, Math.max(actualUsedSlips > 0 ? 4 : 0, (actualUsedSlips / planMonthlyQuota) * 100))
                : 0

              return (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                        {lang === 'th' ? 'สถานะแพ็กเกจปัจจุบัน' : 'Subscription Status'}
                      </span>
                      <div className="flex items-center gap-2.5">
                        <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                          {planDisplayName}
                        </h3>
                        {hasActiveSub ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-[11px] font-bold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            {lang === 'th' ? 'กำลังใช้งาน' : 'Active'}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80 text-[11px] font-bold">
                            {lang === 'th' ? 'ยังไม่ได้สมัครบริการ' : 'Inactive / Unsubscribed'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          const res = await createStripeCustomerPortalAction(slug)
                          if (res.url) {
                            window.location.assign(res.url)
                          } else {
                            toast.info(res.error || 'ระบบจะสร้างหน้าประวัติการชำระเงินเมื่อมีการชำระเงินผ่าน Stripe สำเร็จ')
                          }
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/80 dark:hover:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200 dark:border-indigo-800/80 flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                      >
                        <CreditCard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>{lang === 'th' ? 'ดูประวัติการจ่ายเงิน / ใบเสร็จ Stripe' : 'Stripe Billing & Invoices'}</span>
                      </button>
                    </div>
                  </div>

                  {hasActiveSub ? (
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          {lang === 'th' ? 'โควตาตรวจสลิป SlipOK เดือนนี้' : 'Monthly SlipOK Verification Quota'}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {actualUsedSlips.toLocaleString()} / {planMonthlyQuota.toLocaleString()} สลิป
                        </span>
                      </div>

                      <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span>
                          {lang === 'th'
                            ? `เหลือโควตาอีก ${remainingSlips.toLocaleString()} สลิป`
                            : `${remainingSlips.toLocaleString()} slips remaining`}
                        </span>
                        <span>{lang === 'th' ? 'รีเซ็ตโควตาทุก 30 วัน' : 'Resets monthly'}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-900 dark:text-amber-200">
                            {lang === 'th' ? 'ร้านของคุณยังไม่ได้สมัครแพ็กเกจ' : 'Your store has no active subscription'}
                          </h4>
                          <p className="text-amber-700 dark:text-amber-300/80 mt-0.5 text-[11px]">
                            {lang === 'th'
                              ? 'เลือกและสมัครแพ็กเกจด้านล่างเพื่อปลดล็อกโควตาตรวจสลิป SlipOK, ระบบจอง 24 ชม., และการแจ้งเตือน LINE'
                              : 'Select and subscribe to a plan below to activate auto-slip verification, 24/7 calendar, and LINE alerts.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            <div className="pt-2">
              <PricingSection
                merchantSlug={slug}
                currentPlan={merchant.subscription_status === 'active' ? merchant.plan : undefined}
                onPlanSelected={loadSettingsData}
              />
            </div>
          </div>
        )}
      </main>

      {/* Branch Add/Edit Modal */}
      {/* Branch Add/Edit Modal */}
      <AnimatePresence>
        {isBranchModalOpen && editingBranch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsBranchModalOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveBranch}
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {editingBranch.id ? t('editBranchTitle') : t('addNewBranchBtn')}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'กำหนดข้อมูล ที่อยู่ และเวลาทำการของสาขา' : 'Branch details, address & operating hours'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95 text-xs font-bold cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {/* Branch Name & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('branchName')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สาขาสยามสแควร์, สาขา 2"
                      value={editingBranch.name || ''}
                      onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('branchPhone')}
                    </label>
                    <input
                      type="text"
                      placeholder="เช่น 02-123-4567, 081-234-5678"
                      value={editingBranch.phone || ''}
                      onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* PromptPay Info for Branch (Optional) */}
                <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                      {lang === 'th' ? 'บัญชีพร้อมเพย์เฉพาะสาขานี้ (ไม่บังคับ)' : 'Branch PromptPay (Optional)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        {lang === 'th' ? 'เลขพร้อมเพย์สาขา' : 'Branch PromptPay ID'}
                      </label>
                      <input
                        type="text"
                        placeholder="เว้นว่างไว้หากใช้บัญชีหลักร้าน"
                        value={editingBranch.promptpay_id || ''}
                        onChange={(e) => setEditingBranch({ ...editingBranch, promptpay_id: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                        {lang === 'th' ? 'ชื่อบัญชีพร้อมเพย์สาขา' : 'Branch Account Name'}
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น ร้าน... สาขา 2"
                        value={editingBranch.promptpay_name || ''}
                        onChange={(e) => setEditingBranch({ ...editingBranch, promptpay_name: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Branch Location & Address Selector */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
                    {t('branchAddress')}
                  </label>
                  <ThaiAddressSelector
                    initialAddress={editingBranch.address || ''}
                    onChange={(fullAddr) => setEditingBranch({ ...editingBranch, address: fullAddr })}
                    lang={lang}
                  />
                </div>

                {/* Operating Hours */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('openTime')}
                    </label>
                    <TimePicker24h
                      value={editingBranch.open_time || '10:00'}
                      onChange={(val) => setEditingBranch({ ...editingBranch, open_time: val })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('closeTime')}
                    </label>
                    <TimePicker24h
                      value={editingBranch.close_time || '20:00'}
                      onChange={(val) => setEditingBranch({ ...editingBranch, close_time: val })}
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 safe-area-bottom">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold active:scale-95 cursor-pointer shadow-2xs transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 shadow-2xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('save')}</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Merchant/Shop Modal */}
      <AnimatePresence>
        {isNewShopModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsNewShopModalOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleCreateNewShop}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                    <Store className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {lang === 'th' ? 'สร้างร้านค้าใหม่' : 'Create New Shop'}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'เพิ่มร้านค้าใหม่ภายใต้บัญชีนี้' : 'Add a new merchant under your account'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsNewShopModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95 text-xs font-bold cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {lang === 'th' ? 'ชื่อร้านค้าใหม่' : 'New Shop Name'} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น Barbershop & Spa"
                    value={newShopForm.name}
                    onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('promptpayNumber')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0812345678"
                      value={newShopForm.promptpay_id}
                      onChange={(e) => setNewShopForm({ ...newShopForm, promptpay_id: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('promptpayAccountName')}
                    </label>
                    <input
                      type="text"
                      placeholder="นาย..."
                      value={newShopForm.promptpay_name}
                      onChange={(e) => setNewShopForm({ ...newShopForm, promptpay_name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {lang === 'th' ? 'ลิงก์ร้าน (URL Slug - ถ้าไม่ใส่จะสุ่มให้อัตโนมัติ)' : 'Custom URL Slug (Optional)'}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น my-awesome-shop"
                    value={newShopForm.slug}
                    onChange={(e) => setNewShopForm({ ...newShopForm, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 safe-area-bottom">
                <button
                  type="button"
                  onClick={() => setIsNewShopModalOpen(false)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold active:scale-95 cursor-pointer shadow-2xs transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={creatingShop}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold active:scale-95 shadow-2xs disabled:opacity-50 cursor-pointer transition flex items-center gap-1.5"
                >
                  {creatingShop ? (
                    <span>{lang === 'th' ? 'กำลังสร้างร้าน...' : 'Creating...'}</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'ยืนยันสร้างร้าน' : 'Create Shop'}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-lg safe-area-bottom">
        <div className="grid grid-cols-2 gap-1 items-center justify-around">
          {/* Tab 1: ตั้งค่าร้านค้า & สาขา */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('shop')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${activeTab === 'shop'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            <div className="relative">
              <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{lang === 'th' ? 'ตั้งค่าร้านค้า & สาขา' : 'Shop & Branches'}</span>
            {activeTab === 'shop' && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
            )}
          </button>

          {/* Tab 2: แพ็กเกจ & บิลลิ่ง */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('billing')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${activeTab === 'billing'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            <div className="relative">
              <CreditCard className="w-5 h-5" />
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">{lang === 'th' ? 'แพ็กเกจ & บิลลิ่ง' : 'Plans & Billing'}</span>
            {activeTab === 'billing' && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
            )}
          </button>
        </div>
      </nav>
    </div>
  )
}
