'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ShieldCheck, ArrowLeft, Scale } from 'lucide-react'
import { useLanguage } from '@/context/LanguageContext'
import { NavbarControls } from '@/components/NavbarControls'
import { QFlowLogo } from '@/components/QFlowLogo'

export default function TermsPage() {
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800/80 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-3">
              <Scale className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{lang === 'th' ? 'ข้อตกลงและเงื่อนไข' : 'Legal Agreement'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {lang === 'th' ? 'ข้อกำหนดและเงื่อนไขการใช้บริการ' : 'Terms of Service (TOS)'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
              {lang === 'th'
                ? 'วันที่มีผลบังคับใช้: มีนาคม 2026 • แพลตฟอร์ม QFlow'
                : 'Effective Date: March 2026 • QFlow Platform'}
            </p>
          </div>

          {/* Quick Notice Box */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs sm:text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div>
              {lang === 'th' ? (
                <span>
                  ยินดีต้อนรับสู่ <strong>QFlow</strong> โปรดอ่านข้อกำหนดนี้อย่างละเอียดก่อนเริ่มต้นใช้งาน เมื่อคุณสมัครสมาชิก สร้างร้านค้า หรือจองคิวผ่านระบบ จะถือว่าคุณได้อ่าน เข้าใจ และยอมรับข้อกำหนดทั้งหมดนี้
                </span>
              ) : (
                <span>
                  Welcome to <strong>QFlow</strong>. Please read these terms carefully before using our platform. By registering, creating a shop, or booking an appointment, you acknowledge and agree to these terms.
                </span>
              )}
            </div>
          </div>

          {/* Clauses */}
          {lang === 'th' ? (
            <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                  คำจำกัดความ (Definitions)
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>“แพลตฟอร์ม”</strong> หมายถึง เว็บไซต์ แอปพลิเคชัน และระบบ API ของ QFlow รวมถึง Dashboard จัดการร้านค้า และหน้าจองคิวลูกค้า (Booking Page / LINE LIFF)</li>
                  <li><strong>“ร้านค้า” (Shop)</strong> หมายถึง บุคคลหรือนิติบุคคลที่ลงทะเบียนเปิดร้านค้าเพื่อรับจองคิว ให้บริการ หรือรับชำระเงินมัดจำ</li>
                  <li><strong>“ลูกค้า” (Customer)</strong> หมายถึง บุคคลทั่วไปที่เข้ามากรอกข้อมูล จองคิว หรือชำระเงินผ่านระบบของร้านค้าบน QFlow</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                  การสร้างบัญชีและการรักษาความปลอดภัย
                </h2>
                <p>
                  ผู้ใช้บริการต้องให้ข้อมูลที่เป็นจริง ถูกต้อง และเป็นปัจจุบันในการลงทะเบียน ร้านค้ามีหน้าที่รักษาความลับของรหัสผ่าน ข้อมูลล็อกอิน และสิทธิ์การเข้าถึง หากเกิดการกระทำใด ๆ ภายใต้บัญชีของท่าน ร้านค้าจะต้องรับผิดชอบต่อความเสียหายที่เกิดขึ้น ห้ามพยายามเจาะระบบ หรือกระทำการใดๆ ที่ก่อให้เกิดความเสียหายต่อโครงสร้างพื้นฐานของระบบ
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
                  ขอบเขตการให้บริการและความรับผิดชอบของร้านค้า
                </h2>
                <p>
                  QFlow เป็นเพียง <strong>ผู้ให้บริการเครื่องมือซอฟต์แวร์ (Platform & SaaS Provider)</strong> เพื่ออำนวยความสะดวกในการจัดคิวและตรวจสลิปโอนเงินเท่านั้น ไม่ได้มีส่วนร่วมหรือเป็นตัวแทนในการขายสินค้า บริการ หรือการนัดหมายใด ๆ ของร้านค้า
                </p>
                <p>
                  ร้านค้าเป็นผู้กำหนดราคามัดจำ รายการบริการ และเลขบัญชีพร้อมเพย์ (PromptPay) ด้วยตนเอง หากเกิดข้อพิพาทเรื่องการไม่ให้บริการ การคืนเงินมัดจำ การเบี้ยวนัด หรือคุณภาพการบริการ จะต้องได้รับการตกลงและระงับข้อพิพาทโดยตรงระหว่างร้านค้าและลูกค้า
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">4</span>
                  ระบบตรวจสอบสลิปและการชำระเงิน
                </h2>
                <p>
                  ระบบ QFlow อำนวยความสะดวกในการอ่าน QR Code บนสลิปโอนเงินเพื่อช่วยยืนยันความถูกต้องเบื้องต้น ร้านค้ามีหน้าที่ตรวจสอบยอดเงินจริงที่เข้าบัญชีของตนเองเป็นหลัก QFlow ไม่รับประกันความผิดพลาดที่เกิดจากระบบเครือข่ายธนาคารภายนอก หรือความล่าช้าของระบบผู้ให้บริการชำระเงินภายนอก
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">5</span>
                  ค่าบริการและการชำระเงิน (Subscription)
                </h2>
                <p>
                  ค่าบริการระบบ QFlow จะเป็นไปตามแพ็กเกจที่แสดงบนหน้าเว็บไซต์ ค่าสมาชิกหรือค่าบริการรายเดือน/รายปีเมื่อชำระแล้วจะไม่สามารถขอคืนเงินได้ (Non-refundable) เว้นแต่กฎหมายจะกำหนดไว้เป็นอย่างอื่น
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">6</span>
                  การใช้งานที่ต้องห้าม (Prohibited Use)
                </h2>
                <p>
                  ห้ามใช้ระบบ QFlow ในกิจกรรมที่ผิดกฎหมาย เช่น การหลอกลวงเก็บเงินมัดจำโดยไม่มีบริการจริง การฟอกเงิน การค้าสิ่งผิดกฎหมาย หรือการกระทำใดที่ขัดต่อความสงบเรียบร้อย หากตรวจพบ ทางเราขอสงวนสิทธิ์ในการระงับบัญชีทันทีโดยไม่ต้องแจ้งให้ทราบล่วงหน้า และไม่คืนค่าบริการใดๆ
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">7</span>
                  การจำกัดความรับผิด
                </h2>
                <p>
                  ความรับผิดสูงสุดของ QFlow ต่อความเสียหายใด ๆ จะจำกัดไม่เกินยอดรวมของค่าบริการที่ผู้ใช้ได้ชำระให้แก่ QFlow ในช่วงระยะเวลา 1 เดือนก่อนเกิดเหตุการณ์
                </p>
              </section>
            </div>
          ) : (
            <div className="space-y-6 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">1</span>
                  Definitions
                </h2>
                <ul className="list-disc pl-5 space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>&ldquo;Platform&rdquo;</strong> refers to QFlow websites, web apps, APIs, shop dashboards, and booking portals (LINE LIFF).</li>
                  <li><strong>&ldquo;Shop&rdquo;</strong> refers to individuals or business entities operating a booking calendar and collecting appointments/deposits.</li>
                  <li><strong>&ldquo;Customer&rdquo;</strong> refers to individuals booking an appointment or uploading payment slips via the Platform.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">2</span>
                  Account Registration & Security
                </h2>
                <p>
                  Users must provide truthful, current, and complete information. Shops are solely responsible for maintaining login credential secrecy and all activities conducted under their accounts. Unauthorized vulnerability probing or interference is strictly prohibited.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">3</span>
                  Scope of Service & Shop Responsibilities
                </h2>
                <p>
                  QFlow is a <strong>software tool provider (SaaS)</strong>. We do not provide, endorse, or represent the services, appointments, or products offered by Shops.
                </p>
                <p>
                  Shops independently specify their deposit rates, services, and PromptPay accounts. Any dispute concerning refunds, cancellations, or service quality must be handled directly between the Shop and Customer.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">4</span>
                  Slip Verification & Banking Disclaimer
                </h2>
                <p>
                  QFlow assists with automated slip verification. Shops are responsible for reconciling actual ledger balances in their bank accounts. QFlow is not liable for disruptions in third-party banking gateways or undetected fraudulent slips.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">5</span>
                  Subscriptions & Billing
                </h2>
                <p>
                  Subscription rates are outlined on our Pricing page. All fees paid are non-refundable except where required by applicable statutory consumer protection regulations.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">6</span>
                  Prohibited Activities
                </h2>
                <p>
                  You may not use QFlow for deceptive practices, fraudulent deposit collection, money laundering, or illegal trade. Violation will trigger immediate account suspension without refund and reporting to legal authorities.
                </p>
              </section>

              <section className="space-y-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">7</span>
                  Limitation of Liability
                </h2>
                <p>
                  To the maximum extent permitted by law, QFlow’s aggregate liability for all claims arising out of the service shall not exceed the amount paid by you to QFlow in the one (1) month immediately preceding the event.
                </p>
              </section>
            </div>
          )}

          {/* Footer of the document */}
          <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold">
                {lang === 'th' ? 'ดูนโยบายความเป็นส่วนตัว (Privacy Policy)' : 'View Privacy Policy'}
              </Link>
            </div>
            <span>© {new Date().getFullYear()} QFlow. All rights reserved.</span>
          </div>
        </motion.div>
      </main>
    </div>
  )
}