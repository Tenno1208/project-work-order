"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload, X, Check, AlertTriangle, Loader2, PlusCircle, History, Crop, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select";
import Cropper, { Point, Area } from 'react-easy-crop';

// Tentukan Base URL dan Path API
const EXTERNAL_EDIT_BASE_URL = process.env.NEXT_PUBLIC_EDIT_BASE_URL || "https://brave-chefs-refuse.loca.lt";
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";
const SUBMIT_API_PATH = "/api/pengajuan";
const DETAIL_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/detail`;
const UPDATE_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/update`;
const MAX_RETRIES = 1;
const MAX_FILES = 4;
const TTD_PROXY_PATH = "/api/ttd-proxy";
const REFERENSI_SURAT_LOCAL_PATH = "/api/referensi-surat";

// --- TYPES & UI COMPONENTS (TIDAK BERUBAH) ---

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

// (Sertakan kembali komponen Notification, ConfirmationModal, TtdHistoryModal, TtdCropModal,
// makeImageTransparent, dan processImageTransparency yang ada di kode original Anda di sini)

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

// --- MODAL BARU UNTUK CROP TTD ---
const TtdCropModal = ({
    isOpen,
    imageSrc,
    onCropComplete,
    onCancel
}: {
    isOpen: boolean,
    imageSrc: string | null,
    onCropComplete: (croppedImage: string, settings?: { whiteThreshold: number, blackThreshold: number, useAdvanced: boolean }) => void,
    onCancel: () => void
}) => {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [transparencySettings, setTransparencySettings] = useState({
        whiteThreshold: 235,
        blackThreshold: 35,
        useAdvanced: true
    });
    const [showSettings, setShowSettings] = useState(false);

    const onCropCompleteHandler = useCallback((croppedArea: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = useCallback(async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedImage = await getCroppedImg(
                imageSrc,
                croppedAreaPixels,
                rotation
            );
            onCropComplete(croppedImage, transparencySettings);
        } catch (e) {
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    }, [imageSrc, croppedAreaPixels, rotation, onCropComplete, transparencySettings]);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous'); // needed to avoid cross-origin issues
            image.src = url;
        });

    const getRadianAngle = (degreeValue: number) => (degreeValue * Math.PI) / 180;

    const getCroppedImg = async (
        imageSrc: string,
        pixelCrop: Area,
        rotation = 0
    ): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            return '';
        }

        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

        canvas.width = safeArea;
        canvas.height = safeArea;

        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate(getRadianAngle(rotation));
        ctx.translate(-safeArea / 2, -safeArea / 2);

        ctx.drawImage(
            image,
            safeArea / 2 - image.width * 0.5,
            safeArea / 2 - image.height * 0.5
        );

        const data = ctx.getImageData(0, 0, safeArea, safeArea);

        canvas.width = pixelCrop.width;
        canvas.height = pixelCrop.height;

        ctx.putImageData(
            data,
            0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x,
            0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y
        );

        return canvas.toDataURL('image/png');
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000]">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-4xl h-[600px] flex flex-col transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <Crop size={24} className="text-blue-600"/> Crop Tanda Tangan
                    </h3>
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition flex items-center gap-1"
                    >
                        <Settings size={16} />
                        Pengaturan
                    </button>
                </div>

                {showSettings && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border">
                        <h4 className="font-medium text-sm mb-2">Pengaturan Transparansi</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={transparencySettings.useAdvanced}
                                        onChange={(e) => setTransparencySettings(prev => ({
                                            ...prev,
                                            useAdvanced: e.target.checked
                                        }))}
                                    />
                                    Gunakan Mode Transparansi Lanjutan
                                </label>
                                <p className="text-xs text-gray-500 mt-1">Mode lanjutan lebih baik untuk tanda tangan dengan berbagai warna</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Threshold Putih: {transparencySettings.whiteThreshold}</label>
                                <input
                                    type="range"
                                    min="200"
                                    max="255"
                                    value={transparencySettings.whiteThreshold}
                                    onChange={(e) => setTransparencySettings(prev => ({
                                        ...prev,
                                        whiteThreshold: parseInt(e.target.value)
                                    }))}
                                    className="w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Threshold Hitam: {transparencySettings.blackThreshold}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    value={transparencySettings.blackThreshold}
                                    onChange={(e) => setTransparencySettings(prev => ({
                                        ...prev,
                                        blackThreshold: parseInt(e.target.value)
                                    }))}
                                    className="w-full"
                                />
                            </div>
                        </div>
                    </div>
                )}

                <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        rotation={rotation}
                        aspect={4/3}
                        onCropChange={setCrop}
                        onCropComplete={onCropCompleteHandler}
                        onZoomChange={setZoom}
                        onRotationChange={setRotation}
                    />
                </div>

                <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-20">Zoom:</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium w-20">Rotasi:</span>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="flex-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={showCroppedImage}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 size={16} className="inline mr-2 animate-spin" />
                                Memproses...
                            </>
                        ) : (
                            'Terapkan'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- HELPER FUNCTION TTD (FINAL UNTUK MENGATASI CORS) ---

async function makeImageTransparent(imgUrl: string, token: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }): Promise<string> {
    if (imgUrl.startsWith('data:')) {
        return processImageTransparency(imgUrl, settings);
    }

    return new Promise(async (resolve) => {
        try {
            const pdamBaseIdentifier = "https://gateway.pdamkotasmg.coid/api-gw-balanced/file-handler/foto/";
            let fetchUrl = imgUrl;

            // Jika URL TTD mengandung format File Handler PDAM, arahkan ke proxy lokal
            if (imgUrl.includes(pdamBaseIdentifier) && imgUrl.includes('?path=')) {
                // Parsing parameter path dan filename dari URL PDAM
                const urlObj = new URL(imgUrl);
                const pathParam = urlObj.searchParams.get('path');
                const filenameParam = urlObj.searchParams.get('filename');

                if (pathParam && filenameParam) {
                    // **PENTING:** Menggunakan proxy lokal yang seharusnya Anda buat di /api/asset-proxy
                    const encodedPath = encodeURIComponent(pathParam);
                    const encodedFilename = encodeURIComponent(filenameParam);
                    fetchUrl = `/api/asset-proxy?path=${encodedPath}&filename=${encodedFilename}`;
                }
            }

            console.log(`⏳ Mencoba fetch gambar TTD (via Asset Proxy): ${fetchUrl}`);

            // 1. Lakukan FETCH (ke proxy lokal atau URL asli jika path tidak dikenali)
            const res = await fetch(fetchUrl, {
                headers: {
                    // Token dikirimkan ke proxy lokal /api/asset-proxy
                    'Authorization': `Bearer ${token.replace('Bearer ', '')}`,
                    'Accept': 'image/png, image/jpeg, image/gif',
                },
            });

            if (!res.ok) {
                const errorText = await res.text();
                console.error(`❌ Gagal fetch gambar TTD (${res.status}): ${fetchUrl}. Respon: ${errorText.substring(0, 100)}...`);
                return resolve(imgUrl);
            }

            // 2. Konversi ke Data URL (Base64)
            const imageBlob = await res.blob();

            if (!imageBlob.type.startsWith('image/')) {
                console.error(`❌ Tipe konten bukan gambar: ${imageBlob.type}. URL: ${imgUrl}`);
                return resolve(imgUrl);
            }

            const dataUrl: string = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(imageBlob);
            });

            // 3. Proses Transparansi menggunakan Canvas
            const transparentUrl = await processImageTransparency(dataUrl, settings);
            resolve(transparentUrl);

        } catch (error) {
            console.error("❌ Error tak terduga selama TTD fetch/conversion:", error);
            resolve(imgUrl);
        }
    });
}

