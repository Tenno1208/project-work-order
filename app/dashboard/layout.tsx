"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, CheckCircle, AlertTriangle } from 'lucide-react'; 


import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LogoutModal from '@/components/LogoutModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PORTAL_API_URL = process.env.NEXT_PUBLIC_API_BASE_URL_PORTAL_PEGAWAI;

const API_ENDPOINTS = {
    NOTIFICATIONS_USER: `${API_BASE_URL}/notifications`, 
    UPDATE_READ: `${API_BASE_URL}/notifications/update`,
    UPDATE_ALL_READ: `${API_BASE_URL}/notifications/update/all`,
    LOGOUT: `${PORTAL_API_URL}/auth/logout`
};

type ToastMessage = {
    show: boolean;
    message: string;
    type: "success" | "error";
};

interface UserData { 
    nama?: string; 
    npp?: string; 
    no_telp?: string; 
    satker?: string; 
    subsatker?: string; 
}

interface Notification { 
    id: number; 
    title: string; 
    message: string; 
    read: boolean; 
    created_at?: string;
    uuid_pengajuan?: string; 
}

const ToastBox = ({ toast, onClose }: { toast: ToastMessage, onClose: () => void }) =>
    toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-3 rounded-xl shadow-xl text-white text-sm z-[100] transition-all duration-300 flex items-center gap-3 animate-in slide-in-from-right-5 ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
        }`}>
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span className="font-medium">{toast.message}</span>
            <button onClick={onClose} className="ml-2 bg-white/20 rounded-full p-1 hover:bg-white/30 transition">
                <X size={14} />
            </button>
        </div>
    );

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });

    const [userData, setUserData] = useState<UserData>({});
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
   
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
    const [totalNotificationCount, setTotalNotificationCount] = useState(0);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [allNotifications, setAllNotifications] = useState<Notification[]>([]); 
    const [showingAllNotifications, setShowingAllNotifications] = useState(false); 
    const [loadingMoreNotifications, setLoadingMoreNotifications] = useState(false); 
    
    const [markingAllAsRead, setMarkingAllAsRead] = useState(false);
    
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [loadingNotifications, setLoadingNotifications] = useState(false);
    const [loadingAllNotifications, setLoadingAllNotifications] = useState(false);

    const getToken = () => localStorage.getItem("token");

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    const useEventSourceNotifications = useCallback(() => {
    const token = getToken();
    const storedUserData = localStorage.getItem("user_data");
    if (!token || !storedUserData) return;

    const userDataObj = JSON.parse(storedUserData);
    const npp = userDataObj.npp;
    if (!npp || npp === '-') return;

    if (window.notificationEventSource) {
        window.notificationEventSource.close();
    }

    // KIRIM TOKEN LEWAT URL (Aman untuk SSE dan mencegah CORS/502)
    const eventSourceUrl = `${API_ENDPOINTS.NOTIFICATIONS_USER}/${npp}?stream=1&token=${encodeURIComponent(token)}`;
    
    // Gunakan EventSource standar browser
    const eventSource = new EventSource(eventSourceUrl);
    window.notificationEventSource = eventSource;

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.success && Array.isArray(data.data)) {
                const mappedNotifications = data.data.map((item: any) => ({
                    id: item.id,
                    title: item.judul,
                    message: item.pesan,
                    read: item.status === 'read',
                    created_at: item.created_at,
                    uuid_pengajuan: item.uuid_pengajuan || null,
                }));
                setNotifications(mappedNotifications);
                setUnreadNotificationCount(data.unread_count || 0);
            }
        } catch (e) {
            console.error('Error parsing:', e);
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
    };
}, [setNotifications, setUnreadNotificationCount]);

    // --- FETCH ALL NOTIFICATIONS (DIRECT API) ---
    const fetchAndSetAllNotifications = useCallback(async () => {
        const storedUserData = localStorage.getItem("user_data");
        if (!storedUserData) return;
        
        const userData = JSON.parse(storedUserData);
        const npp = userData.npp;
        
        if (!npp || npp === '-') {
            return;
        }
        
        const token = getToken();
        if (!token) return;
        
        setLoadingMoreNotifications(true);
        
        try {
            // DIRECT FETCH
            const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS_USER}/${npp}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) throw new Error("Gagal fetch API Notifikasi");
            
            const data = await response.json();
            const rawData = Array.isArray(data) ? data : (data.data || []); 

            if (Array.isArray(rawData)) {
                const mappedNotifications: Notification[] = rawData.map((item: any) => ({
                    id: item.id,
                    title: item.judul,
                    message: item.pesan,
                    read: item.status === 'read',
                    created_at: item.created_at,
                    uuid_pengajuan: item.uuid_pengajuan || null,
                })).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

                setAllNotifications(mappedNotifications);
                setTotalNotificationCount(mappedNotifications.length);
            }
        } catch (error) {
            console.error('Error fetching all notifications:', error);
        } finally {
            setLoadingMoreNotifications(false);
        }
    }, []);


    // --- MARK READ SINGLE (DIRECT API) ---
    const markNotificationAsRead = useCallback(async (notificationId: number) => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`${API_ENDPOINTS.UPDATE_READ}/${notificationId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) console.error("Gagal menandai notifikasi sebagai sudah dibaca:", res.status);

            setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
            setAllNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, read: true } : n));
            setUnreadNotificationCount(prev => Math.max(0, prev - 1));
            
        } catch (err) {
            console.error("Error marking notification as read:", err);
        }
    }, []); 

    // --- MARK ALL READ (DIRECT API) ---
    const markAllNotificationsAsRead = useCallback(async () => { 
        const token = getToken(); 
        if (!token) return;
        const unreadNotifications = (showingAllNotifications ? allNotifications : notifications).filter(n => !n.read); 
        if (unreadNotifications.length === 0) return;
        const npp = userData.npp; 
        if (!npp || npp === '-') return;

        try {
            const res = await fetch(`${API_ENDPOINTS.UPDATE_ALL_READ}/${npp}`, {
                method: "PUT", 
                headers: { 
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json", 
                } 
            });
            if (!res.ok) return;
            
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadNotificationCount(0);
            
            showToast("Semua notifikasi telah ditandai sebagai dibaca", "success");

        } catch (err) { 
            console.error("Error marking all notifications as read:", err); 
            showToast("Gagal memperbarui status notifikasi", "error");
        }
    }, [notifications, allNotifications, showingAllNotifications, userData.npp, showToast]);


    // --- MARK ALL READ UTAMA (DIRECT API) ---
    const markAllNotificationsAsReadAll = useCallback(async () => { 
        const token = getToken(); 
        if (!token) return;
        
        const npp = userData.npp; 
        if (!npp || npp === '-') return;

        setMarkingAllAsRead(true); 

        try {
            const res = await fetch(`${API_ENDPOINTS.UPDATE_ALL_READ}/${npp}`, {
                method: "PUT", 
                headers: { 
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json", 
                } 
            });
            
            if (!res.ok) throw new Error("Gagal update"); 
            
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadNotificationCount(0);

            showToast("Semua notifikasi berhasil ditandai sebagai dibaca", "success");

        } catch (err) { 
            console.error("Error marking all notifications as read:", err); 
            showToast("Gagal melakukan aksi", "error");
        } finally {
            setTimeout(() => {
                setMarkingAllAsRead(false);
            }, 500);
        }
    }, [userData.npp, showToast]); 

    const handleLoadMoreNotifications = useCallback(() => {
        if (!showingAllNotifications) {
            setShowingAllNotifications(true); 
            if (allNotifications.length === 0) {
                fetchAndSetAllNotifications();
            }
        } else {
           setShowingAllNotifications(false); 
        }
    }, [showingAllNotifications, allNotifications.length, fetchAndSetAllNotifications]);

    const handleNavigation = useCallback((href: string) => { 
        if (pathname !== href) { 
            router.push(href); 
        } 
    }, [pathname, router]);

    const requestLogout = useCallback(() => {
        setShowLogoutConfirm(true);
    }, []);

    // --- LOGOUT (DIRECT API) ---
    const handleLogout = useCallback(async () => {
        setLoggingOut(true);
        const token = localStorage.getItem("token");
        localStorage.removeItem("token"); 
        localStorage.removeItem("user_data"); 
        localStorage.removeItem("user_permissions");
        
        if (!token) { 
            router.push("/login"); 
            setLoggingOut(false); 
            return; 
        }
        try { 
            // HIT PORTAL LOGOUT DIRECTLY
            await fetch(API_ENDPOINTS.LOGOUT, { 
                method: 'POST', 
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                }, 
            }); 
        } catch (error) { 
            console.error("Error logging out:", error); 
        } finally { 
            router.push("/login"); 
            setLoggingOut(false); 
        }
    }, [router]);
    
    useEffect(() => {
        setMounted(true);
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        
        const loadInitialData = async () => {
            const token = getToken(); 
            if (!token) { 
                router.push("/login"); 
                setLoading(false); 
                return; 
            }
            
            let profileData: UserData | null = null; 
            let permissionsData: string[] | null = null;
            
            const storedUserData = localStorage.getItem("user_data"); 
            if (storedUserData) { 
                try { 
                    profileData = JSON.parse(storedUserData) as UserData; 
                    setUserData(profileData); 
                } catch (e) { 
                    console.error("Gagal parse stored user data:", e); 
                    profileData = null; 
                } 
            }
            
            const storedPermissions = localStorage.getItem("user_permissions"); 
            if (storedPermissions && storedPermissions.trim().length > 0) { 
                try { 
                    permissionsData = JSON.parse(storedPermissions) as string[]; 
                    setUserPermissions(permissionsData); 
                } catch (e) { 
                    console.error("Gagal parse stored permissions:", e); 
                    permissionsData = null; 
                } 
            }
            
            if (profileData && profileData.npp && profileData.npp !== '-') { 
                useEventSourceNotifications(); 
                fetchAndSetAllNotifications(); 
            }
            
            setLoading(false);
        };
        
        loadInitialData();
        return () => {
            clearInterval(timer);
            if (window.notificationEventSource) {
                window.notificationEventSource.close();
            }
        };
    }, [router, useEventSourceNotifications, fetchAndSetAllNotifications]);

    // --- MENU CONFIGURATION (Sama) ---
    const allMenuItems = [ 
        { href: "/dashboard", 
          label: "Dashboard", 
          icon: require('lucide-react').LayoutDashboard, 
          description: "Ringkasan & Statistik",
          requiredPermission: "workorder-pti.view.dashboard"
          }, 
        { href: "/dashboard/admin", 
          label: "Admin", icon: require('lucide-react').Users, 
          description: "Kelola Pengguna", 
          requiredPermission: "workorder-pti.Admin"
        }, 

        { 
            label: "Data Pengajuan", 
            icon: require('lucide-react').ClipboardList, 
            description: "Dokumen Lampiran", 
            requiredPermission: "workorder-pti.pengajuan.views",
            subItems: [
                { href: "/dashboard/lampiran/riwayat", label: "Riwayat Data Pengajuan", icon: require('lucide-react').History },
                { href: "/dashboard/lampiran", label: "Persetujuan Pengajuan", icon: require('lucide-react').CheckCircle },
            ]
        }, 
        { 
            label: "SPK", 
            icon: require('lucide-react').FileText, 
            description: "Surat Perintah Kerja", 
            subItems: [
                { href: "/dashboard/spk/riwayat", label: "Riwayat SPK", icon: require('lucide-react').History },
                { href: "/dashboard/spk", label: "Daftar Spk", icon: require('lucide-react').List },
            ], 
            requiredPermission: "workorder-pti.spk.views" 
        },
        { 
            href: "/dashboard/laporan", 
            label: "Laporan", 
            icon: require('lucide-react').FileBarChart, 
            description: "Cetak Laporan & Statistik",
            requiredPermission: "workorder-pti.view.laporan" 
        },
        { 
            href: "/dashboard/pengaturan", 
            label: "Pengaturan", 
            icon: require('lucide-react').Settings, 
            description: "Pengaturan Sistem",
            requiredPermission: "workorder-pti.view.pengaturan", 
        },
    ];
    
    const menuItems = allMenuItems.filter(item => !item.requiredPermission || userPermissions.includes(item.requiredPermission));
    
    const getCurrentPage = () => { 
        for (const item of allMenuItems) { 
            if (item.href === pathname) return item; 
            if (item.subItems) { 
                const subItem = item.subItems.find((sub) => sub.href === pathname); 
                if (subItem) return { ...subItem, parent: item }; 
            } 
        } 
        return menuItems[0] || allMenuItems[0]; 
    };
    const currentPage = getCurrentPage();

    const displayedNotifications = showingAllNotifications ? allNotifications : notifications;

    // --- RENDER ---
    return (
        <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 relative overflow-hidden text-sm">
            {/* TAMPILKAN TOAST BOX */}
            <ToastBox toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />

            <Sidebar 
                collapsed={collapsed} 
                setCollapsed={setCollapsed} 
                menuItems={menuItems} 
                pathname={pathname} 
                handleNavigation={handleNavigation} 
                handleLogout={requestLogout} 
                loggingOut={loggingOut}
                mobileMenuOpen={mobileMenuOpen}
                setMobileMenuOpen={setMobileMenuOpen}
            />

            <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
                className="lg:hidden fixed top-4 left-4 z-[60] bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-lg border border-cyan-200 transition-transform hover:scale-110"
            >
                {mobileMenuOpen ? <X size={20} className="text-cyan-600" /> : <Menu size={20} className="text-cyan-600" />}
            </button>

            <main className="flex-1 relative flex flex-col h-screen">
                <Header
                    currentPage={currentPage}
                    currentTime={currentTime}
                    mounted={mounted}
                    userData={userData}
                    loading={loading}
                    unreadNotificationCount={unreadNotificationCount}
                    totalNotificationCount={totalNotificationCount}
                    notifications={displayedNotifications} 
                    showNotificationDropdown={showNotificationDropdown}
                    setShowNotificationDropdown={setShowNotificationDropdown}
                    loadingNotifications={loadingNotifications}
                    loadingAllNotifications={loadingAllNotifications}
                    loadingMoreNotifications={loadingMoreNotifications}
                    showingAllNotifications={showingAllNotifications}
                    markNotificationAsRead={markNotificationAsRead}
                    markAllNotificationsAsRead={markAllNotificationsAsRead}
                    markAllNotificationsAsReadAll={markAllNotificationsAsReadAll}
                    markingAllAsRead={markingAllAsRead} 
                    onLoadMoreNotifications={handleLoadMoreNotifications}
                />

            
                <div className="flex-1 overflow-auto p-4 lg:p-6">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>

            <LogoutModal 
                show={showLogoutConfirm} 
                onConfirm={() => { setShowLogoutConfirm(false); handleLogout(); }} 
                onCancel={() => setShowLogoutConfirm(false)} 
                loggingOut={loggingOut} 
            />
        </div>
    );
}

declare global {
    interface Window {
        notificationEventSource?: EventSource;
    }
}