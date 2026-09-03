'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Copy,
  Download,
  UploadCloud,
  AlertCircle,
  Store,
  Check,
  ShieldCheck,
  MessageSquare,
  Clock,
  Hourglass,
  RefreshCw,
  Ticket,
  Calendar,
  User,
  Scissors
} from 'lucide-react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { generatePromptPayQR } from '@/lib/promptpay'
import { verifyAndConfirmBookingAction, expireBookingAction } from '@/app/actions/booking'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import type { Booking, Merchant, Service } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string; bookingId: string }>
}

export default function BookingDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const { slug, bookingId } = resolvedParams
  const { t } = useLanguage()

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

  // Load Booking Data
  useEffect(() => {
    const supabase = createClient()

    async function loadData() {
      const { data: bData, error } = await supabase
        .from('bookings')
        .select('*, shops(*), services(*), branch:branches(*), staff:staff(*)')
        .eq('id', bookingId)
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
          .eq('id', bookingId)
          .then()
      }

      // Check if already expired or cancelled
      const createdAt = new Date(bData.created_at).getTime()
      const diff = Math.max(0, Math.floor((createdAt + 10 * 60 * 1000 - Date.now()) / 1000))

      if (!isZeroDeposit && (bData.status === 'cancelled' || (bData.status === 'pending_payment' && diff <= 0))) {
        setIsExpired(true)
        if (bData.status === 'pending_payment') {
          expireBookingAction(bookingId)
          bData.status = 'cancelled'
        }
      }

      // Generate PromptPay QR (Use branch promptpay_id if available, otherwise merchant's)
      if (bData.status === 'pending_payment' && !isZeroDeposit && (bData.shops || bData.merchants) && diff > 0) {
        try {
          const branchPromptPay = bData.branch?.promptpay_id
          const activePromptPayId = branchPromptPay || (bData.shops || bData.merchants).promptpay_id
          const qrRes = await generatePromptPayQR(
            activePromptPayId,
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

    // Real-time listener for this specific booking
    const channel = supabase
      .channel(`booking-live-${bookingId}`)
      .on(
        'postgres_changes' as const,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
          filter: `id=eq.${bookingId}`,
        },
        async (payload: { new: Record<string, unknown> }) => {
          const updated = payload.new as { status?: string }
          if (updated && updated.status) {
            setBooking((prev) => (prev ? { ...prev, ...payload.new } : null))

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
  }, [bookingId])

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
        expireBookingAction(bookingId)
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking?.created_at, booking?.status, isExpired, bookingId])

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

    // 1. Client-Side Pre-scan QR Code: Save SlipOK API Credits from non-slip images
    const { detectQrCodeInImage } = await import('@/lib/slip-client-guard')
    const preCheck = await detectQrCodeInImage(slipFile)
    if (!preCheck.hasQr) {
      setVerifying(false)
      setVerifyError(preCheck.error || 'ไม่พบ QR Code ในรูปภาพสลิป กรุณาถ่ายหรือแนบรูปสลิปธนาคารที่มี QR Code ชัดเจน')
      return
    }

    // 2. Submit to Server and Verify with SlipOK
    const formData = new FormData()
    formData.append('slip', slipFile)

    const res = await verifyAndConfirmBookingAction(bookingId, formData)
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
    } catch {
      // Fallback
    }
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
        <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xs">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">ไม่พบข้อมูลการจอง</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
            Booking not found.
          </p>
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
  const isCancelledOrExpired = !isZeroDeposit && (isExpired || booking.status === 'cancelled')
  const startTime = new Date(booking.start_time)
  const endTime = new Date(booking.end_time)

  // Timer formatting
  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : 0
  const seconds = secondsLeft !== null ? secondsLeft % 60 : 0
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  const isUrgent = secondsLeft !== null && secondsLeft <= 180 // <= 3 minutes

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans antialiased">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">

        {/* Header (Matching [slug]/book & Onboarding Layout) */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {merchant.logo_url ? (
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
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${isConfirmed
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                : isCancelledOrExpired
                  ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80'
                  : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80'
                }`}
            >
              {isConfirmed
                ? t('confirmedBooking')
                : isCancelledOrExpired
                  ? 'หลุดจอง / ยกเลิก'
                  : t('pendingPayment')}
            </span>
            <NavbarControls />
          </div>
        </div>

        <main className="w-full space-y-4">
          {/* 1. SUCCESS CONFIRMED STATE */}
          {isConfirmed ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-5"
            >
              <div className="text-center pt-2">
                <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-2xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {t('bookingSuccessTitle')}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('bookingSuccessSubtitle')}
                </p>
              </div>

              {/* Authentic Boarding Pass / Queue Ticket Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm relative">
                {/* Top Ticket Header Banner */}
                <div className="bg-linear-to-r from-indigo-600 via-indigo-500 to-emerald-500 text-white p-4 sm:p-5 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Ticket className="w-4 h-4 text-emerald-200" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">
                        QFLOW QUEUE PASS
                      </span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-extrabold uppercase tracking-wider text-white border border-white/30">
                      {isConfirmed ? 'CONFIRMED' : 'PENDING'}
                    </span>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="min-w-0 pr-2">
                      <h3 className="text-base font-extrabold text-white truncate drop-shadow-2xs">
                        {merchant.name}
                      </h3>
                      <p className="text-[11px] text-indigo-100/90 truncate">
                        {service.title}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[10px] uppercase font-bold text-indigo-200">
                        {t('bookingId')}
                      </div>
                      <div className="font-mono text-xs sm:text-sm font-black text-white tracking-wider">
                        #{booking.id.slice(0, 8).toUpperCase()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Perforated Tear Line with Left & Right Cutout Notches (Top) */}
                <div className="relative flex items-center bg-slate-50/70 dark:bg-slate-950/40">
                  <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 -translate-x-1/2 shrink-0 z-10" />
                  <div className="grow border-b-2 border-dashed border-slate-300 dark:border-slate-700 mx-2" />
                  <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 translate-x-1/2 shrink-0 z-10" />
                </div>

                {/* Ticket Main Details Body */}
                <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/40 space-y-3.5">
                  {/* Highlight: Big Date & Time Section */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                          {t('dateTime')}
                        </div>
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {format(startTime, 'dd/MM/yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t('selectTimeSlot')}
                      </div>
                      <div className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">
                        {format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} น.
                      </div>
                    </div>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-3">
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                        {t('customer')}
                      </div>
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {booking.customer_name}
                      </div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        {booking.customer_phone}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-3">
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                        {t('depositAmount')}
                      </div>
                      <div className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        ฿{Number(booking.deposit_amount).toLocaleString()} {t('baht')}
                      </div>
                      <div className="text-[10px] font-semibold text-emerald-600/80 dark:text-emerald-400/80">
                        ✓ {isConfirmed ? 'ยืนยันเรียบร้อย' : 'รอชำระ'}
                      </div>
                    </div>

                    {booking.staff && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-3">
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                          ช่าง / ผู้ให้บริการ
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {booking.staff.name}
                        </div>
                      </div>
                    )}

                    {booking.branch && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-3">
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-0.5">
                          สาขา
                        </div>
                        <div className="font-bold text-slate-900 dark:text-white truncate">
                          {booking.branch.name}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Perforated Tear Line with Left & Right Cutout Notches (Bottom) */}
                <div className="relative flex items-center bg-slate-50/70 dark:bg-slate-950/40">
                  <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 -translate-x-1/2 shrink-0 z-10" />
                  <div className="grow border-b-2 border-dashed border-slate-300 dark:border-slate-700 mx-2" />
                  <div className="w-5 h-5 rounded-full bg-slate-50 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 translate-x-1/2 shrink-0 z-10" />
                </div>

                {/* Ticket Stub & Barcode */}
                <div className="p-4 bg-white dark:bg-slate-900 text-center space-y-2">
                  {/* Barcode Graphic */}
                  <div className="flex items-center justify-center gap-[2.5px] h-8 select-none opacity-80 max-w-[220px] mx-auto">
                    <div className="w-1.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-2 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-2 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-2.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-2 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-2 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-0.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1.5 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                    <div className="w-1 h-full bg-slate-800 dark:bg-slate-200 rounded-xs" />
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(booking.id.slice(0, 8).toUpperCase())
                      setCopiedBookingId(true)
                      setTimeout(() => setCopiedBookingId(false), 2000)
                    }}
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-black tracking-widest text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer px-2.5 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
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
                <a
                  href={`https://line.me/R/msg/text/?${encodeURIComponent(
                    `🎉 ตั๋วคิวการจอง QFlow: ${service.title}\n📅 วันที่: ${format(startTime, 'dd/MM/yyyy HH:mm')} น.\n🔖 รหัสคิว: #${booking.id.slice(0, 8).toUpperCase()}\n🔗 ดูรายละเอียด: ${typeof window !== 'undefined' ? window.location.href : ''}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 rounded-xl bg-[#06C755] hover:bg-[#05b34c] text-white text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs transition active:scale-98"
                >
                  <MessageSquare className="w-4 h-4 fill-white" />
                  แชร์ตั๋วคิวเข้า LINE
                </a>

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
                    {format(startTime, 'dd/MM/yyyy HH:mm')} น.
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
              {/* 10-MINUTE COUNTDOWN URGENCY BANNER */}
              <div className={`p-4 rounded-2xl border transition-colors flex items-center justify-between gap-3 shadow-2xs ${isUrgent
                ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                }`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isUrgent
                    ? 'bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 animate-pulse'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400'
                    }`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold">{t('payWithin10Min')}</p>
                    <p className="text-[11px] opacity-80 mt-0.5">{t('expiredWarning')}</p>
                  </div>
                </div>

                <div className={`px-3 py-1.5 rounded-xl font-mono text-sm font-extrabold tracking-wider shrink-0 border ${isUrgent
                  ? 'bg-rose-600 text-white border-rose-700 animate-pu'
                  : 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800 shadow-2xs'
                  }`}>
                  {formattedTimer}
                </div>
              </div>

              {/* Ticket Reservation Slip */}
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xs">
                <div className="p-4 sm:p-5 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black tracking-widest text-indigo-600 dark:text-indigo-400 uppercase flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5" />
                      {t('bookingSummary')}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                      #{booking.id.slice(0, 8).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">{service.title}</span>
                    <span className="text-slate-500 dark:text-slate-400">{service.duration_min} {t('minutes')}</span>
                  </div>
                </div>

                {/* Notches & Perforated Line */}
                <div className="relative flex items-center">
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 -translate-x-1/2 shrink-0 z-10" />
                  <div className="grow border-b-2 border-dashed border-slate-200 dark:border-slate-800 mx-1.5" />
                  <div className="w-4 h-4 rounded-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 translate-x-1/2 shrink-0 z-10" />
                </div>

                <div className="p-4 sm:p-5 pt-3 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('dateTime')}:</span>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">
                      {format(startTime, 'dd/MM/yyyy')} ({format(startTime, 'HH:mm')} - {format(endTime, 'HH:mm')} น.)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">{t('customer')}:</span>
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{booking.customer_name} ({booking.customer_phone})</span>
                  </div>
                  {booking.staff && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">ช่าง / ผู้ให้บริการ:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{booking.staff.name}</span>
                    </div>
                  )}
                  {booking.branch && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">สาขา:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-medium">{booking.branch.name}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-bold">
                    <span className="text-emerald-600 dark:text-emerald-400">{t('depositToPay')}:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      ฿{Number(booking.deposit_amount).toLocaleString()} {t('baht')}
                    </span>
                  </div>
                </div>
              </div>

              {/* PromptPay QR Code Box */}
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 text-center space-y-4 shadow-2xs">
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
                {(() => {
                  const activePromptPayId = booking.branch?.promptpay_id || merchant.promptpay_id
                  const activePromptPayName = booking.branch?.promptpay_name || merchant.promptpay_name || merchant.name
                  return (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs max-w-sm mx-auto flex items-center justify-between">
                      <div className="text-left">
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          {t('promptpayNumber')} ({activePromptPayName})
                        </div>
                        <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">{activePromptPayId}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (activePromptPayId) {
                            navigator.clipboard.writeText(activePromptPayId)
                            setCopiedPayId(true)
                            setTimeout(() => setCopiedPayId(false), 2000)
                          }
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

              {/* Slip Upload & SlipOK Verification Section */}
              <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xs">
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

        {/* Powered by QFlow Footer inside card */}
        <div className="flex justify-center items-center mt-2 text-center text-xs text-slate-400 dark:text-slate-500">
          <span>Powered by <span className='font-bold'>QFlow</span></span>
        </div>
      </div>
    </div>
  )
}
