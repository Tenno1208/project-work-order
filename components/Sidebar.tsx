"use client";

import React, { useState, useCallback } from 'react';
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
    History,
    Loader2,
    Waves,
} from 'lucide-react';

interface MenuItem {
    href?: string;
    label: string;
    icon: any;
    description?: string;
    requiredPermission?: string;
    subItems?: {
        href: string;
        label: string;
        icon: any;
    }[];
}

interface SidebarProps {
    collapsed: boolean;
    setCollapsed: (collapsed: boolean) => void;
    menuItems: MenuItem[];
    pathname: string;
    handleNavigation: (href: string) => void;
    handleLogout: () => void;
    loggingOut: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
    collapsed,
    setCollapsed,
    menuItems,
    pathname,
    handleNavigation,
    handleLogout,
    loggingOut,
}) => {
    const [expandedItems, setExpandedItems] = useState<string[]>([]);

    const toggleExpand = useCallback((label: string) => {
        setExpandedItems((prev) =>
            prev.includes(label) ? prev.filter((item) => item !== label) : [...prev, label]
        );
    }, []);

    const handleItemClick = useCallback((item: MenuItem) => {
        if (item.subItems && item.subItems.length > 0) {
            toggleExpand(item.label);
        }
        else if (item.href) {
            handleNavigation(item.href);
        }
    }, [handleNavigation, toggleExpand]);

    return (
        <div
            // PERUBAHAN 1: Ganti 'hidden lg:flex' ke 'hidden md:flex'
            // PERUBAHAN 2: Update logika width. Jika di MD (tablet) paksa w-16. Jika LG baru cek collapsed.
            className={`hidden md:flex flex-col bg-white/80 backdrop-blur-xl border-r border-cyan-100/50 shadow-2xl relative transition-all duration-500 ${
                collapsed ? "w-16" : "w-16 lg:w-64"
            }`}
            style={{
                backgroundImage: "linear-gradient(135deg, rgba(255,255,255,0.9) 0%, rgba(240,253,255,0.9) 100%)",
            }}
        >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-400"></div>
            <div className="px-4 py-6 border-b border-cyan-100/60 bg-gradient-to-br from-cyan-500 via-blue-600 to-blue-700 relative overflow-hidden">
                <div className={`flex items-center ${collapsed ? "justify-center" : "justify-center lg:justify-start lg:gap-3"} relative z-10`}>
                    <div className="relative group">
                        <div className="relative bg-gradient-to-br from-white/40 to-white/10 p-2.5 rounded-xl shadow-xl backdrop-blur-md border border-white/30 transition-transform duration-300 group-hover:scale-105">
                            <Droplet className="text-white drop-shadow-lg" size={24} strokeWidth={2.5} />
                        </div>
                    </div>
                    {!collapsed && (
                        // PERUBAHAN 3: Tambahkan 'hidden lg:block' agar teks hilang saat layar mengecil (mode ikon)
                        <div className="min-w-0 text-white hidden lg:block">
                            <h1 className="font-bold text-xl tracking-tight drop-shadow-lg">PDAM</h1>
                            <p className="text-cyan-100 text-xs font-medium flex items-center gap-1">
                                <Waves size={12} />
                                Work Order System
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    
                    let active = pathname === item.href;
                    if (item.subItems) {
                        active = item.subItems.some(subItem => pathname === subItem.href);
                    }
                    
                    const isExpanded = expandedItems.includes(item.label);

                    return (
                        <div key={item.label}>
                            <div
                                onClick={() => handleItemClick(item)}
                                className={`group flex items-center gap-3 ${collapsed ? "px-2 justify-center" : "px-2 lg:px-4 justify-center lg:justify-start"
                                    } py-3 rounded-xl transition-all duration-300 w-full relative overflow-hidden cursor-pointer ${active
                                        ? "bg-gradient-to-r from-cyan-500 via-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/30"
                                        : "hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 text-slate-700 hover:text-cyan-700 hover:shadow-md"
                                    }`}
                            >
                                <Icon size={18} strokeWidth={2.5} className="relative z-10 transition-transform duration-300 group-hover:scale-110 flex-shrink-0" />
                                {!collapsed && (
                                    // PERUBAHAN 4: Sembunyikan label saat layar MD
                                    <span className="text-sm font-semibold relative z-10 flex-1 hidden lg:block">{item.label}</span>
                                )}
                                {item.subItems && !collapsed && (
                                    // PERUBAHAN 5: Sembunyikan chevron saat layar MD
                                    <ChevronRight
                                        size={14}
                                        className={`transition-transform duration-300 ${isExpanded ? "rotate-90" : ""} hidden lg:block`}
                                    />
                                )}
                            </div>

                            {/* Submenu hanya muncul di LG karena di MD mode ikon tidak cukup ruang untuk dropdown ke bawah */}
                            {isExpanded && item.subItems && !collapsed && (
                                <div className="ml-6 mt-1 space-y-1 transition-all duration-300 hidden lg:block">
                                    {item.subItems.map((subItem) => {
                                        const SubIcon = subItem.icon;
                                        const subActive = pathname === subItem.href;
                                        return (
                                            <div
                                                key={subItem.href}
                                                onClick={() => handleNavigation(subItem.href)}
                                                className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 w-full hover:scale-105 cursor-pointer ${subActive
                                                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-md"
                                                    : "hover:bg-cyan-50 text-slate-600 hover:text-cyan-700"
                                                    }`}
                                            >
                                                <SubIcon size={16} strokeWidth={2} />
                                                <span className="text-xs font-medium">{subItem.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                <div className="px-1 pt-4">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={`flex items-center gap-3 ${collapsed ? "justify-center px-1" : "px-4 justify-center lg:justify-start"
                            } py-3 rounded-xl transition-all duration-300 w-full text-slate-700 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 hover:text-cyan-700 hover:shadow-md hidden lg:flex`}
                    >
                        {collapsed ? <ChevronRight size={18} strokeWidth={2.5} /> : <ChevronLeft size={18} strokeWidth={2.5} />}
                        {!collapsed && <span className="text-sm font-semibold hidden lg:block">Sembunyikan</span>}
                    </button>
                </div>
            </nav>

            <div className="p-3 border-t border-cyan-100/60 bg-gradient-to-r from-white/50 to-cyan-50/50 backdrop-blur-sm">
                <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className={`group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 w-full font-semibold shadow-sm border border-transparent text-slate-700 ${loggingOut
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'hover:bg-gradient-to-r hover:from-red-500 hover:to-red-600 hover:shadow-lg hover:border-red-400 hover:text-white'
                        } ${collapsed ? "justify-center" : "justify-center lg:justify-start"}`}
                >
                    {loggingOut ? <Loader2 size={18} className="animate-spin text-white" /> : <LogOut size={18} className="group-hover:scale-110 transition-transform" />}
                    {!collapsed && <span className="text-sm hidden lg:block">{loggingOut ? 'Memproses...' : 'Keluar'}</span>}
                </button>
            </div>
        </div>
    );
};

export default Sidebar;