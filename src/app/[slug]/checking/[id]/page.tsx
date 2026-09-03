'use client'

import { useEffect, useState, use, useRef } from 'react'
import Link from 'next/link'
import { toPng } from 'html-to-image'
import {
  Copy,
  Download,
  UploadCloud,
  AlertCircle,
  Check,
  ShieldCheck,
  Clock,
  Hourglass,
  RefreshCw,
  Store
} from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { generatePromptPayQR } from '@/lib/promptpay'
import { verifyAndConfirmBookingAction, expireBookingAction } from '@/app/actions/booking'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'
import { formatBangkokDate, formatBangkokTime, formatBangkokDateTime } from '@/lib/date-utils'
import type { Booking, Merchant, Service } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string; id: string }>
}

export default function BookingCheckingPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const { slug, id } = resolvedParams
  const { t, lang } = useLanguage()

  const [booking, setBooking] = useState<Booking | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [service, setService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(true)

  // 10-Minute Expiry Countdown Timer state
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [isExpired, setIsExpired] = useState(false)

  // PromptPay QR state
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [copiedPayId, setCopiedPayId] = useState(false)
  const [copiedBookingId, setCopiedBookingId] = useState(false)

  // Slip upload state
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [slipPreview, setSlipPreview] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [savingTicket, setSavingTicket] = useState(false)
  const ticketRef = useRef<HTMLDivElement>(null)

  // Scroll state for sticky navbar styling
  const [isScrolled, setIsScrolled] = useState(false)
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  async function handleSaveTicketImage() {
    if (!ticketRef.current || savingTicket) return
    try {
      setSavingTicket(true)
      const dataUrl = await toPng(ticketRef.current, {
        cacheBust: true,
        quality: 0.95,
        pixelRatio: 2,
      })
      const link = document.createElement('a')
      link.download = `qflow-ticket-${booking?.id.slice(0, 8).toUpperCase() || 'pass'}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Failed to save ticket image:', err)
    } finally {
      setSavingTicket(false)
    }
  }

  // Load Booking Data
  useEffect(() => {
    const supabase = createClient()

    async function loadData() {
      const { data: bData, error } = await supabase
        .from('bookings')
        .select('*, shops(*), services(*), branch:branches(*), staff:staff(*)')
        .eq('id', id)
        .single()

      if (error || !bData) {
        setLoading(false)
        return
      }

      setBooking(bData)
      setMerchant((bData.shops || bData.merchants))
      setService(bData.services)

      // Auto-confirm 0-deposit bookings
      const isZeroDeposit = Number(bData.deposit_amount) <= 0
      if (bData.status === 'pending_payment' && isZeroDeposit) {
        bData.status = 'confirmed'
        supabase
          .from('bookings')
          .update({ status: 'confirmed', updated_at: new Date().toISOString() })
          .eq('id', id)
          .then()
      }

      // Check if already expired or cancelled
      const createdAt = new Date(bData.created_at).getTime()
      const diff = Math.max(0, Math.floor((createdAt + 10 * 60 * 1000 - Date.now()) / 1000))

      if (!isZeroDeposit && (bData.status === 'cancelled' || (bData.status === 'pending_payment' && diff <= 0))) {
        setIsExpired(true)
        if (bData.status === 'pending_payment') {
          expireBookingAction(id)
          bData.status = 'cancelled'
        }
      }

      // Generate PromptPay QR if pending, not 0 deposit, and not expired
      if (bData.status === 'pending_payment' && !isZeroDeposit && (bData.shops || bData.merchants) && diff > 0) {
        try {
          const targetPromptPay = bData.branch?.promptpay_id || (bData.shops || bData.merchants).promptpay_id
          const qrRes = await generatePromptPayQR(
            targetPromptPay,
            Number(bData.deposit_amount)
          )
          setQrDataUrl(qrRes.qrDataUrl)
        } catch (qrErr) {
          console.error('Failed to generate QR', qrErr)
        }
      }

      setLoading(false)
    }

    loadData()

    // Real-time listener for queue status changes
    const channel = supabase
      .channel(`checking-live-${id}`)
      .on(
        'postgres_changes' as const,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${id}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as { status?: string }
          if (updated && updated.status) {
            setBooking((prev) => (prev ? { ...prev, ...payload.new, staff: prev.staff, branch: prev.branch, shops: prev.shops, services: prev.services } : null))

            if (updated.status === 'confirmed') {
              try {
                const confetti = (await import('canvas-confetti')).default
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                  colors: ['#4F46E5', '#10B981', '#38BDF8', '#F59E0B'],
                })
              } catch {
                // Ignore confetti error
              }
            } else if (updated.status === 'cancelled') {
              setIsExpired(true)
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  // 10-Minute Live Countdown Interval
  useEffect(() => {
    if (!booking || booking.status !== 'pending_payment' || isExpired) return

    const createdAt = new Date(booking.created_at).getTime()
    const expiresAt = createdAt + 10 * 60 * 1000 // 10 minutes

    function updateTimer() {
      const now = Date.now()
      const remainingSecs = Math.max(0, Math.floor((expiresAt - now) / 1000))
      setSecondsLeft(remainingSecs)

      if (remainingSecs <= 0) {
        setIsExpired(true)
        setBooking((prev) => (prev ? { ...prev, status: 'cancelled' } : null))
        expireBookingAction(id)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.created_at, booking?.status, isExpired, id])

  // Handle Slip file selection
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) {
      setSlipFile(file)
      setSlipPreview(URL.createObjectURL(file))
      setVerifyError(null)
    }
  }

  // Handle Verify Slip
  async function handleVerifySlip() {
    if (!slipFile) return

    setVerifying(true)
    setVerifyError(null)

    const formData = new FormData()
    formData.append('slip', slipFile)

    const res = await verifyAndConfirmBookingAction(id, formData)
    setVerifying(false)

    if (!res.success) {
      setVerifyError(res.error || t('errorOccurred'))
      return
    }

    setBooking((prev) => (prev ? { ...prev, status: 'confirmed' } : null))

    // Trigger Confetti Celebration
    try {
      const confetti = (await import('canvas-confetti')).default
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4F46E5', '#10B981', '#38BDF8', '#F59E0B'],
      })
    } catch { }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!booking || !merchant || !service) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center">
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">ไม่พบข้อมูลการจอง</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ไม่พบรหัสคิว #{id} ในระบบ กรุณาตรวจสอบลิงก์อีกครั้ง
            </p>
          </div>
          <Link
            href={`/${slug}/book`}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold inline-block shadow-xs"
          >
            {t('back')}
          </Link>
        </div>
      </div>
    )
  }

  const isZeroDeposit = Number(booking.deposit_amount) <= 0
  const isConfirmed = booking.status === 'confirmed' || isZeroDeposit
  const isCompleted = booking.status === 'completed'
  const isCancelledOrExpired = !isZeroDeposit && (isExpired || booking.status === 'cancelled')

  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)

  // Timer formatting
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0
  const seconds = secondsLeft !== null ? secondsLeft % 60 : 0
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent = secondsLeft !== null && secondsLeft <= 180 // <= 3 minutes

  return (
    <div className="min-h-screen bg-primary/10 text-slate-900 dark:text-slate-100 flex flex-col font-sans antialiased">
      <nav
        className={`w-full sticky top-0 z-40 bg-[#e7e8fa] dark:bg-[#0c102d] transition-all duration-200 ${
          isScrolled
            ? 'border-b border-primary/20 shadow-xs'
            : 'border-b border-transparent shadow-none'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="w-9 h-9 text-primary shrink-0 transition-transform active:scale-95">
              <QFlowLogo className="w-full h-full" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight">
                  QFlow
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 text-primary font-bold">
                  Queue
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {merchant.name}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[10px] px-2.5 py-1 rounded-full font-extrabold uppercase tracking-wider backdrop-blur-md ${isConfirmed || isCompleted
                  ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/40 shadow-xs'
                  : isCancelledOrExpired
                    ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400/40'
                    : 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/40'
                }`}
            >
              {isConfirmed
                ? 'ยืนยันคิวแล้ว'
                : isCompleted
                  ? 'เสร็จสิ้นบริการ'
                  : isCancelledOrExpired
                    ? 'หลุดจอง / ยกเลิก'
                    : 'รอชำระมัดจำ'}
            </span>
            <NavbarControls />
          </div>
        </div>
      </nav>

      {/* 2. Content Body Area */}
      <div className="grow relative flex flex-col justify-end sm:justify-center items-center p-0 sm:p-6 w-full overflow-hidden">
        {/* Centered Shop Logo & Info in the Backdrop when sheet is collapsed */}
        <div
          className={`absolute inset-0 pb-36 pointer-events-none flex flex-col items-center justify-center transition-all duration-500 z-0 ${
            isCollapsed ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-4'
          }`}
        >
          {merchant.logo_url ? (
            <img
              src={merchant.logo_url}
              alt={merchant.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover shadow-xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md"
            />
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center text-primary">
              <Store className="w-12 h-12" />
            </div>
          )}
          <h2 className="mt-3.5 text-lg sm:text-xl font-black text-slate-900 dark:text-white drop-shadow-xs text-center px-4 tracking-tight">
            {merchant.name}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 text-center">
            {merchant.open_time.slice(0, 5)} - {merchant.close_time.slice(0, 5)} น.
          </p>
        </div>

        {/* Main Card Container (Draggable Sheet with interactive pull-down) */}
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.7 }}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.velocity.y > 400) {
              setIsCollapsed(true)
            } else if (info.offset.y < -50 || info.velocity.y < -300) {
              setIsCollapsed(false)
            }
          }}
          animate={{
            y: isCollapsed ? '75%' : '0%',
          }}
          transition={{
            type: 'spring',
            damping: 28,
            stiffness: 280,
          }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200/90 dark:border-slate-800 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl h-[90vh] sm:h-auto sm:max-h-[90vh] flex flex-col overflow-hidden will-change-transform z-10"
        >
          {/* Mobile Pull Indicator / Drag Handle */}
          <div
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex flex-col items-center justify-center pt-3 pb-2 shrink-0 cursor-grab active:cursor-grabbing select-none group"
          >
            <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full group-hover:bg-indigo-500 transition-colors" />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium sm:hidden">
              {isCollapsed ? 'แตะหรือลากขึ้นเพื่อเปิด' : 'ลากลงหรือแตะเพื่อพับ'}
            </span>
          </div>

          {/* Inner Scrollable Container */}
          <div className="overflow-y-auto p-5 sm:p-7 space-y-5 grow overscroll-contain">

        <main className="w-full space-y-4">
          {/* 1. SUCCESS / CONFIRMED / COMPLETED STATE */}
          {isConfirmed || isCompleted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {isCompleted ? 'รับบริการเสร็จสิ้นแล้ว' : t('bookingSuccessTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {isCompleted ? 'ขอบคุณที่เลือกใช้บริการของเรา' : t('bookingSuccessSubtitle')}
                </p>
              </div>

              {/* High-End Boarding Pass / Queue Ticket */}
              <div ref={ticketRef} className="shadow-xs select-none">
                {/* 1. Top Section: Ticket Header & Main Body (No Bottom Border) */}
                <div className="bg-slate-50/70 dark:bg-slate-950/60 border-t border-x border-slate-200 dark:border-slate-800 rounded-t-3xl overflow-hidden">
                  {/* Header (Sleek Modern Indigo-Navy Gradient) */}
                  <div className="bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-5 pb-4 border-b border-indigo-900/40">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {merchant.logo_url ? (
                          <img
                            src={merchant.logo_url}
                            alt={merchant.name}
                            className="w-6 h-6 rounded-lg object-cover border border-white/20 shadow-xs"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-200">
                            {merchant.name ? merchant.name.charAt(0).toUpperCase() : <Store className="w-3.5 h-3.5 text-indigo-300" />}
                          </div>
                        )}
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200/90 truncate max-w-[200px]">
                          {merchant.name} PASS
                        </span>
                      </div>

                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-[10px] font-extrabold tracking-wider text-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        {isCompleted ? 'COMPLETED' : 'CONFIRMED'}
                      </div>
                    </div>

                    <div className="flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-semibold text-indigo-300/80 uppercase tracking-wider mb-0.5">
                          {merchant.name}
                        </div>
                        <h3 className="text-lg font-black text-white truncate tracking-tight">
                          {service.title}
                        </h3>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[9px] uppercase font-bold text-indigo-300/70 tracking-widest">
                          {t('bookingId')}
                        </div>
                        <div className="font-mono text-xs sm:text-sm font-black text-indigo-200 tracking-wider">
                          #{booking.id.slice(0, 8).toUpperCase()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Ticket Body (Clean Boarding Pass Info) */}
                  <div className="p-5 space-y-4">
                    {/* Date & Time Highlight */}
                    <div className="flex items-center justify-between pb-3.5 border-b border-slate-200/80 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block">
                          {t('dateTime')}
                        </span>
                        <span className="text-base font-extrabold text-slate-900 dark:text-white mt-0.5 block">
                          {formatBangkokDate(startTime)}
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {format(startTime, 'EEEE')}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block">
                          {t('selectTimeSlot')}
                        </span>
                        <span className="text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight mt-0.5 block">
                          {formatBangkokTime(startTime)} - {formatBangkokTime(endTime)} น.
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {service.duration_min} {t('minutes')}
                        </span>
                      </div>
                    </div>

                    {/* Clean 2-Column Metadata */}
                    <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                          {t('customer')}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">
                          {booking.customer_name}
                        </span>
                        <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">
                          {booking.customer_phone}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                          {t('depositAmount')}
                        </span>
                        <span className="font-black text-emerald-600 dark:text-emerald-400 text-sm block">
                          ฿{Number(booking.deposit_amount).toLocaleString()} {t('baht')}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          {isCompleted ? 'เสร็จสิ้น' : 'ยืนยันเรียบร้อย'}
                        </span>
                      </div>

                      {booking.staff && (
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                            ช่าง / ผู้ให้บริการ
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {booking.staff.name}
                          </span>
                        </div>
                      )}

                      {booking.branch && (
                        <div>
                          <span className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase block mb-0.5">
                            สาขา
                          </span>
                          <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">
                            {booking.branch.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Middle Section: Truly Inward Curved Cutout Notches with Perforated Tear Line (No Straight Border Line) */}
                <div className="flex items-center h-6 -my-[1px] relative select-none">
                  {/* Left Notch SVG (Curves border inward with zero vertical straight line) */}
                  <svg width="14" height="24" viewBox="0 0 14 24" fill="none" className="shrink-0 text-slate-200 dark:text-slate-800">
                    <path d="M0 0 A12 12 0 0 1 0 24 H14 V0 Z" className="fill-slate-50/70 dark:fill-slate-950/60" />
                    <path d="M0 0 A12 12 0 0 1 0 24" stroke="currentColor" strokeWidth="1" fill="none" />
                  </svg>

                  {/* Dashed Tear Line */}
                  <div className="grow border-b border-dashed border-slate-300 dark:border-slate-700 mx-1" />

                  {/* Right Notch SVG (Curves border inward with zero vertical straight line) */}
                  <svg width="14" height="24" viewBox="0 0 14 24" fill="none" className="shrink-0 text-slate-200 dark:text-slate-800">
                    <path d="M14 0 A12 12 0 0 0 14 24 H0 V0 Z" className="fill-slate-50/70 dark:fill-slate-950/60" />
                    <path d="M14 0 A12 12 0 0 0 14 24" stroke="currentColor" strokeWidth="1" fill="none" />
                  </svg>
                </div>

                {/* 3. Bottom Section: Ticket Stub & Barcode (No Top Border) */}
                <div className="bg-slate-50/70 dark:bg-slate-950/60 border-b border-x border-slate-200 dark:border-slate-800 rounded-b-3xl overflow-hidden p-4 sm:p-5 pt-3 text-center space-y-2.5">
                  {/* Realistic Slim Barcode */}
                  <div className="flex items-center justify-center gap-[2.5px] h-9 select-none opacity-85 max-w-[240px] mx-auto py-0.5">
                    <div className="w-1.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-2.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-2 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-3 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-2 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-2 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-2.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-0.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1.5 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                    <div className="w-1 h-full bg-slate-900 dark:bg-slate-100 rounded-2xs" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(booking.id.slice(0, 8).toUpperCase())
                      setCopiedBookingId(true)
                      setTimeout(() => setCopiedBookingId(false), 2000)
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-black tracking-widest text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs"
                  >
                    <span>#{booking.id.slice(0, 8).toUpperCase()}</span>
                    {copiedBookingId ? (
                      <Check className="w-3 h-3 text-emerald-500" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    กรุณาแสดงตั๋วคิวนี้เมื่อถึงร้านเพื่อเข้ารับบริการ
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                {/* Save Ticket Image to Device */}
                <button
                  type="button"
                  onClick={handleSaveTicketImage}
                  disabled={savingTicket}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition active:scale-98 cursor-pointer"
                >
                  {savingTicket ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin shrink-0" />
                      <span>กำลังสร้างรูปตั๋ว...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 shrink-0" />
                      <span>บันทึกรูปตั๋วลงเครื่อง</span>
                    </>
                  )}
                </button>

                <Link
                  href={`/${slug}/book`}
                  className="w-full py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-semibold text-center transition border border-slate-200 dark:border-slate-700 shadow-2xs active:scale-98"
                >
                  {t('bookMoreBtn')}
                </Link>
              </div>
            </motion.div>
          ) : isCancelledOrExpired ? (
            /* 2. EXPIRED / CANCELLED STATE */
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center pt-2"
            >
              <div className="w-14 h-14 bg-rose-50 dark:bg-rose-950/60 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-2xs">
                <Hourglass className="w-8 h-8" />
              </div>

              <div className="space-y-1.5">
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t('bookingExpiredTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {t('bookingExpiredDesc')}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('service')}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{service.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('dateTime')}:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {formatBangkokDateTime(startTime)} น.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">{t('customer')}:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{booking.customer_name}</span>
                </div>
              </div>

              <Link
                href={`/${slug}/book`}
                className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition active:scale-98"
              >
                <RefreshCw className="w-4 h-4" />
                <span>{t('bookAgainBtn')}</span>
              </Link>
            </motion.div>
          ) : (
            /* 3. PENDING PAYMENT & SLIP UPLOAD WITH 10-MIN COUNTDOWN */
            <div className="space-y-4">
              {/* Payment Countdown Notice */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                    <Hourglass className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {t('payWithin10Min')}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                      {t('expiredWarning')}
                    </p>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-extrabold tracking-wider shrink-0 border ${isUrgent
                    ? 'bg-rose-600 text-white border-rose-700 animate-bounce'
                    : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-2xs'
                  }`}>
                  {formattedTimer}
                </div>
              </div>

              {/* Booking Recap */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-left">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{t('service')}:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{service.title}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{t('dateTime')}:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {formatBangkokDate(startTime)} ({formatBangkokTime(startTime)} - {formatBangkokTime(endTime)} น.)
                  </span>
                </div>
              </div>

              {/* PromptPay QR Code Box */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-2xs">
                <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  <ShieldCheck className="w-4 h-4" />
                  {t('scanPromptPay')}
                </div>

                {qrDataUrl ? (
                  <div className="inline-block p-4 bg-white border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
                    <img
                      src={qrDataUrl}
                      alt="PromptPay QR Code"
                      className="w-52 h-52 mx-auto"
                    />
                    <div className="text-slate-800 font-bold text-xs mt-2">
                      {t('depositPrice')}: ฿{Number(booking.deposit_amount).toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="w-52 h-52 bg-slate-100 dark:bg-slate-800 rounded-2xl mx-auto flex items-center justify-center">
                    <span className="text-xs text-slate-500">{t('loading')}</span>
                  </div>
                )}

                {/* PromptPay Details */}
                {(booking?.branch?.promptpay_id || merchant.promptpay_id) && (() => {
                  const displayPromptPayId = booking?.branch?.promptpay_id || merchant.promptpay_id
                  const displayPromptPayName = booking?.branch?.promptpay_name || merchant.promptpay_name || merchant.name
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {t('promptpayNumber')} ({displayPromptPayName})
                        </div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{displayPromptPayId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(displayPromptPayId)
                          setCopiedPayId(true)
                          setTimeout(() => setCopiedPayId(false), 2000)
                        }}
                        className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-semibold flex items-center gap-1 transition shadow-2xs active:scale-95 cursor-pointer"
                      >
                        {copiedPayId ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span>{t('copied')}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>{t('copy')}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )
                })()}

                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`promptpay-deposit-${booking.id.slice(0, 6)}.png`}
                    className="inline-flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('saveQrImage')}
                  </a>
                )}
              </div>

              {/* Slip Upload & Verification Section */}
              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <UploadCloud className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    {t('attachSlipTitle')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {t('attachSlipSubtitle')}
                  </p>
                </div>

                {verifyError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-xl text-xs text-rose-600 dark:text-rose-400 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{verifyError}</span>
                  </div>
                )}

                {/* Upload Input Zone */}
                <label className="border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-5 flex flex-col items-center justify-center cursor-pointer bg-white dark:bg-slate-900 hover:bg-slate-100/80 dark:hover:bg-slate-850 transition relative overflow-hidden">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {slipPreview ? (
                    <div className="space-y-2 text-center">
                      <img
                        src={slipPreview}
                        alt="Slip Preview"
                        className="max-h-44 rounded-lg mx-auto shadow-sm border border-slate-200 dark:border-slate-800"
                      />
                      <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold block">
                        {t('changeSlipImage')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-center space-y-2">
                      <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t('chooseSlipImage')}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-500">
                        {t('supportedFiles')}
                      </div>
                    </div>
                  )}
                </label>

                <button
                  type="button"
                  disabled={!slipFile || verifying}
                  onClick={handleVerifySlip}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-98"
                >
                  {verifying ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {t('verifyingSlip')}
                    </span>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4" />
                      <span>{t('verifySlipBtn')}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </main>

        {/* Powered by QFlow & Legal Links Footer */}
        <div className="flex flex-col items-center justify-center gap-1.5 mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
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
        </motion.div>
      </div>
    </div>
  )
}
