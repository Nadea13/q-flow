'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'th' | 'en'

export const translations = {
  th: {
    // Brand & Common
    appName: 'QFlow',
    appTagline: 'ระบบจองคิวบริการ & ตรวจสลิปมัดจำอัตโนมัติ',
    save: 'บันทึก',
    cancel: 'ยกเลิก',
    close: 'ปิด',
    copy: 'คัดลอก',
    copied: 'คัดลอกแล้ว',
    back: 'ย้อนกลับ',
    next: 'ต่อไป',
    confirm: 'ยืนยัน',
    delete: 'ลบ',
    edit: 'แก้ไข',
    status: 'สถานะ',
    today: 'วันนี้',
    tomorrow: 'พรุ่งนี้',
    all: 'ทั้งหมด',
    loading: 'กำลังโหลด...',
    errorOccurred: 'เกิดข้อผิดพลาด',
    free: 'ฟรี',
    baht: 'บาท',
    minutes: 'นาที',
    live: 'เปิดใช้งาน',

    // Landing Page
    heroTitle1: 'ระบบจองคิวบริการ',
    heroTitle2: 'ตรวจสลิปมัดจำอัตโนมัติ 3 คลิก',
    heroDesc: 'หมดปัญหาลูกค้า No-Show, ตอบแชทช้า, หรือเช็กสลิปปลอมมือหมุน ด้วยระบบจองคิวผ่าน LINE LIFF & Responsive Web สำหรับธุรกิจ SME ขนาดเล็ก',
    startFree60s: 'เริ่มใช้งานฟรีใน 60 วินาที',
    testBookingUI: 'ทดสอบ Client Booking UI',
    viewDemo: 'ดูตัวอย่างหน้าจอง (Demo)',
    openShop60s: 'เปิดร้าน 60 วินาที',
    demoShopTitle: 'ตัวอย่างร้านค้าทดสอบ (Demo Shop)',
    demoShopSubtitle: 'ทดลองสัมผัส Flow การจองจริง หรือเข้าดูหน้าจัดการตารางคิว',
    demoShopBook: 'ร้านตัวอย่าง: Glam Studio (หน้าจองคิว)',
    demoShopDashboard: 'ร้านตัวอย่าง: Glam Studio (Dashboard หลังบ้าน)',
    uvp1Title: 'Smart Queue, Seamless Flow',
    uvp1Desc: 'ลูกค้าเลือกรอบวัน/เวลา/บริการ จบใน 3 คลิกผ่าน LINE LIFF ดึงชื่อโปรไฟล์อัตโนมัติ จองได้ตลอด 24 ชม.',
    uvp2Title: 'Auto-Slip & Deposit Check',
    uvp2Desc: 'สร้าง PromptPay QR ฝังยอดมัดจำ พร้อมต่อ SlipOK API ตรวจสลิป ป้องกันสลิปซ้ำ และเงินเข้าบัญชีร้าน 100%',
    uvp3Title: 'Merchant Dashboard',
    uvp3Desc: 'ดูตารางคิวประจำวัน บล็อกช่วงเวลาด่วน ตั้งเวลาพักเที่ยง และรับการแจ้งเตือนเมื่อมีลูกค้าจองสำเร็จทันที',

    // Onboarding
    onboardingBadge: '60-Second Zero Friction Onboarding',
    onboardingTitle: 'เปิดระบบจองคิวร้านคุณ',
    onboardingSubtitle: 'กรอกเพียง 3 ช่อง รับลิงก์จองคิวพร้อมระบบตรวจสลิปมัดจำอัตโนมัติทันที',
    shopNameLabel: '1. ชื่อร้านค้า / บริการ',
    shopNamePlaceholder: 'เช่น Glam Studio, ช่างตัดผมพี่เอก',
    promptpayLabel: '2. เบอร์โทร หรือ เลขบัตร/พร้อมเพย์รับเงิน',
    promptpayPlaceholder: 'เช่น 0812345678 หรือ 1409900000000',
    promptpayHint: 'ระบบจะใช้เลขนี้สร้าง QR Code พร้อมเพย์ให้ลูกค้าสแกนโอนตรงเข้าบัญชีคุณ',
    depositLabel: '3. ยอดเงินมัดจำต่อคิว (บาท)',
    depositPlaceholder: 'เช่น 100, 200, 300',
    depositHint: 'กันปัญหา No-Show ลูกค้าจองแล้วไม่มา',
    customSlugLabel: 'URL ร้านค้า (กำหนดเองได้ หรือปล่อยว่างเพื่อให้ระบบสร้างให้อัตโนมัติ)',
    createShopBtn: 'เริ่มเปิดรับคิวทันที (ฟรี)',
    creatingShop: 'กำลังสร้างระบบ...',
    onboardingSuccessTitle: 'สร้างร้านสำเร็จแล้ว! 🎉',
    onboardingSuccessDesc: 'พร้อมรับคิว 24 ชั่วโมง',
    yourBookingLink: 'Booking Link ของคุณ (นำไปวางใน LINE Rich Menu / เพจ)',
    testBookingBtn: 'ทดลองหน้าจอง',
    gotoDashboardBtn: 'จัดการหลังบ้าน',

    // Booking Page
    stepOf: 'ขั้นตอนที่ {step} จาก 3',
    step1Title: '1. เลือกบริการที่ต้องการ',
    step1Subtitle: 'แตะเพื่อเลือกบริการที่ต้องการจอง',
    step2Title: '2. เลือกวันและรอบเวลา',
    step2Subtitle: 'เลือกวันที่และรอบเวลาที่สะดวกเข้าใช้บริการ',
    step3Title: '3. กรอกข้อมูลเพื่อยืนยันคิว',
    step3Subtitle: 'ตรวจสอบสรุปรายการและกรอกข้อมูลติดต่อ',
    selectedService: 'บริการที่เลือก',
    change: 'เปลี่ยน',
    selectDate: 'เลือกวันที่',
    selectTimeSlot: 'เลือกรอบเวลาว่าง',
    depositAmount: 'มัดจำ',
    fullPrice: 'ราคาเต็ม',
    calculatingSlots: 'กำลังคำนวณคิวว่าง...',
    noAvailableSlots: 'ไม่มีรอบเวลาว่างในวันที่เลือก',
    nextCustomerInfo: 'ต่อไป: กรอกข้อมูลผู้จอง',
    bookingSummary: 'สรุปรายการจอง',
    service: 'บริการ',
    dateTime: 'วัน/เวลา',
    depositToPay: 'ยอดเงินมัดจำที่ต้องชำระ',
    customerName: 'ชื่อ-นามสกุล / ชื่อเล่น',
    customerNamePlaceholder: 'เช่น คุณสมศรี, น้องแพรว',
    customerPhone: 'เบอร์โทรศัพท์ติดต่อ',
    customerPhonePlaceholder: '08xxxxxxxx',
    customerLineId: 'LINE ID (เพื่อรับการแจ้งเตือนและการติดต่อจากทางร้าน)',
    customerLineIdPlaceholder: '@line_id หรือ ไอดีไลน์',
    customerNotes: 'หมายเหตุเพิ่มเติม / คำขอพิเศษ',
    customerNotesPlaceholder: 'เช่น แพ้น้ำยา, ต้องการช่างประจำ, อื่นๆ',
    confirmAndPayBtn: 'ยืนยันการจอง & ไปหน้าชำระมัดจำ',
    submittingBooking: 'กำลังดำเนินการ...',
    shopBreakTime: 'เวลาพักของร้าน (Break)',
    slotBooked: 'มีลูกค้าจองแล้ว',
    slotBlocked: 'ร้านปิดรับรอบนี้',
    slotPast: 'หมดเวลาจองรอบนี้แล้ว',

    // Payment & Confirmation
    pendingPayment: 'รอชำระเงินมัดจำ',
    confirmedBooking: 'ยืนยันคิวแล้ว',
    scanPromptPay: 'สแกนจ่ายผ่าน PromptPay QR',
    depositPrice: 'ยอดเงินมัดจำ',
    promptpayNumber: 'เลขพร้อมเพย์',
    saveQrImage: 'บันทึกรูป QR Code ลงมือถือ',
    attachSlipTitle: 'แนบสลิปการโอนเงินเพื่อยืนยันคิว',
    attachSlipSubtitle: 'ระบบจะตรวจสลิปผ่าน SlipOK ทันที เมื่อถูกต้องจะล็อกคิวให้อัตโนมัติ',
    chooseSlipImage: 'แตะเพื่อเลือกรูปภาพสลิป',
    changeSlipImage: 'แตะเพื่อเปลี่ยนรูปสลิป',
    supportedFiles: 'รองรับไฟล์ JPG, PNG จากแอปธนาคาร',
    verifySlipBtn: 'ตรวจสอบสลิป & ยืนยันการจอง',
    verifyingSlip: 'กำลังตรวจสอบสลิปผ่าน SlipOK...',
    bookingSuccessTitle: 'จองคิวสำเร็จแล้ว! 🎉',
    bookingSuccessSubtitle: 'ระบบได้ตรวจสลิปและล็อกคิวของคุณเรียบร้อยแล้ว',
    bookingId: 'รหัสคิว (Booking ID)',
    bookMoreBtn: 'จองคิวใหม่ / จองเพิ่ม',

    // Dashboard
    dashboardTitle: 'Merchant Admin Center',
    openCustomerBooking: 'เปิดหน้าจองลูกค้า',
    todayBookings: 'คิวทั้งหมดวันนี้',
    todayConfirmed: 'ยืนยันมัดจำแล้ว',
    todayDepositTotal: 'ยอดมัดจำวันนี้',
    shopHours: 'เวลาร้านเปิด',
    shopBreakTimeLabel: 'เวลาพักร้าน',
    tabBookings: 'ตารางคิวงาน',
    tabBlockSlots: 'บล็อกเวลาด่วน',
    tabServices: 'จัดการบริการ',
    tabSettings: 'ตั้งค่าร้าน & LINE',
    noBookingsFound: 'ไม่มีรายการจองในวันที่เลือก',
    customer: 'ลูกค้า',
    phone: 'เบอร์โทร',
    lineId: 'LINE ID',
    notes: 'หมายเหตุ',
    viewSlip: 'ดูรูปสลิป',
    markCompleted: 'เข้าบริการเสร็จสิ้น',
    cancelBooking: 'ยกเลิกคิว',
    statusConfirmed: 'ยืนยันสลิปแล้ว',
    statusCompleted: 'เข้าใช้บริการแล้ว',
    statusCancelled: 'ยกเลิกคิว',
    statusPending: 'รอตรวจสลิป',
    statusNoShow: 'ไม่มาตามนัด',

    // Block Slots Tab
    blockSlotTitle: 'บล็อกช่วงเวลาด่วน (ไม่ให้ลูกค้าจอง)',
    date: 'วันที่',
    startTime: 'เวลาเริ่ม',
    endTime: 'เวลาสิ้นสุด',
    reason: 'เหตุผล',
    reasonPlaceholder: 'เช่น พักเที่ยง, ลากิจ',
    saveBlockBtn: 'บันทึกการบล็อกเวลา',
    blockedListTitle: 'รายการเวลาที่ถูกบล็อก',
    noBlockedSlots: 'ไม่มีช่วงเวลาที่ถูกบล็อก',

    // Services Tab
    allServicesTitle: 'รายการบริการทั้งหมด',
    addNewServiceBtn: 'เพิ่มบริการใหม่',
    editServiceTitle: 'แก้ไขบริการ',
    serviceName: 'ชื่อบริการ',
    serviceDesc: 'รายละเอียดบริการ',
    durationMin: 'ระยะเวลา (นาที)',
    servicePrice: 'ราคาเต็ม (บาท)',
    serviceDeposit: 'ยอดเงินมัดจำ (เว้นว่างเพื่อใช้ค่าเริ่มต้นของร้าน)',

    // Settings Tab
    shopSettingsTitle: 'ตั้งค่าร้านค้า & การแจ้งเตือน LINE',
    shopName: 'ชื่อร้าน',
    shopPhone: 'เบอร์ติดต่อร้าน',
    promptpayAccountName: 'ชื่อบัญชีพร้อมเพย์',
    openTime: 'เวลาเปิดร้าน',
    closeTime: 'เวลาปิดร้าน',
    enableDailyBreak: 'เปิดใช้งานเวลาพักประจำวัน (เช่น พักเที่ยง)',
    breakStartTime: 'เวลาเริ่มพัก',
    breakEndTime: 'เวลาสิ้นสุดพัก',
    defaultDepositAmount: 'ค่ามัดจำเริ่มต้น (บาท)',
    slotInterval: 'ช่วงความถี่รอบจอง',
    every15Min: 'ทุก 15 นาที',
    every30Min: 'ทุก 30 นาที',
    every60Min: 'ทุก 60 นาที',
    lineNotifyTokenLabel: 'LINE Notify Token (แจ้งเตือนเข้ากลุ่มแอดมินเมื่อมีคิวใหม่)',
    saveSettingsBtn: 'บันทึกการตั้งค่าร้านค้า',
    settingsSaved: 'บันทึกการตั้งค่าเรียบร้อยแล้ว',
  },
  en: {
    // Brand & Common
    appName: 'QFlow',
    appTagline: 'Smart Booking & Auto-Deposit Verification',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied',
    back: 'Back',
    next: 'Next',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    status: 'Status',
    today: 'Today',
    tomorrow: 'Tomorrow',
    all: 'All',
    loading: 'Loading...',
    errorOccurred: 'An error occurred',
    free: 'Free',
    baht: 'THB',
    minutes: 'min',
    live: 'Live',

    // Landing Page
    heroTitle1: 'Smart Queue Booking',
    heroTitle2: 'Auto-Deposit Verification in 3 Clicks',
    heroDesc: 'Eliminate No-Shows, slow chat responses, and fake slip checks with LINE LIFF & Responsive Web booking for SME businesses.',
    startFree60s: 'Start Free in 60s',
    testBookingUI: 'Try Client Booking UI',
    viewDemo: 'View Demo Booking',
    openShop60s: 'Open Shop in 60s',
    demoShopTitle: 'Interactive Demo Shop',
    demoShopSubtitle: 'Experience the real customer booking flow or view the merchant admin dashboard.',
    demoShopBook: 'Demo Shop: Glam Studio (Booking Page)',
    demoShopDashboard: 'Demo Shop: Glam Studio (Admin Dashboard)',
    uvp1Title: 'Smart Queue, Seamless Flow',
    uvp1Desc: 'Customers select services and slots in 3 clicks via LINE LIFF with auto-filled profile, open 24/7.',
    uvp2Title: 'Auto-Slip & Deposit Check',
    uvp2Desc: 'Generates PromptPay QR with embedded deposit amount and checks slips via SlipOK API with duplicate fraud protection.',
    uvp3Title: 'Merchant Dashboard',
    uvp3Desc: 'Manage daily appointments, set quick block-outs and lunch break hours, with instant LINE alerts on new bookings.',

    // Onboarding
    onboardingBadge: '60-Second Zero Friction Onboarding',
    onboardingTitle: 'Launch Your Booking System',
    onboardingSubtitle: 'Fill only 3 fields to get your custom booking link with automated slip check.',
    shopNameLabel: '1. Shop / Business Name',
    shopNamePlaceholder: 'e.g. Glam Studio, Barber Jake',
    promptpayLabel: '2. Phone or PromptPay / ID Number',
    promptpayPlaceholder: 'e.g. 0812345678 or 1409900000000',
    promptpayHint: 'Used to generate PromptPay QR codes for customers to pay directly to your account.',
    depositLabel: '3. Deposit Amount per Booking (THB)',
    depositPlaceholder: 'e.g. 100, 200, 300',
    depositHint: 'Prevents customer no-shows.',
    customSlugLabel: 'Shop URL (Optional custom slug, or leave empty for auto-generated)',
    createShopBtn: 'Launch My Booking Link (Free)',
    creatingShop: 'Creating your system...',
    onboardingSuccessTitle: 'Shop Created Successfully! 🎉',
    onboardingSuccessDesc: 'Ready to accept appointments 24/7',
    yourBookingLink: 'Your Booking Link (Paste in LINE Rich Menu / Social Media)',
    testBookingBtn: 'Try Booking Page',
    gotoDashboardBtn: 'Admin Dashboard',

    // Booking Page
    stepOf: 'Step {step} of 3',
    step1Title: '1. Select Service',
    step1Subtitle: 'Tap to choose the service you want to book',
    step2Title: '2. Select Date & Time',
    step2Subtitle: 'Choose a date and convenient available time slot',
    step3Title: '3. Customer Information',
    step3Subtitle: 'Review booking summary and enter contact info',
    selectedService: 'Selected Service',
    change: 'Change',
    selectDate: 'Select Date',
    selectTimeSlot: 'Select Available Time Slot',
    depositAmount: 'Deposit',
    fullPrice: 'Full Price',
    calculatingSlots: 'Computing available slots...',
    noAvailableSlots: 'No available slots on this date',
    nextCustomerInfo: 'Next: Customer Info',
    bookingSummary: 'Booking Summary',
    service: 'Service',
    dateTime: 'Date & Time',
    depositToPay: 'Deposit Amount Due',
    customerName: 'Full Name / Nickname',
    customerNamePlaceholder: 'e.g. Sarah Connor, Alex',
    customerPhone: 'Phone Number',
    customerPhonePlaceholder: '08xxxxxxxx',
    customerLineId: 'LINE ID (For booking updates and contact)',
    customerLineIdPlaceholder: '@line_id or user id',
    customerNotes: 'Additional Notes / Requests',
    customerNotesPlaceholder: 'e.g. Allergies, preferred stylist, etc.',
    confirmAndPayBtn: 'Confirm Booking & Pay Deposit',
    submittingBooking: 'Processing...',
    shopBreakTime: 'Shop Break Time',
    slotBooked: 'Already Booked',
    slotBlocked: 'Closed by Shop',
    slotPast: 'Time Passed',

    // Payment & Confirmation
    pendingPayment: 'Awaiting Deposit Payment',
    confirmedBooking: 'Booking Confirmed',
    scanPromptPay: 'Pay via PromptPay QR',
    depositPrice: 'Deposit Amount',
    promptpayNumber: 'PromptPay ID',
    saveQrImage: 'Save QR Code Image',
    attachSlipTitle: 'Attach Bank Transfer Slip to Confirm',
    attachSlipSubtitle: 'SlipOK will instantly verify your payment slip and lock your slot.',
    chooseSlipImage: 'Tap to select payment slip',
    changeSlipImage: 'Tap to change slip image',
    supportedFiles: 'Supports JPG, PNG from banking apps',
    verifySlipBtn: 'Verify Slip & Confirm Booking',
    verifyingSlip: 'Verifying slip via SlipOK...',
    bookingSuccessTitle: 'Booking Confirmed! 🎉',
    bookingSuccessSubtitle: 'Payment verified and your slot has been reserved.',
    bookingId: 'Booking ID',
    bookMoreBtn: 'Book Another Appointment',

    // Dashboard
    dashboardTitle: 'Merchant Admin Center',
    openCustomerBooking: 'Open Customer Booking',
    todayBookings: "Today's Bookings",
    todayConfirmed: 'Deposit Confirmed',
    todayDepositTotal: "Today's Deposit Total",
    shopHours: 'Opening Hours',
    shopBreakTimeLabel: 'Lunch/Daily Break',
    tabBookings: 'Appointments',
    tabBlockSlots: 'Quick Block',
    tabServices: 'Services',
    tabSettings: 'Settings & LINE',
    noBookingsFound: 'No bookings on selected date',
    customer: 'Customer',
    phone: 'Phone',
    lineId: 'LINE ID',
    notes: 'Notes',
    viewSlip: 'View Slip',
    markCompleted: 'Mark Completed',
    cancelBooking: 'Cancel Booking',
    statusConfirmed: 'Confirmed',
    statusCompleted: 'Completed',
    statusCancelled: 'Cancelled',
    statusPending: 'Pending Slip',
    statusNoShow: 'No Show',

    // Block Slots Tab
    blockSlotTitle: 'Quick Block Time Slot',
    date: 'Date',
    startTime: 'Start Time',
    endTime: 'End Time',
    reason: 'Reason',
    reasonPlaceholder: 'e.g. Lunch break, personal errand',
    saveBlockBtn: 'Save Blocked Slot',
    blockedListTitle: 'Blocked Time Ranges',
    noBlockedSlots: 'No blocked time ranges',

    // Services Tab
    allServicesTitle: 'All Services',
    addNewServiceBtn: 'Add New Service',
    editServiceTitle: 'Edit Service',
    serviceName: 'Service Name',
    serviceDesc: 'Description',
    durationMin: 'Duration (minutes)',
    servicePrice: 'Full Price (THB)',
    serviceDeposit: 'Deposit (Leave blank for shop default)',

    // Settings Tab
    shopSettingsTitle: 'Shop Settings & LINE Notifications',
    shopName: 'Shop Name',
    shopPhone: 'Contact Phone',
    promptpayAccountName: 'PromptPay Account Name',
    openTime: 'Open Time',
    closeTime: 'Close Time',
    enableDailyBreak: 'Enable Daily Break (e.g. Lunch Break)',
    breakStartTime: 'Break Start Time',
    breakEndTime: 'Break End Time',
    defaultDepositAmount: 'Default Deposit (THB)',
    slotInterval: 'Slot Interval',
    every15Min: 'Every 15 mins',
    every30Min: 'Every 30 mins',
    every60Min: 'Every 60 mins',
    lineNotifyTokenLabel: 'LINE Notify Token (Sends alerts to admin group upon new booking)',
    saveSettingsBtn: 'Save Shop Settings',
    settingsSaved: 'Settings saved successfully',
  },
} as const

type TranslationKeys = keyof typeof translations.th

interface LanguageContextType {
  lang: Language
  setLang: (lang: Language) => void
  toggleLang: () => void
  t: (key: TranslationKeys, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('th')

  useEffect(() => {
    const saved = localStorage.getItem('qflow_lang') as Language | null
    if (saved === 'th' || saved === 'en') {
      setLangState(saved)
    }
  }, [])

  function setLang(l: Language) {
    setLangState(l)
    localStorage.setItem('qflow_lang', l)
  }

  function toggleLang() {
    setLang(lang === 'th' ? 'en' : 'th')
  }

  function t(key: TranslationKeys, params?: Record<string, string | number>): string {
    let text: string = translations[lang][key] || translations.th[key] || key
    if (params) {
      Object.entries(params).forEach(([paramKey, value]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(value))
      })
    }
    return text
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
