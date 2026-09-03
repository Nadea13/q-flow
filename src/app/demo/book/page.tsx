'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Clock,
  ChevronRight,
  Check,
  Phone,
  User,
  MessageSquare,
  FileText,
  ArrowLeft,
  Building2,
  Users,
  Sparkles,
  CheckCircle2,
  UploadCloud,
  Hourglass
} from 'lucide-react'
import { format, startOfToday } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { BookingCalendar } from '@/components/BookingCalendar'
import { toast } from 'sonner'
import type { TimeSlotOption } from '@/types/database'

// Demo Mock Data
const DEMO_MERCHANT = {
  id: 'demo-merchant-id',
  name: 'Barber & Spa Studio (Demo)',
  slug: 'demo',
  logo_url: '',
  phone: '0812345678',
  promptpay_id: '0812345678',
  promptpay_name: 'บริษัท คิวโฟลว์ เดโม จำกัด',
  default_deposit: 100,
  open_time: '10:00:00',
  close_time: '20:00:00',
  has_break: true,
  break_start_time: '12:00:00',
  break_end_time: '13:00:00',
  closed_days: [0], // Closed on Sundays
}

const DEMO_BRANCHES = [
  {
    id: 'b1',
    name: 'สาขา 1: สยามสแควร์ (Siam Square)',
    address: 'ชั้น 2 สยามสแควร์วัน เขตปทุมวัน กรุงเทพฯ 10330',
  },
  {
    id: 'b2',
    name: 'สาขา 2: อารีย์ (Ari Branch)',
    address: 'ซอยอารีย์ 1 แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400',
  },
]

const DEMO_STAFF = [
  {
    id: 'stf-1',
    name: 'สมศักดิ์ แซ่ตั้ง',
    nickname: 'ช่างเอก',
    role_title: 'Senior Master Stylist',
    branch_id: 'b1',
    serviceIds: ['s1', 's2', 's3', 's4'],
  },
  {
    id: 'stf-2',
    name: 'กมลวรรณ สุขเกษม',
    nickname: 'น้องฟ้า',
    role_title: 'Spa & Facial Specialist',
    branch_id: 'b1',
    serviceIds: ['s2', 's3'],
  },
  {
    id: 'stf-3',
    name: 'ธนวัฒน์ พัฒนเดช',
    nickname: 'ช่างบอย',
    role_title: 'Hair Color Specialist',
    branch_id: 'b2',
    serviceIds: ['s1', 's2', 's4'],
  },
]

const DEMO_SERVICES = [
  {
    id: 's1',
    title: 'ตัดผมชายพรีเมียม + สระไดร์ (Men Premium Cut)',
    description: 'ตัดแต่งทรงผม ออกแบบทรงผมเฉพาะบุคคล พร้อมสระนวดผ่อนคลายและเซ็ตทรง',
    duration_min: 45,
    price: 450,
    deposit_amount: 100,
  },
  {
    id: 's2',
    title: 'ดัดผมวอลลุ่ม / ดัดยกโคน (Volume Perm)',
    description: 'ดัดผมสไตล์เกาหลี ใช้น้ำยาพรีเมียมถนอมเส้นผม อยู่ทรงนาน 3-5 เดือน',
    duration_min: 90,
    price: 1800,
    deposit_amount: 300,
  },
  {
    id: 's3',
    title: 'สปาศีรษะและนวดอโรม่าผ่อนคลาย (Head Spa Therapy)',
    description: 'ดีท็อกซ์หนังศีรษะ นวดกดจุดบ่า-ไหล่ บำรุงรากผมด้วยทรีทเม้นท์ออร์แกนิก',
    duration_min: 60,
    price: 990,
    deposit_amount: 200,
  },
  {
    id: 's4',
    title: 'ทำสีผมแฟชั่น + ทรีทเม้นท์เคราติน (Fashion Color)',
    description: 'ฟอกสีผมและลงสีแฟชั่นประกายเงางาม ฟื้นฟูโครงสร้างผมด้วยเคราตินสด',
    duration_min: 120,
    price: 2500,
    deposit_amount: 500,
  },
]

