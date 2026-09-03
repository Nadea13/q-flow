'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Clock,
  ChevronRight,
  Check,
  Store,
  Phone,
  User,
  MessageSquare,
  FileText,
  AlertCircle,
  ArrowLeft,
  Building2,
  Users,
  Sparkles,
  Search,
  X,
  Ticket,
  RefreshCw
} from 'lucide-react'
import { format, startOfToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { createBookingAction, searchCustomerBookingsAction } from '@/app/actions/booking'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { BookingCalendar } from '@/components/BookingCalendar'
import { SegmentedTimeSlotPicker } from '@/components/SegmentedTimeSlotPicker'
import { TurnstileWidget } from '@/components/TurnstileWidget'
import type { Merchant, Service, TimeSlotOption, Branch, Staff } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function BookingPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const router = useRouter()
  const { t, lang } = useLanguage()

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loadingShop, setLoadingShop] = useState(true)

  // Selection states
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)

  // Step state (1: Branch/Staff/Service, 2: Slot, 3: Customer Info)
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Date & Slot state
  const today = startOfToday()
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<TimeSlotOption[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotOption | null>(null)
  const [turnstileToken, setTurnstileToken] = useState<string>('')

  // Customer form state
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerLineId, setCustomerLineId] = useState('')
  const [customerNotes, setCustomerNotes] = useState('')
  const [lineCustomerProfile, setLineCustomerProfile] = useState<{
    displayName: string
    pictureUrl?: string
    userId: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Queue Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[] | null>(null)
  const [searchError, setSearchError] = useState<string | null>(null)

  async function handleSearchQueue(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    setIsSearching(true)
    setSearchError(null)

    const res = await searchCustomerBookingsAction(slug, trimmed)
    setIsSearching(false)

    if (!res.success) {
      setSearchError(res.error || 'เกิดข้อผิดพลาดในการค้นหา')
      setSearchResults([])
      return
    }

    if (!res.bookings || res.bookings.length === 0) {
      setSearchError('ไม่พบคิวที่ตรงกับข้อมูลนี้ กรุณาตรวจสอบเบอร์โทรศัพท์หรือรหัสคิวอีกครั้ง')
      setSearchResults([])
      return
    }

    // Navigate directly to the checking page of the found booking
    router.push(`/${slug}/checking/${res.bookings[0].id}`)
  }

  // 1. Load Merchant, Branches, Staff & Services
  useEffect(() => {
    async function loadShop() {
      const supabase = createClient()
      const { data: mData, error: mErr } = await supabase
        .from('shops')
        .select('*')
        .eq('slug', slug)
        .single()

      if (mErr || !mData) {
        setLoadingShop(false)
        return
      }

      setMerchant(mData)

      // Fetch branches
      const { data: bData } = await supabase
        .from('branches')
        .select('*')
        .eq('shop_id', mData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      const loadedBranches = bData || []
      setBranches(loadedBranches)
      if (loadedBranches.length > 0) {
        setSelectedBranch(loadedBranches[0])
      }

      // Fetch staff with assigned services
      const { data: stData } = await supabase
        .from('staff')
        .select('*, branch:branches(*), staff_services(*, service:services(*))')
        .eq('shop_id', mData.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      setStaffList((stData as unknown as Staff[]) || [])

      // Fetch services
      const { data: sData } = await supabase
        .from('services')
        .select('*')
        .eq('shop_id', mData.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      setServices(sData || [])
      setLoadingShop(false)
    }

    loadShop()

    // Real-time listener for shop profile, services, and staff changes
    const supabase = createClient()
    const shopChannel = supabase
      .channel(`live-shop-data-${slug}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        () => {
          loadShop()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff' },
        () => {
          loadShop()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branches' },
        () => {
          loadShop()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'shops' },
        () => {
          loadShop()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(shopChannel)
    }

    // 1.1 Load cached customer info from localStorage
    try {
      const savedInfo = localStorage.getItem('qflow_customer_info')
      if (savedInfo) {
        const parsed = JSON.parse(savedInfo as string)
        if (parsed.name) setCustomerName(parsed.name)
        if (parsed.phone) setCustomerPhone(parsed.phone)
        if (parsed.lineId) setCustomerLineId(parsed.lineId)
      }
    } catch { }

    // Try to auto-fill LINE Profile via LIFF
    async function checkLiff() {
      try {
        const { initLiff } = await import('@/lib/liff')
        const res = await initLiff()
        if (res.success && res.profile) {
          setLineCustomerProfile(res.profile)
          if (res.profile.displayName) setCustomerName((prev) => prev || res.profile?.displayName || '')
          if (res.profile.userId) setCustomerLineId((prev) => prev || res.profile?.userId || '')
        }
      } catch {
        // LIFF fallback
      }
    }
    checkLiff()
  }, [slug])

  // 2. Fetch Slots whenever date, service, branch, or staff changes
  useEffect(() => {
    if (!selectedService || !slug) return

    let isMounted = true

    async function loadSlots() {
      setLoadingSlots(true)
      try {
        let url = `/api/slots?merchantSlug=${slug}&date=${selectedDate}&duration=${selectedService?.duration_min || 60}`
        if (selectedBranch) {
          url += `&branchId=${selectedBranch.id}`
        }
        if (selectedStaff) {
          url += `&staffId=${selectedStaff.id}`
        }

        const res = await fetch(url)
        const json = await res.json()
        if (isMounted) {
          setSlots(json.slots || [])
        }
      } catch (err) {
        console.error('Failed to load slots', err)
      } finally {
        if (isMounted) {
          setLoadingSlots(false)
        }
      }
    }

    loadSlots()

    // Real-time slot listener: Whenever any booking or slot block is added/cancelled/updated, re-fetch slots instantly
    const supabase = createClient()
    const realtimeChannel = supabase
      .channel(`live-slots-${slug}-${selectedDate}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          loadSlots()
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'slots' },
        () => {
          loadSlots()
        }
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(realtimeChannel)
    }
  }, [slug, selectedDate, selectedService, selectedBranch, selectedStaff])

  // Handle Booking Submit
  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || !selectedSlot) return

    const isTurnstileConfigured = Boolean(
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY &&
      process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY !== '0x4AAAAAA'
    )

    if (isTurnstileConfigured && !turnstileToken) {
      setErrorMessage(
        lang === 'th'
          ? 'กรุณายืนยันความปลอดภัยผ่าน Cloudflare Turnstile ก่อนทำการจอง'
          : 'Please complete Cloudflare security verification before confirming.'
      )
      return
    }

    setSubmitting(true)
    setErrorMessage(null)

    // Save customer contact info in localStorage for future bookings
    try {
      localStorage.setItem(
        'qflow_customer_info',
        JSON.stringify({
          name: customerName,
          phone: customerPhone,
          lineId: customerLineId,
        })
      )
    } catch { }

    const res = await createBookingAction({
      merchantSlug: slug,
      serviceId: selectedService.id,
      branchId: selectedBranch?.id || undefined,
      staffId: selectedStaff?.id || undefined,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      customerName,
      customerPhone,
      customerLineId: customerLineId || undefined,
      customerNotes: customerNotes || undefined,
      turnstileToken: turnstileToken || undefined,
    })

    setSubmitting(false)

    if (!res.success || !res.bookingId) {
      setErrorMessage(res.error || t('errorOccurred'))
      return
    }

    router.push(`/${slug}/booking/${res.bookingId}`)
  }

  if (loadingShop) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">ไม่พบร้านค้านี้</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Shop not found or inactive.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-linear-to-tr from-indigo-600 via-indigo-700 to-indigo-900 dark:from-indigo-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-end sm:justify-center items-center p-0 sm:p-6 font-sans antialiased">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200/90 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl h-[80vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden">
        {/* Mobile Pull Indicator */}
        <div className="sm:hidden flex items-center justify-center pt-3 pb-1 shrink-0">
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
        </div>

        {/* Inner Scrollable Container */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-5 grow overscroll-contain">
          {/* Header (Matching Onboarding & Checkout Layout) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : merchant.logo_url ? (
              <img
                src={merchant.logo_url}
                alt={merchant.name}
                className="w-8 h-8 aspect-square rounded-xl object-cover border border-slate-200 dark:border-slate-800 shadow-2xs shrink-0"
              />
            ) : (
              <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Store className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {merchant.name}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {merchant.open_time.slice(0, 5)} - {merchant.close_time.slice(0, 5)} น.
                {merchant.has_break && merchant.break_start_time && merchant.break_end_time && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1">
                    (Break {merchant.break_start_time.slice(0, 5)}-{merchant.break_end_time.slice(0, 5)})
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NavbarControls />
          </div>
        </div>

        {/* Quick Search Queue Bar */}
        {step === 1 && (
          <div className="space-y-2.5 pt-1">
            <form onSubmit={handleSearchQueue} className="flex items-center gap-2">
              <div className="relative grow">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (searchError) setSearchError(null)
                  }}
                  placeholder="ค้นหาคิวของคุณ (เบอร์โทร หรือ รหัสคิว #...)"
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setSearchResults(null)
                      setSearchError(null)
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isSearching || !searchQuery.trim()}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95"
              >
                {isSearching ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>ค้นหา</span>
                  </>
                )}
              </button>
            </form>

            {/* Search Results Display */}
            {searchResults !== null && (
              <div className="bg-slate-50 dark:bg-slate-850/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 space-y-2.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Ticket className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>ผลการค้นหา ({searchResults.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchResults(null)
                      setSearchError(null)
                    }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {searchResults.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">
                    <p className="font-semibold text-slate-700 dark:text-slate-300">ไม่พบคิวที่ตรงกับข้อมูล</p>
                    <p className="text-[11px] mt-0.5">กรุณาตรวจสอบเบอร์โทรศัพท์หรือรหัสคิวอีกครั้ง</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((b) => {
                      const startTime = new Date(b.start_time)
                      const isConfirmed = b.status === 'confirmed' || Number(b.deposit_amount) <= 0
                      const isCancelled = b.status === 'cancelled'
                      const isCompleted = b.status === 'completed'

                      return (
                        <div
                          key={b.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 px-1.5 py-0.5 rounded-md">
                                #{b.id.slice(0, 8).toUpperCase()}
                              </span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md uppercase ${
                                isCompleted
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
                                  : isConfirmed
                                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                                  : isCancelled
                                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
                                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                              }`}>
                                {isCompleted ? 'เสร็จสิ้น' : isConfirmed ? 'ยืนยันแล้ว' : isCancelled ? 'ยกเลิก' : 'รอชำระ'}
                              </span>
                            </div>
                            <div className="font-bold text-xs text-slate-900 dark:text-white truncate mt-1">
                              {b.services?.title || 'บริการ'}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              📅 {format(startTime, 'dd/MM/yyyy HH:mm น.')}
                            </div>
                          </div>

                          <Link
                            href={`/${slug}/checking/${b.id}`}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold shrink-0 transition flex items-center gap-1 active:scale-95"
                          >
                            <span>ดูตั๋วคิว</span>
                            <ChevronRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {searchError && (
              <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>
        )}

        {/* Progress Bar & Step Subtitle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-800 dark:text-slate-200">
              {step === 1 && t('step1Title')}
              {step === 2 && t('step2Title')}
              {step === 3 && t('step3Title')}
            </span>
            <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
              {t('stepOf', { step })}
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        <main className="w-full">

          <AnimatePresence mode="wait">
            {/* STEP 1: BRANCH, STAFF & SERVICE SELECTION */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Branch Selector (Directly from branches table) */}
                {branches.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{t('selectBranch')}</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {branches.map((b) => {
                        const isSel = (selectedBranch ? selectedBranch.id === b.id : branches[0]?.id === b.id)
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => {
                              setSelectedBranch(b)
                              setSelectedStaff(null)
                            }}
                            className={`p-2.5 rounded-xl border text-left text-xs transition active:scale-98 ${isSel
                                ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                              }`}
                          >
                            <div className="font-semibold">{b.name}</div>
                            {b.address && <div className="text-[10px] text-slate-400 mt-0.5 truncate">{b.address}</div>}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Staff / Provider Selector (if staff exist) */}
                {staffList.length > 0 && (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                      <span>{t('selectStaff')}</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedStaff(null)}
                        className={`p-2.5 rounded-xl border text-center text-xs transition active:scale-98 flex flex-col items-center justify-center min-h-[52px] ${selectedStaff === null
                            ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                          }`}
                      >
                        <Sparkles className="w-4 h-4 text-amber-500 mb-1" />
                        <span>{t('anyStaff')}</span>
                      </button>
                      {staffList
                        .filter((stf) => !selectedBranch || stf.branch_id === selectedBranch.id)
                        .map((stf) => {
                          const isSel = selectedStaff?.id === stf.id
                          return (
                            <button
                              key={stf.id}
                              type="button"
                              onClick={() => setSelectedStaff(stf)}
                              className={`p-2 rounded-xl border text-center text-xs transition active:scale-98 flex flex-col items-center justify-center min-h-[52px] ${isSel
                                  ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 font-bold text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-500'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                                }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center text-[10px] mb-1">
                                {stf.nickname ? stf.nickname.charAt(0) : stf.name.charAt(0)}
                              </div>
                              <span className="font-semibold truncate max-w-full">
                                {stf.nickname || stf.name}
                              </span>
                              <span className="text-[9px] text-slate-400 truncate max-w-full">
                                {stf.role_title || 'ช่าง'}
                              </span>
                            </button>
                          )
                        })}
                    </div>
                  </div>
                )}

                {/* Service list (filtered by selected staff if any) */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-900 dark:text-white block px-1">
                    {t('selectService')} ({
                      services.filter((s) => {
                        if (!selectedStaff) return true
                        return selectedStaff.staff_services?.some((ss) => ss.service_id === s.id)
                      }).length
                    })
                  </label>
                  {services
                    .filter((service) => {
                      if (!selectedStaff) return true
                      return selectedStaff.staff_services?.some((ss) => ss.service_id === service.id)
                    })
                    .map((service) => {
                      const isSelected = selectedService?.id === service.id
                      const deposit = service.deposit_amount ?? merchant.default_deposit

                      return (
                        <div
                          key={service.id}
                          onClick={() => {
                            setSelectedService(service)
                            setStep(2)
                          }}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer relative active:scale-[0.99] ${isSelected
                              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-500 ring-1 ring-indigo-500'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-2xs'
                            }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                                  {service.title}
                                </h3>
                                {isSelected && (
                                  <span className="w-5 h-5 rounded-full bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  </span>
                                )}
                              </div>
                              {service.description && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                  {service.description}
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-3 text-xs">
                                <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60 font-semibold">
                                  <Clock className="w-3 h-3" />
                                  {service.duration_min} {t('minutes')}
                                </span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">
                                  ฿{Number(service.price).toLocaleString()}
                                </span>
                                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {Number(deposit) > 0 ? `(${t('depositAmount')} ฿${Number(deposit).toLocaleString()})` : `(${lang === 'th' ? 'ไม่มีมัดจำ' : 'No Deposit'})`}
                                </span>
                              </div>
                            </div>

                            <div className="self-center text-slate-400 dark:text-slate-500">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: DATE & TIME SLOT SELECTION */}
            {step === 2 && selectedService && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-5"
              >
                {/* Selected Service Recap */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-2xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400 tracking-wider">
                      {t('selectedService')}
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedService.title}</p>
                    {(selectedBranch || selectedStaff) && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedBranch ? `สาขา: ${selectedBranch.name}` : ''}
                        {selectedBranch && selectedStaff ? ' • ' : ''}
                        {selectedStaff ? `ช่าง: ${selectedStaff.nickname || selectedStaff.name}` : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    {t('change')}
                  </button>
                </div>

                {/* Interactive Month & Date Calendar */}
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-2">
                    {t('selectDate')}
                  </label>
                  <BookingCalendar
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    closedDays={merchant.closed_days || []}
                    lang={lang}
                  />
                </div>

                {/* Time Slot Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('selectTimeSlot')} ({selectedService.duration_min} {t('minutes')})
                    </label>
                    {loadingSlots && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400 animate-pulse font-medium">
                        {t('calculatingSlots')}
                      </span>
                    )}
                  </div>

                  {loadingSlots ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="h-11 bg-slate-200 dark:bg-slate-900 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl">
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t('noAvailableSlots')}</p>
                    </div>
                  ) : (
                    <div className="p-2 sm:p-3 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40">
                      <SegmentedTimeSlotPicker
                        slots={slots}
                        selectedSlot={selectedSlot}
                        onSelectSlot={(slot) => setSelectedSlot(slot)}
                        durationMin={selectedService.duration_min}
                        accentColor="indigo"
                        lang={lang}
                      />
                    </div>
                  )}
                </div>

                {/* Next Button */}
                <button
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-98"
                >
                  <span>{t('nextCustomerInfo')}</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* STEP 3: CUSTOMER FORM & CONFIRMATION */}
            {step === 3 && selectedService && selectedSlot && (
              <motion.form
                key="step3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmitBooking}
                className="space-y-4"
              >
                {/* Booking Summary Box */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                    {t('bookingSummary')}
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{t('service')}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedService.title}</span>
                  </div>
                  {selectedBranch && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{t('selectBranch')}:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBranch.name}</span>
                    </div>
                  )}
                  {selectedStaff && (
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-400">{t('selectStaff')}:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {selectedStaff.nickname || selectedStaff.name} ({selectedStaff.role_title})
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{t('dateTime')}:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-300">
                      {format(new Date(selectedSlot.startTime), 'dd/MM/yyyy')} ({selectedSlot.displayTime} น.)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{t('fullPrice')}:</span>
                    <span className="text-slate-800 dark:text-slate-200">฿{Number(selectedService.price).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">{t('depositToPay')}:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {Number(selectedService.deposit_amount ?? merchant.default_deposit) > 0
                        ? `฿${Number(selectedService.deposit_amount ?? merchant.default_deposit).toLocaleString()}`
                        : (lang === 'th' ? '฿0 (ไม่มีมัดจำ)' : '฿0 (No Deposit)')}
                    </span>
                  </div>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {/* LINE Profile Auto-Fill Indicator */}
                {lineCustomerProfile && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-2.5">
                      {lineCustomerProfile.pictureUrl ? (
                        <img
                          src={lineCustomerProfile.pictureUrl}
                          alt={lineCustomerProfile.displayName}
                          className="w-8 h-8 rounded-full object-cover border border-emerald-500/40"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-[#06C755] text-white font-bold text-xs flex items-center justify-center">
                          L
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                          <span>{lineCustomerProfile.displayName}</span>
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">(LINE Profile)</span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          {lang === 'th' ? 'ดึงข้อมูลและเชื่อมต่อตั๋วคิวเข้า LINE อัตโนมัติ' : 'Linked for instant LINE booking passes'}
                        </p>
                      </div>
                    </div>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                )}

                {/* Input Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {t('customerName')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        required
                        placeholder={t('customerNamePlaceholder')}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {t('customerPhone')} <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Phone className="w-4 h-4" />
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder={t('customerPhonePlaceholder')}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {t('customerLineId')}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        placeholder={t('customerLineIdPlaceholder')}
                        value={customerLineId}
                        onChange={(e) => setCustomerLineId(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1">
                      {t('customerNotes')}
                    </label>
                    <div className="relative">
                      <div className="absolute top-2.5 left-0 pl-3 pointer-events-none text-slate-400 dark:text-slate-500">
                        <FileText className="w-4 h-4" />
                      </div>
                      <textarea
                        rows={2}
                        placeholder={t('customerNotesPlaceholder')}
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        className="resize-none w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Cloudflare Turnstile Bot Protection Widget */}
                <TurnstileWidget
                  onVerify={(token) => {
                    setTurnstileToken(token)
                    setErrorMessage(null)
                  }}
                  onExpire={() => setTurnstileToken('')}
                  onError={() => setTurnstileToken('')}
                />

                {(() => {
                  const isTurnstileConfigured = Boolean(
                    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY &&
                    process.env.NEXT_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY !== '0x4AAAAAA'
                  )
                  const isSubmitDisabled = submitting || (isTurnstileConfigured && !turnstileToken)

                  return (
                    <button
                      type="submit"
                      disabled={isSubmitDisabled}
                      className={`w-full py-3.5 rounded-xl font-semibold text-sm shadow-md flex items-center justify-center gap-2 transition active:scale-98 ${
                        isSubmitDisabled
                          ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 cursor-pointer'
                      }`}
                    >
                      {submitting ? (
                        <span>{t('submittingBooking')}</span>
                      ) : (
                        <>
                          <span>
                            {Number(selectedService.deposit_amount ?? merchant.default_deposit) <= 0
                              ? (lang === 'th' ? 'ยืนยันการจองคิว' : 'Confirm Booking')
                              : t('confirmAndPayBtn')}
                          </span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )
                })()}
              </motion.form>
            )}
          </AnimatePresence>
        </main>

        {/* Powered by QFlow & Legal Links Footer */}
        <div className="flex flex-col items-center justify-center gap-1.5 text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
          <span>Powered by <span className='font-bold'>QFlow</span></span>
          <div className="flex items-center gap-2">
            <Link href="/terms" target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition">
              {lang === 'th' ? 'เงื่อนไขบริการ' : 'Terms of Service'}
            </Link>
            <span>•</span>
            <Link href="/privacy" target="_blank" className="hover:text-indigo-600 dark:hover:text-indigo-400 hover:underline transition">
              {lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
            </Link>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
