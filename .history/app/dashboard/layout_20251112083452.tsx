"use client";

import React, { useState, useEffect } from "react";
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
  History,
  Waves,
  Menu,
  X,
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userData] = useState({
    nama: "Budi Santoso",
    npp: "123456",
    email: "budi@pdam.com",
  });
  const [loading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  const menuItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      description: "Ringkasan & Statistik",
    },
    {
      href: "/dashboard/admin",
      label: "Admin",
      icon: Users,
      description: "Kelola Pengguna",
    },
    {
      href: "/dashboard/lampiran",
      label: "Data Pengajuan",
      icon: ClipboardList,
      description: "Dokumen Lampiran",
      subItems: [
        { href: "/dashboard/lampiran/riwayat", label: "Riwayat Data Pengajuan", icon: History },
      ],
    },
    {
      href: "/dashboard/spk",
      label: "SPK",
      icon: FileText,
      description: "Surat Perintah Kerja",
      subItems: [{ href: "/dashboard/spk/riwayat", label: "Riwayat SPK", icon: History }],
    },
  ];

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCurrentPage = () => {
    for (const item of menuItems) {
      if (item.href === pathname) return item;
      if (item.subItems) {
        const sub = item.subItems.find((s) => s.href === pathname);
        if (sub) return { ...sub, parent: item };
      }
    }
    return menuItems[0];
  };

  const currentPage = getCurrentPage();

  const handleNavigation = (href: string) => {
    if (pathname !== href) router.push(href);
  };

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((i) => i !== href) : [...prev, href]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logout berhasil!");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 relative overflow-hidden">
      {/* ================= SIDEBAR ================= */}
      <div
        className={`hidden lg:flex flex-col bg-white/80 backdrop-blur-xl border-r border-cyan-100/50 shadow-2xl relative transition-all duration-500 ${
          collapsed ? "w-20" : "w-80"
        }`}
      >
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400" />

        {/* SIDEBAR HEADER */}
        <div className="px-6 py-8 border-b border-cyan-100/60 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-4"}`}>
            <div className="bg-gradient-to-br from-white/40 to-white/10 p-3.5 rounded-2xl shadow-2xl border border-white/30">
              <Droplet className="text-white" size={32} strokeWidth={2.5} />
            </div>
            {!collapsed && (
              <div className="text-white">
                <h1 className="font-bold text-3xl tracking-tight">PDAM</h1>
                <p className="text-cyan-100 text-sm flex items-center gap-2">
                  <Waves size={14} /> Work Order System
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const expanded = expandedItems.includes(item.href);
            return (
              <div key={item.href}>
                <div
                  onClick={() => handleNavigation(item.href)}
                  className={`flex items-center gap-4 ${
                    collapsed ? "px-3 justify-center" : "px-5"
                  } py-4 rounded-2xl cursor-pointer transition-all duration-300 ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 text-white shadow-lg"
                      : "hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 text-slate-700 hover:text-cyan-700"
                  }`}
                >
                  <Icon size={22} />
                  {!collapsed && <span className="text-sm font-semibold">{item.label}</span>}
                  {item.subItems && !collapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.href);
                      }}
                      className="ml-auto"
                    >
                      <ChevronRight
                        size={16}
                        className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                      />
                    </button>
                  )}
                </div>

                {expanded && item.subItems && !collapsed && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.subItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const subActive = pathname === sub.href;
                      return (
                        <div
                          key={sub.href}
                          onClick={() => handleNavigation(sub.href)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${
                            subActive
                              ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                              : "hover:bg-cyan-50 text-slate-600 hover:text-cyan-700"
                          }`}
                        >
                          <SubIcon size={18} />
                          <span className="text-xs font-medium">{sub.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="px-2 mt-6">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-4 ${
                collapsed ? "justify-center px-0" : "px-5"
              } py-4 rounded-2xl transition-all w-full text-slate-700 hover:bg-cyan-50`}
            >
              {collapsed ? <ChevronRight size={22} /> : <ChevronLeft size={25} />}
              {!collapsed && <span className="text-sm font-semibold">Sembunyikan Sidebar</span>}
            </button>
          </div>
        </nav>

        <div className="p-4 border-t border-cyan-100/60">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl hover:bg-red-500 hover:text-white transition-all w-full font-semibold"
          >
            <LogOut size={20} /> {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </div>

      {/* ================= MAIN AREA ================= */}
      <main className="flex-1 relative flex flex-col h-screen">
        {/* HEADER */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 shadow-2xl">
          <div className="px-4 lg:px-8 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {currentPage.icon && (
                <currentPage.icon className="text-white" size={30} strokeWidth={2.5} />
              )}
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                  {currentPage.label}
                </h1>
                <p className="text-cyan-100 text-sm">{currentPage.description}</p>
              </div>
            </div>

            {/* Clock */}
            {mounted && (
              <div className="text-white bg-white/10 px-6 py-2 rounded-xl border border-white/20 backdrop-blur-md">
                <p className="font-bold text-lg">
                  {currentTime.toLocaleTimeString("id-ID")}
                </p>
                <p className="text-xs text-cyan-100">
                  {currentTime.toLocaleDateString("id-ID", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
