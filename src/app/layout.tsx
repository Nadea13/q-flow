import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QFlow • Smart Queue Booking & Auto-Deposit Check",
  description: "ระบบจองคิวบริการ และตรวจสลิปมัดจำอัตโนมัติ 3 คลิกผ่าน LINE LIFF & Responsive Web สำหรับธุรกิจ SME ขนาดเล็ก",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
