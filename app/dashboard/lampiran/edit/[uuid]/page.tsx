"use client";

import React, { useState, useEffect, useCallback, useRef, use } from "react";
import { 
    Loader2, AlertTriangle, Home, Save, X, Printer, Droplet, Upload, 
    PlusCircle, Check, Ban, Maximize2, Zap, AlertCircle, FileText, 
    History, Crop, Settings, Trash2, Pencil, Lock
} from "lucide-react";
import Select from "react-select";
import Draggable from "react-draggable";
import Cropper, { Point, Area } from 'react-easy-crop';

const IMAGE_PROXY_PATH = '/api/image-proxy';
const LOCAL_UPDATE_API_STATUS_PATH = `/api/pengajuan/{uuid}/status`;
const REFERENSI_SURAT_LOCAL_PATH = "/api/referensi-surat";
const SUPERVISOR_PROXY_PATH = "/api/my-supervisor";
const TTD_PROXY_PATH = "/api/ttd-proxy";
const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
const PENGAJUAN_MENGETAHUI_KEPALA = process.env.NEXT_PUBLIC_PENGAJUAN_MENGETAHUI_KEPALA || "Plt. Kepala";
const MAX_FILES = 4;
const DETAIL_API_PATH = `/api/pengajuan/view`;
const EDIT_API_PENGAJUAN_PATH = process.env.EDIT_API_PENGAJUAN_URL || `/api/pengajuan/edit/{uuid}`;

type SatkerDef = { id: string; code: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type RefSuratOption = { uuid: string; nomor_surat: string };
type SupervisorData = { npp: string; name: string; orgunit: string; position: string; } | null;
type PegawaiDef = any;
type TtdHistoryItem = { originalUrl: string; processedUrl: string };
type NoSurat = { id:string | number; no_surat:string };
type NotificationType = 'success' | 'error' | 'warning';

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

// MODAL RIWAYAT TTD
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
                                <div className="h-16 w-full flex items-center justify-center">
                                    <img
                                        src={item.processedUrl}
                                        alt={`TTD ${index + 1}`}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
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

// MODAL CROP TTD (Updated Style)
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
                        {/* Judul Hitam Bold */}
                        <h4 className="font-bold text-sm mb-2 text-black">Pengaturan Transparansi</h4>
                        <div>
                            {/* Label Checkbox Hitam Bold */}
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
                            {/* Deskripsi Hitam */}
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
                        {/* Label Hitam Bold */}
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
                        {/* Label Hitam Bold */}
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

// --- FUNGSI AUTO CROP & TRANSPARENCY ---
async function processImageTransparency(dataUrl: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }): Promise<string> {
    return new Promise((resolve) => {
        try {
            const whiteThreshold = settings?.whiteThreshold || 230;
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
                
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
                let hasInk = false;

                if (useAdvanced) {
                    for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            const i = (y * canvas.width + x) * 4;
                            const r = data[i];
                            const g = data[i + 1];
                            const b = data[i + 2];
                            const brightness = (r + g + b) / 3;
                            const colorVariance = Math.max(r, g, b) - Math.min(r, g, b);

                            let isTransparent = false;
                            if (brightness > whiteThreshold || brightness < blackThreshold) {
                                data[i + 3] = 0;
                                isTransparent = true;
                            } else if (colorVariance < 15 && brightness > 100 && brightness < 200) {
                                data[i + 3] = 0;
                                isTransparent = true;
                            } else if (brightness > 220) {
                                data[i + 3] = Math.max(0, 255 - (brightness - 220) * 10);
                                if (data[i + 3] === 0) isTransparent = true;
                            }

                            if (!isTransparent && data[i + 3] > 0) {
                                hasInk = true;
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }
                } else {
                    for (let y = 0; y < canvas.height; y++) {
                        for (let x = 0; x < canvas.width; x++) {
                            const i = (y * canvas.width + x) * 4;
                            const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                            
                            if (brightness > whiteThreshold) {
                                data[i + 3] = 0;
                            } else {
                                hasInk = true;
                                if (x < minX) minX = x;
                                if (x > maxX) maxX = x;
                                if (y < minY) minY = y;
                                if (y > maxY) maxY = y;
                            }
                        }
                    }
                }

                ctx.putImageData(imageData, 0, 0);

                if (hasInk) {
                    const padding = 10;
                    minX = Math.max(0, minX - padding);
                    minY = Math.max(0, minY - padding);
                    maxX = Math.min(canvas.width, maxX + padding);
                    maxY = Math.min(canvas.height, maxY + padding);

                    const cropWidth = maxX - minX;
                    const cropHeight = maxY - minY;

                    const croppedCanvas = document.createElement("canvas");
                    croppedCanvas.width = cropWidth;
                    croppedCanvas.height = cropHeight;
                    const croppedCtx = croppedCanvas.getContext("2d")!;

                    croppedCtx.drawImage(canvas, minX, minY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
                    resolve(croppedCanvas.toDataURL("image/png"));
                } else {
                    resolve(canvas.toDataURL("image/png"));
                }
            };
            img.onerror = () => { resolve(dataUrl); };
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
    return new Promise(async (resolve) => {
        const processed = await processImageTransparency(dataUrl, settings);
        resolve(processed);
    });
}

async function fetchAndMakeTransparent(proxyUrl: string, token: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }): Promise<string> {
    if (proxyUrl.startsWith('data:')) {
        return processImageTransparency(proxyUrl, settings);
    }

    return new Promise(async (resolve) => {
        try {
            let finalUrl = proxyUrl;
            if (!proxyUrl.includes('/api/image-proxy')) {
                const isUrl = proxyUrl.startsWith('http');
                const paramKey = isUrl ? 'url' : 'path';
                finalUrl = `${IMAGE_PROXY_PATH}?${paramKey}=${encodeURIComponent(proxyUrl)}`;
            }
            
            const res = await fetch(finalUrl, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'image/png, image/jpeg, image/gif',
                },
            });
            
            if (!res.ok) {
                return resolve(FALLBACK_IMAGE_URL);
            }

            const imageBlob = await res.blob();
            const dataUrl: string = await new Promise((res, rej) => {
                const reader = new FileReader();
                reader.onloadend = () => res(reader.result as string);
                reader.onerror = rej;
                reader.readAsDataURL(imageBlob);
            });

            const transparentUrl = await processImageTransparency(dataUrl, settings);
            resolve(transparentUrl);

        } catch (error) {
            console.error("Error in fetchAndMakeTransparent:", error);
            resolve(FALLBACK_IMAGE_URL);
        }
    });
}