// Fungsi terpisah untuk memproses transparansi gambar
async function processImageTransparency(dataUrl: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }): Promise<string> {
    return new Promise((resolve) => {
        try {
            // Default settings
            const whiteThreshold = settings?.whiteThreshold || 235;
            const blackThreshold = settings?.blackThreshold || 35;
            const useAdvanced = settings?.useAdvanced !== false; // Default to true

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
                    // Algoritma transparansi lanjutan yang lebih baik untuk tanda tangan
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i];
                        const g = data[i + 1];
                        const b = data[i + 2];

                        // Hitung kecerahan
                        const brightness = (r + g + b) / 3;

                        // Hitung perbedaan warna (untuk mendeteksi tinta)
                        const colorVariance = Math.max(r, g, b) - Math.min(r, g, b);

                        // Jika sangat terang atau sangat gelap, buat transparan
                        if (brightness > whiteThreshold || brightness < blackThreshold) {
                            data[i + 3] = 0;
                        }
                        // Jika perbedaan warna rendah (cenderung abu-abu), buat transparan
                        else if (colorVariance < 15 && brightness > 100 && brightness < 200) {
                            data[i + 3] = 0;
                        }
                        // Jika warna mendekati putih dengan sedikit warna, buat transparan
                        else if (brightness > 220) {
                            data[i + 3] = Math.max(0, 255 - (brightness - 220) * 10);
                        }
                    }
                } else {
                    // Algoritma transparansi sederhana (original)
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
                console.error(`❌ Gagal render Base64 di Canvas: ${dataUrl}`);
                resolve(dataUrl);
            };
        } catch (error) {
            console.error("❌ Error processing image transparency:", error);
            resolve(dataUrl);
        }
    });
}


