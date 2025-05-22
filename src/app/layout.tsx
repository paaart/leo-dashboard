// src/app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";

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
    <html lang="en">
      <link rel="icon" href="/favicon.ico" />
      <body className="bg-white text-gray-900 dark:bg-gray-950 dark:text-white">
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
