'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowLeft, Lock } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'

export default function PrivacyPage() {
  const { lang } = useLanguage()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors font-sans antialiased">
      {/* Top Navbar */}
      <nav className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <QFlowLogo className="h-8 w-8 group-hover:scale-105 transition-transform" />
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">QFlow</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{lang === 'th' ? 'กลับหน้าแรก' : 'Back to Home'}</span>
            </Link>
            <NavbarControls />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8"
        >
          {/* Header Banner */}
          <div className="border-b border-slate-100 dark:border-slate-800 pb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/80 text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-3">
              <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>PDPA Compliance & Security</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'th' ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              {lang === 'th'
                ? 'วันที่มีผลบังคับใช้: กันยายน 2026 • ผู้ควบคุมข้อมูล: QFlow'
                : 'Effective Date: September 2026 • Data Controller: QFlow'}
            </p>
          </div>

          {/* Quick Notice Box */}
          <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-xs sm:text-sm text-emerald-900 dark:text-emerald-200 leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              {lang === 'th' ? (
                <span>
                  นโยบายนี้จัดทำขึ้นตาม <strong>พระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)</strong> เพื่อชี้แจงให้ท่านทราบถึงวิธีการที่ QFlow เก็บรวบรวม ใช้ เปิดเผย และปกป้องข้อมูลส่วนบุคคลของท่าน
                </span>
              ) : (
                <span>
                  This Privacy Policy is prepared in accordance with the <strong>Thailand Personal Data Protection Act B.E. 2562 (2019) (PDPA)</strong> and international standards to explain how we handle your personal data.
                </span>
              )}
            </div>
          </div>

          {/* Clauses */}
          {lang === 'th' ? (
            <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  ข้อมูลส่วนบุคคลที่เราเก็บรวบรวม
                </h2>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">1. ข้อมูลของร้านค้า (Shops):</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>ข้อมูลการติดต่อ: ชื่อ-นามสกุล, เบอร์โทรศัพท์, LINE User ID / Display Name</li>
                      <li>ข้อมูลร้านค้า: ชื่อร้านค้า, ที่อยู่สาขา, รายการบริการ และรูปโปรไฟล์/โลโก้</li>
                      <li>ข้อมูลการรับเงิน: หมายเลขบัญชีธนาคาร หรือ หมายเลขพร้อมเพย์ (PromptPay ID)</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">2. ข้อมูลของลูกค้าผู้จองคิว (Customers):</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>ข้อมูลติดต่อ: ชื่อ-นามสกุล/ชื่อเล่น, หมายเลขโทรศัพท์, LINE User ID</li>
                      <li>ข้อมูลการนัดหมาย: วันที่, รอบเวลา, บริการที่เลือกจอง และบันทึกคำขอพิเศษ</li>
                      <li>ข้อมูลการชำระมัดจำ: รูปภาพสลิปโอนเงิน (Slip Image), จำนวนเงิน, วันเวลาที่ทำรายการ</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">3. ข้อมูลเชิงเทคนิค (Technical Logs):</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>หมายเลข IP Address, ชนิดของเบราว์เซอร์ และคุกกี้สำหรับจัดการเซสชันผู้ใช้งาน</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  วัตถุประสงค์ในการประมวลผลข้อมูล
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li><strong>การให้บริการตามสัญญา:</strong> เพื่อสร้างรอบคิว ส่งการยืนยันการนัดหมาย และอำนวยความสะดวกในการตรวจสลิปโอนเงินมัดจำ</li>
                  <li><strong>การแจ้งเตือน:</strong> ส่งข้อความแจ้งเตือนสถานะคิวไปยัง LINE ของลูกค้าและกลุ่มแอดมินร้านค้า</li>
                  <li><strong>การป้องกันการทุจริต (Legitimate Interest):</strong> ตรวจสอบความถูกต้องของสลิป ป้องกันการใช้สลิปซ้ำ และรักษาความมั่นคงปลอดภัยของระบบ</li>
                  <li><strong>การปฏิบัติตามกฎหมาย:</strong> การจัดทำบัญชี ภาษี และบันทึกประวัติการทำรายการตาม พ.ร.บ. คอมพิวเตอร์</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  การเปิดเผยข้อมูลแก่บุคคลภายนอก
                </h2>
                <p>
                  เราจะไม่จำหน่าย แลกเปลี่ยน หรือเผยแพร่ข้อมูลส่วนบุคคลของท่านแก่บุคคลภายนอก เว้นแต่กรณีจำเป็นดังต่อไปนี้:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>ระหว่างร้านค้าและลูกค้า:</strong> ข้อมูลการจองและสลิปจะถูกส่งให้ร้านค้าที่ลูกค้าทำการจองเพื่อให้ร้านค้าให้บริการได้</li>
                  <li><strong>ผู้ให้บริการโครงสร้างพื้นฐานระบบ:</strong> เช่น Supabase (ฐานข้อมูล), AWS S3/Cloudflare R2 (จัดเก็บรูปสลิป), และ LINE Messaging API</li>
                  <li><strong>เจ้าหน้าที่ผู้มีอำนาจตามกฎหมาย:</strong> เมื่อมีคำสั่งศาล หรือหมายเรียกจากพนักงานสอบสวนตามกระบวนการทางกฎหมาย</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
                  ระยะเวลาในการเก็บรักษาข้อมูล
                </h2>
                <p>
                  ข้อมูลบัญชีร้านค้าจะจัดเก็บตลอดระยะเวลาที่ใช้บริการ ข้อมูลรายการจองและสลิปจะจัดเก็บเป็นเวลา 90 - 365 วันเพื่อให้ร้านค้าตรวจสอบย้อนหลัง หลังจากนั้นระบบจะลบหรือแปลงเป็นข้อมูลนิรนาม (Anonymized Data)
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">5</span>
                  สิทธิของเจ้าของข้อมูลส่วนบุคคล (PDPA Rights)
                </h2>
                <p>
                  ท่านมีสิทธิขอเข้าถึง ขอรับสำเนา ขอแก้ไขข้อมูลให้ถูกต้อง ขอให้ลบหรือทำลายข้อมูล (Right to be Forgotten) ขอคัดค้านการประมวลผล และเพิกถอนความยินยอมได้ตลอดเวลา โดยติดต่อทีมงานผ่านช่องทางติดต่อด้านล่าง
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">6</span>
                  มาตรการรักษาความปลอดภัย
                </h2>
                <p>
                  เราใช้มาตรฐานความปลอดภัยระดับสูง การเข้ารหัสข้อมูลผ่าน HTTPS/TLS ตลอดการส่งผ่านข้อมูล (Encryption in Transit) และจำกัดสิทธิ์การเข้าถึงข้อมูลเฉพาะผู้ที่ได้รับอนุญาตเท่านั้น (Role-Based Access Control)
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">1</span>
                  Information We Collect
                </h2>
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">1. Shop Information:</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>Contact details: Name, phone number, LINE User ID / Display Name.</li>
                      <li>Shop information: Store name, branch locations, service catalogs, and logos.</li>
                      <li>Payout data: Bank account or PromptPay numbers.</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">2. Customer Information (On Behalf of Shops):</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>Contact details: Name/Nickname, phone number, LINE User ID.</li>
                      <li>Appointment details: Date, time slot, selected service, and special requests.</li>
                      <li>Payment verification: Transfer slip images, transferred amount, and transaction timestamp.</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-850/50 border border-slate-200/60 dark:border-slate-800">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">3. Technical & Telemetry Data:</h3>
                    <ul className="list-disc pl-5 space-y-0.5 text-slate-600 dark:text-slate-400">
                      <li>IP address, browser type, and essential cookies for session handling.</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">2</span>
                  Purposes of Processing
                </h2>
                <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li><strong>Service Delivery:</strong> To generate booking slots, issue confirmations, and assist in deposit slip verification.</li>
                  <li><strong>Notifications:</strong> To dispatch automated booking notifications via LINE or SMS.</li>
                  <li><strong>Fraud Prevention:</strong> To prevent duplicate slip submissions and secure payment reconciliations.</li>
                  <li><strong>Statutory Compliance:</strong> For bookkeeping, tax reporting, and audit obligations under applicable laws.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                  Sharing & Disclosure
                </h2>
                <p>
                  We never sell or rent your personal data. Personal data is disclosed only to:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>Between Customer and Shop:</strong> Customer details are shared with the shop you book with.</li>
                  <li><strong>Core Infrastructure Partners:</strong> Cloud hosting (Supabase), secure storage (AWS S3/R2), and messaging APIs (LINE).</li>
                  <li><strong>Law Enforcement:</strong> When formally compelled by court orders or legal process.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">4</span>
                  Data Retention
                </h2>
                <p>
                  Account credentials persist during subscription terms. Booking slips are kept for a standard duration (90 to 365 days) for audit and reconciliation, after which they are purged or anonymized.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">5</span>
                  Data Subject Rights
                </h2>
                <p>
                  Under PDPA and global privacy laws, you maintain the right to access, rectify, request erasure (Right to be Forgotten), restrict processing, or revoke consent by contacting us.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center text-xs font-bold">6</span>
                  Data Security Safeguards
                </h2>
                <p>
                  We enforce industry-standard security protocols including HTTPS/TLS encryption in transit and strict role-based access controls to prevent data misuse.
                </p>
              </section>
            </div>
          )}

          {/* Footer of the document */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                {lang === 'th' ? 'ดูข้อกำหนดการใช้บริการ (Terms of Service)' : 'View Terms of Service'}
              </Link>
            </div>
            <span>© {new Date().getFullYear()} QFlow. All rights reserved.</span>
          </div>
        </motion.div>
      </main>
    </div>
  )
}