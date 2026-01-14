"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload, X, Check, AlertTriangle, Loader2, PlusCircle, History, Crop, Settings, Trash2, Lock, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select";
import Cropper, { Point, Area } from 'react-easy-crop';

// --- KONFIGURASI URL LANGSUNG KE GATEWAY ---

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const API_BASE_URL_SATKER = process.env.NEXT_PUBLIC_API_BASE_URL_PORTAL_PEGAWAI || "";
const IMAGE_STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || "";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-dev/file-handler/api/upload/foto";
const FILE_HANDLER_MULTIPLE_URL = "https://gateway.pdamkotasmg.co.id/api-gw-dev/file-handler/api/upload/multiple/foto";

// URL Endpoint
const GET_HAL_URL = `${API_BASE_URL}/hal`;
const GET_SATKER_URL = `${API_BASE_URL_SATKER}/client/satker/all`;
const GET_REF_SURAT_URL = `${API_BASE_URL}/pengajuan/rferensi/surat`; 
const GET_TTD_URL = (npp: string) => `${API_BASE_URL}/user/ttd/${npp}`;
const DELETE_TTD_URL = `${API_BASE_URL}/user/delete/ttd`;

const CREATE_API_URL = `${API_BASE_URL}/pengajuan`;
const UPDATE_API_URL = (uuid: string) => `${API_BASE_URL}/pengajuan/edit/${uuid}`; 
const DETAIL_API_URL = (uuid: string) => `${API_BASE_URL}/pengajuan/view/${uuid}`;

const MAX_RETRIES = 1;
const MAX_FILES = 4;
const PENGAJUAN_MENGETAHUI_KEPALA = process.env.NEXT_PUBLIC_PENGAJUAN_MENGETAHUI_KEPALA || "Plt. Kepala";

// --- TYPES & UI COMPONENTS ---

type SatkerDef = { id: string; label: string; jabatan: string; kd_satker: string; npp_kepala: string; };
type HalOption = { id: string | number; nama_jenis: string };
type RefSuratOption = { 
    uuid: string; 
    nomor_surat: string;
    keterangan: string; 
};
type NotificationType = 'success' | 'error' | 'warning';

type PegawaiDef = {
    id: number;
    name: string;
    npp: string;
    satker_id: number;
    jabatan: string;
};

type SupervisorData = {
    npp: string;
    name: string;
    orgunit: string;
    position: string;
    tlp?: string;
} | null;

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
    mengetahui_name: string | null; 
    mengetahui_tlp: string | null;  
    ttd_pelapor: string | null;
    created_at: string;
};

interface FormDataState {
    hal: string;
    hal_nama: string;
    kepada: string;
    kepadaNpp: string;
    kd_satker: string;
    satker: string;
    kodeBarang: string;
    keterangan: string;
    pelapor: string;
    nppPelapor: string;
    mengetahui: string;
    mengetahui_name: string; 
    nppMengetahui: string;
    referensiSurat: string;
    mengetahuiTlp: string; 
}

interface ModalContent {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
}

type TtdHistoryItem = { originalUrl: string; processedUrl: string };

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

