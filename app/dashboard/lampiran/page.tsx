"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
// Menambahkan ThumbsUp dan ThumbsDown untuk Approve/Reject
import { PlusCircle, Search, Loader2, Eye, Pencil, Trash2, X, AlertTriangle, CheckCircle, ThumbsUp, ThumbsDown } from "lucide-react";

const LIST_API_PATH = "/api/pengajuan"; 
const DELETE_API_BASE = "/api/pengajuan/delete/";
// Menambahkan path API baru untuk Approve/Reject
const APPROVE_REJECT_API_BASE = "/api/pengajuan/status/"; // Asumsi: API endpoint untuk update status menggunakan UUID

const MAX_RETRIES = 1; 

type ApiPengajuanItem = {
    id: number;
    uuid: string; 
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
    name_pelapor: string;
    status: string;
};

type ToastMessage = {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
};

// Tambahkan Type untuk Status Modal
type StatusAction = 'approve' | 'reject';

type StatusModalState = {
    isOpen: boolean;
    action: StatusAction | null;
    id: number | null;
    uuid: string | null;
    hal: string | null;
    isSubmitting: boolean;
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

    // State baru untuk Approve/Reject
    const [statusModal, setStatusModal] = useState<StatusModalState>({
        isOpen: false,
        action: null,
        id: null,
        uuid: null,
        hal: null,
        isSubmitting: false,
    });


    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'success', isVisible: false });

    /**
     * Menampilkan notifikasi toast sementara.
     */
    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        }, 4000); 
    }, []);

    // --- Data Fetching Logic ---
    const fetchData = useCallback(async () => {
        setLoading(true);
        setAuthError(null);
        
        let token: string | null = null;
        
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token'); 
        }
        
        if (!token) {
            console.error("Token otorisasi tidak ditemukan.");
            setAuthError("Gagal memuat data. Mohon login ulang.");
            showToast("Anda tidak memiliki token otorisasi. Mohon login ulang.", 'error');
            setLoading(false);
            return;
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`, 
        };

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(LIST_API_PATH, {
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
                    hal: item.keterangan || item.catatan || 'Tidak Ada Keterangan', 
                    name_pelapor: item.name || item.npp || 'Anonim', // Menggunakan item.name dan item.npp dari ApiPengajuanItem
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

    // --- Action Handlers ---

    const handleBuatPengajuan = () => {
        setCreating(true); 
        router.push("/dashboard/lampiran/tambah");
        setCreating(false); 
    };

    const handleView = (uuid: string) => {
        router.push(`/dashboard/lampiran/view/${uuid}`); 
    };
    
    const handleEdit = (uuid: string) => {
        router.push(`/dashboard/lampiran/edit/${uuid}`);
    };

    // Fungsi untuk membuka modal Approve/Reject
    const handleStatusClick = (id: number, uuid: string, hal: string, action: StatusAction) => {
        if (statusModal.isSubmitting) return;
        setStatusModal({
            isOpen: true,
            action: action,
            id: id,
            uuid: uuid,
            hal: hal,
            isSubmitting: false,
        });
    };

    // Fungsi untuk memproses Approve/Reject
    const handleApproveReject = async () => {
        if (statusModal.uuid === null || statusModal.action === null) {
            showToast("Error: Data pengajuan atau aksi tidak valid.", 'error');
            setStatusModal(prev => ({ ...prev, isOpen: false }));
            return;
        }

        const { uuid, action, hal, id } = statusModal;
        const newStatus = action === 'approve' ? 'Approved' : 'Rejected';

        setStatusModal(prev => ({ ...prev, isSubmitting: true }));

        let token: string | null = null;
        if (typeof window !== 'undefined') {
            token = localStorage.getItem('token');
        }

        if (!token) {
            const errorMsg = "Tidak dapat mengubah status. Token otorisasi tidak ditemukan.";
            showToast(errorMsg, 'error'); 
            setStatusModal(prev => ({ ...prev, isOpen: false, isSubmitting: false }));
            return;
        }

        const headers: HeadersInit = {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            "bypass-tunnel-reminder": "true",
        };

        // Asumsi API untuk update status: POST /api/pengajuan/status/[uuid] dengan body { status: 'Approved' | 'Rejected' }
        const updateUrl = `${APPROVE_REJECT_API_BASE}${uuid}`; 

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(updateUrl, {
                    method: 'POST', // Menggunakan POST untuk perubahan status
                    headers: headers,
                    body: JSON.stringify({ status: newStatus }),
                });

                const responseData = await response.json();

                if (!response.ok) {
                    if (response.status === 401) {
                        showToast(`Sesi Anda berakhir saat ${action === 'approve' ? 'menyetujui' : 'menolak'}. Mohon login ulang.`, 'error');
                        throw new Error(`Otorisasi Gagal: ${responseData.message || 'Token tidak valid'}`);
                    }
                    showToast(responseData.message || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} (Status: ${response.status})`, 'error');
                    throw new Error(responseData.message || `Gagal ${action === 'approve' ? 'menyetujui' : 'menolak'} (Status: ${response.status})`);
                }
                
                // Update status di state lokal
                setPengajuans(prev => prev.map(p => 
                    p.id === id ? { ...p, status: newStatus } : p
                ));

                const successMsg = action === 'approve' 
                    ? `Pengajuan "${hal}" berhasil disetujui (Approved).`
                    : `Pengajuan "${hal}" berhasil ditolak (Rejected).`;
                
                showToast(successMsg, 'success');
                
                setStatusModal({ isOpen: false, action: null, id: null, uuid: null, hal: null, isSubmitting: false });
                return;
                
            } catch (error: any) {
                console.error(`Gagal mengubah status (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);

                if (i === MAX_RETRIES - 1 || error.message.includes("Otorisasi Gagal")) {
                    setStatusModal({ isOpen: false, action: null, id: null, uuid: null, hal: null, isSubmitting: false });
                    return; 
                } else {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
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

        const deleteUrl = `${DELETE_API_BASE}${uuidToDelete}`;

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

    // --- Filtering & Styling (Dibiarkan sama) ---

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
                return "bg-green-100 text-green-700 ring-1 ring-green-300";
            case "rejected":
                return "bg-red-100 text-red-700 ring-1 ring-red-300";
            case "pending":
            case "menunggu":
                return "bg-yellow-100 text-yellow-700 ring-1 ring-yellow-300";
            case "diproses":
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
                        <p>Apakah Anda yakin ingin menghapus data pengajuan dengan ID <strong>{id}</strong> (Hal: {hal})?</p>
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

    // Modal Baru untuk Konfirmasi Approve/Reject
    const StatusConfirmationModal = () => {
        if (!statusModal.isOpen || statusModal.id === null || statusModal.action === null) return null;

        const { id, hal, action, isSubmitting } = statusModal;
        const isApprove = action === 'approve';
        const title = isApprove ? 'Setujui Pengajuan' : 'Tolak Pengajuan';
        const mainColor = isApprove ? 'text-green-600' : 'text-red-600';
        const buttonColor = isApprove ? 'bg-green-600 hover:bg-green-700 disabled:bg-green-400' : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400';
        const Icon = isApprove ? ThumbsUp : ThumbsDown;

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" aria-modal="true">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 scale-100">
                    <div className="flex justify-between items-start border-b pb-3 mb-4">
                        <h3 className={`text-xl font-bold flex items-center gap-2 ${mainColor}`}>
                            <Icon size={24} /> Konfirmasi {title}
                        </h3>
                        <button 
                            onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))} 
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <div className="text-gray-700 mb-6">
                        <p>Apakah Anda yakin ingin **{title.toLowerCase()}** data pengajuan dengan ID <strong>{id}</strong> (Hal: {hal})?</p>
                        <p className="text-sm mt-2 text-gray-500">Status akan diubah menjadi **{isApprove ? 'APPROVED' : 'REJECTED'}**.</p>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setStatusModal(prev => ({ ...prev, isOpen: false }))}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleApproveReject}
                            disabled={isSubmitting}
                            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:scale-100 ${buttonColor}`}
                        >
                            {isSubmitting ? (
                                <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                            ) : null}
                            Ya, {isApprove ? 'Setujui' : 'Tolak'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };


    // --- RENDER ---

    const isAnyModalOpen = isDeleteModalOpen || statusModal.isOpen;
    const isActionInProgress = isDeleting || statusModal.isSubmitting;

    return (
        <div className="p-4 md:p-8 space-y-6 text-gray-800 bg-gray-50 min-h-screen font-sans">
            <DeleteConfirmationModal />
            <StatusConfirmationModal /> {/* Render Modal Status */}
            <Toast toast={toast} setToast={setToast} />

            {/* Global Action Overlay */}
            {isActionInProgress && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center">
                        <Loader2 className={`animate-spin ${isDeleting ? 'text-red-600' : 'text-blue-600'} mr-3`} size={24}/>
                        <span className="text-lg font-semibold text-gray-800">
                            {isDeleting ? `Menghapus data ID ${itemToDelete.id}...` : `Memproses ${statusModal.action === 'approve' ? 'Persetujuan' : 'Penolakan'} ID ${statusModal.id}...`}
                        </span>
                    </div>
                </div>
            )}
            
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <h2 className="text-3xl font-extrabold text-gray-900">Data Pengajuan</h2>
                <button
                    onClick={handleBuatPengajuan}
                    disabled={creating || isActionInProgress}
                    className={`flex items-center gap-2 ${
                        creating || isActionInProgress ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
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
                            <th className="py-3 px-4 text-left font-semibold w-[20%]">Pelapor (Nama)</th>
                            <th className="py-3 px-4 text-left font-semibold w-[15%]">Status</th>
                            <th className="py-3 px-4 text-center font-semibold w-[15%]">Aksi</th> {/* Lebar kolom aksi disesuaikan */}
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
                                    className="bg-white hover:bg-blue-50 transition-colors"
                                >
                                    <td className="py-3 px-4 text-center font-mono">{i + 1}</td>
                                    <td className="py-3 px-4 whitespace-nowrap">{p.tanggal}</td>
                                    <td className="py-3 px-4 line-clamp-2 max-w-xs">{p.hal}</td>
                                    <td className="py-3 px-4 font-medium">{p.name_pelapor}</td>
                                    <td className="py-3 px-4">
                                        <span
                                            className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                getStatusStyle(p.status)
                                            }`}
                                        >
                                            {p.status || 'BELUM DIISI'} 
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-center whitespace-nowrap">
                                        <div className="flex justify-center space-x-1.5"> {/* Jarak antar tombol dikurangi */}
                                            
                                            {/* Action: Approve */}
                                            <button
                                                onClick={() => handleStatusClick(p.id, p.uuid, p.hal, 'approve')}
                                                title="Setujui Pengajuan"
                                                disabled={isActionInProgress || !p.uuid || p.status.toLowerCase() === 'approved'}
                                                className={`p-2 text-green-600 hover:text-green-800 hover:bg-green-100 rounded-full transition-colors ${isActionInProgress || p.status.toLowerCase() === 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <ThumbsUp size={18} />
                                            </button>

                                            {/* Action: Reject */}
                                            <button
                                                onClick={() => handleStatusClick(p.id, p.uuid, p.hal, 'reject')}
                                                title="Tolak Pengajuan"
                                                disabled={isActionInProgress || !p.uuid || p.status.toLowerCase() === 'rejected'}
                                                className={`p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-full transition-colors ${isActionInProgress || p.status.toLowerCase() === 'rejected' ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <ThumbsDown size={18} />
                                            </button>

                                            {/* Action: VIEW (Lihat Detail) */}
                                            <button
                                                onClick={() => handleView(p.uuid)}
                                                title="Lihat Detail (menggunakan UUID)"
                                                disabled={isActionInProgress}
                                                className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors disabled:opacity-50"
                                            >
                                                <Eye size={18} />
                                            </button>
                                            
                                            {/* Action: EDIT (Ubah Data) */}
                                            <button
                                                onClick={() => handleEdit(p.uuid)}
                                                title="Ubah Data (menggunakan UUID)"
                                                disabled={isActionInProgress}
                                                className="p-2 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100 rounded-full transition-colors disabled:opacity-50"
                                            >
                                                <Pencil size={18} />
                                            </button>

                                            {/* Action: DELETE (Hapus Data) */}
                                            <button
                                                onClick={() => handleDeleteClick(p.id, p.uuid, p.hal)}
                                                title="Hapus Data (menggunakan UUID)"
                                                disabled={isActionInProgress || !p.uuid}
                                                className={`p-2 ${p.uuid ? 'text-gray-600 hover:text-red-800 hover:bg-red-100' : 'text-gray-400 cursor-not-allowed'} rounded-full transition-colors disabled:opacity-50`}
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