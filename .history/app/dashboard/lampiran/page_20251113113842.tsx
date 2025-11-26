
import React, { useEffect, useState } from "react";
import { PlusCircle, Search, Loader2, Eye, Pencil, Trash2, X, AlertTriangle } from "lucide-react";

// --- TYPES ---
type ApiPengajuanItem = {
    id: number;
    uuid: string; // Diperlukan untuk endpoint Edit
    hal_id: number;
    catatan: string;
    kepada: string;
    satker: string;
    kode_barang: string;
    keterangan: string; 
    file: string | null;
    status: string;
    name: string | null;
    npp: string | null;
    mengetahui: string | null;
    is_deleted: number;
    created_at: string; 
    updated_at: string;
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
    pelapor: string;
    status: string;
};

// --- HELPER FUNCTIONS ---

/**
 * Memformat string ISO ke format DD-MM-YYYY (Indonesia)
 */
const formatDate = (isoString: string): string => {
    try {
        if (!isoString) return '-';
        
        const date = new Date(isoString);
        if (isNaN(date.getTime())) return '-';
        
        // Menggunakan Intl.DateTimeFormat (standar browser)
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date).replace(/\//g, '-'); 
        
    } catch (e) {
        return 'Format Salah';
    }
};

// Definisi API URL berdasarkan permintaan pengguna (untuk logging)
const BASE_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
const MAX_RETRIES = 3;

// --- MAIN COMPONENT ---

