// app/dashboard/lampiran/edit/[uuid]/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from "react";
// Import Check dan X yang dibutuhkan oleh Notification component
import { Loader2, AlertTriangle, Home, Check, X } from "lucide-react"; 
// Panggil menggunakan path alias yang benar:
import FormLampiranBase from "@/components/form-lampiran"; 
import { useRouter, useParams } from "next/navigation";

// --- KONSTANTA API LOKAL (Sesuaikan path jika API Route Anda ada di tempat lain) ---
const LOCAL_API_EDIT_PATH = "/api/pengajuan/edit";
const LOCAL_API_HAL_PATH = "/api/hal";
const LOCAL_API_SATKER_PATH = "/api/satker";

// --- TYPES (Perlu diimpor atau didefinisikan di sini jika tidak diimpor) ---
type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type NotificationType = 'success' | 'error' | 'warning'; // *** DIPERLUKAN UNTUK NOTIFIKASI ***

// ... (Interface FormDataState dan ApiPengajuanDetail tetap sama) ...

// =========================================================================
// *** DEFINISI ULANG KOMPONEN NOTIFICATION DI SINI ***
// =========================================================================

const Notification = ({ notification, setNotification }: { 
    notification: { type: NotificationType, message: string } | null, 
    setNotification: React.Dispatch<React.SetStateAction<{ type: NotificationType, message: string } | null>> 
}) => {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    if (!notification) return null;

    const baseClasses = "fixed top-4 right-4 z-[1000] p-4 rounded-lg shadow-xl flex items-center gap-3 transition-all duration-300 transform";
    let styleClasses = "";
    let Icon = AlertTriangle;

    switch (notification.type) {
        case 'success':
            styleClasses = "bg-green-100 border-l-4 border-green-500 text-green-700";
            Icon = Check;
            break;
        case 'error':
            styleClasses = "bg-red-100 border-l-4 border-red-500 text-red-700";
            Icon = X;
            break;
        case 'warning':
            styleClasses = "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700";
            Icon = AlertTriangle;
            break;
    }

    return (
        <div className={`${baseClasses} ${styleClasses}`}>
            <Icon size={24} className="flex-shrink-0" />
            <div>
                <div className="font-bold capitalize">{notification.type}</div>
                <div className="text-sm">{notification.message}</div>
            </div>
            <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-gray-700">
                <X size={16} />
            </button>
        </div>
    );
};

// =========================================================================

