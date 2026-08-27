'use client'

import { useEffect, useState, use, useMemo, useRef } from 'react'
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
  Lock,
  Settings,
  Image as ImageIcon,
  Sparkles,
  Coffee,
  X,
  KeyRound,
  LogOut,
  Building2,
  PhoneCall,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  User,
  Share2,
  Sun,
  Moon,
  Globe,
  LayoutGrid,
  List,
  Copy,
  Check
} from 'lucide-react'
import { format, startOfToday, addDays, subDays, parseISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  updateBookingStatusAction,
  createBlockedSlotAction,
  deleteBlockedSlotAction,
  saveServiceAction,
  deleteServiceAction,
  createManualBookingAction,
  saveStaffAction,
  deleteStaffAction
} from '@/app/actions/dashboard'
import {
  checkMerchantAuthAction,
  verifyMerchantPinAction,
  verifyMerchantLiffAction,
  logoutMerchantAction
} from '@/app/actions/auth'
import { FormattedDateInput } from '@/components/FormattedDateInput'
import { TimePicker24h } from '@/components/TimePicker24h'
import { computeAvailableSlots } from '@/lib/slot-engine'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'

import { CustomDropdown } from '@/components/CustomDropdown'
import type { Booking, Merchant, Service, Slot, BookingStatus, TimeSlotOption, Branch, Staff } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function DashboardPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
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
  const userMenuRef = useRef<HTMLDivElement>(null)

  const [branchMenuOpen, setBranchMenuOpen] = useState(false)
  const branchMenuRef = useRef<HTMLDivElement>(null)

  const [copiedLink, setCopiedLink] = useState(false)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
      if (branchMenuRef.current && !branchMenuRef.current.contains(event.target as Node)) {
        setBranchMenuOpen(false)
      }
    }
    if (userMenuOpen || branchMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen, branchMenuOpen])

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)

  // Active Tab
  const [activeTab, setActiveTab] = useState<'bookings' | 'block-slots' | 'services'>('bookings')

  // Date Filter for Bookings
  const today = startOfToday()
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState<string>('all')
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all')
  const [bookingsViewMode, setBookingsViewMode] = useState<'timeline' | 'list'>('timeline')

  function handleSelectBranch(branchId: string) {
    setSelectedBranchFilter(branchId)
    try {
      localStorage.setItem(`q flow_selected_branch_${slug}`, branchId)
    } catch { }
  }

  // Selected Slip Modal
  const [selectedSlipUrl, setSelectedSlipUrl] = useState<string | null>(null)

  // Service Edit/New Modal state
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null)
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false)



  // Staff Edit/New Modal state
  const [editingStaff, setEditingStaff] = useState<Partial<Staff> & { serviceIds?: string[] } | null>(null)
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false)

  // Manual Booking Modal state
  const [isManualBookingModalOpen, setIsManualBookingModalOpen] = useState(false)
  const [manualBookingForm, setManualBookingForm] = useState({
    service_id: '',
    branch_id: '',
    staff_id: '',
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



  // Available Slots for Manual Booking Modal (Must be declared at top level)
  const selectedManualService = services.find((s) => s.id === manualBookingForm.service_id) || services[0]
  const selectedManualBranch = branches.find((b) => b.id === manualBookingForm.branch_id) || null
  const manualSlots = useMemo(() => {
    if (!merchant || !manualBookingForm.date) return []
    const duration = selectedManualService?.duration_min || 30
    return computeAvailableSlots({
      merchant,
      branch: selectedManualBranch,
      staffId: manualBookingForm.staff_id || null,
      dateStr: manualBookingForm.date,
      durationMin: duration,
      existingBookings: bookings,
      blockedSlots: slots,
    })
  }, [merchant, selectedManualBranch, manualBookingForm.staff_id, manualBookingForm.date, selectedManualService, bookings, slots])

  // Active Selected Branch for display & calculations
  const activeSelectedBranch = selectedBranchFilter === 'all'
    ? null
    : branches.find((b) => b.id === selectedBranchFilter) || null

  // Check Authentication & Load initial data
  useEffect(() => {
    async function initAuthAndData() {
      // 0. Load cached LINE profile if available
      try {
        const cachedProfile = localStorage.getItem('q flow_admin_line_profile')
        if (cachedProfile) {
          setLineProfile(JSON.parse(cachedProfile))
        }
      } catch { }

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
          localStorage.setItem('q flow_admin_line_profile', JSON.stringify(profileData))

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    // Fetch all related dashboard collections in parallel
    const [branchRes, staffRes, serviceRes, bookingRes, slotRes] = await Promise.all([
      supabase.from('branches').select('*').eq('merchant_id', mData.id).order('created_at', { ascending: true }),
      supabase.from('staff').select('*, branch:branches(*), staff_services(*, service:services(*))').eq('merchant_id', mData.id).order('created_at', { ascending: true }),
      supabase.from('services').select('*').eq('merchant_id', mData.id).order('sort_order', { ascending: true }),
      supabase.from('bookings').select('*, services(*), branch:branches(*), staff:staff(*)').eq('merchant_id', mData.id).order('start_time', { ascending: true }),
      supabase.from('slots').select('*').eq('merchant_id', mData.id).order('start_time', { ascending: true }),
    ])

    const branchData = branchRes.data || []
    setBranches(branchData)

    // Synchronize selected branch filter with localStorage
    if (branchData.length > 0) {
      try {
        const savedBranchId = localStorage.getItem(`q flow_selected_branch_${slug}`)
        if (savedBranchId) {
          const exists = savedBranchId === 'all' || branchData.some((b) => b.id === savedBranchId)
          if (exists) {
            setSelectedBranchFilter(savedBranchId)
          } else {
            setSelectedBranchFilter(branchData[0].id)
            localStorage.setItem(`q flow_selected_branch_${slug}`, branchData[0].id)
          }
        } else {
          setSelectedBranchFilter(branchData[0].id)
          localStorage.setItem(`q flow_selected_branch_${slug}`, branchData[0].id)
        }
      } catch { }
    }

    setStaffList((staffRes.data as unknown as Staff[]) || [])
    setServices(serviceRes.data || [])
    setBookings(bookingRes.data || [])
    setSlots(slotRes.data || [])
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
      branchId: manualBookingForm.branch_id || undefined,
      staffId: manualBookingForm.staff_id || undefined,
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
        branch_id: '',
        staff_id: '',
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



  // Handle Save Staff
  async function handleSaveStaff(e: React.FormEvent) {
    e.preventDefault()
    if (!merchant || !editingStaff) return
    if (!editingStaff.name?.trim()) {
      toast.error('กรุณากรอกชื่อช่าง / ผู้ให้บริการ')
      return
    }

    const res = await saveStaffAction({
      id: editingStaff.id,
      merchantId: merchant.id,
      merchantSlug: slug,
      branchId: editingStaff.branch_id || undefined,
      name: editingStaff.name,
      nickname: editingStaff.nickname || undefined,
      role_title: editingStaff.role_title || undefined,
      avatar_url: editingStaff.avatar_url || undefined,
      is_active: editingStaff.is_active ?? true,
      serviceIds: editingStaff.serviceIds || [],
    })

    if (res.success) {
      toast.success(t('settingsSaved'))
      setIsStaffModalOpen(false)
      setEditingStaff(null)
      loadDashboardData()
    } else {
      toast.error(res.error || 'เกิดข้อผิดพลาด')
    }
  }

  // Handle Delete Staff
  async function handleDeleteStaff(staffId: string) {
    if (confirm('ต้องการลบข้อมูลช่างท่านนี้หรือไม่?')) {
      const res = await deleteStaffAction(staffId, slug)
      if (res.success) {
        toast.success(t('delete'))
        loadDashboardData()
      } else {
        toast.error(res.error || 'เกิดข้อผิดพลาด')
      }
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
            <QFlowLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
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
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              {merchant ? merchant.name : 'ร้านค้า'}
            </p>
          </div>

          <form onSubmit={handleVerifyPin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 text-center">
                {lang === 'th' ? 'กรอกรหัส PIN ร้านค้า (4-6 หลัก)' : 'Enter Merchant PIN'}
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] text-2xl font-bold py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                autoFocus
              />
              {pinError && (
                <p className="text-xs text-rose-500 text-center mt-2 font-medium">
                  {pinError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={verifyingPin || pinInput.length < 4}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl transition shadow-md shadow-indigo-600/20 active:scale-98 cursor-pointer text-sm"
            >
              {verifyingPin ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {t('loading')}
                </span>
              ) : (
                lang === 'th' ? 'เข้าสู่ระบบหลังบ้าน' : 'Access Dashboard'
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-center">
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              {lang === 'th'
                ? 'หรือเปิดผ่านแอป LINE เพื่อเข้าสู่ระบบอัตโนมัติ'
                : 'Or open via LINE app to sign in automatically'}
            </p>
          </div>
        </motion.div>

        <div className="text-center text-xs text-slate-600 dark:text-slate-400">
          © {new Date().getFullYear()} Q Flow. All rights reserved.
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

  // Filter Bookings for Metrics according to selected branch
  const todayStr = format(new Date(), 'yyyy-MM-dd')
  const branchBookings = selectedBranchFilter === 'all'
    ? bookings
    : bookings.filter((b) => b.branch_id === selectedBranchFilter)

  const todayBookings = branchBookings.filter((b) => b.start_time.startsWith(todayStr))
  const todayConfirmed = todayBookings.filter((b) => b.status === 'confirmed')
  const todayDepositTotal = todayConfirmed.reduce((sum, b) => sum + Number(b.deposit_amount), 0)

  // Filtered Bookings for Table
  const filteredBookings = bookings.filter((b) => {
    const matchDate = b.start_time.startsWith(selectedDate)
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const matchBranch = selectedBranchFilter === 'all' || b.branch_id === selectedBranchFilter
    const matchStaff = selectedStaffFilter === 'all' || b.staff_id === selectedStaffFilter
    return matchDate && matchStatus && matchBranch && matchStaff
  })

  // 4. MAIN AUTHENTICATED DASHBOARD
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 sm:pb-6 transition-colors font-sans antialiased">
      {/* Top Navbar */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchant.name}
                className="w-8 h-8 sm:w-9 sm:h-9 aspect-square rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0"
              />
            ) : (
              <Link href="/" aria-label="กลับสู่หน้าแรก Q Flow" className="inline-flex items-center gap-2 group shrink-0">
                <QFlowLogo className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:scale-105" />
              </Link>
            )}
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate max-w-[100px] xs:max-w-[140px] sm:max-w-xs">{merchant.name}</h1>
              <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate hidden xs:block">{t('dashboardTitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Top Branch Selector Custom Dropdown (Matches filter dropdown) */}
            {branches.length > 0 && (
              <CustomDropdown
                value={selectedBranchFilter}
                onChange={(val) => handleSelectBranch(val)}
                prefixIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                dropdownWidth="w-56"
                options={[
                  {
                    value: 'all',
                    label: 'ทุกสาขา',
                    sublabel: `ดูทุกสาขา (${branches.length} สาขา)`,
                    icon: <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                  },
                  ...branches.map((b) => ({
                    value: b.id,
                    label: b.name,
                    sublabel: b.address || undefined,
                    icon: <Building2 className="w-4 h-4 text-slate-400" />,
                  })),
                ]}
              />
            )}

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

      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Metric Cards - Clean Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('todayBookings')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">{todayBookings.length}</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {t('todayConfirmed')}
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">{todayConfirmed.length}</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              {t('todayDepositTotal')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">฿{todayDepositTotal.toLocaleString()}</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              {activeSelectedBranch ? `เวลาทำการ (${activeSelectedBranch.name})` : t('shopHours')}
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              {(activeSelectedBranch?.open_time || merchant.open_time).slice(0, 5)} - {(activeSelectedBranch?.close_time || merchant.close_time).slice(0, 5)}
              {(activeSelectedBranch?.has_break ?? merchant.has_break) && (
                <div className="text-[11px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1 mt-0.5">
                  <Coffee className="w-3 h-3" />
                  <span>
                    Break {(activeSelectedBranch?.break_start_time || merchant.break_start_time || '12:00').slice(0, 5)} - {(activeSelectedBranch?.break_end_time || merchant.break_end_time || '13:00').slice(0, 5)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation - Desktop Segmented Pill (Hidden on Mobile) */}
        <div className="hidden sm:flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto scrollbar-none no-scrollbar flex-nowrap">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${activeTab === 'bookings'
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{t('tabBookings')} ({branchBookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('block-slots')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${activeTab === 'block-slots'
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <Lock className="w-3.5 h-3.5 shrink-0" />
            <span>{t('tabBlockSlots')} ({slots.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap active:scale-95 cursor-pointer ${activeTab === 'services'
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white shadow-2xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
          >
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ช่าง และบริการ' : 'Staff & Services'} ({services.length})</span>
          </button>
          <Link
            href={`/${slug}/settings`}
            className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 whitespace-nowrap active:scale-95 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span>{lang === 'th' ? 'ตั้งค่าร้าน & แพ็กเกจ' : 'Settings & Plans'}</span>
          </Link>
        </div>

        {/* TAB 1: BOOKINGS LIST */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {/* Filters & Actions Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
              {/* Top Row: Date Selector & Add Manual Booking CTA */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                {/* Date Navigation Bar (Full Width on Mobile, Inline on Desktop) */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Previous Day Arrow (1:1 Aspect Ratio) */}
                  <button
                    type="button"
                    aria-label="ไปยังวันก่อนหน้า"
                    title="วันก่อนหน้า"
                    onClick={() => {
                      const cur = parseISO(selectedDate)
                      if (!isNaN(cur.getTime())) {
                        setSelectedDate(format(subDays(cur, 1), 'yyyy-MM-dd'))
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition active:scale-95 shadow-2xs border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-center aspect-square shrink-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Date Input Dropdown (Full Width on Mobile, Fixed Width on Desktop) */}
                  <div className="flex-1 sm:flex-initial sm:w-44 min-w-0">
                    <FormattedDateInput
                      value={selectedDate}
                      onChange={(val) => setSelectedDate(val)}
                      className="w-full"
                    />
                  </div>

                  {/* Next Day Arrow (1:1 Aspect Ratio) */}
                  <button
                    type="button"
                    aria-label="ไปยังวันถัดไป"
                    title="วันถัดไป"
                    onClick={() => {
                      const cur = parseISO(selectedDate)
                      if (!isNaN(cur.getTime())) {
                        setSelectedDate(format(addDays(cur, 1), 'yyyy-MM-dd'))
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 transition active:scale-95 shadow-2xs border border-slate-200 dark:border-slate-700/60 cursor-pointer flex items-center justify-center aspect-square shrink-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>

                  {/* Today Quick Jump Button (Visible on Desktop sm:inline-flex) */}
                  <button
                    type="button"
                    onClick={() => setSelectedDate(format(today, 'yyyy-MM-dd'))}
                    className={`hidden sm:inline-flex items-center text-xs px-3.5 h-9 rounded-xl font-semibold transition active:scale-95 border cursor-pointer shadow-2xs shrink-0 ${
                      selectedDate === format(today, 'yyyy-MM-dd')
                        ? 'bg-indigo-600 text-white border-indigo-700 font-bold'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-750'
                    }`}
                  >
                    {t('today')}
                  </button>
                </div>

                {/* Manual Booking Button (Full Width on Mobile, Auto on Desktop) */}
                <button
                  type="button"
                  onClick={() => {
                    const firstSvc = services[0]
                    setManualBookingForm({
                      service_id: firstSvc?.id || '',
                      branch_id: '',
                      staff_id: '',
                      date: selectedDate,
                      selectedSlot: null,
                      customer_name: '',
                      notes: 'ลูกค้าโทรจอง / หน้าร้าน',
                      deposit_amount: String(firstSvc?.deposit_amount ?? merchant.default_deposit ?? 100),
                      status: 'confirmed',
                    })
                    setIsManualBookingModalOpen(true)
                  }}
                  className="w-full sm:w-auto h-9 px-3.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer shrink-0"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>{t('addManualBookingBtn')}</span>
                </button>
              </div>

              {/* Bottom Section: Filters (Responsive: Mobile 2 rows vs Desktop single inline row) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
                {/* Mobile: Row 1 / Desktop: Left Side (Branch, Staff & View Mode Toggle) */}
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  {/* Branch Filter Custom Dropdown (Equal width on mobile, natural on desktop) */}
                  {branches.length > 0 && (
                    <div className="flex-1 sm:flex-initial sm:w-48 min-w-0">
                      <CustomDropdown
                        value={selectedBranchFilter}
                        onChange={(val) => handleSelectBranch(val)}
                        prefixIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        className="w-full"
                        dropdownWidth="w-56"
                        options={[
                          {
                            value: 'all',
                            label: 'ทุกสาขา',
                            sublabel: `ดูทุกสาขา (${branches.length} สาขา)`,
                            icon: <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                          },
                          ...branches.map((b) => ({
                            value: b.id,
                            label: b.name,
                            sublabel: b.address || undefined,
                            icon: <Building2 className="w-4 h-4 text-slate-400" />,
                          })),
                        ]}
                      />
                    </div>
                  )}

                  {/* Staff Filter Custom Dropdown (Equal width on mobile, natural on desktop) */}
                  {staffList.length > 0 && (
                    <div className="flex-1 sm:flex-initial sm:w-52 min-w-0">
                      <CustomDropdown
                        value={selectedStaffFilter}
                        onChange={(val) => setSelectedStaffFilter(val)}
                        prefixIcon={<Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                        className="w-full"
                        dropdownWidth="w-64"
                        options={[
                          {
                            value: 'all',
                            label: 'ช่างทุกคน',
                            sublabel: `แสดงช่างทุกคน (${staffList.length} ท่าน)`,
                            icon: <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                          },
                          ...staffList.map((s) => ({
                            value: s.id,
                            label: s.nickname ? `${s.nickname} (${s.name})` : s.name,
                            sublabel: `${s.role_title || 'ช่างประจำ'} • ${branches.find((b) => b.id === s.branch_id)?.name || 'ทุกสาขา'}`,
                            avatarUrl: s.avatar_url || undefined,
                            avatarFallback: s.nickname ? s.nickname.charAt(0) : s.name.charAt(0),
                          })),
                        ]}
                      />
                    </div>
                  )}

                  {/* View Mode Toggle: Grid Timeline vs Detailed List (Fixed at Far Right on mobile, directly inline on desktop) */}
                  <div className="h-9 flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs shrink-0">
                    <button
                      type="button"
                      aria-label="แสดงแบบตารางเวลา (Grid Timeline)"
                      title="แสดงแบบตารางเวลา (Grid Timeline)"
                      onClick={() => setBookingsViewMode('timeline')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer aspect-square ${
                        bookingsViewMode === 'timeline'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="แสดงแบบรายการ (List)"
                      title="แสดงแบบรายการ (List)"
                      onClick={() => setBookingsViewMode('list')}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition active:scale-95 cursor-pointer aspect-square ${
                        bookingsViewMode === 'list'
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Mobile: Row 2 / Desktop: Right Side (Status Filter Segmented Badges) */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 shadow-2xs overflow-x-auto max-w-full shrink-0">
                  {[
                    { id: 'all', label: t('all') },
                    { id: 'confirmed', label: t('statusConfirmed') },
                    { id: 'pending_payment', label: t('statusPending') },
                    { id: 'completed', label: t('statusCompleted') },
                    { id: 'cancelled', label: t('statusCancelled') },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer active:scale-95 ${
                        statusFilter === st.id
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* TAB 1 CONTENT: 1. TIMELINE GRID VIEW OR 2. DETAILED LIST VIEW */}
            {bookingsViewMode === 'timeline' ? (
              /* ================== 1. TIMELINE SLOTS GRID ================== */
              (() => {
                // Determine active branch, staff, and representative service duration
                const branchObj = selectedBranchFilter === 'all'
                  ? null
                  : branches.find((b) => b.id === selectedBranchFilter) || null

                const repService = services[0]
                const durationMin = repService?.duration_min || 45

                // Compute exact same slots as customer booking page via slot engine
                const computedTimelineSlots = computeAvailableSlots({
                  merchant,
                  branch: branchObj,
                  staffId: selectedStaffFilter !== 'all' ? selectedStaffFilter : null,
                  dateStr: selectedDate,
                  durationMin,
                  existingBookings: bookings,
                  blockedSlots: slots,
                })

                // Metrics
                const availableCount = computedTimelineSlots.filter((s) => s.isAvailable).length
                const bookedCount = computedTimelineSlots.filter((s) => !s.isAvailable && s.reason === 'มีลูกค้าจองแล้ว').length

                return (
                  <div className="space-y-4">
                    {/* Summary Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {lang === 'th'
                            ? `เลือกรอบเวลาว่าง (${durationMin} นาที) • ประจำวันที่ ${format(parseISO(selectedDate), 'dd/MM/yyyy')}`
                            : `Available Slots (${durationMin} mins) • ${selectedDate}`}
                        </span>
                        {repService && (
                          <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                            (อ้างอิง: {repService.title})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/80 font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span>{lang === 'th' ? `ว่าง ${availableCount} รอบ` : `${availableCount} Available`}</span>
                        </div>
                        {bookedCount > 0 && (
                          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800/80 font-bold">
                            <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            <span>{lang === 'th' ? `จองแล้ว ${bookedCount} คิว` : `${bookedCount} Booked`}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Timeline Slots Grid (Matching Customer Booking Card UI) */}
                    {computedTimelineSlots.length === 0 ? (
                      <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs space-y-2">
                        <Coffee className="w-8 h-8 text-amber-500 mx-auto" />
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {lang === 'th' ? 'ร้านปิดทำการในวันนี้' : 'Shop is closed on this date'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {computedTimelineSlots.map((slot, i) => {
                          const isBreak = slot.reason === 'เวลาพักของร้าน (Break)'
                          const isBooked = slot.reason === 'มีลูกค้าจองแล้ว'

                          // Find matching booking details if booked
                          const sTime = slot.startTime ? new Date(slot.startTime).getTime() : 0
                          const eTime = slot.endTime ? new Date(slot.endTime).getTime() : 0
                          const matchedBooking = isBooked
                            ? bookings.find((b) => {
                                if (!b.start_time.startsWith(selectedDate) || b.status === 'cancelled') return false
                                const bS = new Date(b.start_time).getTime()
                                const bE = new Date(b.end_time).getTime()
                                return bS < eTime && bE > sTime
                              })
                            : null

                          return (
                            <div
                              key={i}
                              className={`p-3.5 rounded-2xl border transition-colors flex flex-col justify-between min-h-[76px] ${
                                slot.isAvailable
                                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-600 shadow-2xs hover:shadow-sm'
                                  : isBreak
                                  ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                                  : isBooked
                                  ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/80'
                                  : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/60 opacity-60'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className={`font-mono text-xs font-bold ${
                                  slot.isAvailable
                                    ? 'text-slate-900 dark:text-white'
                                    : isBooked
                                    ? 'text-indigo-950 dark:text-indigo-200'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`}>
                                  {slot.displayTime}
                                </span>

                                {slot.isAvailable ? (
                                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                ) : isBooked ? (
                                  <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
                                ) : isBreak ? (
                                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                                ) : (
                                  <span className="w-2 h-2 rounded-full bg-rose-400" />
                                )}
                              </div>

                              <div className="mt-2 flex items-center justify-between gap-2">
                                {slot.isAvailable ? (
                                  <>
                                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>{lang === 'th' ? 'ว่าง' : 'Available'}</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setManualBookingForm({
                                          service_id: repService?.id || '',
                                          branch_id: selectedBranchFilter !== 'all' ? selectedBranchFilter : '',
                                          staff_id: selectedStaffFilter !== 'all' ? selectedStaffFilter : '',
                                          date: selectedDate,
                                          selectedSlot: slot,
                                          customer_name: '',
                                          notes: 'ลูกค้าโทรจอง / หน้าร้าน',
                                          deposit_amount: String(repService?.deposit_amount ?? merchant.default_deposit ?? 100),
                                          status: 'confirmed',
                                        })
                                        setIsManualBookingModalOpen(true)
                                      }}
                                      className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white rounded-lg text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 transition active:scale-95 cursor-pointer flex items-center gap-1"
                                    >
                                      <Plus className="w-3 h-3" />
                                      <span>{lang === 'th' ? 'ลงคิว' : 'Book'}</span>
                                    </button>
                                  </>
                                ) : isBreak ? (
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                                    <Coffee className="w-3 h-3" />
                                    <span>เวลาพักของร้าน (Break)</span>
                                  </span>
                                ) : isBooked ? (
                                  <div className="text-left truncate w-full">
                                    <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 block truncate">
                                      👤 {matchedBooking?.customer_name || 'มีลูกค้าจองแล้ว'}
                                    </span>
                                    {matchedBooking?.services && (
                                      <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block truncate">
                                        ✂️ {matchedBooking.services.title}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                                    <Lock className="w-3 h-3" />
                                    <span>{slot.reason || 'ไม่พร้อมให้บริการ'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })()
            ) : (
              /* ================== 2. DETAILED LIST VIEW ================== */
              filteredBookings.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
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
                        className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition space-y-3"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-slate-900 dark:text-white">
                                {format(sTime, 'HH:mm')} - {format(eTime, 'HH:mm')} น.
                              </span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${b.status === 'confirmed'
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
                            <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 flex flex-wrap items-center gap-2">
                              <span>{b.services?.title || b.service?.title || t('service')}</span>
                              {(b.branch || b.staff) && (
                                <span className="text-[11px] text-slate-500 font-normal flex items-center gap-1.5">
                                  {b.branch && (
                                    <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400">
                                      🏢 {b.branch.name}
                                    </span>
                                  )}
                                  {b.staff && (
                                    <span className="bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-medium">
                                      👤 {b.staff.name} {b.staff.nickname ? `(${b.staff.nickname})` : ''}
                                    </span>
                                  )}
                                </span>
                              )}
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
              )
            )}
          </div>
        )}

        {/* TAB 2: QUICK BLOCK SLOTS */}
        {activeTab === 'block-slots' && (
          <div className="space-y-5">
            {/* Create Block Form */}
            <form
              onSubmit={handleCreateBlock}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-sm"
            >
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                {t('blockSlotTitle')}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('date')}</label>
                  <FormattedDateInput
                    value={selectedDate}
                    onChange={(val) => setSelectedDate(val)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('startTime')}</label>
                  <TimePicker24h
                    value={blockStartTime}
                    onChange={(val) => setBlockStartTime(val)}
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 block mb-1">{t('endTime')}</label>
                  <TimePicker24h
                    value={blockEndTime}
                    onChange={(val) => setBlockEndTime(val)}
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
                <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm text-xs text-slate-500">
                  {t('noBlockedSlots')}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {slots.map((s) => (
                    <div
                      key={s.id}
                      className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">
                          {format(new Date(s.start_time), 'dd/MM/yyyy HH:mm')} - {format(new Date(s.end_time), 'HH:mm')} น.
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

        {/* TAB 3: MANAGE STAFF & SERVICES */}
        {activeTab === 'services' && (
          <div className="space-y-6 w-full">
            {/* Header & Controls: Staff Selector Dropdown & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                {/* Staff Selector Custom Rich Dropdown */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block uppercase tracking-wider">
                    {lang === 'th' ? 'เลือกช่างผู้ให้บริการ' : 'Select Specialist / Staff'}
                  </label>
                  <div className="flex items-center gap-2">
                    <CustomDropdown
                      value={selectedStaffFilter}
                      onChange={(val) => setSelectedStaffFilter(val)}
                      prefixIcon={<Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      dropdownWidth="w-72"
                      options={[
                        {
                          value: 'all',
                          label: lang === 'th' ? 'ช่างทั้งหมด' : 'All Specialists',
                          sublabel: lang === 'th' ? `แสดงช่างทุกคน (${staffList.length} ท่าน)` : `View all staff (${staffList.length})`,
                          icon: <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                        },
                        ...staffList
                          .filter((s) => selectedBranchFilter === 'all' || !s.branch_id || s.branch_id === selectedBranchFilter)
                          .map((stf) => ({
                            value: stf.id,
                            label: stf.nickname ? `${stf.nickname} (${stf.name})` : stf.name,
                            sublabel: `${stf.role_title || 'ช่างประจำ'} • ${branches.find((b) => b.id === stf.branch_id)?.name || 'ทุกสาขา'}`,
                            avatarUrl: stf.avatar_url || undefined,
                            avatarFallback: stf.nickname ? stf.nickname.charAt(0) : stf.name.charAt(0),
                          })),
                      ]}
                    />

                    {/* Quick Edit/Manage Staff button if specific staff is selected */}
                    {selectedStaffFilter !== 'all' && (
                      (() => {
                        const curStaff = staffList.find((s) => s.id === selectedStaffFilter)
                        if (!curStaff) return null
                        const curStaffServiceIds = curStaff.staff_services?.map((ss) => ss.service_id) || []
                        return (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingStaff({
                                ...curStaff,
                                serviceIds: curStaffServiceIds,
                              })
                              setIsStaffModalOpen(true)
                            }}
                            className="p-2 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition cursor-pointer active:scale-95 shadow-2xs"
                            title="แก้ไขข้อมูลช่างท่านนี้"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )
                      })()
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Add Staff & Add Service */}
              <div className="flex flex-wrap items-center gap-2 pt-2 sm:pt-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff({
                      name: '',
                      nickname: '',
                      role_title: 'ช่างผู้ให้บริการ',
                      branch_id: selectedBranchFilter !== 'all' ? selectedBranchFilter : (branches[0]?.id || null),
                      is_active: true,
                      serviceIds: services.map((s) => s.id),
                    })
                    setIsStaffModalOpen(true)
                  }}
                  className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition active:scale-95 shadow-2xs cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{t('addNewStaffBtn')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditingService({ duration_min: 60, price: 500, deposit_amount: 100, is_active: true })
                    setIsServiceModalOpen(true)
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition shadow-2xs active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addNewServiceBtn')}</span>
                </button>
              </div>
            </div>

            {/* Staff Section: When 'all' is selected, show list of all staff members */}
            {selectedStaffFilter === 'all' ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{lang === 'th' ? `รายชื่อช่างผู้ให้บริการทั้งหมด (${staffList.length} ท่าน)` : `All Staff / Providers (${staffList.length})`}</span>
                  </h3>
                </div>

                {staffList.length === 0 ? (
                  <div className="p-6 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-2xs">
                    <Users className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {lang === 'th' ? 'ยังไม่มีรายชื่อช่าง / ผู้ให้บริการ' : 'No staff members added yet'}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {lang === 'th' ? 'กดปุ่ม "+ เพิ่มช่าง / ผู้ให้บริการ" ด้านบนเพื่อเพิ่มช่าง' : 'Click "+ Add Staff" above to add your first provider'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {staffList.map((stf) => {
                      const stfBranch = branches.find((b) => b.id === stf.branch_id)
                      const stfServiceIds = stf.staff_services?.map((ss) => ss.service_id) || []
                      return (
                        <div
                          key={stf.id}
                          className="bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/50 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-2xs hover:border-indigo-400 transition"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {stf.avatar_url ? (
                              <img
                                src={stf.avatar_url}
                                alt={stf.name}
                                className="w-10 h-10 rounded-xl object-cover border border-indigo-200 dark:border-indigo-800 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
                                {stf.nickname ? stf.nickname.charAt(0) : stf.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {stf.name} {stf.nickname && <span className="text-indigo-600 dark:text-indigo-400">({stf.nickname})</span>}
                                </h4>
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                                  {stf.role_title || 'ช่างประจำ'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                                <Building2 className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span className="truncate">{stfBranch ? `สาขา: ${stfBranch.name}` : 'ทุกสาขา'}</span>
                                <span>•</span>
                                <span className="shrink-0">{stfServiceIds.length} รายการ</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingStaff({
                                  ...stf,
                                  serviceIds: stfServiceIds,
                                })
                                setIsStaffModalOpen(true)
                              }}
                              className="px-2.5 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-xl text-[11px] font-semibold border border-slate-200 dark:border-slate-800 transition active:scale-95 shadow-2xs cursor-pointer flex items-center gap-1"
                            >
                              <Edit3 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                              <span>{lang === 'th' ? 'ปรับบริการ' : 'Edit'}</span>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* Selected Staff Info Banner (if specific staff selected) */
              (() => {
                const curStaff = staffList.find((s) => s.id === selectedStaffFilter)
                if (!curStaff) return null
                const curStaffBranch = branches.find((b) => b.id === curStaff.branch_id)
                const curStaffServiceIds = curStaff.staff_services?.map((ss) => ss.service_id) || []
                return (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      {curStaff.avatar_url ? (
                        <img
                          src={curStaff.avatar_url}
                          alt={curStaff.name}
                          className="w-12 h-12 rounded-2xl object-cover border border-indigo-200 dark:border-indigo-800"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                          {curStaff.nickname ? curStaff.nickname.charAt(0) : curStaff.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                            {curStaff.name} {curStaff.nickname && <span className="text-indigo-600 dark:text-indigo-400">({curStaff.nickname})</span>}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80">
                            {curStaff.role_title || 'ช่างประจำ'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{curStaffBranch ? `สาขา: ${curStaffBranch.name}` : 'ทุกสาขา'}</span>
                          <span>•</span>
                          <span>เปิดให้บริการ {curStaffServiceIds.length} รายการ</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaff({
                            ...curStaff,
                            serviceIds: curStaffServiceIds,
                          })
                          setIsStaffModalOpen(true)
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 transition active:scale-95 shadow-2xs cursor-pointer"
                      >
                        {lang === 'th' ? 'ปรับรายการบริการ' : 'Edit Services'}
                      </button>
                    </div>
                  </div>
                )
              })()
            )}

            {/* Services List Grid (Filtered by Selected Staff) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {selectedStaffFilter === 'all'
                      ? (lang === 'th' ? `รายการบริการทั้งหมด (${services.length})` : `All Services (${services.length})`)
                      : (() => {
                        const curStaff = staffList.find((s) => s.id === selectedStaffFilter)
                        const curStaffServiceIds = curStaff?.staff_services?.map((ss) => ss.service_id) || []
                        return lang === 'th'
                          ? `บริการของช่าง ${curStaff?.nickname || curStaff?.name} (${curStaffServiceIds.length} รายการ)`
                          : `Services by ${curStaff?.nickname || curStaff?.name} (${curStaffServiceIds.length})`
                      })()}
                  </span>
                </h3>
              </div>

              {(() => {
                const displayedServices = services.filter((svc) => {
                  if (selectedStaffFilter === 'all') return true
                  const curStaff = staffList.find((s) => s.id === selectedStaffFilter)
                  if (!curStaff) return true
                  return curStaff.staff_services?.some((ss) => ss.service_id === svc.id)
                })

                if (displayedServices.length === 0) {
                  return (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 shadow-2xs">
                      <Sparkles className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {selectedStaffFilter === 'all'
                          ? (lang === 'th' ? 'ยังไม่มีรายการบริการ' : 'No services created yet')
                          : (lang === 'th' ? 'ช่างท่านนี้ยังไม่ได้เลือกให้บริการเมนูใด' : 'This specialist does not offer any services yet')}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {selectedStaffFilter === 'all'
                          ? 'กดปุ่ม "+ เพิ่มบริการใหม่" ด้านบนเพื่อเพิ่มบริการ'
                          : 'กดปุ่ม "ปรับรายการบริการ" ด้านบนเพื่อติ๊กเลือกบริการที่ช่างท่านนี้ทำได้'}
                      </p>
                    </div>
                  )
                }

                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {displayedServices.map((svc) => {
                      const eligibleStaff = staffList.filter((stf) =>
                        stf.staff_services?.some((ss) => ss.service_id === svc.id)
                      )

                      return (
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
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">{svc.description}</p>
                            )}
                            <div className="flex items-center gap-3 mt-3 text-xs text-slate-700 dark:text-slate-300">
                              <span className="bg-slate-50 dark:bg-slate-950 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 font-medium">
                                ⏱️ {svc.duration_min} {t('minutes')}
                              </span>
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                {t('depositAmount')} ฿{Number(svc.deposit_amount ?? merchant.default_deposit).toLocaleString()}
                              </span>
                            </div>

                            {/* Staff providing this service */}
                            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                ผู้ให้บริการ ({eligibleStaff.length}):{' '}
                                {eligibleStaff.length > 0
                                  ? eligibleStaff.map((s) => s.nickname || s.name).join(', ')
                                  : 'ยังไม่ได้ผูกกับช่างใด'}
                              </p>
                            </div>
                          </div>

                          <div className="flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2">
                            <button
                              onClick={() => {
                                setEditingService(svc)
                                setIsServiceModalOpen(true)
                              }}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={t('edit')}
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteService(svc.id)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title={t('delete')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          </div>
        )}


      </main>

      {/* MOBILE FIXED BOTTOM NAVIGATION BAR */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 shadow-lg safe-area-bottom">
        <div className="grid grid-cols-4 gap-1 items-center justify-around">
          {/* Tab 1: คิวงาน */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('bookings')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              activeTab === 'bookings'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <CalendarIcon className="w-5 h-5" />
              {branchBookings.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
                  {branchBookings.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">คิวงาน</span>
            {activeTab === 'bookings' && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
            )}
          </button>

          {/* Tab 2: บล็อกเวลา */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('block-slots')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              activeTab === 'block-slots'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Lock className="w-5 h-5" />
              {slots.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] bg-rose-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
                  {slots.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">บล็อกเวลา</span>
            {activeTab === 'block-slots' && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
            )}
          </button>

          {/* Tab 3: ช่าง/บริการ */}
          <button
            type="button"
            onClick={() => {
              setActiveTab('services')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer relative ${
              activeTab === 'services'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div className="relative">
              <Users className="w-5 h-5" />
              {services.length > 0 && (
                <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] bg-emerald-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
                  {services.length}
                </span>
              )}
            </div>
            <span className="text-[10px] mt-0.5 leading-tight">ช่าง/บริการ</span>
            {activeTab === 'services' && (
              <span className="w-1 h-1 rounded-full bg-indigo-600 dark:bg-indigo-400 mt-0.5" />
            )}
          </button>

          {/* Tab 4: ตั้งค่าร้าน */}
          <Link
            href={`/${slug}/settings`}
            className="flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-0.5 leading-tight">ตั้งค่าร้าน</span>
          </Link>
        </div>
      </nav>

      {/* Slip Image Fullscreen Modal */}
      <AnimatePresence>
        {/* Slip Preview Modal */}
        {selectedSlipUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedSlipUrl(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="max-w-md w-full bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 space-y-3 shadow-2xl safe-area-bottom"
            >
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-900 dark:text-white">{t('viewSlip')}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSlipUrl(null)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <img
                src={selectedSlipUrl}
                alt="Slip Fullsize"
                className="w-full max-h-[65vh] object-contain rounded-2xl border border-slate-200 dark:border-slate-800"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Staff Add/Edit Modal (with Per-Staff Service Selection) */}
      <AnimatePresence>
        {isStaffModalOpen && editingStaff && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onSubmit={handleSaveStaff}
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                    <Users className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {editingStaff.id ? t('editStaffTitle') : t('addNewStaffBtn')}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'กำหนดข้อมูลช่าง และบริการที่รับผิดชอบ' : 'Staff details & assigned services'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95 text-xs font-bold cursor-pointer"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('staffName')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="เช่น สมศักดิ์ แซ่ตั้ง"
                      value={editingStaff.name || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('staffNickname')}</label>
                    <input
                      type="text"
                      placeholder="เช่น ช่างเอก, น้องฟ้า"
                      value={editingStaff.nickname || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, nickname: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('staffRoleTitle')}</label>
                    <input
                      type="text"
                      placeholder="เช่น Senior Stylist, ช่างทำเล็บ"
                      value={editingStaff.role_title || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, role_title: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('staffBranch')} <span className="text-rose-500">*</span>
                    </label>
                    <CustomDropdown
                      value={editingStaff.branch_id || (branches[0]?.id || '')}
                      onChange={(val) => setEditingStaff({ ...editingStaff, branch_id: val || null })}
                      prefixIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                      dropdownWidth="w-full"
                      className="w-full"
                      options={branches.map((b) => ({
                        value: b.id,
                        label: b.name,
                        sublabel: b.address || undefined,
                        icon: <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />,
                      }))}
                    />
                  </div>
                </div>

                {/* Per-Staff Services Checklist */}
                <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                  <label className="text-xs font-bold text-slate-900 dark:text-white block">
                    {t('staffServices')} (เลือกบริการที่ช่างท่านนี้ทำได้) <span className="text-rose-500">*</span>
                  </label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200 dark:border-slate-800 custom-scrollbar">
                    {services.map((svc) => {
                      const isChecked = editingStaff.serviceIds?.includes(svc.id)
                      return (
                        <label
                          key={svc.id}
                          className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white dark:hover:bg-slate-900 cursor-pointer text-xs transition border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const current = editingStaff.serviceIds || []
                              const next = e.target.checked
                                ? [...current, svc.id]
                                : current.filter((id) => id !== svc.id)
                              setEditingStaff({ ...editingStaff, serviceIds: next })
                            }}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                          <span className="font-semibold text-slate-800 dark:text-slate-200 flex-1">{svc.title}</span>
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">฿{Number(svc.price).toLocaleString()}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 safe-area-bottom">
                {editingStaff.id ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (editingStaff.id) {
                        handleDeleteStaff(editingStaff.id)
                        setIsStaffModalOpen(false)
                      }
                    }}
                    className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 rounded-xl text-xs font-semibold flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete')}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
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
              </div>
            </motion.form>
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
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onSubmit={handleSaveService}
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 border border-indigo-100 dark:border-indigo-900/50 shadow-2xs">
                    <Sparkles className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      {editingService.id ? t('editServiceTitle') : t('addNewServiceBtn')}
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                      {lang === 'th' ? 'กำหนดชื่อ ราคา ระยะเวลา และมัดจำ' : 'Service name, price, duration & deposit'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
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
                    {t('serviceName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตัดผม + สระไดร์"
                    value={editingService.title || ''}
                    onChange={(e) => setEditingService({ ...editingService, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('serviceDesc')}</label>
                  <textarea
                    rows={2}
                    placeholder="รายละเอียดเพิ่มเติมของบริการ..."
                    value={editingService.description || ''}
                    onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('durationMin')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={editingService.duration_min !== undefined ? editingService.duration_min : 60}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setEditingService({ ...editingService, duration_min: val ? Number(val) : 0 })
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('servicePrice')} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      required
                      value={editingService.price !== undefined ? editingService.price : 0}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '')
                        setEditingService({ ...editingService, price: val ? Number(val) : 0 })
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('serviceDeposit')}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={`฿${merchant.default_deposit}`}
                    value={editingService.deposit_amount !== undefined && editingService.deposit_amount !== null ? editingService.deposit_amount : ''}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '')
                      setEditingService({ ...editingService, deposit_amount: val ? Number(val) : undefined })
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 safe-area-bottom">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
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

        {/* MANUAL BOOKING MODAL (Phone / Walk-in) */}
        {isManualBookingModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onSubmit={handleCreateManualBooking}
              className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0 border border-emerald-100 dark:border-emerald-900/50 shadow-2xs">
                    <PhoneCall className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">{t('manualBookingTitle')}</h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">ลงตารางนัดหมายสำหรับลูกค้าที่โทรจอง หรือจองหน้าร้าน</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualBookingModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95 text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {/* Branch & Staff Selection (Optional / Multi-Branch) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('selectBranch')}
                    </label>
                    <CustomDropdown
                      value={manualBookingForm.branch_id || ''}
                      onChange={(val) => {
                        setManualBookingForm({
                          ...manualBookingForm,
                          branch_id: val,
                          selectedSlot: null,
                        })
                      }}
                      prefixIcon={<Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      dropdownWidth="w-full"
                      className="w-full"
                      options={[
                        {
                          value: '',
                          label: merchant.branch_name || 'สาขาหลัก',
                          sublabel: 'สาขาเริ่มต้นของร้าน',
                          icon: <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                        },
                        ...branches.map((b) => ({
                          value: b.id,
                          label: b.name,
                          sublabel: b.address || undefined,
                          icon: <Building2 className="w-4 h-4 text-slate-400" />,
                        })),
                      ]}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      {t('selectStaff')}
                    </label>
                    <CustomDropdown
                      value={manualBookingForm.staff_id || ''}
                      onChange={(val) => {
                        setManualBookingForm({
                          ...manualBookingForm,
                          staff_id: val,
                          selectedSlot: null,
                        })
                      }}
                      prefixIcon={<Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                      dropdownWidth="w-full"
                      className="w-full"
                      options={[
                        {
                          value: '',
                          label: t('anyStaff'),
                          sublabel: 'ให้ระบบเลือกช่างที่ว่างให้',
                          icon: <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                        },
                        ...staffList
                          .filter((s) => !manualBookingForm.branch_id || s.branch_id === manualBookingForm.branch_id)
                          .map((s) => ({
                            value: s.id,
                            label: s.nickname ? `${s.nickname} (${s.name})` : s.name,
                            sublabel: s.role_title || undefined,
                            avatarUrl: s.avatar_url || undefined,
                            avatarFallback: s.nickname ? s.nickname.charAt(0) : s.name.charAt(0),
                          })),
                      ]}
                    />
                  </div>
                </div>

                {/* Service Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('selectService')} <span className="text-rose-500">*</span>
                  </label>
                  <CustomDropdown
                    value={manualBookingForm.service_id || ''}
                    onChange={(svcId) => {
                      const s = services.find((x) => x.id === svcId)
                      setManualBookingForm({
                        ...manualBookingForm,
                        service_id: svcId,
                        deposit_amount: String(s?.deposit_amount ?? merchant.default_deposit ?? 100),
                        selectedSlot: null,
                      })
                    }}
                    prefixIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    dropdownWidth="w-full"
                    className="w-full"
                    placeholder="-- เลือกบริการที่ต้องการ --"
                    options={services
                      .filter((s) => {
                        if (!manualBookingForm.staff_id) return true
                        const stf = staffList.find((x) => x.id === manualBookingForm.staff_id)
                        return stf?.staff_services?.some((ss) => ss.service_id === s.id)
                      })
                      .map((s) => ({
                        value: s.id,
                        label: s.title,
                        sublabel: `${s.duration_min} นาที • ฿${Number(s.price).toLocaleString()} (มัดจำ ฿${s.deposit_amount ?? 100})`,
                        icon: <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
                      }))}
                  />
                </div>

                {/* Date Selection */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('bookingDate')} <span className="text-rose-500">*</span>
                  </label>
                  <FormattedDateInput
                    value={manualBookingForm.date}
                    onChange={(val) => setManualBookingForm({ ...manualBookingForm, date: val, selectedSlot: null })}
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
                          : `Select Available Slot (${selectedManualService?.duration_min || 30} mins)`} <span className="text-rose-500">*</span>
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
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 custom-scrollbar">
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
                            className={`p-2.5 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center min-h-[48px] cursor-pointer ${isSelected
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
                    {t('customer')} (ชื่อลูกค้า) <span className="text-rose-500">*</span>
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
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 safe-area-bottom">
                <button
                  type="button"
                  onClick={() => setIsManualBookingModalOpen(false)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold active:scale-95 transition cursor-pointer shadow-2xs"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
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
