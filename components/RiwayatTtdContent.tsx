// components/RiwayatTtdContent.tsx

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
    FileSignature, Trash2, Loader2, AlertCircle, 
    Image as ImageIcon, Upload, X, ZoomIn, 
    Crop, Settings, Check 
} from 'lucide-react';
import Cropper, { Point, Area } from 'react-easy-crop';

const IMAGE_STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || 'https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=';

// --- TIPE DATA DISESUAIKAN DENGAN JSON BARU ---
interface TtdApiResponse {
    success: boolean;
    ttd_path: string;        // Path TTD Aktif
    ttd_list: string[];      // Array of strings (path TTD history)
}

// --- UTILITY FUNCTIONS ---
async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
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

const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation = 0): Promise<string> => {
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

    ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(data, 0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x, 0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y);

    return canvas.toDataURL('image/png');
};

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

                    const croppedCanvas = document.createElement("canvas");
                    croppedCanvas.width = maxX - minX;
                    croppedCanvas.height = maxY - minY;
                    const croppedCtx = croppedCanvas.getContext("2d")!;
                    croppedCtx.drawImage(canvas, minX, minY, maxX - minX, maxY - minY, 0, 0, maxX - minX, maxY - minY);
                    resolve(croppedCanvas.toDataURL("image/png"));
                } else {
                    resolve(canvas.toDataURL("image/png"));
                }
            };
            img.onerror = () => { resolve(dataUrl); };
        } catch (error) { resolve(dataUrl); }
    });
}

