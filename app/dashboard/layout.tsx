// app/dashboard/layout.tsx

"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';

import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import LogoutModal from '@/components/LogoutModal';

const NOTIFICATIONS_API_LOCAL_PROXY = "/api/notifications";
const NOTIFICATIONS_ALL_API_LOCAL_PROXY = "/api/notifications/all";

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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    // --- STATE MANAGEMENT ---
    const [collapsed, setCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [loggingOut, setLoggingOut] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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

    const useEventSourceNotifications = useCallback(() => {
        const storedUserData = localStorage.getItem("user_data");
        if (!storedUserData) return;
        
        let userData: UserData;
        try {
            userData = JSON.parse(storedUserData) as UserData;
        } catch (e) {
            console.error("Gagal parse user data:", e);
            return;
        }
        
        const npp = userData.npp;
        if (!npp || npp === '-') return;
        
        const token = getToken();
        if (!token) return;
        
        setLoadingNotifications(true);
        
        if (window.notificationEventSource) {
            window.notificationEventSource.close();
        }
        
        const eventSourceUrl = `${NOTIFICATIONS_API_LOCAL_PROXY}/stream?npp=${npp}&token=${encodeURIComponent(token)}`;
        const eventSource = new EventSource(eventSourceUrl);
        window.notificationEventSource = eventSource;
        
        eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                if (data.connected) {
                    console.log('Terhubung ke stream notifikasi');
                    setLoadingNotifications(false);
                    return;
                }
                
                if (data.error) {
                    console.error('Error dari stream notifikasi:', data.error);
                    setLoadingNotifications(false);
                    return;
                }
                
                const rawApiNotifications = data.data;
                
                if (Array.isArray(rawApiNotifications)) {
                    const mappedNotifications: Notification[] = rawApiNotifications.map((item: any) => ({
                        id: item.id,
                        title: item.judul,
                        message: item.pesan,
                        read: item.status === 'read',
                        created_at: item.created_at,
                        uuid_pengajuan: item.uuid_pengajuan || null,
                    }))
                    .sort((a, b) => {
                        if (a.created_at && b.created_at) {
                            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                        }
                        return 0;
                    });
                    
                    setNotifications(mappedNotifications);
                    setUnreadNotificationCount(data.unread_count || 0);
                    
                    const newUnreadNotifications = mappedNotifications.filter(n => !n.read);
                    if (newUnreadNotifications.length > 0) {
                        if ("Notification" in window && Notification.permission === "granted") {
                            const latestNotification = newUnreadNotifications[0];
                            new Notification(latestNotification.title, {
                                body: latestNotification.message,
                                icon: "/favicon.ico",
                            });
                        } else if ("Notification" in window && Notification.permission !== "denied") {
                            Notification.requestPermission().then(permission => {
                                if (permission === "granted") {
                                    const latestNotification = newUnreadNotifications[0];
                                    new Notification(latestNotification.title, {
                                        body: latestNotification.message,
                                        icon: "/favicon.ico",
                                    });
                                }
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('Error parsing notification data:', e);
            } finally {
                setLoadingNotifications(false);
            }
        };
        
        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            setLoadingNotifications(false);
            
            setTimeout(() => {
                if (window.notificationEventSource?.readyState === EventSource.CLOSED) {
                    useEventSourceNotifications();
                }
            }, 5000);
        };
    }, []);


    const fetchAndSetAllNotifications = useCallback(async () => {
        const storedUserData = localStorage.getItem("user_data");
        if (!storedUserData) return;
        
        const userData = JSON.parse(storedUserData);
        const npp = userData.npp;
        
        if (!npp || npp === '-') {
            console.error("NPP tidak ditemukan, membatalkan fetch all.");
            return;
        }
        
        const token = getToken();
        if (!token) return;
        
        setLoadingMoreNotifications(true);
        
        try {
            const response = await fetch(`${NOTIFICATIONS_ALL_API_LOCAL_PROXY}/${npp}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
            
            if (!response.ok) throw new Error("Gagal fetch API lokal");
            
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


    // --- API CALLS ---
    const markNotificationAsRead = useCallback(async (notificationId: number) => {
        const token = getToken();
        if (!token) return;

        try {
            const res = await fetch(`/api/notifications/update/${notificationId}`, {
                method: "POST",
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

    const markAllNotificationsAsRead = useCallback(async () => { 
        const token = getToken(); 
        if (!token) return;
        const unreadNotifications = (showingAllNotifications ? allNotifications : notifications).filter(n => !n.read); 
        if (unreadNotifications.length === 0) return;
        const npp = userData.npp; 
        if (!npp || npp === '-') return;

        try {
            const res = await fetch(`${NOTIFICATIONS_API_LOCAL_PROXY}/update/${npp}`, {
                method: "POST", 
                headers: { 
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json", 
                } 
            });
            if (!res.ok) return;
            
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setAllNotifications(prev => prev.map(n => ({ ...n, read: true })));
            setUnreadNotificationCount(0);
        } catch (err) { 
            console.error("Error marking all notifications as read:", err); 
        }
    }, [notifications, allNotifications, showingAllNotifications, userData.npp]);


    const markAllNotificationsAsReadAll = useCallback(async () => { 
        const token = getToken(); 
        if (!token) return;
        
        const npp = userData.npp; 
        if (!npp || npp === '-') return;

        setMarkingAllAsRead(true);

        try {
            const res = await fetch(`/api/notifications/update/all/${npp}`, {
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

        } catch (err) { 
            console.error("Error marking all notifications as read:", err); 
        } finally {
            setMarkingAllAsRead(false);
        }
    }, [userData.npp]); 

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
            await fetch('/api/logout', { 
                method: 'POST', 
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                }, 
            }); 
        } catch (error) { 
            console.error("Error calling local proxy:", error); 
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

    // --- MENU CONFIGURATION ---
    const allMenuItems = [ 
        { href: "/dashboard", 
            label: "Dashboard", 
            icon: require('lucide-react').LayoutDashboard, 
            description: "Ringkasan & Statistik",
            requiredPermission: "Workorder.view.dashboard"
            }, 
        { href: "/dashboard/admin", 
            label: "Admin", icon: require('lucide-react').Users, 
            description: "Kelola Pengguna", 
            requiredPermission: "Workorder.Admin"
        }, 

        { 
            label: "Data Pengajuan", 
            icon: require('lucide-react').ClipboardList, 
            description: "Dokumen Lampiran", 
            requiredPermission: "Workorder.pengajuan.views",
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
            requiredPermission: "Workorder.spk.views" 
        },
        { 
            href: "/dashboard/laporan", 
            label: "Laporan", 
            icon: require('lucide-react').FileBarChart, 
            description: "Cetak Laporan & Statistik",
            requiredPermission: "Workorder.view.laporan" 
        },
        { 
            href: "/dashboard/pengaturan", 
            label: "Pengaturan", 
            icon: require('lucide-react').Settings, 
            description: "Pengaturan Sistem",
            requiredPermission: "Workorder.view.pengaturan", 
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
            <Sidebar 
                collapsed={collapsed} 
                setCollapsed={setCollapsed} 
                menuItems={menuItems} 
                pathname={pathname} 
                handleNavigation={handleNavigation} 
                handleLogout={requestLogout} 
                loggingOut={loggingOut} 
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