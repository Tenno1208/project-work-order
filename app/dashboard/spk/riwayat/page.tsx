"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    History,
    Search,
    Loader2,
    Calendar,
    Filter,
    Eye,
    Pencil,
    Trash2,
    X,
    AlertTriangle,
    Lock,
    Home,
    BarChart,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- KONSTANTA API & PERMISSION ---
const DELETE_API_SPK_URL_LOCAL = "/api/spk/delete/"; 
const RIWAYAT_SPK_STAFF_BASE_URL = "/api/spk/riwayat-staff"; 
const MAX_RETRIES = 1;

const RIWAYAT_PERMISSION = 'Workorder.spk.riwayat.views';
const VIEW_DETAIL_PERMISSION = 'Workorder.spk.riwayat.view';
const EDIT_PERMISSION = 'Workorder.spk.riwayat.edit';
const DELETE_PERMISSION = 'Workorder.spk.riwayat.delete';


// --- TYPES & INTERFACES ---
type SPKItem = {
    id: number; 
    nomor: string; 
    pekerjaan: string; 
    tanggal: string; 
    status: "Selesai" | "Proses" | "Menunggu" | string;
    uuid: string;
    namaPetugas?: string; 
};

type StatusCount = {
    total: number;
    selesai: number;
    proses: number;
    menunggu: number;
};

type ToastMessage = {
    show: boolean;
    message: string;
    type: "success" | "error";
};

type ModalState = {
    isOpen: boolean;
    message: string;
    isDeletion: boolean;
    spkToDelete: SPKItem | null;
};


// --- HELPER FUNCTIONS ---