// --- KOMPONEN MODAL CROP ---
const TtdCropModal = ({ isOpen, imageSrc, onCropComplete, onCancel }: { isOpen: boolean, imageSrc: string | null, onCropComplete: (croppedImage: string, settings?: any) => void, onCancel: () => void }) => {
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
            const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
            onCropComplete(croppedImage, transparencySettings);
        } catch (e) { console.error(e); } finally { setIsProcessing(false); }
    }, [imageSrc, croppedAreaPixels, rotation, onCropComplete, transparencySettings]);

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
            <div className="bg-white p-5 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col transform transition-all">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Crop size={20} className="text-blue-600"/> Sesuaikan Tanda Tangan
                    </h3>
                    <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 text-xs bg-gray-100 rounded-md hover:bg-gray-200 transition flex items-center gap-1 font-bold text-gray-700">
                        <Settings size={14} /> {showSettings ? 'Tutup Pengaturan' : 'Pengaturan'}
                    </button>
                </div>

                {showSettings && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="font-bold text-xs mb-2 text-black">Pengaturan Transparansi</h4>
                        <div>
                            <label className="flex items-center gap-2 text-xs font-bold text-black cursor-pointer">
                                <input type="checkbox" checked={transparencySettings.useAdvanced} onChange={(e) => setTransparencySettings(prev => ({ ...prev, useAdvanced: e.target.checked }))} className="w-3.5 h-3.5 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                                Gunakan Mode Transparansi Lanjutan
                            </label>
                        </div>
                    </div>
                )}

                <div className="relative w-full h-80 bg-gray-100 rounded-xl overflow-hidden border border-gray-300 mb-4">
                    <Cropper image={imageSrc} crop={crop} zoom={zoom} rotation={rotation} aspect={4/3} onCropChange={setCrop} onCropComplete={onCropCompleteHandler} onZoomChange={setZoom} onRotationChange={setRotation} />
                </div>

                <div className="space-y-3 mb-5">
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700 w-12">Zoom</span>
                        <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-bold text-gray-700 w-12">Rotasi</span>
                        <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">Batal</button>
                    <button onClick={showCroppedImage} disabled={isProcessing} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-400 flex items-center shadow-md shadow-blue-200">
                        {isProcessing ? <><Loader2 size={16} className="inline mr-2 animate-spin" /> Memproses...</> : <><Check size={16} className="mr-2" /> Terapkan & Upload</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- KOMPONEN UTAMA ---
export default function RiwayatTtdContent() {
    // State Data: Menggunakan string[] karena API returning array of strings
    const [galleryItems, setGalleryItems] = useState<string[]>([]); 
    const [activeTtdPath, setActiveTtdPath] = useState<string | null>(null);
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // UI States
    const [deletingPath, setDeletingPath] = useState<string | null>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    
    // Modal States
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [imageSrcForCrop, setImageSrcForCrop] = useState<string | null>(null);

    const didFetchRef = useRef(false);

    const getUserData = () => {
        const storedUserData = localStorage.getItem("user_data");
        if (storedUserData) {
            try { return JSON.parse(storedUserData); } 
            catch (e) { console.error("Gagal parse user data:", e); return null; }
        }
        return null;
    };
    
    const getToken = () => localStorage.getItem("token");

    const fetchTtdHistory = async () => {
        setLoading(true);
        setError(null);
        const userData = getUserData();
        const token = getToken();

        if (!userData?.npp || userData.npp === '-') {
            setError("NPP tidak ditemukan. Silakan login ulang.");
            setLoading(false);
            return;
        }

        if (!token) {
            setError("Token autentikasi tidak ditemukan. Silakan login ulang.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/ttd-proxy/${userData.npp}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) throw new Error(`Gagal mengambil data: ${res.statusText}`);

            const apiResponse: TtdApiResponse = await res.json();
            
            if (apiResponse.success) {
                const activePath = apiResponse.ttd_path;
                setActiveTtdPath(activePath);

                // Gabungkan ttd_path dan ttd_list menjadi satu array unik
                const uniquePaths = new Set<string>();
                
                // Tambahkan active path jika ada
                if (activePath) uniquePaths.add(activePath);
                
                // Tambahkan history list jika ada dan berupa array
                if (Array.isArray(apiResponse.ttd_list)) {
                    apiResponse.ttd_list.forEach(p => {
                        if (p) uniquePaths.add(p);
                    });
                }

                setGalleryItems(Array.from(uniquePaths));
            } else {
                throw new Error("API melaporkan kegagalan.");
            }

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan yang tidak diketahui.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (pathToDelete: string) => {
        const isConfirmed = window.confirm("Apakah Anda yakin ingin menghapus tanda tangan ini?");
        if (!isConfirmed) return;

        setDeletingPath(pathToDelete);
        const token = getToken();
        const userData = getUserData();

        if (!token || !userData?.npp) {
            alert("Sesi tidak valid. Silakan login ulang.");
            setDeletingPath(null);
            return;
        }

        try {
            // Menggunakan endpoint delete dengan body JSON (npp & ttd_url)
            const res = await fetch(`/api/user/delete/ttd`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    npp: userData.npp,
                    ttd_url: pathToDelete
                })
            });

            if (!res.ok) throw new Error(`Gagal menghapus data: ${res.statusText}`);

            // Update UI optimistically or refetch
            setGalleryItems(prev => prev.filter(p => p !== pathToDelete));
            if (pathToDelete === activeTtdPath) setActiveTtdPath(null);

        } catch (err: any) {
            alert(`Error: ${err.message || "Gagal menghapus data."}`);
        } finally {
            setDeletingPath(null);
        }
    };

    // 1. HANDLER SAAT FILE DIPILIH (Buka Crop Modal)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const previewUrl = URL.createObjectURL(file);
            setImageSrcForCrop(previewUrl);
            setCropModalOpen(true);
            setShowUploadModal(false); 
        }
        e.target.value = ''; 
    };

    // 2. HANDLER CROP & UPLOAD
    const handleCropAndUpload = async (
        croppedImageBase64: string,
        settings?: { whiteThreshold: number, blackThreshold: number, useAdvanced: boolean }
    ) => {
        setCropModalOpen(false);
        setImageSrcForCrop(null);
        setUploading(true);

        const token = getToken();
        const userData = getUserData();

        if (!token || !userData) {
            alert("Sesi habis. Silakan login ulang.");
            setUploading(false);
            return;
        }

        try {
            const processedImage = await processImageTransparency(croppedImageBase64, settings);
            const finalFile = await dataURLtoFile(processedImage, `ttd-upload-${Date.now()}.png`);

            const formData = new FormData();
            formData.append('ttd_file', finalFile); 
            formData.append('npp', userData.npp);

            const res = await fetch('/api/ttd-upload', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Gagal mengunggah: ${res.statusText}`);
            }

            const result = await res.json();
            
            if (result.success) {
                await fetchTtdHistory(); // Refresh data
            } else {
                throw new Error(result.message || "Upload gagal");
            }

        } catch (err: any) {
            console.error("Upload error:", err);
            alert(`Gagal mengunggah tanda tangan: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleCancelCrop = () => {
        setCropModalOpen(false);
        setImageSrcForCrop(null);
        setShowUploadModal(true);
    };

    useEffect(() => {
        if (didFetchRef.current) return; 
        didFetchRef.current = true;
        fetchTtdHistory();
    }, []);

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-600" />
                <span className="ml-2 text-gray-600">Memuat galeri TTD...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <AlertCircle className="h-5 w-5 mr-2" />
                <span>{error}</span>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
            
            {/* OVERLAY LOADING SAAT UPLOAD */}
            {uploading && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-xl shadow-2xl flex flex-col items-center">
                        <Loader2 className="h-10 w-10 animate-spin text-cyan-600 mb-3" />
                        <span className="text-lg font-semibold text-gray-800">Sedang Mengupload & Memproses...</span>
                    </div>
                </div>
            )}

            {/* HEADER */}
            <div className="mb-8">
                <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg shadow-lg">
                        <FileSignature className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Riwayat Tanda Tangan Digital</h1>
                        <p className="text-sm text-gray-500">Kelola koleksi tanda tangan digital Anda.</p>
                    </div>
                </div>
            </div>

            {/* GALERI */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 mb-6">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                        <ImageIcon className="w-5 h-5 mr-2 text-cyan-600" />
                        Galeri Tanda Tangan
                    </h2>
                    <button 
                        className="inline-flex items-center px-4 py-2 bg-cyan-600 text-white text-sm font-medium rounded-lg hover:bg-cyan-700 transition-colors shadow-sm"
                        onClick={() => setShowUploadModal(true)}
                        disabled={uploading}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload TTD Baru
                    </button>
                </div>
                
                <div className="p-6">
                    {galleryItems.length === 0 ? (
                        <div className="text-center py-12 text-gray-500">
                            <ImageIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                            <p>Anda belum memiliki tanda tangan digital.</p>
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-4 justify-center">
                            {galleryItems.map((path, index) => (
                                <div key={index} className="relative group">
                                    <div className={`border-2 rounded-lg p-2 bg-white hover:shadow-lg transition-all duration-300 transform hover:scale-105 cursor-pointer ${path === activeTtdPath ? 'border-cyan-500 ring-2 ring-cyan-100' : 'border-gray-200'}`}>
                                        <img 
                                            src={`/api/file-proxy?url=${encodeURIComponent(IMAGE_STORAGE_BASE_URL + path)}`} 
                                            alt={`Tanda Tangan ${index + 1}`} 
                                            className="h-32 w-64 object-contain"
                                            onClick={() => setSelectedImage(path)}
                                        />
                                    </div>
                                    
                                    <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-1 p-1">
                                        <button 
                                            className="bg-white rounded-full p-1 shadow-md hover:bg-cyan-50 border border-gray-200"
                                            onClick={() => setSelectedImage(path)}
                                            title="Perbesar"
                                        >
                                            <ZoomIn className="h-4 w-4 text-cyan-600" />
                                        </button>
                                        <button 
                                            className="bg-white rounded-full p-1 shadow-md hover:bg-red-50 border border-gray-200"
                                            onClick={() => handleDelete(path)}
                                            disabled={deletingPath === path}
                                            title="Hapus"
                                        >
                                            {deletingPath === path ? (
                                                <Loader2 className="h-4 w-4 text-red-600 animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4 text-red-600" />
                                            )}
                                        </button>
                                    </div>

                                    {path === activeTtdPath && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-cyan-600 text-white text-xs py-1 text-center rounded-b-lg font-medium shadow-sm">
                                            Aktif Digunakan
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL KOMPONEN --- */}

            {/* MODAL CROP & SETTING (Z-INDEX 9999) */}
            <TtdCropModal 
                isOpen={cropModalOpen}
                imageSrc={imageSrcForCrop}
                onCropComplete={handleCropAndUpload}
                onCancel={handleCancelCrop}
            />

            {/* MODAL PREVIEW GAMBAR (Diperkecil & Tanpa Unduh) */}
            {selectedImage && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm transition-opacity" onClick={() => setSelectedImage(null)}>
                    <div className="bg-white rounded-2xl p-2 shadow-2xl relative max-w-md w-full flex flex-col transform transition-all scale-100" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center p-3 border-b border-gray-100">
                            <h3 className="text-gray-700 font-semibold text-sm pl-2">Preview Tanda Tangan</h3>
                            <button className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full p-1 transition-colors" onClick={() => setSelectedImage(null)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 flex justify-center items-center p-6 bg-gray-50 overflow-hidden">
                            <img 
                                src={`/api/file-proxy?url=${encodeURIComponent(IMAGE_STORAGE_BASE_URL + selectedImage)}`} 
                                alt="Tanda Tangan Diperbesar" 
                                className="max-h-[40vh] max-w-full object-contain drop-shadow-sm"
                            />
                        </div>
                        <div className="p-3 border-t border-gray-100 flex justify-end bg-white rounded-b-2xl">
                            <button className="px-5 py-2 bg-gray-800 text-white text-sm font-medium rounded-lg hover:bg-gray-900 transition-colors shadow-sm" onClick={() => setSelectedImage(null)}>
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL UPLOAD AWAL */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all scale-100 border border-gray-100">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-800">Upload Tanda Tangan</h3>
                            <button className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-1 rounded-full" onClick={() => setShowUploadModal(false)}>
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="mb-6">
                            <div className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-gray-300 border-dashed rounded-xl hover:bg-cyan-50 hover:border-cyan-400 transition-all cursor-pointer relative group">
                                <div className="space-y-2 text-center">
                                    <div className="mx-auto h-12 w-12 text-gray-400 group-hover:text-cyan-500 transition-colors">
                                        <Upload className="h-full w-full" />
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        <label className="relative cursor-pointer rounded-md font-medium text-cyan-600 hover:text-cyan-500 focus-within:outline-none">
                                            <span>Klik untuk pilih file</span>
                                            <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleFileSelect} />
                                        </label>
                                    </div>
                                    <p className="text-xs text-gray-400">PNG, JPG, GIF (Maks. 2MB)</p>
                                </div>
                            </div>
                        </div>
                          
                        <div className="flex justify-end pt-2">
                            <button className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors" onClick={() => setShowUploadModal(false)}>
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}