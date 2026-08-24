'use client'

import { useState } from 'react'
import Link from 'next/link'
import { 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Smartphone, 
  ShieldCheck, 
  Calendar, 
  Zap, 
  CreditCard, 
  Bell, 
  BarChart3, 
  Clock, 
  Check, 
  Lock, 
  HelpCircle,
  QrCode,
  Store,
  Layers,
  ChevronRight,
  MessageSquare,
  Scissors,
  Camera,
  Heart,
  Smile
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { PricingSection } from '@/components/PricingSection'

export default function Home() {
  const { t, lang } = useLanguage()
  const [howItWorksTab, setHowItWorksTab] = useState<'merchant' | 'customer'>('merchant')

  const merchantSteps = [
    {
      step: '01',
      title: lang === 'th' ? 'ตั้งค่าร้านใน 60 วินาที' : 'Setup Shop in 60s',
      desc: lang === 'th' 
        ? 'กรอกชื่อร้าน เลขพร้อมเพย์รับเงิน และยอดมัดจำที่ต้องการ ไม่ต้องเขียนโค้ด ไม่ต้องโหลดแอป'
        : 'Enter your shop name, PromptPay ID, and deposit amount. No coding or app downloads needed.',
      icon: Store,
      badge: lang === 'th' ? 'เริ่มต้นฟรี' : 'Free Setup'
    },
    {
      step: '02',
      title: lang === 'th' ? 'นำลิงก์ไปแปะใน LINE / Social' : 'Place Link in LINE OA & Social',
      desc: lang === 'th'
        ? 'นำลิงก์ Booking URL ไปตั้งในปุ่ม LINE Rich Menu หรือแชร์ให้ลูกค้าในเพจ Instagram/Facebook'
        : 'Attach your Booking URL to your LINE Rich Menu or bio link on IG/Facebook.',
      icon: MessageSquare,
      badge: lang === 'th' ? 'เชื่อมต่อ LINE LIFF' : 'LINE LIFF Ready'
    },
    {
      step: '03',
      title: lang === 'th' ? 'รับคิว & เงินมัดจำอัตโนมัติ 24 ชม.' : 'Automated Bookings & Deposits 24/7',
      desc: lang === 'th'
        ? 'ระบบตรวจสลิปให้ทันที และส่งการแจ้งเตือนเข้า LINE เจ้าของร้านสามารถดูตารางงานผ่าน Dashboard ได้ทุกที่'
        : 'Auto-verify slips via SlipOK. Get instant LINE notifications and manage schedules on the Dashboard.',
      icon: CheckCircle2,
      badge: lang === 'th' ? 'ตรวจสลิปอัตโนมัติ' : 'Auto Verification'
    }
  ]

  const customerSteps = [
    {
      step: '01',
      title: lang === 'th' ? 'เลือกรอบเวลาว่างใน 3 คลิก' : 'Pick Open Slot in 3 Clicks',
      desc: lang === 'th'
        ? 'แตะเลือกบริการ วันที่ในปฏิทิน และรอบเวลาที่สะดวก ระบบตัดรอบคิวซ้อนและเวลาพักเที่ยงให้อัตโนมัติ'
        : 'Select service, calendar date, and open slot. Overlapping slots and break hours are filtered automatically.',
      icon: Calendar,
      badge: lang === 'th' ? 'เช็คคิวแบบ Real-time' : 'Real-time Slots'
    },
    {
      step: '02',
      title: lang === 'th' ? 'สแกนพร้อมเพย์ & แนบสลิป' : 'Scan PromptPay & Attach Slip',
      desc: lang === 'th'
        ? 'สแกน QR Code พร้อมเพย์ที่ระบุยอดมัดจำพอดี แล้วอัปโหลดสลิป ระบบตรวจสอบความถูกต้องทันทีใน 1 วินาที'
        : 'Scan the exact-amount PromptPay QR and upload slip. SlipOK verifies bank details in 1 second.',
      icon: QrCode,
      badge: lang === 'th' ? 'แม่นยำ ปลอดภัย' : 'Fast & Secure'
    },
    {
      step: '03',
      title: lang === 'th' ? 'รับตั๋วคิวเข้า LINE ทันที' : 'Instant Booking Pass to LINE',
      desc: lang === 'th'
        ? 'ได้รับบัตรคิวยืนยันนัดหมายพร้อมสรุปรายการ สามารถกดแชร์หรือบันทึกลง LINE ได้ทันที'
        : 'Receive an instant digital appointment voucher with booking details and LINE share shortcut.',
      icon: Sparkles,
      badge: lang === 'th' ? 'ได้ตั๋วคิวทันที' : 'Instant Pass'
    }
  ]

  const targetAudiences = [
    {
      icon: Scissors,
      title: lang === 'th' ? 'ร้านทำผม & ซาลอน' : 'Hair Salons & Barbers',
      desc: lang === 'th' ? 'จัดรอบคิวตัด ดัด ทำสี ไม่ชนกัน' : 'Smooth scheduling for hair styling & cuts'
    },
    {
      icon: Sparkles,
      title: lang === 'th' ? 'ทำเล็บ & ต่อขนตา' : 'Nail & Lash Studios',
      desc: lang === 'th' ? 'ล็อกคิวพร้อมมัดจำ ลดลูกค้าเทคิว' : 'Guaranteed deposits to eliminate no-shows'
    },
    {
      icon: Heart,
      title: lang === 'th' ? 'คลินิกความงาม & ฟัน' : 'Aesthetic Clinics',
      desc: lang === 'th' ? 'นัดหมายคุณหมอและหัตถการล่วงหน้า' : 'Streamlined doctor & treatment bookings'
    },
    {
      icon: Camera,
      title: lang === 'th' ? 'สตูดิโอ & ห้องซ้อม' : 'Photo & Music Studios',
      desc: lang === 'th' ? 'จองรอบเช่าสถานที่ตามชั่วโมง' : 'Hourly studio & space reservations'
    },
    {
      icon: Smile,
      title: lang === 'th' ? 'นวดแผนไทย & สปา' : 'Massage & Spas',
      desc: lang === 'th' ? 'จัดคิวหมอนวดและห้องบริการต่อเนื่อง' : 'Manage therapist slots and treatment rooms'
    },
    {
      icon: Zap,
      title: lang === 'th' ? 'บริการส่วนตัว & โค้ช' : 'Personal Coaches & Tutors',
      desc: lang === 'th' ? 'นัดเวลาปรึกษาหรือสอน 1 ต่อ 1' : '1-on-1 consultation & coaching slots'
    }
  ]

  const faqs = [
    {
      q: lang === 'th' ? 'ลูกค้าและร้านค้าต้องดาวน์โหลดแอปพลิเคชันไหม?' : 'Do customers or merchants need to download an app?',
      a: lang === 'th' 
        ? 'ไม่ต้องดาวน์โหลดแอปใดๆ ทั้งสิ้นครับ! ลูกค้าสามารถเปิดจองผ่านแอป LINE (LINE LIFF) หรือผ่านเว็บบราวเซอร์ได้ทันที ส่วนร้านค้าสามารถจัดการหลังบ้านผ่านมือถือหรือคอมพิวเตอร์ได้เลย'
        : 'No downloads needed! Customers book directly inside the LINE app (LIFF) or standard web browsers, and merchants manage everything from mobile or desktop.'
    },
    {
      q: lang === 'th' ? 'ระบบตรวจสลิปอย่างไร ป้องกันสลิปปลอมได้จริงไหม?' : 'How does slip verification work? Does it prevent fake slips?',
      a: lang === 'th'
        ? 'QFlow เชื่อมต่อกับระบบ SlipOK API ซึ่งตรวจสอบข้อมูลกับระบบธนาคารโดยตรง โดยตรวจเช็คยอดเงิน บัญชีปลายทาง และเลขอ้างอิงสลิป (transRef) แบบเรียลไทม์ ป้องกันสลิปปลอม สลิปยอดไม่ตรง และสลิปที่ใช้ซ้ำ 100%'
        : 'QFlow connects directly with SlipOK API to verify real bank transfer metadata, exact amounts, receiver accounts, and duplicate transaction references.'
    },
    {
      q: lang === 'th' ? 'สามารถตั้งเวลาพักเที่ยง หรือบล็อกเวลาไม่ว่างได้ไหม?' : 'Can I set lunch breaks or quickly block busy hours?',
      a: lang === 'th'
        ? 'ทำได้ง่ายมากครับ! ในหน้า Dashboard มีระบบตั้งเวลาพักประจำวัน (เช่น 12:00 - 13:00 น.) ซึ่งจะตัดรอบว่างออกให้อัตโนมัติ และมีปุ่ม Quick Block เพื่อล็อกเวลาฉุกเฉินได้ใน 2 วินาที'
        : 'Yes! Configure daily lunch breaks (e.g. 12:00-13:00) to auto-exclude slots, or use Quick Block to lock specific hours in 2 seconds.'
    },
    {
      q: lang === 'th' ? 'มีระบบแจ้งเตือนเข้า LINE ไหม?' : 'Does it send instant LINE notifications?',
      a: lang === 'th'
        ? 'มีครบทั้ง 2 ฝั่งครับ! ฝั่งลูกค้าจะได้รับ Flex Message ตั๋วคิวยืนยันเข้าแชท LINE ทันที และฝั่งเจ้าของร้านจะได้รับแจ้งเตือน Flex Alert หรือ LINE Notify เมื่อมีคิวใหม่ที่ตรวจสลิปผ่านแล้ว'
        : 'Yes! Customers receive instant booking confirmation Flex Messages, and merchants receive instant push alerts when a booking is verified.'
    }
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Navigation */}
      <nav className="border-b border-slate-200/80 dark:border-slate-850/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-lg shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              Q
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                {t('appName')}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-1 tracking-wide">
                Smart Queue & Auto-Slip
              </span>
            </div>
          </Link>

          {/* Nav Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <a href="#how-it-works" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'วิธีใช้งาน' : 'How It Works'}
            </a>
            <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'จุดเด่น' : 'Features'}
            </a>
            <a href="#audiences" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'เหมาะกับใคร' : 'For Who'}
            </a>
            <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition font-bold text-indigo-600 dark:text-indigo-400">
              {lang === 'th' ? 'แพ็กเกจราคา' : 'Pricing'}
            </a>
            <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition">
              {lang === 'th' ? 'คำถามที่พบบ่อย' : 'FAQ'}
            </a>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <NavbarControls />

            <Link
              href="/glam-studio/book"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            >
              {lang === 'th' ? 'ดูตัวอย่างหน้าจอง' : 'Live Demo'}
            </Link>
            <Link
              href="/onboarding"
              className="text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white px-3.5 sm:px-4 py-2 rounded-xl shadow-sm shadow-indigo-600/20 transition-all flex items-center gap-1.5"
            >
              <span>{t('openShop60s')}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-14 sm:pt-20 pb-16 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-6 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{lang === 'th' ? 'ระบบจองคิว & ตรวจสลิปมัดจำอัตโนมัติ 100%' : '100% Automated Queue & Deposit Slip Verification'}</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.08 }}
            className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          >
            {lang === 'th' ? 'หมดปัญหาจองคิวซ้อน ลูกค้าเบี้ยวคิว' : 'End Double Bookings & No-Shows'} <br />
            <span className="text-indigo-600 dark:text-indigo-400">
              {lang === 'th' ? 'ตรวจสลิปมัดจำทันทีผ่าน LINE & Web' : 'Instant Deposit Checks via LINE & Web'}
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.16 }}
            className="mt-6 text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal"
          >
            {lang === 'th'
              ? 'โซลูชัน Micro-SaaS สำหรับร้านทำผม คลินิก ทำเล็บ สตูดิโอ นวดสปา ลูกค้าจองได้ใน 3 คลิก ไม่ต้องโหลดแอป พร้อมตัดรอบชนและเวลาพักเที่ยงอัตโนมัติ'
              : 'The streamlined booking engine for salons, clinics, studios, and spas. 3-click booking via LINE LIFF with real-time slip verification.'}
          </motion.p>

          {/* Hero CTAs */}
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.24 }}
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <Link
              href="/onboarding"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-600/20 active:scale-98 flex items-center justify-center gap-2 transition"
            >
              <Zap className="w-4 h-4 fill-white" />
              {t('startFree60s')}
            </Link>
            <Link
              href="/glam-studio/book"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 font-semibold text-sm flex items-center justify-center gap-2 shadow-2xs transition active:scale-98"
            >
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              {lang === 'th' ? 'ทดลองจองคิวจริง (Demo)' : 'Try Live Booking (Demo)'}
            </Link>
          </motion.div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto mt-16 pt-8 border-t border-slate-200 dark:border-slate-800/80">
          <div className="text-center p-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">3 {lang === 'th' ? 'คลิก' : 'Clicks'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'th' ? 'ลูกค้าจองเสร็จใน 30 วิ' : 'Fast booking flow'}</div>
          </div>
          <div className="text-center p-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">0 {lang === 'th' ? 'วิ' : 'Sec'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'th' ? 'ตรวจสลิปอัตโนมัติไม่ต้องรอแอดมิน' : 'Instant SlipOK check'}</div>
          </div>
          <div className="text-center p-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">24 {lang === 'th' ? 'ชม.' : 'Hours'}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'th' ? 'รับคิวตลอดเวลา แม้ร้านปิด' : 'Always online booking'}</div>
          </div>
          <div className="text-center p-3">
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-600 dark:text-cyan-400 tracking-tight">100%</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{lang === 'th' ? 'รองรับ LINE OA & ทุกมือถือ' : 'LINE OA & Web ready'}</div>
          </div>
        </div>
      </section>

      {/* SECTION: HOW IT WORKS / วิธีใช้งานเบื้องต้น */}
      <section id="how-it-works" className="py-16 sm:py-24 bg-white dark:bg-slate-900/50 border-y border-slate-200 dark:border-slate-850">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold mb-3">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'th' ? 'ขั้นตอนง่ายๆ ใน 3 สเต็ป' : 'Simple 3-Step Process'}</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'th' ? 'วิธีใช้งานเบื้องต้น' : 'How QFlow Works'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              {lang === 'th' ? 'ระบบที่ออกแบบมาให้ใช้งานง่ายที่สุดทั้งสำหรับร้านค้าและลูกค้าผู้จอง' : 'Engineered for seamless experience on both sides.'}
            </p>

            {/* Switch View Tabs */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mt-6 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setHowItWorksTab('merchant')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  howItWorksTab === 'merchant'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>{lang === 'th' ? 'สำหรับเจ้าของร้าน (Merchant)' : 'For Shop Owners'}</span>
              </button>
              <button
                onClick={() => setHowItWorksTab('customer')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
                  howItWorksTab === 'customer'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>{lang === 'th' ? 'สำหรับลูกค้าผู้จอง (Customer)' : 'For Customers'}</span>
              </button>
            </div>
          </div>

          {/* Step Cards Grid */}
          <AnimatePresence mode="wait">
            <motion.div
              key={howItWorksTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {(howItWorksTab === 'merchant' ? merchantSteps : customerSteps).map((item, idx) => {
                const IconComponent = item.icon
                return (
                  <div
                    key={idx}
                    className="p-6 sm:p-7 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xs relative hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <span className="font-mono text-2xl font-extrabold text-slate-300 dark:text-slate-700">
                          {item.step}
                        </span>
                      </div>

                      <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block mb-1">
                        {item.badge}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-5 mt-5 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center text-xs text-indigo-600 dark:text-indigo-400 font-semibold">
                      <span>{lang === 'th' ? `สเต็ปที่ ${idx + 1}` : `Step ${idx + 1}`}</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </div>
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>

      {/* SECTION: CORE FEATURES (BENTO GRID) */}
      <section id="features" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold mb-3 border border-emerald-200 dark:border-emerald-800/80">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{lang === 'th' ? 'ครบเครื่องเรื่องระบบจองคิว' : 'All-in-One Engine'}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {lang === 'th' ? 'ฟีเจอร์เด่นเพื่อธุรกิจบริการ' : 'Powerful Features for Services'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
            {lang === 'th' ? 'พัฒนาขึ้นเพื่อแก้ปัญหาการจัดการคิวของร้านค้า SME โดยเฉพาะ' : 'Built specifically to eliminate friction and missed appointments.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Bento Feature 1 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {lang === 'th' ? 'อัลกอริทึม Slot Engine คำนวณคิวแม่นยำ 100%' : 'Smart Slot Engine & Break Times'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {lang === 'th' 
                ? 'คำนวณรอบเวลาว่างอัตโนมัติตามระยะเวลาบริการ (Duration) ช่วงความถี่ (Interval) พร้อมตัดรอบชนและล็อกเวลาพักเที่ยงของร้านให้อัตโนมัติ'
                : 'Calculates open time slots dynamically based on service duration, intervals, and merchant daily break hours.'}
            </p>
          </div>

          {/* Bento Feature 2 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {lang === 'th' ? 'สร้าง PromptPay QR & ตรวจสลิป SlipOK อัตโนมัติ' : 'PromptPay QR & Instant SlipOK Verification'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {lang === 'th'
                ? 'สร้าง PromptPay QR Code ฝังยอดมัดจำเป๊ะๆ ตรวจสอบสลิปธนาคารจริง ป้องกันสลิปปลอม สลิปยอดไม่ตรง และสลิปซ้ำทันที'
                : 'Generates EMVCo PromptPay QR with exact deposit amounts. Verifies bank slip validity, receiver account, and prevents duplicate slips.'}
            </p>
          </div>

          {/* Bento Feature 3 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <MessageSquare className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {lang === 'th' ? 'เชื่อมต่อ LINE OA & LINE LIFF ไร้รอยต่อ' : 'LINE OA & LIFF Native Integration'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {lang === 'th'
                ? 'ดึงชื่อและโปรไฟล์ LINE ของลูกค้ามากรอกให้อัตโนมัติ ส่งตั๋วคิว Flex Message เข้าแชทลูกค้า และแจ้งเตือนแอดมินร้านทันที'
                : 'Auto-fills customer LINE profiles inside LIFF, delivers Flex Message booking passes to customers, and alerts merchants instantly.'}
            </p>
          </div>

          {/* Bento Feature 4 */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {lang === 'th' ? 'Dashboard บริหารจัดการตารางงาน & บล็อกคิวด่วน' : 'Merchant Dashboard & Quick Slot Block'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-normal">
              {lang === 'th'
                ? 'ดูสถิติคิวประจำวัน จัดการสถานะคิว ดูรูปสลิปขยายเต็มจอ และกดล็อกเวลาที่ไม่สะดวกรับลูกค้าฉุกเฉินได้ในคลิกเดียว'
                : 'Track daily metrics, review full-size payment slips, manage service catalogs, and lock emergency off-hours effortlessly.'}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION: WHO IS IT FOR / เหมาะกับใคร */}
      <section id="audiences" className="py-16 bg-slate-100/70 dark:bg-slate-900/40 border-y border-slate-200 dark:border-slate-850">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'th' ? 'เหมาะสำหรับธุรกิจบริการทุกรูปแบบ' : 'Built for All Service Businesses'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2">
              {lang === 'th' ? 'ตอบโจทย์ธุรกิจที่ต้องการรับมัดจำล่วงหน้าและจัดตารางเวลาอย่างเป็นระบบ' : 'Perfect for appointment-driven and deposit-based businesses.'}
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {targetAudiences.map((aud, i) => {
              const IconComp = aud.icon
              return (
                <div
                  key={i}
                  className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col justify-between"
                >
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{aud.title}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{aud.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* SECTION: PRICING PLANS */}
      <section id="pricing" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <PricingSection />
      </section>

      {/* SECTION: FAQ */}
      <section id="faq" className="py-16 sm:py-24 max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {lang === 'th' ? 'คำถามที่พบบ่อย (FAQ)' : 'Frequently Asked Questions'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {lang === 'th' ? 'ข้อสงสัยทั่วไปเกี่ยวกับการใช้งานระบบ QFlow' : 'Answers to common questions about QFlow.'}
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2"
            >
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 pl-6 leading-relaxed font-normal">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CALL TO ACTION BANNER */}
      <section className="py-16 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-800 dark:from-indigo-900 dark:to-slate-900 p-8 sm:p-12 text-center text-white shadow-xl shadow-indigo-600/10 relative overflow-hidden border border-indigo-500/30">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-3">
            {lang === 'th' ? 'พร้อมยกระดับระบบจองคิวร้านคุณหรือยัง?' : 'Ready to streamline your bookings?'}
          </h2>
          <p className="text-xs sm:text-sm text-indigo-100 max-w-xl mx-auto mb-8 leading-relaxed font-normal">
            {lang === 'th'
              ? 'เปิดร้านและรับลิงก์จองคิวพร้อมระบบตรวจสลิปอัตโนมัติได้ฟรีใน 60 วินาที ไม่ต้องผูกบัตรเครดิต'
              : 'Launch your queue booking engine and auto-deposit slip checker in 60 seconds. No credit card required.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm shadow-md transition active:scale-98 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-indigo-600 text-indigo-600" />
              <span>{t('startFree60s')}</span>
            </Link>
            <Link
              href="/glam-studio/book"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-700/60 hover:bg-indigo-700/80 text-white border border-indigo-400/40 font-semibold text-sm transition active:scale-98"
            >
              {lang === 'th' ? 'ดูตัวอย่างหน้าจอง' : 'Explore Live Demo'}
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 dark:border-slate-850 py-10 bg-white dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-indigo-600 dark:bg-indigo-500 flex items-center justify-center font-bold text-white text-xs">
              Q
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">QFlow Micro-SaaS</span>
            <span>• Next.js 16 + Supabase</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/onboarding" className="hover:text-indigo-600 dark:hover:text-indigo-400">{t('openShop60s')}</Link>
            <Link href="/glam-studio/book" className="hover:text-indigo-600 dark:hover:text-indigo-400">Demo Booking</Link>
            <Link href="/glam-studio/dashboard" className="hover:text-indigo-600 dark:hover:text-indigo-400">Demo Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
