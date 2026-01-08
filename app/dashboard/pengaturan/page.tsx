"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  Server, 
  FileSignature, 
  Lock, 
  Waves, 
  Settings,
  ShieldCheck,
  Printer 
} from 'lucide-react';

import ProfilSayaContent from '@/components/ProfilSayaContent'; 
import RiwayatTtdContent from '@/components/RiwayatTtdContent'; 
import PengaturanCetakContent from '@/components/PengaturanCetakContent'; 

const tabs = [
    {
        id: 'profil',
        label: 'Profil Saya',
        requiredPermission: 'Workorder.view.pengaturan.profil',
        icon: User,
    },
    {
        id: 'riwayat-ttd', 
        label: 'Riwayat TTD',
        requiredPermission: 'Workorder.view.history.ttd',
        icon: FileSignature, 
    },
    {
        id: 'cetak',
        label: 'Konfigurasi Cetak',
        requiredPermission: 'Workorder.view.laporan.pengaturan.cetak', 
        icon: Printer,
    },
];

export default function PengaturanPage() {
    const [activeTab, setActiveTab] = useState(tabs[0].id);
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [missingPermissions, setMissingPermissions] = useState<string[]>([]);

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
            const requiredPermissions = tabs.map(tab => tab.requiredPermission);
            const missing = requiredPermissions.filter(permission => !hasPermission(permission));
            setMissingPermissions(missing);
            
            if (missing.length === requiredPermissions.length) return;
            
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
            // --- RENDER KONTEN TAB BARU ---
            if (activeTab === 'cetak') return <PengaturanCetakContent />;
        }
        return null;
    };

    // --- LOADING STATE ---
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

    // --- ACCESS DENIED STATE ---
    if (permissionsLoaded && missingPermissions.length === tabs.length) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center border border-gray-100">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-50 rounded-full mb-6 ring-4 ring-red-50">
                        <Lock className="text-red-500" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h1>
                    <p className="text-gray-500 mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
                    <button onClick={() => window.location.href = '/dashboard'} className="btn-primary w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition">
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // --- MAIN LAYOUT (PDAM THEME) ---
    return (
        <div className="min-h-screen bg-gray-50/50 pb-12">
            {/* 1. HEADER MEWAH (Blue Gradient & Waves) */}
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

                    {/* 2. TAB NAVIGASI MODERN (Glassmorphism) */}
                    <div className="flex space-x-2 bg-white/10 backdrop-blur-sm p-1.5 rounded-xl w-fit border border-white/10 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            const hasTabPermission = hasPermission(tab.requiredPermission);

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

            {/* 3. KONTEN AREA (Floating Card) */}
            <div className="max-w-6xl mx-auto px-4 lg:px-6 -mt-16 relative z-20">
                <div className="bg-white rounded-3xl shadow-xl border border-blue-50/50 min-h-[400px] overflow-hidden">
                    {/* Render Konten di sini */}
                    <div className="p-1">
                        {renderActiveTabContent()}
                    </div>
                </div>
                
                {/* Footer kecil */}
                <div className="text-center mt-6 text-gray-400 text-xs font-medium">
                    &copy; {new Date().getFullYear()} PDAM Work Order System. All rights reserved.
                </div>
            </div>
        </div>
    );
}