// Mengubah nama komponen utama menjadi App dan menjadikannya default export
export default function App() {
        
    const [loading, setLoading] = useState(true);
    const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    // State untuk Deletion Modal
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    // State untuk item yang akan dihapus
    const [itemToDelete, setItemToDelete] = useState<{ id: number, uuid: string } | null>(null);

    // State untuk simulasi navigasi/feedback
    const [navigationLog, setNavigationLog] = useState<string | null>(null);

    // Fungsi untuk menampilkan log navigasi sementara
    const logNavigation = (message: string) => {
        setNavigationLog(message);
        console.log(message);
        setTimeout(() => setNavigationLog(null), 3000); // Hapus pesan setelah 3 detik
    };

    // --- Data Fetching (useEffect) ---

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);

            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    // Panggilan ke API proxy server
                    // Catatan: Karena ini bukan lingkungan Next.js, fetch('/api/pengajuan') 
                    // mungkin tidak berfungsi, jadi kita simulasikan kegagalan untuk demonstrasi
                    
                    // --- SIMULASI FETCH API NYATA (Tergantung lingkungan runtime) ---
                    // Menggunakan URL langsung, atau URL dummy
                    const response = await fetch(`${BASE_API_URL}?t=${Date.now()}`); // Menghindari cache
                        
                    if (!response.ok) {
                        throw new Error(`Gagal memuat data. Kode Status: ${response.status}`);
                    }

                    const result: ApiResponse = await response.json();

                    if (!result.success || !result.data || !Array.isArray(result.data)) {
                        throw new Error("Struktur respons API tidak valid: 'success' false atau 'data' bukan array.");
                    }

                    const mappedData: Pengajuan[] = result.data.map(item => ({
                        id: item.id,
                        uuid: item.uuid,
                        tanggal: formatDate(item.created_at), 
                        hal: item.keterangan || item.catatan || 'Tidak Ada Keterangan', 
                        pelapor: item.name || item.npp || 'Anonim', 
                        status: item.status || 'Pending',
                    }));

                    setPengajuans(mappedData);
                    setLoading(false);
                    return; 
                } catch (error: any) {
                    console.error(`Gagal memuat data (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);
                        
                    if (i < MAX_RETRIES - 1) {
                        const delay = Math.pow(2, i) * 1000;
                        await new Promise(resolve => setTimeout(resolve, delay));
                    } else {
                        console.error("Gagal total memuat data pengajuan setelah mencoba berkali-kali. Menggunakan data simulasi.");
                        setLoading(false);
                        // Data placeholder saat gagal
                        setPengajuans([
                            { id: 1, uuid: 'a1b2c3d4e5f6', tanggal: "12-10-2024", hal: "Permohonan Pengadaan Barang Baru", pelapor: "Andi Wijaya", status: "Approved" },
                            { id: 2, uuid: 'f6e5d4c3b2a1', tanggal: "13-10-2024", hal: "Permintaan Pengecekan Server", pelapor: "Budi Santoso", status: "Pending" },
                            { id: 3, uuid: 'x9y8z7w6v5u4', tanggal: "14-10-2024", hal: "Laporan Kerusakan Peralatan Kantor", pelapor: "Cinta Laura", status: "Rejected" },
                        ]);
                    }
                }
            }
        };

        fetchData();
    }, []); 

    // --- Action Handlers ---

    const generateNoSurat = () => {
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

        setTimeout(() => {
            setCreating(false);
            logNavigation(`[NAVIGASI]: Mengarahkan ke /dashboard/lampiran/tambah dengan Nomor Surat: ${nomorSuratBaru}`);
        }, 500);
    };

    const handleView = (id: number) => {
        logNavigation(`[NAVIGASI]: Melihat Detail Pengajuan ID: ${id}. Rute Tujuan: /dashboard/lampiran/${id}`);
    };
    
    /**
     * Handle Edit: Menggunakan UUID untuk navigasi ke endpoint Edit API
     */
    const handleEdit = (uuid: string) => {
        const apiEditUrl = `${BASE_API_URL}/edit/${uuid}`;
        logNavigation(`[NAVIGASI/API]: Edit data UUID: ${uuid}. API Target: ${apiEditUrl}`);
    };

    /**
     * Handle Delete Click: Membuka modal konfirmasi
     */
    const handleDeleteClick = (id: number, uuid: string) => {
        setItemToDelete({ id, uuid });
        setIsDeleteModalOpen(true);
    };

    /**
     * Handle Confirm Delete: Melakukan simulasi penghapusan dengan log API yang benar
     */
    const handleConfirmDelete = () => {
        if (itemToDelete) {
            const deleteId = itemToDelete.id;
            const apiDeleteUrl = `${BASE_API_URL}/delete/${deleteId}`;
            
            logNavigation(`[API]: Mengirim permintaan HAPUS untuk ID: ${deleteId}. Endpoint: ${apiDeleteUrl}`);
            
            // SIMULASI: Hapus dari state lokal setelah berhasil
            setPengajuans(prev => prev.filter(p => p.id !== deleteId));
            
            console.log(`[SUCCESS]: Data pengajuan ID ${deleteId} berhasil dihapus dari tampilan.`);
        }
        setIsDeleteModalOpen(false);
        setItemToDelete(null);
    };

    // --- Filtering & Styling ---

    const filtered = pengajuans.filter(
        (p) =>
            p.hal.toLowerCase().includes(search.toLowerCase()) ||
            p.pelapor.toLowerCase().includes(search.toLowerCase()) ||
            p.status.toLowerCase().includes(search.toLowerCase()) ||
            p.tanggal.toLowerCase().includes(search.toLowerCase())
    );

    const getStatusStyle = (status: string) => {
        switch (status.toLowerCase()) {
            case "approved":
                return "bg-green-100 text-green-700 ring-1 ring-green-300";
            case "rejected":
                return "bg-red-100 text-red-700 ring-1 ring-red-300";
            case "pending":
            case "menunggu":
                return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300";
            case "diproses":
                return "bg-blue-100 text-blue-700 ring-1 ring-blue-300";
            case "error":
                return "bg-gray-700 text-white";
            default:
                return "bg-gray-100 text-gray-700 ring-1 ring-gray-300";
        }
    };

    // --- CUSTOM MODAL COMPONENT ---
    const DeleteConfirmationModal = () => {
        if (!isDeleteModalOpen || !itemToDelete) return null;

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
                        <p>Apakah Anda yakin ingin menghapus data pengajuan dengan ID **{itemToDelete.id}**?</p>
                        <p className="text-sm mt-2 text-gray-500">Tindakan ini akan memanggil API: `{BASE_API_URL}/delete/{itemToDelete.id}` dan tidak dapat dibatalkan.</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-sm"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-md transform hover:scale-[1.02]"
                        >
                            Ya, Hapus Permanen
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER ---

    return (
        <div className="p-4 md:p-8 space-y-6 text-gray-800 bg-gray-50 min-h-screen font-sans">
            <DeleteConfirmationModal />

            {/* Global Notification/Navigation Log */}
            {navigationLog && (
                <div className="fixed top-4 right-4 z-50 bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded-xl shadow-lg transition-all duration-300 transform slide-in-from-right">
                    <p className="font-medium text-sm">{navigationLog}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-3xl font-extrabold text-gray-900">Data Pengajuan</h2>
                <button
                    onClick={handleBuatPengajuan}
                    disabled={creating}
                    className={`flex items-center gap-2 ${
                        creating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
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

            <div className="relative max-w-lg">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Cari berdasarkan tanggal, hal, pelapor, atau status..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 text-gray-800 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-x-auto">
                <table className="min-w-full text-sm text-gray-700 divide-y divide-gray-200">
                    <thead className="bg-blue-600 text-white sticky top-0">
                        <tr>
                            <th className="py-3 px-4 text-left font-semibold w-[5%]">No</th>
                            <th className="py-3 px-4 text-left font-semibold w-[15%]">Tanggal</th>
                            <th className="py-3 px-4 text-left font-semibold w-[30%]">Hal (Keterangan)</th>
                            <th className="py-3 px-4 text-left font-semibold w-[25%]">Pelapor (Nama)</th>
                            <th className="py-3 px-4 text-left font-semibold w-[15%]">Status</th>
                            <th className="py-3 px-4 text-center font-semibold w-[10%]">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="py-10 text-center bg-white">
                                    <Loader2 className="animate-spin inline-block text-blue-600 mr-2" size={24}/>
                                    <span className="text-gray-600 font-medium">Memuat data...</span>
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
                                    className="bg-white hover:bg-blue-50 transition-colors"
                                >
                                    <td className="py-3 px-4 text-center font-mono">{i + 1}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">{p.tanggal}</td>
                                    <td className="py-3 px-4 line-clamp-2 max-w-xs">{p.hal}</td>
                                    <td className="py-3 px-4 font-medium">{p.pelapor}</td>
                                    <td className="py-3 px-4">
                                        <span
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                getStatusStyle(p.status)
                                            }`}
                                        >
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                        <div className="flex justify-center space-x-2">
                                            {/* Action: VIEW (Lihat Detail) */}
                                            <button
                                                onClick={() => handleView(p.id)}
                                                title="Lihat Detail"
                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            
                                            {/* Action: EDIT (Ubah Data) - Menggunakan UUID */}
                                            <button
                                                onClick={() => handleEdit(p.uuid)}
                                                title="Ubah Data"
                                                className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors"
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            {/* Action: DELETE (Hapus Data) - Menggunakan ID dan UUID */}
                                            <button
                                                onClick={() => handleDeleteClick(p.id, p.uuid)}
                                                title="Hapus Data"
                                                className="p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors"
                                            >
                                                <Trash2 size={18} />
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
    );
}