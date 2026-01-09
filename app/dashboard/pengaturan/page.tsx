"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  User, 
  FileSignature, 
  Lock, 
  Waves, 
  Settings,
  ShieldCheck,
  Printer,
  Home // Icon Home untuk tombol kembali
} from 'lucide-react';

import ProfilSayaContent from '@/components/ProfilSayaContent'; 
import RiwayatTtdContent from '@/components/RiwayatTtdContent'; 
import PengaturanCetakContent from '@/components/PengaturanCetakContent'; 

// --- DEFINISI TAB & PERMISSION SUB-FITUR ---
const tabs = [
    {
        id: 'profil',
        label: 'Profil Saya',
        requiredPermission: 'workorder-pti.view.pengaturan.profil',
        icon: User,
    },
    {
        id: 'riwayat-ttd', 
        label: 'Riwayat TTD',
        requiredPermission: 'workorder-pti.view.history.ttd',
        icon: FileSignature, 
    },
    {
        id: 'cetak',
        label: 'Konfigurasi Cetak',
        requiredPermission: 'workorder-pti.view.laporan.pengaturan.cetak', 
        icon: Printer,
    },
];

// --- KOMPONEN ACCESS DENIED UI (Style disamakan dengan Riwayat SPK) ---
const AccessDeniedUI = ({ missingPermission }: { missingPermission: string }) => {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 md:p-10 text-center transform transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                    <Lock className="text-red-600" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-black mb-3">Akses Ditolak</h1>
                <p className="text-black mb-6 leading-relaxed">
                    Maaf, Anda tidak memiliki izin yang cukup untuk mengakses halaman Pengaturan Sistem.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-black mb-1">Izin yang Diperlukan:</p>
                    <code className="block bg-white px-3 py-2 rounded border border-red-200 text-red-600 font-mono text-sm break-words">
                        {missingPermission}
                    </code>
                </div>
                <button
                    onClick={() => router.push('/dashboard')} 
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-md w-full sm:w-auto"
                >
                    <Home size={18} />
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
};

export default function PengaturanPage() {
    const [activeTab, setActiveTab] = useState(tabs[0].id);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    
    const PAGE_PERMISSION = 'workorder-pti.view.pengaturan';

    const hasPermission = useCallback((permissionName: string): boolean => {
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            if (storedPermissions) {
                try {
                    const permissions = JSON.parse(storedPermissions);
                    if (Array.isArray(permissions)) setUserPermissions(permissions);
                } catch (e) {
                    console.error("Gagal parse user_permissions:", e);
                }
            }
            setPermissionsLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (permissionsLoaded) {
            // Cek tab aktif saat ini, apakah user punya izin?
            const activeTabData = tabs.find(tab => tab.id === activeTab);
            
            if (activeTabData && !hasPermission(activeTabData.requiredPermission)) {
                const firstAvailableTab = tabs.find(tab => hasPermission(tab.requiredPermission));
                if (firstAvailableTab) setActiveTab(firstAvailableTab.id);
            }
        }
    }, [permissionsLoaded, hasPermission, activeTab]);

    const handleTabChange = (tabId: string) => {
        const tabData = tabs.find(tab => tab.id === tabId);
        if (tabData && hasPermission(tabData.requiredPermission)) {
            setActiveTab(tabId);
        }
    };

    const renderActiveTabContent = () => {
        const activeTabData = tabs.find(tab => tab.id === activeTab);
        if (activeTabData && hasPermission(activeTabData.requiredPermission)) {
            if (activeTab === 'profil') return <ProfilSayaContent />;
            if (activeTab === 'riwayat-ttd') return <RiwayatTtdContent />;
            if (activeTab === 'cetak') return <PengaturanCetakContent />;
        }
        return null;
    };

    // --- 1. LOADING STATE ---
    if (!permissionsLoaded) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 font-medium animate-pulse">Memuat pengaturan...</p>
                </div>
            </div>
        );
    }

    // --- 2. ACCESS DENIED CHECK (GATEKEEPER UTAMA) ---
    // Jika user tidak punya izin 'workorder-pti.view.pengaturan', blokir seluruh halaman
    if (!hasPermission(PAGE_PERMISSION)) {
        return <AccessDeniedUI missingPermission={PAGE_PERMISSION} />;
    }

    // --- 3. MAIN LAYOUT (Jika Lolos Check) ---
    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* HEADER MEWAH (Blue Gradient & Waves) */}
            <div className="relative bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 pb-24 pt-10 px-6 lg:px-10 overflow-hidden shadow-xl rounded-b-[2.5rem]">
                {/* Dekorasi Background */}
                <div className="absolute top-0 right-0 opacity-10 transform translate-x-10 -translate-y-10">
                    <Waves size={300} textAnchor="white" />
                </div>
                <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full mix-blend-overlay filter blur-3xl opacity-20 animate-pulse"></div>

                <div className="relative z-10 max-w-6xl mx-auto">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                            <Settings className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white tracking-tight">Pengaturan Sistem</h1>
                            <p className="text-blue-100 text-sm font-medium flex items-center gap-2">
                                <ShieldCheck size={14} /> Kelola preferensi akun dan keamanan
                            </p>
                        </div>
                    </div>

                    {/* TAB NAVIGASI MODERN */}
                    <div className="flex space-x-2 bg-white/10 backdrop-blur-sm p-1.5 rounded-xl w-fit border border-white/10 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const hasTabPermission = hasPermission(tab.requiredPermission);

                            // Sembunyikan tab jika tidak punya permission spesifik tab tersebut
                            if (!hasTabPermission) return null;

                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabChange(tab.id)}
                                    className={`
                                        relative px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all duration-300 whitespace-nowrap
                                        ${isActive 
                                            ? 'bg-white text-blue-700 shadow-lg translate-y-0' 
                                            : 'text-blue-100 hover:bg-white/10 hover:text-white'
                                        }
                                    `}
                                >
                                    <Icon size={18} className={isActive ? 'text-cyan-600' : 'text-blue-200'} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* KONTEN AREA (Floating Card) */}
            <div className="max-w-6xl mx-auto px-4 lg:px-6 -mt-16 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl border border-blue-50/50 min-h-[400px] overflow-hidden">
                    <div className="p-1">
                        {renderActiveTabContent()}
                    </div>
                </div>
                
                <div className="text-center mt-6 text-gray-400 text-xs font-medium">
                    &copy; {new Date().getFullYear()} PDAM Work Order System. All rights reserved.
                </div>
            </div>
        </div>
    );
}