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

// Tambahan: Tipe untuk data user di localStorage
interface LocalUserData {
    nama: string;
    npp: string;
    no_telp: string;
    satker: string; // Mengambil kunci 'satker' dari localStorage
    subsatker: string;
}


// --- UI Components tetap sama ---
// ... Notification, ConfirmationModal, TtdHistoryModal, TtdCropModal, makeImageTransparent, processImageTransparency ...
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

const TtdHistoryModal = (props: any) => { /* ... TtdHistoryModal implementation ... */ return props.isOpen ? (<div>Ttd History Modal</div>) : null; };
const TtdCropModal = (props: any) => { /* ... TtdCropModal implementation ... */ return props.isOpen ? (<div>Ttd Crop Modal</div>) : null; };
const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
async function makeImageTransparent(imgUrl: string, token: string, settings?: any): Promise<string> { return Promise.resolve(imgUrl); } // Simplified for brevity
async function processImageTransparency(dataUrl: string, settings?: any): Promise<string> { return Promise.resolve(dataUrl); } // Simplified for brevity
const TtdHistoryItem = {} as any; // Simplified type

// ... (fetchTtdHistory, fetchPengajuanDetail, handleTtdFileUpload, dll tetap sama) ...
const fetchTtdHistory = useCallback(async (token: string, npp: string) => { /* simplified */ }, []);
const fetchPengajuanDetail = useCallback(async (token: string, uuid: string, halOptions: HalOption[], satkers: SatkerDef[]) => { /* simplified */ }, []);
const handleTtdSelectionFromHistory = (item: any) => {};
const handleCreateTtd = () => {};
const handleDeleteTtd = async (url: string) => {};


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
    
    // State untuk menyimpan nama satker dari localStorage (fallback)
    const [localSatkerName, setLocalSatkerName] = useState<string | null>(null);


    // --- HOOK UTAMA FETCH DATA ---
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
            let userNpp: string | null = null;
            let userSatkerName: string | null = null; 
            let halOptionsMap: HalOption[] = [];
            let satkersMap: SatkerDef[] = [];
            let pegawaiMap: PegawaiDef[] = [];
            let refOptionsMap: RefSuratOption[] = [];
            
            let userFetchSuccess = false;

            // ✅ LANGKAH 1: Ambil data Satker Name dari localStorage (untuk fallback display)
            const storedUserDataRaw = localStorage.getItem("user_data");
            if (storedUserDataRaw) {
                try {
                    const localUserData = JSON.parse(storedUserDataRaw);
                    userSatkerName = localUserData.satker || null; // Menggunakan kunci 'satker'
                    setLocalSatkerName(userSatkerName);
                    // Juga isi data user awal dari local storage
                    setUser({ nama: localUserData.nama, npp: localUserData.npp });
                    userNpp = localUserData.npp;
                    
                    if (!storedUuid && userNpp) {
                        setForm((f) => ({
                            ...f,
                            pelapor: localUserData.nama,
                            nppPelapor: localUserData.npp,
                        }));
                    }
                    userFetchSuccess = true;

                } catch (e) {
                    console.error("Gagal parse localStorage user_data:", e);
                }
            }


            try {
                const [userRes, halRes, satkerRes, pegawaiRes, refSuratRes] = await Promise.all([
                    fetch("/api/me", { headers }), // Ini mungkin sudah tidak perlu jika data lengkap di localStorage
                    fetch("/api/hal", { headers, cache: "no-store" }),
                    fetch("/api/satker", { headers }),
                    fetch("/api/all-pegawai", { headers }),
                    fetch(REFERENSI_SURAT_LOCAL_PATH, { headers, cache: "no-store" }),
                ]);

                // 1. Ambil Data User (Hanya refresh data jika perlu, Satker Name sudah diambil dari LS di atas)
                // Kita abaikan userRes jika LS sudah berhasil dimuat (userFetchSuccess = true)
                if (!userFetchSuccess && userRes.ok) {
                    const userData = await userRes.json();
                    userSatkerName = userData?.satkerName || null;
                    if (userSatkerName) setLocalSatkerName(userSatkerName);
                }
                    
                // 2. & 3. Ambil Data Hal, Pegawai, dan Satker
                if (halRes.ok) {
                    const halJson = await halRes.json();
                    if (halJson?.success && Array.isArray(halJson.data)) {
                        halOptionsMap = halJson.data.map((item: any) => ({
                            id: item.id,
                            nama_jenis: item.nama_jenis,
                        }));
                        setHalOptions(halOptionsMap);
                    }
                }

                if (pegawaiRes.ok) {
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
                }
                   
                if (satkerRes.ok) {
                    const satkerData = await satkerRes.json();
                    if (Array.isArray(satkerData?.data)) {
                        satkersMap = satkerData.data.map((item: any) => ({
                            id: item.id?.toString(),
                            label: item.satker_name,
                            jabatan: item.jabsatker || "Ka.Unit",
                        }));
                        setSatkers(satkersMap);

                        // ✅ LANGKAH 3: Coba mencocokkan Satker ID menggunakan Nama Satker dari Local Storage
                        const nameToMatch = userSatkerName;
                        if (!storedUuid && nameToMatch && userFetchSuccess) {
                            const defaultSatker = satkersMap.find(s => s.label.toLowerCase() === nameToMatch!.toLowerCase());
                            if (defaultSatker) {
                                setForm(f => ({
                                    ...f,
                                    satker: defaultSatker.id, // ID Satker
                                    kepada: f.kepada || "KABAG PERALATAN DAN PEMELIHARAAN (Atau Kepada Lainnya)",
                                }));
                            } else {
                                setNotification({ type: 'warning', message: `Satker ID untuk (${userSatkerName}) tidak ditemukan dalam daftar Satker.` });
                            }
                        }
                    } else {
                        // Jika API Satker gagal, pesan "Gagal Memuat Data" tetap tampil
                        setNotification({ type: 'error', message: 'Gagal memuat daftar Satker dari API.' });
                    }
                    // ... (Logika fetch referensi surat, ttd, dan detail edit tetap sama) ...

                } catch (err: any) {
                    console.error("❌ Error fetch data pendukung:", err.message);
                    setNotification({ type: 'error', message: `Gagal memuat data pendukung: ${err.message}` });
                } finally {
                    setInitialLoading(false);
                }
            };

            fetchInitialData();

        }, [router, fetchPengajuanDetail, fetchTtdHistory]);


        const handleChange = (
            e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
        ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

        useEffect(() => {
            const satkerId = form.satker;
            const selectedSatker = satkers.find(s => s.id === satkerId);

            if (!satkerId || !selectedSatker || allPegawai.length === 0) {
                setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
                return;
            }

            const targetJabatanSatkerLabel = selectedSatker.jabatan;
            const pegawaiDiSatker = allPegawai.filter(peg => String(peg.satker_id) === satkerId);

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
            } else {
                setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
                if (!isEditMode) {
                    setNotification({ type: 'warning', message: `Tidak ditemukan Pimpinan Satker (${targetJabatanSatkerLabel}) di Satker ini. Harap isi manual.` });
                }
            }
        }, [form.satker, satkers, allPegawai, setNotification, isEditMode]);


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
        // ... (handleTtdFileUpload, handleTtdCropComplete, dll tetap sama) ...
        const handleTtdFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* simplified */ };
        const handleTtdCropComplete = async (croppedImage: string, settings?: any) => { /* simplified */ };
        const handleTtdCropCancel = () => {};
        const handleTtdButtonClick = () => {};
        // --- END LOGIC TTD BARU ---


        const handlePrint = () => {
            setIsPrintMode(true);
            setTimeout(() => {
                window.print();
                setIsPrintMode(false);
            }, 300);
        };

        const proceedSubmission = useCallback(async () => { /* simplified */ }, []);


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
        
        // ✅ FINAL: Fallback untuk display Satker Name
        const satkerNameFromState = satkers.find((s) => s.id === form.satker)?.label;
        const satkerNameForDisplay = satkerNameFromState || localSatkerName || 'Silakan Refresh';

        const selectedSatker = satkers.find((s) => s.id === form.satker);
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
                    history={[]} // Simplified
                    onSelect={handleTtdSelectionFromHistory}
                    onClose={() => setIsTtdHistoryModalOpen(false)}
                    onCreateTtd={handleCreateTtd}
                    onDeleteTtd={handleDeleteTtd}
                    currentTtdPreview={ttdPelaporPreview}
                />
                <TtdCropModal
                    isOpen={isTtdCropModalOpen}
                    imageSrc={ttdImageForCrop}
                    onCropComplete={() => {}} // Simplified
                    onCancel={() => {}} // Simplified
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