export default function LampiranPengajuanPage() {
    const router = useRouter();

    // Gunakan useRef untuk flag agar useEffect tidak double run di Dev Mode
    const didMountRef = useRef(false);

    const [editUuid, setEditUuid] = useState<string | null>(null);
    const isEditMode = !!editUuid;
    const [existingFilePaths, setExistingFilePaths] = useState<string[]>([]);
    // ---------------------------------

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

    // --- STATE BARU UNTUK RIWAYAT TTD ---
    const [ttdHistory, setTtdHistory] = useState<string[]>([]);
    const [isTtdHistoryModalOpen, setIsTtdHistoryModalOpen] = useState(false);
    const ttdFileInputRef = useRef<HTMLInputElement>(null);

    // --- STATE BARU UNTUK CROP TTD ---
    const [isTtdCropModalOpen, setIsTtdCropModalOpen] = useState(false);
    const [ttdImageForCrop, setTtdImageForCrop] = useState<string | null>(null);
    const [transparencySettings, setTransparencySettings] = useState({
        whiteThreshold: 235,
        blackThreshold: 35,
        useAdvanced: true
    });


const fetchTtdHistory = useCallback(async (token: string, npp: string) => {
    try {
        const res = await fetch(`${TTD_PROXY_PATH}/${npp}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        if (res.ok) {
            const json = await res.json();

            let ttdPaths: string[] = [];
            if (json.ttd_url && typeof json.ttd_url === 'string') {
                ttdPaths = [json.ttd_url];
            } else if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                ttdPaths = json.data.map((item: any) => item.path || item.url).filter((url: string) => url);
            }

            if (ttdPaths.length > 0) {
                const processedUrls = await Promise.all(
                    ttdPaths.map(async (path: string) => {
                        const finalUrl = path.startsWith('http') ? path : `${API_BASE_URL}/${path.replace(/^\//, '')}`;
                        return makeImageTransparent(finalUrl, token, transparencySettings);
                    })
                );

                setTtdHistory(processedUrls);
                if (!ttdPelaporPreview && processedUrls.length > 0) {
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
}, [transparencySettings, ttdPelaporPreview]);


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
                referensiSurat: "",
            });


            if (data.file_paths) {
                try {
                    let rawPaths: string[] = [];
                    const pathsString = data.file_paths.trim();

                    // --- Coba 1: Parse sebagai Array JSON (Menangani string JSON yang di-escaped dari DB) ---
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
                setTtdPelaporPreview(await makeImageTransparent(ttdUrl, currentToken, transparencySettings));
            }

        } catch (err: any) {
            console.error("❌ Error ambil data detail pengajuan:", err.message);
            setNotification({ type: 'error', message: `Gagal memuat detail pengajuan: ${err.message}. Kembali ke daftar.` });
            localStorage.removeItem('current_edit_uuid');
            router.push("/dashboard/lampiran");
        } finally {
            setInitialLoading(false);
        }
    }, [router, transparencySettings]);


    // #################################################
    // MAIN USE EFFECT: Load initial data & check edit mode
    // #################################################
    useEffect(() => {
        // HANYA JALANKAN SEKALI SAAT COMPONENT MOUNT
        if (didMountRef.current) return;
        didMountRef.current = true; // Set flag setelah mount pertama

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


            try {
                // --- 1. Fetch Data Utama Bersama (Satu kali fetch) ---
                const [userRes, halRes, satkerRes, pegawaiRes, refSuratRes] = await Promise.all([
                    fetch("/api/me", { headers }),
                    fetch("/api/hal", { headers, cache: "no-store" }),
                    fetch("/api/satker", { headers }),
                    fetch("/api/all-pegawai", { headers }),
                    fetch(REFERENSI_SURAT_LOCAL_PATH, { headers, cache: "no-store" }),
                ]);

                // --- 2. Process User Data ---
                const userData = await userRes.json();
                if (userData?.nama && userData?.npp) {
                    userNpp = userData.npp;
                    setUser({ nama: userData.nama, npp: userData.npp });
                    if (!storedUuid) {
                        setForm((f) => ({
                            ...f,
                            pelapor: userData.nama,
                            nppPelapor: userData.npp,
                        }));
                    }
                } else {
                    console.warn("Gagal mendapatkan data user/NPP.");
                }

                // --- 3. Process Hal Options ---
                const halJson = await halRes.json();
                if (halJson?.success && Array.isArray(halJson.data)) {
                    halOptionsMap = halJson.data.map((item: any) => ({
                        id: item.id,
                        nama_jenis: item.nama_jenis,
                    }));
                    setHalOptions(halOptionsMap);
                }

                // --- 4. Process Satker Options ---
                const satkerData = await satkerRes.json();
                if (Array.isArray(satkerData?.data)) {
                    satkersMap = satkerData.data.map((item: any) => ({
                        id: item.id?.toString(),
                        label: item.satker_name,
                        jabatan: item.jabsatker || "Ka.Unit",
                    }));
                    setSatkers(satkersMap);
                }

                // --- 5. Process Pegawai List ---
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

                // --- 6. Process Referensi Surat Options ---
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

                // --- 7. Fetch TTD History (Tergantung NPP) ---
                if (userNpp) {
                    await fetchTtdHistory(token, userNpp);
                }

                // --- 8. Fetch Detail Pengajuan (Jika Edit Mode) ---
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

    }, [router, fetchPengajuanDetail, fetchTtdHistory]);


    // #################################################
    // HANDLER LOGIC
    // #################################################

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    // Efek Samping untuk mengisi penanggung jawab secara otomatis
    useEffect(() => {
        const satkerId = form.satker; // ID Satker yang dipilih (berbentuk string)
        const selectedSatker = satkers.find(s => s.id === satkerId);

        // 1. Cek Pra-kondisi
        if (!satkerId || !selectedSatker || allPegawai.length === 0) {
            setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
            return;
        }

        const targetJabatanSatkerLabel = selectedSatker.jabatan;

        // 2. Filter semua pegawai yang berada di Satker ID yang dipilih
        const pegawaiDiSatker = allPegawai.filter(peg =>
            String(peg.satker_id) === satkerId
        );

        // 3. Tentukan Pegawai Pimpinan Unit
        const penanggungJawab = pegawaiDiSatker.find(peg => {
            const pegJabatanLower = peg.jabatan.toLowerCase();

            // Kriteria pimpinan
            const isKepalaUnit = (
                pegJabatanLower.includes('kepala') ||
                pegJabatanLower.includes('kabag') ||
                pegJabatanLower.includes('kasi') ||
                pegJabatanLower.includes('kasubag')
            );

            // Kriteria spesifik (gunakan nama satker)
            const satkerNamePart = selectedSatker.label.toLowerCase().split(' ')[0] || '';
            const isJabatanSpecific = pegJabatanLower.includes(satkerNamePart);

            return isKepalaUnit && isJabatanSpecific;
        }) || pegawaiDiSatker.find(peg => peg.jabatan.toLowerCase().includes('kepala')); // Fallback yang lebih luas

        if (penanggungJawab) {
            setForm(prev => ({
                ...prev,
                mengetahui: penanggungJawab.name,
                nppMengetahui: penanggungJawab.npp,
            }));
            // Hapus notifikasi sukses ini agar tidak memenuhi layar saat berpindah satker
            // setNotification({ type: 'success', message: `Mengetahui terisi otomatis: ${penanggungJawab.name} (${penanggungJawab.jabatan})` });
        } else {
            setForm(prev => ({ ...prev, mengetahui: "", nppMengetahui: "" }));
            // Hanya tampilkan warning jika belum edit mode
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

    /**
     * Handler untuk menambahkan satu file baru ke array files dan previews
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

        // Buka modal crop dengan gambar yang baru diupload
        setTtdImageForCrop(previewUrl);
        setIsTtdCropModalOpen(true);

        // Reset input value agar user bisa memilih file yang sama lagi jika perlu
        e.target.value = '';
    };

    // Handler untuk menyelesaikan crop
    const handleTtdCropComplete = async (croppedImage: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }) => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);

        // Simpan pengaturan transparansi jika diberikan
        if (settings) {
            setTransparencySettings(settings);
        }

        // Dapatkan token untuk proses transparansi
        const token = localStorage.getItem("token") || '';

        // Proses transparansi pada gambar yang sudah di-crop
        const transparentUrl = await makeImageTransparent(croppedImage, token, transparencySettings);
        setTtdPelaporPreview(transparentUrl);
    };

    // Handler untuk membatalkan crop
    const handleTtdCropCancel = () => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);
        setTtdPelaporFile(null);
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

            Object.entries(form).forEach(([key, value]) => {
                formDataToSend.append(key, value);
            });

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

                    if (!res.ok || !finalResult.success) {
                        throw new Error(finalResult.message || `Gagal ${isEditMode ? 'mengubah' : 'mengajukan'}. Status: ${res.status}`);
                    }

                    if (finalResult.success) {
                        setNotification({
                            type: 'success',
                            message: finalResult.message || `Pengajuan berhasil ${isEditMode ? 'diubah' : 'dikirim'}!`
                        });
                        localStorage.removeItem('current_edit_uuid');
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
            />
            <TtdCropModal
                isOpen={isTtdCropModalOpen}
                imageSrc={ttdImageForCrop}
                onCropComplete={handleTtdCropComplete}
                onCancel={handleTtdCropCancel}
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
                                <span className="text-xs font-semibold whitespace-nowrap ml-4">Ref. Surat:</span>
                                {isPrintMode ? (
                                    <span className="font-normal text-xs">{form.referensiSurat || "-"}</span>
                                ) : (
                                    <div className="flex-1 text-xs">
                                        <Select
                                            name="referensiSurat"
                                            value={form.referensiSurat ? { value: form.referensiSurat, label: form.referensiSurat } : null}
                                            onChange={(option) =>
                                                setForm((f) => ({ ...f, referensiSurat: option ? option.value : "" }))
                                            }
                                            options={refSuratOptions.map((opt) => ({ value: opt.nomor_surat, label: opt.nomor_surat }))}
                                            placeholder="Pilih referensi surat..."
                                            className="select-input-only"
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
                                                indicatorsContainer: (base) => ({...base, height: '26px'}),
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
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-semibold">Pelapor</div>

                            {!ttdPelaporPreview && !isPrintMode && (
                                <div className="mt-3 text-center no-print">
                                    <button
                                        onClick={handleTtdButtonClick}
                                        className="flex flex-col items-center gap-2 cursor-pointer mb-2 text-blue-600 hover:text-blue-800 transition"
                                    >
                                        <Upload size={16} />
                                        {ttdHistory.length > 0 ? 'Pilih/Ulang Tanda Tangan' : 'Upload Tanda Tangan Pelapor'}
                                    </button>

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
                                        onClick={handleTtdButtonClick}
                                        className="mt-2 text-xs text-red-600 hover:text-red-800 underline"
                                    >
                                        Ganti/Ulang Tanda Tangan
                                    </button>
                                </div>
                            )}

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