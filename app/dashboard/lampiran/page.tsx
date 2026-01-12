"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import React, { useEffect, useState, useCallback, Suspense } from "react";
import {
    PlusCircle, Search, Loader2, Eye, Pencil, Trash2, X, AlertTriangle,
    CheckCircle, ThumbsUp, ThumbsDown, Clock, Settings, Crop, 
    ChevronLeft, ChevronRight, Copy 
} from "lucide-react";
import Cropper, { Point, Area } from 'react-easy-crop';

const LIST_API_PATH = "/api/pengajuan/views";
const DELETE_API_BASE = "/api/pengajuan/delete/";
const APPROVE_REJECT_API_BASE = "/api/pengajuan";
const TTD_PROXY_PATH = "/api/ttd-proxy";
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
    name_pelapor: string;
    npp_pelapor: string;
    mengetahui: string | null;
    is_deleted: number;
    created_at: string;
    updated_at: string;
    no_surat: string | null;    
};

type ApiResponse = {
    success: boolean;
    data: ApiPengajuanItem[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number;
        to: number;
        data: ApiPengajuanItem[];
    };
};
type Pengajuan = {
    id: number;
    uuid: string;
    tanggal: string;
    hal: string;
    name_pelapor: string;
    status: string;
    no_surat: string;    
};

type ToastMessage = {
    message: string;
    type: 'success' | 'error';
    isVisible: boolean;
};

type StatusAction = 'approve' | 'reject';

type StatusModalState = {
    isOpen: boolean;
    id: number | null;
    uuid: string | null;
    hal: string | null;
    no_surat: string | null;
    isSubmitting: boolean;
    rejectReason: string;
    actionToConfirm: StatusAction | null;
    showApproveConfirm: boolean;
};

type ItemAction = {
    id: number | null;
    uuid: string | null;
    hal: string | null;
    name_pelapor?: string;
    no_surat?: string;
    tanggal?: string;
};

type CurrentUser = { 
    npp: string; 
    name: string;
};


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


async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
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


const Toast = React.memo(({ toast, setToast }: { toast: ToastMessage, setToast: React.Dispatch<React.SetStateAction<ToastMessage>> }) => {
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
});
Toast.displayName = 'Toast';

