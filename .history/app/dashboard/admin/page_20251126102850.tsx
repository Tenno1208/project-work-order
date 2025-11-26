"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Check, X, AlertTriangle, ChevronDown, ChevronUp, Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

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

type PegawaiDef = {
    npp: string;
    name: string;
    satker: string;
};

// URL API yang diasumsikan
const ALL_PEGAWAI_API_PATH = '/api/all-pegawai'; 
const USER_PERMS_API_PATH = '/api/admin/user-permissions'; // API untuk GET/SET permission user lain (ASUMSI)

// =========================================================================
// 🎯 FUNGSI UTILITY: Mengelompokkan Permission
// =========================================================================

const groupWorkorderPermissions = (rawPermissions: string[]): GroupedAdminPermissions => {
    const grouped: GroupedAdminPermissions = {};

    const UI_GROUP_MAP: Record<string, string> = {
        'pengajuan': 'MANAJEMEN PENGAJUAN (LAMPIRAN)',
        'spk': 'SURAT PERINTAH KERJA (SPK)',
    };
    
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
    };

    rawPermissions.forEach(p => {
        const parts = p.toLowerCase().split('.');
        
        // Hanya proses yang dimulai dengan 'workorder' dan memiliki minimal 3 bagian
        if (parts[0] !== 'workorder' || parts.length < 3) {
            return;
        }

        const featureKey = parts[1];
        const actionKey = parts.slice(2).join('.');

        const groupName = UI_GROUP_MAP[featureKey] || featureKey.toUpperCase();
        
        if (!grouped[groupName]) {
            grouped[groupName] = { 
                feature: featureKey,
                actions: {} 
            };
        }
        
        const actionDisplayName = ACTION_MAP[actionKey] || actionKey.replace(/-/g, ' ').replace(/\./g, ' ').toUpperCase();
        
        grouped[groupName].actions[actionDisplayName] = p;
    });

    return grouped;
};

// =========================================================================


