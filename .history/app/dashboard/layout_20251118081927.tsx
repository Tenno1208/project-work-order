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
    Clock,
    Loader2,
} from 'lucide-react';

// Hapus konstanta LOGOUT_API_URL dari sini
// const LOGOUT_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/auth/logout"; 

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = typeof useRouter === 'function' ? useRouter() : { push: (href: string) => window.location.href = href };
    const pathname = typeof usePathname === 'function' ? usePathname() : '/dashboard';

    const [collapsed, setCollapsed] = useState(false);
    const [expandedItems, setExpandedItems] = useState<string[]>([]);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false); 

    // ... (menuItems dan state lainnya tetap sama) ...
    // ... (fetchUserData dan useEffect tetap sama) ...
    // ... (utility functions tetap sama) ...

    const handleLogout = async () => {
        setLoggingOut(true);
        const token = localStorage.getItem("token");

        // Hapus token lokal SEBELUM redirect.
        localStorage.removeItem("token"); 
        
        if (!token) {
            router.push("/login");
            setLoggingOut(false);
            return;
        }

        try {
            // Panggil API PROXY LOKAL: /api/logout
            const res = await fetch('/api/logout', { 
                method: 'POST',
                headers: {
                    // Kirim token melalui header Authorization ke proxy lokal
                    'Authorization': `Bearer ${token}`, 
                },
            });

            if (res.ok || res.status === 401) {
                console.log(`Logout processed. Status: ${res.status}`);
            } else {
                console.error(`Logout failed on proxy level or external server returned an error: ${res.status}`);
            }

        } catch (error) {
            // Error jaringan/proxy
            console.error("Error calling local proxy:", error);
        } finally {
            // Selalu redirect ke halaman login
            router.push("/login");
            setLoggingOut(false);
        }
    };

    return (
        // ... (Sisa JSX tetap sama) ...
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 relative overflow-hidden text-sm">
            {/* SIDEBAR DESKTOP */}
            {/* ... */}
            
            {/* MOBILE MENU BUTTON */}
            {/* ... */}

            {/* MOBILE SIDEBAR */}
            {/* ... */}

            {/* LOGOUT CONFIRMATION MODAL */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl shadow-2xl p-6 w-[90%] max-w-xs text-center relative overflow-hidden transform transition-all scale-100"> 
                        {/* ... (Modal content) ... */}
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={() => setShowLogoutConfirm(false)}
                                disabled={loggingOut}
                                className="px-4 py-2 rounded-lg border-2 border-gray-300 text-gray-700 hover:bg-gray-100 transition-all font-semibold text-sm disabled:opacity-50" 
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    setShowLogoutConfirm(false);
                                    handleLogout(); // Panggil fungsi logout yang diperbarui
                                }}
                                disabled={loggingOut}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all font-semibold text-sm disabled:opacity-50"
                            >
                                {loggingOut ? (
                                    <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                                ) : (
                                    'Ya, Logout'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MAIN CONTENT */}
            {/* ... */}
        </div>
    );
}