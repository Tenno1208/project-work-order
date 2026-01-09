"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { 
    PlusCircle, 
    Search, 
    Loader2, 
    Eye, 
    Pencil, 
    Trash2, 
    X, 
    AlertTriangle, 
    CheckCircle, 
    Droplet, 
    Lock, 
    Home,
    Copy,
    MapPin // 1. Import Icon MapPin
} from "lucide-react";

// KONFIGURASI API
const LIST_API_BASE_PATH = "/api/pengajuan/riwayat"; 
const DELETE_API_BASE = "/api/pengajuan/delete/";
const MAX_RETRIES = 1;

// KONFIGURASI PERMISSION
const CREATE_PERMISSION = 'workorder-pti.pengajuan.create';
const RIWAYAT_PERMISSION = 'workorder-pti.pengajuan.riwayat.views';
const VIEW_DETAIL_PERMISSION = 'workorder-pti.pengajuan.riwayat.view'; 
const EDIT_PERMISSION = 'workorder-pti.pengajuan.riwayat.edit';
const DELETE_PERMISSION = 'workorder-pti.pengajuan.riwayat.delete';

// #######################################################################
// TIPE DATA
// #######################################################################
type ApiPengajuanItem = {
    id: number;
    uuid: string;
    no_surat: string | null;
    hal_id: number;
    catatan: string;
    kepada: string;
    satker: string;
    kode_barang: string;
    keterangan: string;
    file: string | null;
    status: string;
    name_pelapor: string | null;
    npp_pelapor: string | null;
    mengetahui: string | null;
    is_deleted: number;
    created_at: string;
    updated_at: string;
    mengetahui_name: string | null;
    mengetahui_npp: string | null;
};

type ApiResponse = {
    success: boolean;
    data: ApiPengajuanItem[];
};

type Pengajuan = {
    id: number;
    uuid: string;
    tanggal: string;
    hal: string;
    name_pelapor: string;
    status: string;
    no_surat: string;
};

type ToastMessage = {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
};

// --- HELPER FUNCTIONS ---

const formatDate = (isoString: string): string => {
    try {
        if (!isoString) return '-';
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).replace(/\//g, '-');
    } catch (e) {
        return 'Format Salah';
    }
};

