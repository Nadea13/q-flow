'use client'

import { useEffect, useState, use, useMemo } from 'react'
import Link from 'next/link'
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ExternalLink, 
  Lock, 
  Bell, 
  Settings, 
  Image as ImageIcon,
  Sparkles,
  Coffee,
  X,
  KeyRound,
  LogOut,
  ShieldCheck,
  ArrowRight,
  MessageSquare,
  CreditCard,
  Zap,
  Building2,
  MapPin,
  Phone,
  CalendarDays,
  PhoneCall,
  UserPlus
} from 'lucide-react'
import { format, startOfToday, addDays } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { 
  updateBookingStatusAction, 
  createBlockedSlotAction, 
  deleteBlockedSlotAction,
  saveServiceAction,
  deleteServiceAction,
  updateMerchantSettingsAction,
  updateMerchantBranchAction,
  createManualBookingAction
} from '@/app/actions/dashboard'
import { 
  checkMerchantAuthAction, 
  verifyMerchantPinAction, 
  verifyMerchantLiffAction, 
  logoutMerchantAction 
} from '@/app/actions/auth'
import { createStripeCustomerPortalAction } from '@/app/actions/stripe'
import { PricingSection } from '@/components/PricingSection'
import { ThaiAddressSelector } from '@/components/ThaiAddressSelector'
import { computeAvailableSlots } from '@/lib/slot-engine'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import type { Booking, Merchant, Service, Slot, BookingStatus, TimeSlotOption } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function DashboardPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const { t, lang } = useLanguage()

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

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  // Active Tab
  const [activeTab, setActiveTab] = useState<'bookings' | 'block-slots' | 'services' | 'settings' | 'billing'>('bookings')

  // Date Filter for Bookings
  const today = startOfToday()
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Selected Slip Modal
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null)

  // Service Edit/New Modal state
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)

  // Manual Booking Modal state
  const [isManualBookingModalOpen, setIsManualBookingModalOpen] = useState(false)
  const [manualBookingForm, setManualBookingForm] = useState({
    service_id: '',
    date: format(today, 'yyyy-MM-dd'),
    selectedSlot: null as TimeSlotOption | null,
    customer_name: '',
    notes: 'ลูกค้าโทรจอง / หน้าร้าน',
    deposit_amount: '0',
    status: 'confirmed' as BookingStatus,
  })

  // Quick Block Slot form state
  const [blockStartTime, setBlockStartTime] = useState('12:00')
  const [blockEndTime, setBlockEndTime] = useState('13:00')
  const [blockReason, setBlockReason] = useState('')

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    name: '',
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

  const dateLocale = lang === 'th' ? th : enUS

  // Available Slots for Manual Booking Modal (Must be declared at top level)
  const selectedManualService = services.find((s) => s.id === manualBookingForm.service_id) || services[0]
  const manualSlots = useMemo(() => {
    if (!merchant || !manualBookingForm.date) return []
    const duration = selectedManualService?.duration_min || 30
    return computeAvailableSlots({
      merchant,
      dateStr: manualBookingForm.date,
      durationMin: duration,
      existingBookings: bookings,
      blockedSlots: slots,
    })
  }, [merchant, manualBookingForm.date, selectedManualService, bookings, slots])

  // Check Authentication & Load initial data
  useEffect(() => {
    async function initAuthAndData() {
      // 0. Load cached LINE profile if available
      try {
        const cachedProfile = localStorage.getItem('qflow_admin_line_profile')
        if (cachedProfile) {
          setLineProfile(JSON.parse(cachedProfile))
        }
      } catch {}

      // 1. Check if user has active session
      const authStatus = await checkMerchantAuthAction(slug)
      if (authStatus.isAuthenticated) {
        setIsAuthenticated(true)
        await loadDashboardData()
        return
      }

      // 2. If inside LINE LIFF, try automatic LINE verification
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
          localStorage.setItem('qflow_admin_line_profile', JSON.stringify(profileData))

          const liffAuth = await verifyMerchantLiffAction(slug, liffRes.profile.userId)
          if (liffAuth.success) {
            setIsAuthenticated(true)
            await loadDashboardData()
            return
          }
        }
      } catch {
        // LIFF fallback
      }

      // 3. Fallback: Require PIN
      setIsAuthenticated(false)
      setLoading(false)
    }

    initAuthAndData()
  }, [slug])

  async function loadDashboardData() {
    setLoading(true)
    const supabase = createClient()
    
    // 1. Merchant
    const { data: mData } = await supabase
      .from('merchants')
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

    // 2. Services
    const { data: sData } = await supabase
      .from('services')
      .select('*')
      .eq('merchant_id', mData.id)
      .order('sort_order', { ascending: true })

    setServices(sData || [])

    // 3. Bookings
    const { data: bData } = await supabase
      .from('bookings')
      .select('*, services(*)')
      .eq('merchant_id', mData.id)
      .order('start_time', { ascending: true })

    setBookings(bData || [])

    // 4. Blocked Slots
    const { data: slotData } = await supabase
      .from('slots')
      .select('*')
      .eq('merchant_id', mData.id)
      .order('start_time', { ascending: true })

    setSlots(slotData || [])
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
    await loadDashboardData()
  }

  // Handle Logout
  async function handleLogout() {
    await logoutMerchantAction(slug)
    setIsAuthenticated(false)
    setPinInput('')
    toast.success('ออกจากระบบเรียบร้อยแล้ว')
  }

  // Handle status update
  async function handleStatusChange(bookingId: string, newStatus: BookingStatus) {
    const res = await updateBookingStatusAction(bookingId, newStatus, slug)
    if (res.success) {
      toast.success(t('settingsSaved'))
      loadDashboardData()
    }
  }

  // Handle Quick Block Slot
  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant) return

    const startISO = new Date(`${selectedDate}T${blockStartTime}:00`).toISOString()
    const endISO = new Date(`${selectedDate}T${blockEndTime}:00`).toISOString()

    const res = await createBlockedSlotAction({
      merchantId: merchant.id,
      merchantSlug: slug,
      startTime: startISO,
      endTime: endISO,
      reason: blockReason || t('reasonPlaceholder'),
    })

    if (res.success) {
      toast.success(t('saveBlockBtn'))
      loadDashboardData()
      setBlockReason('')
    }
  }

  // Handle Delete Block Slot
  async function handleDeleteBlock(slotId: string) {
    const res = await deleteBlockedSlotAction(slotId, slug)
    if (res.success) {
      toast.success(t('delete'))
      loadDashboardData()
    }
  }

  // Handle Manual Booking (Phone / Walk-in)
  async function handleCreateManualBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant) return

    if (!manualBookingForm.service_id) {
      toast.error('กรุณาเลือกบริการ')
      return
    }

    if (!manualBookingForm.selectedSlot) {
      toast.error('กรุณาเลือกรอบเวลาที่ต้องการลงคิว')
      return
    }

    if (!manualBookingForm.customer_name.trim()) {
      toast.error('กรุณากรอกชื่อลูกค้า')
      return
    }

    const res = await createManualBookingAction({
      merchantId: merchant.id,
      merchantSlug: slug,
      serviceId: manualBookingForm.service_id,
      startTime: manualBookingForm.selectedSlot.startTime,
      endTime: manualBookingForm.selectedSlot.endTime,
      customerName: manualBookingForm.customer_name,
      notes: manualBookingForm.notes,
      depositAmount: Number(manualBookingForm.deposit_amount) || 0,
      status: 'confirmed',
    })

    if (res.success) {
      toast.success(t('bookingCreatedSuccess'))
      setIsManualBookingModalOpen(false)
      setManualBookingForm({
        service_id: '',
        date: selectedDate,
        selectedSlot: null,
        customer_name: '',
        notes: 'ลูกค้าโทรจอง / หน้าร้าน',
        deposit_amount: '0',
        status: 'confirmed',
      })
      loadDashboardData()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาดในการลงคิว')
    }
  }

  // Handle Save Service
  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant || !editingService) return

    const res = await saveServiceAction({
      id: editingService.id,
      merchantId: merchant.id,
      merchantSlug: slug,
      title: editingService.title || '',
      description: editingService.description || '',
      duration_min: Number(editingService.duration_min) || 60,
      price: Number(editingService.price) || 0,
      deposit_amount: editingService.deposit_amount ? Number(editingService.deposit_amount) : undefined,
      is_active: editingService.is_active ?? true,
    })

    if (res.success) {
      toast.success(t('settingsSaved'))
      setIsServiceModalOpen(false)
      setEditingService(null)
      loadDashboardData()
    }
  }

  // Handle Delete Service
  async function handleDeleteService(serviceId: string) {
    if (confirm('Delete this service?')) {
      const res = await deleteServiceAction(serviceId, slug)
      if (res.success) {
        toast.success(t('delete'))
        loadDashboardData()
      }
    }
  }

  // Handle Branch Info Submit
  async function handleSaveBranch(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant) return

    const res = await updateMerchantBranchAction({
      merchantId: merchant.id,
      merchantSlug: slug,
      branch_name: settingsForm.branch_name,
      branch_address: settingsForm.branch_address,
      branch_phone: settingsForm.branch_phone,
    })

    if (res.success) {
      toast.success(lang === 'th' ? 'บันทึกข้อมูลสาขาเรียบร้อยแล้ว' : 'Branch information saved')
      loadDashboardData()
    } else {
      toast.error(res.error || (lang === 'th' ? 'เกิดข้อผิดพลาดในการบันทึก' : 'Failed to save branch'))
    }
  }

  // Handle Settings Submit
  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant) return

    const res = await updateMerchantSettingsAction({
      merchantId: merchant.id,
      merchantSlug: slug,
      name: settingsForm.name,
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
      loadDashboardData()
    }
  }

  // 1. Loading State
  if (loading && isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // 2. AUTHENTICATION GATE SCREEN (PIN / LINE LOGIN)
  if (isAuthenticated === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 transition-colors">
        <div className="flex justify-between items-center max-w-md w-full mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-base shadow-xs group-hover:scale-105 transition-transform">
              Q
            </div>
            <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">QFlow</span>
          </Link>
          <NavbarControls />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-sm w-full mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6"
        >
          <div className="text-center">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-2xs">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {lang === 'th' ? 'ยืนยันตัวตนเจ้าของร้าน' : 'Merchant Authentication'}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {lang === 'th' ? `ร้าน: ${slug}` : `Shop: ${slug}`}
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            {pinError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5 text-center">
                {lang === 'th' ? 'กรอกรหัส Admin PIN (ค่าเริ่มต้น: 1234)' : 'Enter Admin PIN (Default: 1234)'}
              </label>
              <input
                type="password"
                required
                maxLength={6}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={verifyingPin || !pinInput}
              className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-98"
            >
              {verifyingPin ? (
                <span>{t('loading')}</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{lang === 'th' ? 'เข้าสู่ระบบ Dashboard' : 'Unlock Dashboard'}</span>
                </>
              )}
            </button>
          </form>

          <div className="text-center pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              💡 {lang === 'th' ? 'หากเปิดผ่าน LINE LIFF ของบัญชีเจ้าของร้าน ระบบจะล็อกอินให้อัตโนมัติ' : 'Opening via LINE LIFF will auto-authenticate linked merchants.'}
            </p>
          </div>
        </motion.div>

        <div className="text-center text-xs text-slate-400 dark:text-slate-600">
          QFlow Security Gateway • PIN & LINE LIFF Protected
        </div>
      </div>
    )
  }

  // 3. Shop Not Found
  if (!merchant) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">ไม่พบร้านค้านี้</h1>
        </div>
      </div>
    )
  }

  // Metrics
  const todayStr = format(today, 'yyyy-MM-dd')
  const todayBookings = bookings.filter((b) => b.start_time.startsWith(todayStr))
  const todayConfirmed = todayBookings.filter((b) => b.status === 'confirmed')
  const todayDepositTotal = todayConfirmed.reduce((sum, b) => sum + Number(b.deposit_amount), 0)

  // Filtered Bookings for Table
  const filteredBookings = bookings.filter((b) => {
    const matchDate = b.start_time.startsWith(selectedDate)
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchDate && matchStatus
  })

  // 4. MAIN AUTHENTICATED DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-20 transition-colors font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="h-8 w-8 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-base shadow-xs hover:scale-105 transition-transform">
              Q
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight">{merchant.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-[10px] font-bold">
                  {t('live')}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">{t('dashboardTitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* LINE Profile Chip */}
            {lineProfile ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 shadow-2xs">
                {lineProfile.pictureUrl ? (
                  <img
                    src={lineProfile.pictureUrl}
                    alt={lineProfile.displayName}
                    className="w-5 h-5 rounded-full object-cover border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#06C755] flex items-center justify-center text-[10px] font-bold text-white">
                    L
                  </div>
                )}
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 max-w-[100px] truncate leading-tight">
                    {lineProfile.displayName}
                  </span>
                  <span className="text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 leading-none">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    LINE Connected
                  </span>
                </div>
              </div>
            ) : merchant.line_user_id ? (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>LINE Admin Linked</span>
              </div>
            ) : null}

            <NavbarControls />
            <Link
              href={`/${slug}/book`}
              target="_blank"
              className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-2xs"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('openCustomerBooking')}</span>
            </Link>
            <button
              onClick={handleLogout}
              type="button"
              aria-label="Logout"
              className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-slate-200 dark:border-slate-800 transition active:scale-95"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Metric Cards - Clean Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('todayBookings')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{todayBookings.length}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {t('todayConfirmed')}
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{todayConfirmed.length}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              {t('todayDepositTotal')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">฿{todayDepositTotal.toLocaleString()}</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              {t('shopHours')}
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              {merchant.open_time.slice(0, 5)} - {merchant.close_time.slice(0, 5)}
              {merchant.has_break && merchant.break_start_time && merchant.break_end_time && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1 mt-0.5">
                  <Coffee className="w-3 h-3" />
                  <span>Break {merchant.break_start_time.slice(0, 5)} - {merchant.break_end_time.slice(0, 5)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation - Pill Segmented Style */}
        <div className="flex gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              activeTab === 'bookings'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            {t('tabBookings')} ({bookings.length})
          </button>
          <button
            onClick={() => setActiveTab('block-slots')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              activeTab === 'block-slots'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            {t('tabBlockSlots')} ({slots.length})
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              activeTab === 'services'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            {t('tabBranchesAndServices')} ({services.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              activeTab === 'settings'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            {t('tabSettings')}
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
              activeTab === 'billing'
                ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'แพ็กเกจ & บิลลิ่ง' : 'Plans & Billing'}</span>
          </button>
        </div>

        {/* TAB 1: BOOKINGS LIST */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filters Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-2xl shadow-2xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                />
                <button
                  onClick={() => setSelectedDate(format(today, 'yyyy-MM-dd'))}
                  className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition"
                >
                  {t('today')}
                </button>
                <button
                  onClick={() => setSelectedDate(format(addDays(today, 1), 'yyyy-MM-dd'))}
                  className="text-xs bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 px-2.5 py-1.5 rounded-xl text-slate-700 dark:text-slate-300 font-medium transition"
                >
                  {t('tomorrow')}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 overflow-x-auto">
                  {[
                    { id: 'all', label: t('all') },
                    { id: 'confirmed', label: t('statusConfirmed') },
                    { id: 'pending_payment', label: t('statusPending') },
                    { id: 'completed', label: t('statusCompleted') },
                    { id: 'cancelled', label: t('statusCancelled') },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition shrink-0 ${
                        statusFilter === st.id
                          ? 'bg-indigo-600 dark:bg-indigo-500 text-white'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const firstSvc = services[0]
                    setManualBookingForm({
                      service_id: firstSvc?.id || '',
                      date: selectedDate,
                      selectedSlot: null,
                      customer_name: '',
                      notes: 'ลูกค้าโทรจอง / หน้าร้าน',
                      deposit_amount: String(firstSvc?.deposit_amount ?? merchant.default_deposit ?? 100),
                      status: 'confirmed',
                    })
                    setIsManualBookingModalOpen(true)
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-98 shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t('addManualBookingBtn')}</span>
                </button>
              </div>
            </div>

            {/* Bookings Card List */}
            {filteredBookings.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs">
                <CalendarIcon className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('noBookingsFound')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBookings.map((b) => {
                  const sTime = new Date(b.start_time)
                  const eTime = new Date(b.end_time)

                  return (
                    <div
                      key={b.id}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-bold text-slate-900 dark:text-white">
                              {format(sTime, 'HH:mm')} - {format(eTime, 'HH:mm')}
                            </span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                b.status === 'confirmed'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                                  : b.status === 'completed'
                                  ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/80'
                                  : b.status === 'cancelled'
                                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20'
                                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80'
                              }`}
                            >
                              {b.status === 'confirmed' && t('statusConfirmed')}
                              {b.status === 'completed' && t('statusCompleted')}
                              {b.status === 'cancelled' && t('statusCancelled')}
                              {b.status === 'pending_payment' && t('statusPending')}
                              {b.status === 'no_show' && t('statusNoShow')}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            {b.services?.title || b.service?.title || t('service')}
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <span className="text-slate-500 dark:text-slate-400">{t('depositAmount')}: </span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            ฿{Number(b.deposit_amount).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl text-xs">
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{t('customer')}</span>
                          <span className="font-semibold text-slate-900 dark:text-white">{b.customer_name}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{t('phone')}</span>
                          <a href={`tel:${b.customer_phone}`} className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                            {b.customer_phone}
                          </a>
                        </div>
                        <div>
                          <span className="text-slate-400 dark:text-slate-500 block text-[10px]">{t('lineId')}</span>
                          <span className="text-slate-700 dark:text-slate-300 font-mono">{b.customer_line_id || '-'}</span>
                        </div>
                        {b.customer_notes && (
                          <div className="sm:col-span-3 text-slate-600 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-1.5 mt-0.5 text-[11px]">
                            <strong>{t('notes')}:</strong> {b.customer_notes}
                          </div>
                        )}
                      </div>

                      {/* Action buttons & Slip preview */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                        <div>
                          {b.slip_url && (
                            <button
                              onClick={() => setSelectedSlipUrl(b.slip_url)}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 font-semibold active:scale-95 transition"
                            >
                              <ImageIcon className="w-3.5 h-3.5" />
                              {t('viewSlip')} ({b.slip_trans_ref ? `Ref: ${b.slip_trans_ref.slice(0, 8)}...` : 'Slip'})
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {b.status === 'confirmed' && (
                            <button
                              onClick={() => handleStatusChange(b.id, 'completed')}
                              className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold transition active:scale-95 shadow-2xs"
                            >
                              {t('markCompleted')}
                            </button>
                          )}
                          {b.status !== 'cancelled' && b.status !== 'completed' && (
                            <button
                              onClick={() => handleStatusChange(b.id, 'cancelled')}
                              className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold border border-rose-200 dark:border-rose-500/20 transition active:scale-95"
                            >
                              {t('cancelBooking')}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUICK BLOCK SLOTS */}
        {activeTab === 'block-slots' && (
          <div className="space-y-5">
            {/* Create Block Form */}
            <form
              onSubmit={handleCreateBlock}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {t('blockSlotTitle')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('date')}</label>
                  <input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('startTime')}</label>
                  <input
                    type="time"
                    required
                    value={blockStartTime}
                    onChange={(e) => setBlockStartTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('endTime')}</label>
                  <input
                    type="time"
                    required
                    value={blockEndTime}
                    onChange={(e) => setBlockEndTime(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('reason')}</label>
                  <input
                    type="text"
                    placeholder={t('reasonPlaceholder')}
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs active:scale-98"
              >
                <Lock className="w-3.5 h-3.5" />
                {t('saveBlockBtn')}
              </button>
            </form>

            {/* List of Blocked Slots */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('blockedListTitle')}
              </h4>

              {slots.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  {t('noBlockedSlots')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {format(new Date(s.start_time), 'd MMM yyyy HH:mm', { locale: dateLocale })} - {format(new Date(s.end_time), 'HH:mm', { locale: dateLocale })}
                        </div>
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-0.5">
                          {s.reason || 'Blocked'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteBlock(s.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition active:scale-95"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MANAGE BRANCHES & SERVICES */}
        {activeTab === 'services' && (
          <div className="space-y-6 max-w-4xl">
            {/* Branch Profile Section */}
            <form onSubmit={handleSaveBranch} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('branchInfoTitle')}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">กำหนดชื่อสาขา ที่ตั้ง และเบอร์ติดต่อสำหรับให้บริการ</p>
                  </div>
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs active:scale-98"
                >
                  <span>{t('save')}</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('branchName')}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น สาขาหลัก (Main Branch)"
                    value={settingsForm.branch_name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, branch_name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('branchPhone')}
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 081-234-5678"
                    value={settingsForm.branch_phone}
                    onChange={(e) => setSettingsForm({ ...settingsForm, branch_phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Geo Hierarchy Thai Address Selector */}
              <ThaiAddressSelector
                initialAddress={settingsForm.branch_address}
                onChange={(fullAddr) => setSettingsForm({ ...settingsForm, branch_address: fullAddr })}
                lang={lang}
              />
            </form>

            {/* Services List Section */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('allServicesTitle')}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">รายการเมนูบริการ ราคา และระยะเวลาที่ลูกค้าสามารถเลือกจอง</p>
                </div>
                <button
                  onClick={() => {
                    setEditingService({ duration_min: 60, price: 500, deposit_amount: 100, is_active: true })
                    setIsServiceModalOpen(true)
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition shadow-2xs active:scale-98"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('addNewServiceBtn')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {services.map((svc) => (
                  <div
                    key={svc.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm">{svc.title}</h4>
                        <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                          ฿{Number(svc.price).toLocaleString()}
                        </span>
                      </div>
                      {svc.description && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{svc.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-slate-700 dark:text-slate-300">
                        <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-medium">
                          ⏱️ {svc.duration_min} {t('minutes')}
                        </span>
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          {t('depositAmount')} ฿{Number(svc.deposit_amount ?? merchant.default_deposit).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                      <button
                        onClick={() => {
                          setEditingService(svc)
                          setIsServiceModalOpen(true)
                        }}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteService(svc.id)}
                        className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SETTINGS & LINE NOTIFY & CLOSED DAYS */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 space-y-5 max-w-2xl shadow-2xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {t('shopSettingsTitle')}
            </h3>

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

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('openTime')}</label>
                <input
                  type="time"
                  required
                  value={settingsForm.open_time}
                  onChange={(e) => setSettingsForm({ ...settingsForm, open_time: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('closeTime')}</label>
                <input
                  type="time"
                  required
                  value={settingsForm.close_time}
                  onChange={(e) => setSettingsForm({ ...settingsForm, close_time: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
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
                        className={`py-2.5 px-1 rounded-xl text-xs font-semibold flex flex-col items-center justify-center transition border active:scale-95 ${
                          isClosed
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
                      <input
                        type="time"
                        value={settingsForm.break_start_time}
                        onChange={(e) => setSettingsForm({ ...settingsForm, break_start_time: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-medium text-slate-600 dark:text-slate-400 block mb-1">{t('breakEndTime')}</label>
                      <input
                        type="time"
                        value={settingsForm.break_end_time}
                        onChange={(e) => setSettingsForm({ ...settingsForm, break_end_time: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
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
                  type="number"
                  required
                  value={settingsForm.default_deposit}
                  onChange={(e) => setSettingsForm({ ...settingsForm, default_deposit: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('slotInterval')}</label>
                <select
                  value={settingsForm.slot_interval_min}
                  onChange={(e) => setSettingsForm({ ...settingsForm, slot_interval_min: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                >
                  <option value="15">{t('every15Min')}</option>
                  <option value="30">{t('every30Min')}</option>
                  <option value="60">{t('every60Min')}</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1 flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  {t('lineNotifyTokenLabel')}
                </label>
                <input
                  type="text"
                  placeholder="เช่น Nq8Z8... (https://notify-bot.line.me)"
                  value={settingsForm.line_notify_token}
                  onChange={(e) => setSettingsForm({ ...settingsForm, line_notify_token: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm transition active:scale-98"
            >
              {t('saveSettingsBtn')}
            </button>
          </form>
        )}

        {/* TAB 5: BILLING & SUBSCRIPTION */}
        {activeTab === 'billing' && (
          <div className="space-y-6">
            {/* Active Plan & Slip Quota Status Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                    {lang === 'th' ? 'สถานะแพ็กเกจปัจจุบัน' : 'Subscription Status'}
                  </span>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white capitalize">
                      {merchant.plan || 'Growth'} Plan
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 text-xs font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      {merchant.subscription_status === 'active' ? (lang === 'th' ? 'กำลังใช้งาน' : 'Active') : merchant.subscription_status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      const res = await createStripeCustomerPortalAction(slug)
                      if (res.url) {
                        window.location.href = res.url
                      } else {
                        toast.error(res.error || 'ยังไม่มีประวัติการชำระเงินผ่าน Stripe')
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-semibold border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{lang === 'th' ? 'จัดการบัตร / ดูใบเสร็จผ่าน Stripe' : 'Manage via Stripe'}</span>
                  </button>
                </div>
              </div>

              {/* Quota Progress Bar */}
              <div className="pt-5 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    {lang === 'th' ? 'โควตาตรวจสลิป SlipOK เดือนนี้' : 'Monthly SlipOK Verification Quota'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {(merchant.used_slips_this_month || 0).toLocaleString()} / {(merchant.monthly_slip_quota || 500).toLocaleString()} สลิป
                  </span>
                </div>

                {/* Bar */}
                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(4, (((merchant.used_slips_this_month || 0) / (merchant.monthly_slip_quota || 500)) * 100))
                      )}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                  <span>
                    {lang === 'th' 
                      ? `เหลือโควตาอีก ${Math.max(0, (merchant.monthly_slip_quota || 500) - (merchant.used_slips_this_month || 0)).toLocaleString()} สลิป` 
                      : `${Math.max(0, (merchant.monthly_slip_quota || 500) - (merchant.used_slips_this_month || 0)).toLocaleString()} slips remaining`}
                  </span>
                  <span>{lang === 'th' ? 'รีเซ็ตโควตาทุก 30 วัน' : 'Resets monthly'}</span>
                </div>
              </div>
            </div>

            {/* Plans List Component */}
            <div className="pt-2">
              <PricingSection
                merchantSlug={slug}
                currentPlan={merchant.plan || 'growth'}
                onPlanSelected={loadDashboardData}
              />
            </div>
          </div>
        )}
      </main>

      {/* Slip Image Fullscreen Modal */}
      <AnimatePresence>
        {selectedSlipUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSlipUrl(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl"
            >
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{t('viewSlip')}</span>
                <button
                  onClick={() => setSelectedSlipUrl(null)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedSlipUrl}
                alt="Slip Fullsize"
                className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-800"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Service Add/Edit Modal */}
      <AnimatePresence>
        {isServiceModalOpen && editingService && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onSubmit={handleSaveService}
              className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl"
            >
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {editingService.id ? t('editServiceTitle') : t('addNewServiceBtn')}
              </h3>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('serviceName')} *</label>
                <input
                  type="text"
                  required
                  value={editingService.title || ''}
                  onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('serviceDesc')}</label>
                <textarea
                  rows={2}
                  value={editingService.description || ''}
                  onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('durationMin')} *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    step="5"
                    value={editingService.duration_min || 60}
                    onChange={(e) => setEditingService({ ...editingService, duration_min: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('servicePrice')} *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editingService.price || 0}
                    onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('serviceDeposit')}</label>
                <input
                  type="number"
                  placeholder={`฿${merchant.default_deposit}`}
                  value={editingService.deposit_amount || ''}
                  onChange={(e) => setEditingService({ ...editingService, deposit_amount: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium active:scale-95"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-semibold active:scale-95 shadow-2xs"
                >
                  {t('save')}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}

        {/* MANUAL BOOKING MODAL (Phone / Walk-in) */}
        {isManualBookingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              onSubmit={handleCreateManualBooking}
              className="max-w-lg w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 space-y-4 shadow-2xl my-8"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{t('manualBookingTitle')}</h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">ลงตารางนัดหมายสำหรับลูกค้าที่โทรจอง หรือจองหน้าร้าน</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualBookingModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Service Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('selectService')} *
                </label>
                <select
                  required
                  value={manualBookingForm.service_id}
                  onChange={(e) => {
                    const svcId = e.target.value
                    const s = services.find((x) => x.id === svcId)
                    setManualBookingForm({
                      ...manualBookingForm,
                      service_id: svcId,
                      deposit_amount: String(s?.deposit_amount ?? merchant.default_deposit ?? 100),
                    })
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                >
                  <option value="">-- {t('selectService')} --</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title} ({s.duration_min} นาที - ฿{s.price})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('bookingDate')} *
                </label>
                <input
                  type="date"
                  required
                  value={manualBookingForm.date}
                  onChange={(e) => setManualBookingForm({ ...manualBookingForm, date: e.target.value, selectedSlot: null })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
                />
              </div>

              {/* Time Slot Selection Grid (Matching Screenshot) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>
                      {lang === 'th'
                        ? `เลือกรอบเวลาว่าง (${selectedManualService?.duration_min || 30} นาที)`
                        : `Select Available Slot (${selectedManualService?.duration_min || 30} mins)`} *
                    </span>
                  </label>
                  {manualBookingForm.selectedSlot && (
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      ✓ {manualBookingForm.selectedSlot.displayTime}
                    </span>
                  )}
                </div>

                {manualSlots.length === 0 ? (
                  <div className="p-4 text-center text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60">
                    {merchant.closed_days?.includes(new Date(manualBookingForm.date).getDay())
                      ? 'ร้านปิดทำการในวันนี้ (วันหยุดประจำสัปดาห์)'
                      : 'ไม่มีรอบเวลาว่างในวันที่เลือก'}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto p-1 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40">
                    {manualSlots.map((slot) => {
                      const isSelected = manualBookingForm.selectedSlot?.startTime === slot.startTime

                      if (!slot.isAvailable) {
                        return (
                          <div
                            key={slot.startTime}
                            className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 text-center opacity-40 cursor-not-allowed select-none flex flex-col items-center justify-center min-h-[48px]"
                          >
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-600 line-through">
                              {slot.displayTime}
                            </p>
                            {slot.reason && (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-full">
                                {slot.reason}
                              </p>
                            )}
                          </div>
                        )
                      }

                      return (
                        <button
                          key={slot.startTime}
                          type="button"
                          onClick={() => setManualBookingForm({ ...manualBookingForm, selectedSlot: slot })}
                          className={`p-2.5 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center min-h-[48px] ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          <span className="text-xs font-semibold">{slot.displayTime}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('customer')} (ชื่อลูกค้า) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น คุณสมศรี (โทรจอง)"
                  value={manualBookingForm.customer_name}
                  onChange={(e) => setManualBookingForm({ ...manualBookingForm, customer_name: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('notes')} / บันทึกเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น ลูกค้าโทรจอง, ขอช่างพี่เอก, ชำระเงินสดหน้าร้าน"
                  value={manualBookingForm.notes}
                  onChange={(e) => setManualBookingForm({ ...manualBookingForm, notes: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsManualBookingModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold active:scale-95 transition"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 shadow-2xs transition flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t('createBookingBtn')}</span>
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
