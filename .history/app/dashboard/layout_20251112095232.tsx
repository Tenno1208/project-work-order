"use client"

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState([]);
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
        {
          href: "/dashboard/lampiran/riwayat",
          label: "Riwayat Data Pengajuan",
          icon: History,
        },
      ],
    },
    {
      href: "/dashboard/spk",
      label: "SPK",
      icon: FileText,
      description: "Surat Perintah Kerja",
      subItems: [
        {
          href: "/dashboard/spk/riwayat",
          label: "Riwayat SPK",
          icon: History,
        },
      ],
    },
  ];

  const [userData, setUserData] = useState<{ nama?: string; npp?: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // Ambil data user dari API /me
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.warn("Token tidak ditemukan, redirect ke login.");
          router.push("/login");
          return;
        }

        const res = await fetch("/api/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          console.warn("Gagal ambil data user:", res.status);
          if (res.status === 401 || res.status === 403) {
            // Token tidak valid → logout otomatis
            localStorage.removeItem("token");
            router.push("/login");
          }
          setLoading(false);
          return;
        }

        const data = await res.json();
        setUserData({
          nama: data.nama || "Tanpa Nama",
          npp: data.npp || "-",
        });
      } catch (err) {
        console.error("Error fetchUserData:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();

    return () => clearInterval(timer);
  }, []);

  const getCurrentPage = () => {
    for (const item of menuItems) {
      if (item.href === pathname) return item;
      if (item.subItems) {
        const subItem = item.subItems.find((sub) => sub.href === pathname);
        if (subItem) return { ...subItem, parent: item };
      }
    }
    return menuItems[0];
  };

  const currentPage = getCurrentPage();

  const toggleExpand = (href) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  };

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      router.push(href);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logout berhasil!");
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 relative overflow-hidden">
      {/* Animated Background Bubbles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-cyan-200/20 to-blue-300/20 animate-pulse"
            style={{
              width: `${Math.random() * 300 + 100}px`,
              height: `${Math.random() * 300 + 100}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * 2}s`,
              animationDuration: `${15 + i * 3}s`,
            }}
          />
        ))}
      </div>

      {/* SIDEBAR DESKTOP */}
      <div
        className={`hidden lg:flex flex-col bg-white/80 backdrop-blur-xl border-r border-cyan-100/50 shadow-2xl relative transition-all duration-500 ${
          collapsed ? "w-20" : "w-80"
        }`}
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,253,255,0.9) 100%)",
        }}
      >
        {/* Water Wave Effect at Top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>

        {/* HEADER SIDEBAR */}
        <div className="px-6 py-8 border-b border-cyan-100/60 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 relative overflow-hidden">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-4"} relative z-10`}>
            <div className="relative group">
              <div className="relative bg-gradient-to-br from-white/40 to-white/10 p-3.5 rounded-2xl shadow-2xl backdrop-blur-md border border-white/30 transition-transform duration-300 group-hover:scale-105">
                <Droplet className="text-white drop-shadow-lg" size={32} strokeWidth={2.5} />
              </div>
            </div>
            {!collapsed && (
              <div className="min-w-0 text-white">
                <h1 className="font-bold text-3xl tracking-tight drop-shadow-lg">PDAM</h1>
                <p className="text-cyan-100 text-sm font-medium flex items-center gap-2">
                  <Waves size={14} />
                  Work Order System
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
            const isExpanded = expandedItems.includes(item.href);
            return (
              <div key={item.href}>
                <div
                  onClick={() => handleNavigation(item.href)}
                  className={`group flex items-center gap-4 ${
                    collapsed ? "px-3 justify-center" : "px-5"
                  } py-4 rounded-2xl transition-all duration-300 w-full relative overflow-hidden cursor-pointer ${
                    active
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                      : "hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 text-slate-700 hover:text-cyan-700 hover:shadow-md"
                  }`}
                >
                  <Icon size={22} strokeWidth={2.5} className="relative z-10 transition-transform duration-300 group-hover:scale-110" />
                  {!collapsed && (
                    <span className="text-sm font-semibold relative z-10">{item.label}</span>
                  )}
                  {item.subItems && !collapsed && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.href);
                      }}
                      className="ml-auto p-2 hover:bg-white/20 rounded-lg transition-colors relative z-10 cursor-pointer"
                    >
                      <ChevronRight
                        size={16}
                        className={`transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Sub Items */}
                {isExpanded && item.subItems && !collapsed && (
                  <div className="ml-8 mt-2 space-y-1 transition-all duration-300">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive = pathname === subItem.href;
                      return (
                        <div
                          key={subItem.href}
                          onClick={() => handleNavigation(subItem.href)}
                          className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full hover:scale-105 cursor-pointer ${
                            subActive
                              ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                              : "hover:bg-cyan-50 text-slate-600 hover:text-cyan-700"
                          }`}
                        >
                          <SubIcon size={18} strokeWidth={2} />
                          <span className="text-xs font-medium">{subItem.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* TOGGLE SIDEBAR */}
          <div className="px-2 mt-6">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-4 ${
                collapsed ? "justify-center px-0" : "px-5"
              } py-4 rounded-2xl transition-all duration-300 w-full text-slate-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:text-cyan-700 hover:shadow-md`}
            >
              {collapsed ? (
                <ChevronRight size={22} strokeWidth={2.5} />
              ) : (
                <ChevronLeft size={25} strokeWidth={2.5} />
              )}
              {!collapsed && <span className="text-sm font-semibold">Sembunyikan Sidebar</span>}
            </button>
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-cyan-100/60 bg-gradient-to-r from-white/50 to-cyan-50/50 backdrop-blur-sm">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-300 w-full font-semibold shadow-sm hover:shadow-lg border border-transparent hover:border-red-400 text-slate-700 hover:text-white"
          >
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {!collapsed && <span className="text-sm">Keluar</span>}
          </button>
        </div>
      </div>

      {/* MOBILE MENU BUTTON */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-cyan-200 transition-transform hover:scale-110"
      >
        {mobileMenuOpen ? <X size={24} className="text-cyan-600" /> : <Menu size={24} className="text-cyan-600" />}
      </button>

      {/* MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-80 h-full bg-white shadow-2xl transform transition-transform" onClick={(e) => e.stopPropagation()}>
            {/* Mobile menu content */}
            <div className="px-6 py-8 border-b border-cyan-100 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 relative overflow-hidden">
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white/40 p-3.5 rounded-2xl shadow-xl border border-white/30">
                  <Droplet className="text-white" size={32} />
                </div>
                <div className="text-white">
                  <h1 className="font-bold text-3xl drop-shadow-lg">PDAM</h1>
                  <p className="text-cyan-100 text-sm flex items-center gap-2">
                    <Waves size={14} />
                    Work Order System
                  </p>
                </div>
              </div>
            </div>
            <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-180px)]">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <button
                    key={item.href}
                    onClick={() => {
                      handleNavigation(item.href);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-4 px-5 py-4 rounded-2xl w-full text-left transition-all ${
                      active 
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                        : "hover:bg-cyan-50 text-slate-700 hover:text-cyan-700"
                    }`}
                  >
                    <Icon size={22} />
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-cyan-100 bg-white">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="flex items-center gap-3 px-5 py-3.5 rounded-2xl hover:bg-red-500 transition-all w-full text-slate-700 hover:text-white font-semibold"
              >
                <LogOut size={20} />
                <span className="text-sm">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-[90%] max-w-sm text-center relative overflow-hidden transform transition-all scale-100">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>
            <div className="mb-4 flex justify-center">
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-4 rounded-full shadow-xl">
                <LogOut className="text-white" size={32} />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3">Konfirmasi Logout</h2>
            <p className="text-gray-500 mb-8">
              Anda yakin ingin keluar dari sistem? Anda perlu login kembali untuk mengakses dashboard.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all font-semibold"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all font-semibold"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <main className="flex-1 relative flex flex-col h-screen">
        {/* HEADER */}
        <div className="sticky top-0 z-40 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 shadow-2xl relative overflow-hidden backdrop-blur-xl border-b border-white/10">
          {/* Animated Wave Pattern */}
          <svg className="absolute bottom-0 left-0 w-full h-20 opacity-20" viewBox="0 0 1440 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="wave-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="50%" stopColor="rgba(255,255,255,0.5)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0.3)" />
              </linearGradient>
            </defs>
            <path fill="url(#wave-gradient)" d="M0,60 C240,90 480,30 720,60 C960,90 1200,30 1440,60 L1440,120 L0,120 Z">
              <animate
                attributeName="d"
                dur="8s"
                repeatCount="indefinite"
                values="
                  M0,60 C240,90 480,30 720,60 C960,90 1200,30 1440,60 L1440,120 L0,120 Z;
                  M0,60 C240,30 480,90 720,60 C960,30 1200,90 1440,60 L1440,120 L0,120 Z;
                  M0,60 C240,90 480,30 720,60 C960,90 1200,30 1440,60 L1440,120 L0,120 Z
                "
              />
            </path>
          </svg>

          <div className="relative z-10 px-4 lg:px-8 py-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            {/* LEFT - Page Info */}
            <div className="flex items-center gap-4 ml-12 lg:ml-0">
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/30 hover:scale-105 transition-transform">
                {currentPage.icon && (
                  <currentPage.icon className="text-white drop-shadow-md" size={30} strokeWidth={2.5} />
                )}
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight drop-shadow-lg">
                  {currentPage.label}
                </h1>
                <p className="text-cyan-100 text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-cyan-300 rounded-full"></span>
                  {currentPage.description}
                </p>
              </div>
            </div>

            {/* CENTER - Premium Water Clock */}
            <div className="hidden lg:flex items-center">
              <div className="relative group">
                {/* Floating Bubbles */}
                <div className="absolute -inset-4 pointer-events-none">
                  {[...Array(3)].map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-2 h-2 bg-white/30 rounded-full animate-ping"
                      style={{
                        left: `${20 + i * 30}%`,
                        top: `${10 + i * 20}%`,
                        animationDelay: `${i * 0.5}s`,
                        animationDuration: '3s',
                      }}
                    />
                  ))}
                </div>

                {/* Main Clock Container */}
                <div className="relative">
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/30 to-blue-500/30 rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                  
                  {/* Clock Background */}
                  <div className="relative bg-gradient-to-br from-white/20 via-white/10 to-white/20 backdrop-blur-xl rounded-3xl p-6 border border-white/30 shadow-2xl overflow-hidden group-hover:scale-105 transition-all duration-500">
                    {/* Animated Water Background */}
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-cyan-400/20 animate-pulse"></div>
                      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
                        <path
                          fill="rgba(255,255,255,0.1)"
                          d="M0,50 Q50,30 100,50 T200,50 L200,100 L0,100 Z"
                        >
                          <animate
                            attributeName="d"
                            dur="4s"
                            repeatCount="indefinite"
                            values="M0,50 Q50,30 100,50 T200,50 L200,100 L0,100 Z;M0,50 Q50,70 100,50 T200,50 L200,100 L0,100 Z;M0,50 Q50,30 100,50 T200,50 L200,100 L0,100 Z"
                          />
                        </path>
                      </svg>
                    </div>

                    {/* Time Display */}
                    <div className="relative z-10">
                      {/* Main Time */}
                      <div className="flex items-baseline justify-center gap-2 mb-3">
                        {mounted && (
                          <>
                            <span className="text-4xl font-bold text-white tabular-nums tracking-wider drop-shadow-lg">
                              {currentTime.toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <span className="text-2xl text-cyan-200 font-light animate-pulse">
                              {currentTime.toLocaleTimeString("id-ID", {
                                second: "2-digit",
                              })}
                            </span>
                          </>
                        )}
                      </div>

                      {/* Decorative Line */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                        <Droplet className="text-white/60 w-4 h-4" />
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                      </div>

                      {/* Date */}
                      {mounted && (
                        <div className="text-center">
                          <p className="text-cyan-100 text-sm font-medium">
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

                    {/* Corner Decorations */}
                    <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white/30 rounded-tl-lg"></div>
                    <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white/30 rounded-tr-lg"></div>
                    <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white/30 rounded-bl-lg"></div>
                    <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white/30 rounded-br-lg"></div>
                  </div>

                  {/* Floating Water Drops */}
                  <div className="absolute -top-3 -right-3 animate-bounce">
                    <div className="bg-gradient-to-br from-cyan-300 to-blue-400 w-6 h-6 rounded-full shadow-lg opacity-70"></div>
                  </div>
                  <div className="absolute -bottom-2 -left-2 animate-bounce" style={{ animationDelay: '1s' }}>
                    <div className="bg-gradient-to-br from-blue-300 to-cyan-400 w-4 h-4 rounded-full shadow-lg opacity-60"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT - User & Notification */}
            <div className="flex items-center gap-3 lg:gap-6">
              {/* User Info */}
              <div className="flex items-center bg-white/20 rounded-2xl border border-white/30 p-2 lg:p-3 pr-3 lg:pr-5 shadow-xl backdrop-blur-md hover:bg-white/25 transition-all">
                <div className="w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-white to-cyan-100 rounded-full flex items-center justify-center shadow-lg border-2 border-white/50">
                  <Users className="text-cyan-600" size={20} />
                </div>
                <div className="ml-2 lg:ml-3 text-left">
                  {loading ? (
                    <>
                      <div className="h-4 w-24 bg-white/30 rounded mb-1"></div>
                      <div className="h-3 w-32 bg-white/20 rounded"></div>
                    </>
                  ) : (
                    <>
                      <p className="text-white text-sm font-bold leading-tight drop-shadow">
                        {userData?.nama}
                      </p>
                      <p className="text-cyan-100 text-xs leading-tight">NPP: {userData?.npp}</p>
                    </>
                  )}
                </div>
                <button className="ml-2 lg:ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors hidden lg:block">
                  <Settings className="text-white" size={18} />
                </button>
              </div>

              {/* Notification */}
              <button className="bg-white/20 backdrop-blur-sm p-3 rounded-xl hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-xl relative group">
                <Bell className="text-white group-hover:scale-110 transition-transform" size={20} />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-red-400 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform border-2 border-white">
                  3
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {children}

            {/* Tampilkan demo card hanya di dashboard */}
            {pathname === "/dashboard" && (
              <>
                {/* Demo Content Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 mt-8">
                  {[
                    { title: "Total Pengguna", value: "1,234", icon: Users, color: "from-blue-500 to-blue-600" },
                    { title: "SPK Aktif", value: "56", icon: FileText, color: "from-cyan-500 to-cyan-600" },
                    { title: "Pengajuan Baru", value: "89", icon: ClipboardList, color: "from-teal-500 to-teal-600" },
                    { title: "Volume Air", value: "2.5M", icon: Droplet, color: "from-blue-400 to-cyan-500" },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-cyan-100/50 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className={`bg-gradient-to-br ${stat.color} p-3 rounded-xl shadow-lg`}>
                          <stat.icon className="text-white" size={24} />
                        </div>
                        <div className="text-right">
                          <p className="text-3xl font-bold text-gray-800">{stat.value}</p>
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium">{stat.title}</p>
                    </div>
                  ))}
                </div>

                {/* Welcome Card */}
                <div className="bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden">
                  <div className="absolute inset-0 opacity-20">
                    <Waves className="absolute top-4 right-8 w-32 h-32" />
                    <Droplet className="absolute bottom-8 left-12 w-24 h-24" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-3xl font-bold mb-3 drop-shadow-lg">
                      Selamat Datang di PDAM Work Order System
                    </h2>
                    <p className="text-cyan-100 text-lg mb-6">
                      Kelola semua pekerjaan dan pengajuan dengan mudah dan efisien
                    </p>
                    <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-semibold hover:bg-cyan-50 transition-all shadow-lg hover:shadow-xl hover:scale-105">
                      Mulai Sekarang →
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}