const TtdHistoryModal = ({
    isOpen,
    history,
    onSelect,
    onClose,
    onCreateTtd,
    onDeleteTtd,
}: {
    isOpen: boolean,
    history: TtdHistoryItem[],
    onSelect: (item: TtdHistoryItem) => void,
    onClose: () => void,
    onCreateTtd: () => void,
    onDeleteTtd: (url: string) => Promise<void>
}) => {
    const [selectedTtdItem, setSelectedTtdItem] = useState<TtdHistoryItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleTtdClick = (item: TtdHistoryItem) => {
        if (!isDeleting) setSelectedTtdItem(item);
    };

    const handleApplySelection = () => {
        if (selectedTtdItem) {
            onSelect(selectedTtdItem);
            onClose();
        }
    };
    
    const handleDeleteClick = async () => {
        if (selectedTtdItem) {
            setIsDeleting(true);
            try {
                await onDeleteTtd(selectedTtdItem.originalUrl);
                setSelectedTtdItem(null);
            } catch (error) {
                console.error("Gagal menghapus:", error);
            } finally {
                setIsDeleting(false);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000]">
            <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-2xl transform transition-all">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <History size={24} className="text-blue-600"/> Pilih Tanda Tangan
                    </span>
                    <button
                        onClick={onCreateTtd}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition disabled:opacity-50"
                    >
                        <PlusCircle size={18} />
                        Upload TTD Baru
                    </button>
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    Terdapat {history.length} Tanda Tangan. Pilih salah satu untuk diterapkan.
                </p>

                <div className="grid grid-cols-3 gap-4 max-h-80 overflow-y-auto border p-2 rounded-lg bg-gray-50">
                    {history.length === 0 ? (
                        <div className="col-span-3 text-center py-8 text-gray-400">
                            Belum ada riwayat tanda tangan.
                        </div>
                    ) : (
                        history.map((item, index) => (
                            <div
                                key={index}
                                onClick={() => handleTtdClick(item)}
                                className={`p-2 border-2 rounded-lg cursor-pointer transition-all bg-white shadow-sm relative ${
                                    selectedTtdItem?.processedUrl === item.processedUrl ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-blue-400'
                                } ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <img
                                    src={item.processedUrl}
                                    alt={`TTD ${index + 1}`}
                                    className="w-full h-16 object-contain"
                                />
                                <p className="text-xs text-center mt-1 text-gray-500">TTD #{index + 1}</p>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex justify-between items-center mt-6">
                    <div>
                        {selectedTtdItem && (
                            <button
                                onClick={handleDeleteClick}
                                disabled={isDeleting}
                                className="flex items-center gap-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition disabled:bg-red-400 min-w-[120px] justify-center"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 size={16} className="animate-spin" />
                                        Hapus...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 size={18} />
                                        Hapus TTD
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="px-4 py-2 text-sm font-medium text-white bg-gray-600 rounded-md hover:bg-gray-700 transition disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleApplySelection}
                            disabled={!selectedTtdItem || isDeleting}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-gray-400"
                        >
                            Terapkan
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

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
            image.setAttribute('crossOrigin', 'anonymous');
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

        if (!ctx) return '';

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
                        className="px-3 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 transition flex items-center gap-1 font-medium text-black"
                    >
                        <Settings size={16} />
                        Pengaturan
                    </button>
                </div>

                {showSettings && (
                    <div className="mb-4 p-3 bg-gray-100 rounded-lg border border-gray-300">
                        <h4 className="font-bold text-sm mb-2 text-black">Pengaturan Transparansi</h4>
                        <div>
                            <label className="flex items-center gap-2 text-sm font-bold text-black cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={transparencySettings.useAdvanced}
                                    onChange={(e) => setTransparencySettings(prev => ({
                                        ...prev,
                                        useAdvanced: e.target.checked
                                    }))}
                                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                />
                                Gunakan Mode Transparansi Lanjutan
                            </label>
                            <p className="text-xs text-black mt-1 font-medium">
                                Mode lanjutan lebih baik untuk tanda tangan dengan pencahayaan tidak merata.
                            </p>
                        </div>
                    </div>
                )}

                <div className="relative flex-1 bg-gray-100 rounded-lg overflow-hidden border border-gray-300">
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

                <div className="mt-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-black w-20">Zoom:</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="flex-1 accent-blue-600"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-black w-20">Rotasi:</span>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="flex-1 accent-blue-600"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={showCroppedImage}
                        disabled={isProcessing}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
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

const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// --- HELPER IMAGE PROCESSING ---

async function makeImageTransparent(imgUrl: string, token: string, settings?: { whiteThreshold: number, blackThreshold: number, useAdvanced: boolean }): Promise<string> {
    if (imgUrl.startsWith('data:')) {
        return processImageTransparency(imgUrl, settings);
    }

    return new Promise(async (resolve) => {
        try {
            const res = await fetch(imgUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'image/png, image/jpeg, image/gif',
                },
            });

            if (!res.ok) return resolve(FALLBACK_IMAGE_URL);

            const imageBlob = await res.blob();
            if (!imageBlob.type.startsWith('image/')) return resolve(FALLBACK_IMAGE_URL);

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

async function resizeAndMakeTransparent(
    dataUrl: string, 
    settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean },
    targetWidth: number = 600 
): Promise<string> {
    return new Promise((resolve) => {
        try {
            const whiteThreshold = settings?.whiteThreshold || 235;
            const blackThreshold = settings?.blackThreshold || 35;
            const useAdvanced = settings?.useAdvanced !== false;

            const img = new Image();
            img.crossOrigin = "anonymous";
            img.src = dataUrl;

            img.onload = () => {
                const aspectRatio = img.height / img.width;
                const newWidth = targetWidth;
                const newHeight = Math.round(newWidth * aspectRatio);

                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d")!;
                
                canvas.width = newWidth;
                canvas.height = newHeight;
                
                ctx.drawImage(img, 0, 0, newWidth, newHeight);

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
            console.error("Error dalam resizeAndMakeTransparent:", error);
            resolve(dataUrl);
        }
    });
}

const CustomOption = (props: any) => {
    return (
        <div 
            {...props.innerProps}
            className={`${props.className} flex flex-col py-2 px-3 hover:bg-blue-50 cursor-pointer`}
            title={props.data.keterangan}
        >
            <div className="font-medium text-sm">{props.data.label}</div>
            <div className="text-xs text-gray-500 truncate max-w-xs">
                {props.data.keterangan || "Tidak ada keterangan"}
            </div>
        </div>
    );
};

const CustomSingleValue = (props: any) => {
    return (
        <div {...props.innerProps} className={props.className}>
            <div className="font-medium text-sm">{props.data.label || props.data.value}</div>
        </div>
    );
};

const AccessDeniedUI = () => {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 md:p-10 text-center transform transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                    <Lock className="text-red-600" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-black mb-3">Akses Ditolak</h1>
                <p className="text-black mb-6 leading-relaxed">
                    Maaf, Anda tidak memiliki izin untuk membuat pengajuan baru.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-black mb-1">Membutuhkan izin:</p>
                    <code className="block bg-white px-3 py-2 rounded border border-red-200 text-red-600 font-mono text-sm">
                        workorder-pti.pengajuan.create
                    </code>
                </div>
                <button
                    onClick={() => router.push('/dashboard')} 
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-md"
                >
                    <Home size={18} />
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
};

export default function LampiranPengajuanPage() {
    const router = useRouter();
    const didMountRef = useRef(false);

    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    const [satkerAsalDisplay, setSatkerAsalDisplay] = useState<string>("");

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
        kepadaNpp: "",
        kd_satker: "",
        satker: "",
        kodeBarang: "",
        keterangan: "",
        pelapor: "",
        nppPelapor: "",
        mengetahui: "",
        mengetahui_name: "",
        nppMengetahui: "",
        referensiSurat: "",
        mengetahuiTlp: "",
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

    const [supervisorOrgunit, setSupervisorOrgunit] = useState<string>("");

    const selectedRefSuratOption = refSuratOptions.find(opt => opt.nomor_surat === form.referensiSurat);

    const handleReferensiSuratChange = (option: any) => {
        const selectedValue = option ? option.value : "";
        
        setForm((f) => ({ 
            ...f, 
            referensiSurat: selectedValue 
        }));
        
        if (selectedValue) {
            const refSurat = refSuratOptions.find(opt => opt.nomor_surat === selectedValue);
            if (refSurat) {
                const italicRef = `<i>${refSurat.nomor_surat}</i>`;
                
                if (form.keterangan) {
                    const lines = form.keterangan.split('\n');
                    if (lines.length >= 4) {
                        lines[3] = italicRef;
                        setForm((f) => ({ 
                            ...f, 
                            keterangan: lines.join('\n') 
                        }));
                    } else {
                        while (lines.length < 3) {
                            lines.push('');
                        }
                        lines.push(italicRef);
                        setForm((f) => ({ 
                            ...f, 
                            keterangan: lines.join('\n') 
                        }));
                    }
                } else {
                    const newKeterangan = ['', '', '', italicRef].join('\n');
                    setForm((f) => ({ 
                        ...f, 
                        keterangan: newKeterangan 
                    }));
                }
            }
        }
    };

    // --- HELPER FUNCTIONS FROM SERVER PROXY MOVED TO CLIENT ---

    function generateDynamicPath(type: 'ttd' | 'pengajuans'): string {
        const now = new Date();
        const year = now.getFullYear();
        const month = (now.getMonth() + 1).toString().padStart(2, '0');
        return `work-order/${year}/${month}/`; 
    }

        // --- HELPER FUNCTIONS UPDATED ---

    async function uploadToHandler(file: File, token: string, fileName: string, type: 'ttd' | 'pengajuans'): Promise<string> {
        const formData = new FormData();
        const path = generateDynamicPath(type);
        
        formData.append('photo', file, fileName);
        formData.append('filename', fileName); 
        formData.append('path', path);

        const res = await fetch(FILE_HANDLER_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Gagal upload file ke server.");
        }

        const json = await res.json();
        if (json.data?.filepath) {
            return json.data.filepath;
        }
        throw new Error("Format respons upload tidak valid.");
    }

        async function uploadMultipleToHandler(files: File[], token: string, namePrefix: string): Promise<string[]> {
        if (files.length === 0) return [];

        const formData = new FormData();
        
        // --- PERBAIKAN DISINI ---
        const basePath = generateDynamicPath('pengajuans');
        const path = `${basePath}work-order-pengajuan-foto/`; 
        // ----------------------

        formData.append('path', path);
        formData.append('photo_count', files.length.toString());

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop();
            
            const fileName = `${namePrefix}-${i}.${ext}`;
            const iUpload = i + 1; 
            
            formData.append(`photo_${iUpload}`, file, fileName);
            formData.append(`filename_${iUpload}`, fileName);
        }

        const res = await fetch(FILE_HANDLER_MULTIPLE_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "Gagal upload multiple file.");
        }

        const json = await res.json();
        if (json.data && typeof json.data === 'object' && !Array.isArray(json.data)) {
            return Object.values(json.data).map((item: any) => item.filepath);
        }

        throw new Error("Format respons multiple upload tidak valid.");
    }

    // --- END HELPERS ---

    const fetchTtdHistory = useCallback(async (token: string, npp: string) => {
        try {
            const res = await fetch(GET_TTD_URL(npp), {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (res.ok) {
                const json = await res.json();
                const serverTtdPath = json.ttd_path || null;
                const serverTtdList = json.ttd_list || [];
                
                const normalizeUrl = (path: string): string => {
                    if (path.startsWith('http')) return path;
                    return `${IMAGE_STORAGE_BASE_URL}${path}`;
                };

                let rawPaths: string[] = [];
                if (serverTtdPath) rawPaths.push(serverTtdPath);
                if (Array.isArray(serverTtdList)) rawPaths.push(...serverTtdList);

                const uniqueNormalizedPaths = Array.from(new Set(rawPaths.map(normalizeUrl)));
                
                if (uniqueNormalizedPaths.length > 0) {
                    const historyItems: TtdHistoryItem[] = await Promise.all(
                        uniqueNormalizedPaths.map(async (finalUrl: string) => {
                            const processedUrl = await makeImageTransparent(finalUrl, token, transparencySettings);
                            return { originalUrl: finalUrl, processedUrl };
                        })
                    );

                    setTtdHistory(historyItems);
                    
                    if (historyItems.length > 0) {
                        const primaryTtdItem = historyItems.find(item => item.originalUrl === normalizeUrl(serverTtdPath || "")) || historyItems[0];
                        setTtdPelaporPreview(primaryTtdItem.processedUrl);
                        setTtdScale(1.8); 
                    }
                }
            }
        } catch (err) {
            console.error("Error fetching TTD history:", err);
        }
    }, [transparencySettings]);

 
        const fetchSupervisor = useCallback(async (token: string): Promise<SupervisorData> => {
        try {
            const url = `${API_BASE_URL_SATKER}/auth/my-supervisor`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (!res.ok) {
                console.warn("Gagal memuat data supervisor (Status):", res.status);
                return null;
            }

            const result = await res.json();
            
            if (result.npp && result.name) {
                return {
                    npp: result.npp,
                    name: result.name,
                    orgunit: result.orgunit || '',
                    position: result.position || '',
                    tlp: result.tlp || ''
                };
            }
            
            if (result.success && result.data && result.data.npp) {
                return {
                    npp: result.data.npp,
                    name: result.data.name,
                    orgunit: result.data.orgunit || '',
                    position: result.data.position || '',
                    tlp: result.data.tlp || ''
                };
            }

            if (result.status === 200 && result.data && result.data.npp) {
                return {
                    npp: result.data.npp,
                    name: result.data.name,
                    orgunit: result.data.orgunit || '',
                    position: result.data.position || '',
                    tlp: result.data.tlp || ''
                };
            }
            
            console.warn("⚠️ Data supervisor tidak ditemukan atau struktur tidak sesuai:", result);
            return null;

        } catch (err) {
            console.error("❌ Error fetching supervisor data direct API:", err);
            return null;
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            let perms: string[] = [];
            if (storedPermissions) {
                try { perms = JSON.parse(storedPermissions); } catch (e) {}
            }
            if (perms.includes('workorder-pti.pengajuan.create')) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
            setPermissionsLoaded(true);
        }
    }, []);

        useEffect(() => {
        if (!permissionsLoaded) return;
        if (!hasAccess) { setInitialLoading(false); setLoading(false); return; }
        if (didMountRef.current) return;
        didMountRef.current = true;

        const token = localStorage.getItem("token");
        
        // --- PERBAIKAN 1: Paksa hapus UUID agar tidak dianggap Mode Edit ---
        localStorage.removeItem("current_edit_uuid"); 
        const storedUuid = null; // Set ke null secara eksplisit
        setEditUuid(storedUuid);

        if (!token) { router.push("/"); return; }

        const fetchInitialData = async () => {
            setInitialLoading(true);
            const headers = { Authorization: `Bearer ${token}` };
            let userNpp = null;
            let halOptionsMap: HalOption[] = [];
            let satkersMap: SatkerDef[] = []; 
            let refOptionsMap: RefSuratOption[] = [];
            
            let kdParentAsal = "";
            let namaSatkerAsal = "";
            const userDataString = localStorage.getItem("user_data");
            if (userDataString) {
                try {
                    const localUserData = JSON.parse(userDataString);
                    kdParentAsal = localUserData.kdparent || ""; 
                    namaSatkerAsal = localUserData.satker || "";
                    setSatkerAsalDisplay(namaSatkerAsal);
                } catch (e) {}
            }

            try {
                // Fetch Dropdowns
                const [halRes, satkerRes, refSuratRes] = await Promise.all([
                    fetch(GET_HAL_URL, { headers, cache: "no-store" }),
                    fetch(GET_SATKER_URL, { headers }), 
                    fetch(GET_REF_SURAT_URL, { headers, cache: "no-store" }),
                ]);

                const halJson = await halRes.json();
                if (halJson?.success && Array.isArray(halJson.data)) {
                    halOptionsMap = halJson.data.map((item: any) => ({ id: item.id, nama_jenis: item.nama_jenis }));
                    setHalOptions(halOptionsMap);
                }

                const satkerData = await satkerRes.json();
                if (Array.isArray(satkerData?.data)) {
                    satkersMap = satkerData.data.map((item: any) => ({
                        id: item.id?.toString(),
                        label: item.satker_name,
                        jabatan: item.jabsatker || "Ka.Unit",
                        kd_satker: item.kd_satker,            
                        npp_kepala: item.npp_kepala_satker || ""
                    }));
                    setSatkers(satkersMap);
                }

                const refSuratJson = await refSuratRes.json();
                if (refSuratJson?.success && Array.isArray(refSuratJson.data)) {
                    refOptionsMap = refSuratJson.data.map((item: any) => ({
                        uuid: item.uuid || null,
                        nomor_surat: item.no_surat,
                        keterangan: item.keterangan || "",
                    }));
                    setRefSuratOptions(refOptionsMap);
                }

                // Ambil Data Pelapor dari LocalStorage
                if (userDataString) {
                    const localUserData = JSON.parse(userDataString);
                    userNpp = localUserData.npp;
                    setUser({ nama: localUserData.nama, npp: localUserData.npp });
                    setForm((f) => ({
                        ...f,
                        pelapor: localUserData.nama,
                        nppPelapor: localUserData.npp,
                        satker: kdParentAsal,
                        kd_satker: kdParentAsal,
                    }));
                }

                // Ambil Data Supervisor (API) untuk Mengetahui & No Telp
                let supervisorData = await fetchSupervisor(token);
                if (supervisorData) {
                    setForm(f => ({
                        ...f,
                        mengetahui: `${PENGAJUAN_MENGETAHUI_KEPALA} ${supervisorData!.orgunit || ''}`,
                        mengetahui_name: supervisorData!.name,
                        nppMengetahui: supervisorData!.npp,
                        mengetahuiTlp: supervisorData!.tlp || '', // Pastikan TLP terisi dari sini
                    }));
                    setSupervisorOrgunit(supervisorData.orgunit);
                }

                // Ambil Riwayat TTD
                if (userNpp) await fetchTtdHistory(token, userNpp);
 

            } catch (err: any) {
                console.error("Error fetch data:", err);
                setNotification({ type: 'error', message: `Gagal memuat data: ${err.message}` });
            } finally {
                setInitialLoading(false);
            }
        };

        fetchInitialData();
    }, [router, fetchTtdHistory, fetchSupervisor, permissionsLoaded, hasAccess]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
        if (isExistingFile) setExistingFilePaths(prev => prev.filter((_, i) => i !== index));
        else {
            const newFileIndex = index - existingFilePaths.length;
            setFiles(prev => prev.filter((_, i) => i !== newFileIndex));
        }
        const removedPreview = previews[index];
        setPreviews(prev => prev.filter((_, i) => i !== index));
        if (!removedPreview.startsWith('http')) URL.revokeObjectURL(removedPreview);
    };

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
        if (settings) setTransparencySettings(settings);
        const transparentAndResizedUrl = await resizeAndMakeTransparent(croppedImage, settings || transparencySettings, 600);
        setTtdPelaporPreview(transparentAndResizedUrl);
        setTtdScale(1.8);
    };

    const handleTtdCropCancel = () => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);
        setTtdPelaporFile(null);
    };

    const handleTtdSelectionFromHistory = (item: TtdHistoryItem) => {
        setTtdPelaporPreview(item.processedUrl);
        setTtdPelaporFile(null);
        setTtdScale(1.8);
        setIsTtdHistoryModalOpen(false);
    };

    const handleCreateTtd = useCallback(() => {
        setIsTtdHistoryModalOpen(false);
        ttdFileInputRef.current?.click();
    }, []);

    const handleDeleteTtd = useCallback(async (urlToDelete: string) => {
        const token = localStorage.getItem("token");
        if (!token) return;
        try {
            const userNpp = user?.npp;
            if (!userNpp) return;

            // Direct delete ke API
            const res = await fetch(DELETE_TTD_URL, { 
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ npp: userNpp, ttd_url: urlToDelete }),
            });

            if (!res.ok) throw new Error("Gagal menghapus TTD");
            setNotification({ type: 'success', message: 'Tanda tangan berhasil dihapus.' });
            await fetchTtdHistory(token, userNpp);
            setTtdPelaporPreview(null);
            setTtdPelaporFile(null);
        } catch (error: any) {
            console.error("Error deleting TTD:", error);
            setNotification({ type: 'error', message: `Gagal menghapus tanda tangan: ${error.message}` });
        }
    }, [user, fetchTtdHistory]);

    const handleTtdButtonClick = () => {
        if (ttdHistory.length > 0) setIsTtdHistoryModalOpen(true);
        else handleCreateTtd();
    };

    const handlePrint = () => {
        setIsPrintMode(true);
        setTimeout(() => { window.print(); setIsPrintMode(false); }, 300);
    };

    const selectedSatker = satkers.find((s) => s.label === form.satker);
    const mengetahuiPegawai = allPegawai.find(p => p.npp === form.nppMengetahui);
    const jabatanMengetahuiBase = supervisorOrgunit || mengetahuiPegawai?.jabatan || selectedSatker?.jabatan || "Ka.Unit";
    const jabatanMengetahui = `${PENGAJUAN_MENGETAHUI_KEPALA} ${jabatanMengetahuiBase}`;

    const proceedSubmission = useCallback(async () => {
        setIsModalOpen(false);
        setIsSubmitting(true);

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                setNotification({ type: 'error', message: "Token tidak ditemukan." });
                return;
            }

            const formDataToSend = new FormData();
            const selectedSatkerTujuan = satkers.find(s => s.kd_satker === form.kepada);
            const nppKepalaSatkerTujuan = selectedSatkerTujuan?.npp_kepala || "";
            const timestamp = Date.now();

            // 1. Upload TTD
            let ttdFilepath: string | undefined = undefined;
            if (ttdPelaporFile) {
                try {
                    const ttdName = `ttd-pelapor-${editUuid || 'pengajuan'}-${timestamp}.png`;
                    ttdFilepath = await uploadToHandler(ttdPelaporFile, token, ttdName, 'ttd');
                } catch (e: any) {
                    throw new Error(`Gagal upload TTD: ${e.message}`);
                }
            }

            let fileFilepaths: string[] = [];
            if (files.length > 0) {
                try {
                    const timestamp = Date.now(); 
                    const baseName = `work-order-/${form.nppPelapor}-${timestamp}`;

                    if (files.length === 1) {
                        // ============================================
                        // JIKA HANYA 1 FILE: Gunakan Endpoint Single Upload
                        // ============================================
                        const file = files[0];
                        const ext = file.name.split('.').pop();
                        const finalFileName = `${baseName}.${ext}`;
                        
                        console.log("Upload Single File:", finalFileName);
                        const path = await uploadToHandler(file, token, finalFileName, 'pengajuans');
                        fileFilepaths = [path];

                    } else {
                        // ============================================
                        // JIKA FILE > 1: Gunakan Endpoint Multiple Upload
                        // ============================================
                        console.log("Upload Multiple Files:", files.length);
                        fileFilepaths = await uploadMultipleToHandler(files, token, baseName);
                    }
                } catch (e: any) {
                    throw new Error(`Gagal upload lampiran: ${e.message}`);
                }
            }

            formDataToSend.append('hal', form.hal); 
            formDataToSend.append('hal_id', form.hal); 
            formDataToSend.append('hal_nama', form.hal_nama);
            
            formDataToSend.append('kepada', form.kepada); 
            formDataToSend.append('kepadaNpp', nppKepalaSatkerTujuan); 
            formDataToSend.append('kd_satker', form.kepada); 
            
            formDataToSend.append('satker', form.satker); 
            
            formDataToSend.append('kodeBarang', form.kodeBarang);
            formDataToSend.append('kode_barang', form.kodeBarang);
            formDataToSend.append('keterangan', form.keterangan);
            formDataToSend.append('pelapor', form.pelapor);
            formDataToSend.append('nppPelapor', form.nppPelapor);
            formDataToSend.append('npp_pelapor', form.nppPelapor);

            // Optional
            if (form.mengetahui) formDataToSend.append('mengetahui', form.mengetahui);
            if (form.mengetahui_name) formDataToSend.append('mengetahui_name', form.mengetahui_name);
            if (form.nppMengetahui) {
                formDataToSend.append('nppMengetahui', form.nppMengetahui);
                formDataToSend.append('mengetahui_npp', form.nppMengetahui);
            }
            if (form.mengetahuiTlp) formDataToSend.append('mengetahuiTlp', form.mengetahuiTlp);
            if (form.referensiSurat) {
                formDataToSend.append('referensiSurat', form.referensiSurat);
                formDataToSend.append('no_referensi', form.referensiSurat);
            }

            // Edit Mode
            if (isEditMode && editUuid) {
                formDataToSend.append('uuid', editUuid);
                formDataToSend.append('existingFiles', JSON.stringify(existingFilePaths));
            }

            // Files
            const allFilePaths = existingFilePaths.concat(fileFilepaths);
            formDataToSend.append('file_paths', JSON.stringify(allFilePaths));
            
            // TTD
            if (ttdFilepath) {
                formDataToSend.append('ttd_pelapor', ttdFilepath);
                formDataToSend.append('ttdPelapor', ttdFilepath);
            } else if (ttdPelaporPreview && !isEditMode) {
                const processedDataUrl = await resizeAndMakeTransparent(ttdPelaporPreview, transparencySettings, 600);
                const file = await dataURLtoFile(processedDataUrl, `ttd-from-preview-${timestamp}.png`);
                const path = await uploadToHandler(file, token, file.name, 'ttd');
                formDataToSend.append('ttd_pelapor', path);
                formDataToSend.append('ttdPelapor', path);
            }

            // Submit
            const submitUrl = isEditMode ? UPDATE_API_URL(editUuid) : CREATE_API_URL;
            const method = "POST"; 

            const res = await fetch(submitUrl, {
                method: method,
                headers: { "Authorization": `Bearer ${token}` },
                body: formDataToSend,
            });

            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.message || "Gagal mengirim data");
            }

            setNotification({ type: 'success', message: `Berhasil ${isEditMode ? 'diubah' : 'dikirim'}!` });
            localStorage.removeItem('current_edit_uuid');
            router.push("/dashboard/lampiran/riwayat");

        } catch (error: any) {
            console.error("Error submit:", error);
            setNotification({ type: 'error', message: error.message });
        } finally {
            setIsSubmitting(false);
        }
    }, [form, files, ttdPelaporFile, ttdPelaporPreview, isEditMode, editUuid, existingFilePaths, router, satkers, transparencySettings]); 

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
            setNotification({ type: 'error', message: `Data berikut belum lengkap: ${kosong.map((f) => f.label).join(", ")}` });
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

    const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
    const todayStr = `Semarang, ${formatDate(new Date())}`;

    const totalFilesCount = previews.length;
    const isMaxFilesReached = totalFilesCount >= MAX_FILES;

    const renderKeterangan = () => {
        if (isPrintMode) {
            const lines = form.keterangan.split('\n');
            return (
                <div>
                    {lines.map((line, index) => {
                        if (line.includes('<i>') && line.includes('</i>')) {
                            const italicText = line.match(/<i>(.*?)<\/i>/)?.[1] || '';
                            const beforeText = line.split('<i>')[0];
                            const afterText = line.split('</i>')[1] || '';
                            return (
                                <div key={index} style={{ minHeight: '1.2em' }}>
                                    {beforeText}<span style={{ fontStyle: 'italic' }}>{italicText}</span>{afterText}
                                </div>
                            );
                        }
                        return <div key={index} style={{ minHeight: '1.2em' }}>{line || '\u00A0'}</div>;
                    })}
                </div>
            );
        } else {
            return (
                <textarea
                    name="keterangan"
                    value={form.keterangan}
                    onChange={handleChange}
                    placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                    className="w-full resize-none border border-gray-300 rounded p-2"
                    rows={6}
                />
            );
        }
    };

    if (!permissionsLoaded) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 animate-pulse">Memeriksa izin akses...</p>
    </div>
);

if (!hasAccess) return <AccessDeniedUI />;

if (initialLoading) return (
    <div className="flex flex-col justify-center items-center h-screen gap-4">
        <Loader2 className="animate-spin text-blue-600" size={48} />
        <p className="text-gray-500 animate-pulse">Menyiapkan formulir pengajuan...</p>
    </div>
);

    return (
        <div className="p-6 min-h-screen">
            <style>{`@page { size: A4; margin: 20mm; } @media print { body * { visibility: hidden !important; } #print-area, #print-area * { visibility: visible !important; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } .select-print-only { display: block !important; } .select-input-only { display: none !important; } } .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; } .select-print-only { display: none; } .loading-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.7); z-index: 9999; display: flex; justify-content: center; align-items: center; }`}</style>

            <Notification notification={notification} setNotification={setNotification} />
            <ConfirmationModal isOpen={isModalOpen} content={modalContent} />
            <TtdHistoryModal isOpen={isTtdHistoryModalOpen} history={ttdHistory} onSelect={handleTtdSelectionFromHistory} onClose={() => setIsTtdHistoryModalOpen(false)} onCreateTtd={handleCreateTtd} onDeleteTtd={handleDeleteTtd} />
            <TtdCropModal isOpen={isTtdCropModalOpen} imageSrc={ttdImageForCrop} onCropComplete={handleTtdCropComplete} onCancel={handleTtdCropCancel} />

            {isSubmitting && (
                <div className="loading-overlay">
                    <div className="text-center">
                        <Loader2 size={40} className="animate-spin text-blue-600 mx-auto mb-4" />
                        <div className="text-xl font-semibold">Sedang mengirim data...</div>
                    </div>
                </div>
            )}

            <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
                <div className="p-4 flex items-center justify-between border-b no-print">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded text-white"><Droplet /></div>
                        <div>
                            <div className="font-semibold text-base">{isEditMode ? "Edit Pengajuan" : "Lampiran Pengajuan Perbaikan"}</div>
                            <div className="text-xs text-gray-500">Form PDAM</div>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 transition"><Printer size={16} /> Cetak</button>
                </div>
                
                <div id="print-area" className="p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="font-bold text-sm">PERUMDA AIR MINUM TIRTA MOEDAL</div>
                            <div className="font-bold text-sm">KOTA SEMARANG</div>
                        </div>
                        <div className="text-right text-sm"><div>{todayStr}</div></div>
                    </div>
                    
                    <div className="mt-4 flex gap-20">
                        <div className="w-1/2 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold whitespace-nowrap">Hal:</span>
                                {isPrintMode ? <span className="font-normal">{form.hal_nama}</span> : (
                                    <select name="hal" value={form.hal} onChange={handleHalChange} className="flex-1 p-1 border border-gray-300 rounded bg-white text-sm select-input-only">
                                        <option value="">-- Pilih Hal --</option>
                                        {halOptions.map((opt) => (<option key={opt.id} value={opt.id}>{opt.nama_jenis}</option>))}
                                    </select>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mb-1"> {/* Menambahkan sedikit margin bottom */}
                            <span className="text-xs font-semibold whitespace-nowrap w-20">Ref. Surat:</span>
                            {isPrintMode ? (
                                <span className="font-normal text-xs">{form.referensiSurat || "-"}</span>
                            ) : (
                                <div className="flex-1 select-input-only">
                                    <Select
                                        name="referensiSurat"
                                        value={form.referensiSurat ? { value: form.referensiSurat, label: form.referensiSurat } : null}
                                        onChange={handleReferensiSuratChange}
                                        options={refSuratOptions.map((opt) => ({
                                            value: opt.nomor_surat,
                                            label: opt.nomor_surat,
                                            keterangan: opt.keterangan
                                        }))}
                                        placeholder="Pilih referensi..."
                                        className="w-full"
                                        components={{ Option: CustomOption }}
                                        styles={{
                                            menu: (base) => ({ ...base, zIndex: 50, fontSize: '0.8rem' }),
                                            control: (base) => ({
                                                ...base,
                                                minHeight: '28px', // Sedikit lebih tinggi agar teks tidak terpotong
                                                height: '28px',
                                                fontSize: '0.75rem',
                                                border: '1px solid #d1d5db',
                                                boxShadow: 'none',
                                                '&:hover': { border: '1px solid #3b82f6' }
                                            }),
                                            valueContainer: (base) => ({
                                                ...base,
                                                padding: '0 8px',
                                                height: '28px',
                                            }),
                                            indicatorsContainer: (base) => ({
                                                ...base,
                                                height: '28px',
                                            }),
                                            dropdownIndicator: (base) => ({
                                                ...base,
                                                padding: '2px',
                                            }),
                                            clearIndicator: (base) => ({
                                                ...base,
                                                padding: '2px',
                                            })
                                        }}
                                        menuPlacement="auto"
                                        isClearable
                                    />
                                        <div className="text-[9px] text-gray-500 italic mt-0.5">*Opsional</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-1/2 text-sm">
                            Kepada Yth. <br />
                            {isPrintMode ? <div className="font-semibold">{form.kepada}</div> : (
                                <div className="select-input-only">
                                    <Select name="kepada" value={form.kepada ? { value: form.kepada, label: satkers.find(s => s.kd_satker === form.kepada)?.label || form.kepada } : null} onChange={(option) => { const selectedSatker = satkers.find(s => s.kd_satker === option?.value); setForm((f) => ({ ...f, kepada: option ? option.value : "", kepadaNpp: option ? option.npp : "", kd_satker: option ? option.value : "" })); }} options={satkers.map((s) => ({ value: s.kd_satker, label: s.label, npp: s.npp_kepala }))} placeholder="Cari atau pilih tujuan..." className="text-sm w-64" styles={{ menu: (base) => ({...base, zIndex: 50}) }} menuPlacement="auto" />
                                </div>
                            )}
                            <br className="no-print" />
                            PERUMDA AIR MINUM Tirta Moedal <br /> di <strong>SEMARANG</strong>
                        </div>
                    </div>
                    
                    <div className="mt-3 text-sm grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 font-semibold">Satker Asal:</div>
                        <div className="col-span-9">{isPrintMode || !user ? <span>{satkerAsalDisplay || "..."}</span> : <input type="text" name="satker_display" value={satkerAsalDisplay} readOnly={true} className="w-full p-1 border border-gray-300 rounded bg-gray-100 cursor-default" />}</div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center mt-3 text-sm">
                        <div className="col-span-3 font-semibold">Kode Barang :</div>
                        <div className="col-span-9">{isPrintMode ? <span>{form.kodeBarang}</span> : <input type="text" name="kodeBarang" value={form.kodeBarang} onChange={handleChange} placeholder="Isi kode barang" className="w-full p-1 border border-gray-300 rounded" />}</div>
                    </div>
                    
                    <div className="mt-4 big-box text-sm">{renderKeterangan()}</div>
                    
                    <div className="mt-4 no-print">
                        <label className="flex items-center gap-2"><Upload size={16} /> Lampiran Foto/Dokumen ({totalFilesCount} / {MAX_FILES})</label>
                        <div className="mt-3 grid grid-cols-5 gap-3">
                            {previews.map((src, i) => (
                                <div key={i} className="relative group">
                                    <img src={src} alt={`preview-${i}`} className="w-full h-24 object-cover rounded border" />
                                    <button onClick={() => handleRemoveFile(i)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                                    <p className="text-xs mt-1 text-gray-500 truncate">{i < existingFilePaths.length ? `File Lama #${i+1}` : `File Baru #${i+1}`}</p>
                                </div>
                            ))}
                            {totalFilesCount < MAX_FILES && (
                                <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded h-24 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <PlusCircle size={32} className="text-gray-500" />
                                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" onChange={handleAddFile} className="hidden" ref={el => fileInputRefs.current[totalFilesCount] = el} />
                                </label>
                            )}
                        </div>
                    </div>
                    
                    {isPrintMode && previews.length > 0 && <div className="mt-4 grid grid-cols-4 gap-3">{previews.map((src, i) => <img key={i} src={src} alt={`foto-${i}`} className="w-full h-28 object-cover border border-gray-400" />)}</div>}

                    <div className="mt-3 text-xs text-left">Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.</div>
                    
                    <div className="mt-20 flex justify-center text-center gap-40">
                        <div>
                            <div className="text-sm font-semibold">Mengetahui</div>
                            <div className="text-xs">{jabatanMengetahui}</div> 
                            <div className="mt-12 flex justify-center h-[40px] items-center"></div>
                            <div className="mt-1 text-sm">({form.mengetahui_name || "..."})</div>
                            <div className="text-xs mt-1">NPP: {form.nppMengetahui || "__________"}</div>
                        </div>

                        <div>
                            <div className="text-sm font-semibold">Pelapor</div>
                            {ttdPelaporPreview && !isPrintMode && (
                                <div className="ttd-container border border-gray-300 rounded inline-block relative w-[180px] h-[100px] bg-gray-50 shadow-sm no-print">
                                    <Draggable bounds="parent" nodeRef={nodeRef}>
                                        <img ref={nodeRef} src={ttdPelaporPreview} alt="Tanda tangan pelapor" style={{ width: 160, height: 80, transform: `scale(${ttdScale})`, transformOrigin: "center center" }} className="cursor-move absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain" />
                                    </Draggable>
                                </div>
                            )}
                            <div className={`mt-3 text-center no-print ${ttdPelaporPreview ? 'mt-2' : ''}`}>
                                {!isPrintMode && (
                                    <button onClick={handleTtdButtonClick} className={`flex items-center justify-center mx-auto gap-2 cursor-pointer transition ${ttdPelaporPreview ? 'text-red-600 hover:text-red-800 text-xs underline' : 'text-blue-600 hover:text-blue-800 text-sm font-medium'}`}>
                                        <Upload size={16} />
                                        {ttdPelaporPreview ? 'Ganti/Ulang Tanda Tangan' : (ttdHistory.length > 0 ? 'Pilih dari Riwayat/Upload' : 'Upload Tanda Tangan Pelapor')}
                                    </button>
                                )}
                                <input type="file" ref={ttdFileInputRef} id="ttd-file-input-manual" accept="image/*" onChange={handleTtdFileUpload} className="hidden" />
                            </div>
                            {isPrintMode && ttdPelaporPreview && <div className="mt-10 flex justify-center h-[70px] items-center"><img src={ttdPelaporPreview} alt="Tanda tangan pelapor" style={{ transform: `scale(${ttdScale})`, transformOrigin: "center center" }} className="w-28 mb-12 h-auto object-contain" /></div>}
                            <div className="mt-0 text-sm">({form.pelapor || "..."})</div>
                            <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
                        </div>
                    </div>

                    {!isPrintMode && (
                        <button onClick={handleAjukan} disabled={isSubmitting} className={`fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all duration-200 ${isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
                            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Droplet size={18} />}
                            {isSubmitting ? `${isEditMode ? 'Mengubah' : 'Mengajukan'}...` : (isEditMode ? 'Ubah Pengajuan' : 'Ajukan')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}