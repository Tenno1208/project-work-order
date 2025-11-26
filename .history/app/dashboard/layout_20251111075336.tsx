"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  LogOut,
  Droplet,
  ClipboardList,
  FileText,
  ChevronLeft,
  ChevronRight,
  Bell,
  Settings,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Ringkasan & Statistik" },
    { href: "/dashboard/admin", label: "Admin", icon: Users, description: "Kelola Pengguna" },
    { href: "/dashboard/lampiran", label: "Data Pengajuan", icon: ClipboardList, description: "Dokumen Lampiran" },
    { href: "/dashboard/spk", label: "SPK", icon: FileText, description: "Surat Perintah Kerja" },
  ];

  const getCurrentPage = () => {
    return menuItems.find(item => item.href === pathname) || menuItems[0];
  };

  const currentPage = getCurrentPage();

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logout berhasil!");
    router.push("/login");
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* SIDEBAR */}
      <div
        className={`${
          collapsed ? "w-20" : "w-80"
        } bg-white border-r border-blue-100 transition-all duration-300 flex flex-col shadow-xl relative`}
      >
        {/* Header Sidebar */}
        <div className="px-6 py-7 border-b border-blue-100/60 bg-gradient-to-r from-blue-50 to-white">
          <div className="flex items-center gap-4">
            <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-2xl shadow-lg flex-shrink-0 relative overflow-hidden">
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              <Droplet className="text-white relative z-10" size={28} strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-2xl text-blue-900 tracking-tight">PDAM</h1>
                <p className="text-blue-600 text-sm font-medium">Work Order System</p>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 w-full relative overflow-hidden ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105"
                    : "hover:bg-blue-50 text-slate-700 hover:text-blue-700"
                }`}
              >
                {active && (
                  <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                )}
                <div className={`${active ? "scale-110" : "group-hover:scale-110"} transition-transform duration-300`}>
                  <Icon size={22} strokeWidth={2.5} />
                </div>
                {!collapsed && (
                  <span className="text-sm font-semibold relative z-10">{item.label}</span>
                )}
                {active && !collapsed && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info */}
        {!collapsed && (
          <div className="px-6 py-5 border-t border-blue-100/60">
            <div className="bg-gradient-to-br from-blue-50 to-white rounded-2xl p-5 mb-3 border border-blue-100/50 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                  <Users className="text-white" size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-blue-900">Admin User</p>
                  <p className="text-blue-600 text-xs">admin@pdam.id</p>
                </div>
                <button className="p-2 hover:bg-blue-100 rounded-xl transition-colors">
                  <Settings className="text-blue-600" size={18} />
                </button>
              </div>
              <div className="flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-blue-50 rounded-xl transition-all duration-200 border border-blue-100 shadow-sm">
                  <Bell size={16} className="text-blue-600" />
                  <span className="text-xs font-semibold text-blue-700">3 New</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <div className="p-4 border-t border-blue-100/60 bg-gradient-to-r from-white to-blue-50">
          <button
            onClick={handleLogout}
            className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-300 w-full text-left font-semibold shadow-sm hover:shadow-lg border border-transparent hover:border-red-400 text-slate-700 hover:text-white"
          >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="text-sm">Keluar</span>}
          </button>
        </div>

        {/* Toggle Sidebar */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute top-8 -right-4 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-full shadow-xl w-9 h-9 flex items-center justify-center transition-all duration-300 hover:scale-110 border-4 border-white"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 shadow-lg relative overflow-hidden">
          {/* Decorative Background Elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>
          
          <div className="relative z-10 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/30">
                  <currentPage.icon className="text-white" size={32} strokeWidth={2.5} />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                    {currentPage.label}
                  </h1>
                  <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></span>
                    {currentPage.description}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm px-4 py-2.5 rounded-xl border border-white/30 shadow-lg">
                  <p className="text-white text-sm font-semibold">
                    {new Date().toLocaleDateString('id-ID', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
                <button className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-lg relative group">
                  <Bell className="text-white" size={20} />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    3
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}