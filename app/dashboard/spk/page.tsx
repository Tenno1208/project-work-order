"use client";

import React, { useEffect, useState, useCallback } from "react";
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
    Users,
    CheckCircle,
    Copy,     
    MapPin,   
} from "lucide-react";
import { useRouter } from "next/navigation";

const GET_API_SPK_URL_LOCAL = "/api/spk/list";
const DELETE_API_SPK_URL_LOCAL = "/api/spk/delete/";
const PERMISSION_ASSIGN = 'Workorder.spk.menugaskan';

const MAX_RETRIES = 3;

type SPKItem = {
    id: number;
    nomor: string;
    pekerjaan: string;
    tanggal: string;
    status: string;
    uuid: string;
    namaPetugas?: string;
    // Tambahan field untuk pengecekan NPP
    menyetujui_npp?: string | null;
    mengetahui_npp?: string | null;
    // PENTING: Tambahkan field TTD untuk pengecekan file signature
    mengetahui_ttd?: string | null; 
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

type CurrentUser = {
    npp: string;
    name?: string;
};


const ToastBox = ({ toast, onClose }: { toast: ToastMessage, onClose: () => void }) =>
    toast.show && (
        <div
            className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 animate-slide-in transition-opacity duration-300 flex items-center gap-2 ${toast.type === "success" ? "bg-green-600" : "bg-red-600"
                }`}
        >
            {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{toast.message}</span>
            <button onClick={onClose} className="text-white ml-2">
                <X size={14} />
            </button>
        </div>
    );

export default function DaftarSPKPage() {
    const router = useRouter();
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [spks, setSpks] = useState<SPKItem[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("Semua");
    const [error, setError] = useState<string | null>(null);

    const [userPermissions, setUserPermissions] = useState<string[]>([]);
    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

    const [deleting, setDeleting] = useState(false);

    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);


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

    const hasPermission = useCallback((permissionName: string): boolean => {
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

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

            const userDataString = localStorage.getItem('user_data');
            try {
                if (userDataString) {
                    const localUserData = JSON.parse(userDataString);
                    const userNpp = localUserData.npp || null;
                    const userName = localUserData.nama || localUserData.name || null;

                    if (userNpp) {
                        setCurrentUser({ npp: userNpp, name: userName });
                    }
                }
            } catch (e) {
                console.error("Gagal parse user_data dari localStorage:", e);
            }

            setPermissionsLoaded(true);
        }
    }, []);


    const handleView = (spk: SPKItem) => {
        if (!hasPermission('Workorder.spk.view')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (Workorder.spk.view) untuk melihat detail SPK.", "error");
            return;
        }
        router.push(`/dashboard/spk/view?uuid=${spk.uuid}`);
    };

    const isUserApprover = (spk: SPKItem): boolean => {
        if (!currentUser || !currentUser.npp) return false;

        if (spk.menyetujui_npp && String(spk.menyetujui_npp) === String(currentUser.npp)) {
            return true;
        }
        if (spk.mengetahui_npp && String(spk.mengetahui_npp) === String(currentUser.npp)) {
            return true;
        }

        return false;
    };

    const handleEdit = (spk: SPKItem) => {
        const nonEditableStatuses = ["Menunggu", "Selesai", "Tidak Selesai"];
        const isApprover = isUserApprover(spk);

        // --- LOGIKA BARU: Cek TTD Mengetahui ---
        // Jika mengetahui_ttd tidak null, berarti sudah ditandatangani -> TIDAK BISA EDIT
        if (spk.mengetahui_ttd) {
             showToast(`Tidak dapat mengedit SPK karena sudah ditandatangani (Mengetahui).`, "error");
             return;
        }

        if (!isApprover && nonEditableStatuses.includes(spk.status)) {
            showToast(`Tidak dapat mengedit SPK dengan status '${spk.status}'.`, "error");
            return;
        }

        if (!hasPermission('Workorder.spk.update')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (Workorder.spk.update) untuk mengedit SPK.", "error");
            return;
        }
        router.push(`/dashboard/spk/format?uuid=${spk.uuid}`);
    };

    const handleAssign = (spk: SPKItem) => {
        if (!hasPermission(PERMISSION_ASSIGN)) {
            showToast(`Akses Ditolak: Anda tidak memiliki izin (${PERMISSION_ASSIGN}) untuk menugaskan SPK.`, "error");
            return;
        }
        const nonAssignableStatuses = ["Proses", "Selesai", "Tidak Selesai"];
        if (nonAssignableStatuses.includes(spk.status)) {
            showToast(`SPK berstatus '${spk.status}' dan tidak dapat ditugaskan kembali.`, "error");
            return;
        }
        router.push(`/dashboard/spk/assign?uuid=${spk.uuid}`);
    };

    const handleDelete = (spk: SPKItem) => {
        if (!hasPermission('Workorder.spk.delete')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (Workorder.spk.delete) untuk menghapus SPK.", "error");
            return;
        }
        setModal({
            isOpen: true,
            message: `Apakah Anda yakin ingin menghapus SPK ${spk.nomor}? Tindakan ini tidak dapat dibatalkan.`,
            isDeletion: true,
            spkToDelete: spk,
        });
    };

    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        showToast("Nomor SPK disalin!", "success");
    };

    const handleTracking = (spk: SPKItem) => {
        window.open(`/tracking/${spk.uuid}`, '_blank');
    };

    const confirmDeletion = async () => {
        if (!modal.spkToDelete || !hasPermission('Workorder.spk.delete')) return;

        setDeleting(true);
        const uuid = modal.spkToDelete.uuid;

        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Otorisasi hilang. Silakan login ulang.", "error");
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
                const errData = await res.json().catch(() => ({ message: res.statusText }));
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
        }
    };

    const fetchData = useCallback(async () => {
        if (!permissionsLoaded) return;

        if (!hasPermission('Workorder.spk.views')) {
            setError("Akses Ditolak: Anda tidak memiliki izin (Workorder.spk.views) untuk melihat daftar SPK.");
            showToast("Akses Ditolak: Anda tidak memiliki izin untuk melihat daftar SPK.", "error");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setError("Token tidak ditemukan. Silakan login ulang.");
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

                const mapped: SPKItem[] = result.data.map((item: any) => {
                    const statusText = item.status?.name || "Tidak Diketahui";

                    const uuidIdentifier = item.uuid_pengajuan || item.id;

                    return {
                        id: item.id,
                        nomor: item.no_surat || item.uuid_pengajuan || item.id?.toString() || "N/A",
                        pekerjaan: item.uraian_pekerjaan || item.jenis_pekerjaan?.nama_pekerjaan || "Tidak ada data",
                        tanggal: item.tanggal || "-",
                        status: statusText,
                        uuid: uuidIdentifier.toString(),
                        namaPetugas: item.penanggung_jawab_name || "-",
                        // Mapping data NPP Approver
                        menyetujui_npp: item.menyetujui_npp,
                        mengetahui_npp: item.mengetahui_npp,
                        // Mapping Data TTD (Sesuai JSON API)
                        mengetahui_ttd: item.mengetahui_ttd, 
                    };
                }).filter((i: SPKItem) => i.uuid && i.uuid !== 'N/A');

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
    }, [permissionsLoaded, hasPermission, showToast]);

    useEffect(() => {
        if (permissionsLoaded) {
            fetchData();
        }
    }, [fetchData, permissionsLoaded]);

    const filteredSpk = spks.filter((item) => {
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
        belumSelesai: spks.filter((s) => s.status === "Belum Selesai").length,
        tidakSelesai: spks.filter((s) => s.status === "Tidak Selesai").length,
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "Selesai":
                return "bg-gradient-to-r from-green-500 to-green-600";
            case "Proses":
                return "bg-gradient-to-r from-yellow-500 to-orange-500";
            case "Menunggu":
                return "bg-gradient-to-r from-blue-400 to-blue-500";
            case "Belum Selesai":
                return "bg-gradient-to-r from-gray-500 to-gray-600";
            case "Tidak Selesai":
                return "bg-gradient-to-r from-gray-500 to-gray-600";
            case "Semua":
                return "bg-gradient-to-r from-slate-500 to-slate-600";
            default:
                return "bg-gradient-to-r from-gray-400 to-gray-500";
        }
    };


    const CustomModal = () =>
        modal.isOpen ? (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-all duration-300">
                <div className="bg-white rounded-2xl p-7 w-full max-w-sm shadow-2xl transform scale-100 transition-transform duration-300">
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-red-100 p-3 rounded-full mb-3">
                            <AlertTriangle className="text-red-600" size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-red-700">
                            Konfirmasi Penghapusan
                        </h3>
                    </div>

                    <p className="text-sm mb-7 text-center text-gray-700 font-medium">
                        {modal.message}
                    </p>

                    <div className="flex justify-end gap-3">
                        <button
                            onClick={closeModal}
                            disabled={deleting}
                            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                            Batal
                        </button>

                        <button
                            onClick={confirmDeletion}
                            disabled={deleting}
                            className="px-4 py-2 text-sm bg-red-600 text-white rounded-xl shadow-md hover:bg-red-700 flex items-center gap-2 transition-colors disabled:bg-red-400 disabled:cursor-not-allowed"
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
        ) : null;

    const DeletingOverlay = () =>
        deleting && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] transition-opacity duration-300">
                <div className="bg-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 border-t-4 border-red-500">
                    <Loader2 className="animate-spin text-red-600" size={24} />
                    <span className="text-lg font-semibold text-gray-800">Menghapus data SPK...</span>
                </div>
            </div>);

    const canViewList = hasPermission('Workorder.spk.views');
    const canViewDetail = hasPermission('Workorder.spk.view');
    const canEdit = hasPermission('Workorder.spk.update');
    const canDelete = hasPermission('Workorder.spk.delete');
    const canCreate = hasPermission('Workorder.spk.create');
    const canAssign = hasPermission(PERMISSION_ASSIGN);

    if (!permissionsLoaded) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat izin pengguna...</span>
            </div>
        );
    }

    if (!canViewList) {
        return (
            <div className="p-8 space-y-6 text-center bg-gray-50 min-h-screen">
                <AlertTriangle className="inline-block text-red-500" size={48} />
                <h2 className="text-3xl font-extrabold text-red-600">Akses Ditolak</h2>
                <p className="text-gray-700 text-lg">Anda tidak memiliki izin (**Workorder.spk.views**) untuk melihat daftar SPK.</p>
            </div>
        );
    }

    if (loading && canViewList) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat data SPK...</span>
            </div>
        );
    }


    // ---- UI ----
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
            <ToastBox toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
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

                        {/* Tombol Tambah SPK Baru */}
                        {canCreate && (
                            <button
                                onClick={() => router.push('/dashboard/spk/create')}
                                className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 shadow-md hover:scale-[1.02] transition-transform"
                            >
                                <Plus size={18} /> Tambah SPK
                            </button>
                        )}
                    </div>

                    {/* STATS */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
                        {Object.entries(statusCount).map(([key, value]) => (
                            <div
                                key={key}
                                className={`${getStatusColor(
                                    key === "semua" ? "Semua" : key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
                                )} rounded-xl p-3 text-white shadow-md hover:scale-[1.02] transition-transform`}
                            >
                                <p className="text-xs opacity-90 capitalize">
                                    {key === "semua" ? "Total SPK" : key.replace(/([A-Z])/g, ' $1').trim()}
                                </p>
                                <p className="text-2xl font-bold mt-0.5">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SEARCH & FILTER */}
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
                                className="bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-7 min-w-[160px] text-sm text-black appearance-none cursor-pointer"
                            >
                                <option value="Semua">Semua Status</option>
                                <option value="Selesai">Selesai</option>
                                <option value="Proses">Proses</option>
                                <option value="Menunggu">Menunggu</option>
                                <option value="Belum Selesai">Belum Selesai</option>
                                <option value="Tidak Selesai">Tidak Selesai</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
                    {error && !loading ? (
                        <div className="py-12 text-center bg-red-50/50">
                            <AlertTriangle className="mx-auto text-red-500 mb-3" size={32} />
                            <p className="text-red-700 text-sm font-medium">Error: {error}</p>
                            <p className="text-red-600/80 text-xs mt-1">Silakan periksa izin atau koneksi API.</p>
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
                                    {filteredSpk.map((spk, index) => {
                                        const isNonAssignable = ["Proses", "Selesai", "Tidak Selesai", "Belum Selesai"].includes(spk.status);

                                        const isApprover = isUserApprover(spk);
                                        const isStatusLocked = ["Menunggu", "Selesai", "Tidak Selesai"].includes(spk.status);

                                        const isSignedMengetahui = spk.mengetahui_ttd != null;

                                        const isEditDisabled =
                                            isSignedMengetahui || 
                                            (!isApprover && isStatusLocked) ||
                                            !canEdit;

                                        return (
                                            <tr
                                                key={spk.id + spk.uuid}
                                                className="hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all text-sm"
                                            >
                                                <td className="px-4 py-3 text-black">{index + 1}</td>

                                                <td className="px-4 py-3 font-semibold text-blue-700">
                                                    <div className="flex items-center gap-2">
                                                        <span>{spk.nomor}</span>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={() => handleCopy(spk.nomor)}
                                                                className="text-gray-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50 transition-colors"
                                                                title="Salin Nomor SPK"
                                                            >
                                                                <Copy size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleTracking(spk)}
                                                                className="text-gray-400 hover:text-orange-500 p-1 rounded hover:bg-orange-50 transition-colors"
                                                                title="Lacak Status"
                                                            >
                                                                <MapPin size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-4 py-3 text-black">{spk.pekerjaan}</td>

                                                <td className="px-4 py-3 text-black flex items-center gap-1.5 whitespace-nowrap">
                                                    <Calendar size={14} className="text-black/60" />
                                                    <span className="text-xs">{spk.tanggal}</span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 text-xs font-bold rounded-full shadow-sm ${spk.status === "Selesai"
                                                                ? "bg-gradient-to-r from-green-400 to-green-500 text-white"
                                                                : spk.status === "Proses"
                                                                    ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white"
                                                                    : spk.status === "Menunggu"
                                                                        ? "bg-gradient-to-r from-blue-400 to-blue-500 text-white"
                                                                        : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                                                            }`}
                                                    >
                                                        {spk.status}
                                                    </span>
                                                </td>

                                                <td className="px-4 py-3">
                                                    <div className="flex justify-center gap-2">

                                                        <button
                                                            onClick={() => handleView(spk)}
                                                            disabled={deleting || !canViewDetail}
                                                            title={!canViewDetail ? "Akses Ditolak: Tidak ada izin Workorder.spk.view" : "Lihat Detail"}
                                                            className={`p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg shadow-md hover:scale-105 transition ${!canViewDetail || deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Eye size={16} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleAssign(spk)}
                                                            disabled={deleting || !canAssign || isNonAssignable}
                                                            title={
                                                                !canAssign
                                                                    ? `Akses Ditolak: Tidak ada izin ${PERMISSION_ASSIGN}`
                                                                    : isNonAssignable
                                                                        ? `SPK sudah berstatus '${spk.status}' dan tidak dapat ditugaskan kembali`
                                                                        : "Tugaskan SPK ke Petugas"
                                                            }
                                                            className={`p-2 bg-cyan-100 text-cyan-700 hover:bg-cyan-200 rounded-lg shadow-md hover:scale-105 transition ${!canAssign || deleting || isNonAssignable ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                        >
                                                            <Users size={16} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleEdit(spk)}
                                                            disabled={deleting || isEditDisabled}
                                                            title={
                                                                !canEdit
                                                                    ? "Akses Ditolak: Tidak ada izin Workorder.spk.update"
                                                                    : isSignedMengetahui
                                                                        ? "Tidak dapat diedit: Sudah ditandatangani (Mengetahui)"
                                                                        : isEditDisabled
                                                                            ? `Tidak dapat diedit karena status '${spk.status}'`
                                                                            : isApprover
                                                                                ? "Edit SPK (Akses Penyetuju/Mengetahui)"
                                                                                : "Edit SPK"
                                                            }
                                                            className={`p-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg shadow-md hover:scale-105 transition ${deleting || isEditDisabled ? 'opacity-50 cursor-not-allowed' : ''
                                                                }`}
                                                        >
                                                            <Pencil size={16} />
                                                        </button>

                                                        <button
                                                            onClick={() => handleDelete(spk)}
                                                            disabled={deleting || !canDelete}
                                                            title={!canDelete ? "Akses Ditolak: Tidak ada izin Workorder.spk.delete" : "Hapus SPK"}
                                                            className={`p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg shadow-md hover:scale-105 transition ${!canDelete || deleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
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