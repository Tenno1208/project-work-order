"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Waves, Droplet, User, LogOut, Settings, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DateFilter from '@/components/DateFilter'; 
import DashboardStats from '@/components/DashboardStats';
import LogoutModal from '@/components/LogoutModal';

// --- API CONFIGURATION ---
const DASHBOARD_API_LOCAL_PROXY = "/api/dashboard-data";

// --- TYPE DEFINITIONS ---
type ActiveFilter = { 
    startDate: string; 
    endDate: string; 
    preset: string | null; 
};

interface UserData {
    nama?: string; 
    npp?: string; 
    no_telp?: string; 
    satker?: string; 
    subsatker?: string; 
}

export default function DashboardPage() {
    const router = useRouter();
    const [activeFilter, setActiveFilter] = useState<ActiveFilter>({ startDate: '', endDate: '', preset: 'this_month' });
    const [dashboardData, setDashboardData] = useState<any>(null);
    const [loadingDashboardData, setLoadingDashboardData] = useState(false);
    const [userData, setUserData] = useState<UserData>({});
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [showSettingsAccessDenied, setShowSettingsAccessDenied] = useState(false);

    // --- HELPER FUNCTIONS ---
    const getToken = () => localStorage.getItem("token");

    const hasPermission = useCallback((permissionName: string): boolean => {
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

    useEffect(() => {
        const storedUserData = localStorage.getItem("user_data");
        if (storedUserData) {
            try {
                const parsedUserData = JSON.parse(storedUserData) as UserData;
                setUserData(parsedUserData);
            } catch (e) {
                console.error("Gagal parse user data:", e);
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            if (storedPermissions) {
                try {
                    const permissions = JSON.parse(storedPermissions);
                    if (Array.isArray(permissions)) {
                        setUserPermissions(permissions);
                    }
                } catch (e) {
                    console.error("Gagal parse user_permissions:", e);
                    setUserPermissions([]);
                }
            }
            setPermissionsLoaded(true);
        }
    }, []);

    // --- API CALLS ---
    const fetchDashboardData = useCallback(async () => { 
        const token = getToken(); 
        
        if (!token) { 
            console.warn("Token tidak ditemukan."); 
            return; 
        }
        
        setLoadingDashboardData(true);
        
        const payload: Record<string, string> = {};

        if (activeFilter.preset && activeFilter.preset !== 'custom') {
            payload.preset = activeFilter.preset;
        } else {
            if (activeFilter.startDate) {
                const startDate = new Date(activeFilter.startDate).toISOString().split('T')[0];
                payload.start_date = startDate; 
            }
            if (activeFilter.endDate) {
                const endDate = new Date(activeFilter.endDate).toISOString().split('T')[0];
                payload.end_date = endDate;     
            }
        }
        
        const queryParams = new URLSearchParams(payload).toString();
        
        try {
            const res = await fetch(`${DASHBOARD_API_LOCAL_PROXY}?${queryParams}`, { 
                method: "GET", 
                headers: { 
                    Authorization: `Bearer ${token}`, 
                    "Content-Type": "application/json", 
                },
            });
            
            if (!res.ok) { 
                console.warn("Gagal mengambil data dashboard:", res.status); 
                setDashboardData(null); 
                return; 
            }
            
            const result = await res.json();
            
            if (!result.success) { 
                console.warn("Gagal mengambil data dashboard:", result.message); 
                setDashboardData(null); 
                return; 
            }
            
            setDashboardData(result); 
        } catch (err) { 
            console.error("Error fetching dashboard data:", err); 
            setDashboardData(null); 
        } finally { 
            setLoadingDashboardData(false); 
        }
    }, [activeFilter]);

    // --- LOGOUT FUNCTION ---
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

    // --- SETTINGS FUNCTION ---
    const handleSettingsClick = useCallback(() => {
        if (hasPermission('workorder-pti.view.pengaturan')) {
            router.push('/pengaturan');
        } else {
            setShowSettingsAccessDenied(true);
        }
    }, [hasPermission, router]);

    // --- EFFECTS ---
    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    // --- RENDER ---
    if (!permissionsLoaded) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="text-center">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 border-t-transparent"></div>
                    <p className="mt-4 text-gray-700">Memuat izin pengguna...</p>
                </div>
            </div>
        );
    }


    if (!hasPermission('workorder-pti.view.dashboard')) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 md:p-10 text-center transform transition-all">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                        <Lock className="text-red-600" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-red-600 mb-4">Akses Ditolak</h1>
                    <p className="text-gray-700 mb-6 leading-relaxed">
                        Maaf, Anda tidak memiliki izin yang diperlukan untuk mengakses halaman Dashboard.
                    </p>
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-gray-700 mb-2">Izin yang Diperlukan:</p>
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <span className="text-red-500">✗</span>
                                <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-mono">
                                    workorder-pti.view.dashboard
                                </code>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mb-6">
                        Silakan hubungi administrator sistem untuk memperoleh izin yang sesuai.
                    </p>
                    <button
                        onClick={() => setShowLogoutModal(true)}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg mt-4 flex items-center justify-center hover:bg-blue-700 transition-colors"
                    >
                        <User size={18} className="inline-block mr-2" />
                        Kembali ke Login
                    </button>
                </div>

                {/* --- TAMBAHKAN MODAL DI SINI AGAR BISA MUNCUL --- */}
                <LogoutModal 
                    show={showLogoutModal} 
                    onConfirm={handleLogout} 
                    onCancel={() => setShowLogoutModal(false)} 
                    loggingOut={loggingOut} 
                />
            </div>
        );
    }

    return (
        <>  
            <DateFilter 
                onFilterChange={setActiveFilter} 
                initialFilter={activeFilter}
            />
            
            <DashboardStats data={dashboardData} loading={loadingDashboardData} />

            {/* Settings Access Denied Modal */}
            {showSettingsAccessDenied && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 transform transition-all">
                        <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
                            <Lock className="text-red-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-center text-red-600 mb-4">Akses Ditolak</h2>
                        <p className="text-gray-700 mb-6 text-center">
                            Maaf, Anda tidak memiliki izin yang diperlukan untuk mengakses halaman Pengaturan.
                        </p>
                        <div className="bg-gray-50 rounded-lg p-4 mb-6">
                            <p className="text-sm font-semibold text-gray-700 mb-2">Izin yang Diperlukan:</p>
                            <div className="flex items-center gap-2">
                                <span className="text-red-500">✗</span>
                                <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-mono">
                                    workorder-pti.view.pengaturan
                                </code>
                                <span className="text-sm text-gray-600">- Mengakses Pengaturan</span>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-6 text-center">
                            Silakan hubungi administrator sistem untuk memperoleh izin yang sesuai.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowSettingsAccessDenied(false)}
                                className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                            >
                                Tutup
                            </button>
                            <button
                                onClick={() => {
                                    setShowSettingsAccessDenied(false);
                                    setShowLogoutModal(true);
                                }}
                                className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Kembali ke Login
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Modal */}
            <LogoutModal 
                show={showLogoutModal} 
                onConfirm={handleLogout} 
                onCancel={() => setShowLogoutModal(false)} 
                loggingOut={loggingOut} 
            />
        </>
    );
}