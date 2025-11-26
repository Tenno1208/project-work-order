"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userData, setUserData] = useState<{ nama: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Ringkasan & Statistik" },
    { href: "/dashboard/admin", label: "Admin", icon: Users, description: "Kelola Pengguna" },
    { 
      href: "/dashboard/lampiran", 
      label: "Data Pengajuan", 
      icon: ClipboardList, 
      description: "Dokumen Lampiran",
      subItems: [
        { href: "/dashboard/lampiran/riwayat", label: "Riwayat Data Pengajuan", icon: History }
      ]
    },
    { 
      href: "/dashboard/spk", 
      label: "SPK", 
      icon: FileText, 
      description: "Surat Perintah Kerja",
      subItems: [
        { href: "/dashboard/spk/riwayat", label: "Riwayat SPK", icon: History }
      ]
    },
  ];

  // Auto-expand parent jika pathname adalah sub item
  useEffect(() => {
    const parentItem = menuItems.find(item => 
      item.subItems && item.subItems.some(sub => sub.href === pathname)
    );
    if (parentItem && !expandedItems.includes(parentItem.href)) {
      setExpandedItems(prev => [...prev, parentItem.href]);
    }
  }, [pathname]);

 // Ganti state userData menjadi lebih lengkap
const [userData, setUserData] = useState<{ npp?: string; nama?: string; email?: string }>({});
const [loading, setLoading] = useState(true);

// Fetch user data dari API menggunakan token dari localStorage
useEffect(() => {
  const token = localStorage.getItem("token");
  if (!token) {
    router.push("/login");
    return;
  }

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/me", { // bisa diganti endpoint mu
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();

      if (res.ok) {
        setUserData(data);
      } else {
        console.error("Gagal ambil profil:", data);
        localStorage.removeItem("token");
        router.push("/login");
      }
    } catch (err) {
      console.error("Error fetch /api/me:", err);
      localStorage.removeItem("token");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  fetchUserData();
}, [router]);


  const getCurrentPage = () => {
    // Cek sub items juga
    for (const item of menuItems) {
      if (item.href === pathname) return item;
      if (item.subItems) {
        const subItem = item.subItems.find(sub => sub.href === pathname);
        if (subItem) return { ...subItem, parent: item };
      }
    }
    return menuItems[0];
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

  const toggleExpand = (href: string) => {
    setExpandedItems(prev => 
      prev.includes(href) 
        ? prev.filter(item => item !== href) 
        : [...prev, href]
    );
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
            const isExpanded = expandedItems.includes(item.href);
            return (
              <div key={item.href}>
                <div
                  className={`group flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 w-full relative overflow-hidden ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30 scale-105"
                      : "hover:bg-blue-50 text-slate-700 hover:text-blue-700"
                  }`}
                >
                  {active && (
                    <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                  )}
                  <div 
                    onClick={() => handleNavigation(item.href)}
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                  >
                    <div className={`${active ? "scale-110" : "group-hover:scale-110"} transition-transform duration-300`}>
                      <Icon size={22} strokeWidth={2.5} />
                    </div>
                    {!collapsed && (
                      <span className="text-sm font-semibold relative z-10">{item.label}</span>
                    )}
                  </div>
                  {active && !collapsed && !item.subItems && (
                    <div className="ml-auto">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    </div>
                  )}
                  {item.subItems && !collapsed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.href);
                      }}
                      className="ml-auto p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronRight 
                        size={16} 
                        className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''} ${active ? 'text-white' : 'text-slate-500'}`}
                      />
                    </button>
                  )}
                </div>
                {/* Sub Menu */}
                {isExpanded && item.subItems && !collapsed && (
                  <div className="ml-8 mt-2 space-y-1">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const subActive = pathname === subItem.href;
                      return (
                        <button
                          key={subItem.href}
                          onClick={() => handleNavigation(subItem.href)}
                          className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full relative overflow-hidden ${
                            subActive
                              ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20 scale-105"
                              : "hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                          }`}
                        >
                          <div className={`${subActive ? "scale-110" : "group-hover:scale-110"} transition-transform duration-300`}>
                            <SubIcon size={18} strokeWidth={2} />
                          </div>
                          <span className="text-xs font-medium relative z-10">{subItem.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>



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
            <div className="flex items-center justify-between gap-6">
              {/* Left Section - Page Title */}
              <div className="flex items-center gap-4 flex-1">
                <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/30">
                  {currentPage.icon && <currentPage.icon className="text-white" size={32} strokeWidth={2.5} />}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                    {currentPage.label}
                  </h1>
                  <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></span>
                    {currentPage.description || (currentPage.parent ? currentPage.parent.description : "")}
                  </p>
                </div>
              </div>
              
              {/* Right Section - User Info & Actions */}
              <div className="flex items-center gap-3">
                {/* User Info Card */}
                <div className="pr-3 border-r border-white/30">
  {loading ? (
    <>
      <div className="h-4 w-24 bg-white/30 rounded animate-pulse mb-1"></div>
      <div className="h-3 w-32 bg-white/20 rounded animate-pulse"></div>
    </>
  ) : (
    <>
      <p className="text-white text-sm font-semibold">
        {userData?.nama || "Admin User"}
      </p>
      <p className="text-blue-100 text-xs">
        {userData?.email || "-"}
      </p>
    </>
  )}
</div>

                  <button 
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors flex-shrink-0"
                    title="Settings"
                  >
                    <Settings className="text-white" size={18} />
                  </button>
                </div>

                {/* Date Display */}
                <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-lg">
                  <p className="text-white text-sm font-semibold whitespace-nowrap">
                    {new Date().toLocaleDateString('id-ID', { 
                      day: 'numeric',
                      month: 'short', 
                      year: 'numeric'
                    })}
                  </p>
                </div>

                {/* Notification Bell */}
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