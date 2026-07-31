import type { Metadata } from "next";
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
  title: "日本住宅 3D 導覽 | Japanese House 3D",
  description:
    "Interactive 3D interior walkthrough of a Japanese residential house (Phase 1).",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      {/*
        suppressHydrationWarning: browser extensions (e.g. ColorZilla) inject
        attributes like cz-shortcut-listen onto <body> before React hydrates.
      */}
      <body
        className="flex min-h-full flex-col bg-slate-900 text-white"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
