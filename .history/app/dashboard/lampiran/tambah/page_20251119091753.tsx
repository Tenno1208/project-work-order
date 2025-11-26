"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload, X, Check, AlertTriangle, Loader2, PlusCircle, History } from "lucide-react"; 
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select";


// Tentukan Base URL dan Path API
const EXTERNAL_EDIT_BASE_URL = process.env.NEXT_PUBLIC_EDIT_BASE_URL || "https://brave-chefs-refuse.loca.lt";
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt"; 
const SUBMIT_API_PATH = "/api/pengajuan"; 
const DETAIL_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/detail`;
const UPDATE_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/update`; 
const MAX_RETRIES = 1;
const MAX_FILES = 4; 
const TTD_PROXY_PATH = "/api/ttd-proxy"; 


// --- TYPES BARU ---
type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type NotificationType = 'success' | 'error' | 'warning';

type PegawaiDef = { 
    id: number; 
    name: string; 
    npp: string; 
    satker_id: number; 
    jabatan: string; 
};

type ApiPengajuanDetail = {
    id: number;
    uuid: string; 
    hal_id: number;
    catatan: string; 
    kepada: string;
    satker: string;
    kode_barang: string;
    keterangan: string; 
    file_paths: string | null; 
    status: string;
    name: string | null; 
    npp: string | null; 
    mengetahui: string | null;
    npp_mengetahui: string | null;
    ttd_pelapor: string | null; 
    created_at: string;
};

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


interface ModalContent {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

// --- Notification & Modal Components (Dibiarkan sama) ---
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

const ConfirmationModal = ({ isOpen, content }: { isOpen: boolean, content: ModalContent | null }) => {
    if (!isOpen || !content) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000]">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-sm transform transition-all">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{content.title}</h3>
                <p className="text-sm text-gray-600 mb-6">{content.message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={content.onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={content.onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 transition"
                    >
                        Ya, {content.title.includes("Ubah") ? "Ubah Data" : "Ajukan"}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- MODAL BARU UNTUK RIWAYAT TTD ---
const TtdHistoryModal = ({ 
    isOpen, 
    history, 
    onSelect, 
    onClose 
}: { 
    isOpen: boolean, 
    history: string[], 
    onSelect: (url: string) => void, 
    onClose: () => void 
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000]">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-lg transform transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <History size={24} className="text-blue-600"/> Pilih Tanda Tangan
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Terdapat {history.length} Tanda Tangan yang pernah Anda gunakan. Silakan pilih salah satu untuk diterapkan.
                </p>
                
                <div className="grid grid-cols-3 gap-4 max-h-80 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                    {history.map((url, index) => (
                        <div 
                            key={index} 
                            onClick={() => onSelect(url)}
                            className="p-2 border-2 border-gray-200 hover:border-blue-500 rounded-lg cursor-pointer transition-all bg-white shadow-sm"
                        >
                            <img 
                                src={url} 
                                alt={`TTD ${index + 1}`} 
                                className="w-full h-16 object-contain"
                            />
                            <p className="text-xs text-center mt-1 text-gray-500">TTD #{index + 1}</p>
                        </div>
                    ))}
                </div>

                <div className="flex justify-end gap-3 mt-6">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
};



async function makeImageTransparent(imgUrl: string, token: string): Promise<string> {
    if (imgUrl.startsWith('data:')) {
        return imgUrl; 
    }

    return new Promise(async (resolve) => {
        try {
            console.log(`⏳ Mencoba fetch gambar TTD: ${imgUrl}`); // DEBUG: Log URL yang di-fetch
            const res = await fetch(imgUrl, {
                headers: {
                    'Authorization': `Bearer ${token.replace('Bearer ', '')}`, // Pastikan hanya token murni yang ada
                    'Accept': 'image/png, image/jpeg, image/gif',
                },
            });

            if (!res.ok) {
                // Log respons error jika gagal
                const errorText = await res.text();
                console.error(`❌ Gagal fetch gambar TTD (${res.status}): ${imgUrl}. Respon: ${errorText.substring(0, 100)}...`);
                return resolve(imgUrl); // Fallback ke URL asli
            }
            
            // ... (lanjutkan ke Konversi Blob dan Canvas seperti sebelumnya)

            // 2. Konversi ke Blob
            const imageBlob = await res.blob();
            
            // Periksa Content Type di frontend
            if (!imageBlob.type.startsWith('image/')) {
                console.error(`❌ Tipe konten bukan gambar: ${imageBlob.type}. URL: ${imgUrl}`);
                return resolve(imgUrl); 
            }

            // 3. Konversi Blob ke Data URL Base64
            const dataUrl: string = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(imageBlob);
            });
            
            // 4. Proses Transparansi menggunakan Canvas
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = dataUrl;
            
            img.onload = () => {
                // ... (Logika konversi Canvas tetap sama)
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d")!;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                // ... (Logika pengambilan ImageData dan transparansi tetap sama)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const whiteThreshold = 235;
                const blackThreshold = 35;
                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const brightness = (r + g + b) / 3;
                    if (brightness > whiteThreshold || brightness < blackThreshold) {
                        data[i + 3] = 0;
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => {
                console.error(`❌ Gagal render Base64 di Canvas: ${imgUrl}`);
                resolve(imgUrl);
            };
        } catch (error) {
            console.error("❌ Error tak terduga selama TTD fetch/conversion:", error);
            resolve(imgUrl); 
        }
    });
}


export default function LampiranPengajuanPage() {
    const router = useRouter();
    
    // --- STATE BARU UNTUK EDIT MODE (Dibiarkan sama) ---
    const [editUuid, setEditUuid] = useState<string | null>(null);
    const isEditMode = !!editUuid;
    const [existingFilePaths, setExistingFilePaths] = useState<string[]>([]); 
    // ---------------------------------

    const [loading, setLoading] = useState(true);
    // NILAI AWAL DIUBAH MENJADI FALSE, AGAR LOADING HILANG SAAT KOMPONEN PERTAMA KALI DI-RENDER
    const [initialLoading, setInitialLoading] = useState(false); 
    const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);
    const [halOptions, setHalOptions] = useState<HalOption[]>([]);

