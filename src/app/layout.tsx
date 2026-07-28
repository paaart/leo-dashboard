// src/app/layout.tsx
import "./globals.css";
import { NumberInputWheelGuard } from "@/components/shared/NumberInputWheelGuard";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Leo Dashboard",
  description: "ERP dashboard for Leo Packers",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <link rel="icon" href="/favicon.ico" />
      <body className="bg-canvas text-fg antialiased">
        <NumberInputWheelGuard />
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
