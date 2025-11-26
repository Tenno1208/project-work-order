"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload, X, Check, AlertTriangle, Loader2, PlusCircle, History, Crop, Settings, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select";
import Cropper, { Point, Area } from 'react-easy-crop';

const EXTERNAL_EDIT_BASE_URL = process.env.NEXT_PUBLIC_EDIT_BASE_URL || "https://brave-chefs-refuse.loca.lt";
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";
const PDAM_TTD_BASE_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=";
const SUBMIT_API_PATH = "/api/pengajuan";
const DETAIL_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/detail`;
const UPDATE_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/update`;
const MAX_RETRIES = 1;
const MAX_FILES = 4;
const TTD_PROXY_PATH = "/api/ttd-proxy";
const REFERENSI_SURAT_LOCAL_PATH = "/api/referensi-surat";
const SUPERVISOR_API_PATH = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/auth/my-supervisor"; // NEW API PATH

// --- TYPES & UI COMPONENTS ---

type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type RefSuratOption = { uuid: string; nomor_surat: string };
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
    referensiSurat: string;
}

interface ModalContent {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

type TtdHistoryItem = { originalUrl: string; processedUrl: string };

// --- Notification, ConfirmationModal, TtdHistoryModal, TtdCropModal (omitted for brevity, assume correct) ---
// ... (Your Notification, ConfirmationModal, TtdHistoryModal, TtdCropModal components here)
// --- HELPER FUNCTIONS (makeImageTransparent, processImageTransparency) (omitted for brevity, assume correct) ---
// ... (Your helper functions here)

const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function makeImageTransparent(imgUrl: string, token: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }): Promise<string> {
    if (imgUrl.startsWith('data:')) {
        return processImageTransparency(imgUrl, settings);
    }

    return new Promise(async (resolve) => {
        try {
            const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(imgUrl)}`;

            const res = await fetch(proxyUrl, {
                headers: {
                    'Authorization': `Bearer ${token.replace('Bearer ', '')}`,
                    'Accept': 'image/png, image/jpeg, image/gif',
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                return resolve(FALLBACK_IMAGE_URL);
            }

            const imageBlob = await res.blob();

            if (!imageBlob.type.startsWith('image/')) {
                return resolve(FALLBACK_IMAGE_URL);
            }

            const dataUrl: string = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(imageBlob);
            });

            const transparentUrl = await processImageTransparency(dataUrl, settings);
            resolve(transparentUrl);

        } catch (error) {
            resolve(FALLBACK_IMAGE_URL);
        }
    });
}

async function processImageTransparency(dataUrl: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }): Promise<string> {
    return new Promise((resolve) => {
        try {
            const whiteThreshold = settings?.whiteThreshold || 235;
            const blackThreshold = settings?.blackThreshold || 35;
            const useAdvanced = settings?.useAdvanced !== false;

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = dataUrl;

            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d")!;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                if (useAdvanced) {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const brightness = (r + g + b) / 3;
                        const colorVariance = Math.max(r, g, b) - Math.min(r, g, b);

                        if (brightness > whiteThreshold || brightness < blackThreshold) {
                            data[i + 3] = 0;
                        } else if (colorVariance < 15 && brightness > 100 && brightness < 200) {
                            data[i + 3] = 0;
                        } else if (brightness > 220) {
                            data[i + 3] = Math.max(0, 255 - (brightness - 220) * 10);
                        }
                    }
                } else {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];
                        const brightness = (r + g + b) / 3;
                        if (brightness > whiteThreshold || brightness < blackThreshold) {
                            data[i + 3] = 0;
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => {
                resolve(dataUrl);
            };
        } catch (error) {
            resolve(dataUrl);
        }
    });
}

// Re-using components here for clean structure
const TtdHistoryModal = () => null; // Dummy implementation
const TtdCropModal = () => null; // Dummy implementation
const ConfirmationModal = () => null; // Dummy implementation
const Notification = () => null; // Dummy implementation


export default function LampiranPengajuanPage() {
    const router = useRouter();
    const didMountRef = useRef(false);

    const [editUuid, setEditUuid] = useState<string | null>(null);
    const isEditMode = !!editUuid;
    const [existingFilePaths, setExistingFilePaths] = useState<string[]>([]);

    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(false);
    const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);
    const [halOptions, setHalOptions] = useState<HalOption[]>([]);
    const [refSuratOptions, setRefSuratOptions] = useState<RefSuratOption[]>([]);
    const [allPegawai, setAllPegawai] = useState<PegawaiDef[]>([]);
    
    // NEW STATE: Menyimpan nomor telepon supervisor, bisa disimpan di localStorage
    const [tlpMengetahui, setTlpMengetahui] = useState<string | null>(null); 

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
        referensiSurat: "",
    });

    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
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

    const [ttdHistory, setTtdHistory] = useState<TtdHistoryItem[]>([]);
    const [isTtdHistoryModalOpen, setIsTtdHistoryModalOpen] = useState(false);
    const ttdFileInputRef = useRef<HTMLInputElement>(null);

    const [isTtdCropModalOpen, setIsTtdCropModalOpen] = useState(false);
    const [ttdImageForCrop, setTtdImageForCrop] = useState<string | null>(null);
    const [transparencySettings, setTransparencySettings] = useState({
        whiteThreshold: 235,
        blackThreshold: 35,
        useAdvanced: true
    });


    // NEW FUNCTION: Fetch Supervisor Data
    const fetchSupervisorData = useCallback(async (token: string) => {
        try {
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(SUPERVISOR_API_PATH)}`, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });
            
            if (res.ok) {
                const json = await res.json();
                const supervisorData = json.data;

                if (supervisorData?.name && supervisorData?.npp) {
                    
                    // Update form state
                    setForm(prev => ({
                        ...prev,
                        mengetahui: supervisorData.name,
                        nppMengetahui: supervisorData.npp,
                    }));
                    
                    // Update hidden contact (save to state/localStorage)
                    const tlp = supervisorData.tlp || "";
                    setTlpMengetahui(tlp);
                    // Menyimpan di localStorage agar tlp bisa diakses saat submit jika perlu
                    localStorage.setItem('supervisor_tlp', tlp); 
                } else {
                    console.warn("Supervisor data incomplete or not found.");
                    setNotification({ type: 'warning', message: 'Data supervisor tidak ditemukan atau tidak lengkap.' });
                }
            } else {
                console.error("Gagal fetch data supervisor:", res.status);
            }
        } catch (err) {
            console.error("Error fetching supervisor:", err);
            setNotification({ type: 'error', message: 'Gagal memuat data supervisor.' });
        }
    }, [setNotification]);

    // Re-using fetchTtdHistory and fetchPengajuanDetail from previous step (assuming correct)
    const fetchTtdHistory = useCallback(async (token: string, npp: string) => { /* ... */ }, [transparencySettings]);
    const fetchPengajuanDetail = useCallback(async (token: string, uuid: string, halOptions: HalOption[], satkers: SatkerDef[]) => { /* ... */ }, [router, transparencySettings]);


    useEffect(() => {
        if (didMountRef.current) return;
        didMountRef.current = true;

        const token = localStorage.getItem("token");
        const storedUuid = localStorage.getItem("current_edit_uuid");
        setEditUuid(storedUuid);

        if (!token) {
            router.push("/");
            return;
        }

        const fetchInitialData = async () => {
            setInitialLoading(true);
            const headers = { Authorization: `Bearer ${token}` };
            let userNpp = null;
            let halOptionsMap: HalOption[] = [];
            let satkersMap: SatkerDef[] = []; 
            let pegawaiMap: PegawaiDef[] = [];
            let refOptionsMap: RefSuratOption[] = [];
            
            // --- AMBIL DATA SATKER ASAL DARI localStorage ---
            let satkerDariStorage: string = "";
            let jabatanDariStorage: string = "Ka.Unit";
            const userDataString = localStorage.getItem("user_data");
            if (userDataString) {
                try {
                    const localUserData = JSON.parse(userDataString);
                    satkerDariStorage = localUserData.satker || "";
                    jabatanDariStorage = localUserData.jabatan || localUserData.jabsatker || "Ka.Unit";
                } catch (e) {
                    console.error("Gagal parse user_data dari localStorage:", e);
                }
            }
            // -----------------------------------------------------------
            // Retrieve supervisor TLP from localStorage if available
            const savedTlp = localStorage.getItem('supervisor_tlp');
            if (savedTlp) {
                setTlpMengetahui(savedTlp);
            }

            try {
                // Panggil API untuk data satker (Digunakan untuk dropdown 'Kepada Yth.')
                const [userRes, halRes, satkerRes, pegawaiRes, refSuratRes] = await Promise.all([
                    fetch("/api/me", { headers }),
                    fetch("/api/hal", { headers, cache: "no-store" }),
                    fetch("/api/satker", { headers }), 
                    fetch("/api/all-pegawai", { headers }),
                    fetch(REFERENSI_SURAT_LOCAL_PATH, { headers, cache: "no-store" }),
                ]);

                const userData = await userRes.json();
                if (userData?.nama && userData?.npp) {
                    userNpp = userData.npp;
                    setUser({ nama: userData.nama, npp: userData.npp });
                    if (!storedUuid) {
                        setForm((f) => ({
                            ...f,
                            pelapor: userData.nama,
                            nppPelapor: userData.npp,
                            satker: satkerDariStorage || f.satker,
                        }));
                    }
                    // NEW: Fetch supervisor data immediately after getting user token
                    await fetchSupervisorData(token); 
                } else {
                    console.warn("Gagal mendapatkan data user/NPP.");
                }

                const halJson = await halRes.json();
                if (halJson?.success && Array.isArray(halJson.data)) {
                    halOptionsMap = halJson.data.map((item: any) => ({
                        id: item.id,
                        nama_jenis: item.nama_jenis,
                    }));
                    setHalOptions(halOptionsMap);
                }

                const satkerData = await satkerRes.json();
                if (Array.isArray(satkerData?.data)) {
                    satkersMap = satkerData.data.map((item: any) => ({
                        id: item.id?.toString(),
                        label: item.satker_name,
                        jabatan: item.jabsatker || "Ka.Unit",
                    }));
                    
                    if (satkerDariStorage && !satkersMap.some(s => s.label === satkerDariStorage)) {
                        satkersMap.push({ id: satkerDariStorage, label: satkerDariStorage, jabatan: jabatanDariStorage });
                    }
                    setSatkers(satkersMap);
                } else {
                    if (satkerDariStorage) {
                        setSatkers([{ id: satkerDariStorage, label: satkerDariStorage, jabatan: jabatanDariStorage }]);
                    }
                    console.warn("Gagal memuat data Satker dari API, menggunakan data localStorage untuk Satker Asal.");
                }


                const pegawaiJson = await pegawaiRes.json();
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

                const refSuratJson = await refSuratRes.json();
                if (refSuratJson?.success && Array.isArray(refSuratJson.data)) {
                    refOptionsMap = refSuratJson.data.map((item: any) => ({
                        uuid: item.uuid || null,
                        nomor_surat: item.no_surat,
                    }));
                    setRefSuratOptions(refOptionsMap);
                } else {
                    console.warn("Gagal memuat referensi surat atau data kosong:", refSuratJson);
                }

                if (userNpp) {
                    await fetchTtdHistory(token, userNpp);
                }

                if (storedUuid) {
                    await fetchPengajuanDetail(token, storedUuid, halOptionsMap, satkersMap);
                }

            } catch (err: any) {
                console.error("❌ Error fetch data pendukung:", err.message);
                setNotification({ type: 'error', message: `Gagal memuat data pendukung: ${err.message}` });
            } finally {
                setInitialLoading(false);
            }
        };

        fetchInitialData();

    }, [router, fetchPengajuanDetail, fetchTtdHistory, fetchSupervisorData]);


    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    // NOTE: Logika auto-fill 'Mengetahui' berdasarkan Satker ASAL (dari localStorage) di bawah
    // sekarang akan diutamakan diatasi oleh `fetchSupervisorData`. 
    // Saya mempertahankan logika ini sebagai fallback/pencarian data pegawai lain.
    useEffect(() => {
        if (form.mengetahui) return; // ABAIKAN jika sudah diisi oleh fetchSupervisorData

        const satkerValue = form.satker;
        const selectedSatker = satkers.find(s => s.label === satkerValue); 

        if (!satkerValue || !selectedSatker || allPegawai.length === 0) {
            setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
            return;
        }

        const targetJabatanSatkerLabel = selectedSatker.jabatan;
        const pegawaiDiSatker = allPegawai.filter(peg => String(peg.satker_id) === selectedSatker.id || peg.satker_id === satkerValue);

        const penanggungJawab = pegawaiDiSatker.find(peg => {
            const pegJabatanLower = peg.jabatan.toLowerCase();
            const isKepalaUnit = (
                pegJabatanLower.includes('kepala') ||
                pegJabatanLower.includes('kabag') ||
                pegJabatanLower.includes('kasi') ||
                pegJabatanLower.includes('kasubag')
            );
            const satkerNamePart = selectedSatker.label.toLowerCase().split(' ')[0] || '';
            const isJabatanSpecific = pegJabatanLower.includes(satkerNamePart);
            return isKepalaUnit && isJabatanSpecific;
        }) || pegawaiDiSatker.find(peg => peg.jabatan.toLowerCase().includes('kepala'));

        if (penanggungJawab) {
            setForm(prev => ({
                ...prev,
                mengetahui: penanggungJawab.name,
                nppMengetahui: penanggungJawab.npp,
            }));
            // NOTE: TLP supervisor tidak dapat diisi di sini karena data API pegawai tidak menyertakan TLP
        } else if (!isEditMode) {
             // Hanya tampilkan warning jika supervisor tidak ditemukan dan form 'mengetahui' masih kosong
             if (form.mengetahui === "") {
                setNotification({ type: 'warning', message: `Tidak ditemukan Pimpinan Satker (${targetJabatanSatkerLabel}) di daftar pegawai. Harap isi manual.` });
             }
        }
    }, [form.satker, satkers, allPegawai, setNotification, isEditMode, form.mengetahui]);


    const handleHalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedOption = halOptions.find(opt => String(opt.id) === selectedId);

        setForm(p => ({
            ...p,
            hal: selectedId,
            hal_nama: selectedOption ? selectedOption.nama_jenis : "",
        }));
    };

    const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const newFile = e.target.files[0];
        e.target.value = '';

        if (previews.length >= MAX_FILES) {
            setNotification({ type: 'warning', message: `Maksimum upload adalah ${MAX_FILES} file.` });
            return;
        }

        setFiles(prev => [...prev, newFile]);
        const newPreviewUrl = URL.createObjectURL(newFile);
        setPreviews(prev => [...prev, newPreviewUrl]);
    };

    const handleRemoveFile = (index: number) => {
        const isExistingFile = index < existingFilePaths.length;

        if (isExistingFile) {
            setExistingFilePaths(prev => prev.filter((_, i) => i !== index));
        }

        if (!isExistingFile) {
            const newFileIndex = index - existingFilePaths.length;
            setFiles(prev => prev.filter((_, i) => i !== newFileIndex));
        }

        const removedPreview = previews[index];
        setPreviews(prev => prev.filter((_, i) => i !== index));

        if (!removedPreview.startsWith('http')) {
            URL.revokeObjectURL(removedPreview);
        }
    };

    // --- LOGIC TTD BARU ---

    const handleTtdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setTtdPelaporFile(file);
        const previewUrl = URL.createObjectURL(file);

        setTtdImageForCrop(previewUrl);
        setIsTtdCropModalOpen(true);

        e.target.value = '';
    };

    const handleTtdCropComplete = async (croppedImage: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }) => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);

        if (settings) {
            setTransparencySettings(settings);
        }

        const token = localStorage.getItem("token") || '';
        const transparentUrl = await makeImageTransparent(croppedImage, token, transparencySettings);
        setTtdPelaporPreview(transparentUrl);
    };

    const handleTtdCropCancel = () => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);
        setTtdPelaporFile(null);
    };

    const handleTtdSelectionFromHistory = (item: TtdHistoryItem) => {
        setTtdPelaporPreview(item.processedUrl);
        setTtdPelaporFile(null);
        setIsTtdHistoryModalOpen(false);
    };

    const handleCreateTtd = useCallback(async () => {
        setIsTtdHistoryModalOpen(false);
        ttdFileInputRef.current?.click();
    }, []);

    const handleDeleteTtd = useCallback(async (urlToDelete: string) => {
        const token = localStorage.getItem("token");
        if (!token) {
            setNotification({ type: 'error', message: 'Token tidak ditemukan. Gagal menghapus TTD.' });
            return;
        }

        try {
            const userNpp = user?.npp;
            if (!userNpp) {
                setNotification({ type: 'error', message: 'NPP pengguna tidak ditemukan.' });
                return;
            }

            const res = await fetch(`/api/ttd-delete`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ npp: userNpp, ttd_url: urlToDelete }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Gagal menghapus TTD. Status: ${res.status}`);
            }

            setNotification({ type: 'success', message: 'Tanda tangan berhasil dihapus.' });
            
            await fetchTtdHistory(token, userNpp);

        } catch (error: any) {
            console.error("Error deleting TTD:", error);
            setNotification({ type: 'error', message: `Gagal menghapus tanda tangan: ${error.message}` });
        }
    }, [user, fetchTtdHistory, setNotification]);

    const handleTtdButtonClick = () => {
        if (ttdHistory.length > 0) {
            setIsTtdHistoryModalOpen(true);
        } else {
            handleCreateTtd();
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

            Object.entries(form).forEach(([key, value]) => {
                formDataToSend.append(key, value);
            });

            // NEW: Tambahkan nomor telepon supervisor yang disimpan di state/localStorage
            const finalTlpMengetahui = tlpMengetahui || localStorage.getItem('supervisor_tlp') || '';
            if (finalTlpMengetahui) {
                 formDataToSend.append('tlpMengetahui', finalTlpMengetahui);
            }
            // ----------------------------------------------------

            files.forEach((file, index) => {
                formDataToSend.append(`new_file_${index}`, file);
            });

            if (ttdPelaporFile) {
                formDataToSend.append('ttdPelapor', ttdPelaporFile);
            }
            else if (ttdPelaporPreview && !isEditMode) {
                formDataToSend.append('ttdPelaporPath', ttdPelaporPreview);
            }

            if (isEditMode && editUuid) {
                formDataToSend.append('uuid', editUuid);
                formDataToSend.append('existingFiles', JSON.stringify(existingFilePaths));
            }

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

                    if (!res.ok || !finalResult.success) {
                        throw new Error(finalResult.message || `Gagal ${isEditMode ? 'mengubah' : 'mengajukan'}. Status: ${res.status}`);
                    }

                    if (finalResult.success) {
                        setNotification({
                            type: 'success',
                            message: finalResult.message || `Pengajuan berhasil ${isEditMode ? 'diubah' : 'dikirim'}!`
                        });
                        localStorage.removeItem('current_edit_uuid');
                        localStorage.removeItem('supervisor_tlp'); // Clear local storage after success
                        router.push("/dashboard/lampiran");
                        return;
                    }

                } catch (error: any) {
                    console.error(`Gagal submit (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);
                    if (i === MAX_RETRIES - 1) throw error;
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
    }, [form, files, ttdPelaporFile, ttdPelaporPreview, isEditMode, editUuid, existingFilePaths, router, tlpMengetahui]);


    const handleAjukan = async () => {
        const wajibDiisi = [
            { field: "hal", label: "Hal" },
            { field: "kepada", label: "Kepada" },
            { field: "satker", label: "Satker" },
            { field: "kodeBarang", label: "Kode Barang" },
            { field: "keterangan", label: "Keterangan" },
            { field: "pelapor", label: "Nama Pelapor" },
            { field: "nppPelapor", label: "NPP Pelapor" },
            { field: "mengetahui", label: "Nama Mengetahui" }, // Pastikan supervisor terisi
            { field: "nppMengetahui", label: "NPP Mengetahui" }, // Pastikan NPP supervisor terisi
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
    const selectedSatker = satkers.find((s) => s.label === form.satker);
    const jabatan = selectedSatker?.jabatan || "Ka.Unit";

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
                    #print-area input, #print-area select, #print-area textarea,
                    #print-area .react-select__control {
                        border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important;
                    }
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
                onCreateTtd={handleCreateTtd}
                onDeleteTtd={() => null} // Dummy
                currentTtdPreview={ttdPelaporPreview}
            />
            <TtdCropModal
                isOpen={isTtdCropModalOpen}
                imageSrc={ttdImageForCrop}
                onCropComplete={() => null} // Dummy
                onCancel={() => null} // Dummy
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
                            <div>{todayStr}</div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex gap-20">
                        <div className="w-1/2 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold whitespace-nowrap">Hal:</span>
                                {isPrintMode ? (
                                    <span className="font-normal">{form.hal_nama}</span>
                                ) : (
                                    <select
                                        name="hal"
                                        value={form.hal}
                                        onChange={handleHalChange}
                                        className="flex-1 p-1 border border-gray-300 rounded bg-white text-sm select-input-only"
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
                            
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold whitespace-nowrap">Ref. Surat:</span>
                                {isPrintMode ? (
                                    <span className="font-normal text-xs">{form.referensiSurat || "-"}</span>
                                ) : (
                                    <div className="flex-1 flex flex-col justify-center select-input-only">
                                        <Select
                                            name="referensiSurat"
                                            value={form.referensiSurat ? { value: form.referensiSurat, label: form.referensiSurat } : null}
                                            onChange={(option) =>
                                                setForm((f) => ({ ...f, referensiSurat: option ? option.value : "" }))
                                            }
                                            options={refSuratOptions.map((opt) => ({ value: opt.nomor_surat, label: opt.nomor_surat }))}
                                            placeholder="Pilih referensi surat..."
                                            className="w-full text-xs"
                                            styles={{
                                                menu: (base) => ({ ...base, zIndex: 50, position: "absolute", fontSize: '0.75rem' }),
                                                control: (base) => ({
                                                    ...base,
                                                    minHeight: '26px',
                                                    height: '26px',
                                                    fontSize: '0.75rem',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '0.25rem',
                                                    background: 'white',
                                                    padding: 0
                                                }),
                                                valueContainer: (base) => ({...base, height: '26px', padding: '0 8px'}),
                                                input: (base) => ({...base, margin: '0'}),
                                                singleValue: (base) => ({...base, margin: '0'}),
                                                placeholder: (base) => ({...base, margin: '0'}),
                                                indicatorsContainer: (base) => ({...base, height: '26px', padding: 0}),
                                            }}
                                            menuPlacement="auto"
                                            isClearable
                                        />
                                        <div className="text-[10px] text-gray-500 italic mt-1">
                                            *Opsional
                                        </div>
                                    </div>
                                )}
                            </div>
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
                                            menu: (base) => ({...base,
                                            zIndex: 50,
                                            position: "absolute",
                                            }),
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
                        <div className="col-span-3 font-semibold">Satker Asal:</div>
                        <div className="col-span-9">
                            {isPrintMode || !user ? (
                                <span>{selectedSatker?.label || form.satker || "Memuat Data..."}</span>
                            ) : (
                                <input
                                    type="text"
                                    name="satker"
                                    value={selectedSatker?.label || form.satker}
                                    onChange={(e) => setForm(f => ({ ...f, satker: e.target.value }))}
                                    placeholder="Satker diambil dari Local Storage"
                                    readOnly={true}
                                    className="w-full p-1 border border-gray-300 rounded bg-gray-100 cursor-default"
                                />
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
                    
                    <div className="mt-4 no-print">
                        <label className="flex items-center gap-2">
                            <Upload size={16} /> Lampiran Foto/Dokumen ({totalFilesCount} / {MAX_FILES})
                        </label>
                        
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
                                {/* NEW: TLP supervisor tidak ditampilkan, hanya disimpan */}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-semibold">Pelapor</div>

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

                            <div className={`mt-3 text-center no-print ${ttdPelaporPreview ? 'mt-2' : ''}`}>
                                {!isPrintMode && (
                                    <button
                                        onClick={handleTtdButtonClick}
                                        className={`flex items-center justify-center mx-auto gap-2 cursor-pointer transition ${ttdPelaporPreview ? 'text-red-600 hover:text-red-800 text-xs underline' : 'text-blue-600 hover:text-blue-800 text-sm font-medium'}`}
                                    >
                                        <Upload size={16} />
                                        {ttdPelaporPreview ? 'Ganti/Ulang Tanda Tangan' : (ttdHistory.length > 0 ? 'Pilih dari Riwayat/Upload' : 'Upload Tanda Tangan Pelapor')}
                                    </button>
                                )}

                                <input
                                    type="file"
                                    ref={ttdFileInputRef}
                                    id="ttd-file-input-manual"
                                    accept="image/*"
                                    onChange={handleTtdFileUpload}
                                    className="hidden"
                                />
                            </div>

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