const TtdCropModal = React.memo(({ 
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
    
    // Setting default tanpa slider (Threshold disembunyikan/dihapus dari UI)
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
                            {/* Slider Threshold DIHAPUS, hanya sisa Checkbox */}
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
});
TtdCropModal.displayName = 'TtdCropModal';

const StatusActionModal = React.memo(({ 
    statusModal, 
    setStatusModal, 
    currentUser, 
    handleApproveReject, 
    currentStatusAction 
}: {
    statusModal: StatusModalState,
    setStatusModal: React.Dispatch<React.SetStateAction<StatusModalState>>,
    currentUser: CurrentUser | null,
    handleApproveReject: (action: StatusAction) => Promise<void>,
    currentStatusAction: StatusAction | null
}) => {
    if (!statusModal.isOpen || statusModal.uuid === null) return null;

    // Ambil no_surat dari state
    const { hal, isSubmitting, rejectReason, actionToConfirm, showApproveConfirm, no_surat } = statusModal;
    const isApproveSubmitting = isSubmitting && currentStatusAction === 'approve';
    const isRejectSubmitting = isSubmitting && currentStatusAction === 'reject';
    const isActionDisabled = isSubmitting || !currentUser;

    // Tentukan label identitas (Gunakan No Surat jika ada, jika tidak gunakan Hal)
    const displayIdentity = no_surat && no_surat !== '-' ? `No. Surat ${no_surat}` : `Hal: ${hal}`;

    const handleActionClick = (action: StatusAction) => {
        if (action === 'reject') {
            setStatusModal(prev => ({ ...prev, actionToConfirm: 'reject' }));
        } else if (action === 'approve') {
            setStatusModal(prev => ({ ...prev, showApproveConfirm: true }));
        }
    };

    const handleFinalApprove = () => {
        handleApproveReject('approve');
    }

    const handleFinalReject = () => {
        if (rejectReason.trim() === '') {
            alert("Alasan penolakan wajib diisi.");
            return;
        }
        handleApproveReject('reject');
    }

    const handleCloseModal = () => {
        if (isSubmitting) return;
        setStatusModal(prev => ({ 
            ...prev, 
            isOpen: false,
            actionToConfirm: null,
            showApproveConfirm: false
        }));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" aria-modal="true">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 transform transition-all duration-300 scale-100">
                <div className="flex justify-between items-start border-b pb-3 mb-4">
                    <h3 className={`text-xl font-bold flex items-center gap-2 text-blue-600`}>
                        <Settings size={24} /> Aksi Status Pengajuan
                    </h3>
                    <button
                        onClick={handleCloseModal}
                        disabled={isSubmitting}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors disabled:opacity-50"
                        aria-label="Tutup modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="text-gray-700 mb-6">
                    {/* Tampilan Default: Pilihan Aksi */}
                    {!showApproveConfirm && !actionToConfirm && (
                        <p className="mb-4 font-medium text-center text-lg">
                            Silakan pilih aksi untuk data <br/>
                            <span className="font-bold text-blue-800">{displayIdentity}</span>
                        </p>
                    )}
                    
                    {/* Tampilan Konfirmasi Approve */}
                    {showApproveConfirm && (
                        <div className="border border-green-300 bg-green-50 p-4 rounded-lg mb-6">
                            <div className="flex items-center mb-3">
                                <CheckCircle size={20} className="text-green-600 mr-2" />
                                <h4 className="font-bold text-green-800">Konfirmasi Persetujuan</h4>
                            </div>
                            <p className="text-sm text-gray-700 mb-4">
                                Apakah Anda yakin ingin menyetujui pengajuan dengan <strong>{displayIdentity}</strong>? 
                                <br/>Tindakan ini akan mengubah status pengajuan menjadi "Approved".
                            </p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setStatusModal(prev => ({ ...prev, showApproveConfirm: false }))}
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={handleFinalApprove}
                                    disabled={isSubmitting}
                                    className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                                >
                                    Ya, Setujui
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Tampilan Konfirmasi Reject */}
                    {actionToConfirm === 'reject' && (
                        <div className="border border-red-300 bg-red-50 p-4 rounded-lg mb-6">
                            <div className="mb-2">
                                <span className="font-bold text-red-800 block mb-1">Konfirmasi Penolakan</span>
                                <span className="text-xs text-red-600">Data: {displayIdentity}</span>
                            </div>
                            <label htmlFor="rejectReason" className="block text-sm font-bold text-red-700 mb-2 flex items-center">
                                <AlertTriangle size={16} className="mr-2" /> Alasan Penolakan Wajib Diisi:
                            </label>
                            <textarea
                                id="rejectReason"
                                value={rejectReason}
                                onChange={(e) => setStatusModal(prev => ({ ...prev, rejectReason: e.target.value }))}
                                rows={3}
                                className="w-full p-2 border border-red-400 rounded-lg shadow-inner focus:ring-red-500 focus:border-red-500 focus:outline-none disabled:bg-gray-100"
                                placeholder="Tuliskan alasan penolakan di sini..."
                                disabled={isSubmitting}
                                required
                            />
                        </div>
                    )}
                    
                    {/* Tombol Pilihan Aksi (Hanya muncul jika belum klik salah satu) */}
                    {!showApproveConfirm && (
                        <div className="flex flex-col sm:flex-row justify-center gap-4">
                            {/* Tombol Approve (Sembunyikan jika sedang mode reject) */}
                            {actionToConfirm !== 'reject' && (
                                <button
                                    onClick={() => handleActionClick('approve')}
                                    disabled={isActionDisabled}
                                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:scale-100      
                                        ${isApproveSubmitting ? 'bg-green-400' : 'bg-green-600 hover:bg-green-700 disabled:bg-green-400'}
                                    `}
                                >
                                    {isApproveSubmitting ? (
                                        <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                                    ) : (
                                        <ThumbsUp size={16} />
                                    )}
                                    Setujui (Approved)
                                </button>
                            )}

                            {/* Tombol Reject & Konfirmasi Reject */}
                            {actionToConfirm === 'reject' ? (
                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={() => setStatusModal(prev => ({ ...prev, actionToConfirm: null }))}
                                        disabled={isSubmitting}
                                        className="px-4 py-3 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        onClick={handleFinalReject}
                                        disabled={isActionDisabled || rejectReason.trim() === ''}
                                        className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:scale-100      
                                            ${isRejectSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'}
                                        `}
                                    >
                                        {isRejectSubmitting ? (
                                            <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                                        ) : (
                                            <ThumbsDown size={16} />
                                        )}
                                        Konfirmasi Tolak
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => handleActionClick('reject')}
                                    disabled={isSubmitting}
                                    className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:scale-100      
                                        ${isRejectSubmitting ? 'bg-red-400' : 'bg-red-600 hover:bg-red-700 disabled:bg-red-400'}
                                    `}
                                >
                                    <ThumbsDown size={16} />
                                    Tolak (Rejected)
                                </button>
                            )}
                        </div>
                    )}

                    {!currentUser && (
                        <p className="text-xs mt-4 text-center text-red-500">
                            **Gagal mengambil NPP Anda dari Local Storage. Aksi Persetujuan diblokir.**
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
});

StatusActionModal.displayName = 'StatusActionModal';

const DeleteConfirmationModal = React.memo(({ 
    isDeleteModalOpen, 
    setIsDeleteModalOpen, 
    itemToDelete, 
    handleConfirmDelete, 
    isDeleting 
}: {
    isDeleteModalOpen: boolean,
    setIsDeleteModalOpen: React.Dispatch<React.SetStateAction<boolean>>,
    itemToDelete: ItemAction,
    handleConfirmDelete: () => void,
    isDeleting: boolean
}) => {
    if (!isDeleteModalOpen || itemToDelete.id === null) return null;

    const { id, hal, name_pelapor, no_surat, tanggal } = itemToDelete;

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
                        aria-label="Tutup modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center mb-2">
                        <AlertTriangle size={20} className="text-red-600 mr-2" />
                        <h4 className="font-bold text-red-800">Peringatan: Tindakan Tidak Dapat Dibatalkan</h4>
                    </div>
                    <p className="text-sm text-gray-700">
                        Anda akan menghapus data pengajuan secara permanen. Data yang telah dihapus tidak dapat dikembalikan.
                    </p>
                </div>
                
                <div className="text-gray-700 mb-6">
                    <p className="mb-2 font-medium">Detail pengajuan yang akan dihapus:</p>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                        <div className="flex justify-between">
                            <span className="font-medium">ID:</span>
                            <span>{id}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-medium">Hal:</span>
                            <span>{hal}</span>
                        </div>
                        {name_pelapor && (
                            <div className="flex justify-between">
                                <span className="font-medium">Pelapor:</span>
                                <span>{name_pelapor}</span>
                            </div>
                        )}
                        {no_surat && (
                            <div className="flex justify-between">
                                <span className="font-medium">No. Surat:</span>
                                <span>{no_surat}</span>
                            </div>
                        )}
                        {tanggal && (
                            <div className="flex justify-between">
                                <span className="font-medium">Tanggal:</span>
                                <span>{tanggal}</span>
                            </div>
                        )}
                    </div>
                    <p className="text-sm mt-3 text-gray-600">Apakah Anda yakin ingin melanjutkan?</p>
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
                            <>
                                <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                                Menghapus...
                            </>
                        ) : (
                            "Ya, Hapus Data"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
});
DeleteConfirmationModal.displayName = 'DeleteConfirmationModal';

function DataPengajuanContent() {
    const router = useRouter();
    const searchParams = useSearchParams(); 
    const pathname = usePathname();

    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
    const [search, setSearch] = useState("");
    const [creating, setCreating] = useState(false);
    const [authError, setAuthError] = useState<string | null>(null);

    // Initial page load state set from URL
    const [currentPage, setCurrentPage] = useState<number>(Number(searchParams.get('page')) || 1);
     
    const [totalPages, setTotalPages] = useState(1);
    const [totalData, setTotalData] = useState(0);
    const [fromData, setFromData] = useState(0);
    const [toData, setToData] = useState(0);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ItemAction>({ id: null, uuid: null, hal: null });
    const [isDeleting, setIsDeleting] = useState(false);

    const [statusModal, setStatusModal] = useState<StatusModalState>({
        isOpen: false,
        id: null,
        uuid: null,
        hal: null,
        no_surat: null,
        isSubmitting: false,
        rejectReason: '',
        actionToConfirm: null,
        showApproveConfirm: false,
    });
    const [currentStatusAction, setCurrentStatusAction] = useState<StatusAction | null>(null);
    const [toast, setToast] = useState<ToastMessage>({ message: '', type: 'success', isVisible: false });

    const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
    const [userPermissions, setUserPermissions] = useState<string[]>([]);
     
    const [isTTDModalOpen, setIsTTDModalOpen] = useState(false);
    const [ttdUploading, setTtdUploading] = useState(false);

    const [isTtdCropModalOpen, setIsTtdCropModalOpen] = useState(false);
    const [ttdImageForCrop, setTtdImageForCrop] = useState<string | null>(null);
    const [ttdFileForUpload, setTtdFileForUpload] = useState<File | null>(null);
     
    const [ttdPaths, setTtdPaths] = useState<Record<string, string>>({});


    const hasPermission = useCallback((permissionName: string): boolean => {
        return userPermissions.includes(permissionName);
    }, [userPermissions]);

    const showToast = useCallback((message: string, type: 'success' | 'error') => {
        setToast({ message, type, isVisible: true });
        setTimeout(() => {
            setToast(prev => ({ ...prev, isVisible: false }));
        }, 4000);
    }, []);

    // Effect to sync URL params with state when user navigates (back/forward)
    useEffect(() => {
        const pageFromUrl = Number(searchParams.get('page')) || 1;
        if (pageFromUrl !== currentPage) {
            setCurrentPage(pageFromUrl);
        }
    }, [searchParams]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            if (storedPermissions) {
                try {
                    const permissions = JSON.parse(storedPermissions);
                    if (Array.isArray(permissions)) {
                        setUserPermissions(permissions);
                    }
                } catch (e) {
                    console.error("Gagal parse user_permissions:", e);
                    setUserPermissions([]);
                }
            }

            const userDataString = localStorage.getItem('user_data');
            try {
                if (userDataString) {
                    const localUserData = JSON.parse(userDataString);
                    const userNpp = localUserData.npp || null;
                    const userName = localUserData.nama || localUserData.name || null;

                    if (userNpp && userName) {
                        setCurrentUser({ npp: userNpp, name: userName });
                    }
                }
            } catch (e) {
                console.error("Gagal parse user_data dari localStorage:", e);
            }
            setPermissionsLoaded(true);
        }
    }, []);


    const fetchData = useCallback(async (page: number = 1) => {
        setLoading(true);
        setAuthError(null);

        let token = localStorage.getItem('token');
        if (!token) {
            setAuthError("Gagal memuat data. Mohon login ulang.");
            setLoading(false);
            return;
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        try {
            const response = await fetch(`${LIST_API_PATH}?page=${page}`, {
                method: 'GET',
                headers: headers,
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(errorBody.message || `Error status: ${response.status}`);
            }

            const result: ApiResponse = await response.json();

            const apiDataArray = result.data?.data; 
            const paginationInfo = result.data; 

            if (!result.success || !Array.isArray(apiDataArray)) {
                throw new Error("Struktur respons API tidak valid atau data kosong.");
            }

            const activeData = apiDataArray.filter(item => item.is_deleted !== 1);

            setTotalPages(paginationInfo.last_page || 1);
            setTotalData(paginationInfo.total || 0);
            setFromData(paginationInfo.from || 0);
            setToData(paginationInfo.to || 0);

            const mappedData: Pengajuan[] = activeData.map(item => ({
                id: item.id,
                uuid: item.uuid,
                tanggal: formatDate(item.created_at),
                hal: item.keterangan || item.catatan || 'Tidak Ada Keterangan', 
                name_pelapor: item.name_pelapor || item.npp_pelapor || 'Anonim',
                status: item.status || 'Pending',
                no_surat: item.no_surat || '-', 
            }));

            setPengajuans(mappedData);
            setLoading(false);

        } catch (error: any) {
            console.error("Fetch Error:", error.message);
            setAuthError(error.message);
            showToast(error.message, 'error');
            setLoading(false);
        }
    }, [showToast]);

    useEffect(() => {
        if (permissionsLoaded) {    
            fetchData(currentPage);
        }
    }, [fetchData, permissionsLoaded, currentPage]);

    const handlePageChange = (page: number) => {
        if (page >= 1 && page <= totalPages) {
            const params = new URLSearchParams(searchParams.toString());
            params.set('page', page.toString());
            router.push(`${pathname}?${params.toString()}`);
        }
    };

    // --- ACTION HANDLERS ---

    const handleBuatPengajuan = () => {
        if (!hasPermission('workorder-pti.pengajuan.create')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (workorder-pti.pengajuan.create) untuk membuat pengajuan baru.", 'error');
            return;
        }

        setCreating(true);
        router.push("/dashboard/lampiran/tambah");
        setCreating(false);
    };

    const handleView = (uuid: string) => {
        if (!hasPermission('workorder-pti.pengajuan.view')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (workorder-pti.pengajuan.view) untuk melihat detail.", 'error');
            return;
        }
        router.push(`/dashboard/lampiran/view/${uuid}`);
    };

    const handleEdit = (uuid: string) => {
        if (!hasPermission('workorder-pti.pengajuan.edit')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (workorder-pti.pengajuan.edit) untuk mengedit pengajuan.", 'error');
            return;
        }
        router.push(`/dashboard/lampiran/edit/${uuid}`);
    };

    const handleStatusModalOpen = (id: number, uuid: string, hal: string, no_surat: string) => { 
        if (!hasPermission('workorder-pti.pengajuan.approval')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (workorder-pti.pengajuan.approval) untuk menyetujui/menolak.", 'error');
            return;
        }
        if (statusModal.isSubmitting) return;

        setStatusModal({
            isOpen: true,
            id: id,
            uuid: uuid,
            hal: hal,
            no_surat: no_surat, 
            isSubmitting: false,
            rejectReason: '',
            actionToConfirm: null,
            showApproveConfirm: false,
        });
        setCurrentStatusAction(null);
    };

    const handleDeleteClick = (id: number, uuid: string, hal: string, name_pelapor?: string, no_surat?: string, tanggal?: string) => {
        if (!hasPermission('workorder-pti.pengajuan.delete')) {
            showToast("Akses Ditolak: Anda tidak memiliki izin (workorder-pti.pengajuan.delete) untuk menghapus pengajuan.", 'error');
            return;
        }
        if (isDeleting) return;
        setItemToDelete({ id, uuid, hal, name_pelapor, no_surat, tanggal });
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (itemToDelete.uuid === null) {
            showToast("Error: UUID data tidak ditemukan.", 'error');
            setIsDeleteModalOpen(false);
            return;
        }

        const { uuid: uuidToDelete, id: idToDelete, hal: halDeleted } = itemToDelete;

        setIsDeleteModalOpen(false);
        setIsDeleting(true);

        let token: string | null = localStorage.getItem('token');

        if (!token) {
            const errorMsg = "Tidak dapat menghapus. Token otorisasi tidak ditemukan.";
            showToast(errorMsg, 'error');
            setIsDeleting(false);
            setItemToDelete({ id: null, uuid: null, hal: null });
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
                setItemToDelete({ id: null, uuid: null, hal: null });
                return;

            } catch (error: any) {
                console.error(`Gagal menghapus (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);

                if (i === MAX_RETRIES - 1 || error.message.includes("Otorisasi Gagal")) {
                    setIsDeleting(false);
                    setItemToDelete({ id: null, uuid: null, hal: null });
                    return;
                } else {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    };

    // --- Fungsi untuk menyelesaikan crop dan upload ---
    const handleTtdCropComplete = async (
        croppedImage: string, 
        settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }
    ) => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);
        setTtdUploading(true);
        setIsTTDModalOpen(false);

        if (!currentUser || !ttdFileForUpload) {
            showToast("Data pengguna atau file TTD tidak ditemukan.", 'error');
            setTtdUploading(false);
            return;
        }

        try {
            const transparentImage = await processImageTransparency(croppedImage, settings);
             
            const timestamp = Date.now();
            const finalFile = await dataURLtoFile(transparentImage, `ttd-mengetahui-${currentUser.npp}-${timestamp}.png`);

            const formData = new FormData();
            formData.append('ttd_file', finalFile);
            formData.append('npp', currentUser.npp);
             
            const token = localStorage.getItem('token');
            if (!token) throw new Error("Token tidak ditemukan.");

            const response = await fetch('/api/ttd-upload', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
             
            const result = await response.json();
             
            if (!response.ok || !result.success) {
                showToast(result.message || "Gagal mengupload TTD yang diproses", 'error');
                return;
            }
             
            showToast("TTD berhasil diupload dan diproses", 'success');
             
            if (result.data?.ttd_path) {
                const newTtdPath = result.data.ttd_path;
                 
                setTtdPaths(prev => ({
                    ...prev,
                    [currentUser.npp]: newTtdPath
                }));
            }
             
            if (currentStatusAction) {
                setTimeout(() => {
                    handleApproveReject(currentStatusAction);
                }, 500);
            }
        } catch (error: any) {
            console.error("Error processing and uploading TTD:", error);
            showToast("Terjadi kesalahan saat memproses TTD", 'error');
        } finally {
            setTtdUploading(false);
            setTtdFileForUpload(null);
        }
    };

    const handleTtdCropCancel = () => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);
        setTtdFileForUpload(null);
    };

    // --- Fungsi Upload TTD yang Diperbarui ---
    const handleUploadTTD = async (file: File) => {
        if (!currentUser || !file) return;
        
        setTtdFileForUpload(file);
        const previewUrl = URL.createObjectURL(file);
        setTtdImageForCrop(previewUrl);
        setIsTtdCropModalOpen(true);
        setIsTTDModalOpen(false);
    };

    const handleApproveReject = async (action: StatusAction) => {
        if (statusModal.uuid === null || currentUser === null) {
            const errorMsg = "Error: Data pengajuan atau NPP user tidak ditemukan. Harap login ulang.";
            showToast(errorMsg, 'error');
            setStatusModal(prev => ({ ...prev, isOpen: false }));
            return;
        }
        
        if (action === 'reject' && statusModal.rejectReason.trim() === '') {
            showToast("Alasan penolakan wajib diisi untuk aksi penolakan.", 'error');
            return;
        }

        const { uuid, hal, id, rejectReason } = statusModal;
        setCurrentStatusAction(action);
        const newStatus = action === 'approve' ? 'approved' : 'rejected';

        setStatusModal(prev => ({ ...prev, isSubmitting: true }));

        const token = localStorage.getItem('token');

        if (!token) {
            const errorMsg = "Tidak dapat mengubah status. Token otorisasi tidak ditemukan.";
            showToast(errorMsg, 'error');
            setStatusModal({ isOpen: false, id: null, uuid: null, hal: null, isSubmitting: false, rejectReason: '', actionToConfirm: null, showApproveConfirm: false });
            setCurrentStatusAction(null);
            return;
        }

        if (action === 'reject') {
            const headers: HeadersInit = {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            };

            const updateUrl = `${APPROVE_REJECT_API_BASE}/${uuid}/status`;

            const bodyData: any = {
                status: newStatus,
                npp_mengetahui: currentUser.npp,
                name_mengetahui: currentUser.name,
                catatan_status: rejectReason,      
            };

            try {
                const response = await fetch(updateUrl, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(bodyData),
                });

                const responseData = await response.json();

                if (!response.ok || !responseData.success) {
                    if (response.status === 401) {
                        showToast(`Sesi Anda berakhir saat menolak. Mohon login ulang.`, 'error');
                        throw new Error(`Otorisasi Gagal: ${responseData.message || 'Token tidak valid'}`);
                    }

                    const apiMessage = responseData.message || `Gagal menolak (Status: ${response.status})`;
                    showToast(apiMessage, 'error');
                    throw new Error(apiMessage);
                }

                setPengajuans(prev => prev.map(p =>
                    p.id === id ? { ...p, status: newStatus } : p
                ));

                const successMsg = `Pengajuan "${hal}" berhasil ditolak (Rejected).`;
                showToast(successMsg, 'success');

                setStatusModal({ isOpen: false, id: null, uuid: null, hal: null, isSubmitting: false, rejectReason: '', actionToConfirm: null, showApproveConfirm: false });
                setCurrentStatusAction(null);
                return;
            } catch (error: any) {
                console.error(`Gagal menolak:`, error.message);
                setStatusModal({ isOpen: false, id: null, uuid: null, hal: null, isSubmitting: false, rejectReason: '', actionToConfirm: null, showApproveConfirm: false });
                setCurrentStatusAction(null);
                return;
            }
        }

        let ttdPathMengetahui: string | null = null;
        const { npp: nppMengetahui, name: nameMengetahui } = currentUser;
        
        if (ttdPaths[nppMengetahui]) {
            ttdPathMengetahui = ttdPaths[nppMengetahui];
            // showToast(`Menggunakan tanda tangan yang tersimpan untuk NPP ${nppMengetahui}`, 'success');
        } else {
            // showToast(`Mengambil tanda tangan untuk NPP ${nppMengetahui}...`, 'info');
            try {
                const ttdRes = await fetch(`${TTD_PROXY_PATH}/${nppMengetahui}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                    cache: "no-store",
                });
                const ttdData = await ttdRes.json();

                let rawTtdPath = ttdData?.data?.ttd_path || ttdData.ttd_path || null;

                if (!rawTtdPath && ttdData?.ttd_list?.length > 0) {
                    rawTtdPath = ttdData.ttd_list[0];
                }

                if (!rawTtdPath) {
                    setStatusModal(prev => ({ ...prev, isSubmitting: false }));
                    setIsTTDModalOpen(true);
                    showToast(`TTD untuk NPP ${nppMengetahui} belum terdaftar. Silakan upload TTD terlebih dahulu.`, 'error');
                    return;
                }

                ttdPathMengetahui = rawTtdPath;
                
                setTtdPaths(prev => ({
                    ...prev,
                    [nppMengetahui]: ttdPathMengetahui
                }));
                
                showToast(`Tanda tangan NPP ${nppMengetahui} berhasil diambil.`, 'success');

            } catch (e: any) {
                console.error("Gagal mengambil TTD Mengetahui:", e);
                setStatusModal(prev => ({ ...prev, isSubmitting: false }));
                setIsTTDModalOpen(true);
                showToast(`TTD untuk NPP ${nppMengetahui} tidak dapat diambil. Silakan upload TTD terlebih dahulu.`, 'error');
                return;
            }
        }

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        };

        const updateUrl = `${APPROVE_REJECT_API_BASE}/${uuid}/status`;

        const bodyData: any = {
            status: newStatus,
            npp_mengetahui: nppMengetahui,
            name_mengetahui: nameMengetahui,
            ttd_mengetahui: ttdPathMengetahui,
            catatan_status: null,      
        };

        Object.keys(bodyData).forEach(key => bodyData[key] === undefined && delete bodyData[key]);

        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const response = await fetch(updateUrl, {
                    method: 'PUT',
                    headers: headers,
                    body: JSON.stringify(bodyData),
                });

                const responseData = await response.json();

                if (!response.ok || !responseData.success) {
                    if (response.status === 401) {
                        showToast(`Sesi Anda berakhir saat menyetujui. Mohon login ulang.`, 'error');
                        throw new Error(`Otorisasi Gagal: ${responseData.message || 'Token tidak valid'}`);
                    }

                    const apiMessage = responseData.message || `Gagal menyetujui (Status: ${response.status})`;
                    showToast(apiMessage, 'error');
                    throw new Error(apiMessage);
                }

                setPengajuans(prev => prev.map(p =>
                    p.id === id ? { ...p, status: newStatus } : p
                ));

                const successMsg = `Pengajuan "${hal}" berhasil disetujui (Approved).`;
                showToast(successMsg, 'success');

                setStatusModal({ isOpen: false, id: null, uuid: null, hal: null, isSubmitting: false, rejectReason: '', actionToConfirm: null, showApproveConfirm: false });
                setCurrentStatusAction(null);
                return;

            } catch (error: any) {
                console.error(`Gagal mengubah status (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);

                if (i === MAX_RETRIES - 1 || error.message.includes("Otorisasi Gagal")) {
                    setStatusModal({ isOpen: false, id: null, uuid: null, hal: null, isSubmitting: false, rejectReason: '', actionToConfirm: null, showApproveConfirm: false });
                    setCurrentStatusAction(null);
                    return;
                } else {
                    const delay = Math.pow(2, i) * 1000;
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
    };

    // --- HELPER UNTUK COPY NO SURAT ---
    const handleCopyNoSurat = (text: string) => {
        if (!text || text === '-') return;
        navigator.clipboard.writeText(text);
        showToast(`No Surat "${text}" disalin!`, 'success');
    };

    // --- RENDERING SUB-COMPONENTS ---

    const TTDUploadModal = () => {
        if (!isTTDModalOpen || !currentUser) return null;

        const [file, setFile] = useState<File | null>(null);
        const [dragActive, setDragActive] = useState(false);

        const handleDrag = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (e.type === "dragenter" || e.type === "dragover") {
                setDragActive(true);
            } else if (e.type === "dragleave") {
                setDragActive(false);
            }
        };

        const handleDrop = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragActive(false);
             
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                setFile(e.dataTransfer.files[0]);
            }
        };

        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            e.preventDefault();
            if (e.target.files && e.target.files[0]) {
                setFile(e.target.files[0]);
            }
        };

        const handleSubmit = () => {
            if (file) {
                handleUploadTTD(file);
            } else {
                showToast("Pilih file TTD terlebih dahulu", 'error');
            }
        };

        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4" aria-modal="true">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 scale-100">
                    <div className="flex justify-between items-start border-b pb-3 mb-4">
                        <h3 className="text-xl font-bold text-blue-600 flex items-center gap-2">
                            <Settings size={24} /> Upload Tanda Tangan Digital
                        </h3>
                        <button
                            onClick={() => setIsTTDModalOpen(false)}
                            disabled={ttdUploading}
                            className="text-gray-400 hover:text-gray-600 p-1 rounded-full transition-colors disabled:opacity-50"
                            aria-label="Tutup modal"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="text-gray-700 mb-6">
                        <p className="mb-4">Upload Tanda Tangan Digital untuk NPP <strong>{currentUser.npp}</strong> ({currentUser.name})</p>
                        
                        <form
                            className={`relative border-2 ${dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"} rounded-lg p-6 text-center`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                id="ttd-upload"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleChange}
                                accept="image/*"
                                disabled={ttdUploading}
                            />
                            
                            {file ? (
                                <div className="space-y-2">
                                    <p className="text-sm font-medium text-green-600">File dipilih:</p>
                                    <p className="text-sm text-gray-700 truncate">{file.name}</p>
                                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <div className="mx-auto w-12 h-12 text-gray-400">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        <span className="font-semibold">Klik untuk upload</span> atau drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500">File akan dibuka di editor crop untuk diproses lebih lanjut.</p>
                                </div>
                            )}
                        </form>
                    </div>
                    
                    <div className="flex justify-end gap-3">
                        <button
                            onClick={() => setIsTTDModalOpen(false)}
                            disabled={ttdUploading}
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={ttdUploading || !file}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-md transform hover:scale-[1.02] disabled:bg-blue-400 disabled:scale-100"
                        >
                            {ttdUploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin mr-1 inline-block" />
                                    Membuka Editor...
                                </>
                            ) : (
                                "Lanjutkan ke Crop"
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER PERMISSION CHECKS & LOADING ---

    const canCreate = hasPermission('workorder-pti.pengajuan.create');
    const canViews = hasPermission('workorder-pti.pengajuan.views'); 
    const canView = hasPermission('workorder-pti.pengajuan.view'); 
    const canEdit = hasPermission('workorder-pti.pengajuan.edit');
    const canDelete = hasPermission('workorder-pti.pengajuan.delete');
    const canApprove = hasPermission('workorder-pti.pengajuan.approval');

    const isActionInProgress = isDeleting || statusModal.isSubmitting || ttdUploading;

    if (!permissionsLoaded) {    
        return (
            <div className="p-4 md:p-8 space-y-6 text-gray-800 bg-gray-50 min-h-screen w-full font-sans flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <span className="text-xl font-medium">Memuat izin pengguna...</span>
            </div>
        );
    }

    if (!canViews) {
        return (
            <div className="p-8 space-y-6 text-center bg-gray-50 min-h-screen flex flex-col items-center justify-center">
                <div className="bg-white rounded-xl shadow-xl p-8 max-w-md w-full">
                    <div className="mb-6 flex justify-center">
                        <div className="bg-red-100 rounded-full p-4">
                            <AlertTriangle className="text-red-500" size={48} />
                        </div>
                    </div>
                    
                    <h2 className="text-3xl font-extrabold text-red-600 mb-4">Akses Ditolak</h2>
                    
                    <div className="mb-6 text-left">
                        <p className="text-gray-700 text-lg mb-4">
                            Anda tidak memiliki izin yang diperlukan untuk mengakses halaman ini.
                        </p>
                        
                        <div className="bg-gray-100 rounded-lg p-4 mb-4">
                            <p className="text-sm font-semibold text-gray-600 mb-2">Izin yang diperlukan:</p>
                            <code className="bg-red-100 text-red-700 px-2 py-1 rounded text-sm font-mono">
                                workorder-pti.pengajuan.views
                            </code>
                        </div>
                        
                        <p className="text-sm text-gray-600">
                            Jika Anda merasa ini adalah kesalahan, silakan hubungi administrator sistem untuk memperoleh izin yang sesuai.
                        </p>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            onClick={() => router.push("/dashboard")}
                            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                        >
                            Kembali ke Dashboard
                        </button>
                        <button
                            onClick={() => window.history.back()}
                            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        >
                            Kembali ke Halaman Sebelumnya
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) {  
        return (
            <div className="p-4 md:p-20 space-y-6 text-gray-800 bg-gray-50 min-h-screen w-full font-sans flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <span className="text-xl font-medium">Memuat data pengajuan...</span>
            </div>
        );
    }

    // --- RENDER UTAMA ---

    const filtered = pengajuans.filter(
        (p) =>
            p.hal.toLowerCase().includes(search.toLowerCase()) ||
            p.name_pelapor.toLowerCase().includes(search.toLowerCase()) ||
            p.status.toLowerCase().includes(search.toLowerCase()) ||
            p.tanggal.toLowerCase().includes(search.toLowerCase()) ||
            p.no_surat.toLowerCase().includes(search.toLowerCase()) 
    );

    return (
        <div className="p-4 md:p-8 space-y-6 text-gray-800 bg-gray-50 min-h-screen font-sans">
            <DeleteConfirmationModal 
                isDeleteModalOpen={isDeleteModalOpen}
                setIsDeleteModalOpen={setIsDeleteModalOpen}
                itemToDelete={itemToDelete}
                handleConfirmDelete={handleConfirmDelete}
                isDeleting={isDeleting}
            />
            <StatusActionModal 
                statusModal={statusModal}
                setStatusModal={setStatusModal}
                currentUser={currentUser}
                handleApproveReject={handleApproveReject}
                currentStatusAction={currentStatusAction}
            />
            <TTDUploadModal />
            <TtdCropModal 
                isOpen={isTtdCropModalOpen}
                imageSrc={ttdImageForCrop}
                onCropComplete={handleTtdCropComplete}
                onCancel={handleTtdCropCancel}
            />
            <Toast toast={toast} setToast={setToast} />

            {isActionInProgress && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-60">
                <div className="bg-white p-6 rounded-xl shadow-2xl flex items-center">
                    <Loader2 className={`animate-spin ${isDeleting ? 'text-red-600' : 'text-blue-600'} mr-3`} size={24} />
                    <span className="text-lg font-semibold text-gray-800">
                        {ttdUploading 
                            ? "Sedang mengupload & memproses TTD..." 
                            : isDeleting 
                                ? `Menghapus data ${itemToDelete.no_surat && itemToDelete.no_surat !== '-' ? 'No. Surat ' + itemToDelete.no_surat : 'ID ' + itemToDelete.id}...` 
                                : `Memproses ${currentStatusAction === 'approve' ? 'Persetujuan' : 'Penolakan'} ${statusModal.no_surat && statusModal.no_surat !== '-' ? 'No. Surat ' + statusModal.no_surat : 'ID ' + statusModal.id}...`
                        }
                    </span>
                </div>
            </div>
        )}

            <div className="flex flex-col">
                <h2 className="text-3xl font-extrabold text-gray-900">Daftar Data Pengajuan</h2>
            </div>

            <div className="relative max-w-lg">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                    type="text"
                    placeholder="Cari berdasarkan tanggal, hal, pelapor, no surat, atau status..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 pr-4 py-3 w-full border border-gray-300 text-gray-800 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
                />
            </div>

            <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <div className="max-h-[500px] overflow-y-auto">
                        <table className="min-w-full text-sm text-gray-700 divide-y divide-gray-200">
                            <thead className="bg-blue-600 text-white sticky top-0 z-10">
                                <tr>
                                    <th className="py-3 px-4 text-left font-semibold w-[5%]">No</th>
                                    <th className="py-3 px-5 text-left font-semibold w-[10%]">Tanggal</th>
                                    <th className="py-3 px-12 text-left font-semibold w-[20%]">No. Surat</th>    
                                    <th className="py-3 px-4 text-left font-semibold max-w-xs truncate">Hal (Keterangan)</th>
                                    <th className="py-3 px-8 text-left font-semibold w-[15%]">Pelapor (Nama)</th>
                                    <th className="py-3 px-8 text-left font-semibold w-[10%]">Status</th>
                                    <th className="py-3 px-4 text-center font-semibold w-[15%]">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {loading && userPermissions.length > 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center bg-white">
                                            <Loader2 className="animate-spin inline-block text-blue-600 mr-2" size={24} />
                                            <span className="text-gray-600 font-medium">Memuat data...</span>
                                        </td>
                                    </tr>
                                ) : authError && !authError.includes("izin untuk melihat daftar ini") ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center bg-white">
                                            <AlertTriangle className="inline-block text-red-500 mr-2" size={24} />
                                            <span className="text-red-500 font-medium">Error Otorisasi: {authError}</span>
                                        </td>
                                    </tr>
                                ) : filtered.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-10 text-center text-gray-500 bg-white">
                                            <div className="flex flex-col items-center justify-center">
                                                <Search size={36} className="mb-2" />
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
                                            <td className="py-3 px-4 whitespace-nowrap text-xs">{p.tanggal}</td>
                                            
                                            {/* BAGIAN COPY NO SURAT */}
                                            <td className="py-3 px-4 whitespace-nowrap font-semibold text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span>{p.no_surat}</span>
                                                    {p.no_surat && p.no_surat !== '-' && (
                                                        <button
                                                            onClick={() => handleCopyNoSurat(p.no_surat)}
                                                            className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-gray-100"
                                                            title="Salin No Surat"
                                                        >
                                                            <Copy size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>

                                            <td className="py-3 px-4 line-clamp-2 max-w-xs">{p.hal}</td>
                                            <td className="py-3 px-4 font-medium">{p.name_pelapor}</td>
                                            <td className="py-3 px-4">
                                                <span
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusStyle(p.status)}`}
                                                >
                                                    {p.status || 'BELUM DIISI'}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-center whitespace-nowrap">
                                                <div className="flex justify-center space-x-1.5">
                                                    <button
                                                        onClick={() => handleStatusModalOpen(p.id, p.uuid, p.hal, p.no_surat)}
                                                        title={!canApprove ? "Akses Ditolak: Tidak ada izin workorder-pti.pengajuan.approval" : "Setujui/Tolak Pengajuan"}
                                                        disabled={isActionInProgress || !p.uuid || p.status.toLowerCase() === 'approved' || p.status.toLowerCase() === 'rejected' || !canApprove}
                                                        className={`p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors ${
                                                            isActionInProgress || p.status.toLowerCase() === 'approved' || p.status.toLowerCase() === 'rejected' || !canApprove ? 'opacity-50 cursor-not-allowed' : ''
                                                            }`}
                                                    >
                                                        <Clock size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleView(p.uuid)}
                                                        title={!canView ? "Akses Ditolak: Tidak ada izin workorder-pti.pengajuan.view" : "Lihat Detail"}
                                                        disabled={isActionInProgress || !canView}
                                                        className={`p-2 ${(!canView || isActionInProgress) ? 'text-gray-400 cursor-not-allowed' : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'} rounded-full transition-colors disabled:opacity-50`}
                                                    >
                                                        <Eye size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleEdit(p.uuid)}
                                                        title={!canEdit ? "Akses Ditolak: Tidak ada izin Workorder.pengajuan.edit" : "Ubah Data"}
                                                        disabled={isActionInProgress || !canEdit}
                                                        className={`p-2 ${(!canEdit || isActionInProgress) ? 'text-gray-400 cursor-not-allowed' : 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-100'} rounded-full transition-colors disabled:opacity-50`}
                                                    >
                                                        <Pencil size={18} />
                                                    </button>

                                                    <button
                                                        onClick={() => handleDeleteClick(p.id, p.uuid, p.hal, p.name_pelapor, p.no_surat, p.tanggal)}
                                                        title={!canDelete ? "Akses Ditolak: Tidak ada izin workorder-pti.pengajuan.delete" : "Hapus Data"}
                                                        disabled={isActionInProgress || !p.uuid || !canDelete}
                                                        className={`p-2 ${(!canDelete || !p.uuid) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-600 hover:text-red-800 hover:bg-red-100'} rounded-full transition-colors disabled:opacity-50`}
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

                {totalPages > 1 && (
                    <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
                        <div className="text-sm text-gray-700">
                            Menampilkan {fromData} hingga {toData} dari {totalData} data
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handlePageChange(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 py-1 text-sm font-medium text-gray-700">
                                Halaman {currentPage} dari {totalPages}
                            </span>
                            <button
                                onClick={() => handlePageChange(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DataPengajuanPage() {
    return (
        <Suspense fallback={
            <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
                <span className="text-xl font-medium text-gray-800">Memuat Halaman...</span>
            </div>
        }>
            <DataPengajuanContent />
        </Suspense>
    );
}