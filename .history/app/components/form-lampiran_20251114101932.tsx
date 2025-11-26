"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle, Home } from "lucide-react";
// Ganti import ini dengan komponen formulir yang sudah diubah namanya (FormLampiranBase)
import FormLampiranBase from "./FormLampiranBase"; 
import { useRouter } from "next/navigation"; 

// --- KONSTANTA API LOKAL ---
// URL ke API Route Next.js untuk GET Detail
const LOCAL_API_EDIT_PATH = "/api/pengajuan/edit";
// API Route untuk data pendukung
const LOCAL_API_HAL_PATH = "/api/hal";
const LOCAL_API_SATKER_PATH = "/api/satker";

// --- TYPES (Perlu disalin dari FormLampiranBase agar Form ini dapat berfungsi) ---
type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type NotificationType = 'success' | 'error' | 'warning';

// --- API TYPE (Simplified, harus sesuai dengan structure di FormLampiranBase) ---
type ApiPengajuanDetail = {
    hal_id: number;
    catatan: string; 
    kepada: string;
    satker: string;
    kode_barang: string;
    keterangan: string; 
    file: string | null; 
    name: string | null; 
    npp: string | null; 
    mengetahui: string | null;
    npp_mengetahui: string | null;
    ttd_pelapor: string | null; 
    id: number;
    uuid: string;
};

// --- DATA STATE UNTUK DIKIRIM KE FORM ---
interface FormDataState {
    hal: string;
    hal_nama: string;
    kepada: string;
    satker: string;
    kodeBarang: string;
    keterangan: string;
    pelapor: string;
    nppPelapor: string;
    mengetahui: string; 
    nppMengetahui: string; 
}


export default function EditPengajuanForm({ params }: { params: { uuid: string } }) {
    const router = useRouter();
    // PERBAIKAN: Langsung akses params.uuid
    const uuid = params.uuid;

    const [initialLoading, setInitialLoading] = useState(true);
    const [formData, setFormData] = useState<FormDataState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    
    // Data pendukung dan file
    const [halOptions, setHalOptions] = useState<HalOption[]>([]);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);
    const [existingFilePaths, setExistingFilePaths] = useState<string[]>([]);
    const [ttdPelaporPreviewUrl, setTtdPelaporPreviewUrl] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: NotificationType, message: string } | null>(null);
    const [nomorSurat, setNomorSurat] = useState<string | null>(null);

    // --- FETCH DATA (Detail Pengajuan dan Data Pendukung) ---
    const fetchData = useCallback(async () => {
        setInitialLoading(true);
        setError(null);

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

            // 2. Fetch Detail Pengajuan menggunakan API Route lokal
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

    // Handler setelah submit berhasil di FormLampiranBase
    const handleSubmissionSuccess = () => {
        setNotification({ type: 'success', message: "Data berhasil diubah!" });
        // Jeda sebentar sebelum redirect, memberi waktu notifikasi terlihat
        setTimeout(() => {
            router.push("/dashboard/lampiran");
        }, 1000);
    };

    if (initialLoading)
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl">Memuat data edit...</span>
            </div>
        );

    if (error || !formData)
        return (
            <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-xl mt-10">
                <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
                <h3 className="text-2xl font-bold text-red-600 text-center mb-2">
                    Terjadi Kesalahan
                </h3>
                <p className="text-gray-700 text-center mb-6">{error || "Data pengajuan tidak ditemukan."}</p>

                {debugUrl && (
                    <div className="text-sm bg-red-50 p-3 rounded-lg border-red-200 mb-6">
                        <p className="font-semibold text-red-600">URL Eksternal yang dicoba:</p>
                        <p className="text-xs text-red-500 break-words">{debugUrl}</p>
                    </div>
                )}

                <button
                    onClick={() => router.push("/dashboard/lampiran")}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg"
                >
                    <Home size={18} className="inline-block mr-2" />
                    Kembali
                </button>
            </div>
        );

    return (
        <div className="max-w-4xl mx-auto mt-8">
            <FormLampiranBase
                initialData={formData}
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
            {/* Tampilkan Notifikasi jika ada */}
            {notification && <Notification notification={notification} setNotification={setNotification} />}
        </div>
    );
}