"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Check, X, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

// Tipe untuk struktur hasil pengelompokan
type ActionDetail = {
    [actionLabel: string]: string; // { "Buat Baru": "Workorder.pengajuan.create" }
};

type GroupedAdminPermissions = {
    [groupName: string]: { // Contoh: "MANAJEMEN PENGAJUAN"
        feature: string;
        actions: ActionDetail;
    }
};

// =========================================================================
// 🎯 FUNGSI UTILITY: Mengelompokkan Permission (Ambil dari Respons API Anda)
// =========================================================================

const groupWorkorderPermissions = (rawPermissions: string[]): GroupedAdminPermissions => {
    const grouped: GroupedAdminPermissions = {};

    const UI_GROUP_MAP: Record<string, string> = {
        'pengajuan': 'MANAJEMEN PENGAJUAN (LAMPIRAN)',
        'spk': 'SURAT PERINTAH KERJA (SPK)',
        // Anda dapat menambahkan grup lain di sini
    };
    
    // Pola Aksi yang Disimpulkan dari list permission Anda
    const ACTION_MAP: Record<string, string> = {
        'create': 'Buat Baru',
        'edit': 'Ubah Data',
        'update': 'Ubah Data',
        'delete': 'Hapus Data',
        'view': 'Lihat Detail',
        'views': 'Lihat Daftar',
        'riwayat': 'Lihat Riwayat',
        'approval': 'Persetujuan (Approve/Reject)',
        'create.menugaskan': 'Buat & Tugaskan',
        // Tambahkan mapping untuk aksi spesifik lain jika ditemukan
    };

    rawPermissions.forEach(p => {
        const parts = p.toLowerCase().split('.');
        
        // Hanya proses yang dimulai dengan 'workorder' dan memiliki minimal 3 bagian
        if (parts[0] !== 'workorder' || parts.length < 3) {
            return;
        }

        const featureKey = parts[1]; // pengajuan atau spk
        const actionKey = parts.slice(2).join('.'); // create, edit, approval, create.menugaskan, dll.

        const groupName = UI_GROUP_MAP[featureKey] || featureKey.toUpperCase();
        
        if (!grouped[groupName]) {
            grouped[groupName] = { 
                feature: featureKey, // untuk identifikasi internal
                actions: {} 
            };
        }
        
        // Tentukan label aksi yang ramah pengguna
        const actionDisplayName = ACTION_MAP[actionKey] || actionKey.replace(/-/g, ' ').replace(/\./g, ' ').toUpperCase();
        
        // Simpan permission string asli sebagai nilai
        grouped[groupName].actions[actionDisplayName] = p;
    });

    return grouped;
};

// =========================================================================


