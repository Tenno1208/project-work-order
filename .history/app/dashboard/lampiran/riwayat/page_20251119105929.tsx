"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { PlusCircle, Search, Loader2, Eye, Pencil, Trash2, X, AlertTriangle, CheckCircle, Droplet } from "lucide-react";

// #######################################################################
// PERBAIKAN 2: UBAH LIST_API_PATH ke endpoint spesifik pelapor
// Catatan: Asumsi API_BASE_URL adalah akar dari '/api/pengajuan/pelapor/{npp}'
// Kita akan membangun path lengkap di fungsi fetchData.
// #######################################################################
// const LIST_API_PATH = "/api/pengajuan"; // Path lama
const LIST_API_BASE_PATH = "/api/pengajuan/pelapor"; // Base Path baru

const DELETE_API_BASE = "/api/pengajuan/delete/";
const MAX_RETRIES = 1;

// #######################################################################
// PERBAIKAN 1: PERBARUI TIPE DATA ApiPengajuanItem (Sudah Benar)
// #######################################################################
type ApiPengajuanItem = {
    id: number;
    uuid: string;
    no_surat: string;
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
};

type ToastMessage = {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
};

// --- HELPER FUNCTIONS (Dibiarkan sama) ---

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

export default function DataPengajuanPage() {
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<{id: number | null, uuid: string | null, hal: string | null}>({id: null, uuid: null, hal: null});
    const [isDeleting, setIsDeleting] = useState(false);

    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'success', isVisible: false });

    /**
     * Menampilkan notifikasi toast sementara.
     */
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        } , 4000);
    }, []);

    // --- Data Fetching Logic ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setAuthError(null);

        let token: string | null = null;
        // #######################################################################
        // PERBAIKAN UTAMA: Ambil NPP Pelapor dari localStorage
        // Asumsi NPP disimpan di localStorage dengan key 'npp_pelapor' atau 'user_npp'
        // Jika NPP disimpan di token, logika parsing token perlu ditambahkan
        // #######################################################################
        let userNpp: string | null = null;

        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token');
            // Ganti 'user_npp' dengan key yang benar di aplikasi Anda
            userNpp = localStorage.getItem('user_npp');
            
            // Logika fallback jika NPP tidak langsung tersedia:
            // Jika token ada, coba ambil NPP dari data user yang mungkin disimpan di localStorage
            if (!userNpp && localStorage.getItem('user_data')) {
                try {
                    const userData = JSON.parse(localStorage.getItem('user_data') as string);
                    userNpp = userData.npp; // Asumsi struktur data user memiliki properti 'npp'
                } catch (e) {
                    console.error("Gagal parse data user dari localStorage:", e);
                }
            }
        }

        if (!token) {
            console.error("Token otorisasi tidak ditemukan.");
            setAuthError("Gagal memuat data. Mohon login ulang.");
            showToast("Anda tidak memiliki token otorisasi. Mohon login ulang.", 'error');
            setLoading(false);
            return;
        }

        if (!userNpp) {
            console.error("NPP Pelapor tidak ditemukan di localStorage.");
            setAuthError("Gagal memuat data. NPP Pelapor tidak ditemukan.");
            showToast("Data NPP Pelapor tidak ditemukan. Mohon login ulang.", 'error');
            setLoading(false);
            return;
        }

        // #######################################################################
        // PERBAIKAN UTAMA: Gunakan API Riwayat Pengajuan khusus Pelapor
        // #######################################################################
        const fullApiUrl = `${LIST_API_BASE_PATH}/${userNpp}`;
        console.log("Fetching data from:", fullApiUrl);


        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(fullApiUrl, { // PANGGIL DENGAN API KHUSUS PELAPOR
                    method: 'GET',
                    headers: headers,
                });

                if (!response.ok) {
                    const errorBody = await response.json().catch(() => ({ message: response.statusText }));
                    if (response.status === 401) {
                        showToast('Sesi Anda berakhir. Mohon login ulang.', 'error');
                        throw new Error(`Otorisasi Gagal: ${errorBody.message || 'Token tidak valid atau kadaluarsa.'}`);
                    }
                    const userFriendlyError = `Gagal memuat data. Status: ${response.status}.`;
                    showToast(userFriendlyError, 'error');
                    throw new Error(`Gagal memuat data. Status: ${response.status}. Pesan: ${errorBody.message || response.statusText}`);
                }

                const result: ApiResponse = await response.json();

                if (!result.success || !Array.isArray(result.data)) {
                    showToast("Struktur respons API tidak valid.", 'error');
                    throw new Error("Struktur respons API tidak valid: 'success' false atau 'data' bukan array.");
                }

                const activeData = result.data.filter(item => item.is_deleted !== 1);

                const mappedData: Pengajuan[] = activeData.map(item => ({
                    id: item.id,
                    uuid: item.uuid,
                    tanggal: formatDate(item.created_at),
                    hal: item.keterangan || item.catatan || item.kode_barang || 'Tidak Ada Keterangan',
                    // Menggunakan name_pelapor dan npp_pelapor yang sudah benar
                    name_pelapor: item.name_pelapor || item.npp_pelapor || 'Anonim',
                    status: item.status || 'Pending',
                }));

                setPengajuans(mappedData);
                setLoading(false);
                return;
            } catch (error: any) {
                console.error(`Gagal memuat data (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);

                if (error.message.includes("Otorisasi Gagal") || i === MAX_RETRIES - 1) {
                    setAuthError(error.message);
                    setLoading(false);
                    return;
                }

                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }, [showToast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Action Handlers (Dibiarkan sama) ---

    const generateNoSurat = (): string => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const random = Math.floor(100 + Math.random() * 900);
        return `SPK-${day}${month}${year}-${random}`;
    };

    const handleBuatPengajuan = () => {
        setCreating(true);
        const nomorSuratBaru = generateNoSurat();

        if (typeof window !== 'undefined') {
            localStorage.setItem("nomor_surat_terakhir", nomorSuratBaru);
        }

        router.push("/dashboard/lampiran/tambah");

        setCreating(false);
    };

    const handleView = (uuid: string) => {
        router.push(`/dashboard/lampiran/view/${uuid}`);
    };

    const handleEdit = (uuid: string) => {
        localStorage.setItem("current_edit_uuid", uuid);
        router.push(`/dashboard/lampiran/edit/${uuid}`);
    };

    const handleDeleteClick = (id: number, uuid: string, hal: string) => {
        if (isDeleting) return;
        setItemToDelete({ id, uuid, hal });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
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
            p.tanggal.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
            case "diterima":
                return "bg-blue-100 text-blue-700 ring-1 ring-blue-300";
            case "rejected":
            case "ditolak":
                return "bg-red-100 text-red-700 ring-1 ring-red-300";
            case "pending":
            case "menunggu":
                return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300";
            case "diproses":
            case "selesai":
            case "":
                return "bg-green-100 text-green-700 ring-1 ring-green-300";
            case "error":
                return "bg-gray-700 text-white";
            default:
                return "bg-gray-100 text-gray-700 ring-1 ring-gray-300";
        }
    };

    // --- CUSTOM MODAL COMPONENT (Dibiarkan sama) ---
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

    // --- RENDER DENGAN STYLING BARU (Dibiarkan sama) ---

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <DeleteConfirmationModal />
            <Toast toast={toast} setToast={setToast} />

            {/* Global Deleting Overlay */}
            {isDeleting && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center">
                        <Loader2 className="animate-spin text-red-600 mr-3" size={24}/>
                        <span className="text-lg font-semibold text-gray-800">Menghapus data ID {itemToDelete.id}...</span>
                    </div>
                </div>
            )}

            {/* Header dengan Styling RiwayatDataPengajuan */}
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
                    {/* Tombol Buat Pengajuan Baru dipindahkan ke Header */}
                    <button
                        onClick={handleBuatPengajuan}
                        disabled={creating || isDeleting}
                        className={`flex items-center gap-2 text-sm font-medium ${
                            creating || isDeleting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                        } text-white px-4 py-2 rounded-lg shadow-md transition-all duration-200 ease-in-out`}
                    >
                        {creating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Buat...
                            </>
                        ) : (
                            <>
                                <PlusCircle size={16} /> Buat Pengajuan Baru
                            </>
                        )}
                    </button>
                </div>

                {/* Search Bar dengan Styling RiwayatDataPengajuan */}
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

            {/* Tabel Data dengan Styling RiwayatDataPengajuan */}
            <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden">
                <div className="px-5 py-4 border-b border-blue-100">
                    <h3 className="text-lg font-bold text-gray-900">
                        Daftar Riwayat Pengajuan Perbaikan
                    </h3>
                    <p className="text-gray-600 text-xs mt-1">
                        Total {filtered.length} pengajuan ditemukan
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-[5%] border-b border-blue-200">No</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-[15%] border-b border-blue-200">Tanggal</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-[30%] border-b border-blue-200">Hal (Keterangan)</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-[25%] border-b border-blue-200">Pelapor</th>
                                <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider w-[15%] border-b border-blue-200">Status</th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider w-[10%] border-b border-blue-200">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-blue-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center bg-white">
                                        <Loader2 className="animate-spin inline-block text-blue-600 mr-2" size={24}/>
                                        <span className="text-gray-600 font-medium">Memuat data...</span>
                                    </td>
                                </tr>
                            ) : authError && filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center bg-white">
                                        <AlertTriangle className="inline-block text-red-500 mr-2" size={24}/>
                                        <span className="text-red-500 font-medium">Gagal memuat data. Mohon periksa koneksi Anda atau coba login ulang.</span>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-10 text-center text-gray-500 bg-white">
                                        <div className="flex flex-col items-center justify-center">
                                            <Search size={36} className="mb-2"/>
                                            <p>Tidak ada data pengajuan ditemukan.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((p, i) => (
                                    <tr
                                        key={p.id}
                                        className={`hover:bg-blue-50/50 transition-colors duration-200 ${
                                            i % 2 === 0 ? "bg-white" : "bg-blue-50/20" // Warna selang-seling sedikit diubah agar lebih kontras
                                        }`}
                                    >
                                        <td className="px-4 py-3 text-xs font-medium text-gray-800 text-center">{i + 1}</td>
                                        <td className="px-4 py-3 text-xs text-gray-800 whitespace-nowrap">{p.tanggal}</td>
                                        <td className="px-4 py-3 text-xs text-gray-800 max-w-xs line-clamp-2">{p.hal}</td>
                                        <td className="px-4 py-3 text-xs text-gray-800 font-medium whitespace-nowrap">{p.name_pelapor}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusStyle(p.status)}`}
                                            >
                                                {p.status || 'BELUM DIISI'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-xs font-medium whitespace-nowrap">
                                            <div className="flex justify-center space-x-2">
                                                {/* Action: VIEW (Lihat Detail) */}
                                                <button
                                                    onClick={() => handleView(p.uuid)}
                                                    title="Lihat Detail"
                                                    disabled={isDeleting}
                                                    className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors duration-200 disabled:opacity-50"
                                                >
                                                    <Eye className="text-blue-700 hover:scale-110 transition-transform" size={14} />
                                                </button>

                                                {/* Action: EDIT (Ubah Data) */}
                                                <button
                                                    onClick={() => handleEdit(p.uuid)}
                                                    title="Ubah Data"
                                                    disabled={isDeleting}
                                                    className="p-1.5 bg-yellow-100 hover:bg-yellow-200 rounded-md transition-colors duration-200 disabled:opacity-50"
                                                >
                                                    <Pencil className="text-yellow-700 hover:scale-110 transition-transform" size={14} />
                                                </button>

                                                {/* Action: DELETE (Hapus Data) */}
                                                <button
                                                    onClick={() => handleDeleteClick(p.id, p.uuid, p.hal)}
                                                    title="Hapus Pengajuan"
                                                    disabled={isDeleting || !p.uuid}
                                                    className={`p-1.5 ${p.uuid ? 'bg-red-100 hover:bg-red-200' : 'bg-gray-100 cursor-not-allowed'} rounded-md transition-colors duration-200 disabled:opacity-50`}
                                                >
                                                    <Trash2 className={`${p.uuid ? 'text-red-700' : 'text-gray-400'} hover:scale-110 transition-transform`} size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filtered.length === 0 && !loading && !authError && (
                    <div className="px-5 py-8 text-center">
                        <Droplet className="mx-auto text-gray-500 mb-3" size={40} />
                        <p className="text-gray-700 text-base font-medium">
                            Tidak ada data pengajuan yang ditemukan
                        </p>
                        <p className="text-gray-500 text-xs mt-1">
                            Coba ubah kata kunci pencarian
                        </p>
                    </div>
                )}
            </div>

            {/* Footer dengan Styling RiwayatDataPengajuan */}
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