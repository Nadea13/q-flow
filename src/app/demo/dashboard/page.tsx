'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  CheckCircle2,
  DollarSign,
  Clock,
  Calendar as CalendarIcon,
  Sparkles,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Lock,
  Layers
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { th, enUS } from 'date-fns/locale'
import { QFlowLogo } from '@/components/QFlowLogo'
import { NavbarControls } from '@/components/NavbarControls'
import { useLanguage } from '@/context/LanguageContext'
import { toast } from 'sonner'

export default function DemoDashboardPage() {
  const { lang, t } = useLanguage()
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState<'bookings' | 'services' | 'block-slots'>('bookings')

  // Interactive Mock Data for Demo
  const [demoBookings, setDemoBookings] = useState([
    {
      id: 'demo-1',
      customer_name: 'คุณพิมลภัส (ลูกค้าประจำ)',
      customer_phone: '089-123-4567',
      service_title: 'ตัด สระ ไดร์ พรีเมียม (Hair Cut & Styling)',
      staff_name: 'ช่างเอก (Master Stylist)',
      branch_name: 'สาขาสยามสแควร์',
      start_time: `${selectedDate}T11:00:00`,
      end_time: `${selectedDate}T12:00:00`,
      total_price: 650,
      deposit_amount: 150,
      status: 'confirmed',
      slip_trans_ref: '2026082711002345',
      paid_at: '10:45 น.',
    },
    {
      id: 'demo-2',
      customer_name: 'คุณกิตติศักดิ์',
      customer_phone: '081-987-6543',
      service_title: 'ทำสีผมออร์แกนิก + ทรีทเม้นท์เคราติน',
      staff_name: 'ช่างแนน (Color Specialist)',
      branch_name: 'สาขาสยามสแควร์',
      start_time: `${selectedDate}T13:30:00`,
      end_time: `${selectedDate}T15:30:00`,
      total_price: 2500,
      deposit_amount: 500,
      status: 'confirmed',
      slip_trans_ref: '2026082713159988',
      paid_at: '13:12 น.',
    },
    {
      id: 'demo-3',
      customer_name: 'คุณชลธิชา',
      customer_phone: '095-555-8888',
      service_title: 'ดัดผมดิจิตอลลอนเกาหลี',
      staff_name: 'ช่างเอก (Master Stylist)',
      branch_name: 'สาขาสยามสแควร์',
      start_time: `${selectedDate}T16:00:00`,
      end_time: `${selectedDate}T18:00:00`,
      total_price: 3200,
      deposit_amount: 500,
      status: 'pending_payment',
      slip_trans_ref: null,
      paid_at: null,
    },
    {
      id: 'demo-4',
      customer_name: 'คุณวรเมธ',
      customer_phone: '086-777-1234',
      service_title: 'ตัดผมชายสไตล์วินเทจ + เซ็ตผม',
      staff_name: 'ช่างท็อป (Barber Pro)',
      branch_name: 'สาขาทองหล่อ',
      start_time: `${selectedDate}T18:30:00`,
      end_time: `${selectedDate}T19:15:00`,
      total_price: 450,
      deposit_amount: 100,
      status: 'completed',
      slip_trans_ref: '2026082718104422',
      paid_at: '18:05 น.',
    },
  ])

  const [demoServices] = useState([
    { id: 's1', title: 'ตัด สระ ไดร์ พรีเมียม', price: 650, deposit: 150, duration: 60, staffCount: 3 },
    { id: 's2', title: 'ทำสีผมออร์แกนิก + ทรีทเม้นท์', price: 2500, deposit: 500, duration: 120, staffCount: 2 },
    { id: 's3', title: 'ดัดผมดิจิตอลลอนเกาหลี', price: 3200, deposit: 500, duration: 120, staffCount: 2 },
    { id: 's4', title: 'ตัดผมชายสไตล์วินเทจ + เซ็ต', price: 450, deposit: 100, duration: 45, staffCount: 3 },
  ])

  const [demoStaff] = useState([
    { id: 'st1', nickname: 'ช่างเอก', name: 'เอกราช ภักดี', role: 'Master Specialist', branch: 'สยามสแควร์' },
    { id: 'st2', nickname: 'ช่างแนน', name: 'นันทนา สุขเกษม', role: 'Color Specialist', branch: 'สยามสแควร์' },
    { id: 'st3', nickname: 'ช่างท็อป', name: 'วรพล เกียรติสกุล', role: 'Senior Barber', branch: 'ทองหล่อ' },
  ])

  const filteredBookings = demoBookings.filter((b) => {
    if (statusFilter === 'all') return true
    return b.status === statusFilter
  })

  const todayConfirmed = demoBookings.filter((b) => b.status === 'confirmed' || b.status === 'completed')
  const totalDeposit = todayConfirmed.reduce((sum, b) => sum + b.deposit_amount, 0)

  function handleStatusChange(id: string, newStatus: string) {
    setDemoBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b))
    )
    toast.success(lang === 'th' ? `อัปเดตสถานะคิวเป็น "${newStatus}" เรียบร้อย (โหมดทดลอง)` : `Status updated to ${newStatus}`)
  }

  const currentDateObj = new Date(selectedDate)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-12 transition-colors">
      
      {/* Interactive Demo Top Notification Banner */}
      <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white px-4 py-2.5 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 font-semibold">
            <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-bold tracking-wide uppercase">
              Live Demo
            </span>
            <span>{lang === 'th' ? 'หน้าจำลองระบบจัดการคิว Q Flow (ทดลองคลิกใช้งานได้จริง)' : 'Interactive Q Flow Dashboard Demo'}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/glam-studio/book"
              target="_blank"
              className="text-indigo-100 hover:text-white underline text-[11px] font-medium"
            >
              {lang === 'th' ? 'ลองหน้าจองฝั่งลูกค้า ↗' : 'Try Customer Booking ↗'}
            </Link>
            <Link
              href="/pricing"
              className="bg-white text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-lg font-bold text-xs transition shadow-2xs active:scale-95"
            >
              {lang === 'th' ? 'เปิดร้านของคุณเลย' : 'Get Started'}
            </Link>
          </div>
        </div>
      </div>

      {/* Main Top Header */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <QFlowLogo className="h-8 w-8 transition-transform group-hover:scale-105" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  Glam Studio & Salon (Demo)
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] font-bold">
                  Professional Plan
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden xs:block">
                {lang === 'th' ? 'ระบบจัดการคิวร้านค้าอัตโนมัติ' : 'Queue Management Dashboard'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <NavbarControls />
            <Link
              href="/onboarding"
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{lang === 'th' ? 'สร้างร้านค้าจริง' : 'Create Shop'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        
        {/* Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              {t('todayBookings')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {demoBookings.length}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">คิวนัดหมายวันนี้</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              {t('todayConfirmed')}
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {todayConfirmed.length}
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1">ตรวจสลิปผ่าน 100%</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              {t('todayDepositTotal')}
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ฿{totalDeposit.toLocaleString()}
            </div>
            <div className="text-[10px] text-cyan-600 dark:text-cyan-400 mt-1">เงินเข้าบัญชีพร้อมเพย์แล้ว</div>
          </div>

          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              {t('shopHours')}
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              10:00 - 20:00 น.
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-1">พักเที่ยง 12:00 - 13:00 น.</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'bookings'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>{t('tabBookings')} ({demoBookings.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('services')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'services'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ช่าง และบริการ' : 'Staff & Services'} ({demoServices.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('block-slots')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
              activeTab === 'block-slots'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('tabBlockSlots')}</span>
          </button>
        </div>

        {/* TAB 1: BOOKINGS LIST */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            
            {/* Filter Bar */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 sm:p-5 rounded-3xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedDate(format(subDays(currentDateObj, 1), 'yyyy-MM-dd'))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold">
                    📅 {format(currentDateObj, 'dd MMMM yyyy', { locale: lang === 'th' ? th : enUS })}
                  </div>
                  <button
                    onClick={() => setSelectedDate(format(addDays(currentDateObj, 1), 'yyyy-MM-dd'))}
                    className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-xs font-bold overflow-x-auto">
                  {[
                    { id: 'all', label: t('all') },
                    { id: 'confirmed', label: t('statusConfirmed') },
                    { id: 'pending_payment', label: t('statusPending') },
                    { id: 'completed', label: t('statusCompleted') },
                  ].map((st) => (
                    <button
                      key={st.id}
                      onClick={() => setStatusFilter(st.id)}
                      className={`px-3 py-1.5 rounded-lg transition shrink-0 cursor-pointer ${
                        statusFilter === st.id
                          ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bookings Card List */}
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-slate-900 dark:text-white">
                          {b.start_time.slice(11, 16)} - {b.end_time.slice(11, 16)} น.
                        </span>
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                            b.status === 'confirmed'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80'
                              : b.status === 'completed'
                              ? 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-400 border border-cyan-200 dark:border-cyan-800/80'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/80'
                          }`}
                        >
                          {b.status === 'confirmed' && t('statusConfirmed')}
                          {b.status === 'completed' && t('statusCompleted')}
                          {b.status === 'pending_payment' && t('statusPending')}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        {b.service_title}
                      </h4>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">
                        ยอดเต็ม ฿{b.total_price.toLocaleString()}
                      </div>
                      <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                        มัดจำแล้ว ฿{b.deposit_amount.toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        👤 {b.customer_name} ({b.customer_phone})
                      </div>
                      <div className="text-slate-500">
                        ✂️ {b.staff_name} • 🏢 {b.branch_name}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {b.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'completed')}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                        >
                          {t('markCompleted')}
                        </button>
                      )}
                      {b.status === 'pending_payment' && (
                        <button
                          onClick={() => handleStatusChange(b.id, 'confirmed')}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-2xs active:scale-95 cursor-pointer"
                        >
                          อนุมัติสลิปด้วยตนเอง
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SERVICES & STAFF */}
        {activeTab === 'services' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>ช่างผู้ให้บริการในระบบ ({demoStaff.length} ท่าน)</span>
                </h3>
                <button
                  onClick={() => toast.info('ในระบบจริงสามารถเพิ่ม/ลบ/แก้ไขช่างและเวลาเข้างานได้อิสระ')}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-indigo-600 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
                >
                  + เพิ่มช่างใหม่
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {demoStaff.map((st) => (
                  <div key={st.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-1">
                    <div className="text-xs font-bold text-slate-900 dark:text-white">{st.nickname} ({st.name})</div>
                    <div className="text-[11px] text-indigo-600 font-semibold">{st.role}</div>
                    <div className="text-[10px] text-slate-500">ประจำสาขา: {st.branch}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 sm:p-6 rounded-3xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>รายการบริการทั้งหมด ({demoServices.length} บริการ)</span>
                </h3>
                <button
                  onClick={() => toast.info('ในระบบจริงสามารถเพิ่ม/ลบ/แก้ไขบริการ และกำหนดยอดมัดจำแยกแต่ละบริการได้')}
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  + เพิ่มบริการ
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {demoServices.map((s) => (
                  <div key={s.id} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</div>
                      <div className="text-[11px] text-slate-500">⏱️ {s.duration} นาที • ช่างทำได้ {s.staffCount} ท่าน</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">฿{s.price}</div>
                      <div className="text-[10px] font-semibold text-emerald-600">มัดจำ ฿{s.deposit}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BLOCK SLOTS */}
        {activeTab === 'block-slots' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 sm:p-8 rounded-3xl shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">ระบบล็อกเวลา / พักเบรก / ปิดรับคิวชั่วคราว</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              เจ้าของร้านสามารถเลือกล็อกเวลาเฉพาะช่าง หรือล็อกทั้งสาขา เช่น เวลาไปทำธุระ หรือพักรับประทานอาหาร เพื่อไม่ให้ลูกค้าจองเข้ามาในช่วงเวลาดังกล่าว
            </p>
          </div>
        )}

        {/* Bottom CTA Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-indigo-500/10">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg font-bold">พร้อมเริ่มต้นใช้งานกับร้านของคุณแล้วหรือยัง?</h3>
            <p className="text-xs text-indigo-100">สมัครเปิดร้านฟรีใน 60 วินาที หรือรับแพ็กเกจ Professional พร้อมระบบตรวจสลิปอัตโนมัติ</p>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 px-6 py-3 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl text-xs font-bold shadow-md transition active:scale-95 flex items-center gap-1.5"
          >
            <span>เริ่มต้นเปิดร้านค้า</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

      </main>
    </div>
  )
}