export default function EditPengajuanForm({ params }: { params: { uuid: string } }) {
    const router = useRouter();
    const routeParams = useParams();
    const uuid = routeParams.uuid as string;

    const [initialLoading, setInitialLoading] = useState(true);
    const [formData, setFormData] = useState<FormDataState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    
    // Data yang akan diteruskan sebagai props ke FormLampiranBase
    const [halOptions, setHalOptions] = useState<HalOption[]>([]);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);
    const [existingFilePaths, setExistingFilePaths] = useState<string[]>([]);
    const [ttdPelaporPreviewUrl, setTtdPelaporPreviewUrl] = useState<string | null>(null);
    // State Notification sudah didefinisikan
    const [notification, setNotification] = useState<{ type: NotificationType, message: string } | null>(null);
    const [nomorSurat, setNomorSurat] = useState<string | null>(null);
    
    // ... (Sisa kode fetchData, useEffect, dan handleSubmissionSuccess tetap sama) ...
    
    // ... (Kode fetchData, useEffect, handleSubmissionSuccess) ...
    const fetchData = useCallback(async () => {
        // ... (Logic fetch, tidak diubah) ...
        setInitialLoading(true);
        setError(null);
        setDebugUrl(null);

        const token = localStorage.getItem("token");
        if (!token) {
            setError("Token tidak ditemukan. Silakan login.");
            setInitialLoading(false);
            return;
        }
        const headers = { Authorization: `Bearer ${token}` };

        try {
            // 1. Fetch Data Pendukung (Hal dan Satker)
            const [halRes, satkerRes] = await Promise.all([
                fetch(LOCAL_API_HAL_PATH, { headers, cache: "no-store" }),
                fetch(LOCAL_API_SATKER_PATH, { headers, cache: "no-store" }),
            ]);

            const [halJson, satkerJson] = await Promise.all([halRes.json(), satkerRes.json()]);

            let halOptionsMap: HalOption[] = [];
            if (halJson?.success && Array.isArray(halJson.data)) {
                halOptionsMap = halJson.data.map((item: any) => ({ id: item.id, nama_jenis: item.nama_jenis }));
                setHalOptions(halOptionsMap);
            }
            let satkersMap: SatkerDef[] = [];
            if (Array.isArray(satkerJson?.data)) {
                satkersMap = satkerJson.data.map((item: any) => ({ id: item.id?.toString(), label: item.satker_name, jabatan: item.jabsatker || "Ka.Unit" }));
                setSatkers(satkersMap);
            }

            // 2. Fetch Detail Pengajuan menggunakan API Route lokal (/api/pengajuan/edit/[uuid])
            const detailRes = await fetch(`${LOCAL_API_EDIT_PATH}/${uuid}`, { headers, cache: "no-store" });
            const result = await detailRes.json();

            if (!detailRes.ok || !result.success) {
                setError(result.message || "Gagal memuat data detail pengajuan.");
                setDebugUrl(result.debug_url_eksternal || null);
                setInitialLoading(false);
                return;
            }

            const item: ApiPengajuanDetail = result.data;
            const halOption = halOptionsMap.find(opt => opt.id === item.hal_id);
            const selectedSatker = satkersMap.find(s => s.label === item.satker);

            // A. Set Form Data Utama
            setFormData({
                hal: item.hal_id?.toString() || "",
                hal_nama: halOption?.nama_jenis || item.catatan || "",
                kepada: item.kepada || "",
                satker: selectedSatker?.id || "", // Menggunakan ID Satker
                kodeBarang: item.kode_barang || "",
                keterangan: item.keterangan || item.catatan || "",
                pelapor: item.name || "",
                nppPelapor: item.npp || "",
                mengetahui: item.mengetahui || "",
                nppMengetahui: item.npp_mengetahui || "",
            });

            // B. Handle File yang sudah ada
            if (item.file) {
                try {
                    const existingFiles = JSON.parse(item.file);
                    if (Array.isArray(existingFiles)) {
                        setExistingFilePaths(existingFiles); 
                    }
                } catch (e) { /* ignore parse error */ }
            }
            
            // C. Handle Tanda Tangan
            if (item.ttd_pelapor) {
                const ttdUrl = item.ttd_pelapor.startsWith('http') ? item.ttd_pelapor : `/${item.ttd_pelapor}`;
                setTtdPelaporPreviewUrl(ttdUrl); 
            }
            
            // D. Set Nomor Surat
            const currentNomorSurat = `SPK-EDIT-${item.id}`;
            setNomorSurat(currentNomorSurat);
            localStorage.setItem(`nomor_surat_${uuid}`, currentNomorSurat);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setInitialLoading(false);
        }
    }, [uuid]);

    useEffect(() => {
        if (uuid) {
            fetchData();
        }
    }, [fetchData, uuid]);

    const handleSubmissionSuccess = () => {
        setNotification({ type: 'success', message: "Data berhasil diubah!" });
        localStorage.removeItem('current_edit_uuid'); 
        setTimeout(() => {
            router.push("/dashboard/lampiran");
        }, 1000);
    };

    // ... (Sisa kode render if/else) ...
    
    if (initialLoading)
    // ... (Render Loading)

    if (error || !formData)
    // ... (Render Error)

    return (
        <div className="max-w-4xl mx-auto mt-8">
            <FormLampiranBase
                initialData={formData!} // Menggunakan non-null assertion karena sudah dicek di atas
                isEditMode={true}
                uuid={uuid}
                halOptions={halOptions}
                satkers={satkers}
                nomorSurat={nomorSurat}
                existingFilePaths={existingFilePaths}
                ttdPelaporPreviewUrl={ttdPelaporPreviewUrl}
                
                setNotification={setNotification}
                onSubmissionSuccess={handleSubmissionSuccess}
            />
            {notification && <Notification notification={notification} setNotification={setNotification} />}
        </div>
    );
}