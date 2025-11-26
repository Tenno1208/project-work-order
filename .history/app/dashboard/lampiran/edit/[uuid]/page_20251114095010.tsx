"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle, Home, Save } from "lucide-react";

// --- CUSTOM ROUTER SIMULATION HOOK (Disarankan di lingkungan ini) ---
const useRouter = () => {
    const push = useCallback((path: string) => {
        if (typeof window !== 'undefined') {
            console.log(`[ROUTE SIMULATION]: Navigating to ${path}`);
        }
    }, []);
    return { push };
};
// ------------------------------------

type FormData = {
    uuid: string;
    hal_id: string;
    keterangan: string;
};

type EditPageProps = {
    params: {
        uuid: string;
    };
};

export default function EditPengajuanForm({ params }: EditPageProps) {
    const router = useRouter();
    const uuid = params.uuid;

    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<FormData | null>(null);
    const [error, setError] = useState<string | null>(null);debugging
    const [debugUrl, setDebugUrl] = useState<string | null>(null); // State untuk URL 
    const [isSaving, setIsSaving] = useState(false);


    // 1. FETCH DATA UNTUK EDIT
    const fetchDataForEdit = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDebugUrl(null);
        
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        
        if (!token) {
            setError("Token otorisasi tidak ditemukan. Harap login ulang.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/pengajuan/edit/${uuid}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                cache: 'no-store',
            });

            const result = await res.json();
            
            if (!res.ok || !result.success) {
                // Tangani error dari API Route Proxy
                const status = res.status;
                let message = result.message || `Gagal mengambil data. Status: ${status}.`;
                
                if (status === 404) {
                    message = `Data pengajuan dengan UUID: ${uuid} tidak ditemukan (404 Not Found).`;
                } else if (status === 401) {
                    message = "Sesi berakhir. Mohon login ulang.";
                }
                
                setError(message);
                setDebugUrl(result.debug_url_eksternal || null); // Ambil URL debug dari server
                console.error(`Error fetching data for edit: ${message}`);
                setLoading(false);
                return;
            }

            // Asumsi structure API Route mengembalikan data: { success: true, data: { ...item } }
            const itemData = result.data;
            
            // Inisialisasi Form Data (Sesuaikan dengan nama field API backend)
            setFormData({
                uuid: itemData.uuid || uuid,
                hal_id: itemData.hal_id?.toString() || '',
                keterangan: itemData.keterangan || itemData.catatan || '',
            });

        } catch (err: any) {
            setError(`Kesalahan jaringan: ${err.message || 'Gagal menghubungi server.'}`);
            console.error("Network error during edit fetch:", err);
        } finally {
            setLoading(false);
        }
    }, [uuid]);

    useEffect(() => {
        fetchDataForEdit();
    }, [fetchDataForEdit]);


    // 2. LOGIKA UPDATE
    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData || isSaving) return;

        setIsSaving(true);
        setError(null);
        
        // Logika POST/PUT ke API Route untuk UPDATE data
        // API Route untuk PUT/PATCH harus dibuat secara terpisah di /api/pengajuan/update/[uuid]/route.ts
        
        try {
            // Simulasi sukses
            await new Promise(resolve => setTimeout(resolve, 1500));
            alert("Data berhasil diperbarui (Simulasi Sukses). Lanjutkan implementasi API PUT/PATCH.");
            router.push("/dashboard/lampiran");

        } catch (err: any) {
            setError(err.message || "Gagal menyimpan data.");
        } finally {
            setIsSaving(false);
        }
    };
    
    // 3. RENDER UI
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32}/>
                <span className="text-xl font-semibold text-gray-700">Memuat data pengajuan...</span>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-xl mt-10">
                <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40}/>
                <h3 className="text-2xl font-bold text-red-600 text-center mb-2">Terjadi Kesalahan!</h3>
                <p className="text-gray-700 text-center mb-6">{error}</p>
                
                {debugUrl && (
                    <div className="text-sm bg-red-50 p-3 rounded-lg border border-red-200 mb-6">
                        <p className="font-semibold text-red-600">URL Eksternal yang Gagal Dihubungi:</p>
                        <p className="text-xs text-red-500 break-words"><code>{debugUrl}</code></p>
                    </div>
                )}

                <button
                    onClick={() => router.push("/dashboard/lampiran")}
                    className="mt-6 w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                    <Home size={18}/> Kembali ke Daftar
                </button>
            </div>
        );
    }

    if (!formData) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <span className="text-xl font-semibold text-gray-700">Data tidak siap.</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto bg-white rounded-xl shadow-lg mt-8">
            <h2 className="text-3xl font-extrabold text-blue-600 border-b pb-4">
                Edit Pengajuan ({uuid.substring(0, 8)}...)
            </h2>
            
            <form onSubmit={handleUpdate} className="space-y-6">
                
                {/* Field 1: UUID (Read-only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">UUID Pengajuan</label>
                    <input 
                        type="text" 
                        value={formData.uuid}
                        readOnly
                        className="mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm p-3 text-sm"
                    />
                </div>

                {/* Field 2: Keterangan / Hal */}
                <div>
                    <label htmlFor="keterangan" className="block text-sm font-medium text-gray-700">Hal / Keterangan</label>
                    <textarea 
                        id="keterangan"
                        value={formData.keterangan}
                        onChange={(e) => setFormData(f => f ? ({ ...f, keterangan: e.target.value }) : null)}
                        rows={4}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        placeholder="Masukkan keterangan atau hal pengajuan..."
                        required
                    />
                </div>
                
                {/* Field 3: Hal ID (Simulasi Dropdown) */}
                <div>
                    <label htmlFor="hal_id" className="block text-sm font-medium text-gray-700">Jenis Hal (ID)</label>
                    <select 
                        id="hal_id"
                        value={formData.hal_id}
                        onChange={(e) => setFormData(f => f ? ({ ...f, hal_id: e.target.value }) : null)}
                        className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white"
                        required
                    >
                        <option value="">-- Pilih Hal --</option>
                        <option value="1">Permintaan Perbaikan</option>
                        <option value="2">Permintaan Pengadaan Barang</option>
                    </select>
                </div>
                
                {/* Tombol Aksi */}
                <div className="flex justify-end space-x-3 pt-4">
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/lampiran")}
                        disabled={isSaving}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="px-6 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:bg-green-400 disabled:scale-100 flex items-center"
                    >
                        {isSaving ? (
                            <Loader2 size={16} className="animate-spin mr-2" />
                        ) : (
                            <Save size={16} className="mr-2" />
                        )}
                        Simpan Perubahan
                    </button>
                </div>
            </form>
        </div>
    );
}