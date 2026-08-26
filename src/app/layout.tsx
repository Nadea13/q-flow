import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { Toaster } from "sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Q Flow • Smart Queue Booking & Auto-Deposit Check",
  description: "ระบบจองคิวบริการ และตรวจสลิปมัดจำอัตโนมัติ 3 คลิกผ่าน LINE LIFF & Responsive Web สำหรับธุรกิจ SME ขนาดเล็ก",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={`${inter.variable} h-full antialiased`}
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
