"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

const DELETE_API_SPK_URL_LOCAL = "/api/spk/delete/"; 
const RIWAYAT_SPK_STAFF_BASE_URL = "/api/spk/riwayat-staff"; 

const MAX_RETRIES = 1;

type SPKItem = {
    id: number; 
    nomor: string; 
    pekerjaan: string; 
    tanggal: string; 
    status: "Selesai" | "Proses" | "Menunggu" | string;
    uuid: string;
    namaPetugas?: string; 
};

export default function RiwayatSPKPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [spks, setSpks] = useState<SPKItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [error, setError] = useState<string | null>(null);

    // --- LOADING DELETE ---
    const [deleting, setDeleting] = useState(false);

    // --- TOAST NOTIF ---
    const [toast, setToast] = useState<{
        show: boolean;
        message: string;
        type: "success" | "error";
    }>({ show: false, message: "", type: "success" });

    const showToast = (message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(
            () => setToast({ show: false, message: "", type: "success" }),
            2500
        );
    };

    // --- MODAL STATE ----
    const [modal, setModal] = useState({
        isOpen: false,
        message: "",
        isDeletion: false,
        spkToDelete: null as SPKItem | null,
    });

    const closeModal = () => {
        setModal({
            isOpen: false,
            message: "",
            isDeletion: false,
            spkToDelete: null,
        });
    };

    // --- NAVIGASI Aksi ---
    const handleView = (spk: SPKItem) =>
        router.push(`/dashboard/spk/format?view=${spk.uuid}`); 
    const handleEdit = (spk: SPKItem) =>
        router.push(`/dashboard/spk/format?edit=${spk.uuid}`); 

    const handleDelete = (spk: SPKItem) => {
        setModal({
            isOpen: true,
            message: `Apakah Anda yakin ingin menghapus SPK ${spk.nomor}? Aksi ini tidak dapat dibatalkan.`,
            isDeletion: true,
            spkToDelete: spk,
        });
    };

    // --- DELETE DENGAN LOADING + TOAST ---
    const confirmDeletion = async () => {
        if (!modal.spkToDelete) return;

        setDeleting(true);
        const uuid = modal.spkToDelete.uuid;

        const token = localStorage.getItem("token"); 
        if (!token) {
            showToast("Token tidak ditemukan. Silakan login ulang.", "error");
            setDeleting(false);
            closeModal();
            return;
        }

        try {
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
            setSpks(spks.filter((item) => item.uuid !== uuid));
            showToast("SPK berhasil dihapus!", "success");

        } catch (err: any) {
            closeModal();
            showToast(`Gagal menghapus: ${err.message}`, "error");
        } finally {
            setDeleting(false);
            fetchData(); // Refresh data setelah penghapusan
        }
    };

    // ---- FETCH DATA LIST SPK (Diperbaiki untuk mengambil NPP dari user_data) ----
    const fetchData = async () => {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token"); 
        // 🚨 MEMBACA DAN MEMPARSE NPP DARI 'user_data' 
        const userDataString = localStorage.getItem("user_data");
        let npp = null;
        
        if (userDataString) {
            try {
                const userData = JSON.parse(userDataString);
                // Asumsi NPP ada di properti 'npp' di dalam objek user_data
                npp = userData.npp;
            } catch (e) {
                console.error("Gagal parse user_data:", e);
                setError("Format data pengguna (user_data) rusak. Silakan login ulang.");
                setLoading(false);
                return;
            }
        }
        // ------------------------------------

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
        
        // 🛠️ MENGGUNAKAN ENDPOINT RIWAYAT STAF DENGAN NPP
        const DYNAMIC_API_URL = `${RIWAYAT_SPK_STAFF_BASE_URL}/${npp}`;

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
                        errorMessage = "Anda belum memiliki riwayat pengajuan SPK sebagai Staf."; 
                    } else if (res.status === 401) {
                         errorMessage = "Sesi berakhir. Silakan login ulang."; 
                    }
                    throw new Error(errorMessage);
                }

                const result = await res.json();

                if (!result.success && res.status !== 404) { 
                    throw new Error(result.message || `Gagal memuat data`);
                }
                
                const rawData = Array.isArray(result.data) ? result.data : [];

                const mapped: SPKItem[] = rawData.map((item: any) => ({
                    id: item.id,
                    nomor: (item.no_surat || item.uuid_pengajuan)?.toString() || "N/A",
                    pekerjaan: (item.uraian_pekerjaan || item.jenis_pekerjaan || "Tidak ada data").toString(), 
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
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --- FILTER & SEARCHING (Disesuaikan dengan null check) ---
    const filteredData = spks.filter((item) => {
        const matchSearch =
            (item.nomor || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
            (item.namaPetugas || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
            (item.pekerjaan || "").toLowerCase().includes(searchQuery.toLowerCase());

        const statusToCheck = item.status === "Dalam Proses" ? "Proses" : item.status; 

        const matchFilter = filterStatus === "Semua" || statusToCheck === filterStatus || (filterStatus === "Dalam Proses" && statusToCheck === "Proses");

        return matchSearch && matchFilter;
    });

    // --- COUNT STATS ---
    const statusCount = {
        total: spks.length,
        selesai: spks.filter((d) => d.status === "Selesai").length,
        proses: spks.filter((d) => d.status === "Proses" || d.status === "Dalam Proses").length,
        menunggu: spks.filter((d) => d.status === "Menunggu" || d.status === "Pending").length,
    };

    // --- FUNGSI WARNA STATUS DI TABLE DAN CARD ---
    const getStatusColor = (status: string, isForCard = false) => {
        const normalizedStatus = status === "Dalam Proses" ? "Proses" : status === "Pending" ? "Menunggu" : status;

        if (isForCard) {
            switch (normalizedStatus) {
                case "Selesai":
                    return "bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200";
                case "Proses":
                    return "bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 border border-yellow-200";
                case "Menunggu":
                    return "bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200";
                case "Total":
                    return "bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200";
                default:
                    return "bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200";
            }
        }

        // Untuk Badge Status di Table
        switch (normalizedStatus) {
            case "Selesai":
                return "bg-green-100 text-green-700 border-green-200";
            case "Proses":
                return "bg-yellow-100 text-yellow-700 border-yellow-200";
            case "Menunggu":
                return "bg-blue-100 text-blue-700 border-blue-200";
            default:
                return "bg-gray-100 text-gray-700 border-gray-200";
        }
    };

    // ---- TOAST UI ----
    const ToastBox = () =>
        toast.show && (
            <div
                className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 animate-slide-in ${
                    toast.type === "success"
                        ? "bg-green-600"
                        : "bg-red-600"
                }`}
            >
                {toast.message}
            </div>
        );

    // ---- CUSTOM MODAL ----
    const CustomModal = () =>
        modal.isOpen && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-red-600">
                            Konfirmasi Penghapusan
                        </h3>
                        <button onClick={closeModal} className="text-black/60 hover:text-black">
                            <X size={20} />
                        </button>
                    </div>

                    <p className="text-sm mb-6 text-black">{modal.message}</p>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={closeModal}
                            className="px-3 py-2 text-sm bg-gray-200 text-black rounded-lg hover:bg-gray-300"
                        >
                            Batal
                        </button>

                        <button
                            onClick={confirmDeletion}
                            disabled={deleting}
                            className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
                        >
                            {deleting && (
                                <Loader2
                                    className="animate-spin"
                                    size={16}
                                />
                            )}
                            {deleting ? "Menghapus..." : "Ya, Hapus"}
                        </button>
                    </div>
                </div>
            </div>
        );

    // Overlay untuk proses deleting (opsional)
    const DeletingOverlay = () =>
        deleting && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
                <div className="bg-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3">
                    <Loader2 className="animate-spin text-red-600" size={20} />
                    <span className="text-sm font-semibold text-red-700">Menghapus data...</span>
                </div>
            </div>
        );


    // ---- UI Component ----
    return (
        <div className="space-y-4 p-4 md:p-6 bg-gray-50 min-h-screen">
            <ToastBox />
            <CustomModal />
            <DeletingOverlay />

            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-md p-5 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-3 rounded-lg">
                        <History className="text-blue-600" size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-black">Riwayat SPK Staff</h2>
                        <p className="text-black text-sm">
                            Pantau dan kelola riwayat Surat Perintah Kerja yang ditugaskan kepada Anda.
                        </p>
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="flex gap-3 flex-wrap items-center">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60"
                            size={16}
                        />
                        <input
                            type="text"
                            placeholder="Cari nomor SPK, petugas, atau pekerjaan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm border border-black/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black placeholder-black/60"
                        />
                    </div>

                    <div className="flex gap-3">
                        <div className="relative">
                            <Filter
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60"
                                size={16}
                            />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="pl-9 pr-7 py-2 text-sm border border-black/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-black appearance-none cursor-pointer"
                            >
                                <option value="Semua">Semua Status</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Proses">Dalam Proses</option>
                                <option value="Menunggu">Pending/Menunggu</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Card Total SPK */}
                <div className={getStatusColor("Total", true)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-black text-xs font-medium">Total SPK</p>
                            <p className="text-2xl font-bold text-black mt-1">{statusCount.total}</p>
                        </div>
                        <div className="bg-purple-200 p-2 rounded-md">
                            <History className="text-purple-700" size={20} />
                        </div>
                    </div>
                </div>

                {/* Card Selesai */}
                <div className={getStatusColor("Selesai", true)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-black text-xs font-medium">Selesai</p>
                            <p className="text-2xl font-bold text-black mt-1">
                                {statusCount.selesai}
                            </p>
                        </div>
                        <div className="bg-green-200 p-2 rounded-md">
                            <Calendar className="text-green-700" size={20} />
                        </div>
                    </div>
                </div>

                {/* Card Dalam Proses */}
                <div className={getStatusColor("Proses", true)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-black text-xs font-medium">Dalam Proses</p>
                            <p className="text-2xl font-bold text-black mt-1">
                                {statusCount.proses}
                            </p>
                        </div>
                        <div className="bg-yellow-200 p-2 rounded-md">
                            <Calendar className="text-yellow-700" size={20} />
                        </div>
                    </div>
                </div>

                {/* Card Pending/Menunggu */}
                <div className={getStatusColor("Menunggu", true)}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-black text-xs font-medium">Pending/Menunggu</p>
                            <p className="text-2xl font-bold text-black mt-1">
                                {statusCount.menunggu}
                            </p>
                        </div>
                        <div className="bg-blue-200 p-2 rounded-md">
                            <Calendar className="text-blue-700" size={20} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
                {/* --- KONDISI 1: LOADING --- */}
                {loading ? (
                    <div className="py-12 text-center">
                        <Loader2 className="mx-auto animate-spin text-blue-600 mb-3" size={32} />
                        <p className="text-black text-sm font-medium">Memuat data SPK...</p>
                    </div>
                ) : error ? (
                    // --- KONDISI 2: ERROR (Fetch Gagal/404/401) ---
                    <div className="py-12 text-center bg-red-50/50">
                        <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
                        <p className="text-red-700 text-sm font-medium">
                            {error}
                        </p>
                        <p className="text-red-600/80 text-xs mt-1">
                            {error.includes("login") || error.includes("data pengguna") ? "Pastikan Anda sudah login dan data tersimpan dengan benar." : "Silakan periksa konfigurasi API server atau API Route Handler."}
                        </p>
                    </div>
                ) : (
                    // --- KONDISI 3: SUKSES (Data Ada atau Data Kosong karena Search/Filter) ---
                    <>
                        <div className="p-4 border-b border-black/10 bg-gradient-to-r from-blue-50 to-white">
                            <h3 className="text-base font-bold text-black">Daftar Riwayat SPK</h3>
                            <p className="text-xs text-black mt-1">
                                Total {filteredData.length} SPK ditemukan
                            </p>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-gray-50 border-b border-black/10">
                                    <tr>
                                        {[
                                            "No",
                                            "Tanggal",
                                            "Nomor SPK",
                                            "Petugas",
                                            "Jenis Pekerjaan",
                                            "Status", 
                                            "Aksi",
                                        ].map((title) => (
                                            <th
                                                key={title}
                                                className="px-4 py-3 text-left text-[10px] font-bold text-black uppercase tracking-wider whitespace-nowrap"
                                            >
                                                {title}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/10">
                                    {filteredData.length === 0 ? (
                                        // --- Pesan Kosong ---
                                        <tr>
                                            <td colSpan={7} className="px-6 py-10 text-center">
                                                <div className="flex flex-col items-center gap-2">
                                                    {searchQuery.length > 0 || filterStatus !== "Semua" ? (
                                                         <Search className="text-black/40" size={32} />
                                                     ) : (
                                                         <History className="text-black/40" size={32} />
                                                     )}
                                                    
                                                    <p className="text-sm text-black font-medium">
                                                        {searchQuery.length > 0 || filterStatus !== "Semua" ? "Tidak ada data yang ditemukan" : "Anda belum memiliki riwayat SPK sebagai Staf."}
                                                    </p>
                                                    <p className="text-xs text-black/60">
                                                        {searchQuery.length > 0 || filterStatus !== "Semua" ? "Coba ubah filter atau kata kunci pencarian" : "Semua riwayat SPK yang ditugaskan kepada Anda akan muncul di sini."}
                                                    </p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        // Mapping data
                                        filteredData.map((item, index) => (
                                            <tr key={item.uuid + item.id} className="hover:bg-blue-50 transition-colors">
                                                <td className="px-4 py-3 text-xs font-semibold text-black whitespace-nowrap">{index + 1}</td>
                                                <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.tanggal}</td>
                                                <td className="px-4 py-3 text-xs font-medium text-blue-700 whitespace-nowrap">{item.nomor}</td>
                                                <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.namaPetugas}</td>
                                                <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.pekerjaan}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusColor(
                                                            item.status
                                                        )} whitespace-nowrap`}
                                                    >
                                                        {item.status === "Proses" ? "Dalam Proses" : item.status === "Menunggu" ? "Pending" : item.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        <button
                                                            onClick={() => handleView(item)}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition-colors"
                                                            title="Lihat Detail"
                                                        >
                                                            <Eye size={16} />
                                                        </button>
                                                        {/* Aksi Edit/Hapus hanya muncul jika status belum Selesai, opsional */}
                                                        {item.status !== "Selesai" && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleEdit(item)}
                                                                    className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded-md transition-colors"
                                                                    title="Edit SPK"
                                                                >
                                                                    <Pencil size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDelete(item)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-100 rounded-md transition-colors"
                                                                    title="Hapus SPK"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}