    const [allPegawai, setAllPegawai] = useState<PegawaiDef[]>([]);

    const [form, setForm] = useState<FormDataState>({
        hal: "",
        hal_nama: "",
        kepada: "",
        satker: "",
        kodeBarang: "",
        keterangan: "",
        pelapor: "",
        nppPelapor: "",
        mengetahui: "", 
        nppMengetahui: "", 
    });

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]); // Ref untuk multiple input files
    const [files, setFiles] = useState<File[]>([]);
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [ttdPelaporFile, setTtdPelaporFile] = useState<File | null>(null);
    const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
    const [ttdScale, setTtdScale] = useState(1);
    const nodeRef = useRef(null);

    const [notification, setNotification] = useState<{ type: NotificationType, message: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);

    // --- STATE BARU UNTUK RIWAYAT TTD ---
    const [ttdHistory, setTtdHistory] = useState<string[]>([]);
    const [isTtdHistoryModalOpen, setIsTtdHistoryModalOpen] = useState(false);
    const ttdFileInputRef = useRef<HTMLInputElement>(null); // Ref untuk input file TTD manual
    // ------------------------------------


   // ...

// PENGAMBILAN RIWAYAT TTD (Diperbarui untuk mengirim token)
const fetchTtdHistory = useCallback(async (token: string, npp: string) => {
    try {
        // 1. Memanggil endpoint proxy lokal TTD (Mengembalikan JSON)
        const res = await fetch(`${TTD_PROXY_PATH}/${npp}`, { 
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });
        
        if (res.ok) {
            const json = await res.json();
            
            let ttdPaths: string[] = [];

            // Logika Adaptif: Cek format API
            if (json.ttd_url && typeof json.ttd_url === 'string') {
                ttdPaths = [json.ttd_url];
            } else if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                ttdPaths = json.data.map((item: any) => item.path || item.url).filter((url: string) => url);
            }

            if (ttdPaths.length > 0) {
                const processedUrls = await Promise.all(
                    ttdPaths.map(async (path: string) => {
                        // 2. Tentukan Final URL (Base URL + Path TTD)
                        const finalUrl = path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/^\//, '')}`;
                        
                        // 3. PANGGIL makeImageTransparent DENGAN TOKEN untuk fetch gambar
                        return makeImageTransparent(finalUrl, token); 
                    })
                );
                
                // Simpan semua TTD yang sudah di-Base64 ke riwayat
                setTtdHistory(processedUrls);

                // 4. Set TTD yang paling baru (yang pertama) sebagai preview aktif
                if (processedUrls.length > 0) {
                    setTtdPelaporPreview(processedUrls[0]);
                }
            } else {
                console.warn("No TTD history found in JSON response.");
            }
        } else {
            console.warn("No TTD history found or API failed:", res.status);
        }
    } catch (err) {
        console.error("Error fetching TTD history:", err);
        setNotification({ type: 'error', message: 'Gagal memuat riwayat tanda tangan.' });
    }
}, []);


    // #################################################
    // PENGAMBILAN DATA DETAIL JIKA MODE EDIT
    // #################################################
    const fetchPengajuanDetail = useCallback(async (token: string, uuid: string, halOptions: HalOption[], satkers: SatkerDef[]) => {
        setInitialLoading(true);
        try {
            const res = await fetch(`${DETAIL_API_PATH}/${uuid}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            
            if (!res.ok) throw new Error(`Gagal memuat detail pengajuan. Status: ${res.status}`);
            
            const result = await res.json();
            const data: ApiPengajuanDetail = result.data;

            const halOption = halOptions.find(opt => opt.id === data.hal_id);

            setForm({
                hal: data.hal_id?.toString() || "",
                hal_nama: halOption?.nama_jenis || data.catatan || "",
                kepada: data.kepada || "",
                satker: satkers.find(s => s.label === data.satker)?.id || "", 
                kodeBarang: data.kode_barang || "",
                keterangan: data.keterangan || data.catatan || "",
                pelapor: data.name || "",
                nppPelapor: data.npp || "",
                mengetahui: data.mengetahui || "",
                nppMengetahui: data.npp_mengetahui || "",
            });


            if (data.file_paths) {
                try {
                    let rawPaths: string[] = [];
                    const pathsString = data.file_paths.trim();

                    // --- Coba 1: Parse sebagai Array JSON (Menangani string JSON yang di-escape dari DB) ---
                    try {
                        const parsed = JSON.parse(pathsString);
                        if (Array.isArray(parsed)) {
                            rawPaths = parsed;
                        } else {
                            throw new Error("Not a JSON array.");
                        }
                    } catch {
                        const cleanString = pathsString.replace(/\\/g, '').replace(/[\[\]"]/g, '');
                        rawPaths = cleanString.split(',').map(s => s.trim()).filter(s => s.length > 0);
                    }
                    
                    // --- Sanitasi setiap Path di dalam Array ---
                    const baseUrl = EXTERNAL_EDIT_BASE_URL.endsWith('/') ? EXTERNAL_EDIT_BASE_URL.slice(0, -1) : EXTERNAL_EDIT_BASE_URL;
                    
                    const finalFilePaths = rawPaths.map(path => {
                        let cleanPath = path.replace(/\\/g, '/').replace(/\/\//g, '/');
                        
                        if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) {
                            return cleanPath; // Sudah URL lengkap
                        }
                        
                        // Tambahkan Base URL hanya jika path relatif
                        return `${baseUrl}/${cleanPath.replace(/^\//, '')}`;
                    });
                    
                    setExistingFilePaths(finalFilePaths); 
                    setPreviews(finalFilePaths); 

                } catch (e) {
                    console.error("❌ Error memproses file path:", e);
                    setNotification({ type: 'warning', message: `Gagal memproses lampiran file lama.` });
                }
            }

if (data.ttd_pelapor) {
    const ttdUrl = data.ttd_pelapor.startsWith('http') ? data.ttd_pelapor : `${EXTERNAL_EDIT_BASE_URL}/${data.ttd_pelapor.replace(/^\//, '')}`; 

    const currentToken = localStorage.getItem("token") || '';
    setTtdPelaporPreview(await makeImageTransparent(ttdUrl, currentToken)); 
}

        } catch (err: any) {
            console.error("❌ Error ambil data detail pengajuan:", err.message);
            setNotification({ type: 'error', message: `Gagal memuat detail pengajuan: ${err.message}. Kembali ke daftar.` });
            localStorage.removeItem('current_edit_uuid');
            router.push("/dashboard/lampiran");
        } finally {
            setInitialLoading(false);
        }
    }, [router]);


    // #################################################
    // MAIN USE EFFECT: Load initial data & check edit mode 
    // #################################################
    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUuid = localStorage.getItem("current_edit_uuid");
        setEditUuid(storedUuid);

        if (!token) {
            router.push("/");
            return;
        }

        const fetchInitialData = async () => {
            if (!storedUuid) {
                 setInitialLoading(true);
            }
            const headers = { Authorization: `Bearer ${token}` };

            try {
                const userRes = await fetch("/api/me", { headers });
                const userData = await userRes.json();
                let userNpp = null;

                if (userData?.nama && userData?.npp) {
                    userNpp = userData.npp;
                    setUser({ nama: userData.nama, npp: userData.npp });
                    if (!storedUuid) { // Hanya isi form secara otomatis jika mode tambah baru
                        setForm((f) => ({
                            ...f,
                            pelapor: userData.nama,
                            nppPelapor: userData.npp,
                        }));
                    }
                }

                // 2. Fetch Hal Options
                const halRes = await fetch("/api/hal", { headers, cache: "no-store" });
                const halJson = await halRes.json();
                let halOptionsMap: HalOption[] = [];
                if (halJson?.success && Array.isArray(halJson.data)) {
                    halOptionsMap = halJson.data.map((item: any) => ({
                        id: item.id,
                        nama_jenis: item.nama_jenis,
                    }));
                    setHalOptions(halOptionsMap);
                }

                // 3. Fetch Satker Options
                const satkerRes = await fetch("/api/satker", { headers });
                const satkerData = await satkerRes.json();
                let satkersMap: SatkerDef[] = [];
                if (Array.isArray(satkerData?.data)) {
                    satkersMap = satkerData.data.map((item: any) => ({
                        id: item.id?.toString(),
                        label: item.satker_name,
                        jabatan: item.jabsatker || "Ka.Unit",
                    }));
                    setSatkers(satkersMap);
                }
                
                const pegawaiRes = await fetch("/api/all-pegawai", { headers });
                const pegawaiJson = await pegawaiRes.json();
                let pegawaiMap: PegawaiDef[] = [];

                if (pegawaiJson?.success && Array.isArray(pegawaiJson.data)) {
                    pegawaiMap = pegawaiJson.data.map((item: any) => ({
                        id: item.id,
                        name: item.name,
                        npp: item.npp,
                        satker_id: item.satker_id,
                        jabatan: item.jabatan || item.position || "Pegawai", 
                    }));
                    setAllPegawai(pegawaiMap);
                }

                if (userNpp) {
                    await fetchTtdHistory(token, userNpp);
                }
                
                if (storedUuid) {
                    await fetchPengajuanDetail(token, storedUuid, halOptionsMap, satkersMap);
                } else {
                    setInitialLoading(false);
                }

            } catch (err: any) {
                console.error("❌ Error fetch data pendukung:", err.message);
                setNotification({ type: 'error', message: `Gagal memuat data pendukung: ${err.message}` });
                setInitialLoading(false);
            }
        };

        fetchInitialData();

    }, [router, fetchPengajuanDetail, fetchTtdHistory]);


    // #################################################
    // HANDLER LOGIC
    // #################################################
    
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    // ... (di dalam function LampiranPengajuanPage)

