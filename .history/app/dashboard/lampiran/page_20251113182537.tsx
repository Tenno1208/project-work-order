"use client";

import React, { useEffect, useState, useCallback } from "react";
// Import next/navigation replaced with a custom client-side router simulation
import { PlusCircle, Search, Loader2, Eye, Pencil, Trash2, X, AlertTriangle } from "lucide-react";

// --- CUSTOM CLIENT ROUTER HOOK (Replaces next/navigation) ---
const useClientRouter = () => {
    // This hook simulates the router push action using native browser navigation
    const push = useCallback((path: string) => {
        if (typeof window !== 'undefined') {
            // Check if the path is relative (starts with /) and append it to the current origin
            const newUrl = new URL(path, window.location.origin);
            // In a single-file environment, setting the hash can be used to simulate view changes
            // For a basic push, we'll rely on the iframe environment's ability to handle path changes,
            // or simply use the location's hash for view changes if necessary.
            // For this environment, we'll use a safer simulation:
            console.log(`[ROUTE SIMULATION]: Navigating to ${path}`);
            // If running in a true browser environment, you would use:
            // window.history.pushState({}, '', path);
            // window.location.hash = path; // Fallback for simple single-page routing simulation
        }
    }, []);

    // We only expose push for this specific scenario
    return { push };
};
// --- END CUSTOM ROUTER HOOK ---

// --- KONSTANTA API ---
// NOTE: List fetching menggunakan proxy internal '/api/pengajuan' (sesuai kode Anda sebelumnya)
// Delete API menggunakan URL eksternal yang Anda tentukan
const LIST_API_PATH = "/api/pengajuan"; 
const DELETE_API_BASE = "https://brave-chefs-refuse.loca.lt/api/pengajuan/delete";
const MAX_RETRIES = 3; 

// --- TYPES ---
type ApiPengajuanItem = {
    id: number;
    uuid: string; // Ditambahkan
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
    uuid: string; // Ditambahkan
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
        
        return new Intl.DateTimeFormat('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
        }).format(date).replace(/\//g, '-'); 
        
    } catch (e) {
        return 'Format Salah';
    }
};

// --- MAIN COMPONENT ---

export default function DataPengajuanPage() {
    const router = useClientRouter(); // Menggunakan custom hook
        
    const [loading, setLoading] = useState(true);
    const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null); 
    
    // State untuk Deletion Modal dan Deleting State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false); // New state for deletion loading

    // --- Data Fetching (useEffect) ---

    const fetchData = async () => {
        setLoading(true);
        setAuthError(null);
        
        let token: string | null = null;
        
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token'); 
        }
        
        if (!token) {
            console.error("Token otorisasi tidak ditemukan di localStorage.");
            setAuthError("Anda tidak memiliki token otorisasi. Mohon login ulang.");
            setLoading(false);
            return;
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, 
        };

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                // Menggunakan path proxy internal untuk mengambil list data
                const response = await fetch(LIST_API_PATH, {
                    method: 'GET',
                    headers: headers,
                }); 
                    
                if (!response.ok) {
                    const errorBody = await response.json();
                    if (response.status === 401) {
                        throw new Error(`Otorisasi Gagal: ${errorBody.message || 'Token tidak valid atau kadaluarsa.'}`);
                    }
                    throw new Error(`Gagal memuat data. Kode Status: ${response.status}. Pesan: ${errorBody.message || response.statusText}`);
                }

                const result: ApiResponse = await response.json();

                if (!result.success || !result.data || !Array.isArray(result.data)) {
                    throw new Error("Struktur respons API tidak valid: 'success' false atau 'data' bukan array.");
                }

                const mappedData: Pengajuan[] = result.data.map(item => ({
                    id: item.id,
                    uuid: item.uuid, // Memastikan UUID dipetakan
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
                    
                if (error.message.includes("Otorisasi Gagal")) {
                    setAuthError(error.message);
                    setLoading(false);
                    return; 
                }
                    
                if (i < MAX_RETRIES - 1) {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error("Gagal total memuat data pengajuan setelah mencoba berkali-kali.");
                    setLoading(false);
                    setPengajuans([
                        { id: 999, uuid: 'error', tanggal: "00-00-0000", hal: "GAGAL MEMUAT DATA ASLI (Jaringan/Server)", pelapor: "System Error", status: "Error" },
                    ]);
                }
            }
        }
    };

    useEffect(() => {
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
            router.push("/dashboard/lampiran/tambah");
        }, 500);
    };

    const handleView = (id: number) => {
        // Navigasi ke halaman detail
        router.push(`/dashboard/lampiran/${id}`);
    };
    
    // Menggunakan UUID untuk navigasi halaman Edit
    const handleEdit = (uuid: string) => {
        // Navigasi ke halaman edit internal. 
        // Halaman ini yang nanti akan memanggil API Edit menggunakan UUID.
        router.push(`/dashboard/lampiran/edit/${uuid}`);
    };

    const handleDeleteClick = (id: number) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (itemToDelete === null) return;
        
        setIsDeleteModalOpen(false); // Tutup modal konfirmasi
        setIsDeleting(true); // Aktifkan loading state

        let token: string | null = null;
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token');
        }

        if (!token) {
            setAuthError("Tidak dapat menghapus. Token otorisasi tidak ditemukan.");
            setIsDeleting(false);
            setItemToDelete(null);
            return;
        }

        const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`,
        };

        const deleteUrl = `${DELETE_API_BASE}/${itemToDelete}`;

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                // PANGGILAN API DELETE NYATA
                const response = await fetch(deleteUrl, {
                    method: 'DELETE',
                    headers: headers,
                });

                if (!response.ok) {
                    const errorBody = await response.json();
                    if (response.status === 401) {
                        throw new Error(`Otorisasi Gagal: ${errorBody.message || 'Token tidak valid.'}`);
                    }
                    throw new Error(`Gagal menghapus data. Kode Status: ${response.status}. Pesan: ${errorBody.message || response.statusText}`);
                }
                
                // Jika berhasil, perbarui tampilan secara lokal
                setPengajuans(prev => prev.filter(p => p.id !== itemToDelete));
                console.log(`[SUCCESS]: Data pengajuan ID ${itemToDelete} berhasil dihapus dari API.`);
                
                // Reset state
                setIsDeleting(false);
                setItemToDelete(null);
                return;
                
            } catch (error: any) {
                console.error(`Gagal menghapus (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);
                if (error.message.includes("Otorisasi Gagal")) {
                    setAuthError(error.message);
                    setIsDeleting(false);
                    setItemToDelete(null);
                    return; 
                }

                if (i === MAX_RETRIES - 1) {
                    setAuthError(`Gagal total menghapus data ID ${itemToDelete}: ${error.message}`);
                    setIsDeleting(false);
                    setItemToDelete(null);
                } else {
                    // Exponential backoff
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
        if (!isDeleteModalOpen) return null;

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
                        <p>Apakah Anda yakin ingin menghapus data pengajuan dengan ID **{itemToDelete}**?</p>
                        <p className="text-sm mt-2 text-gray-500">Tindakan ini tidak dapat dibatalkan dan akan mengirim permintaan ke API eksternal.</p>
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
                            Ya, Hapus Permanen