const getStatusColor = (status: string, isForCard = false) => {
    const normalizedStatus = status === "Dalam Proses" ? "Proses" : status === "Pending" ? "Menunggu" : status;

    if (isForCard) {
        switch (normalizedStatus) {
            case "Selesai": return "bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-800";
            case "Proses": return "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-800";
            case "Menunggu": return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-800";
            case "Total": return "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-800";
            default: return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-gray-800";
        }
    }

    switch (normalizedStatus) {
        case "Selesai": return "bg-green-100 text-green-700 border-green-200";
        case "Proses": return "bg-yellow-100 text-yellow-700 border-yellow-200";
        case "Menunggu": return "bg-blue-100 text-blue-700 border-blue-200";
        default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
};

// --- CUSTOM COMPONENTS ---

const ToastBox = ({ toast, setToast }: { toast: ToastMessage, setToast: React.Dispatch<React.SetStateAction<ToastMessage>> }) =>
    toast.show && (
        <div
            className={`fixed top-5 right-5 px-5 py-3 rounded-xl shadow-2xl text-white text-sm z-[70] transition-opacity duration-300 flex items-center gap-3 max-w-sm ${
                toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
        >
            {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
            <span className="font-semibold">{toast.type === 'success' ? 'Sukses!' : 'Gagal!'}</span>
            <p className="flex-1">{toast.message}</p>
            <button onClick={() => setToast(prev => ({...prev, show: false}))} className="text-white ml-2 opacity-80 hover:opacity-100">
                <X size={16} />
            </button>
        </div>
    );

const AccessDeniedUI = ({ missingPermission }: { missingPermission: string }) => {
    const router = useRouter();
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
                    Silakan hubungi administrator sistem untuk mendapatkan izin yang diperlukan.
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

const StatsCard = ({ title, count, color, icon }: { title: string, count: number, color: string, icon: React.ReactNode }) => (
    <div className={`${color} rounded-xl p-4 border shadow-sm`}>
        <div className="flex items-center justify-between">
            <div>
                <p className="text-xs font-medium opacity-80">{title}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
            </div>
            <div className="p-2 rounded-md bg-white/50">
                {icon}
            </div>
        </div>
    </div>
);


// --- MAIN COMPONENT ---
export default function RiwayatSPKPage() {
    const router = useRouter();

    // --- STATE MANAGEMENT ---
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [spks, setSpks] = useState<SPKItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [error, setError] = useState<string | null>(null);

    // --- LOADING DELETE ---
    const [deleting, setDeleting] = useState(false);
    const isActionInProgress = deleting;

    // --- TOAST NOTIF ---
    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(
            () => setToast(prev => ({...prev, show: false})),
            4000
        );
    }, []);

    // --- MODAL STATE ----
    const [modal, setModal] = useState<ModalState>({
        isOpen: false,
        message: "",
        isDeletion: false,
        spkToDelete: null,
    });

    const closeModal = () => {
        setModal({
            isOpen: false,
            message: "",
            isDeletion: false,
            spkToDelete: null,
        });
    };
    
    // --- UTILITY CALLBACKS ---
    const hasPermission = useCallback((permissionName: string): boolean => {
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

    // --- EFFECT: Load Permissions & User Data dari Local Storage ---
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

    const handleView = (spk: SPKItem) => {
        if (!hasPermission(VIEW_DETAIL_PERMISSION)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${VIEW_DETAIL_PERMISSION}) untuk melihat detail SPK.`, "error");
            return;
        }
         router.push(`/dashboard/spk/view?uuid=${spk.uuid}`); 
    }
    
    const handleEdit = (spk: SPKItem) => {
        if (!hasPermission(EDIT_PERMISSION)) { 
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${EDIT_PERMISSION}) untuk mengedit SPK.`, "error");
            return;
        }
        router.push(`/dashboard/spk/format?uuid=${spk.uuid}`); 
    }

    const handleDelete = (spk: SPKItem) => {
        if (!hasPermission(DELETE_PERMISSION)) { 
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${DELETE_PERMISSION}) untuk menghapus SPK.`, "error");
            return;
        }
        setModal({
            isOpen: true,
            message: `Apakah Anda yakin ingin menghapus SPK ${spk.nomor}? Aksi ini tidak dapat dibatalkan.`,
            isDeletion: true,
            spkToDelete: spk,
        });
    };

    // --- DELETE DENGAN LOADING + TOAST ---
    const confirmDeletion = async () => {
        if (!modal.spkToDelete || !hasPermission(DELETE_PERMISSION)) {
            closeModal();
            showToast("Akses Ditolak atau data SPK hilang.", "error");
            return;
        }

        setDeleting(true);
        const uuid = modal.spkToDelete.uuid;
        const nomor = modal.spkToDelete.nomor;

        const token = localStorage.getItem("token"); 

        try {
            if (!token) throw new Error("Token tidak ditemukan. Silakan login ulang.");
            
            const res = await fetch(`${DELETE_API_SPK_URL_LOCAL}/${uuid}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || "Gagal menghapus SPK");
            }

            await new Promise((r) => setTimeout(r, 600)); 

            closeModal();
            setSpks(prev => prev.filter((item) => item.uuid !== uuid));
            showToast(`SPK ${nomor} berhasil dihapus!`, "success");

        } catch (err: any) {
            closeModal();
            showToast(`Gagal menghapus: ${err.message}`, "error");
        } finally {
            setDeleting(false);
        }
    };

    // ---- FETCH DATA LIST SPK (DENGAN CEK PERMISSION HALAMAN UTAMA) ----
    const fetchData = useCallback(async () => {
        if (!permissionsLoaded) return; 
        
        if (!hasPermission(RIWAYAT_PERMISSION)) {
            setError(`Akses Ditolak: Anda tidak memiliki izin (${RIWAYAT_PERMISSION}) untuk melihat riwayat SPK.`);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token"); 
        const userDataString = localStorage.getItem("user_data");
        let npp = null;
        
        if (userDataString) {
            try {
                const userData = JSON.parse(userDataString);
                npp = userData.npp;
            } catch (e) {
                setError("Format data pengguna (user_data) rusak. Silakan login ulang.");
                setLoading(false);
                return;
            }
        }
        
        if (!token) {
            setError("Token tidak ditemukan. Silakan login.");
            setLoading(false);
            return;
        }

        if (!npp) {
            setError("NPP pengguna tidak ditemukan. Silakan login ulang atau hubungi admin.");
            setLoading(false);
            return;
        }
        
        const DYNAMIC_API_URL = `${RIWAYAT_SPK_STAFF_BASE_URL}`;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const res = await fetch(DYNAMIC_API_URL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-store",
                    },
                });
                
                if (!res.ok) {
                    let errorMessage = `Gagal memuat data (Status ${res.status})`;
                    if (res.status === 404) {
                        setSpks([]); 
                        setLoading(false);
                        return; 
                    } else if (res.status === 401) {
                         errorMessage = "Sesi berakhir. Silakan login ulang."; 
                    }
                    throw new Error(errorMessage);
                }

                const result = await res.json();

                const rawData = Array.isArray(result.data) ? result.data : [];
                if (rawData.length === 0) {
                     setSpks([]);
                     setLoading(false);
                     return;
                }

                const mapped: SPKItem[] = rawData.map((item: any) => ({
                    id: item.id,
                    nomor: (item.no_surat || item.uuid_pengajuan)?.toString() || "N/A",
                    pekerjaan: (item.uraian_pekerjaan || item.jenis_pekerjaan || "Tidak ada Keterangan").toString(), 
                    tanggal: item.tanggal || "-",
                    status:
                        item.status === "pending" ? "Menunggu" : 
                        item.status === "completed" || item.status === "finished" ? "Selesai" : 
                        item.status === "assigned" || item.status === "in_progress" ? "Proses" : 
                        item.status || "Tidak Diketahui",
                    uuid: item.uuid_pengajuan?.toString() || item.id.toString(),
                    namaPetugas: item.penanggung_jawab_name || "-", 
                }));

                setSpks(mapped.filter((i) => i.uuid)); 
                setLoading(false);
                return;
            } catch (err: any) {
                if (i === MAX_RETRIES - 1) {
                    setError(err.message); 
                    setLoading(false);
                }
                await new Promise((r) => setTimeout(r, 500)); 
            }
        }
    }, [permissionsLoaded, hasPermission]);


    useEffect(() => {
        if (permissionsLoaded) {
            fetchData();
        }
    }, [fetchData, permissionsLoaded]);

    // --- FILTER & SEARCHING ---
    const filteredData = spks.filter((item) => {
        const matchSearch =
            (item.nomor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.namaPetugas || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
            (item.pekerjaan || "").toLowerCase().includes(searchQuery.toLowerCase());

        const statusToCheck = item.status === "Dalam Proses" ? "Proses" : item.status; 

        const matchFilter = filterStatus === "Semua" || statusToCheck === filterStatus || (filterStatus === "Proses" && statusToCheck === "Proses") || (filterStatus === "Menunggu" && statusToCheck === "Menunggu");

        return matchSearch && matchFilter;
    });

    // --- COUNT STATS ---
    const statusCount: StatusCount = {
        total: spks.length,
        selesai: spks.filter((d) => d.status === "Selesai").length,
        proses: spks.filter((d) => d.status === "Proses" || d.status === "Dalam Proses").length,
        menunggu: spks.filter((d) => d.status === "Menunggu" || d.status === "Pending").length,
    };
    
    // ---- CUSTOM MODAL ----
    const CustomModal = () =>
        modal.isOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl transform transition-all duration-300 scale-100">
                    <div className="flex justify-between items-start mb-4 border-b pb-3">
                        <h3 className="font-bold text-red-600 flex items-center gap-2">
                            <AlertTriangle size={20} /> Konfirmasi Penghapusan
                        </h3>
                        <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 p-1 rounded-full">
                            <X size={18} />
                        </button>
                    </div>

                    <p className="text-sm mb-6 text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: modal.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={closeModal}
                            disabled={deleting}
                            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>

                        <button
                            onClick={confirmDeletion}
                            disabled={deleting}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700 transition-colors disabled:bg-red-400"
                        >
                            {deleting && (
                                <Loader2
                                    className="animate-spin"
                                    size={16}
                                />
                            )}
                            {deleting ? "Menghapus..." : "Ya, Hapus Permanen"}
                        </button>
                    </div>
                </div>
            </div>
        );

    // Overlay untuk proses deleting
    const DeletingOverlay = () =>
        deleting && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60]">
                <div className="bg-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3">
                    <Loader2 className="animate-spin text-red-600" size={24} />
                    <span className="text-lg font-semibold text-gray-800">Sedang memproses penghapusan...</span>
                </div>
            </div>
        );

    const canViewDetail = hasPermission(VIEW_DETAIL_PERMISSION);
    const canEdit = hasPermission(EDIT_PERMISSION);
    const canDelete = hasPermission(DELETE_PERMISSION);
    
    // --- RENDER PERMISSION & LOADING CHECKS ---
    if (!permissionsLoaded) { 
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat izin pengguna...</span>
            </div>
        );
    }

    // 🛑 KONDISI: AKSES DITOLAK UNTUK HALAMAN UTAMA (Menggunakan Komponen Ekstrak)
    if (!hasPermission(RIWAYAT_PERMISSION)) { 
        return <AccessDeniedUI missingPermission={RIWAYAT_PERMISSION} />;
    }
    
    // --- RENDER UTAMA ---
    return (
        <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">
            <ToastBox toast={toast} setToast={setToast} />
            <CustomModal />
            <DeletingOverlay />

            <div className="bg-white rounded-xl shadow-lg p-5 border border-blue-100">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600/10 p-4 rounded-xl">
                            <History className="text-blue-600" size={28} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Riwayat SPK Staf</h2>
                            <p className="text-gray-600 text-sm">
                                Pantau dan kelola riwayat Surat Perintah Kerja yang ditugaskan kepada Anda.
                            </p>
                        </div>
                    </div>
                </div>
                <hr className="my-4 border-gray-200"/>

                {/* Search & Filter */}
                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[250px] relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={16}
                        />
                        <input
                            type="text"
                            placeholder="Cari nomor SPK, petugas, atau pekerjaan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 transition-all text-gray-800"
                        />
                    </div>

                    <div className="relative">
                        <Filter
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                            size={16}
                        />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-10 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700 appearance-none cursor-pointer shadow-sm"
                        >
                            <option value="Semua">Semua Status</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Proses">Dalam Proses</option>
                            <option value="Menunggu">Pending/Menunggu</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatsCard 
                    title="Total SPK" 
                    count={statusCount.total} 
                    color={getStatusColor("Total", true)} 
                    icon={<BarChart className="text-purple-700" size={20} />} 
                />
                <StatsCard 
                    title="Selesai" 
                    count={statusCount.selesai} 
                    color={getStatusColor("Selesai", true)} 
                    icon={<Calendar className="text-green-700" size={20} />} 
                />
                <StatsCard 
                    title="Dalam Proses" 
                    count={statusCount.proses} 
                    color={getStatusColor("Proses", true)} 
                    icon={<Calendar className="text-yellow-700" size={20} />} 
                />
                <StatsCard 
                    title="Pending/Menunggu" 
                    count={statusCount.menunggu} 
                    color={getStatusColor("Menunggu", true)} 
                    icon={<Calendar className="text-blue-700" size={20} />} 
                />
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {/* --- KONDISI 1: LOADING --- */}
                {loading ? (
                    <div className="py-12 text-center">
                        <Loader2 className="mx-auto animate-spin text-blue-600 mb-3" size={32} />
                        <p className="text-gray-700 text-base font-medium">Memuat data Surat Perintah Kerja...</p>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center bg-red-50/50">
                        <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
                        <p className="text-red-700 text-base font-medium">
                            Error Memuat Data: {error}
                        </p>
                        <p className="text-red-600/80 text-sm mt-1">
                            Silakan periksa koneksi Anda atau coba *refresh* halaman.
                        </p>
                    </div>
                ) : filteredData.length === 0 && spks.length === 0 ? (
                    <div className="py-12 text-center">
                        <History className="text-gray-400 mx-auto mb-3" size={40} />
                        <p className="text-gray-700 text-base font-medium">
                            Anda belum memiliki riwayat SPK yang ditugaskan.
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            Riwayat SPK yang ditugaskan kepada Anda akan muncul di sini.
                        </p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-12 text-center">
                        <Search className="text-gray-400 mx-auto mb-3" size={32} />
                        <p className="text-gray-700 text-base font-medium">
                            Tidak ada SPK yang cocok dengan kriteria pencarian.
                        </p>
                        <p className="text-gray-500 text-sm mt-1">
                            Coba ubah filter status atau kata kunci pencarian Anda.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <h3 className="text-base font-semibold text-gray-900">Daftar SPK ({filteredData.length} Data)</h3>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {[
                                            "No", "Tanggal", "Nomor SPK", "Petugas", "Jenis Pekerjaan", "Status", "Aksi"
                                        ].map((title) => (
                                            <th
                                                key={title}
                                                className="px-4 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap"
                                            >
                                                {title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredData.map((item, index) => (
                                        <tr key={item.uuid} className="hover:bg-blue-50/50 transition-colors">
                                            <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{index + 1}</td>
                                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{item.tanggal}</td>
                                            <td className="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap">{item.nomor}</td>
                                            <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{item.namaPetugas}</td>
                                            <td className="px-4 py-3 text-xs text-gray-700 max-w-sm truncate">{item.pekerjaan}</td>
                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusColor(
                                                        item.status
                                                    )} whitespace-nowrap`}
                                                >
                                                    {item.status === "Proses" ? "DALAM PROSES" : item.status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2 items-center">
                                                    {/* VIEW */}
                                                    <button
                                                        onClick={() => handleView(item)}
                                                        disabled={isActionInProgress || !canViewDetail}
                                                        title={!canViewDetail ? `Akses Ditolak: ${VIEW_DETAIL_PERMISSION}` : "Lihat Detail"}
                                                        className={`p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    
                                                    {item.status !== "Selesai" && (
                                                        <>
                                                            {/* EDIT */}
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                disabled={isActionInProgress || !canEdit}
                                                                title={!canEdit ? `Akses Ditolak: ${EDIT_PERMISSION}` : "Edit SPK"}
                                                                className={`p-1.5 text-yellow-600 hover:bg-yellow-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                <Pencil size={16} />
                                                            </button>
                                                            
                                                            {/* DELETE */}
                                                            <button
                                                                onClick={() => handleDelete(item)}
                                                                disabled={isActionInProgress || !canDelete}
                                                                title={!canDelete ? `Akses Ditolak: ${DELETE_PERMISSION}` : "Hapus SPK"}
                                                                className={`p-1.5 text-red-600 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}