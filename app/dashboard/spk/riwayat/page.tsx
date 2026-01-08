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
    Copy,
    MapPin,
    CheckCircle
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
    status: string; 
    uuid: string;
    namaPetugas?: string; 
};

type StatusCount = {
    total: number;
    selesai: number;
    proses: number;
    menunggu: number;
    tidakSelesai: number;
    belumSelesai: number;
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
    const lowerStatus = (status || "").toLowerCase();

    if (isForCard) {
        if (lowerStatus === "selesai") return "bg-gradient-to-br from-green-50 to-green-100 border-green-200 text-green-900"; // Text darkened
        if (lowerStatus.includes("proses") || lowerStatus === "assigned") return "bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200 text-yellow-900";
        if (lowerStatus === "menunggu" || lowerStatus === "pending") return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 text-blue-900";
        if (lowerStatus === "tidak selesai") return "bg-gradient-to-br from-red-50 to-red-100 border-red-200 text-red-900";
        if (lowerStatus === "belum selesai") return "bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 text-orange-900";
        if (lowerStatus === "total") return "bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 text-purple-900";
        return "bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 text-black";
    }

    // Untuk Label di Tabel
    if (lowerStatus === "selesai") return "bg-green-100 text-green-800 border-green-200";
    if (lowerStatus.includes("proses")) return "bg-yellow-100 text-yellow-800 border-yellow-200";
    if (lowerStatus === "menunggu" || lowerStatus === "pending") return "bg-blue-100 text-blue-800 border-blue-200";
    if (lowerStatus === "tidak selesai") return "bg-red-100 text-red-800 border-red-200";
    if (lowerStatus === "belum selesai") return "bg-orange-100 text-orange-800 border-orange-200";
    
    return "bg-gray-100 text-black border-gray-200";
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
                <h1 className="text-3xl font-bold text-black mb-3">Akses Ditolak</h1>
                <p className="text-black mb-6 leading-relaxed">
                    Maaf, Anda tidak memiliki izin yang cukup untuk mengakses halaman ini.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-black mb-1">Izin yang Diperlukan:</p>
                    <code className="block bg-white px-3 py-2 rounded border border-red-200 text-red-600 font-mono text-sm">
                        {missingPermission}
                    </code>
                </div>
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
                <p className="text-xs font-bold text-black opacity-90">{title}</p>
                <p className="text-2xl font-bold mt-1 text-black">{count}</p>
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

    const [deleting, setDeleting] = useState(false);
    const isActionInProgress = deleting;

    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({...prev, show: false})), 4000);
    }, []);

    const [modal, setModal] = useState<ModalState>({
        isOpen: false,
        message: "",
        isDeletion: false,
        spkToDelete: null,
    });

    const closeModal = () => {
        setModal({ isOpen: false, message: "", isDeletion: false, spkToDelete: null });
    };
    
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
                    setUserPermissions([]);
                }
            }
            setPermissionsLoaded(true);
        }
    }, []);

    const handleView = (spk: SPKItem) => {
        if (!hasPermission(VIEW_DETAIL_PERMISSION)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${VIEW_DETAIL_PERMISSION})`, "error");
            return;
        }
         router.push(`/dashboard/spk/view?uuid=${spk.uuid}`); 
    }
    
    const handleEdit = (spk: SPKItem) => {
        if (!hasPermission(EDIT_PERMISSION)) { 
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${EDIT_PERMISSION})`, "error");
            return;
        }
        router.push(`/dashboard/spk/format?uuid=${spk.uuid}`); 
    }

    const handleDelete = (spk: SPKItem) => {
        if (!hasPermission(DELETE_PERMISSION)) { 
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${DELETE_PERMISSION})`, "error");
            return;
        }
        setModal({
            isOpen: true,
            message: `Apakah Anda yakin ingin menghapus SPK ${spk.nomor}?`,
            isDeletion: true,
            spkToDelete: spk,
        });
    };

    // --- FUNGSI COPY & TRACKING ---
    const handleCopy = (text: string) => {
        if (!text || text === "N/A") return;
        navigator.clipboard.writeText(text);
        showToast("Nomor Surat berhasil disalin!", "success");
    };

    const handleTracking = (uuid: string) => {
        if (!uuid) return;
        window.open(`/tracking/${uuid}`, '_blank');
    };

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
            if (!token) throw new Error("Token tidak ditemukan.");
            
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

    // ---- FETCH DATA ----
    const fetchData = useCallback(async () => {
        if (!permissionsLoaded) return; 
        
        if (!hasPermission(RIWAYAT_PERMISSION)) {
            setError(`Akses Ditolak: (${RIWAYAT_PERMISSION})`);
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token"); 
        
        if (!token) {
            setError("Token tidak ditemukan.");
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
                    if (res.status === 404) {
                        setSpks([]); 
                        setLoading(false);
                        return; 
                    } 
                    throw new Error(`Gagal memuat data (Status ${res.status})`);
                }

                const result = await res.json();
                const rawData = Array.isArray(result.data) ? result.data : [];

                // --- MAPPING DATA ---
                const mapped: SPKItem[] = rawData.map((item: any) => {
                    const statusName = (typeof item.status === 'object' && item.status !== null) 
                                        ? item.status.name 
                                        : item.status; 
                    
                    return {
                        id: item.id,
                        nomor: (item.no_surat || item.uuid_pengajuan)?.toString() || "N/A",
                        pekerjaan: (item.uraian_pekerjaan || item.jenis_pekerjaan?.nama_pekerjaan || "Tidak ada Keterangan").toString(), 
                        tanggal: item.tanggal || "-",
                        status: statusName || "Pending",
                        uuid: item.uuid_pengajuan?.toString() || item.id.toString(),
                        namaPetugas: item.penanggung_jawab_name || "-", 
                    };
                });

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
        if (permissionsLoaded) fetchData();
    }, [fetchData, permissionsLoaded]);

    // --- FILTER & SEARCHING ---
    const filteredData = spks.filter((item) => {
        const matchSearch =
            (item.nomor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.namaPetugas || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
            (item.pekerjaan || "").toLowerCase().includes(searchQuery.toLowerCase());

        const itemStatusLower = (item.status || "").toLowerCase();
        
        let matchFilter = false;
        if (filterStatus === "Semua") {
            matchFilter = true;
        } else if (filterStatus === "Proses") {
            matchFilter = itemStatusLower.includes("proses") || itemStatusLower === "assigned";
        } else if (filterStatus === "Menunggu") {
            matchFilter = itemStatusLower === "menunggu" || itemStatusLower === "pending";
        } else {
            matchFilter = itemStatusLower === filterStatus.toLowerCase();
        }

        return matchSearch && matchFilter;
    });

    // --- COUNT STATS ---
    const statusCount: StatusCount = {
        total: spks.length,
        selesai: spks.filter((d) => d.status.toLowerCase() === "selesai").length,
        proses: spks.filter((d) => d.status.toLowerCase().includes("proses")).length,
        menunggu: spks.filter((d) => d.status.toLowerCase() === "menunggu" || d.status.toLowerCase() === "pending").length,
        tidakSelesai: spks.filter((d) => d.status.toLowerCase() === "tidak selesai").length,
        belumSelesai: spks.filter((d) => d.status.toLowerCase() === "belum selesai").length,
    };
    
    // ---- CUSTOM MODAL ----
    const CustomModal = () =>
        modal.isOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl transform transition-all duration-300 scale-100">
                    <div className="flex justify-between items-start mb-4 border-b pb-3">
                        <h3 className="font-bold text-red-600 flex items-center gap-2">
                            <AlertTriangle size={20} /> Konfirmasi Hapus
                        </h3>
                        <button onClick={closeModal} className="text-black hover:text-gray-800 p-1 rounded-full">
                            <X size={18} />
                        </button>
                    </div>
                    <p className="text-sm mb-6 text-black leading-relaxed" dangerouslySetInnerHTML={{ __html: modal.message }} />
                    <div className="flex justify-end gap-3">
                        <button onClick={closeModal} disabled={deleting} className="px-4 py-2 text-sm bg-gray-200 text-black rounded-lg hover:bg-gray-300">Batal</button>
                        <button onClick={confirmDeletion} disabled={deleting} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg flex items-center gap-2 hover:bg-red-700">
                            {deleting && <Loader2 className="animate-spin" size={16} />}
                            {deleting ? "Menghapus..." : "Ya, Hapus"}
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
                    <span className="text-lg font-semibold text-black">Memproses...</span>
                </div>
            </div>
        );

    const canViewDetail = hasPermission(VIEW_DETAIL_PERMISSION);
    const canEdit = hasPermission(EDIT_PERMISSION);
    const canDelete = hasPermission(DELETE_PERMISSION);
    
    if (!permissionsLoaded) { 
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
            </div>
        );
    }

    if (!hasPermission(RIWAYAT_PERMISSION)) { 
        return <AccessDeniedUI missingPermission={RIWAYAT_PERMISSION} />;
    }
    
    return (
        <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">
            <ToastBox toast={toast} setToast={setToast} />
            <CustomModal />
            <DeletingOverlay />

            <div className="bg-white rounded-xl shadow-lg p-5 border border-blue-100">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600/10 p-4 rounded-xl">
                        <History className="text-blue-600" size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-black">Riwayat SPK Staf</h2>
                        <p className="text-black text-sm">Kelola riwayat Surat Perintah Kerja.</p>
                    </div>
                </div>
                <hr className="my-4 border-gray-200"/>

                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[250px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} />
                        <input
                            type="text"
                            placeholder="Cari SPK..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:ring-blue-500 transition-all text-black"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={16} />
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="pl-10 pr-8 py-2.5 text-sm border border-gray-300 rounded-xl bg-white cursor-pointer text-black"
                        >
                            <option value="Semua">Semua Status</option>
                            <option value="Selesai">Selesai</option>
                            <option value="Tidak Selesai">Tidak Selesai</option>
                            <option value="Belum Selesai">Belum Selesai</option>
                            <option value="Proses">Dalam Proses</option>
                            <option value="Menunggu">Pending/Menunggu</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <StatsCard title="Total" count={statusCount.total} color={getStatusColor("Total", true)} icon={<BarChart className="text-purple-900" size={20} />} />
                <StatsCard title="Selesai" count={statusCount.selesai} color={getStatusColor("Selesai", true)} icon={<Calendar className="text-green-900" size={20} />} />
                <StatsCard title="Tdk Selesai" count={statusCount.tidakSelesai} color={getStatusColor("Tidak Selesai", true)} icon={<AlertTriangle className="text-red-900" size={20} />} />
                <StatsCard title="Blm Selesai" count={statusCount.belumSelesai} color={getStatusColor("Belum Selesai", true)} icon={<Calendar className="text-orange-900" size={20} />} />
                <StatsCard title="Proses" count={statusCount.proses} color={getStatusColor("Proses", true)} icon={<Calendar className="text-yellow-900" size={20} />} />
                <StatsCard title="Menunggu" count={statusCount.menunggu} color={getStatusColor("Menunggu", true)} icon={<Calendar className="text-blue-900" size={20} />} />
            </div>

            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="py-12 text-center">
                        <Loader2 className="mx-auto animate-spin text-blue-600 mb-3" size={32} />
                        <p className="text-black">Memuat data...</p>
                    </div>
                ) : error ? (
                    <div className="py-12 text-center bg-red-50/50">
                        <p className="text-red-700 font-medium">Error: {error}</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="py-12 text-center">
                        <p className="text-black">Data tidak ditemukan.</p>
                    </div>
                ) : (
                    <>
                        <div className="p-4 border-b bg-gray-50"><h3 className="font-semibold text-black">Data SPK ({filteredData.length})</h3></div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        {["No", "Tanggal", "Nomor Surat", "Petugas", "Pekerjaan", "Status", "Aksi"].map((t) => (
                                            <th key={t} className="px-4 py-3 text-left text-xs font-bold text-black uppercase">{t}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredData.map((item, index) => (
                                        <tr key={item.uuid} className="hover:bg-blue-50/50">
                                            <td className="px-4 py-3 text-xs text-black">{index + 1}</td>
                                            <td className="px-4 py-3 text-xs text-black">{item.tanggal}</td>
                                            
                                            <td className="px-4 py-3 text-xs font-semibold text-blue-700 whitespace-nowrap">
                                                <div className="flex items-center gap-2">
                                                    <span>{item.nomor}</span>
                                                    {item.nomor !== "N/A" && (
                                                        <>
                                                            <button 
                                                                onClick={() => handleCopy(item.nomor)} 
                                                                className="text-black hover:text-blue-600 p-1 rounded hover:bg-gray-100"
                                                                title="Salin No Surat"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleTracking(item.uuid)} 
                                                                className="text-black hover:text-orange-600 p-1 rounded hover:bg-orange-50"
                                                                title="Tracking SPK"
                                                            >
                                                                <MapPin size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="px-4 py-3 text-xs text-black">{item.namaPetugas}</td>
                                            <td className="px-4 py-3 text-xs text-black max-w-sm truncate">{item.pekerjaan}</td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex px-2.5 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                                                    {String(item.status).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 flex gap-2">
                                                <button onClick={() => handleView(item)} disabled={!canViewDetail} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50"><Eye size={16} /></button>
                                                <button onClick={() => handleEdit(item)} disabled={!canEdit} className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded disabled:opacity-50"><Pencil size={16} /></button>
                                                <button onClick={() => handleDelete(item)} disabled={!canDelete} className="p-1.5 text-red-600 hover:bg-red-100 rounded disabled:opacity-50"><Trash2 size={16} /></button>
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