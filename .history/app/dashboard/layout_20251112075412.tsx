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
import { motion, AnimatePresence } from "framer-motion";

type UserData = {
  npp?: string;
  nama?: string;
  email?: string;
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [userData, setUserData] = useState<UserData>({});
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const parentItem = menuItems.find(
      (item) => item.subItems && item.subItems.some((sub) => sub.href === pathname)
    );
    if (parentItem && !expandedItems.includes(parentItem.href)) {
      setExpandedItems((prev) => [...prev, parentItem.href]);
    }
  }, [pathname]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchUserData = async () => {
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();

        if (res.ok) setUserData(data);
        else {
          localStorage.removeItem("token");
          router.push("/login");
        }
      } catch (err) {
        console.error(err);
        localStorage.removeItem("token");
        router.push("/login");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

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

  const handleLogout = () => {
    localStorage.removeItem("token");
    alert("Logout berhasil!");
    router.push("/login");
  };

  const handleNavigation = (href: string) => {
    router.push(href);
  };

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((item) => item !== href)
        : [...prev, href]
    );
  };

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);


  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      {/* SIDEBAR */}
      <motion.div
        animate={{ width: collapsed ? 80 : 320 }}
        transition={{ type: "spring", stiffness: 150, damping: 30 }}
        className="bg-white border-r border-blue-100 flex flex-col shadow-xl relative overflow-hidden"
      >
        {/* HEADER SIDEBAR */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="px-6 py-9 border-b border-blue-100/60 bg-gradient-to-br from-blue-600 via-blue-600 to-blue-700 shadow-inner relative"
        >
          {/* Decorative Background */}
          <motion.div
            className="absolute inset-0 opacity-20"
            animate={{
              background: [
                "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.2), transparent)",
                "radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3), transparent)",
              ],
            }}
            transition={{ repeat: Infinity, duration: 4, repeatType: "mirror" }}
          />

          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "gap-4"
            } relative z-10`}
          >
            <motion.div
              whileHover={{ rotate: 8, scale: 1.1 }}
              className="bg-gradient-to-br from-white/30 to-white/10 p-3 rounded-2xl shadow-2xl flex-shrink-0 backdrop-blur-md border border-white/20"
            >
              <Droplet className="text-white" size={28} strokeWidth={2.5} />
            </motion.div>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="min-w-0 text-white"
              >
                <h1 className="font-bold text-3xl tracking-tight">PDAM</h1>
                <p className="text-blue-100 text-sm font-medium">
                  Work Order System
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* MENU */}
        <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            const isExpanded = expandedItems.includes(item.href);
            return (
              <div key={item.href}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleNavigation(item.href)}
                  className={`group flex items-center gap-4 ${
                    collapsed ? "px-3 justify-center" : "px-5"
                  } py-4 rounded-2xl transition-all duration-300 w-full relative overflow-hidden ${
                    active
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                      : "hover:bg-blue-50 text-slate-700 hover:text-blue-700"
                  }`}
                >
                  <Icon size={22} strokeWidth={2.5} />
                  {!collapsed && (
                    <span className="text-sm font-semibold relative z-10">
                      {item.label}
                    </span>
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
                        className={`transition-transform duration-300 ${
                          isExpanded ? "rotate-90" : ""
                        } ${active ? "text-white" : "text-slate-500"}`}
                      />
                    </button>
                  )}
                </motion.div>

                {/* Sub Items */}
                <AnimatePresence>
                  {isExpanded && item.subItems && !collapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="ml-8 mt-2 space-y-1"
                    >
                      {item.subItems.map((subItem) => {
                        const SubIcon = subItem.icon;
                        const subActive = pathname === subItem.href;
                        return (
                          <motion.button
                            key={subItem.href}
                            onClick={() => handleNavigation(subItem.href)}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full relative overflow-hidden ${
                              subActive
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20"
                                : "hover:bg-blue-50 text-slate-600 hover:text-blue-600"
                            }`}
                          >
                            <SubIcon size={18} strokeWidth={2} />
                            <span className="text-xs font-medium">
                              {subItem.label}
                            </span>
                          </motion.button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {/* TOGGLE SIDEBAR ITEM */}
          <div className="px-2 mt-6">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setCollapsed(!collapsed)}
              className={`flex items-center gap-4 ${
                collapsed ? "justify-center px-0" : "px-5"
              } py-4 rounded-2xl transition-all duration-300 w-full text-slate-700 hover:bg-blue-50 hover:text-blue-700`}
            >
              {collapsed ? (
                <ChevronRight size={22} strokeWidth={2.5} />
              ) : (
                <ChevronLeft size={25} strokeWidth={2.5} />
              )}
              {!collapsed && (
                <span className="text-sm font-semibold">
                  {collapsed ? "Tampilkan Sidebar" : "Sembunyikan Sidebar"}
                </span>
              )}
            </motion.button>
          </div>
        </nav>

        {/* LOGOUT */}
        <div className="p-4 border-t border-blue-100/60 bg-gradient-to-r from-white to-blue-50">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleLogout}
            className="group flex items-center gap-3 px-5 py-3.5 rounded-2xl hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 transition-all duration-300 w-full text-left font-semibold shadow-sm hover:shadow-lg border border-transparent hover:border-red-400 text-slate-700 hover:text-white"
          >
            <LogOut
              size={20}
              className="group-hover:scale-110 transition-transform"
            />
            {!collapsed && <span className="text-sm">Keluar</span>}
          </motion.button>
        </div>
      </motion.div>

      {/* MAIN CONTENT */}
      <main className="flex-1 relative flex flex-col h-screen">
        <div className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-blue-600 to-blue-800 shadow-lg relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
          </div>

          <div className="relative z-10 px-8 py-8 flex items-center justify-between gap-6">
            <div className="flex items-center gap-4 flex-1">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-2xl shadow-xl border border-white/30">
                {currentPage.icon && (
                  <currentPage.icon
                    className="text-white"
                    size={32}
                    strokeWidth={2.5}
                  />
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1 tracking-tight">
                  {currentPage.label}
                </h1>
                <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-blue-300 rounded-full animate-pulse"></span>
                  {currentPage.description ||
                    (currentPage.parent
                      ? currentPage.parent.description
                      : "")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 shadow-lg p-3 flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                  <Users className="text-blue-600" size={20} />
                </div>
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
                      <p className="text-blue-100 text-xs">NPP :
                         {userData?.npp || "-"}
                      </p>
                    </>
                  )}
                </div>
                <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <Settings className="text-white" size={18} />
                </button>
              </div>

              <div className="bg-white/20 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-lg">
                <p className="text-white text-sm font-semibold whitespace-nowrap">
                  {new Date().toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
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

        <div className="flex-1 overflow-auto p-8">{children}</div>
      </main>
    </div>
  );
}
