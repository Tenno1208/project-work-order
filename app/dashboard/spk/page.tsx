"use client";

import React, { useEffect, useState } from "react";
import {
    FileText,
    Search,
    Loader2,
    Calendar,
    Filter,
    Pencil,
    Trash2,
    Eye,
    Plus,
    X,
    AlertTriangle,
} from "lucide-react";
import { useRouter } from "next/navigation";

// --- KONSTANTA API ---
const GET_API_SPK_URL_LOCAL = "/api/spk/list";
const DELETE_API_SPK_URL_LOCAL = "/api/spk/delete/";

const MAX_RETRIES = 3;

// --- TYPES SESUAI API ---
type SPKItem = {
    id: number;
    nomor: string; 
    pekerjaan: string;
    tanggal: string;
    status: "Selesai" | "Proses" | "Menunggu" | string;
    uuid: string; 
    namaPetugas?: string; 
};

export default function DaftarSPKPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [spks, setSpks] = useState<SPKItem[]>([]);
    const [search, setSearch] = useState("");
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
    const handleAdd = () => router.push("/dashboard/spk/format");
    const handleView = (spk: SPKItem) =>
        router.push(`/dashboard/spk/format?view=${spk.uuid}`);
    const handleEdit = (spk: SPKItem) =>
        router.push(`/dashboard/spk/format?edit=${spk.uuid}`);

    const handleDelete = (spk: SPKItem) => {
        setModal({
            isOpen: true,
            message: `Apakah Anda yakin ingin menghapus SPK ${spk.nomor}?`,
            isDeletion: true,
            spkToDelete: spk,
        });
    };

    // --- DELETE WITH LOADING + TOAST ---
    const confirmDeletion = async () => {
        if (!modal.spkToDelete) return;

        setDeleting(true); 
        const uuid = modal.spkToDelete.uuid;

        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Token tidak ditemukan. Silakan login ulang.", "error");
            setDeleting(false);
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

            // ANIMASI MUNCUL BEBERAPA MILIDETIK
            await new Promise((r) => setTimeout(r, 600));

            closeModal();
            setSpks(spks.filter((item) => item.uuid !== uuid));
            showToast("SPK berhasil dihapus!", "success");

        } catch (err: any) {
            closeModal();
            showToast(`Gagal menghapus: ${err.message}`, "error");
        } finally {
            setDeleting(false);
            fetchData();
        }
    };


    // ---- FETCH DATA LIST SPK (MAPPING DIPERBAIKI) ----
    const fetchData = async () => {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setError("Token tidak ditemukan.");
            setLoading(false);
            return;
        }

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const res = await fetch(GET_API_SPK_URL_LOCAL, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Cache-Control": "no-store",
                    },
                });

                const result = await res.json();

                if (!res.ok || !result.success) {
                    throw new Error(result.message || `Gagal memuat data`);
                }

                // --- MAPPING BARU DENGAN FIELD API YANG BENAR ---
                const mapped: SPKItem[] = result.data.map((item: any) => {
                    const statusText = item.status === "pending"
                        ? "Menunggu"
                        : item.status === "completed"
                        ? "Selesai"
                        : item.status === "assigned" || item.status === "in_progress"
                        ? "Proses"
                        : item.status || "Tidak Diketahui";

                    const uuidIdentifier = item.uuid_pengajuan || item.id;
                    
                    return {
                        id: item.id,
                        nomor: item.no_surat || item.uuid_pengajuan || item.id?.toString() || "N/A", // Nomor SPK
                        pekerjaan: item.uraian_pekerjaan || item.jenis_pekerjaan || "Tidak ada data",
                        tanggal: item.tanggal || "-",
                        status: statusText,
                        uuid: uuidIdentifier.toString(), // ID unik untuk aksi CRUD
                        namaPetugas: item.penanggung_jawab_name || "-", // Nama Petugas
                    };
                }).filter((i: SPKItem) => i.uuid && i.uuid !== 'N/A'); // Filter yang lebih aman

                setSpks(mapped);
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

    // --- FILTER ---
    const filteredSpk = spks.filter((item) => {
        // Safe check untuk item.nomor dan item.pekerjaan (mencegah error .toLowerCase() pada null/number)
        const itemNomor = String(item.nomor || "").toLowerCase();
        const itemPekerjaan = String(item.pekerjaan || "").toLowerCase();
        const searchLower = search.toLowerCase();

        const matchSearch =
            itemNomor.includes(searchLower) ||
            itemPekerjaan.includes(searchLower);

        const matchStatus =
            filterStatus === "Semua" || item.status === filterStatus;

        return matchSearch && matchStatus;
    });

    const statusCount = {
        semua: spks.length,
        selesai: spks.filter((s) => s.status === "Selesai").length,
        proses: spks.filter((s) => s.status === "Proses").length,
        menunggu: spks.filter((s) => s.status === "Menunggu").length,
    };

    // --- FUNGSI WARNA CARD STATUS ---