useEffect(() => {
    const satkerId = form.satker; // ID Satker yang dipilih (berbentuk string)
    const selectedSatker = satkers.find(s => s.id === satkerId);
    
    // 1. Cek Pra-kondisi
    if (!satkerId || !selectedSatker || allPegawai.length === 0) {
        setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
        return;
    }

    const targetJabatanSatkerLabel = selectedSatker.jabatan; // "Kepala Sub Bagian TU, RT, dan Humas"
    
    // --- STRATEGI PENCARIAN BARU: Berdasarkan ID Satker + Kata Kunci Pimpinan ---
    
    // 2. Filter semua pegawai yang berada di Satker ID yang dipilih
    const pegawaiDiSatker = allPegawai.filter(peg => 
        String(peg.satker_id) === satkerId
    );

    // 3. Tentukan Pegawai Pimpinan Unit
    // Kita cari pegawai yang jabatannya mengandung kata kunci pimpinan (Kepala/Kabag/Kasi)
    const penanggungJawab = pegawaiDiSatker.find(peg => {
        const pegJabatanLower = peg.jabatan.toLowerCase();

        // Cari jabatan pimpinan yang sesuai dengan level satker
        const isKepalaUnit = (
            pegJabatanLower.includes('kepala') || 
            pegJabatanLower.includes('kabag') || 
            pegJabatanLower.includes('kasi') || 
            pegJabatanLower.includes('kasubag')
        );
        
        // Sebagai fallback, pastikan pimpinan memiliki nama satker yang terkandung (opsional tapi bagus)
        const isJabatanSpecific = pegJabatanLower.includes(selectedSatker.label.toLowerCase().split(' ')[0] || '');

        return isKepalaUnit && isJabatanSpecific;
    }) || pegawaiDiSatker.find(peg => peg.jabatan.toLowerCase().includes('kepala')); // Fallback yang lebih luas jika yang spesifik gagal

    if (penanggungJawab) {
        setForm(prev => ({
            ...prev,
            mengetahui: penanggungJawab.name,
            nppMengetahui: penanggungJawab.npp,
        }));
        setNotification({ type: 'success', message: `Mengetahui terisi otomatis: ${penanggungJawab.name} (${penanggungJawab.jabatan})` });
    } else {
        // Kosongkan dan beri notifikasi
        setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
        setNotification({ type: 'warning', message: `Tidak ditemukan Pimpinan Satker (${targetJabatanSatkerLabel}) di Satker ini. Harap isi manual.` });
    }
}, [form.satker, satkers, allPegawai, setNotification]);

    const handleHalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedOption = halOptions.find(opt => String(opt.id) === selectedId);

        setForm(p => ({
            ...p,
            hal: selectedId,
            hal_nama: selectedOption ? selectedOption.nama_jenis : "",
        }));
    };

    /**
     * Handler untuk menambahkan satu file baru ke array files dan previews
     * @param e Event perubahan input file
     */
    const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const newFile = e.target.files[0];

        // Reset input agar bisa di-trigger lagi (penting untuk input type="file" berulang)
        e.target.value = ''; 

        if (previews.length >= MAX_FILES) {
            setNotification({ type: 'warning', message: `Maksimum upload adalah ${MAX_FILES} file.` });
            return;
        }

        // Tambahkan file baru ke state files
        setFiles(prev => [...prev, newFile]);
        
        // Buat URL preview baru dan tambahkan ke state previews
        const newPreviewUrl = URL.createObjectURL(newFile);
        setPreviews(prev => [...prev, newPreviewUrl]);
    };

    /**
     * Handler untuk menghapus file dari daftar
     * @param index Index file di array previews
     */
    const handleRemoveFile = (index: number) => {
        const isExistingFile = index < existingFilePaths.length;

        // 1. Update Existing File Paths (jika file lama yang dihapus)
        if (isExistingFile) {
            setExistingFilePaths(prev => prev.filter((_, i) => i !== index));
        }

        // 2. Update New Files (jika file baru yang dihapus)
        if (!isExistingFile) {
            // Kita harus menghitung index file baru yang relevan
            const newFileIndex = index - existingFilePaths.length;
            setFiles(prev => prev.filter((_, i) => i !== newFileIndex));
        }

        // 3. Update Previews (visual)
        const removedPreview = previews[index];
        setPreviews(prev => prev.filter((_, i) => i !== index));
        
        // Membersihkan URL objek yang dibuat sebelumnya untuk menghindari memory leak
        if (!removedPreview.startsWith('http')) { 
            URL.revokeObjectURL(removedPreview);
        }
    };

    // --- LOGIC TTD BARU ---
    
    // Handler untuk manual file upload (fallback)
    const handleTtdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setTtdPelaporFile(file);
        const previewUrl = URL.createObjectURL(file);
        const transparentUrl = await makeImageTransparent(previewUrl);
        setTtdPelaporPreview(transparentUrl);
        
        // Reset input value agar user bisa memilih file yang sama lagi jika perlu
        e.target.value = ''; 
    };

    // Handler untuk memilih TTD dari Riwayat (Modal)
    const handleTtdSelectionFromHistory = (url: string) => {
        setTtdPelaporPreview(url); // URL sudah dalam bentuk transparent Data URL
        setTtdPelaporFile(null); // Clear file state, menandakan TTD dari history (tidak perlu diupload)
        setIsTtdHistoryModalOpen(false);
    };

    // Handler untuk tombol TTD utama
    const handleTtdButtonClick = () => {
        if (ttdHistory.length > 0) {
            // Terdapat riwayat, tampilkan modal
            setIsTtdHistoryModalOpen(true);
        } else {
            // Tidak ada riwayat, langsung trigger input file manual
            ttdFileInputRef.current?.click();
        }
    };
    // --- END LOGIC TTD BARU ---


    const handlePrint = () => {
        setIsPrintMode(true);
        setTimeout(() => {
            window.print();
            setIsPrintMode(false);
        }, 300);
    };

    const proceedSubmission = useCallback(async () => {
        setIsModalOpen(false); 
        setIsSubmitting(true);
        
        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setNotification({ type: 'error', message: "Token tidak ditemukan. Silakan login ulang." });
                return;
            }

            const formDataToSend = new FormData();
            
            // 1. Tambahkan data form
            Object.entries(form).forEach(([key, value]) => {
                formDataToSend.append(key, value);
            });
            
            // 2. Tambahkan file lampiran baru (file0, file1, ...)
            files.forEach((file, index) => {
                // Gunakan index terpisah untuk file baru agar backend membedakannya
                formDataToSend.append(`new_file_${index}`, file); 
            });

            // 3. Tambahkan TTD baru (jika ada)
            if (ttdPelaporFile) {
                formDataToSend.append('ttdPelapor', ttdPelaporFile);
            }
            // 3b. Jika TTD dari riwayat (ttdPelaporPreview ada tapi ttdPelaporFile tidak), 
            // kirim URL yang digunakan agar backend tahu TTD apa yang dipakai.
            else if (ttdPelaporPreview && !isEditMode) {
                // Asumsi: Backend bisa menerima data:URL atau URL path sebagai string
                formDataToSend.append('ttdPelaporPath', ttdPelaporPreview);
            }


            // 4. Jika mode edit, sertakan UUID dan daftar file yang tersisa (termasuk yang lama)
            if (isEditMode && editUuid) {
                formDataToSend.append('uuid', editUuid);
                // Kirim array path file lama yang TIDAK dihapus
                formDataToSend.append('existingFiles', JSON.stringify(existingFilePaths)); 
            }

            // Tentukan URL dan Method berdasarkan mode
            const submitUrl = isEditMode ? `${UPDATE_API_PATH}/${editUuid}` : SUBMIT_API_PATH;
            const method = isEditMode ? "PUT" : "POST";
            
            let finalResult: any = null;

            for (let i = 0; i < MAX_RETRIES; i++) {
                try {
                    const res = await fetch(submitUrl, {
                        method: method,
                        headers: {
                            "Authorization": `Bearer ${token}`, 
                        },
                        body: formDataToSend,
                    });
    
                    finalResult = await res.json();
    
                    if (!res.ok || !finalResult.success) { // Periksa res.ok dan finalResult.success
                        throw new Error(finalResult.message || `Gagal ${isEditMode ? 'mengubah' : 'mengajukan'}. Status: ${res.status}`);
                    }

                    if (finalResult.success) {
                        setNotification({ 
                            type: 'success', 
                            message: finalResult.message || `Pengajuan berhasil ${isEditMode ? 'diubah' : 'dikirim'}!` 
                        });
                        // Bersihkan UUID edit setelah sukses, lalu redirect
                        localStorage.removeItem('current_edit_uuid'); 
                        router.push("/dashboard/lampiran"); 
                        return;
                    }

                } catch (error: any) {
                    console.error(`Gagal submit (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);
                    if (i === MAX_RETRIES - 1) throw error; // Re-throw error after last retry
                    await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
                }
            }

        } catch (error: any) {
            console.error("Error saat submit data:", error);
            setNotification({ 
                type: 'error', 
                message: `Error jaringan/server: ${error.message}` 
            });
        } finally {
            setIsSubmitting(false);
        }
    }, [form, files, ttdPelaporFile, ttdPelaporPreview, isEditMode, editUuid, existingFilePaths, router]);


    const handleAjukan = async () => {
        const wajibDiisi = [
            { field: "hal", label: "Hal" },
            { field: "kepada", label: "Kepada" },
            { field: "satker", label: "Satker" },
            { field: "kodeBarang", label: "Kode Barang" },
            { field: "keterangan", label: "Keterangan" },
            { field: "pelapor", label: "Nama Pelapor" },
            { field: "nppPelapor", label: "NPP Pelapor" },
        ];

        const kosong = wajibDiisi.filter((f) => !form[f.field as keyof FormDataState]);

        if (kosong.length > 0) {
            setNotification({ 
                type: 'error', 
                message: `Data berikut belum lengkap: ${kosong.map((f) => f.label).join(", ")}` 
            });
            return;
        }

        if (!ttdPelaporFile && !ttdPelaporPreview) {
            setNotification({ type: 'error', message: "Harap upload tanda tangan pelapor atau pastikan TTD lama/riwayat termuat." });
            return;
        }

        if (files.length === 0 && existingFilePaths.length === 0) {
            setModalContent({
                title: `Konfirmasi ${isEditMode ? 'Perubahan' : 'Pengajuan'}`,
                message: "Belum ada foto/lampiran yang diunggah. Yakin ingin tetap melanjutkan?",
                onConfirm: proceedSubmission,
                onCancel: () => setIsModalOpen(false),
            });
            setIsModalOpen(true);
            return;
        }
        
        setModalContent({
            title: `Konfirmasi ${isEditMode ? 'Perubahan' : 'Pengajuan'}`,
            message: `Anda akan ${isEditMode ? 'mengubah data pengajuan ini' : 'mengirimkan pengajuan baru'}. Lanjutkan?`,
            onConfirm: proceedSubmission,
            onCancel: () => setIsModalOpen(false),
        });
        setIsModalOpen(true);
    };

    const formatDate = (d: Date) =>
        `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${d.getFullYear()}`;
    const todayStr = `Semarang, ${formatDate(new Date())}`;
    const selectedSatker = satkers.find((s) => s.id === form.satker);
    const jabatan = selectedSatker?.jabatan || "Ka.Unit";
    
    // Total file yang sudah ada (lama + baru)
    const totalFilesCount = previews.length;
    const isMaxFilesReached = totalFilesCount >= MAX_FILES;

    return (
        <div className="p-6 min-h-screen">
            <style>{`
                @page { size: A4; margin: 20mm; }
                @media print {
                    body * { visibility: hidden !important; }
                    #print-area, #print-area * { visibility: visible !important; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    /* Style untuk elemen form agar terlihat seperti teks saat print */
                    #print-area input, #print-area select, #print-area textarea, 
                    #print-area .react-select__control {
                        border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important;
                    }
                    /* Mengganti Select dengan teks plain saat print */
                    .select-print-only { display: block !important; }
                    .select-input-only { display: none !important; }
                }
                .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
                .select-print-only { display: none; }
                .ttd-container { border: 1px solid #ccc; }
            `}</style>

            <Notification notification={notification} setNotification={setNotification} />
            <ConfirmationModal isOpen={isModalOpen} content={modalContent} />
            <TtdHistoryModal 
                isOpen={isTtdHistoryModalOpen} 
                history={ttdHistory} 
                onSelect={handleTtdSelectionFromHistory} 
                onClose={() => setIsTtdHistoryModalOpen(false)}
            />

            <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
                <div className="p-4 flex items-center justify-between border-b no-print">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded text-white"><Droplet /></div>
                        <div>
                            <div className="font-semibold text-base">
                                {isEditMode ? `Edit Pengajuan (UUID: ${editUuid?.substring(0, 8)}...)` : "Lampiran Pengajuan Perbaikan"}
                            </div>
                            <div className="text-xs text-gray-500">Form PDAM — preview dan print satu halaman</div>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 transition"
                    >
                        <Printer size={16} /> Cetak
                    </button>
                </div>

                <div id="print-area" className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-bold text-sm">PERUMDA AIR MINUM TIRTA MOEDAL</div>
                            <div className="font-bold text-sm">KOTA SEMARANG</div>
                        </div>
                        <div className="text-right text-sm">
                            {/* <div>No. Surat: <strong>{nomorSurat || "Belum ada"}</strong></div> */}
                            <div>{todayStr}</div>
                        </div>
                    </div>

                    <div className="mt-4 flex gap-20">
                        <div className="w-1/2 text-sm font-semibold">
                            Hal:
                            {isPrintMode ? (
                                <span className="ml-2 font-normal">{form.hal_nama}</span> 
                            ) : (
                                <select
                                    name="hal"
                                    value={form.hal}
                                    onChange={handleHalChange}
                                    className="ml-2 w-3/4 p-1 border border-gray-300 rounded bg-white text-sm select-input-only"
                                >
                                    <option value="">-- Pilih Hal --</option>
                                    {halOptions.length === 0 ? (
                                        <option disabled>Memuat data...</option>
                                    ) : (
                                        halOptions.map((opt) => (
                                            <option key={opt.id} value={opt.id}> 
                                                {opt.nama_jenis}
                                            </option>
                                        ))
                                    )}
                                </select>
                            )}
                        </div>

                        <div className="w-1/2 text-sm">
                            Kepada Yth. <br />
                            {isPrintMode ? (
                                <div className="font-semibold">{form.kepada}</div>
                            ) : (
                                <div className="select-input-only">
                                    <Select
                                        name="kepada"
                                        value={form.kepada ? { value: form.kepada, label: form.kepada } : null}
                                        onChange={(option) =>
                                            setForm((f) => ({ ...f, kepada: option ? option.value : "" }))
                                        }
                                        options={satkers.map((s) => ({ value: s.label, label: s.label }))}
                                        placeholder="Cari atau pilih tujuan..."
                                        className="text-sm w-64"
                                        styles={{
                                            menu: (base) => ({ ...base, zIndex: 50, position: "absolute" }),
                                        }}
                                        menuPlacement="auto"
                                    />
                                </div>
                            )}
                            <br className="no-print" />
                            PERUMDA AIR MINUM Tirta Moedal <br /> di <strong>SEMARANG</strong>
                        </div>
                    </div>

                    <div className="mt-3 text-sm grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 font-semibold">Satker :</div>
                        <div className="col-span-9">
                            {isPrintMode ? (
                                <span>{selectedSatker?.label || ""}</span>
                            ) : (
                                <div className="select-input-only">
                                    <Select
                                        name="satker"
                                        value={
                                            form.satker
                                                ? { value: form.satker, label: satkers.find((s) => s.id === form.satker)?.label }
                                                : null
                                        }
                                        onChange={(option) =>
                                            setForm((f) => ({ ...f, satker: option ? option.value : "" }))
                                        }
                                        options={satkers.map((s) => ({ value: s.id, label: s.label }))}
                                        placeholder="Cari atau pilih satker..."
                                        className="text-sm w-full"
                                        styles={{
                                            menu: (base) => ({...base,
                                            zIndex: 100,
                                            position: "absolute",
                                            marginTop: 2,
                                            }),
                                        }}
                                        menuPlacement="bottom"
                                    />
                                </div>

                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center mt-3 text-sm">
                        <div className="col-span-3 font-semibold">Kode Barang :</div>
                        <div className="col-span-9">
                            {isPrintMode ? (
                                <span>{form.kodeBarang}</span>
                            ) : (
                                <input
                                    type="text"
                                    name="kodeBarang"
                                    value={form.kodeBarang}
                                    onChange={handleChange}
                                    placeholder="Isi kode barang"
                                    className="w-full p-1 border border-gray-300 rounded"
                                />
                            )}
                        </div>
                    </div>

                    <div className="mt-4 big-box text-sm">
                        {isPrintMode ? (
                            <div style={{ whiteSpace: "pre-wrap" }}>{form.keterangan}</div>
                        ) : (
                            <textarea
                                name="keterangan"
                                value={form.keterangan}
                                onChange={handleChange}
                                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                                className="w-full resize-none border border-gray-300 rounded p-2"
                                rows={6}
                            />
                        )}
                    </div>

                    {/* ################################################# */}
                    {/* >>> START: MODIFIKASI LOGIKA UPLOAD MULTIPLE <<< */}
                    {/* ################################################# */}
                    <div className="mt-4 no-print">
                        <label className="flex items-center gap-2">
                            <Upload size={16} /> Lampiran Foto/Dokumen ({totalFilesCount} / {MAX_FILES})
                        </label>
                        
                        {/* Container untuk Preview dan Tombol Tambah File */}
                        <div className="mt-3 grid grid-cols-5 gap-3"> 
                            {previews.map((src, i) => (
                                <div key={i} className="relative group">
                                    <img 
                                        src={src} 
                                        alt={`preview-${i}`} 
                                        className="w-full h-24 object-cover rounded border" 
                                    />
                                    <button 
                                        onClick={() => handleRemoveFile(i)}
                                        title="Hapus file ini"
                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                    <p className="text-xs mt-1 text-gray-500 truncate">
                                        {i < existingFilePaths.length ? `File Lama #${i+1}` : `File Baru #${i+1}`}
                                    </p>
                                </div>
                            ))}

                            {/* Tombol Tambah File (Hanya muncul jika < MAX_FILES) */}
                            {totalFilesCount < MAX_FILES && (
                                <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded h-24 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <PlusCircle size={32} className="text-gray-500" />
                                    <input
                                        type="file"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={handleAddFile}
                                        className="hidden"
                                        ref={el => fileInputRefs.current[totalFilesCount] = el}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                    {/* ################################################# */}
                    {/* >>> END: MODIFIKASI LOGIKA UPLOAD MULTIPLE <<< */}
                    {/* ################################################# */}

                    {isPrintMode && previews.length > 0 && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
                            {previews.map((src, i) => (
                                <img key={i} src={src} alt={`foto-${i}`} className="w-full h-28 object-cover border border-gray-400" />
                            ))}
                        </div>
                    )}

                    <div className="mt-3 text-xs text-left">
                        Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
                    </div>

                    <div className="mt-20 flex justify-center text-center gap-60">
                        <div>
                            <div className="text-sm font-semibold">Mengetahui</div>
                            <div className="text-xs">{jabatan}</div>
                            <div className="mt-1 flex justify-center h-[40px] items-center">
                            </div>
                            <div className="mt-1 text-sm">
                                ({form.mengetahui || "..........................."})
                            </div>
                            <div className="text-xs mt-1">
                                NPP: {form.nppMengetahui || "__________"}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-semibold">Pelapor</div>

                            {/* Tombol TTD yang sekarang juga mengecek riwayat */}
                            {!ttdPelaporPreview && !isPrintMode && (
                                <div className="mt-3 text-center no-print">
                                    <button 
                                        onClick={handleTtdButtonClick}
                                        className="flex flex-col items-center gap-2 cursor-pointer mb-2 text-blue-600 hover:text-blue-800 transition"
                                    >
                                        <Upload size={16} /> 
                                        {ttdHistory.length > 0 ? 'Pilih/Ulang Tanda Tangan' : 'Upload Tanda Tangan Pelapor'}
                                    </button>
                                    
                                    {/* Input File Hidden (digunakan sebagai fallback) */}
                                    <input
                                        type="file"
                                        ref={ttdFileInputRef}
                                        id="ttd-file-input-manual"
                                        accept="image/*"
                                        onChange={handleTtdFileUpload}
                                        className="hidden"
                                    />
                                </div>
                            )}

                            {/* Preview TTD saat sudah ada */}
                            {ttdPelaporPreview && !isPrintMode && (
                                <div className="ttd-container border border-gray-300 rounded inline-block relative w-[180px] h-[100px] bg-gray-50 shadow-sm no-print">
                                    <Draggable bounds="parent" nodeRef={nodeRef}>
                                        <img
                                            ref={nodeRef}
                                            src={ttdPelaporPreview}
                                            alt="Tanda tangan pelapor"
                                            style={{
                                                width: 160,
                                                height: 80,
                                                transform: `scale(${ttdScale})`,
                                                transformOrigin: "center center",
                                            }}
                                            className="cursor-move absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                                        />
                                    </Draggable>
                                </div>
                            )}

                            {/* Kontrol dan Tombol Ganti TTD */}
                            {ttdPelaporPreview && !isPrintMode && (
                                <div className="no-print">
                                    <div className="mt-2 flex justify-center items-center gap-2 text-xs select-none">
                                        Zoom:
                                        <input
                                            type="range"
                                            min="0.4"
                                            max="2"
                                            step="0.1"
                                            value={ttdScale}
                                            onChange={(e) => setTtdScale(parseFloat(e.target.value))}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                    <button
                                        onClick={handleTtdButtonClick} // Mengganti TTD via modal/upload
                                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                                    >
                                        Ganti/Ulang Tanda Tangan
                                    </button>
                                </div>
                            )}

                            {/* Tanda tangan di mode print */}
                            {isPrintMode && ttdPelaporPreview && (
                                <div className="mt-1 flex justify-center h-[70px] items-center">
                                    <img
                                        src={ttdPelaporPreview}
                                        alt="Tanda tangan pelapor"
                                        style={{ transform: `scale(${ttdScale})`, transformOrigin: "center center" }}
                                        className="w-28 h-auto object-contain"
                                    />
                                </div> 
                            )}
                            <div className="mt-0 text-sm">{form.pelapor || "(...........................)"}</div>
                            <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
                        </div>
                    </div>
                    
                    {!isPrintMode && (
                        <button
                            onClick={handleAjukan}
                            disabled={isSubmitting}
                            className={`fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all duration-200 ${
                                isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                        >
                             {isSubmitting ? (
                                 <Loader2 size={18} className="animate-spin" />
                                ) : (
                                 <Droplet size={18} />
                                )}
                              {isSubmitting ? `${isEditMode ? 'Mengubah' : 'Mengajukan'}...` : (isEditMode ? 'Ubah Pengajuan' : 'Ajukan')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}