const formatDate = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${d.getFullYear()}`;
    
const useRouter = () => {
    return {
        push: (path: string) => console.log(`[Route] -> ${path}`),
    };
};

const ConfirmActionModal = ({ 
    isOpen, 
    action, 
    message, 
    rejectReason, 
    setRejectReason, 
    onCancel, 
    onConfirm, 
    isSaving 
}: any) => {
    if (!isOpen || !action) return null;
    
    const isApprove = action === 'approved';
    const buttonColor = isApprove ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700';
    const icon = isApprove ? <Check size={20} className="mr-2" /> : <Ban size={20} className="mr-2" />;

    return (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
            onClick={onCancel}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 text-center">
                    <AlertCircle size={40} className={`mx-auto mb-4 ${isApprove ? 'text-green-500' : 'text-red-500'}`} />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Konfirmasi Aksi
                    </h3>
                    <p className="text-gray-600 text-sm mb-4" dangerouslySetInnerHTML={{ __html: message }} />
                    
                    {!isApprove && (
                        <div className="text-left mb-6">
                            <label htmlFor="rejectReason" className="block text-sm font-semibold text-red-600 mb-1">
                                Alasan Penolakan Wajib Diisi:
                            </label>
                            <textarea
                                id="rejectReason"
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={3}
                                className="w-full p-2 border border-red-400 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500 focus:outline-none text-black"
                                placeholder="Contoh: Lampiran tidak lengkap, revisi di bagian keterangan."
                                required
                                autoFocus
                            />
                            {rejectReason.trim() === '' && (
                                <p className="text-xs text-red-500 mt-1">Alasan diperlukan untuk penolakan.</p>
                            )}
                        </div>
                    )}

                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                            disabled={isSaving}
                        >
                            <X size={16} className="inline mr-1" /> Tidak (Batal)
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-4 py-2 text-white rounded-lg transition flex items-center justify-center 
                                ${buttonColor} 
                                ${!isApprove && rejectReason.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                            disabled={isSaving || (!isApprove && rejectReason.trim() === '')}
                        >
                            {isSaving ? <Loader2 size={20} className="animate-spin mr-2" /> : icon}
                            {isSaving ? 'Memproses...' : 'Ya, Lanjutkan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SaveConfirmModal = ({ 
    isOpen, 
    onCancel, 
    onConfirm, 
    isSaving 
}: {
    isOpen: boolean,
    onCancel: () => void,
    onConfirm: () => void,
    isSaving: boolean
}) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4"
            onClick={onCancel}
        >
            <div 
                className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-5 text-center">
                    <Save size={40} className="mx-auto mb-4 text-blue-500" />
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        Konfirmasi Simpan Perubahan
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                        Apakah Anda yakin ingin menyimpan perubahan pada data pengajuan ini?
                    </p>

                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
                            disabled={isSaving}
                        >
                            <X size={16} className="inline mr-1" /> Batal
                        </button>
                        <button
                            onClick={onConfirm}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                            disabled={isSaving}
                        >
                            {isSaving ? <Loader2 size={20} className="animate-spin mr-2" /> : <Save size={20} className="mr-2" />}
                            {isSaving ? 'Menyimpan...' : 'Ya, Simpan Perubahan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const cleanFilePath = (path: string): string => {
    if (!path) return "";
    let cleaned = path.replace(/\/\//g, '/');
    cleaned = cleaned.replace(/(\.[\w\d]+)\1$/i, '$1');
    return cleaned;
};

// --- COMPONENT: ACCESS DENIED UI ---
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
                    Maaf, Anda tidak memiliki izin untuk mengedit pengajuan ini.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-black mb-1">Membutuhkan salah satu izin:</p>
                    <ul className="list-disc list-inside text-sm text-red-600 font-mono">
                        <li>workorder-pti.pengajuan.edit</li>
                        <li>workorder-pti.pengajuan.riwayat.edit</li>
                    </ul>
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

// --- START COMPONENT ---

export default function EditPengajuanForm({ params }: { params: Promise<{ uuid: string }> }) {
    const router = useRouter();
    const unwrappedParams = use(params); 
    const uuid = unwrappedParams.uuid;
    const didMountRef = useRef(false);
    const isEditMode = !!uuid;

    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    const [halOptions, setHalOptions] = useState<HalOption[]>([]);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);
    const [refSuratOptions, setRefSuratOptions] = useState<RefSuratOption[]>([]);
    const [isInitialLoading, setIsInitialLoading] = useState(true);

    const [loading, setLoading] = useState(true);
    const [statusPengajuan, setStatusPengajuan] = useState<string>('');
    const [catatanStatus, setCatatanStatus] = useState<string>('');
    const [formData, setFormData] = useState<any>({
        uuid: "", hal: "", hal_nama: "", kepada: "", satker: "", name_pelapor: "", npp_pelapor: "",
        tlp_pelapor: "", kode_barang: "", keterangan: "", file: [], mengetahui: "", npp_mengetahui: "",
        no_surat: "", no_referensi: "", ttd_pelapor: "", ttd_mengetahui: "",
        pelapor: "", nppPelapor: "", kodeBarang: "", referensiSurat: "",
        mengetahui_name: "",
    });

    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
    const [ttdMengetahuiPreview, setTtdMengetahuiPreview] = useState<string | null>(null);

    const [newFiles, setNewFiles] = useState<File[]>([]);
    const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const [ttdMengetahuiFile, setTtdMengetahuiFile] = useState<File | null>(null);
    const [ttdMengetahuiHistory, setTtdMengetahuiHistory] = useState<TtdHistoryItem[]>([]);
    const [isTtdMengetahuiHistoryModalOpen, setIsTtdMengetahuiHistoryModalOpen] = useState(false);
    const [isTtdMengetahuiCropModalOpen, setIsTtdMengetahuiCropModalOpen] = useState(false);
    const [ttdMengetahuiImageForCrop, setTtdMengetahuiImageForCrop] = useState<string | null>(null);
    const ttdMengetahuiFileInputRef = useRef<HTMLInputElement>(null);
    const [transparencySettings, setTransparencySettings] = useState({
        whiteThreshold: 235,
        blackThreshold: 35,
        useAdvanced: true
    });
    const [notification, setNotification] = useState<{ type: NotificationType, message: string } | null>(null);

    const [modalImageSrc, setModalImageSrc] = useState<string | null>(null);
    
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        action: 'approved' | 'rejected' | null;
        message: string;
        rejectReason: string;
    }>({ isOpen: false, action: null, message: '', rejectReason: '' }); 

    const [saveConfirmModal, setSaveConfirmModal] = useState<{
        isOpen: boolean;
    }>({ isOpen: false });

    const [error, setError] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isPrintMode, setIsPrintMode] = useState(false);

    const [currentUserNpp, setCurrentUserNpp] = useState<string | null>(null);

    // 2. TAMBAHKAN USE EFFECT INI (Untuk ambil NPP user yang login)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const userStr = localStorage.getItem("user_data");
            if (userStr) {
                try {
                    const userObj = JSON.parse(userStr);
                    // Pastikan key 'npp' sesuai dengan penyimpanan localstorage anda
                    setCurrentUserNpp(userObj.npp || userObj.user_npp || null); 
                } catch (e) { console.error("Gagal parse user data", e); }
            }
        }
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            let perms: string[] = [];
            
            if (storedPermissions) {
                try {
                    perms = JSON.parse(storedPermissions);
                } catch (e) {
                    console.error("Error parsing permissions", e);
                }
            }

            // Logic: Jika punya SALAH SATU dari dua permission ini, maka akses diberikan.
            const hasEditPermission = perms.includes('workorder-pti.pengajuan.edit');
            const hasRiwayatEditPermission = perms.includes('workorder-pti.pengajuan.riwayat.edit');

            if (hasEditPermission || hasRiwayatEditPermission) {
                setHasAccess(true);
            } else {
                setHasAccess(false);
            }
            
            setPermissionsLoaded(true);
        }
    }, []);

    // --- HANDLER LOGIC ---
   // Tambahkan return Promise<TtdHistoryItem[]> di tipe return
const fetchTtdMengetahuiHistory = useCallback(async (token: string, npp: string): Promise<TtdHistoryItem[]> => {
    try {
        const res = await fetch(`${TTD_PROXY_PATH}/${npp}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
        });

        if (res.ok) {
            const json = await res.json();
            const serverTtdPath = json.ttd_path || null;
            const serverTtdList = json.ttd_list || [];
            
            const normalizeUrl = (path: string): string => {
                if (path.startsWith('http')) return path; 
                const base = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=";
                const cleanPath = path.startsWith('/') ? path.slice(1) : path;
                return `${base}${cleanPath}`;
            };

            let rawPaths: string[] = [];
            if (serverTtdPath && typeof serverTtdPath === 'string') rawPaths.push(serverTtdPath);
            if (Array.isArray(serverTtdList)) rawPaths.push(...serverTtdList);

            const uniqueNormalizedPaths = Array.from(new Set(rawPaths.map(normalizeUrl)));
            
            if (uniqueNormalizedPaths.length > 0) {
                const historyItems: TtdHistoryItem[] = await Promise.all(
                    uniqueNormalizedPaths.map(async (finalUrl: string) => {
                        // Gunakan setting default untuk processing background history
                        const processedUrl = await fetchAndMakeTransparent(finalUrl, token, { whiteThreshold: 235, blackThreshold: 35, useAdvanced: true });
                        return {
                            originalUrl: finalUrl,
                            processedUrl: processedUrl,
                        };
                    })
                );

                setTtdMengetahuiHistory(historyItems);
                return historyItems; // <--- PENTING: Return data history
            }
        }
        return []; 
    } catch (err) {
        console.error("Error fetching TTD history:", err);
        return [];
    }
}, [transparencySettings]);

    const handleTtdUpload = (e: React.ChangeEvent<HTMLInputElement>, role: 'mengetahui' | 'pelapor') => {
        const file = e.target.files?.[0];
        if (file) {
            if (role === 'mengetahui') {
                setTtdMengetahuiFile(file);
                const previewUrl = URL.createObjectURL(file);
                setTtdMengetahuiImageForCrop(previewUrl);
                setIsTtdMengetahuiCropModalOpen(true);
            } else {
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const dataUrl = reader.result as string;
                    const transparentTtdUrl = await processImageTransparency(dataUrl);

                    setTtdPelaporPreview(transparentTtdUrl);
                    setFormData((p: any) => ({ ...p, ttd_pelapor: 'UPLOADED_LOCAL' }));
                };
                reader.readAsDataURL(file);
            }
        }
        e.target.value = '';
    };

const handleAddFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    
    const file = e.target.files[0];
    
    if (filePreviews.length + newFiles.length >= MAX_FILES) {
        setNotification({
            type: 'warning',
            message: `Maksimum upload adalah ${MAX_FILES} file.`
        });
        return;
    }
    
    setNewFiles(prev => [...prev, file]);
    
    const previewUrl = URL.createObjectURL(file);
    setFilePreviews(prev => [...prev, previewUrl]);
    
    e.target.value = '';
};

const handleRemoveFile = (index: number) => {
    const removedPreview = filePreviews[index];
    setFilePreviews(prev => prev.filter((_, i) => i !== index));
    
    if (index >= filePreviews.length - newFiles.length) {
        const newFileIndex = index - (filePreviews.length - newFiles.length);
        setNewFiles(prev => prev.filter((_, i) => i !== newFileIndex));
    }
    
    if (!removedPreview.startsWith('http')) {
        URL.revokeObjectURL(removedPreview);
    }
};

    const handleTtdMengetahuiCropComplete = async (
    croppedImage: string, 
    settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }
) => {
    setIsTtdMengetahuiCropModalOpen(false);
    setTtdMengetahuiImageForCrop(null);

    const defaultSettings = {
        whiteThreshold: 235,
        blackThreshold: 35,
        useAdvanced: true
    };
    
    const finalSettings = settings || defaultSettings;
    
    if (settings) {
        setTransparencySettings(settings);
    }

    const transparentAndResizedUrl = await resizeAndMakeTransparent(
        croppedImage, 
        finalSettings, 
        600  
    );
    
    setTtdMengetahuiPreview(transparentAndResizedUrl);
    setFormData((p: any) => ({ ...p, ttd_mengetahui: 'UPLOADED_LOCAL' }));
};

    const handleTtdMengetahuiCropCancel = () => {
        setIsTtdMengetahuiCropModalOpen(false);
        setTtdMengetahuiImageForCrop(null);
        setTtdMengetahuiFile(null);
    };

    const handleTtdMengetahuiSelectionFromHistory = (item: TtdHistoryItem) => {
        setTtdMengetahuiPreview(item.processedUrl);
        setTtdMengetahuiFile(null);
        setFormData((p: any) => ({ ...p, ttd_mengetahui: 'UPLOADED_LOCAL' }));
        setIsTtdMengetahuiHistoryModalOpen(false);
    };

    const handleCreateTtdMengetahui = useCallback(() => {
        setIsTtdMengetahuiHistoryModalOpen(false);
        if (ttdMengetahuiFileInputRef.current) {
            ttdMengetahuiFileInputRef.current.click();
        }
    }, []);

    const handleDeleteTtdMengetahui = useCallback(async (urlToDelete: string) => {
        const token = localStorage.getItem("token");
        if (!token) {
            setNotification({ type: 'error', message: 'Token tidak ditemukan. Gagal menghapus TTD.' });
            return;
        }

        try {
            const userNpp = formData.npp_mengetahui;
            if (!userNpp) {
                setNotification({ type: 'error', message: 'NPP pengguna tidak ditemukan.' });
                return;
            }

            const res = await fetch(`/api/user/delete/ttd`, { 
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
            
            await fetchTtdMengetahuiHistory(token, userNpp);

            setTtdMengetahuiPreview(null);
            setTtdMengetahuiFile(null);

        } catch (error: any) {
            console.error("Error deleting TTD:", error);
            setNotification({ type: 'error', message: `Gagal menghapus tanda tangan: ${error.message}` });
        }
    }, [formData.npp_mengetahui, fetchTtdMengetahuiHistory, setNotification]);

    const handleTtdMengetahuiButtonClick = () => {
        if (ttdMengetahuiHistory.length > 0) {
            setIsTtdMengetahuiHistoryModalOpen(true);
        } else {
            handleCreateTtdMengetahui();
        }
    };
    
    const handleHalChange = (option: { value: string, label: string } | null) => {
        const selectedId = option ? option.value : "";
        const selectedLabel = option ? option.label : "";

        setFormData((p: any) => ({
            ...p,
            hal: selectedId,
            hal_nama: selectedLabel,
        }));
    };

    const handleSelectChange = (name: string, option: { value: string, label: string } | null) => {
    const value = option ? option.value : ""; 
    const label = option ? option.label : "";

    setFormData((p: any) => {
        const newData = { ...p };

        if (name === 'kepada') {
            newData.kepada = label;       
            newData.kd_satker = value;   
        } else if (name === 'referensiSurat') {
            newData.referensiSurat = value;
            newData.no_referensi = value;
        } else {
            newData[name] = value;
        }

        return newData;
    });
};

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        
        setFormData((prevData: any) => ({
            ...prevData,
            [name]: value,
            ...(name === 'pelapor' && { name_pelapor: value }),
            ...(name === 'nppPelapor' && { npp_pelapor: value }),
            ...(name === 'kodeBarang' && { kode_barang: value }),
            ...(name === 'referensiSurat' && { no_referensi: value }),
            ...(name === 'nppMengetahui' && { npp_mengetahui: value }),
        }));
    };

    const handleSaveClick = (e: React.FormEvent) => {
        e.preventDefault();
        setSaveConfirmModal({ isOpen: true });
    };

const handleUpdate = async () => {
        if (!formData) return;
        
        setIsSaving(true);
        setError(null);
        
        const token = localStorage.getItem('token');
        if (!token) {
            setNotification({ type: 'error', message: 'Token hilang. Login ulang.' });
            setIsSaving(false);
            return;
        }
        
        try {
            // --- BAGIAN INI DIUBAH ---
            // 1. Upload File Baru (Multiple)
            let uploadedFilePaths: string[] = [];
            
            if (newFiles.length > 0) {
                setNotification({ type: 'warning', message: `Sedang mengupload ${newFiles.length} lampiran baru...` });
                
                try {
                    // Panggil fungsi multiple upload sekali saja
                    const paths = await uploadMultipleLampiran(newFiles, token);
                    uploadedFilePaths = paths;
                    
                    console.log("Sukses upload multiple:", uploadedFilePaths);

                } catch (uploadErr: any) {
                    console.error("Gagal upload multiple:", uploadErr);
                    setNotification({ type: 'error', message: `Gagal upload file: ${uploadErr.message}` });
                    setIsSaving(false);
                    return; // Stop jika upload gagal
                }
            }
        
        const currentFiles = Array.isArray(formData.file) ? formData.file : [];
        const combinedFiles = [...currentFiles, ...uploadedFilePaths];

        console.log("File Lama:", currentFiles);
        console.log("File Baru:", uploadedFilePaths);
        console.log("Total yang dikirim:", combinedFiles);

        const apiData = {
            hal: formData.hal,
            hal_id: formData.hal,
            hal_nama: formData.hal_nama,
            kepada: formData.kepada,
            kd_satker: formData.kd_satker,
            satker: formData.satker_id,
            name_pelapor: formData.name_pelapor,
            npp_pelapor: formData.npp_pelapor,
            tlp_pelapor: formData.tlp_pelapor,
            kode_barang: formData.kode_barang,
            keterangan: formData.keterangan,
            file_paths: JSON.stringify(combinedFiles),
            mengetahui: formData.mengetahui,
            npp_mengetahui: formData.npp_mengetahui,
            no_surat: formData.no_surat,
            no_referensi: formData.no_referensi,
            ttd_pelapor: formData.ttd_pelapor, 
            ttd_mengetahui: formData.ttd_mengetahui
        };
        
        const response = await fetch(`/api/pengajuan/edit/${uuid}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiData),
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Gagal update data.');
        }
        
        setNotification({ type: 'success', message: 'Data berhasil diperbarui!' });
        setSaveConfirmModal({ isOpen: false });
        
        setTimeout(() => {
            router.push("/dashboard/lampiran");
        }, 1500);
        
    } catch (error: any) {
        console.error('Update error:', error);
        setNotification({ type: 'error', message: error.message });
    } finally {
        setIsSaving(false);
    }
};

const uploadSignatureToFileHandler = async (file: File, token: string): Promise<string> => {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('filename', `ttd-mengetahui-${uuid}`);
    
    const date = new Date();
    const folderPath = `work-order/${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/`;
    formData.append('path', folderPath);

    const res = await fetch('/api/file-handler/foto', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        body: formData
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mengupload tanda tangan ke server.");
    }

    const json = await res.json();
    
    
    if (json.data && json.data.filepath) {
        return json.data.filepath;
    } else if (json.data && json.data.local_path) {
        return json.data.local_path; 
    }
    
    throw new Error("Respon upload tidak valid.");
};


const uploadMultipleLampiran = async (files: File[], token: string): Promise<string[]> => {
    const formData = new FormData();
    
    // 1. Set Jumlah Foto
    formData.append('photo_count', files.length.toString());

    // 2. Loop append file ke FormData sesuai format yang diminta API Route
    files.forEach((file, index) => {
        const i = index + 1; // Index dimulai dari 1 (photo_1, photo_2)
        
        formData.append(`photo_${i}`, file);
        
        // Generate nama dasar sementara (API Route akan menambahkan Unique ID & Timestamp)
        const randomStr = Math.random().toString(36).substring(2, 8);
        const filename = `work-order-lampiran-${randomStr}`; 
        formData.append(`filename_${i}`, filename);
    });

    // 3. Tembak ke API Route Next.js yang baru dibuat
    const res = await fetch('/api/file-handler/upload/multiple/foto', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Gagal mengupload lampiran (Multiple).");
    }

    const json = await res.json();

    // 4. Ambil array path bersih dari response API
    if (json.success && Array.isArray(json.clean_filepaths)) {
        return json.clean_filepaths;
    } else {
        throw new Error("Format respons upload tidak valid.");
    }
};

const executeStatusUpdate = async (status: 'approved' | 'rejected') => {
    if (!uuid) return;

    if (status === 'rejected' && confirmModal.rejectReason.trim() === '') {
        alert('Alasan penolakan wajib diisi.');
        return;
    }

    setConfirmModal(p => ({ ...p, isOpen: false }));
    setIsSaving(true);
    setError(null);

    const token = localStorage.getItem('token');
    if (!token) {
        setNotification({ type: 'error', message: 'Sesi habis, silakan login ulang.' });
        setIsSaving(false);
        return;
    }

    const apiUrl = LOCAL_UPDATE_API_STATUS_PATH.replace('{uuid}', uuid);
    
    const apiBody: any = {
        status: status,
        mengetahui: formData.mengetahui,
        npp_mengetahui: formData.npp_mengetahui,
    };

    if (status === 'rejected') {
        apiBody.catatan_status = confirmModal.rejectReason;
    } else if (status === 'approved') {
        // --- LOGIKA BARU: UPLOAD OTOMATIS SAAT APPROVE ---
        
        let finalTtdUrl = formData.ttd_mengetahui;

        // Cek 1: Apakah ada file baru yang dipilih/dicrop (ttdMengetahuiFile)
        if (ttdMengetahuiFile) {
            try {
                // Tampilkan notifikasi proses upload
                setNotification({ type: 'warning', message: 'Sedang mengupload tanda tangan...' });
                
                // Lakukan Upload ke File Handler
                const uploadedPath = await uploadSignatureToFileHandler(ttdMengetahuiFile, token);
                
                // Jika sukses, gunakan path hasil upload
                finalTtdUrl = uploadedPath;
                console.log("TTD Berhasil diupload ke:", finalTtdUrl);

            } catch (uploadError: any) {
                console.error("Gagal upload TTD:", uploadError);
                setNotification({ type: 'error', message: `Gagal upload TTD: ${uploadError.message}` });
                setIsSaving(false);
                return; // Stop proses jika upload gagal
            }
        } 
        // Cek 2: Jika menggunakan base64 dari preview (kasus jarang jika file ada, tapi untuk jaga-jaga)
        else if (ttdMengetahuiPreview && ttdMengetahuiPreview.startsWith('data:')) {
             try {
                setNotification({ type: 'warning', message: 'Memproses gambar tanda tangan...' });
                // Konversi base64 ke File
                const fileFromBase64 = await dataURLtoFile(ttdMengetahuiPreview, `ttd-${uuid}.png`);
                const uploadedPath = await uploadSignatureToFileHandler(fileFromBase64, token);
                finalTtdUrl = uploadedPath;
             } catch (uploadError: any) {
                setNotification({ type: 'error', message: `Gagal memproses gambar TTD: ${uploadError.message}` });
                setIsSaving(false);
                return;
             }
        }
        
        // Validasi Akhir: Pastikan URL TTD sudah ada (bukan null/kosong)
        if (!finalTtdUrl || finalTtdUrl === 'UPLOADED_LOCAL') {
             alert("GAGAL: Tanda tangan 'Mengetahui' belum terupload dengan benar.");
             setIsSaving(false);
             return;
        }

        // Masukkan URL final ke body API
        apiBody.ttd_mengetahui = finalTtdUrl;
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(apiBody),
        });

        const textResult = await response.text();
        let result: any = {};
        
        try {
            result = JSON.parse(textResult);
        } catch (e) {
            throw new Error(`Gagal memproses respons server: ${textResult.substring(0, 50)}...`);
        }

        if (!response.ok || !result.success) {
            throw new Error(result.message || `Gagal ${status} pengajuan.`);
        }

        setStatusPengajuan(status);
        
        if (status === 'rejected' && confirmModal.rejectReason) {
            setCatatanStatus(confirmModal.rejectReason);
        }
        
        // Notifikasi yang lebih jelas dengan emoji
        if (status === 'approved') {
            setNotification({ 
                type: 'success', 
                message: '✅ Pengajuan berhasil di-APPROVE! Tanda tangan telah tersimpan.' 
            });
        } else {
            setNotification({ 
                type: 'success', 
                message: `✅ Pengajuan berhasil di-REJECT dengan alasan: ${confirmModal.rejectReason}` 
            });
        }

        if (formData.npp_mengetahui) {
            fetchTtdMengetahuiHistory(token, formData.npp_mengetahui);
        }

    } catch (err: any) {
        console.error('Error updating status:', err);
        setError(err.message || 'Gagal terhubung ke API status update.');
        setNotification({ type: 'error', message: `Aksi gagal: ${err.message}` });
    } finally {
        setIsSaving(false);
        setConfirmModal(p => ({ ...p, rejectReason: '' })); 
    }
};

const handleStatusAction = (status: 'approved' | 'rejected') => {
    if (statusPengajuan === 'approved' || statusPengajuan === 'rejected') {
        setNotification({
            type: 'warning',
            message: `Pengajuan sudah berstatus '${statusPengajuan}'. Tidak bisa diubah.`
        });
        return;
    }

    if (status === 'approved' && !ttdMengetahuiPreview) {
        setNotification({
            type: 'error',
            message: 'Tanda tangan "Mengetahui" wajib diisi sebelum melakukan approve. Silakan unggah tanda tangan terlebih dahulu.'
        });
        const ttdElement = document.getElementById('ttd-mengetahui-section');
        if (ttdElement) {
            ttdElement.scrollIntoView({ behavior: 'smooth' });
            ttdElement.classList.add('ring-2', 'ring-red-500', 'ring-opacity-75');
            setTimeout(() => {
                ttdElement.classList.remove('ring-2', 'ring-red-500', 'ring-opacity-75');
            }, 3000);
        }
        return;
    }

    const actionText = status === 'approved' ? 'SETUJUI (APPROVE)' : 'TOLAK (REJECT)';
    
    setConfirmModal({
        isOpen: true,
        action: status,
        message: `Apakah Anda yakin ingin ${actionText} pengajuan ini? Aksi ini tidak dapat dibatalkan.`,
        rejectReason: '', 
    });
};

    const handlePrint = () => {
        setIsPrintMode(true);
        setTimeout(() => {
            window.print();
            setIsPrintMode(false);
        }, 300);
    };

    const openModal = (src: string) => {
        if (!isPrintMode) { 
            setModalImageSrc(src);
        }
    };
    
    const closeModal = () => {
        setModalImageSrc(null);
    };

    // --- INITIAL DATA FETCH ---
    const fetchAllInitialData = useCallback(async () => {
        if (didMountRef.current) return;
        didMountRef.current = true;

        setIsInitialLoading(true);
        const token = localStorage.getItem("token");
        const storedUuid = uuid;

        if (!token) {
            setError("Token tidak ditemukan. Silakan login.");
            setIsInitialLoading(false);
            setLoading(false);
            return;
        }

        try {
            const headers = { Authorization: `Bearer ${token}` };
            
            const [halRes, satkerRes, refSuratRes] = await Promise.all([
                fetch("/api/hal", { headers, cache: "no-store" }),
                fetch("/api/satker", { headers }),
                fetch(REFERENSI_SURAT_LOCAL_PATH, { headers, cache: "no-store" }),
            ]);

            const halJson = await halRes.json();
            const satkerData = await satkerRes.json();
            const refSuratJson = await refSuratRes.json();

            const halOptionsMap = (halJson?.data || []).map((item: any) => ({ id: item.id, nama_jenis: item.nama_jenis }));
            setHalOptions(halOptionsMap);

            const satkersMap = (satkerData?.data || []).map((item: any) => ({ id: item.id?.toString(), code: item.kd_satker, label: item.satker_name, jabatan: item.jabsatker || "Ka.Unit" }));
            setSatkers(satkersMap);

            const refOptionsMap = (refSuratJson?.data || []).map((item: any) => ({ uuid: item.uuid || null, nomor_surat: item.no_surat }));
            setRefSuratOptions(refOptionsMap);

            const detailRes = await fetch(`${DETAIL_API_PATH}/${storedUuid}`, { headers, cache: "no-store" });
            const result = await detailRes.json();

            if (!detailRes.ok || !result.success) {
                throw new Error(result.message || "Gagal memuat data detail.");
            }

            const item = result.data;
            
            setStatusPengajuan(item.status || '');
            
            if (item.catatan_status) {
                setCatatanStatus(item.catatan_status);
            }
            
            if (item.ttd_pelapor) {
                const proxyUrl = `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(item.ttd_pelapor)}`;
                setTtdPelaporPreview(await fetchAndMakeTransparent(proxyUrl, token));
            }
            if (item.ttd_mengetahui) {
                const proxyUrlMengetahui = `${IMAGE_PROXY_PATH}?url=${encodeURIComponent(item.ttd_mengetahui)}`;
                setTtdMengetahuiPreview(await fetchAndMakeTransparent(proxyUrlMengetahui, token));
            }
            let rawFiles: string[] = item.file || [];
            const fullFileUrls = rawFiles.map((path: string) => `${IMAGE_PROXY_PATH}?path=${path}`);
            setFilePreviews(fullFileUrls);
            
            const halNameFromAPI = item.hal;
            const matchedHal = halOptionsMap.find(opt => opt.nama_jenis === halNameFromAPI);
            const initialHalId = matchedHal?.id?.toString() || item.hal_id?.toString() || "";
            const masterHal = result.masterhal || {};
            const halId = masterHal.id?.toString() || item.hal_id?.toString() || "";
            const halName = masterHal.nama_jenis || item.hal || "";

            // --- PERUBAHAN LOGIKA DISINI ---
            const kepadaName = result.kd_satker?.satker_name || item.kepada || "";
            
            const satkerAsalName = result.kd_parent?.parent_satker || item.satker || "";
            const satkerAsalId = result.kd_parent?.kd_parent || item.satker;

            setFormData({
                ...formData,
                id: item.id,
                uuid: item.uuid,
                hal: initialHalId,
                hal_nama: halName,
                kepada: kepadaName, 
                kd_satker: result.data.kd_satker || "",
                satker: satkerAsalName,
                satker_id: satkerAsalId,
                name_pelapor: item.name_pelapor || "",
                npp_pelapor: item.npp_pelapor || "",
                tlp_pelapor: item.tlp_pelapor || "",
                kode_barang: item.kode_barang || "",
                keterangan: item.keterangan || "",
                file: item.file || [],
                no_surat: item.no_surat || "",
                no_referensi: item.no_referensi || "",
                ttd_pelapor: item.ttd_pelapor || "",
                ttd_mengetahui: item.ttd_mengetahui || "",
                pelapor: item.name_pelapor || "",
                nppPelapor: item.npp_pelapor || "",
                kodeBarang: item.kode_barang || "",
                referensiSurat: item.no_referensi || "",
                mengetahui: item.mengetahui || "",
                npp_mengetahui: item.mengetahui_npp || item.npp_mengetahui || "",
                mengetahui_name: item.mengetahui_name || "",
            });

            const targetNpp = item.mengetahui_npp || item.npp_mengetahui;
            
            // Ambil NPP User yang sedang login dari localStorage (karena state mungkin belum update)
            let loggedInNpp = null;
            try {
                const userData = localStorage.getItem("user_data");
                if (userData) {
                    const parsed = JSON.parse(userData);
                    loggedInNpp = parsed.npp || parsed.user_npp;
                }
            } catch (e) {}

            // Jika ada NPP Mengetahui
            if (targetNpp) {
                const historyItems = await fetchTtdMengetahuiHistory(token, targetNpp);

                if (!item.ttd_mengetahui && String(loggedInNpp) === String(targetNpp) && historyItems.length > 0) {
                    
                    console.log("Auto-loading signature from history...");
                    
                    const latestTtd = historyItems[0]; 
                    
                    setTtdMengetahuiPreview(latestTtd.processedUrl);
                    
                    setFormData((prev: any) => ({ 
                        ...prev, 
                        ttd_mengetahui: latestTtd.originalUrl 
                    }));
                    
                    setNotification({ type: 'success', message: 'Tanda tangan Anda dimuat otomatis dari riwayat.' });
                }
            }
            // ----------------------------------------

        } catch (err: any) {
            console.error("Error fetching initial data:", err);
            setError(err.message || "Gagal memuat data formulir dan pendukung.");
        } finally {
            setIsInitialLoading(false);
            setLoading(false);
        }
    }, [uuid, fetchTtdMengetahuiHistory]);

    useEffect(() => {
        if (permissionsLoaded && hasAccess) {
            fetchAllInitialData();
        } else if (permissionsLoaded && !hasAccess) {
            setIsInitialLoading(false);
            setLoading(false);
        }
    }, [permissionsLoaded, hasAccess, fetchAllInitialData]);


    // --- RENDER BLOCK ---
    if (!permissionsLoaded) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl text-black">Memeriksa izin akses...</span>
            </div>
        );
    }

  
    if (!hasAccess) {
        return <AccessDeniedUI />;
    }


    if (loading || isInitialLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl text-black">Memuat data formulir dan pendukung...</span>
            </div>
        );
    }

    if (error)
        return (
            <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-xl mt-10">
                <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
                <h3 className="text-2xl font-bold text-red-600 text-center mb-2">
                    Terjadi Kesalahan
                </h3>
                <p className="text-gray-700 text-center mb-6">{error}</p>
                {debugUrl && (
                    <div className="text-sm bg-red-50 p-3 rounded-lg border-red-200 mb-6">
                        <p className="font-semibold text-red-600">URL Eksternal:</p>
                        <p className="text-xs text-red-500 break-words">{debugUrl}</p>
                    </div>
                )}
                <button
                    onClick={() => router.push("/dashboard/lampiran")}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4 flex items-center justify-center"
                >
                    <Home size={18} className="inline-block mr-2" />
                    Kembali
                </button>
            </div>
        );

    const isFinalStatus = statusPengajuan === 'approved' || statusPengajuan === 'rejected';

    const todayStr = `Semarang, ${formatDate(new Date())}`;
    const selectedSatker = satkers.find((s) => s.label === formData.satker);

    const jabatanMengetahui = ` ${formData.mengetahui}`;
    
    const MediaViewerModal = () => {
        if (!modalImageSrc) return null;

        const isPdf = modalImageSrc.toLowerCase().endsWith('.pdf');
        const title = isPdf ? 'Pratinjau Dokumen PDF' : 'Pratinjau Gambar Lampiran';

        return (
            <div 
                className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm p-4"
                onClick={closeModal} 
            >
                <div 
                    className="bg-white rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    
                    <div className="flex justify-between items-center p-3 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            {isPdf ? 
                                <FileText size={18} className="mr-2 text-red-500" /> : 
                                <Maximize2 size={18} className="mr-2 text-gray-500" />
                            }
                            {title}
                        </h3>
                        <button
                            onClick={closeModal}
                            className="text-gray-500 hover:text-gray-700 p-1 transition-colors"
                            aria-label="Tutup"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    
                    <div className="flex-1 p-2 overflow-y-auto w-full flex justify-center items-center" style={{ maxHeight: 'calc(95vh - 56px)' }}>
                        {isPdf ? (
                            <iframe
                                src={modalImageSrc}
                                title={title}
                                className="w-full min-h-[80vh] border-0"
                                allowFullScreen
                            />
                        ) : (
                            <img
                                src={modalImageSrc}
                                alt="Zoomed Lampiran"
                                className="max-w-full max-h-[85vh] object-contain"
                            />
                        )}
                    </div>

                    <div className="p-2 border-t text-center text-xs text-gray-500">
                        Klik di luar modal atau ikon X untuk menutup.
                    </div>
                </div>
            </div>
        );
    };

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
                    
                    /* Perbaikan untuk keterangan */
                    #print-area .keterangan-container {
                        white-space: pre-wrap !important;
                        font-family: 'Times New Roman', serif;
                        line-height: 1.5;
                    }
                    
                    #print-area .keterangan-container i,
                    #print-area .keterangan-container em {
                        font-style: italic !important;
                    }
                }
                .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
                .select-print-only { display: none; }
                .ttd-container { border: 1px solid #ccc; }
                .kepada-yth-container { line-height: 1.2; }
                .kepada-yth-container div { margin-bottom: 2px; }
                .kepada-yth-container .font-semibold { margin-bottom: 5px; }
                
                .ref-select-control {
                    min-height: 30px !important;
                    height: 30px !important;
                    font-size: 0.875rem !important;
                    border: 1px solid #d1d5db !important;
                    border-radius: 0.25rem !important;
                    padding: 0 8px !important;
                }
                .ref-select__control {
                    height: 30px !important;
                }
                .ref-select__value-container {
                    height: 30px !important;
                    padding: 0 8px !important;
                }
                .ref-select__indicators {
                    height: 30px !important;
                    padding: 0 2px !important;
                }
                .ref-select__menu {
                    font-size: 0.75rem !important;
                }
                .ref-select__indicator-separator {
                    display: none;
                }
            `}</style>

            <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
                
                <div className="p-4 flex items-center justify-between border-b no-print">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded text-white"><Droplet /></div>
                        <div>
                            <div className="font-semibold text-base">
                                {isEditMode ? `Edit Pengajuan (Status: ${statusPengajuan.toUpperCase()})` : "Lampiran Pengajuan Perbaikan"}
                            </div>
                            <div className="text-xs text-gray-500">No surat: {formData.no_surat}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {isEditMode && (
                            <>
                                <button
                                    onClick={() => handleStatusAction('approved')}
                                    className={`px-3 py-2 text-white rounded flex items-center gap-2 transition 
                                        ${isSaving || isFinalStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                    disabled={isSaving || isFinalStatus} 
                                >
                                    <Check size={16} /> Approve
                                </button>
                                <button
                                    onClick={() => handleStatusAction('rejected')}
                                    className={`px-3 py-2 text-white rounded flex items-center gap-2 transition 
                                        ${isSaving || isFinalStatus ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                                    disabled={isSaving || isFinalStatus} 
                                >
                                    <Ban size={16} /> Reject
                                </button>
                            </>
                        )}
                        
                        <button
                            onClick={handlePrint}
                            className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 transition"
                        >
                            <Printer size={16} /> Cetak
                        </button>
                    </div>
                </div>
                
                {statusPengajuan && statusPengajuan.toLowerCase() === 'rejected' && catatanStatus && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 no-print">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <AlertTriangle className="h-5 w-5 text-red-400" />
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">
                                    Catatan Penolakan
                                </h3>
                                <div className="mt-2 text-sm text-red-700">
                                    <p>{catatanStatus}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                
                <form onSubmit={handleSaveClick} id="print-area" className="p-6">
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
                                    <span className="font-normal">{formData.hal_nama}</span>
                                ) : (
                                    <Select
                                        name="hal"
                                        value={formData.hal ? { value: formData.hal, label: formData.hal_nama } : null}
                                        onChange={(option) => handleHalChange(option)}
                                        options={halOptions.map(opt => ({ value: String(opt.id), label: opt.nama_jenis }))}
                                        placeholder="Pilih Hal..."
                                        className="flex-1 text-sm select-input-only"
                                        isDisabled={isFinalStatus} 
                                        styles={{
                                            control: (base) => ({ ...base, minHeight: '30px', height: 'auto', fontSize: '0.875rem' }),
                                            valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                            indicatorsContainer: (base) => ({ ...base, height: '30px' }),
                                        }}
                                    />
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold whitespace-nowrap">Ref. Surat:</span>
                                {isPrintMode ? (
                                    <span className="font-normal text-xs">{formData.referensiSurat || "-"}</span>
                                ) : (
                                    <div className="flex-1 flex-col justify-center select-input-only">
                                        <Select
                                            name="referensiSurat"
                                            value={formData.referensiSurat ? { value: formData.referensiSurat, label: formData.referensiSurat } : null}
                                            onChange={(option) => handleSelectChange('referensiSurat', option)}
                                            options={refSuratOptions.map((opt) => ({ value: opt.nomor_surat, label: opt.nomor_surat }))}
                                            placeholder="Pilih ref..."
                                            classNamePrefix="ref-select"
                                            className="w-full text-sm"
                                            isDisabled={isFinalStatus} 
                                            styles={{
                                                control: (base) => ({ ...base, minHeight: '30px', height: '30px', fontSize: '0.875rem', padding: '0 8px' }),
                                                menu: (base) => ({ ...base, zIndex: 50, fontSize: '0.75rem', minWidth: '200px' }),
                                                valueContainer: (base) => ({ ...base, height: '30px', padding: '0 4px' }),
                                                indicatorsContainer: (base) => ({ ...base, height: '30px', padding: '0 2px' }),
                                                indicatorSeparator: () => ({ display: 'none' }),
                                            }}
                                            isClearable
                                        />
                                        <div className="text-[9px] text-gray-500 italic mt-0.5">*Opsional</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-1/2 text-sm kepada-yth-container">
                            Kepada Yth. <br />
                            {isPrintMode ? (
                                <div className="font-semibold">{formData.kepada}</div>
                            ) : (
                                <div className="select-input-only">
                                    <Select
                                        name="kepada"
                                        value={formData.kepada ? { value: formData.kepada, label: formData.kepada } : null}
                                        onChange={(option) => handleSelectChange('kepada', option)}
                                        options={satkers.map((s) => ({ value: s.code, label: s.label }))}
                                        placeholder="Cari atau pilih tujuan..."
                                        className="text-sm w-64"
                                        isDisabled={isFinalStatus} 
                                        styles={{
                                            control: (base) => ({ ...base, minHeight: '30px', height: 'auto', fontSize: '0.875rem' }),
                                            valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                                            indicatorsContainer: (base) => ({ ...base, height: '30px' }),
                                        }}
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
                            {isPrintMode ? (
                                <span>{formData.satker || "Memuat Data ..."}</span>
                            ) : (
                                <input
                                    type="text"
                                    name="satker"
                                    value={formData.satker}
                                    onChange={handleInputChange}
                                    placeholder="Satker Asal"
                                    className="w-full p-1 border border-gray-300 rounded bg-gray-100"
                                    required
                                    disabled={true}
                                />
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center mt-3 text-sm">
                        <div className="col-span-3 font-semibold">Kode Barang :</div>
                        <div className="col-span-9">
                            {isPrintMode ? (
                                <span>{formData.kodeBarang}</span>
                            ) : (
                                <input
                                    type="text"
                                    name="kodeBarang"
                                    value={formData.kodeBarang}
                                    onChange={handleInputChange}
                                    placeholder="Isi kode barang"
                                    className={`w-full p-1 border border-gray-300 rounded ${isFinalStatus ? 'bg-gray-100' : 'bg-white'}`}
                                    required
                                    disabled={isFinalStatus}
                                />
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-4 big-box text-sm">
                        {isPrintMode ? (
                            <div className="keterangan-container"
                                style={{ whiteSpace: "pre-wrap" }}
                                dangerouslySetInnerHTML={{ 
                                    __html: formData.keterangan
                                        .replace(/\*(.*?)\*/g, '<i>$1</i>')
                                        .replace(/_(.*?)_/g, '<em>$1</em>') 
                                }} 
                            />
                        ) : (
                            <textarea   
                                name="keterangan"
                                value={formData.keterangan}
                                onChange={handleInputChange}
                                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                                className={`w-full resize-none border border-gray-300 rounded p-2 h-full min-h-[100px] ${isFinalStatus ? 'bg-gray-100' : 'bg-white'}`}
                                rows={6}
                                required
                                disabled={isFinalStatus} 
                            />
                        )}
                    </div>
                    
                    <div className="mt-4 no-print">
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                            <Upload size={16} /> Lampiran Foto/Dokumen ({filePreviews.length} / {MAX_FILES})
                        </label>
                        
                        <div className="mt-3 grid grid-cols-5 gap-3">
                            {filePreviews.map((src: string, i: number) => (
                                <div 
                                    key={i} 
                                    className="relative group" 
                                >
                                    <img
                                        src={src}
                                        alt={`preview-${i}`}
                                        className="w-full h-24 object-cover rounded border cursor-pointer"
                                        onClick={() => openModal(src)} 
                                    />
                                    <button
                                        onClick={() => handleRemoveFile(i)}
                                        title="Hapus file ini"
                                        className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <X size={14} />
                                    </button>
                                    <p className="text-xs mt-1 text-gray-500 truncate">
                                        {i >= filePreviews.length - newFiles.length ? `File Baru #${i - (filePreviews.length - newFiles.length) + 1}` : `File Lama #${i+1}`}
                                    </p>
                                </div>
                            ))}
                            
                            {filePreviews.length < MAX_FILES && (
                                <label className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded h-24 cursor-pointer hover:bg-gray-50 transition-colors">
                                    <PlusCircle size={32} className="text-gray-500" />
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".jpg,.jpeg,.png,.pdf"
                                        onChange={handleAddFile}
                                        ref={el => fileInputRefs.current[filePreviews.length] = el}
                                        disabled={isFinalStatus}
                                    />
                                </label>
                            )}
                        </div>
                    </div>
                    
                    {isPrintMode && filePreviews.length > 0 && (
                        <div className="mt-4 grid grid-cols-4 gap-3">
                            {filePreviews.map((src: string, i: number) => (
                                <img key={i} src={src} alt={`foto-${i}`} className="w-full h-28 object-cover border border-gray-400" />
                            ))}
                        </div>
                    )}

                    <div className="mt-3 text-xs text-left">
                        Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
                    </div>

                    <div id="ttd-mengetahui-section" className="mt-10 flex justify-between px-10 text-center">
    
                        {/* KOLOM MENGETAHUI */}
                        <div className="flex flex-col items-center w-[200px]">
                            <div className="h-10 flex flex-col justify-end pb-1">
                                <div className="text-sm font-semibold">Mengetahui</div>
                                <div className="text-[10px] leading-tight text-gray-600">{formData.mengetahui}</div>
                            </div>

                            <div className="w-[200px] h-[100px] flex items-center justify-center my-1 relative border border-transparent hover:border-gray-100 transition-colors">
                                {ttdMengetahuiPreview ? (
                                    <img 
                                        src={ttdMengetahuiPreview} 
                                        alt="TTD Mengetahui" 
                                        className="w-full h-full object-contain" 
                                    />
                                ) : (
                                    <div className="text-xs text-gray-300 italic h-full flex items-center justify-center w-full">
                                        (Belum ditandatangani)
                                    </div>
                                )}

                                {currentUserNpp && formData.npp_mengetahui && String(currentUserNpp) === String(formData.npp_mengetahui) && !isFinalStatus && !isPrintMode && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 hover:bg-opacity-10 transition-all opacity-0 hover:opacity-100 group">
                                        <label className="cursor-pointer bg-white px-3 py-1 rounded shadow text-xs font-bold text-blue-600 flex items-center gap-1 hover:bg-blue-50">
                                            <Pencil size={12} /> {ttdMengetahuiPreview ? 'Ganti TTD' : 'Upload TTD'}
                                            <input 
                                                type="file" 
                                                className="hidden" 
                                                accept="image/*" 
                                                onChange={(e) => handleTtdUpload(e, 'mengetahui')} 
                                            />
                                        </label>
                                    </div>
                                )}
                            </div>

                            <div className="mt-1 w-full border-t border-gray-400 pt-1">
                                <div className="font-bold text-sm underline decoration-gray-400 underline-offset-2">
                                    {formData.mengetahui_name}
                                </div>
                                <div className="text-xs">NPP: {formData.npp_mengetahui || "-"}</div>
                            </div>
                        </div>

                        {/* Kolom Pelapor */}
                        <div className="flex flex-col items-center w-[200px]">
                            <div className="h-10 flex flex-col justify-end pb-1">
                                <div className="text-sm font-semibold">Pelapor</div>
                            </div>
                            
                            {/* TTD Pelapor dengan Container Fixed */}
                            <div className="w-[200px] h-[100px] flex items-center justify-center my-1">
                                {ttdPelaporPreview && (
                                    <img
                                        src={ttdPelaporPreview}
                                        alt="Tanda tangan pelapor"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                )}
                            </div>

                            <div className="mt-1 w-full">
                                <input
                                    type="text"
                                    name="pelapor"
                                    value={formData.pelapor}
                                    onChange={handleInputChange}
                                    className="text-center w-full border-b border-gray-300 p-0.5 text-sm bg-gray-100 font-medium underline decoration-gray-400 underline-offset-2 break-words"
                                    placeholder="(Nama Jelas)"
                                    required
                                    disabled={true} 
                                    readOnly
                                />
                                <div className="text-xs mt-0.5">
                                    NPP: {formData.nppPelapor || "__________"}
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isPrintMode && (
                        <button
                            type="submit"
                            disabled={isSaving || isFinalStatus} 
                            className={`fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-xl flex items-center gap-2 transition-all duration-200 
                                ${isSaving || isFinalStatus ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}
                        >
                            {isSaving ? (
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <Save size={18} />
                            )}
                            {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                        </button>
                    )}
                </form>
            </div>

            <MediaViewerModal />
            <Notification notification={notification} setNotification={setNotification} />

            <TtdHistoryModal
                isOpen={isTtdMengetahuiHistoryModalOpen}
                history={ttdMengetahuiHistory}
                onSelect={handleTtdMengetahuiSelectionFromHistory}
                onClose={() => setIsTtdMengetahuiHistoryModalOpen(false)}
                onCreateTtd={handleCreateTtdMengetahui}
                onDeleteTtd={handleDeleteTtdMengetahui}
            />

            <TtdCropModal
                isOpen={isTtdMengetahuiCropModalOpen}
                imageSrc={ttdMengetahuiImageForCrop}
                onCropComplete={handleTtdMengetahuiCropComplete}
                onCancel={handleTtdMengetahuiCropCancel}
            />

            <ConfirmActionModal 
                isOpen={confirmModal.isOpen}
                action={confirmModal.action}
                message={confirmModal.message}
                rejectReason={confirmModal.rejectReason}
                setRejectReason={(val: string) => setConfirmModal(prev => ({ ...prev, rejectReason: val }))}
                onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false, rejectReason: '' }))}
                onConfirm={() => executeStatusUpdate(confirmModal.action!)}
                isSaving={isSaving}
            />

            <SaveConfirmModal 
                isOpen={saveConfirmModal.isOpen}
                onCancel={() => setSaveConfirmModal({ isOpen: false })}
                onConfirm={handleUpdate}
                isSaving={isSaving}
            />

            <input
                type="file"
                ref={ttdMengetahuiFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={(e) => handleTtdUpload(e, 'mengetahui')}
            />

        </div>
    );
}