const getStatusColor = (status: string) => {
    switch (status) {
        case "Selesai":
            return "bg-gradient-to-r from-green-500 to-green-600";
        case "Proses":
            return "bg-gradient-to-r from-yellow-500 to-orange-500";
        case "Menunggu":
            return "bg-gradient-to-r from-blue-400 to-blue-500";
        case "Semua":
            return "bg-gradient-to-r from-slate-500 to-slate-600";
        default:
            return "bg-gradient-to-r from-gray-400 to-gray-500";
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
        modal.isOpen ? (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                    <div className="flex justify-between mb-4">
                        <h3 className="font-bold text-red-600">
                            Konfirmasi Penghapusan
                        </h3>
                        <button onClick={closeModal}>
                            <X />
                        </button>
                    </div>

                    <p className="text-sm mb-6 text-black">{modal.message}</p>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={closeModal}
                            className="px-3 py-2 text-sm bg-gray-200 rounded-lg"
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
        ) : null;

        const DeletingOverlay = () =>
    deleting && (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60]">
        <div className="bg-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3">
            <Loader2 className="animate-spin text-red-600" size={20} />
            <span className="text-sm font-semibold text-red-700">Menghapus data...</span>
        </div>
    </div>
);


    // ---- UI ----
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
            <ToastBox />
            <CustomModal />
            <DeletingOverlay />
            <div className="max-w-7xl mx-auto space-y-4">

                {/* HEADER */}
                <div className="bg-white rounded-2xl shadow-lg p-5 border border-blue-100">
                    <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
                        <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-md">
                                <FileText className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                                    Daftar Surat Perintah Kerja
                                </h1>
                                <p className="text-black/70 text-xs mt-0.5">
                                    Kelola dan pantau seluruh SPK dalam satu tempat. Total SPK: {spks.length}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        {Object.entries(statusCount).map(([key, value]) => (
                            <div
                                key={key}
                                className={`${getStatusColor(
                                    key === "semua" ? "Semua" : key.charAt(0).toUpperCase() + key.slice(1)
                                )} rounded-xl p-3 text-white shadow-md hover:scale-[1.02] transition-transform`}
                            >
                                <p className="text-xs opacity-90 capitalize">
                                    {key === "semua" ? "Total SPK" : key}
                                </p>
                                <p className="text-2xl font-bold mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SEARCH */}
                <div className="bg-white rounded-2xl shadow-lg p-4 border border-blue-100">
                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                            <input
                                type="text"
                                placeholder="Cari nomor SPK atau jenis pekerjaan..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-3 focus:border-cyan-500 focus:bg-white outline-none text-sm text-black"
                            />
                        </div>

                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60" size={16} />
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-7 min-w-[160px] text-sm text-black"
                            >
                                <option value="Semua">Semua Status</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Proses">Proses</option>
                                <option value="Menunggu">Menunggu</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
                    {loading ? (
                        <div className="py-12 text-center">
                            <Loader2 className="mx-auto animate-spin text-cyan-600 mb-3" size={32} />
                            <p className="text-black text-sm font-medium">Memuat data SPK...</p>
                        </div>
                    ) : error ? (
                        <div className="py-12 text-center bg-red-50/50">
                            <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
                            <p className="text-red-700 text-sm font-medium">Error: {error}</p>
                            <p className="text-red-600/80 text-xs mt-1">Silakan periksa konfigurasi token dan API server.</p> 
                        </div>
                    ) : filteredSpk.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead>
                                    <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm">
                                        <th className="px-4 py-3 text-left font-semibold">No</th>
                                        <th className="px-4 py-3 text-left font-semibold">Nomor SPK</th>
                                        <th className="px-4 py-3 text-left font-semibold">Pekerjaan</th>
                                        <th className="px-4 py-3 text-left font-semibold">Tanggal</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                        <th className="px-4 py-3 text-center font-semibold">Aksi</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100">
                                    {filteredSpk.map((spk, index) => (
                                        <tr
                                            key={spk.id + spk.uuid} // Menggunakan kombinasi ID untuk keunikan
                                            className="hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all text-sm"
                                        >
                                            <td className="px-4 py-3 text-black">{index + 1}</td>
                                            <td className="px-4 py-3 font-semibold text-blue-700">{spk.nomor}</td>
                                            <td className="px-4 py-3 text-black">{spk.pekerjaan}</td>

                                            <td className="px-4 py-3 text-black flex items-center gap-1.5 whitespace-nowrap">
                                                <Calendar size={14} className="text-black/60" />
                                                <span className="text-xs">{spk.tanggal}</span>
                                            </td>

                                            <td className="px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full shadow-sm ${
                                                        spk.status === "Selesai"
                                                            ? "bg-gradient-to-r from-green-400 to-green-500 text-white"
                                                            : spk.status === "Proses" || spk.status === "Menunggu"
                                                            ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white"
                                                            : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                                                    }`}
                                                >
                                                    {spk.status}
                                                </span>
                                            </td>

                                            {/* Aksi Buttons */}
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex justify-center gap-2">

                                                    {/* VIEW */}
                                                    <button
                                                        onClick={() => handleView(spk)}
                                                        className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg shadow-md hover:scale-105 transition"
                                                        title="Lihat Detail"
                                                    >
                                                        <Eye size={16} />
                                                    </button>

                                                    {/* EDIT */}
                                                    <button
                                                        onClick={() => handleEdit(spk)}
                                                        className="p-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg shadow-md hover:scale-105 transition"
                                                        title="Edit SPK"
                                                    >
                                                        <Pencil size={16} />
                                                    </button>

                                                    {/* DELETE */}
                                                    <button
                                                        onClick={() => handleDelete(spk)}
                                                        className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg shadow-md hover:scale-105 transition"
                                                        title="Hapus SPK"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>

                            </table>
                        </div>
                    ) : (
                        <div className="py-12 text-center">
                            <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <FileText className="text-gray-400" size={32} />
                            </div>
                            <p className="text-black text-sm font-medium">Tidak ada data SPK ditemukan</p>
                            <p className="text-black/70 text-xs mt-1">
                                Coba ubah kata kunci pencarian atau filter
                            </p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}