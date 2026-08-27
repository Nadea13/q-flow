'use client'

import { useState, useEffect } from 'react'
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
  Sparkles,
  Coffee,
  Plus,
  X
} from 'lucide-react'
import { format, addDays, subDays } from 'date-fns'
import { QFlowLogo } from '@/components/QFlowLogo'
import { CustomDropdown } from '@/components/CustomDropdown'
import { FormattedDateInput } from '@/components/FormattedDateInput'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function DemoDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all')
  const [selectedStaffFilter, setSelectedStaffFilter] = useState('all')
  const [bookingsViewMode, setBookingsViewMode] = useState<'timeline' | 'list'>('list')
  const [isManualModalOpen, setIsManualModalOpen] = useState(false)

  // Manual Booking Dialog States
  const [manualBranch, setManualBranch] = useState('1')
  const [manualStaff, setManualStaff] = useState('any')
  const [manualService, setManualService] = useState('s1')
  const [manualDate, setManualDate] = useState(selectedDate)
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('ลูกค้าโทรจอง / หน้าร้าน')

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

  // Mock Slots for Manual Booking Dialog (Matching Screenshot)
  const mockSlots = [
    { time: '10:00 - 11:00', isAvailable: false, reason: 'จองแล้ว' },
    { time: '10:30 - 11:30', isAvailable: false, reason: 'จองแล้ว' },
    { time: '11:00 - 12:00', isAvailable: true },
    { time: '11:30 - 12:30', isAvailable: false, reason: 'เวลาพัก' },
    { time: '12:00 - 13:00', isAvailable: false, reason: 'เวลาพัก' },
    { time: '12:30 - 13:30', isAvailable: false, reason: 'เวลาพัก' },
    { time: '13:00 - 14:00', isAvailable: true },
    { time: '13:30 - 14:30', isAvailable: true },
    { time: '14:00 - 15:00', isAvailable: true },
    { time: '14:30 - 15:30', isAvailable: true },
  ]

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

  function handleSaveManualBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) {
      toast.error('กรุณาเลือกรอบเวลาที่ต้องการลงคิว')
      return
    }
    if (!customerName.trim()) {
      toast.error('กรุณากรอกชื่อลูกค้า')
      return
    }

    const [startH, endH] = selectedSlot.split(' - ')
    const newBooking = {
      id: `demo-${Date.now()}`,
      customer_name: customerName.trim(),
      customer_phone: '-',
      customer_line_id: '-',
      service_title: 'บริการทั่วไป (Standard Service)',
      staff_name: manualStaff === 'st1' ? 'ช่างประจำร้าน (Master Specialist)' : '',
      staff_nickname: manualStaff === 'st1' ? 'ช่างเอก' : '',
      branch_name: 'สาขาหลัก',
      branch_count: 1,
      start_time: `${manualDate}T${startH}:00`,
      end_time: `${manualDate}T${endH}:00`,
      deposit_amount: 50,
      total_price: 500,
      status: 'confirmed',
      notes: notes.trim() || 'ลูกค้าโทรจอง / หน้าร้าน',
    }

    setDemoBookings((prev) => [newBooking, ...prev])
    setIsManualModalOpen(false)
    setCustomerName('')
    setSelectedSlot(null)
    toast.success('บันทึกลงคิวงานเรียบร้อยแล้ว!')
  }

  const currentDateObj = new Date(selectedDate)

  // Lock background scroll when modal is open
  useEffect(() => {
    if (isManualModalOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalStyle
      }
    }
  }, [isManualModalOpen])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">

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
              href="/demo/book"
              target="_blank"
              title="เปิดหน้าจองคิวฝั่งลูกค้า (Demo)"
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

        {/* BOOKINGS CONTENT: 1. TIMELINE GRID VIEW OR 2. DETAILED LIST VIEW */}
        {bookingsViewMode === 'timeline' ? (
          <div className="space-y-4">
            {/* Timeline Summary Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl shadow-2xs">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  ตารางรอบเวลาว่าง (60 นาที) • ประจำวันที่ {selectedDate}
                </span>
                <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                  (บริการทั่วไป Standard Service)
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-xl border border-emerald-200 dark:border-emerald-800/80 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>ว่าง {mockSlots.filter((s) => s.isAvailable).length} รอบ</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 rounded-xl border border-indigo-200 dark:border-indigo-800/80 font-bold">
                  <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span>จองแล้ว {demoBookings.length} คิว</span>
                </div>
              </div>
            </div>

            {/* Timeline Slots Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {mockSlots.map((slot, i) => {
                const isBreak = slot.reason === 'เวลาพัก'
                const isBooked = slot.reason === 'จองแล้ว'
                const matchedBooking = isBooked ? demoBookings[i % demoBookings.length] : null

                return (
                  <div
                    key={i}
                    className={`p-3.5 rounded-2xl border transition-colors flex flex-col justify-between min-h-[82px] ${
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
                      <span
                        className={`font-mono text-xs font-bold ${
                          slot.isAvailable
                            ? 'text-slate-900 dark:text-white'
                            : isBooked
                            ? 'text-indigo-950 dark:text-indigo-200'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {slot.time}
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

                    <div className="mt-2 flex items-center justify-between gap-1.5">
                      {slot.isAvailable ? (
                        <>
                          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>ว่าง</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedSlot(slot.time)
                              setManualDate(selectedDate)
                              setIsManualModalOpen(true)
                            }}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/60 dark:hover:bg-indigo-600 dark:text-indigo-300 dark:hover:text-white rounded-lg text-[10px] font-bold border border-indigo-200 dark:border-indigo-800/80 transition active:scale-95 cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>ลงคิว</span>
                          </button>
                        </>
                      ) : isBreak ? (
                        <span className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-medium">
                          <Coffee className="w-3 h-3 text-amber-500" />
                          <span>เวลาพักร้าน</span>
                        </span>
                      ) : isBooked ? (
                        <div className="text-left truncate w-full">
                          <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-200 block truncate">
                            👤 {matchedBooking?.customer_name || 'มีลูกค้าจองแล้ว'}
                          </span>
                          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 block truncate">
                            ✂️ {matchedBooking?.service_title || 'บริการทั่วไป'}
                          </span>
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
          </div>
        ) : (
          /* Bookings Card List matching Screenshot cards */
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
        )}

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

      {/* EXACT MANUAL BOOKING DIALOG (Matching Screenshot 100%) */}
      <AnimatePresence>
        {isManualModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsManualModalOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          >
            <motion.form
              initial={{ y: '100%', opacity: 0.5, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: '100%', opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={handleSaveManualBooking}
              className="w-full sm:max-w-md bg-white dark:bg-slate-900 border-t sm:border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] sm:max-h-[85vh] flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200/60 dark:border-emerald-800/60 font-bold">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                      ลงคิวจองด้วยตนเอง
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                      ลงตารางนัดหมายสำหรับลูกค้าที่โทรจอง หรือจองหน้าร้าน
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition active:scale-95 text-xs font-bold cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
                {/* 1. เลือกสาขา */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    เลือกสาขา
                  </label>
                  <CustomDropdown
                    value={manualBranch}
                    onChange={(val) => setManualBranch(val)}
                    prefixIcon={<Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    dropdownWidth="w-full"
                    className="w-full"
                    options={[
                      { value: '1', label: '1', icon: <Building2 className="w-4 h-4 text-emerald-600" /> },
                    ]}
                  />
                </div>

                {/* 2. เลือกช่าง / ผู้ให้บริการ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    เลือกช่าง / ผู้ให้บริการ
                  </label>
                  <CustomDropdown
                    value={manualStaff}
                    onChange={(val) => setManualStaff(val)}
                    prefixIcon={<Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    dropdownWidth="w-full"
                    className="w-full"
                    options={[
                      { value: 'any', label: 'ช่างท่านใดก็ได้ (เร็วที่สุด)', icon: <Users className="w-4 h-4 text-emerald-600" /> },
                      { value: 'st1', label: 'ช่างเอก (Master Specialist)', icon: <User className="w-4 h-4 text-slate-400" /> },
                    ]}
                  />
                </div>

                {/* 3. เลือกบริการ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    เลือกบริการ *
                  </label>
                  <CustomDropdown
                    value={manualService}
                    onChange={(val) => setManualService(val)}
                    prefixIcon={<Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    dropdownWidth="w-full"
                    className="w-full"
                    options={[
                      {
                        value: 's1',
                        label: 'บริการทั่วไป (Standard Service)',
                        sublabel: '60 นาที • ฿500',
                        icon: <Sparkles className="w-4 h-4 text-emerald-600" />,
                      },
                    ]}
                  />
                </div>

                {/* 4. วันที่ */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    วันที่นัดหมาย *
                  </label>
                  <FormattedDateInput
                    value={manualDate}
                    onChange={(val) => {
                      setManualDate(val)
                      setSelectedSlot(null)
                    }}
                  />
                </div>

                {/* 5. เลือกรอบเวลาว่าง */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>เลือกรอบเวลาว่าง (60 นาที) *</span>
                    </label>
                    {selectedSlot && (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        ✓ {selectedSlot}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto p-1.5 border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 custom-scrollbar">
                    {mockSlots.map((slot) => {
                      const isSelected = selectedSlot === slot.time
                      if (!slot.isAvailable) {
                        return (
                          <div
                            key={slot.time}
                            className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 text-center opacity-40 cursor-not-allowed select-none flex flex-col items-center justify-center min-h-[48px]"
                          >
                            <p className="text-xs font-semibold text-slate-400 dark:text-slate-600 line-through">
                              {slot.time}
                            </p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-full">
                              {slot.reason}
                            </p>
                          </div>
                        )
                      }

                      return (
                        <button
                          key={slot.time}
                          type="button"
                          onClick={() => setSelectedSlot(slot.time)}
                          className={`p-2.5 rounded-xl border text-center transition active:scale-95 flex flex-col items-center justify-center min-h-[48px] cursor-pointer ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-500/20'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/30'
                          }`}
                        >
                          <span className="text-xs font-semibold">{slot.time}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 6. ข้อมูลลูกค้า */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    ชื่อลูกค้า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น คุณสมศรี (โทรจอง)"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* 7. หมายเหตุ / บันทึกเพิ่มเติม */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    หมายเหตุ / บันทึกเพิ่มเติม (ถ้ามี)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ลูกค้าโทรจอง / หน้าร้าน"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 px-5 sm:px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/70 dark:bg-slate-950/60 safe-area-bottom">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold active:scale-95 transition cursor-pointer shadow-2xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold active:scale-95 shadow-2xs transition flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>บันทึกลงคิวงาน</span>
                </button>
              </div>

            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