const formatReadableDate = (isoString: string): string => {
    try {
        if (!isoString) return '-';
        const date = new Date(isoString);
        return date.toLocaleDateString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch (e) {
        return 'Format Salah';
    }
};


// --- MAIN COMPONENT ---

const Toast = ({ toast, setToast }: { toast: ToastMessage, setToast: React.Dispatch<React.SetStateAction<ToastMessage>> }) => {
    if (!toast.isVisible) return null;

    const baseStyle = "fixed bottom-5 right-5 p-4 rounded-xl shadow-2xl transition-opacity duration-300 z-[70] flex items-center gap-3 max-w-sm";
    const successStyle = "bg-green-600 text-white";
    const errorStyle = "bg-red-600 text-white";
    const Icon = toast.type === 'success' ? CheckCircle : AlertTriangle;

    return (
        <div className={`${baseStyle} ${toast.type === 'success' ? successStyle : errorStyle}`}>
            <Icon size={24} className="flex-shrink-0" />
            <div className="flex-grow">
                <p className="font-semibold">{toast.type === 'success' ? 'Berhasil!' : 'Gagal!'}</p>
                <p className="text-sm">{toast.message}</p>
            </div>
            <button
                onClick={() => setToast(prev => ({ ...prev, isVisible: false }))}
                className="text-white opacity-80 hover:opacity-100 p-1"
                aria-label="Tutup notifikasi"
            >
                <X size={18} />
            </button>
        </div>
    );
};

export default function RiwayatDataPengajuanPage() {
    const router = useRouter();

    // --- STATE MANAGEMENT ---
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: number | null, uuid: string | null, hal: string | null}>({id: null, uuid: null, hal: null});
    const [isDeleting, setIsDeleting] = useState(false);

    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'success', isVisible: false });

    // --- UTILITY CALLBACKS ---
    const hasPermission = useCallback((permissionName: string): boolean => {
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        } , 4000);
    }, []);

    // --- EFFECT: Load Permissions ---
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


    const fetchData = useCallback(async () => {
        if (!permissionsLoaded) return;
        if (!hasPermission(RIWAYAT_PERMISSION)) {
            setAuthError(`Akses Ditolak: Anda tidak memiliki izin (${RIWAYAT_PERMISSION}) untuk melihat riwayat pengajuan.`);
            setLoading(false);
            return;
        }

        setLoading(true);
        setAuthError(null);

        let token: string | null = null;
        
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token');
        }

        if (!token) {
            showToast("Token tidak ditemukan. Login ulang.", "error");
            setAuthError("Token tidak ada");
            setLoading(false);
            return;
        }

        const fullApiUrl = LIST_API_BASE_PATH;
        const headers = {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        };

        try {
            const response = await fetch(fullApiUrl, { method: "GET", headers });

            if (response.status === 404) {
                console.warn("API mengembalikan 404 → data kosong");
                setPengajuans([]);
                setLoading(false);
                return;
            }

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                showToast(errorBody.message || "Gagal memuat data", "error");
                setAuthError("Gagal memuat data");
                setLoading(false);
                return;
            }

            const result: ApiResponse = await response.json();

            if (!result.success || !Array.isArray(result.data)) {
                console.warn("Data API kosong / bukan array");
                setPengajuans([]);
                setLoading(false);
                return;
            }

            const activeData = result.data.filter((item) => item.is_deleted !== 1);

            const mapped = activeData.map((item) => {
                const rawKeterangan = item.keterangan || item.catatan || item.kode_barang || "Tidak Ada Keterangan";
                return {
                    id: item.id,
                    uuid: item.uuid,
                    tanggal: formatDate(item.created_at),
                    no_surat: item.no_surat || '-',
                    hal: rawKeterangan, 
                    name_pelapor: item.name_pelapor || item.npp_pelapor || "Anonim",
                    status: item.status || "Pending",
                };
            });

            setPengajuans(mapped);
        } catch (e: any) {
            console.error("Fetch error:", e);
            setAuthError("Gagal mengambil data");
        }

        setLoading(false);
    }, [showToast, hasPermission, permissionsLoaded]);


    useEffect(() => {
        if (permissionsLoaded) {
            fetchData();
        }
    }, [fetchData, permissionsLoaded]);

    // --- Action Handlers ---

    const generateNoSurat = (): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const random = Math.floor(100 + Math.random() * 900);
        return `SPK-${day}${month}${year}-${random}`;
    };

    const handleBuatPengajuan = () => {
        if (!hasPermission(CREATE_PERMISSION)) { 
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${CREATE_PERMISSION}) untuk membuat pengajuan baru.`, "error");
            return;
        }
        setCreating(true);
        const nomorSuratBaru = generateNoSurat();

        if (typeof window !== 'undefined') {
            localStorage.setItem("nomor_surat_terakhir", nomorSuratBaru);
        }

        router.push("/dashboard/lampiran/tambah");
        setCreating(false);
    };

    const handleView = (uuid: string) => {
        if (!hasPermission(VIEW_DETAIL_PERMISSION)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${VIEW_DETAIL_PERMISSION}) untuk melihat detail.`, "error");
            return;
        }
        router.push(`/dashboard/lampiran/view/${uuid}`);
    };

    const handleEdit = (uuid: string) => {
        if (!hasPermission(EDIT_PERMISSION)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${EDIT_PERMISSION}) untuk mengedit pengajuan.`, "error");
            return;
        }
        localStorage.setItem("current_edit_uuid", uuid);
        router.push(`/dashboard/lampiran/edit/${uuid}`);
    };

    const handleDeleteClick = (id: number, uuid: string, hal: string) => {
        if (!hasPermission(DELETE_PERMISSION)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${DELETE_PERMISSION}) untuk menghapus pengajuan.`, "error");
            return;
        }
        if (isDeleting) return;
        setItemToDelete({ id, uuid, hal });
        setIsDeleteModalOpen(true);
    };

    // --- FUNGSI COPY & TRACKING ---
    const handleCopy = (text: string) => {
        if (!text || text === '-') return;
        navigator.clipboard.writeText(text);
        showToast(`No Surat "${text}" berhasil disalin!`, "success");
    };

    // 2. Fungsi Handle Tracking (Baru)
    const handleTracking = (uuid: string) => {
        if (!uuid) return;
        // Membuka tab baru ke halaman tracking
        window.open(`/tracking/${uuid}`, '_blank');
    };

    const handleConfirmDelete = async () => {
        if (!hasPermission(DELETE_PERMISSION)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${DELETE_PERMISSION}) untuk menghapus pengajuan.`, 'error');
            setIsDeleteModalOpen(false);
            return;
        }

        if (itemToDelete.uuid === null) {
            showToast("Error: UUID data tidak ditemukan.", 'error');
            setIsDeleteModalOpen(false);
            return;
        }
        
        const uuidToDelete = itemToDelete.uuid;
        const idToDelete = itemToDelete.id;
        const halDeleted = itemToDelete.hal;

        setIsDeleteModalOpen(false);
        setIsDeleting(true);

        let token: string | null = null;
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token');
        }

        if (!token) {
            const errorMsg = "Tidak dapat menghapus. Token otorisasi tidak ditemukan.";
            showToast(errorMsg, 'error');
            setIsDeleting(false);
            setItemToDelete({id: null, uuid: null, hal: null});
            return;
        }

        const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            "bypass-tunnel-reminder": "true",
        };

        const deleteUrl = `${DELETE_API_BASE}/${uuidToDelete}`;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: headers,
                });

                const responseData = await response.json();

                if (!response.ok) {
                    if (response.status === 401) {
                        showToast('Sesi Anda berakhir saat menghapus. Mohon login ulang.', 'error');
                        throw new Error(`Otorisasi Gagal: ${responseData.message || 'Token tidak valid'}`);
                    }
                    showToast(responseData.message || `Gagal menghapus (Status: ${response.status})`, 'error');
                    throw new Error(responseData.message || `Gagal menghapus (Status: ${response.status})`);
                }

                setPengajuans(prev => prev.filter(p => p.id !== idToDelete));
                console.log(`[SUCCESS]: Data pengajuan ID ${idToDelete} berhasil dihapus.`);

                showToast(`Pengajuan "${halDeleted}" berhasil dihapus.`, 'success');

                setIsDeleting(false);
                setItemToDelete({id: null, uuid: null, hal: null});
                return;

            } catch (error: any) {
                console.error(`Gagal menghapus (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);

                if (i === MAX_RETRIES - 1 || error.message.includes("Otorisasi Gagal")) {
                    setIsDeleting(false);
                    setItemToDelete({id: null, uuid: null, hal: null});
                    return;
                } else {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    };

    // --- Filtering & Styling ---

    const filtered = pengajuans.filter(
        (p) =>
            p.hal.toLowerCase().includes(search.toLowerCase()) ||
            p.name_pelapor.toLowerCase().includes(search.toLowerCase()) ||
            p.status.toLowerCase().includes(search.toLowerCase()) ||
            p.tanggal.toLowerCase().includes(search.toLowerCase()) ||
            p.no_surat.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
            case "diterima":
                return "bg-green-100 text-green-700 ring-1 ring-green-300";
            case "rejected":
            case "ditolak":
                return "bg-red-100 text-red-700 ring-1 ring-red-300";
            case "pending":
            case "menunggu":
                return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300";
            case "diproses":
            case "selesai":
            case "":
                return "bg-blue-100 text-blue-700 ring-1 ring-blue-300";
            case "error":
                return "bg-gray-700 text-white";
            default:
                return "bg-gray-100 text-gray-700 ring-1 ring-gray-300";
        }
    };

    // --- CUSTOM MODAL COMPONENT ---
    const DeleteConfirmationModal = () => {
        if (!isDeleteModalOpen || itemToDelete.id === null) return null;

        const { id, hal } = itemToDelete;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" aria-modal="true">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 scale-100">
                    <div className="flex justify-between items-start border-b pb-3 mb-4">
                        <h3 className="text-xl font-bold text-red-600 flex items-center gap-2">
                            <AlertTriangle size={24} /> Konfirmasi Penghapusan
                        </h3>
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="text-gray-700 mb-6">
                        <p>Apakah Anda yakin ingin menghapus data pengajuan dengan ID **{id}** (Hal: {hal})?</p>
                        <p className="text-sm mt-2 text-gray-500">Tindakan ini tidak dapat dibatalkan.</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:bg-red-400 disabled:scale-100"
                        >
                            {isDeleting ? (
                                <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                            ) : null}
                            Ya, Hapus Data
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- Access Denied UI ---
    const AccessDeniedUI = ({ missingPermission }: { missingPermission: string }) => {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 md:p-10 text-center transform transition-all">

                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                        <Lock className="text-red-600" size={32} />
                    </div>
                    
                    <h1 className="text-3xl font-bold text-gray-900 mb-3">Akses Ditolak</h1>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                        Maaf, Anda tidak memiliki izin yang cukup untuk mengakses halaman ini.
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                        <p className="text-sm font-semibold text-gray-700 mb-1">Izin yang Diperlukan:</p>
                        <code className="block bg-white px-3 py-2 rounded border border-red-200 text-red-600 font-mono text-sm">
                            {missingPermission}
                        </code>
                    </div>
                    
                    <p className="text-sm text-gray-500 mb-6">
                        Jika Anda ingin Izin, silakan hubungi administrator sistem Anda.
                    </p>
                    
                    <button
                        onClick={() => router.push('/dashboard')} 
                        className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-md"
                    >
                        <Home size={18} />
                        Kembali ke Dashboard
                    </button>
                </div>
            </div>
        );
    };


    if (!permissionsLoaded) { 
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat izin pengguna...</span>
            </div>
        );
    }

    if (!hasPermission(RIWAYAT_PERMISSION)) { 
        return <AccessDeniedUI missingPermission={RIWAYAT_PERMISSION} />;
    }


    // --- RENDER UTAMA ---

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <DeleteConfirmationModal />
            <Toast toast={toast} setToast={setToast} />

            {isDeleting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center">
                        <Loader2 className="animate-spin text-red-600 mr-3" size={24}/>
                        <span className="text-lg font-semibold text-gray-800">Menghapus data ID {itemToDelete.id}...</span>
                    </div>
                </div>
            )}

            <div className="bg-gradient-to-r from-blue-50 to-white rounded-2xl p-5 border border-blue-100 shadow-lg">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-md">
                            <Droplet className="text-white" size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 mb-1">
                                Riwayat Pengajuan Perbaikan
                            </h2>
                            <p className="text-gray-700 text-sm">
                                Riwayat seluruh pengajuan perbaikan teknis Anda
                            </p>
                        </div>
                    </div>
                    
                    <button
                        onClick={handleBuatPengajuan}
                        disabled={creating || isDeleting || !hasPermission(EDIT_PERMISSION)}
                        title={!hasPermission(EDIT_PERMISSION) ? `Akses Ditolak: Tidak ada izin (${EDIT_PERMISSION})` : "Buat Pengajuan Baru"}
                        className={`flex items-center gap-2 ${
                            (creating || isDeleting || !hasPermission(EDIT_PERMISSION)) ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                        } text-white px-5 py-2.5 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] duration-200 ease-in-out font-medium`}
                    >
                        {creating ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Membuat...
                            </>
                        ) : (
                            <>
                                <PlusCircle size={18} /> Buat Pengajuan Baru
                            </>
                        )}
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative max-w-lg mt-5">
                    <Search
                        className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                        size={16}
                    />
                    <input
                        type="text"
                        placeholder="Cari berdasarkan tanggal, hal, pelapor, atau status..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-300 bg-white shadow-sm text-sm text-gray-800"
                    />
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="px-5 py-4 border-b border-blue-100">
                    <h3 className="text-lg font-bold text-gray-900">
                        Daftar Riwayat Pengajuan Perbaikan
                    </h3>
                    <p className="text-gray-600 text-xs mt-1">
                        Total {filtered.length} pengajuan ditemukan
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-gray-700 divide-y divide-gray-200">
                        {/* UPDATE HEADER SESUAI PERMINTAAN */}
                        <thead className="bg-blue-600 text-white">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold w-[5%] border-b border-blue-200">No</th>
                                <th className="px-4 py-3 text-left font-semibold w-[15%] border-b border-blue-200">Tanggal</th>
                                <th className="px-4 py-3 text-left font-semibold w-[20%] border-b border-blue-200">No. Surat</th>
                                <th className="px-4 py-3 text-left font-semibold max-w-xs border-b border-blue-200">Hal (Keterangan)</th>
                                <th className="px-4 py-3 text-left font-semibold w-[15%] border-b border-blue-200">Pelapor</th>
                                <th className="px-4 py-3 text-left font-semibold w-[10%] border-b border-blue-200">Status</th>
                                <th className="px-4 py-3 text-center font-semibold w-[10%] border-b border-blue-200">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center bg-white">
                                        <Loader2 className="animate-spin inline-block text-blue-600 mr-2" size={24}/>
                                        <span className="text-gray-600 font-medium">Memuat data...</span>
                                    </td>
                                </tr>
                            ) : authError && filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-10 text-center bg-white">
                                        <AlertTriangle className="inline-block text-red-500 mr-2" size={24}/>
                                        <span className="text-red-500 font-medium">{authError}. Mohon periksa koneksi Anda atau coba login ulang.</span>
                                    </td>
                                </tr>
                            ) : pengajuans.length === 0 ? (
                                // KONDISI 1: Benar-benar tidak punya data dari Database
                                <tr>
                                    <td colSpan={7} className="py-16 text-center">
                                        <p className="text-gray-700 text-lg font-semibold mb-2">
                                            Anda belum memiliki riwayat pengajuan.
                                        </p>
                                        <p className="text-gray-500 text-sm mb-4">
                                            Silakan buat pengajuan baru.
                                        </p>
                                        <button
                                            onClick={handleBuatPengajuan}
                                            disabled={!hasPermission(EDIT_PERMISSION)}
                                            className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                                        >
                                            <PlusCircle size={16}/> Buat Sekarang
                                        </button>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                // KONDISI 2: Data Ada, tapi Search tidak ketemu
                                <tr>
                                    <td colSpan={7} className="py-12 text-center">
                                        <Droplet className="mx-auto text-gray-400 mb-3" size={48} />
                                        <p className="text-gray-700 text-base font-medium">
                                            Tidak ada data pengajuan yang ditemukan
                                        </p>
                                        <p className="text-gray-500 text-xs mt-1">
                                            Coba ubah kata kunci pencarian "{search}"
                                        </p>
                                        <button 
                                            onClick={() => setSearch('')}
                                            className="mt-3 text-blue-600 text-xs font-medium hover:underline"
                                        >
                                            Reset Pencarian
                                        </button>
                                    </td>
                                </tr>
                            ) : (
                                // KONDISI 3: Data Ada dan Sesuai Search
                                filtered.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        className="bg-white hover:bg-blue-50 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-center text-xs font-medium text-gray-800">{i + 1}</td>
                                        <td className="px-4 py-3 text-xs text-gray-800 whitespace-nowrap">{p.tanggal}</td>
                                        
                                        {/* KOLOM NO SURAT DENGAN COPY & TRACKING */}
                                        <td className="px-4 py-3 text-xs text-gray-800 font-semibold whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <span>{p.no_surat}</span>
                                                {p.no_surat && p.no_surat !== '-' && (
                                                    <>
                                                        {/* TOMBOL COPY */}
                                                        <button
                                                            onClick={() => handleCopy(p.no_surat)}
                                                            className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                                                            title="Salin No Surat"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                        
                                                        {/* 3. TOMBOL TRACKING (Update disini) */}
                                                        <button
                                                            onClick={() => handleTracking(p.uuid)}
                                                            className="text-gray-400 hover:text-orange-500 p-1 rounded hover:bg-orange-50 transition-colors"
                                                            title="Lacak Status"
                                                        >
                                                            <MapPin size={14} />
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </td>

                                        <td className="px-4 py-3 text-xs text-gray-800 max-w-xs line-clamp-2">
                                            {/* Render HTML content jika perlu, atau text biasa */}
                                            <div dangerouslySetInnerHTML={{ __html: p.hal }} />
                                        </td>
                                        <td className="px-4 py-3 text-xs text-gray-800 font-medium whitespace-nowrap">{p.name_pelapor}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-full border ${getStatusStyle(p.status)}`}
                                            >
                                                {p.status || 'BELUM DIISI'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                                            <div className="flex justify-center space-x-2">
                                                {/* VIEW */}
                                                <button
                                                    onClick={() => handleView(p.uuid)}
                                                    title={!hasPermission(VIEW_DETAIL_PERMISSION) ? `Akses Ditolak: Tidak ada izin ${VIEW_DETAIL_PERMISSION}` : "Lihat Detail"}
                                                    disabled={isDeleting || !hasPermission(VIEW_DETAIL_PERMISSION)}
                                                    className={`p-1.5 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors duration-200 disabled:opacity-50`}
                                                >
                                                    <Eye className="text-blue-700 hover:scale-110 transition-transform" size={14} />
                                                </button>
                                                
                                                {/* EDIT */}
                                                <button
                                                    onClick={() => handleEdit(p.uuid)}
                                                    title={!hasPermission(EDIT_PERMISSION) ? `Akses Ditolak: Tidak ada izin ${EDIT_PERMISSION}` : "Ubah Data"}
                                                    disabled={isDeleting || !hasPermission(EDIT_PERMISSION)}
                                                    className={`p-1.5 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors duration-200 disabled:opacity-50`}
                                                >
                                                    <Pencil className="text-yellow-700 hover:scale-110 transition-transform" size={14} />
                                                </button>
                                                
                                                {/* DELETE */}
                                                <button
                                                    onClick={() => handleDeleteClick(p.id, p.uuid, p.hal)}
                                                    title={!hasPermission(DELETE_PERMISSION) ? `Akses Ditolak: Tidak ada izin ${DELETE_PERMISSION}` : "Hapus Pengajuan"}
                                                    disabled={isDeleting || !p.uuid || !hasPermission(DELETE_PERMISSION)}
                                                    className={`p-1.5 ${(!p.uuid || !hasPermission(DELETE_PERMISSION)) ? 'bg-gray-100 cursor-not-allowed' : 'bg-red-100 hover:bg-red-200'} rounded-md transition-colors duration-200 disabled:opacity-50`}
                                                >
                                                    <Trash2 className={`${(!p.uuid || !hasPermission(DELETE_PERMISSION)) ? 'text-gray-400' : 'text-red-700'} hover:scale-110 transition-transform`} size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-700">
                        <p className="font-medium">Informasi Tambahan:</p>
                        <ul className="mt-1 space-y-0.5 list-disc list-inside text-gray-600">
                            <li>Data pengajuan teknis diperbarui secara real-time</li>
                            <li>Klik ikon mata (<Eye size={12} className="inline-block align-middle"/>) untuk melihat detail lengkap</li>
                            <li>Klik ikon pensil (<Pencil size={12} className="inline-block align-middle"/>) untuk mengubah data pengajuan</li>
                            <li>Klik ikon tempat sampah (<Trash2 size={12} className="inline-block align-middle"/>) untuk menghapus data pengajuan</li>
                        </ul>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-600">Terakhir diperbarui:</p>
                        <p className="text-base font-bold text-gray-900">
                            {formatReadableDate(new Date().toISOString())}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}