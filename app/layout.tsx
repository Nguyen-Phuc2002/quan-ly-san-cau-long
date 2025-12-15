import type { Metadata } from "next";
import { Inter } from "next/font/google"; 
// 👇 DÒNG NÀY LÀ QUAN TRỌNG NHẤT. KHÔNG CÓ LÀ LỖI
import "./globals.css"; 

import Navbar from "@/components/Navbar";
import { Toaster } from "sonner"; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Đặt Sân Cầu Lông Pro",
  description: "Hệ thống đặt sân chuyên nghiệp",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-slate-50`} suppressHydrationWarning={true}>
        <Navbar />
        {children}
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}