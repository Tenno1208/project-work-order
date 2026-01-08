import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NotificationProvider } from './components/NotificationProvider'; 

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PDAM Work Order System",
  description: "Sistem manajemen work order untuk PDAM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={inter.className}>
        
        <NotificationProvider />
        
        {/* 
          Ini adalah tempat di mana seluruh konten halaman Anda akan dirender,
          termasuk DashboardLayout yang Anda buat.
        */}
        {children}
      </body>
    </html>
  );
}