export default function AdminDashboard() {
    const router = useRouter();
    
    const [adminPermissions, setAdminPermissions] = useState<GroupedAdminPermissions>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
    
    // States untuk Manajemen User
    const [allUsers, setAllUsers] = useState<PegawaiDef[]>([]);
    const [selectedUserNPP, setSelectedUserNPP] = useState<string | null>(null);
    const [selectedUserName, setSelectedUserName] = useState<string | null>(null);
    const [userToEditPermissions, setUserToEditPermissions] = useState<string[]>([]); 
    
    // State Izin Admin
    const [isUserAdmin, setIsUserAdmin] = useState(false);

    // --- FUNGSI API & DATA ---
    
    // Fungsi untuk mendapatkan semua raw permissions dari user yang login (untuk cek akses & daftar sistem perms)
    const getRawPermissions = () => {
        const permsJson = localStorage.getItem("user_permissions");
        try {
            return permsJson ? JSON.parse(permsJson) : [];
        } catch (e) {
            return [];
        }
    };


    // 1. Mendapatkan semua permissions yang tersedia di sistem (berdasarkan user yang login)
    const loadSystemPermissions = useCallback(async (token: string) => {
        // Ambil izin dari localStorage
        const rawPermissions = getRawPermissions();
        
        // Cek Izin Admin
        // ASUMSI: Izin Admin adalah 'portal-pegawai.settings.admin.master-users' DAN harus memiliki izin Workorder.
        const requiredAdminPermission = 'portal-pegawai.settings.admin.master-users';
        
        const hasAdminPermission = rawPermissions.includes(requiredAdminPermission);
        
        if (hasAdminPermission) {
            setIsUserAdmin(true);
        } else {
            setIsUserAdmin(false);
            return;
        }
        
        // Gunakan permission yang dimiliki admin sebagai daftar permission yang tersedia di sistem
        const organized = groupWorkorderPermissions(rawPermissions);
        setAdminPermissions(organized);

    }, []);
    
    // 2. Mengambil daftar semua user
    const fetchAllUsers = useCallback(async (token: string) => {
        try {
            const res = await fetch(ALL_PEGAWAI_API_PATH, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const json = await res.json();
            
            // ASUMSI: API all-pegawai mengembalikan { success: true, data: [...] }
            if (json.success && Array.isArray(json.data)) {
                setAllUsers(json.data.map((u: any) => ({
                    npp: u.npp,
                    name: u.name,
                    satker: u.satker || u.jabatan || 'N/A'
                })));
            }
        } catch (e) {
            console.error("Gagal memuat daftar user:", e);
        }
    }, []);
    
    // 3. Mengambil Izin User yang Dipilih
    const fetchTargetUserPermissions = useCallback(async (token: string, npp: string) => {
        if (!npp) return;
        setIsLoading(true);
        setUserToEditPermissions([]);
        
        try {
            // ASUMSI: API ini mengembalikan { success: true, data: { permissions: [...] } }
            const res = await fetch(`${USER_PERMS_API_PATH}/${npp}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: 'no-store'
            });
            const json = await res.json();
            
            if (json.success && Array.isArray(json.data.permissions)) {
                setUserToEditPermissions(json.data.permissions);
            } else {
                setUserToEditPermissions([]);
                console.warn(`User ${npp} tidak memiliki Workorder permission yang terdaftar.`);
            }
        } catch (e) {
            console.error(`Gagal memuat izin untuk NPP ${npp}:`, e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // 4. Menyimpan Izin yang Diubah (Aksi Terakhir)
    const savePermissions = async () => {
        if (!selectedUserNPP) return;
        setIsSaving(true);
        
        const token = localStorage.getItem('token');
        if (!token) {
             alert('Sesi berakhir. Silakan login ulang.');
             router.push('/login');
             return;
        }
        
        try {
            // ASUMSI: API ini menerima POST/PUT ke /api/admin/user-permissions
            const res = await fetch(USER_PERMS_API_PATH, {
                method: 'POST', // Atau PUT
                headers: { 
                    'Authorization': `Bearer ${token}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    npp: selectedUserNPP,
                    permissions: userToEditPermissions, // Mengirimkan array izin yang diperbarui
                }),
            });
            
            if (res.ok) {
                alert(`✅ Izin untuk ${selectedUserName} berhasil diperbarui!`);
            } else {
                const errorBody = await res.json();
                alert(`❌ Gagal menyimpan izin: ${errorBody.message || res.statusText}`);
            }
        } catch (e) {
            alert(`❌ Terjadi kesalahan jaringan saat menyimpan izin.`);
        } finally {
            setIsSaving(false);
        }
    };

    // --- USE EFFECT UTAMA ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/login');
            return;
        }
        
        // 1. Muat izin sistem dan cek izin admin user yang login
        loadSystemPermissions(token);
        
        // 2. Muat daftar user
        fetchAllUsers(token);

        setIsLoading(false);
    }, [router, loadSystemPermissions, fetchAllUsers]);
    
    // --- USE EFFECT UNTUK USER YANG DIPILIH ---
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (selectedUserNPP && token && isUserAdmin) {
            fetchTargetUserPermissions(token, selectedUserNPP);
        }
    }, [selectedUserNPP, fetchTargetUserPermissions, isUserAdmin]);


    // --- HANDLERS ---
    const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const npp = e.target.value;
        const selectedUser = allUsers.find(u => u.npp === npp);
        
        setSelectedUserNPP(npp);
        setSelectedUserName(selectedUser?.name || null);
        
        if (!npp) {
             setUserToEditPermissions([]);
        }
    };
    
    const handleTogglePermission = (permissionString: string, isChecked: boolean) => {
        setUserToEditPermissions(prev => {
            if (isChecked) {
                return Array.from(new Set([...prev, permissionString]));
            } else {
                return prev.filter(p => p !== permissionString);
            }
        });
    };

    // --- CEK AKSES AWAL ---
    if (isLoading && !isUserAdmin) {
        return (
             <div className="p-6">
                <Loader2 className="animate-spin text-blue-500 mr-2 inline-block" size={24}/> 
                <span className="text-gray-500 font-medium">Memuat dan memeriksa izin...</span>
            </div>
        );
    }
    
    if (!isUserAdmin) {
        return (
            <div className="p-6 bg-red-50 border border-red-300 text-red-700 rounded-lg flex items-center shadow-md">
                <AlertTriangle className='mr-2' size={20}/> 
                <p className='font-semibold'>Akses Ditolak. Anda tidak memiliki izin Administrator untuk halaman ini.</p>
            </div>
        );
    }
    

    return (
        <div className="p-6 bg-white shadow-xl rounded-xl">
            <header className="mb-8 border-b pb-4">
                <h1 className="text-3xl font-extrabold text-blue-700">
                    <Settings className="inline mr-2 text-cyan-500" size={30}/> Panel Pengaturan Izin
                </h1>
                <p className="text-gray-600 mt-2">
                    Kelola Work Order Permissions untuk pengguna lain.
                </p>
            </header>
            
            {/* BLOK PEMILIHAN USER */}
            <div className="mb-6 p-4 border rounded-lg bg-blue-50">
                <h2 className="text-xl font-bold text-blue-800 mb-3 flex items-center">
                    <Users className='mr-2' size={20}/> Pilih Pengguna Target
                </h2>
                <select 
                    value={selectedUserNPP || ''}
                    onChange={handleUserChange}
                    disabled={isSaving}
                    className="w-full p-2.5 border border-blue-300 rounded-lg shadow-sm focus:ring-blue-500 focus:border-blue-500 transition"
                >
                    <option value="">-- Pilih Pegawai (Nama, NPP, Satker) --</option>
                    {allUsers.map((user) => (
                        <option key={user.npp} value={user.npp}>
                            {user.name} ({user.npp}) - {user.satker}
                        </option>
                    ))}
                </select>
                {selectedUserNPP && (
                    <p className='mt-2 text-sm text-blue-700'>Mengedit izin untuk: **{selectedUserName}** (NPP: {selectedUserNPP})</p>
                )}
            </div>

            {/* BLOK PENGATURAN PERMISSION */}
            {!selectedUserNPP && (
                <div className="p-12 text-center text-gray-500 border-2 border-dashed rounded-lg bg-gray-50">
                    Silakan pilih pengguna dari *dropdown* di atas untuk mulai mengatur izin.
                </div>
            )}
            
            {selectedUserNPP && Object.keys(adminPermissions).length > 0 && (
                <>
                    <div className="space-y-6">
                        {Object.entries(adminPermissions).map(([groupName, groupData]) => {
                            const isExpanded = expandedGroups.includes(groupName);
                            return (
                                <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                                    
                                    {/* Header Grup */}
                                    <button
                                        onClick={() => toggleGroupExpand(groupName)}
                                        disabled={isSaving}
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
                                                                disabled={isSaving}
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
                    
                    <button
                        onClick={savePermissions}
                        disabled={isSaving}
                        className={`mt-8 w-full px-6 py-3 rounded-lg text-white font-bold transition-all shadow-lg ${isSaving ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isSaving ? (
                            <><Loader2 className='inline mr-2 animate-spin' size={20}/> Menyimpan Izin...</>
                        ) : (
                            'Simpan Perubahan Izin'
                        )}
                    </button>
                </>
            )}
            
            <footer className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">
                    <AlertTriangle className='inline mr-1 text-yellow-500' size={14}/> Perhatian: Pastikan API `user-permissions` di *backend* sudah siap menerima permintaan POST/PUT untuk menyimpan array izin baru.
                </p>
            </footer>
        </div>
    );
}