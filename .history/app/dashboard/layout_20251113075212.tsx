"use client"

import React, { useState, useEffect } from 'react';
// Replaced next/navigation imports with standard browser API access where necessary, 
// but keeping them for simulation purposes if the environment supports them.
// For this React file, we assume standard React features are available.
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
  Clock,
} from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Using simplified/simulated router functions for the single-file environment
  const router = typeof useRouter === 'function' ? useRouter() : { push: (href: string) => window.location.href = href };
  const pathname = typeof usePathname === 'function' ? usePathname() : '/dashboard';

  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
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
  }, []); // router dependency removed for stability in single-file context

  const getCurrentPage = () => {
    for (const item of menuItems) {
      if (item.href === pathname) return item;
      if (item.subItems) {
        const subItem = item.subItems.find((sub) => sub.href === pathname);
        if (subItem) return { ...subItem, parent: item };
      }
    }
    // Default to the first item if pathname doesn't match anything
    return menuItems[0];
  };

  const currentPage = getCurrentPage();

  const toggleExpand = (href: string) => {
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
    // Use custom notification instead of alert
    console.log("Logout successful!"); 
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 relative overflow-hidden text-sm">
      {/* SIDEBAR DESKTOP */}
      <div
        className={`hidden lg:flex flex-col bg-white/80 backdrop-blur-xl border-r border-cyan-100/50 shadow-2xl relative transition-all duration-500 ${
          collapsed ? "w-16" : "w-64" // Slightly smaller width
        }`}
        style={{
          backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,253,255,0.9) 100%)",
        }}
      >
        {/* Water Wave Effect at Top */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>

        {/* HEADER SIDEBAR */}
        <div className="px-4 py-6 border-b border-cyan-100/60 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 relative overflow-hidden">
          <div className={`flex items-center ${collapsed ? "justify-center" : "gap-3"} relative z-10`}>
            <div className="relative group">
              <div className="relative bg-gradient-to-br from-white/40 to-white/10 p-2.5 rounded-xl shadow-xl backdrop-blur-md border border-white/30 transition-transform duration-300 group-hover:scale-105">
                <Droplet className="text-white drop-shadow-lg" size={24} strokeWidth={2.5} /> {/* Reduced size 32 -> 24 */}
              </div>
            </div>
            {!collapsed && (
              <div className="min-w-0 text-white">
                <h1 className="font-bold text-xl tracking-tight drop-shadow-lg">PDAM</h1> {/* Reduced size 3xl -> xl */}
                <p className="text-cyan-100 text-xs font-medium flex items-center gap-1"> {/* Reduced size sm -> xs, gap 2 -> 1 */}
                  <Waves size={12} /> {/* Reduced size 14 -> 12 */}
                  Work Order System
                </p>
              </div>
            )}
          </div>
        </div>

        {/* MENU */}
        <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto"> {/* Reduced padding and spacing */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const isExpanded = expandedItems.includes(item.href);
            return (
              <div key={item.href}>
                <div
                  onClick={() => handleNavigation(item.href)}
                  className={`group flex items-center gap-3 ${ // Reduced gap
                    collapsed ? "px-2 justify-center" : "px-4" // Reduced padding
                  } py-3 rounded-xl transition-all duration-300 w-full relative overflow-hidden cursor-pointer ${ // Reduced padding/rounded
                    active
                      ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                      : "hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 text-slate-700 hover:text-cyan-700 hover:shadow-md"
                  }`}
                >
                  <Icon size={18} strokeWidth={2.5} className="relative z-10 transition-transform duration-300 group-hover:scale-110" /> {/* Reduced size 22 -> 18 */}
                  {!collapsed && (
                    <span className="text-sm font-semibold relative z-10">{item.label}</span>
                  )}
                  {item.subItems && !collapsed && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.href);
                      }}
                      className="ml-auto p-1.5 hover:bg-white/20 rounded-md transition-colors relative z-10 cursor-pointer" // Reduced padding/rounded
                    >
                      <ChevronRight
                        size={14} // Reduced size 16 -> 14
                        className={`transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  )}
                </div>

                {/* Sub Items */}
                {isExpanded && item.subItems && !collapsed && (
                  <div className="ml-6 mt-1 space-y-1 transition-all duration-300"> {/* Reduced margin/spacing */}
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive = pathname === subItem.href;
                      return (
                        <div
                          key={subItem.href}
                          onClick={() => handleNavigation(subItem.href)}
                          className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 w-full hover:scale-105 cursor-pointer ${ // Reduced padding/rounded
                            subActive
                              ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                              : "hover:bg-cyan-50 text-slate-600 hover:text-cyan-700"
                          }`}
                        >
                          <SubIcon size={16} strokeWidth={2} /> {/* Reduced size 18 -> 16 */}
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
          <div className="px-1 pt-4"> {/* Reduced padding */}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-3 ${
                collapsed ? "justify-center px-1" : "px-4"
              } py-3 rounded-xl transition-all duration-300 w-full text-slate-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:text-cyan-700 hover:shadow-md`}
            >
              {collapsed ? (
                <ChevronRight size={18} strokeWidth={2.5} /> // Reduced size 25 -> 18
              ) : (
                <ChevronLeft size={18} strokeWidth={2.5} /> // Reduced size 25 -> 18
              )}
              {!collapsed && <span className="text-sm font-semibold">Sembunyikan</span>}
            </button>
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="p-3 border-t border-cyan-100/60 bg-gradient-to-r from-white/50 to-cyan-50/50 backdrop-blur-sm"> {/* Reduced padding */}
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="group flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-300 w-full font-semibold shadow-sm hover:shadow-lg border border-transparent hover:border-red-400 text-slate-700 hover:text-white" // Reduced padding/rounded
          >
            <LogOut size={18} className="group-hover:scale-110 transition-transform" /> {/* Reduced size 20 -> 18 */}
            {!collapsed && <span className="text-sm">Keluar</span>}
          </button>
        </div>
      </div>

      {/* MOBILE MENU BUTTON */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-cyan-200 transition-transform hover:scale-110"
      >
        {mobileMenuOpen ? <X size={20} className="text-cyan-600" /> : <Menu size={20} className="text-cyan-600" />} {/* Reduced size 24 -> 20 */}
      </button>

      {/* MOBILE SIDEBAR */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-white shadow-2xl transform transition-transform" onClick={(e) => e.stopPropagation()}> {/* Reduced width 80 -> 64 */}
            {/* Mobile menu content */}
            <div className="px-4 py-6 border-b border-cyan-100 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 relative overflow-hidden">
              <div className="flex items-center gap-3 relative z-10">
                <div className="bg-white/40 p-2.5 rounded-xl shadow-xl border border-white/30">
                  <Droplet className="text-white" size={24} /> {/* Reduced size 32 -> 24 */}
                </div>
                <div className="text-white">
                  <h1 className="font-bold text-2xl drop-shadow-lg">PDAM</h1> {/* Reduced size 3xl -> 2xl */}
                  <p className="text-cyan-100 text-xs flex items-center gap-1">
                    <Waves size={12} />
                    Work Order System
                  </p>
                </div>
              </div>
            </div>
            <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-160px)]"> {/* Reduced padding/height */}
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
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-all ${ // Reduced padding/rounded
                      active 
                        ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg"
                        : "hover:bg-cyan-50 text-slate-700 hover:text-cyan-700"
                    }`}
                  >
                    <Icon size={18} /> {/* Reduced size 22 -> 18 */}
                    <span className="text-sm font-semibold">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-cyan-100 bg-white">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLogoutConfirm(true);
                }}
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500 transition-all w-full text-slate-700 hover:text-white font-semibold"
              >
                <LogOut size={18} /> {/* Reduced size 20 -> 18 */}
                <span className="text-sm">Keluar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LOGOUT CONFIRMATION MODAL */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-xs text-center relative overflow-hidden transform transition-all scale-100"> {/* Reduced padding/max-width */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>
            <div className="mb-3 flex justify-center"> {/* Reduced margin */}
              <div className="bg-gradient-to-br from-red-500 to-red-600 p-3 rounded-full shadow-xl"> {/* Reduced padding */}
                <LogOut className="text-white" size={24} /> {/* Reduced size 32 -> 24 */}
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Konfirmasi Logout</h2> {/* Reduced size 2xl -> xl */}
            <p className="text-gray-500 text-sm mb-6">
              Anda yakin ingin keluar dari sistem? Anda perlu login kembali untuk mengakses dashboard.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all font-semibold text-sm" // Reduced padding/rounded
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all font-semibold text-sm" // Reduced padding/rounded
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
        <div className="sticky top-0 z-40 bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 shadow-xl relative overflow-hidden backdrop-blur-xl border-b border-white/10">
          {/* Wave Pattern SVG */}
          <svg className="absolute bottom-0 left-0 w-full h-12 opacity-10" viewBox="0 0 1440 100" preserveAspectRatio="none"> {/* Reduced height 16 -> 12 */}
            <path fill="white" d="M0,50 C240,80 480,20 720,50 C960,80 1200,20 1440,50 L1440,100 L0,100 Z">
              <animate
                attributeName="d"
                dur="10s"
                repeatCount="indefinite"
                values="
                  M0,50 C240,80 480,20 720,50 C960,80 1200,20 1440,50 L1440,100 L0,100 Z;
                  M0,50 C240,20 480,80 720,50 C960,20 1200,80 1440,50 L1440,100 L0,100 Z;
                  M0,50 C240,80 480,20 720,50 C960,80 1200,20 1440,50 L1440,100 L0,100 Z
                "
              />
            </path>
          </svg>

          <div className="relative z-10 px-4 lg:px-6 py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3"> {/* Reduced padding/spacing */}
            {/* LEFT - Page Info */}
            <div className="flex items-center gap-3 ml-12 lg:ml-0"> {/* Reduced gap */}
              <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl shadow-lg border border-white/30 hover:scale-105 transition-transform"> {/* Reduced padding/rounded */}
                {currentPage.icon && (
                  <currentPage.icon className="text-white drop-shadow-md" size={24} strokeWidth={2.5} />
                )}
              </div>
              <div>
                <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight drop-shadow-lg"> {/* Reduced size 3xl -> 2xl, 2xl -> xl */}
                  {currentPage.label}
                </h1>
                <p className="text-cyan-100 text-xs font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-cyan-300 rounded-full"></span>
                  {currentPage.description}
                </p>
              </div>
            </div>


            {/* CENTER - Compact Digital Clock with Wave Effect */}
            <div className="hidden lg:flex items-center gap-3"> {/* Reduced gap */}
              <div className="relative group">
                {/* Water Drop Icon */}
                <div className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Droplet className="text-white/80" size={16} /> {/* Reduced size 20 -> 16 */}
                </div>
                
                {/* Clock Container */}
                <div className="bg-white/15 backdrop-blur-md rounded-xl px-4 py-2 border border-white/20 shadow-lg relative overflow-hidden group-hover:bg-white/20 transition-all"> {/* Reduced padding/rounded/shadow */}
                  {/* Animated Wave Background */}
                  <div className="absolute inset-0 opacity-20">
                    <div className="absolute bottom-0 left-0 right-0 h-full bg-gradient-to-t from-cyan-400/30 to-transparent animate-pulse"></div>
                  </div>
                  
                  {/* Time Display */}
                  <div className="relative z-10 flex items-center gap-2"> {/* Reduced gap */}
                    {mounted && (
                      <>
                        {/* Icon Clock */}
                        <Clock className="text-white/90 drop-shadow-sm" size={18} strokeWidth={2.5} /> {/* Reduced size 20 -> 18 */}

                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-bold text-white tabular-nums"> {/* Reduced size 2xl -> xl */}
                            {currentTime.toLocaleTimeString("id-ID", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-cyan-200 text-sm font-medium animate-pulse"> {/* Reduced size lg -> sm */}
                            {currentTime.toLocaleTimeString("id-ID", {
                              second: "2-digit",
                            })}
                          </span>
                        </div>

                        {/* Separator */}
                        <div className="w-px h-5 bg-white/30"></div>

                        {/* Date */}
                        <div className="text-cyan-100 text-xs font-medium"> {/* Reduced size sm -> xs */}
                          {currentTime.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  
                  {/* Bottom Wave Line */}
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-300 to-transparent opacity-50"></div>
                </div>
                
                {/* Wave Icon */}
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-60 group-hover:opacity-100 transition-opacity">
                  <Waves className="text-white/80" size={16} /> 
                </div>
              </div>
            </div>

            {/* RIGHT - User & Notification */}
            <div className="flex items-center gap-3 lg:gap-4"> 
              {/* User Info */}
              <div className="flex items-center bg-white/20 rounded-xl border border-white/30 p-1.5 lg:p-2 pr-3 lg:pr-4 shadow-lg backdrop-blur-md hover:bg-white/25 transition-all"> {/* Reduced padding/rounded/shadow */}
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-white to-cyan-100 rounded-full flex items-center justify-center shadow-md border-2 border-white/50"> {/* Reduced size w-12 h-12 -> w-10 h-10 */}
                  <Users className="text-cyan-600" size={16} /> {/* Reduced size 20 -> 16 */}
                </div>
                <div className="ml-2 lg:ml-2 text-left">
                  {loading ? (
                    <>
                      <div className="h-3 w-20 bg-white/30 rounded mb-0.5"></div>
                      <div className="h-2.5 w-24 bg-white/20 rounded"></div>
                    </>
                  ) : (
                    <>
                      <p className="text-white text-xs font-bold leading-tight drop-shadow"> 
                        {userData?.nama}
                      </p>
                      <p className="text-cyan-100 text-xs leading-tight">NPP: {userData?.npp}</p>
                    </>
                  )}
                </div>
                <button className="ml-2 lg:ml-3 p-1.5 hover:bg-white/20 rounded-md transition-colors hidden lg:block">
                  <Settings className="text-white" size={16} /> 
                </button>
              </div>

              {/* Notification */}
              <button className="bg-white/20 backdrop-blur-sm p-2 rounded-lg hover:bg-white/30 transition-all duration-300 border border-white/30 shadow-lg relative group"> {/* Reduced padding/rounded/shadow */}
                <Bell className="text-white group-hover:scale-110 transition-transform" size={18} /> 
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-br from-red-400 to-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md group-hover:scale-110 transition-transform border-2 border-white">
                  3
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            {children}

            {pathname === "/dashboard" && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 mt-6"> {/* Reduced gap/margin */}
                  {[
                    { title: "Total Pengguna", value: "1,234", icon: Users, color: "from-blue-500 to-blue-600" },
                    { title: "SPK Aktif", value: "56", icon: FileText, color: "from-cyan-500 to-cyan-600" },
                    { title: "Pengajuan Baru", value: "89", icon: ClipboardList, color: "from-teal-500 to-teal-600" },
                    { title: "Volume Air", value: "2.5M", icon: Droplet, color: "from-blue-400 to-cyan-500" },
                  ].map((stat, idx) => (
                    <div
                      key={idx}
                      className="bg-white/90 backdrop-blur-md rounded-xl p-4 shadow-lg border border-cyan-100/50 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer" // Reduced padding/rounded/shadow
                    >
                      <div className="flex items-center justify-between mb-3"> {/* Reduced margin */}
                        <div className={`bg-gradient-to-br ${stat.color} p-2 rounded-lg shadow-md`}> {/* Reduced padding/rounded/shadow */}
                          <stat.icon className="text-white" size={20} /> {/* Reduced size 24 -> 20 */}
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-800">{stat.value}</p> {/* Reduced size 3xl -> 2xl */}
                        </div>
                      </div>
                      <p className="text-gray-600 font-medium text-sm">{stat.title}</p>
                    </div>
                  ))}
                </div>

                {/* Welcome Card */}
                <div className="bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 rounded-2xl p-6 shadow-xl text-white relative overflow-hidden"> {/* Reduced padding/rounded/shadow */}
                  <div className="absolute inset-0 opacity-20">
                    <Waves className="absolute top-4 right-8 w-24 h-24" />
                    <Droplet className="absolute bottom-6 left-10 w-20 h-20" />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-2 drop-shadow-lg"> {/* Reduced size 3xl -> 2xl */}
                      Selamat Datang di PDAM Work Order System
                    </h2>
                    <p className="text-cyan-100 text-base mb-4"> {/* Reduced size lg -> base */}
                      Kelola semua pekerjaan dan pengajuan dengan mudah dan efisien
                    </p>
                    <button className="bg-white text-blue-600 px-4 py-2.5 rounded-lg font-semibold hover:bg-cyan-50 transition-all shadow-md hover:shadow-lg hover:scale-105 text-sm"> {/* Reduced padding/rounded/shadow */}
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