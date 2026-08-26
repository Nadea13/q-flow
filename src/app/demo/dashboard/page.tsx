'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Users,
  CheckCircle2,
  DollarSign,
  Clock,
  Calendar as CalendarIcon,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  Lock,
  Settings,
  ExternalLink,
  User,
  LayoutGrid,
  List,
  Building2,
  X
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { QFlowLogo } from '@/components/QFlowLogo'
import { CustomDropdown } from '@/components/CustomDropdown'
import { FormattedDateInput } from '@/components/FormattedDateInput'
import { toast } from 'sonner'

export default function DemoDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all')
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all')
  const [bookingsViewMode, setBookingsViewMode] = useState<'timeline' | 'list'>('list')
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  // Interactive Mock Data for Demo (Matching Screenshot)
  const [demoBookings, setDemoBookings] = useState([
    {
      id: 'demo-1',
      customer_name: 'จอน',
      customer_phone: '',
      customer_line_id: '',
      service_title: 'บริการทั่วไป (Standard Service)',
      staff_name: '',
      staff_nickname: '',
      branch_name: 'สาขาหลัก',
      branch_count: 1,
      start_time: `${selectedDate}T10:00:00`,
      end_time: `${selectedDate}T11:00:00`,
      deposit_amount: 50,
      total_price: 500,
      status: 'confirmed',
      notes: 'โทรจอง / ลงคิวหน้าร้านโดยแอดมิน',
    },
    {
      id: 'demo-2',
      customer_name: 'ขวัญ',
      customer_phone: '',
      customer_line_id: '',
      service_title: 'บริการทั่วไป (Standard Service)',
      staff_name: '',
      staff_nickname: '',
      branch_name: 'สาขาหลัก',
      branch_count: 1,
      start_time: `${selectedDate}T15:30:00`,
      end_time: `${selectedDate}T16:30:00`,
      deposit_amount: 50,
      total_price: 500,
      status: 'confirmed',
      notes: 'ลูกค้าโทรจอง / หน้าร้าน',
    },
    {
      id: 'demo-3',
      customer_name: 'กรกต',
      customer_phone: '',
      customer_line_id: '',
      service_title: 'บริการทั่วไป (Standard Service)',
      staff_name: 'ช่างประจำร้าน (Master Specialist)',
      staff_nickname: 'ช่างเอก',
      branch_name: 'สาขาหลัก',
      branch_count: 1,
      start_time: `${selectedDate}T17:30:00`,
      end_time: `${selectedDate}T18:30:00`,
      deposit_amount: 50,
      total_price: 500,
      status: 'confirmed',
      notes: 'ลูกค้าโทรจอง / หน้าร้าน',
    },
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
    if (newStatus === 'completed') {
      toast.success('บันทึกเข้าใช้บริการเสร็จสิ้นแล้ว! (โหมดทดลอง)')
    } else if (newStatus === 'cancelled') {
      toast.error('ยกเลิกคิวนี้เรียบร้อย (โหมดทดลอง)')
    }
  }

  const currentDateObj = new Date(selectedDate)

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-20 sm:pb-6 transition-colors">

      {/* Top Navbar matching the exact screenshot */}
      <header className="bg-white/90 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-8 h-16 flex items-center justify-between gap-2">
          
          {/* Logo & Shop Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" className="inline-flex items-center gap-2 group shrink-0">
              <QFlowLogo className="h-7 w-7 sm:h-8 sm:w-8 transition-transform group-hover:scale-105" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white tracking-tight truncate">
                Test QC
              </h1>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Branch Selector */}
            <div className="hidden xs:block">
              <CustomDropdown
                value={selectedBranchFilter}
                onChange={(val) => setSelectedBranchFilter(val)}
                prefixIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                dropdownWidth="w-48"
                options={[
                  { value: 'all', label: 'ทุกสาขา', icon: <Building2 className="w-4 h-4 text-indigo-600" /> },
                ]}
              />
            </div>

            {/* External Link */}
            <Link
              href="/glam-studio/book"
              target="_blank"
              title="เปิดหน้าจองคิวฝั่งลูกค้า"
              className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-700 dark:text-indigo-300 border border-slate-300 dark:border-slate-800 font-semibold flex items-center justify-center transition active:scale-95 shadow-2xs aspect-square shrink-0"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            {/* User Avatar */}
            <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 flex items-center justify-center aspect-square shadow-2xs">
              <div className="w-6 h-6 rounded-lg bg-[#06C755] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-3.5 sm:p-8 space-y-4 sm:space-y-6">

        {/* 4 Metric Cards in 2x2 Grid on mobile (Matching Screenshot exactly) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>คิวทั้งหมดวันนี้</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {demoBookings.length}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>ยืนยันมัดจำแล้ว</span>
            </div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
              {todayConfirmed.length}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <DollarSign className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
              <span>ยอดมัดจำวันนี้</span>
            </div>
            <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ฿{totalDeposit.toLocaleString()}
            </div>
          </div>

          <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>เวลาร้านเปิด</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              10:00 - 20:00
            </div>
            <div className="text-[10px] text-amber-600 dark:text-amber-400 font-normal flex items-center gap-1 mt-0.5">
              <span>☕ Break 12:00 - 13:00</span>
            </div>
          </div>
        </div>

        {/* Filters & Actions Bar (Matching Screenshot) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 sm:p-5 rounded-3xl shadow-sm space-y-3">
          
          {/* Row 1: Date Navigation Bar */}
          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => setSelectedDate(format(subDays(currentDateObj, 1), 'yyyy-MM-dd'))}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex-1 min-w-0">
              <FormattedDateInput
                value={selectedDate}
                onChange={(val) => setSelectedDate(val)}
                className="w-full text-center"
              />
            </div>

            <button
              onClick={() => setSelectedDate(format(addDays(currentDateObj, 1), 'yyyy-MM-dd'))}
              className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Row 2: Green "ลงคิวเอง" Button */}
          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="w-full py-2.5 px-4 bg-[#00965e] hover:bg-[#008050] active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <PhoneCall className="w-4 h-4" />
            <span>ลงคิวเอง</span>
          </button>

          {/* Row 3: Branch / Staff Selector & View Mode Switcher */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1">
              <CustomDropdown
                value={selectedBranchFilter}
                onChange={(val) => setSelectedBranchFilter(val)}
                prefixIcon={<Building2 className="w-3.5 h-3.5 text-indigo-600" />}
                className="w-full"
                dropdownWidth="w-48"
                options={[
                  { value: 'all', label: 'ทุกสาขา' },
                ]}
              />
            </div>

            <div className="flex-1">
              <CustomDropdown
                value={selectedStaffFilter}
                onChange={(val) => setSelectedStaffFilter(val)}
                prefixIcon={<Users className="w-3.5 h-3.5 text-indigo-600" />}
                className="w-full"
                dropdownWidth="w-48"
                options={[
                  { value: 'all', label: 'ช่างทุกคน' },
                  { value: 'st1', label: 'ช่างเอก' },
                ]}
              />
            </div>

            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
              <button
                type="button"
                onClick={() => setBookingsViewMode('timeline')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  bookingsViewMode === 'timeline'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setBookingsViewMode('list')}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer ${
                  bookingsViewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Row 4: Status Segmented Filter Bar */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-x-auto">
            {[
              { id: 'all', label: 'ทั้งหมด' },
              { id: 'confirmed', label: 'ยืนยันสลิปแล้ว' },
              { id: 'pending_payment', label: 'รอตรวจสลิป' },
              { id: 'completed', label: 'เข้าใช้บริการแล้ว' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shrink-0 cursor-pointer ${
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

        {/* Bookings Card List matching Screenshot cards */}
        <div className="space-y-3">
          {filteredBookings.map((b) => (
            <div
              key={b.id}
              className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3"
            >
              {/* Header: Time, Status Badge & Deposit */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-extrabold text-slate-900 dark:text-white">
                      {b.start_time.slice(11, 16)} - {b.end_time.slice(11, 16)} น.
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80">
                      ยืนยันสลิปแล้ว
                    </span>
                  </div>
                  <div className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-1 flex items-center gap-2 flex-wrap">
                    <span>{b.service_title}</span>
                    <span className="text-[11px] text-slate-400 font-normal flex items-center gap-1">
                      <span>🏢 {b.branch_count}</span>
                      {b.staff_name && (
                        <span className="bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-indigo-700 dark:text-indigo-300 font-medium">
                          👤 {b.staff_name} ({b.staff_nickname})
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">มัดจำ: </span>
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                    ฿{b.deposit_amount}
                  </span>
                </div>
              </div>

              {/* Inner Customer Gray Card */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/70 rounded-2xl space-y-1.5 text-xs border border-slate-100 dark:border-slate-850">
                <div>
                  <span className="text-[10px] text-slate-400 block">ลูกค้า</span>
                  <span className="font-bold text-slate-900 dark:text-white text-xs">{b.customer_name}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">เบอร์โทร</span>
                  <span className="text-slate-500 font-mono">-</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">LINE ID</span>
                  <span className="text-slate-500 font-mono">-</span>
                </div>
                {b.notes && (
                  <div className="border-t border-slate-200/60 dark:border-slate-800 pt-1.5 mt-1 text-[11px] text-slate-600 dark:text-slate-400">
                    หมายเหตุ: {b.notes}
                  </div>
                )}
              </div>

              {/* Bottom Action Buttons (Matching Screenshot) */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleStatusChange(b.id, 'completed')}
                  className="px-4 py-2 bg-[#008ba3] hover:bg-[#007a8f] active:scale-95 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer"
                >
                  เข้าบริการเสร็จสิ้น
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(b.id, 'cancelled')}
                  className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
                >
                  ยกเลิกคิว
                </button>
              </div>

            </div>
          ))}
        </div>

      </main>

      {/* Bottom Mobile Navigation Bar (Matching Screenshot Exactly) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-2 py-1.5 flex items-center justify-around shadow-lg">
        
        {/* Tab 1: คิวงาน */}
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex flex-col items-center justify-center py-1 px-3 text-indigo-600 font-bold transition cursor-pointer relative"
        >
          <div className="relative">
            <CalendarIcon className="w-5 h-5" />
            <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] bg-indigo-600 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
              3
            </span>
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">คิวงาน</span>
        </button>

        {/* Tab 2: บล็อกเวลา */}
        <button
          type="button"
          onClick={() => toast.info('ในระบบจริงสามารถล็อคเวลาพักและปิดรับคิวได้อิสระ')}
          className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-700 transition cursor-pointer relative"
        >
          <Lock className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-tight">บล็อกเวลา</span>
        </button>

        {/* Tab 3: ช่าง/บริการ */}
        <button
          type="button"
          onClick={() => toast.info('ในระบบจริงสามารถเพิ่ม/ลบ/แก้ไขช่างและบริการได้')}
          className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-700 transition cursor-pointer relative"
        >
          <div className="relative">
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-2 min-w-[15px] h-[15px] bg-emerald-500 text-white rounded-full text-[9px] font-bold flex items-center justify-center px-0.5">
              1
            </span>
          </div>
          <span className="text-[10px] mt-0.5 leading-tight">ช่าง/บริการ</span>
        </button>

        {/* Tab 4: ตั้งค่าร้าน */}
        <Link
          href="/pricing"
          className="flex flex-col items-center justify-center py-1 px-3 text-slate-400 hover:text-slate-700 transition cursor-pointer"
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] mt-0.5 leading-tight">ตั้งค่าร้าน</span>
        </Link>

      </div>

      {/* Manual Booking Modal in Demo */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PhoneCall className="w-4 h-4 text-emerald-600" />
                <span>ลงคิวเอง (โทรจอง / หน้าร้าน)</span>
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="p-1 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              ในระบบจริงเจ้าของร้านสามารถลงคิวให้ลูกค้าที่โทรมาจอง หรือเดินเข้ามาหน้าร้าน เพื่อล็อกคิวไม่ให้ชนกับลูกค้าที่จองผ่าน LINE
            </p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  setIsManualModalOpen(false)
                  toast.success('จำลองการลงคิวสำเร็จ!')
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl active:scale-95"
              >
                ตกลง
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
