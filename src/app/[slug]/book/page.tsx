'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
  Calendar as CalendarIcon
} from 'lucide-react'
import { format, startOfToday } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { createBookingAction } from '@/app/actions/booking'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { BookingCalendar } from '@/components/BookingCalendar'
import type { Merchant, Service, TimeSlotOption } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default function BookingPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const slug = resolvedParams.slug
  const router = useRouter()
  const { t, lang } = useLanguage()

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [loadingShop, setLoadingShop] = useState(true)

  // Step state (1: Service, 2: Slot, 3: Customer Info)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  
  // Date & Slot state
  const today = startOfToday()
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<TimeSlotOption[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotOption | null>(null)

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

  const dateLocale = lang === 'th' ? th : enUS

  // 1. Load Merchant & Services
  useEffect(() => {
    async function loadShop() {
      const supabase = createClient()
      const { data: mData, error: mErr } = await supabase
        .from('merchants')
        .select('*')
        .eq('slug', slug)
        .single()

      if (mErr || !mData) {
        setLoadingShop(false)
        return
      }

      setMerchant(mData)

      const { data: sData } = await supabase
        .from('services')
        .select('*')
        .eq('merchant_id', mData.id)
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      setServices(sData || [])
      setLoadingShop(false)
    }

    loadShop()

    // Try to auto-fill LINE Profile via LIFF
    async function checkLiff() {
      try {
        const { initLiff } = await import('@/lib/liff')
        const res = await initLiff()
        if (res.success && res.profile) {
          setLineCustomerProfile(res.profile)
          if (res.profile.displayName) setCustomerName(res.profile.displayName)
          if (res.profile.userId) setCustomerLineId(res.profile.userId)
        }
      } catch {
        // LIFF fallback
      }
    }
    checkLiff()
  }, [slug])

  // 2. Fetch Slots whenever date or service changes
  useEffect(() => {
    if (!selectedService || !slug) return

    async function loadSlots() {
      setLoadingSlots(true)
      setSelectedSlot(null)
      try {
        const res = await fetch(
          `/api/slots?merchantSlug=${slug}&date=${selectedDate}&duration=${selectedService?.duration_min || 60}`
        )
        const json = await res.json()
        setSlots(json.slots || [])
      } catch (err) {
        console.error('Failed to load slots', err)
      } finally {
        setLoadingSlots(false)
      }
    }

    loadSlots()
  }, [slug, selectedDate, selectedService])

  // Handle Booking Submit
  async function handleSubmitBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || !selectedSlot) return

    setSubmitting(true)
    setErrorMessage(null)

    const res = await createBookingAction({
      merchantSlug: slug,
      serviceId: selectedService.id,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      customerName,
      customerPhone,
      customerLineId: customerLineId || undefined,
      customerNotes: customerNotes || undefined,
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 transition-colors">
      {/* Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {step > 1 && (
              <button
                onClick={() => setStep((s) => (s - 1) as 1 | 2)}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <h1 className="text-sm font-bold text-slate-900 dark:text-white">{merchant.name}</h1>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {merchant.open_time.slice(0, 5)} - {merchant.close_time.slice(0, 5)}
                {merchant.has_break && merchant.break_start_time && merchant.break_end_time && (
                  <span className="text-amber-600 dark:text-amber-400 ml-1.5 font-medium">
                    (Break {merchant.break_start_time.slice(0, 5)}-{merchant.break_end_time.slice(0, 5)})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <NavbarControls />
            <span className="text-[10px] font-bold tracking-wider text-indigo-600 dark:text-indigo-400 uppercase hidden sm:inline">
              {t('stepOf', { step })}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 dark:bg-slate-800 h-1">
          <div
            className="bg-indigo-600 dark:bg-indigo-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6">
        {/* Step Indicator Header */}
        <div className="mb-5">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            {step === 1 && t('step1Title')}
            {step === 2 && t('step2Title')}
            {step === 3 && t('step3Title')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {step === 1 && t('step1Subtitle')}
            {step === 2 && t('step2Subtitle')}
            {step === 3 && t('step3Subtitle')}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: SERVICE SELECTION */}
          {step === 1 && (
            <motion.div 
              key="step1"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {services.map((service) => {
                const isSelected = selectedService?.id === service.id
                const deposit = service.deposit_amount ?? merchant.default_deposit

                return (
                  <div
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service)
                      setStep(2)
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative active:scale-[0.99] ${
                      isSelected
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
                            ({t('depositAmount')} ฿{Number(deposit).toLocaleString()})
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {slots.map((slot, idx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime
                      return (
                        <button
                          key={idx}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all relative ${
                            !slot.isAvailable
                              ? 'bg-slate-100 dark:bg-slate-950/40 border-slate-200 dark:border-slate-900 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'
                              : isSelected
                              ? 'bg-indigo-600 dark:bg-indigo-500 border-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-850 active:scale-98 shadow-2xs'
                          }`}
                        >
                          <span>{slot.displayTime}</span>
                          {!slot.isAvailable && (
                            <span className="text-[9px] font-normal text-slate-400 dark:text-slate-500 mt-0.5">
                              {slot.reason || t('slotBlocked')}
                            </span>
                          )}
                        </button>
                      )
                    })}
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
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{t('dateTime')}:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-300">
                    {format(new Date(selectedSlot.startTime), 'd MMMM yyyy', { locale: dateLocale })} ({selectedSlot.displayTime})
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{t('fullPrice')}:</span>
                  <span className="text-slate-800 dark:text-slate-200">฿{Number(selectedService.price).toLocaleString()}</span>
                </div>
                <div className="border-t border-slate-200 dark:border-slate-800 pt-2 flex justify-between text-sm font-bold">
                  <span className="text-emerald-600 dark:text-emerald-400">{t('depositToPay')}:</span>
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ฿{Number(selectedService.deposit_amount ?? merchant.default_deposit).toLocaleString()}
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
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition disabled:opacity-50 active:scale-98"
              >
                {submitting ? (
                  <span>{t('submittingBooking')}</span>
                ) : (
                  <>
                    <span>{t('confirmAndPayBtn')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </main>
    </div>
  )
}