export default function DemoBookPage() {
  const { t, lang } = useLanguage()

  // Selection states
  const [selectedBranch, setSelectedBranch] = useState(DEMO_BRANCHES[0])
  const [selectedStaff, setSelectedStaff] = useState<typeof DEMO_STAFF[0] | null>(null)
  const [selectedService, setSelectedService] = useState<typeof DEMO_SERVICES[0] | null>(null)

  // Step state (1: Selection, 2: Slot, 3: Customer Info, 4: Demo Confirmation / Payment)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Date & Slot state
  const today = startOfToday()
  const [selectedDate, setSelectedDate] = useState<string>(format(today, 'yyyy-MM-dd'))
  const [selectedSlot, setSelectedSlot] = useState<TimeSlotOption | null>(null)

  // Customer form state
  const [customerName, setCustomerName] = useState('คุณสมชาย (ลูกค้าทดลอง)')
  const [customerPhone, setCustomerPhone] = useState('089-123-4567')
  const [customerLineId, setCustomerLineId] = useState('somchai_demo')
  const [customerNotes, setCustomerNotes] = useState('ขอช่างที่เชี่ยวชาญทรงผมสั้น')

  // Confirmation / Payment step states
  const [isVerifying, setIsVerifying] = useState(false)
  const [isPaidSuccess, setIsPaidSuccess] = useState(false)

  // Compute Demo Time Slots based on chosen Date & Service
  const demoSlots: TimeSlotOption[] = [
    { startTime: '10:00:00', endTime: '10:45:00', displayTime: '10:00 - 10:45', isAvailable: true },
    { startTime: '11:00:00', endTime: '11:45:00', displayTime: '11:00 - 11:45', isAvailable: true },
    { startTime: '12:00:00', endTime: '13:00:00', displayTime: '12:00 - 13:00', isAvailable: false, reason: 'พักเที่ยง (Break)' },
    { startTime: '13:00:00', endTime: '13:45:00', displayTime: '13:00 - 13:45', isAvailable: true },
    { startTime: '14:00:00', endTime: '14:45:00', displayTime: '14:00 - 14:45', isAvailable: false, reason: 'มีลูกค้าจองแล้ว' },
    { startTime: '15:00:00', endTime: '15:45:00', displayTime: '15:00 - 15:45', isAvailable: true },
    { startTime: '16:00:00', endTime: '16:45:00', displayTime: '16:00 - 16:45', isAvailable: true },
    { startTime: '17:00:00', endTime: '17:45:00', displayTime: '17:00 - 17:45', isAvailable: true },
    { startTime: '18:00:00', endTime: '18:45:00', displayTime: '18:00 - 18:45', isAvailable: false, reason: 'มีลูกค้าจองแล้ว' },
    { startTime: '19:00:00', endTime: '19:45:00', displayTime: '19:00 - 19:45', isAvailable: true },
  ]

  // Handle Demo Submission (Purely Client-side, NO database write)
  function handleDemoSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedService || !selectedSlot) return
    setStep(4)
    toast.success('สร้างรายการจองจำลองเรียบร้อย (โหมดทดลอง - ไม่มีการบันทึกข้อมูล)')
  }

  // Handle Simulated Slip Upload
  function handleSimulateSlipUpload() {
    setIsVerifying(true)
    setTimeout(() => {
      setIsVerifying(false)
      setIsPaidSuccess(true)
      toast.success('จำลองการตรวจสอบสลิปสำเร็จ! สถานะเปลี่ยนเป็น: ยืนยันการจองแล้ว')
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col items-center justify-center p-3 sm:p-6 font-sans antialiased">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {step > 1 && step < 4 ? (
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <div className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-bold text-base text-slate-900 dark:text-white truncate">
                {DEMO_MERCHANT.name}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                10:00 - 20:00 น.
                <span className="text-amber-600 dark:text-amber-400 ml-1">
                  (พัก 12:00-13:00)
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <NavbarControls />
          </div>
        </div>

        {/* Progress Bar (Only during steps 1, 2, 3) */}
        {step <= 3 && (
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
        )}

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
                {/* Branch Selector */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                  <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{t('selectBranch')}</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DEMO_BRANCHES.map((b) => {
                      const isSel = selectedBranch.id === b.id
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
                          <div className="text-[10px] text-slate-400 mt-0.5 truncate">{b.address}</div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Staff / Provider Selector */}
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
                    {DEMO_STAFF.filter((stf) => stf.branch_id === selectedBranch.id).map((stf) => {
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
                            {stf.role_title}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Service List */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-900 dark:text-white block px-1">
                    {t('selectService')} ({
                      DEMO_SERVICES.filter((s) => {
                        if (!selectedStaff) return true
                        return selectedStaff.serviceIds.includes(s.id)
                      }).length
                    })
                  </label>
                  {DEMO_SERVICES.filter((service) => {
                    if (!selectedStaff) return true
                    return selectedStaff.serviceIds.includes(service.id)
                  }).map((service) => {
                    const isSelected = selectedService?.id === service.id
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
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              {service.description}
                            </p>

                            <div className="flex items-center gap-3 mt-3 text-xs">
                              <span className="flex items-center gap-1 text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-800/60 font-semibold">
                                <Clock className="w-3 h-3" />
                                {service.duration_min} {t('minutes')}
                              </span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">
                                ฿{Number(service.price).toLocaleString()}
                              </span>
                              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                ({t('depositAmount')} ฿{Number(service.deposit_amount).toLocaleString()})
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
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      สาขา: {selectedBranch.name.split(':')[0]}
                      {selectedStaff ? ` • ช่าง: ${selectedStaff.nickname || selectedStaff.name}` : ' • ช่าง: อัตโนมัติ'}
                    </p>
                  </div>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
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
                    closedDays={DEMO_MERCHANT.closed_days}
                    lang={lang}
                  />
                </div>

                {/* Time Slot Picker */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t('selectTimeSlot')} ({selectedService.duration_min} {t('minutes')})
                    </label>
                    {selectedSlot && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        ✓ {selectedSlot.displayTime}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {demoSlots.map((slot, idx) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime
                      return (
                        <button
                          key={idx}
                          disabled={!slot.isAvailable}
                          onClick={() => setSelectedSlot(slot)}
                          className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center transition-all relative cursor-pointer ${!slot.isAvailable
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
                </div>

                {/* Next Button */}
                <button
                  disabled={!selectedSlot}
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition disabled:opacity-40 active:scale-98 cursor-pointer"
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
                onSubmit={handleDemoSubmit}
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
                    <span className="text-slate-600 dark:text-slate-400">{t('selectBranch')}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBranch.name}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{t('selectStaff')}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {selectedStaff ? `${selectedStaff.nickname || selectedStaff.name} (${selectedStaff.role_title})` : t('anyStaff')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{t('dateTime')}:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {format(new Date(selectedDate), 'dd/MM/yyyy')} ({selectedSlot.displayTime} น.)
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400">{t('fullPrice')}:</span>
                    <span className="text-slate-900 dark:text-white">฿{Number(selectedService.price).toLocaleString()}</span>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span>{t('depositToPay')}:</span>
                    <span>฿{Number(selectedService.deposit_amount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Form Fields */}
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

                <button
                  type="submit"
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition active:scale-98 cursor-pointer"
                >
                  <span>{t('confirmAndPayBtn')} (จำลองการจอง)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.form>
            )}

            {/* STEP 4: DEMO CONFIRMATION & SLIP VERIFICATION PAGE */}
            {step === 4 && selectedService && selectedSlot && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4"
              >
                <div className={`p-4 rounded-2xl border text-center space-y-2 ${isPaidSuccess
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/80'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/80'
                  }`}>
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-white dark:bg-slate-900 shadow-2xs">
                    {isPaidSuccess ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Hourglass className="w-5 h-5 text-amber-600 dark:text-amber-400 animate-pulse" />
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {isPaidSuccess ? 'ยืนยันการจองคิวสำเร็จ (Confirmed)' : 'รอชำระเงินมัดจำ (Pending Deposit)'}
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {isPaidSuccess
                      ? 'ระบบจำลองการตรวจสลิปและยืนยันคิวเรียบร้อย พร้อมส่ง LINE แจ้งเตือนลูกค้าและช่าง'
                      : 'สแกน QR Code พร้อมเพย์เพื่อชำระเงินมัดจำ'}
                  </p>
                </div>

                {/* PromptPay QR Code Mock */}
                {!isPaidSuccess && (
                  <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3 shadow-2xs">
                    <div className="inline-block p-3 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <div className="w-44 h-44 bg-slate-900 p-2 rounded-xl flex flex-col justify-between items-center text-white text-[10px] font-mono select-none">
                        <div className="flex justify-between w-full">
                          <div className="w-10 h-10 border-4 border-white bg-slate-900 p-1 flex items-center justify-center font-bold">Q</div>
                          <div className="w-10 h-10 border-4 border-white bg-slate-900 p-1 flex items-center justify-center font-bold">F</div>
                        </div>
                        <div className="text-center font-sans">
                          <p className="font-bold text-xs text-emerald-400">PromptPay QR</p>
                          <p className="text-[10px] text-slate-300">฿{selectedService.deposit_amount}</p>
                        </div>
                        <div className="flex justify-between w-full">
                          <div className="w-10 h-10 border-4 border-white bg-slate-900 p-1 flex items-center justify-center font-bold">L</div>
                          <div className="w-10 h-10 border-4 border-white bg-slate-900 p-1 flex items-center justify-center font-bold">W</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {DEMO_MERCHANT.promptpay_name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        พร้อมเพย์: {DEMO_MERCHANT.promptpay_id}
                      </p>
                      <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                        ยอดมัดจำ: ฿{Number(selectedService.deposit_amount).toLocaleString()}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleSimulateSlipUpload}
                      disabled={isVerifying}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      {isVerifying ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>กำลังจำลองการตรวจสลิปด้วย AI...</span>
                        </span>
                      ) : (
                        <>
                          <UploadCloud className="w-4 h-4" />
                          <span>จำลองการแนบสลิป & ยืนยันชำระเงิน</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Booking Details Card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-2 text-xs shadow-2xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">รหัสการจอง:</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">#DEMO-8899</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">ชื่อลูกค้า:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">เบอร์ติดต่อ:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{customerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">บริการ:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedService.title}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">สาขา:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedBranch.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">เวลานัดหมาย:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{format(new Date(selectedDate), 'dd/MM/yyyy')} เวลา {selectedSlot.displayTime} น.</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep(1)
                      setIsPaidSuccess(false)
                      setSelectedSlot(null)
                      toast.info('รีเซ็ตหน้าจองคิวจำลองเรียบร้อย')
                    }}
                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition cursor-pointer"
                  >
                    ลองจองคิวใหม่อีกรอบ (Reset Demo)
                  </button>
                  <Link
                    href="/demo/dashboard"
                    className="w-full py-2.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-300 font-bold rounded-xl text-xs text-center border border-indigo-200/60 dark:border-indigo-800/60 transition"
                  >
                    ไปดูมุมมองหลังร้านใน Demo Dashboard →
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
    </div>
  )
}