export default function AdminDashboard() {
    const [adminPermissions, setAdminPermissions] = useState<GroupedAdminPermissions>({});
    const [isLoading, setIsLoading] = useState(true);
    // State untuk menyimpan item yang diperluas di UI
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    
    // Asumsi: Di halaman admin, kita perlu memilih user yang akan diatur permission-nya
    // Untuk tujuan demo ini, kita akan menggunakan permission user yang sedang login dari LS.
    const [userToEditPermissions, setUserToEditPermissions] = useState<string[]>([]); // Izin user yang sedang diedit

    // 1. Ambil data dari localStorage dan proses
    const loadPermissions = useCallback(() => {
        setIsLoading(true);
        try {
            // Asumsi: permission mentah disimpan dengan key 'user_permissions_raw'
            const rawPermsJson = localStorage.getItem("user_permissions_raw");
            
            if (rawPermsJson) {
                const rawPermissions = JSON.parse(rawPermsJson) as string[];
                
                // Ambil semua permission yang ada di sistem (baik yang dimiliki user atau tidak)
                // Di sini, kita menggunakan rawPermissions user yang login sebagai contoh list permission sistem
                const systemPermissions = rawPermissions; 

                const organized = groupWorkorderPermissions(systemPermissions);
                
                setAdminPermissions(organized);
                // Untuk demo, kita set permission user yang sedang diedit sama dengan system permission.
                setUserToEditPermissions(rawPermissions); 
            }
        } catch (e) {
            console.error("Error loading or parsing permissions:", e);
            // Tambahkan notifikasi error jika diperlukan
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadPermissions();
    }, [loadPermissions]);
    
    // Handler untuk toggle status checkbox
    const handleTogglePermission = (permissionString: string, isChecked: boolean) => {
        // Logika di sini akan menjadi tempat Anda memanggil API backend 
        // untuk mengupdate permission user/role tertentu.
        
        // Untuk demo: update state lokal
        setUserToEditPermissions(prev => {
            if (isChecked) {
                // Tambahkan permission
                return Array.from(new Set([...prev, permissionString]));
            } else {
                // Hapus permission
                return prev.filter(p => p !== permissionString);
            }
        });
        
        console.log(`[ACTION]: Permission ${permissionString} diubah menjadi ${isChecked ? 'TRUE' : 'FALSE'}`);
    };

    const toggleGroupExpand = (groupName: string) => {
        setExpandedGroups(prev => 
            prev.includes(groupName) 
                ? prev.filter(n => n !== groupName) 
                : [...prev, groupName]
        );
    };

    if (isLoading) {
        return <div className="text-gray-500 flex items-center">Memuat data izin...</div>;
    }
    
    if (Object.keys(adminPermissions).length === 0) {
        return <div className="p-6 text-red-500 border border-red-300 rounded-lg">Tidak ada data Workorder Permission ditemukan di localStorage.</div>;
    }


    return (
        <div className="p-6 bg-white shadow-xl rounded-xl">
            <header className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-extrabold text-blue-700">
                    <Settings className="inline mr-2 text-cyan-500" size={30}/> Panel Pengaturan Izin
                </h1>
                <p className="text-gray-600 mt-2">
                    Atur izin untuk setiap modul dan aksi dalam sistem Work Order. (Izin yang ditandai **Hijau** adalah izin yang dimiliki user ini).
                </p>
            </header>

            <div className="space-y-6">
                {Object.entries(adminPermissions).map(([groupName, groupData]) => {
                    const isExpanded = expandedGroups.includes(groupName);
                    return (
                        <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                            
                            {/* Header Grup */}
                            <button
                                onClick={() => toggleGroupExpand(groupName)}
                                className={`flex items-center justify-between w-full p-4 font-semibold text-left transition-colors duration-300 ${isExpanded ? 'bg-blue-50 text-blue-800' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                            >
                                <span className="text-lg tracking-wide">{groupName}</span>
                                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            
                            {/* Isi Grup */}
                            {isExpanded && (
                                <div className="p-4 bg-white">
                                    <h4 className="font-medium text-sm text-gray-500 mb-3 border-b pb-2">Daftar Aksi:</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {Object.entries(groupData.actions).map(([actionLabel, permissionString]) => {
                                            const isChecked = userToEditPermissions.includes(permissionString);
                                            return (
                                                <label 
                                                    key={permissionString} 
                                                    className={`flex items-center space-x-3 p-3 rounded-md cursor-pointer transition-all border ${isChecked ? 'bg-green-50 border-green-300' : 'bg-white hover:bg-gray-50 border-gray-200'}`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        value={permissionString}
                                                        checked={isChecked} 
                                                        onChange={(e) => handleTogglePermission(permissionString, e.target.checked)}
                                                        className={`h-4 w-4 rounded transition-colors ${isChecked ? 'text-green-600 border-green-500 focus:ring-green-500' : 'text-blue-500 border-gray-300 focus:ring-blue-500'}`}
                                                    />
                                                    <div className="flex flex-col">
                                                        <span className={`text-sm font-medium ${isChecked ? 'text-green-700' : 'text-gray-800'}`}>
                                                            {isChecked ? <Check className='inline mr-1' size={14}/> : <X className='inline mr-1 text-gray-400' size={14}/>}
                                                            {actionLabel}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            {permissionString.split('.').slice(1).join('.')}
                                                        </span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            
            <footer className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                    <AlertTriangle className='inline mr-1 text-yellow-500' size={14}/> Perhatian: Setiap perubahan pada *checkbox* harus diikuti dengan logika API di *backend* untuk menyimpan konfigurasi izin baru.
                </p>
            </footer>
        </div>
    );
}