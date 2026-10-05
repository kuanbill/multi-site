import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "都更專案管理平台",
  description: "都市更新專案管理平台，專案進度、公告、展覽與圖資整合網站。",
  // 安裝到 iOS 主畫面後全螢幕執行，並使用系統圖示為 App 名稱旁的圖標。
  appleWebApp: {
    capable: true,
    title: "都更專案",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
