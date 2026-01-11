// app/dashboard/spk/format/page.tsx
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, X, CheckCircle, Loader2, AlertTriangle, Users, ArrowLeft, ChevronDown, ChevronUp, File as FileIcon, Download, Crop, Settings, Upload, Image as ImageIcon } from "lucide-react";
import Cropper, { Point, Area } from 'react-easy-crop';
import Draggable from "react-draggable";
import QRCode from "react-qr-code";


// ====================================================================
// --- TYPES & CONSTANTS ----------------------------------------------
// ====================================================================

const API_BASE_URL = "https://fermentable-nonarchitecturally-brittney.ngrok-free.dev";

const GET_API_SPK_VIEW_TEMPLATE_PROXY = "/api/spk-proxy/view/{uuid}";
const GET_API_PENGAJUAN_VIEW_PROXY = "/api/pengajuan/view/{uuid}";
const GET_API_JENIS_PEKERJAAN = "/api/jenis-pekerjaan";
const UPDATE_SPK_API_LOCAL = "/api/proxy-spk-update?uuid={uuid}";
const TTD_PROXY_PATH = "/api/ttd-proxy";
const SPK_STATUS_LOCAL = "/api/spk/status"; 
const MULTIPLE_FILE_HANDLER_URL = "/api/file-handler/multiple/foto";    

const STATUS_PEKERJAAN = [
    { id: 1, name: "Belum Selesai", code: "BS" },
    { id: 2, name: "Selesai", code: "S" },
    { id: 3, name: "Tidak Selesai", code: "TS" }
];

type SupervisorData = { name: string; npp: string; jabatan: string; unit: string; tlp?: string; };
type PegawaiItem = { name: string; npp: string | null; jabatan: string | null; tlp?: string | null; };
type AssignedPerson = PegawaiItem & { isPic: boolean; };
type ToastMessage = { show: boolean; message: string; type: "success" | "error" | "warning"; };

type SPKDetail = {
    uuid: string;
    pengajuan_uuid: string | null;
    nomor_spk: string;
    pekerjaan_spk: string;
    tanggal_spk: string;
    tanggal_selesai: string | null;
    id_barang: string | null;
    jenis_pekerjaan: string | null;
    jenis_pekerjaan_id?: number;
    status: string;
    status_id?: number; 
    personel_ditugaskan: AssignedPerson[];
    foto_pekerjaan?: string[];
    ttd_pelaksana_path?: string | null;
    ttd_menyetujui_path?: string | null;
    ttd_mengetahui_path?: string | null;
    // Tambahkan field untuk data mengetahui dan menyetujui dari API
    mengetahui_name?: string;
    mengetahui_npp?: string;
    mengetahui_jabatan?: string;
    menyetujui_name?: string;
    menyetujui_npp?: string;
    menyetujui_jabatan?: string;
};

type PengajuanDetail = {
    uuid: string;
    no_surat: string;
    nama_jenis: string;
    hal_id: string;
    kepada: string;
    satker: string;
    name_pelapor: string;
    npp_pelapor: string;
    tlp_pelapor: string;
    ttd_pelapor_path: string | null;
    mengetahui: string | null;
    mengetahui_name: string | null;
    ttd_mengetahui_path: string | null;
    keterangan: string;
    file_paths: string[];
    tanggal: string;
    kode_barang: string | null;
};

// ====================================================================
// --- UTILITY FUNCTIONS (IMAGE PROCESSING & PROXY) -------------------
// ====================================================================

const PDAM_GATEWAY_BASE_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=";
const FILE_PROXY_PATH = "/api/file-proxy";

const getProxyFileUrl = (path: string | null | undefined): string | null => {
    if (!path || path.trim() === '') return null;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    let targetUrl = cleanPath;
    if (!cleanPath.startsWith('http')) {
        targetUrl = `${PDAM_GATEWAY_BASE_URL}${cleanPath}`;
    }
    return `${FILE_PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
};

async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
}

// app/dashboard/spk/format/page.tsx

// Tambahkan fungsi baru untuk memuat gambar dengan retry
async function loadImageWithProxyRetry(imgUrl: string, token: string, maxRetries: number = 5): Promise<string> {
    if (imgUrl.startsWith('data:')) return imgUrl;
    
    let retryCount = 0;
    
    const attemptLoad = async (): Promise<string> => {
        try {
            let targetUrl = imgUrl;
            if (!imgUrl.startsWith('http')) {
                const cleanPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl;
                targetUrl = `${PDAM_GATEWAY_BASE_URL}${cleanPath}`;
            }
            const proxyUrl = `${FILE_PROXY_PATH}?url=${encodeURIComponent(targetUrl)}`;
            const res = await fetch(proxyUrl, {
                headers: {
                    'Authorization': `Bearer ${token.replace('Bearer ', '')}`,
                    'Accept': 'image/png, image/jpeg, image/gif',
                },
            });
            
            if (!res.ok) {
                throw new Error(`Gagal load image via proxy: ${res.status}`);
            }
            
            const blob = await res.blob();
            const reader = new FileReader();
            
            return new Promise<string>((resolve, reject) => {
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = () => reject(new Error('Failed to read file'));
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            console.error(`Error loading image (attempt ${retryCount + 1}):`, error);
            retryCount++;
            
            if (retryCount >= maxRetries) {
                console.error(`Max retries (${maxRetries}) reached for image: ${imgUrl}`);
                return imgUrl; // Kembalikan URL asli jika gagal setelah max retries
            }
            
            // Tunggu sebelum mencoba lagi (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount - 1)));
            
            return attemptLoad();
        }
    };
    
    return attemptLoad();
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
                        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
                        const brightness = (r + g + b) / 3;
                        const colorVariance = Math.max(r, g, b) - Math.min(r, g, b);
                        if (brightness > whiteThreshold || brightness < blackThreshold) { data[i + 3] = 0; }
                        else if (colorVariance < 15 && brightness > 100 && brightness < 200) { data[i + 3] = 0; }
                        else if (brightness > 220) { data[i + 3] = Math.max(0, 255 - (brightness - 220) * 10); }
                    }
                } else {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
                        const brightness = (r + g + b) / 3;
                        if (brightness > whiteThreshold || brightness < blackThreshold) { data[i + 3] = 0; }
                    }
                }
                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.onerror = () => resolve(dataUrl);
        } catch (error) { resolve(dataUrl); }
    });
}

// ====================================================================
// --- UI COMPONENTS --------------------------------------------------
// ====================================================================

const ImageModal = ({ imageUrl, onClose }: { imageUrl: string | null, onClose: () => void }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
            <div className="relative bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition z-10"><X size={20} /></button>
                <img src={imageUrl} alt="Lampiran Detail" className="w-full h-auto max-w-[80vw] max-h-[85vh] object-contain p-2"/>
            </div>
        </div>
    );
};

const TtdCropModal = ({ isOpen, imageSrc, onCropComplete, onCancel }: { isOpen: boolean, imageSrc: string | null, onCropComplete: (croppedImage: string, settings?: any) => void, onCancel: () => void }) => {
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [transparencySettings, setTransparencySettings] = useState({ whiteThreshold: 235, blackThreshold: 35, useAdvanced: true });
    const [showSettings, setShowSettings] = useState(false);

    const onCropCompleteHandler = useCallback((_: Area, croppedAreaPixels: Area) => setCroppedAreaPixels(croppedAreaPixels), []);

    const createImage = (url: string): Promise<HTMLImageElement> =>
        new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener('load', () => resolve(image));
            image.addEventListener('error', (error) => reject(error));
            image.setAttribute('crossOrigin', 'anonymous');
            image.src = url;
        });

    const getCroppedImg = async (imageSrc: string, pixelCrop: Area, rotation = 0): Promise<string> => {
        const image = await createImage(imageSrc);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';
        const maxSize = Math.max(image.width, image.height);
        const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));
        canvas.width = safeArea; canvas.height = safeArea;
        ctx.translate(safeArea / 2, safeArea / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.translate(-safeArea / 2, -safeArea / 2);
        ctx.drawImage(image, safeArea / 2 - image.width * 0.5, safeArea / 2 - image.height * 0.5);
        const data = ctx.getImageData(0, 0, safeArea, safeArea);
        canvas.width = pixelCrop.width; canvas.height = pixelCrop.height;
        ctx.putImageData(data, 0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x, 0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y);
        return canvas.toDataURL('image/png');
    };

    const handleApply = async () => {
        if (!imageSrc || !croppedAreaPixels) return;
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
        onCropComplete(croppedImage, transparencySettings);
    };

    if (!isOpen || !imageSrc) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-[2000] backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="px-5 py-4 border-b flex justify-between items-center bg-white">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Crop size={20} className="text-blue-600"/> 
                        Crop Tanda Tangan
                    </h3>
                    <button onClick={() => setShowSettings(!showSettings)} className="text-xs font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full flex gap-1 items-center transition-colors">
                        <Settings size={14}/> {showSettings ? 'Tutup Pengaturan' : 'Pengaturan'}
                    </button>
                </div>

                {/* Settings Panel (Toggle) */}
                {showSettings && (
                    <div className="px-5 py-3 bg-gray-50 text-sm border-b animate-in slide-in-from-top-2 duration-200">
                        <p className="font-semibold text-gray-700 mb-2 text-xs uppercase tracking-wider">Transparansi Lanjutan</p>
                        <div className="space-y-3">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="rounded text-blue-600 focus:ring-blue-500" checked={transparencySettings.useAdvanced} onChange={e => setTransparencySettings(p => ({...p, useAdvanced: e.target.checked}))} /> 
                                <span className="text-gray-600">Aktifkan Mode Lanjutan</span>
                            </label>
                            <div className="flex items-center gap-3">
                                <span className="text-gray-500 w-24">Threshold Putih:</span>
                                <input type="range" className="flex-1 h-1.5 bg-gray-300 rounded-lg appearance-none cursor-pointer accent-blue-600" min="150" max="255" value={transparencySettings.whiteThreshold} onChange={e => setTransparencySettings(p => ({...p, whiteThreshold: parseInt(e.target.value)}))} />
                                <span className="text-xs font-mono w-8 text-right">{transparencySettings.whiteThreshold}</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Crop Area */}
                <div className="relative h-[300px] w-full bg-gray-900">
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

                {/* Slider Controls */}
                <div className="px-6 py-5 bg-white space-y-4">
                    {/* Zoom Slider */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-400 w-16">Zoom:</span>
                        <input
                            type="range"
                            value={zoom}
                            min={1}
                            max={3}
                            step={0.1}
                            aria-labelledby="Zoom"
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                        />
                    </div>

                    {/* Rotation Slider */}
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-400 w-16">Rotasi:</span>
                        <input
                            type="range"
                            value={rotation}
                            min={0}
                            max={360}
                            step={1}
                            aria-labelledby="Rotation"
                            onChange={(e) => setRotation(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700"
                        />
                    </div>
                </div>

                {/* Footer Buttons */}
                <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button 
                        onClick={onCancel} 
                        className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={handleApply} 
                        className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                    >
                        Terapkan
                    </button>
                </div>
            </div>
        </div>
    );
};

const Button = ({ onClick, children, className = "bg-blue-600 hover:bg-blue-700 text-white", disabled = false }: any) => (
    <button onClick={onClick} className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={disabled}>{children}</button>
);

const ToastBox = ({ toast, onClose }: { toast: ToastMessage, onClose: () => void }) =>
    toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 transition-opacity duration-300 flex items-center gap-2 ${toast.type === "success" ? "bg-green-600" : (toast.type === "error" ? "bg-red-600" : "bg-yellow-600")}`}>
            {toast.message} <button onClick={onClose} className="text-white ml-2"><X size={14} /></button>
        </div>
    );

const Chip = ({ person }: { person: AssignedPerson }) => (
    <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full my-1 shadow-sm border border-blue-200">
        <div className={`mr-2 flex items-center justify-center`}>
            {person.isPic ? <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" /> : <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>}
        </div>
        <Users className="w-4 h-4 mr-1 text-blue-600" />
        <span className="font-medium">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
    </div>
);

const EditableBox = ({ value, onChange, disabled = false }: { value: string | undefined; onChange: (value: string) => void; disabled?: boolean; }) => {
    const ref = useRef<HTMLDivElement>(null);
    useEffect(() => { if (ref.current && ref.current.innerText !== (value || "")) ref.current.innerText = value || ""; }, [value]);
    return (
        <div
            ref={ref}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={(e) => !disabled && onChange(e.currentTarget.innerText)}
            className={`min-h-[140px] p-2 text-black border border-gray-300 rounded-md shadow-inner text-sm ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}
            style={{ outline: "none", whiteSpace: "pre-wrap", cursor: disabled ? 'not-allowed' : 'text' }}
        />
    );
};

// ====================================================================
// --- COLLAPSIBLE COMPONENTS -----------------------------------------
// ====================================================================

const PengajuanDetailView = ({ detail, onImageClick }: { detail: PengajuanDetail; onImageClick: (url: string) => void; }) => {
    const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
    
    const handleImageError = (path: string) => {
        setImageLoadErrors(prev => new Set(prev).add(path));
    };
    
    return (
        <div className="space-y-1 text-sm pb-4 mb-4 border-b border-gray-200 print:border-none">
            <h4 className="font-bold underline mb-2 mt-2 text-md print:text-sm print:font-bold">DETAIL PENGAJUAN</h4>
            <div className="grid grid-cols-2 gap-4 text-xs print:text-[12px] mb-2">
                <div className="flex"><div className="w-[120px] text-gray-700">No. Pengajuan</div><div className="flex-1">:{detail.no_surat || '-'}</div></div>
                <div className="flex"><div className="w-[80px] text-gray-700">Tanggal</div><div className="flex-1">:{detail.tanggal || '-'}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs print:text-[12px] mb-2">
                <div className="flex"><div className="w-[120px] text-gray-700">Pelapor</div><div className="flex-1">:{detail.name_pelapor} (NPP :{detail.npp_pelapor})</div></div>
                <div className="flex"><div className="w-[80px] text-gray-700">Satker Asal</div><div className="flex-1">:{detail.satker || '-'}</div></div>
            </div>
            <div className="flex text-xs mb-2 print:text-[12px]"><div className="w-[120px] text-gray-700">Perihal</div><div className="flex-1">:{detail.nama_jenis} ({detail.hal_id})</div></div>
            <div className="text-xs mb-2 p-2 border border-gray-200 rounded print:border-none print:p-0"><div className="text-gray-700 mb-1">Uraian Detail:</div><p className="whitespace-pre-wrap print:text-[12px]">{detail.keterangan || 'Tidak ada uraian detail.'}</p></div>

            {/* TTD Pengajuan View Only */}
            <div className="grid grid-cols-2 gap-4 pt-4 print:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-3 print:p-1 print:border-dashed">
                    <div className="text-black text-xs mb-2">Tanda Tangan Mengetahui:</div>
                    <div className="text-center min-h-[120px] flex flex-col justify-end items-center">
                        {/* CONTAINER TTD MENGETAHUI - UKURAN STANDAR */}
                        {detail.ttd_mengetahui_path ? (
                            <div className="h-28 w-full flex justify-center items-center">
                                {imageLoadErrors.has(detail.ttd_mengetahui_path) ? (
                                    <span className="text-gray-500 italic text-xs h-28 flex items-center justify-center">TTD tidak dapat dimuat.</span>
                                ) : (
                                    <img 
                                        src={getProxyFileUrl(detail.ttd_mengetahui_path) || ""} 
                                        alt="TTD Mengetahui" 
                                        className="h-28 w-auto object-contain mb-1" 
                                        onError={() => handleImageError(detail.ttd_mengetahui_path || '')}
                                    />
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-500 italic text-xs h-28 flex items-center justify-center">TTD tidak tersedia.</span>
                        )}
                        <p className="text-xs mt-1 text-gray-700">{detail.mengetahui_name || '-'}</p>
                    </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 print:p-1 print:border-dashed">
                    <div className="text-black text-xs mb-2">Tanda Tangan Pelapor:</div>
                    <div className="text-center min-h-[120px] flex flex-col justify-end items-center">
                        {/* CONTAINER TTD PELAPOR - UKURAN STANDAR */}
                        {detail.ttd_pelapor_path ? (
                            <div className="h-28 w-full flex justify-center items-center">
                                {imageLoadErrors.has(detail.ttd_pelapor_path) ? (
                                    <span className="text-gray-500 italic text-xs h-28 flex items-center justify-center">TTD tidak dapat dimuat.</span>
                                ) : (
                                    <img 
                                        src={getProxyFileUrl(detail.ttd_pelapor_path) || ""} 
                                        alt="TTD Pelapor" 
                                        className="h-28 w-auto object-contain mb-1 cursor-pointer" 
                                        onClick={() => onImageClick(getProxyFileUrl(detail.ttd_pelapor_path) || '')}
                                        onError={() => handleImageError(detail.ttd_pelapor_path || '')}
                                    />
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-500 italic text-xs h-28 flex items-center justify-center">TTD tidak tersedia.</span>
                        )}
                        <p className="text-xs mt-1 text-gray-700">{detail.name_pelapor}</p>
                    </div>
                </div>
            </div>

            {/* Lampiran */}
            {detail.file_paths.length > 0 && (
                <div className="pt-4 border-t mt-4 border-gray-100 print:border-none">
                    <div className="text-cyan-700 text-sm mb-2 flex items-center gap-1"><FileIcon size={16}/> Lampiran File ({detail.file_paths.length} file):</div>
                    <div className="grid grid-cols-3 gap-3 print:grid-cols-3">
                        {detail.file_paths.map((path, index) => {
                            const fileUrl = getProxyFileUrl(path);
                            const isImage = /\.(jpe?g|png|gif|webp)$/i.test(path);
                            const hasError = imageLoadErrors.has(path);
                            
                            return (
                                <div key={index} className="block p-3 border border-gray-300 rounded-lg text-center hover:bg-gray-100 transition h-36 flex flex-col justify-between">
                                    {isImage ? (
                                        <div onClick={(e) => { e.preventDefault(); if (!hasError) onImageClick(fileUrl || ''); }} className="cursor-pointer">
                                            {hasError ? (
                                                <div className="h-24 w-full flex items-center justify-center bg-gray-100 rounded">
                                                    <span className="text-xs text-gray-500">Gambar tidak dapat dimuat</span>
                                                </div>
                                            ) : (
                                                <img 
                                                    src={fileUrl || ''} 
                                                    alt="Thumbnail" 
                                                    className="h-24 w-full object-contain mx-auto rounded" 
                                                    onError={() => handleImageError(path)}
                                                />
                                            )}
                                            <span className="text-xs text-gray-700 block truncate mt-1">Lihat Gambar</span>
                                        </div>
                                    ) : (
                                        <a href={fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="flex flex-col h-full justify-between">
                                            <FileIcon size={36} className="mx-auto text-blue-500 flex-shrink-0"/>
                                            <span className="text-xs text-gray-700 block truncate mt-1">Unduh File</span>
                                            <Download size={12} className="inline ml-1 text-blue-500"/>
                                        </a>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

const SPKSettingsForm = ({ spkData, jenisPekerjaanOptions, updateField, canEdit, isUpdating, handleUpdateSPK, fotoPekerjaan, setFotoPekerjaan, handleFotoUpload, handleRemoveFoto, onImageClick, statusOptions, canEditSignature }: any) => (
    <div className="mt-6 text-black border-t-2 border-gray-300 pt-4 rounded-lg bg-white p-5 shadow-inner space-y-4">
        <h3 className="font-bold text-base mb-4 text-cyan-700">⚙️ Pengaturan Detail Pekerjaan</h3>
        <div className="flex items-center"><div className="w-[140px] font-medium">Tanggal Pengerjaan</div><div className="relative"><input type="date" value={spkData.tanggal_selesai || ""} onChange={(e) => updateField("tanggal_selesai", e.target.value)} disabled={!canEdit} className={`border border-gray-400 rounded-lg outline-none px-3 py-1.5 text-sm w-[180px] focus:ring-2 focus:ring-blue-500 transition-shadow ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} /><Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" /></div></div>
        <div className="flex items-center"><div className="w-[140px] font-medium">Jenis Pekerjaan</div><select value={spkData.jenis_pekerjaan_id || ""} onChange={(e) => updateField("jenis_pekerjaan_id", parseInt(e.target.value))} disabled={!canEdit} className={`border border-gray-400 rounded-lg text-sm py-1.5 px-3 w-full max-w-sm focus:ring-2 focus:ring-blue-500 transition-shadow ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`}><option value="">-- Pilih Jenis Pekerjaan --</option>{jenisPekerjaanOptions.map((jp: any) => (<option key={jp.id} value={jp.id}>{jp.nama}</option>))}</select></div>
        <div className="flex items-center"><div className="w-[140px] font-medium">ID Barang</div><input type="text" value={spkData.id_barang || ""} onChange={(e) => updateField("id_barang", e.target.value)} placeholder="(Ketik ID barang...)" disabled={!canEdit} className={`border border-gray-400 rounded-lg outline-none px-3 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-blue-500 transition-shadow ${!canEdit ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}`} /></div>
        <div className="flex"><div className="w-[140px] pt-2 font-medium">Uraian Pekerjaan</div><div className="flex-1"><EditableBox value={spkData.pekerjaan_spk || ""} onChange={(v) => updateField("pekerjaan_spk", v)} disabled={!canEdit} /></div></div>
        
        {/* Foto Pekerjaan */}
        <div className="flex">
            <div className="w-[140px] pt-2 font-medium">Foto Pekerjaan</div>
            <div className="flex-1">
                {canEdit ? (
                    <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-3">
                            {fotoPekerjaan.map((foto: any, index: number) => (
                                <div key={index} className="relative group">
                                    <div 
                                        className="border border-gray-300 rounded-lg overflow-hidden h-32 cursor-pointer hover:opacity-90 transition"
                                        onClick={() => handleFotoUpload(index)}
                                    >
                                        {foto.preview ? (
                                            <img src={foto.preview} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                                                <Upload size={20} className="text-gray-400 mb-1" />
                                                <span className="text-xs text-gray-500">Upload Foto</span>
                                            </div>
                                        )}
                                    </div>
                                    {foto.preview && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleRemoveFoto(index);
                                                }}
                                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                            >
                                                <X size={14} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onImageClick(foto.preview);
                                                }}
                                                className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                                title="Lihat gambar"
                                            >
                                                <ImageIcon size={14} />
                                            </button>
                                        </>
                                    )}
                                    <input
                                        type="file"
                                        id={`foto-${index}`}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={(e) => handleFotoUpload(index, e.target.files?.[0])}
                                    />
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-500">Maksimal 4 foto. Klik pada kotak untuk mengunggah foto.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 gap-3">
                        {fotoPekerjaan.map((foto: any, index: number) => (
                            <div key={index} className="border border-gray-300 rounded-lg overflow-hidden h-32 relative group">
                                {foto.preview ? (
                                    <>
                                        <img src={foto.preview} alt={`Foto ${index + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => onImageClick(foto.preview)} />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onImageClick(foto.preview);
                                            }}
                                            className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
                                            title="Lihat gambar"
                                        >
                                            <ImageIcon size={14} />
                                        </button>
                                    </>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                                        <ImageIcon size={20} className="text-gray-400" />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
        
        <div className="pt-2 flex items-start">
            <div className="w-[140px] font-medium">Status Pekerjaan</div>
            <div className="flex items-center gap-4 flex-wrap">
                {statusOptions && statusOptions.map((status: any) => (
                    <div key={status.id} className={`flex items-center gap-2 select-none ${canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`} onClick={() => canEdit && updateField("status", status.name)}>
                        <div className="w-5 h-5 border-2 border-black flex items-center justify-center rounded-sm transition-colors" style={{ backgroundColor: spkData.status === status.name ? '#000' : '#fff', color: spkData.status === status.name ? '#fff' : '#000' }}>
                            {spkData.status === status.name ? "✓" : ""}
                        </div>
                        <div className="text-sm">{status.name}</div>
                    </div>
                ))}
            </div>
        </div>
        <div className="mt-6 pt-4 border-t border-gray-300">
            {/* PERUBAHAN: Tombol simpan muncul jika bisa edit form atau bisa edit tanda tangan */}
            {(canEdit || canEditSignature) && (
                <Button onClick={handleUpdateSPK} className="bg-green-600 hover:bg-green-700 text-white shadow-md flex items-center" disabled={isUpdating}>
                    {isUpdating ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Menyimpan...</> : "💾 Simpan Perubahan SPK"}
                </Button>
            )}
        </div>
    </div>
);

// Cache untuk menyimpan data detail pengajuan
const pengajuanDetailCache = new Map<string, PengajuanDetail>();

const RequestDetailCollapse = ({ nomorSpk, showToast, spkData, jenisPekerjaanOptions, statusOptions, updateField, isUpdating, handleUpdateSPK, canEdit, modalImageUrl, setModalImageUrl, fotoPekerjaan, setFotoPekerjaan, handleFotoUpload, handleRemoveFoto, canEditSignature }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [detail, setDetail] = useState<PengajuanDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const toggle = () => setIsOpen(!isOpen);

    const fetchRequestDetail = useCallback(async () => {
        if (!nomorSpk) return;
        
        if (pengajuanDetailCache.has(nomorSpk)) {
            setDetail(pengajuanDetailCache.get(nomorSpk) || null);
            return;
        }
        
        setLoading(true); 
        setLoadError(null);
        const url = GET_API_PENGAJUAN_VIEW_PROXY.replace('{uuid}', nomorSpk);
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        try {
            if (!token) throw new Error("Otorisasi hilang. Mohon login ulang.");
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const result = await res.json();
            if (!res.ok || !result.success || !result.data) throw new Error(result.message || `Gagal memuat detail pengajuan.`);
            
            const data = result.data;
            const masterhal = result.masterhal;
            const kdParent = result.kd_parent; 
            
            const detailData = {
                uuid: data.uuid, 
                no_surat: data.no_surat, 
                nama_jenis: masterhal?.nama_jenis || data.hal || 'N/A', 
                hal_id: masterhal?.kode || data.hal_id || 'N/A', 
                kepada: data.kepada || 'N/A', 
                satker: kdParent?.parent_satker || data.satker || 'N/A', 
                name_pelapor: data.name_pelapor || data.name || 'N/A', 
                npp_pelapor: data.npp_pelapor || 'N/A', 
                tlp_pelapor: data.tlp_pelapor || 'N/A', 
                ttd_pelapor_path: data.ttd_pelapor, 
                mengetahui: data.mengetahui || 'N/A', 
                mengetahui_name: data.mengetahui_name || 'N/A', 
                ttd_mengetahui_path: data.ttd_mengetahui, 
                keterangan: data.keterangan || 'Tidak ada keterangan.', 
                file_paths: Array.isArray(data.file) ? data.file : (data.file ? [data.file] : []), 
                tanggal: data.tanggal || '-', 
                kode_barang: data.kode_barang || null,
            };

             const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
            if (token) {
                // Preload TTD images
                if (detailData.ttd_mengetahui_path) {
                    const ttdUrl = getProxyFileUrl(detailData.ttd_mengetahui_path);
                    if (ttdUrl) {
                        try {
                            await loadImageWithProxyRetry(ttdUrl, token);
                        } catch (error) {
                            console.error("Error preloading mengetahui TTD:", error);
                        }
                    }
                }
                
                if (detailData.ttd_pelapor_path) {
                    const ttdUrl = getProxyFileUrl(detailData.ttd_pelapor_path);
                    if (ttdUrl) {
                        try {
                            await loadImageWithProxyRetry(ttdUrl, token);
                        } catch (error) {
                            console.error("Error preloading pelapor TTD:", error);
                        }
                    }
                }
                
                if (detailData.file_paths && detailData.file_paths.length > 0) {
                    for (const path of detailData.file_paths) {
                        if (/\.(jpe?g|png|gif|webp)$/i.test(path)) {
                            const fileUrl = getProxyFileUrl(path);
                            if (fileUrl) {
                                try {
                                    await loadImageWithProxyRetry(fileUrl, token);
                                } catch (error) {
                                    console.error(`Error preloading attachment image: ${path}`, error);
                                }
                            }
                        }
                    }
                }
            }
            
            pengajuanDetailCache.set(nomorSpk, detailData);
            setDetail(detailData);
        } catch (err: any) { 
            setLoadError(err.message); 
            showToast(`Gagal memuat detail: ${err.message}`, "error"); 
        } finally { 
            setLoading(false); 
        }
    }, [nomorSpk, showToast]);

    useEffect(() => { 
        if (isOpen && !detail) {
            fetchRequestDetail();
        }
    }, [isOpen, detail, fetchRequestDetail]);

    return (
        <div className="border border-gray-300 rounded-lg shadow-sm mt-4 print:border-none print:shadow-none print:mt-0 print:pt-0">
            <button onClick={toggle} className="w-full text-left p-3 font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex justify-between items-center print:hidden">
                <span>{isOpen ? '🔽 Sembunyikan' : '➡️ Tampilkan'} Detail Pengajuan & Pengaturan Pekerjaan</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {isOpen && (
                <div className={`p-4 bg-white border-t border-gray-200 transition-all duration-300 print:block print:border-none print:p-0`}>
                    {loading && <div className="flex items-center text-blue-600"><Loader2 className="animate-spin mr-2 w-4 h-4" /> Memuat data...</div>}
                    {loadError && <div className="text-red-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Error: {loadError}</div>}
                    {detail && <PengajuanDetailView detail={detail} onImageClick={(url) => setModalImageUrl(url)} />}
                    <SPKSettingsForm 
                        spkData={spkData} 
                        jenisPekerjaanOptions={jenisPekerjaanOptions} 
                        statusOptions={statusOptions}
                        updateField={updateField} 
                        canEdit={canEdit} 
                        canEditSignature={canEditSignature}
                        isUpdating={isUpdating} 
                        handleUpdateSPK={handleUpdateSPK} 
                        fotoPekerjaan={fotoPekerjaan}
                        setFotoPekerjaan={setFotoPekerjaan}
                        handleFotoUpload={handleFotoUpload}
                        handleRemoveFoto={handleRemoveFoto}
                        onImageClick={(url) => setModalImageUrl(url)}
                    />
                </div>
            )}
        </div>
    );
};

// ====================================================================
// --- MAIN PAGE COMPONENT --------------------------------------------
// ====================================================================

export default function EditSPKPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const spk_uuid = useMemo(() => {
        return searchParams.get('edit') || searchParams.get('view') || searchParams.get('uuid');
    }, [searchParams]);

    const [spkData, setSpkData] = useState<SPKDetail | null>(null);
    const [assignedPeople, setAssignedPeople] = useState<AssignedPerson[]>([]);
    const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<any[]>([]);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });

    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null);
    const [canEdit, setCanEdit] = useState(false);
    const [canEditSignature, setCanEditSignature] = useState(false);
    const [currentUserNpp, setCurrentUserNpp] = useState<string | null>(null);

    // Gunakan useRef sebagai 'tanda' untuk memastikan data supervisor hanya diambil sekali.
    const hasFetchedSupervisors = useRef(false);

    // Supervisor Data (Read Only)
    const [supervisorMenyetujui, setSupervisorMenyetujui] = useState<SupervisorData | null>(null);
    const [supervisorMengetahui, setSupervisorMengetahui] = useState<SupervisorData | null>(null);
    const [isLoadingSupervisor, setIsLoadingSupervisor] = useState(true);

    // TTD Logic for Pelaksana (Upload/Crop)
    const [ttdFile, setTtdFile] = useState<File | null>(null);
    const [ttdPreview, setTtdPreview] = useState<string | null>(null);
    const [isTtdCropModalOpen, setIsTtdCropModalOpen] = useState(false);
    const [ttdImageForCrop, setTtdImageForCrop] = useState<string | null>(null);
    const ttdFileInputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef(null); // Ref for Draggable

    // TTD Logic for Menyetujui (Upload/Crop)
    const [ttdMenyetujuiFile, setTtdMenyetujuiFile] = useState<File | null>(null);
    const [ttdMenyetujuiPreview, setTtdMenyetujuiPreview] = useState<string | null>(null);
    const [isTtdMenyetujuiCropModalOpen, setIsTtdMenyetujuiCropModalOpen] = useState(false);
    const [ttdMenyetujuiImageForCrop, setTtdMenyetujuiImageForCrop] = useState<string | null>(null);
    const ttdMenyetujuiFileInputRef = useRef<HTMLInputElement>(null);
    const ttdMenyetujuiNodeRef = useRef(null);

    // TTD Logic for Mengetahui (Upload/Crop)
    const [ttdMengetahuiFile, setTtdMengetahuiFile] = useState<File | null>(null);
    const [ttdMengetahuiPreview, setTtdMengetahuiPreview] = useState<string | null>(null);
    const [isTtdMengetahuiCropModalOpen, setIsTtdMengetahuiCropModalOpen] = useState(false);
    const [ttdMengetahuiImageForCrop, setTtdMengetahuiImageForCrop] = useState<string | null>(null);
    const ttdMengetahuiFileInputRef = useRef<HTMLInputElement>(null);
    const ttdMengetahuiNodeRef = useRef(null);

    // State untuk foto pekerjaan
    const [fotoPekerjaan, setFotoPekerjaan] = useState<any[]>([
        { file: null, preview: null },
        { file: null, preview: null },
        { file: null, preview: null },
        { file: null, preview: null }
    ]);

    const docRef = useRef<HTMLDivElement>(null);

    const pic = useMemo(() => {
        return assignedPeople.find(p => p.isPic);
    }, [assignedPeople]);

    // --- Utility Functions ---
    const showToast = useCallback((message: string, type: "success" | "error" | "warning") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    const closeToast = useCallback(() => { setToast(prev => ({ ...prev, show: false })); }, []);

    const updateField = (key: keyof SPKDetail, value: any) => { 
        setSpkData(s => (s ? { ...s, [key]: value } : null));
    };

    const handlePrint = () => {
        if (!docRef.current) { showToast("Gagal mencetak: Konten dokumen tidak ditemukan.", "error"); return; }
        window.print();
    };

    // Fungsi untuk menangani upload foto
    const handleFotoUpload = (index: number, file?: File) => {
        if (!file) {
            // Jika tidak ada file, buka dialog file
            document.getElementById(`foto-${index}`)?.click();
            return;
        }

        // Validasi file
        if (!file.type.startsWith('image/')) {
            showToast('File harus berupa gambar', 'error');
            return;
        }

        // Batasi ukuran file (misalnya 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ukuran file terlalu besar, maksimal 5MB', 'error');
            return;
        }

        // Buat preview
        const reader = new FileReader();
        reader.onloadend = () => {
            const newFotoPekerjaan = [...fotoPekerjaan];
            newFotoPekerjaan[index] = {
                file: file,
                preview: reader.result as string
            };
            setFotoPekerjaan(newFotoPekerjaan);
        };
        reader.readAsDataURL(file);
    };

    // Fungsi untuk menghapus foto
    const handleRemoveFoto = (index: number) => {
        const newFotoPekerjaan = [...fotoPekerjaan];
        newFotoPekerjaan[index] = {
            file: null,
            preview: null
        };
        setFotoPekerjaan(newFotoPekerjaan);
    };

    // Fungsi untuk mengunggah foto ke file handler
    const uploadPhotosToHandler = async (photos: any[], token: string): Promise<string[]> => {
        if (!photos || photos.length === 0) return [];
        
        // Filter hanya foto yang memiliki file
        const validPhotos = photos.filter(photo => photo.file);
        
        if (validPhotos.length === 0) return [];
        
        const formData = new FormData();
        const timestamp = Date.now();
        const uploadPath = `work-order/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}/`;
        
        formData.append('path', uploadPath);
        formData.append('photo_count', validPhotos.length.toString());
        
        validPhotos.forEach((photo, index) => {
            const fileExt = photo.file.name.split('.').pop() || 'jpg';
            const fileName = `spk-${spkData?.nomor_spk}-${timestamp}-${index}.${fileExt}`;
            formData.append(`photo_${index + 1}`, photo.file, fileName);
            formData.append(`filename_${index + 1}`, fileName);
        });
        
        try {
            const response = await fetch(MULTIPLE_FILE_HANDLER_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });
            
            if (!response.ok) {
                throw new Error(`Gagal mengunggah foto: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (!result.data) {
                throw new Error('Respon dari file handler tidak valid');
            }
            
            // Ekstrak path dari respons
            const filePaths = Object.values(result.data)
                .map((item: any) => item.filepath)
                .filter((path: any) => path)
                .map((path: string) => path.replace(/\/\//g, '/'));
                
            return filePaths;
        } catch (error) {
            console.error('Error uploading photos:', error);
            throw error;
        }
    };

    // --- Fetch Data ---
    const fetchJenisPekerjaan = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return;
        try {
            const res = await fetch(GET_API_JENIS_PEKERJAAN, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error("Gagal mengambil data Jenis Pekerjaan.");
            const json = await res.json();
            const dataArray = json.data || json;
            if (Array.isArray(dataArray)) {
                setJenisPekerjaanOptions(dataArray.map((item: any) => ({ id: item.id, nama: item.nama })));
            }
        } catch (err) { console.error(err); setJenisPekerjaanOptions([]); }
    }, []);

    const [statusOptions, setStatusOptions] = useState<any[]>(STATUS_PEKERJAAN);

    const fetchStatusMaster = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return;
        try {
            const res = await fetch(SPK_STATUS_LOCAL, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            
            if (!res.ok) throw new Error("Gagal mengambil data Status.");
            
            const json = await res.json();
            const dataArray = json.data || json;
            
            if (Array.isArray(dataArray) && dataArray.length > 0) {
                const allowedCodes = ["SE", "BS", "TS"];

                const mappedStatus = dataArray
                    .filter((item: any) => allowedCodes.includes(item.code))
                    .map((item: any, index: number) => ({
                        id: item.id || item.code || index, 
                        name: item.nama || item.name, 
                        code: item.code || item.kode 
                    }));

                setStatusOptions(mappedStatus);
            }
        } catch (err) { 
            console.error("Error fetching status master:", err); 
        }
    }, []);

    const getStatusId = (statusName: string): string => {
    const status = statusOptions.find(option => option.name === statusName);
    return status ? status.code : "BS"; 
};

    const getTodayDateString = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const fetchDetailSPK = useCallback(async () => {
        if (!spk_uuid) { setError("UUID SPK tidak ditemukan dalam URL."); setIsLoading(false); return; }
        
        setIsLoading(true); 
        setError(null);
        
        const url = GET_API_SPK_VIEW_TEMPLATE_PROXY.replace('{uuid}', spk_uuid);
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        
        try {
            if (!token) throw new Error("Otorisasi hilang. Silakan login ulang.");
            
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(`Gagal memuat data SPK. Status: ${res.status}`);
            
            const result = await res.json();
            if (!result.success) throw new Error(result.message || "Gagal memuat data dari API.");
            
            const item = result.data;
            const personnel = item.personel || item.stafs || [];

            // --- PERBAIKAN 1: STATUS ---
            // Cek apakah status berupa object atau string
            let currentStatusName = "";
            let currentStatusId = item.status_id;

            if (item.status && typeof item.status === 'object') {
                currentStatusName = item.status.name; // Ambil "Proses" / "Selesai" dari object
                if (!currentStatusId) currentStatusId = item.status.id;
            } else {
                currentStatusName = item.status;
            }

            // Normalisasi nama status agar sesuai dengan opsi di UI (Belum Selesai, Selesai, Tidak Selesai)
            if (currentStatusName === "pending" || currentStatusName === "in_progress") currentStatusName = "Belum Selesai";
            if (currentStatusName === "completed") currentStatusName = "Selesai";
            if (currentStatusName === "incomplete") currentStatusName = "Tidak Selesai";

            // --- PERBAIKAN 2: FILE / FOTO PEKERJAAN ---
            // API mengembalikan "file", form butuh "foto_pekerjaan"
            // Kita gabungkan keduanya untuk jaga-jaga
            const rawPhotos = item.foto_pekerjaan || item.file || [];

            // --- PERUBAHAN 1: Gunakan data langsung dari API untuk mengetahui dan menyetujui ---
            // Buat objek supervisor dari data API
            const mengetahuiData = item.mengetahui_npp ? {
                name: item.mengetahui_name || '',
                npp: item.mengetahui_npp || '',
                jabatan: item.mengetahui || '',
                unit: item.mengetahui || '',
                tlp: item.mengetahui_tlp || ''
            } : null;

            const menyetujuiData = item.menyetujui_npp ? {
                name: item.menyetujui_name || '',
                npp: item.menyetujui_npp || '',
                jabatan: item.menyetujui || '',
                unit: item.menyetujui || '',
                tlp: item.menyetujui_tlp || ''
            } : null;

            const mappedData: SPKDetail = {
                uuid: item.uuid || spk_uuid,
                pengajuan_uuid: item.uuid_pengajuan || item.uuid || null,
                nomor_spk: item.no_surat || "N/A",
                pekerjaan_spk: item.uraian_pekerjaan || item.jenis_pekerjaan || "Tidak ada data",
                tanggal_spk: item.tanggal || "-",
                tanggal_selesai: item.tanggal_selesai || getTodayDateString(),
                id_barang: item.kode_barang || item.id_barang || null,
                jenis_pekerjaan: item.jenis_pekerjaan || null,
                jenis_pekerjaan_id: item.jenis_pekerjaan_id || null,
                status: currentStatusName,
                status_id: currentStatusId,
                
                personel_ditugaskan: personnel.map((p: any) => ({
                    name: p.nama, 
                    npp: p.npp, 
                    isPic: !!p.is_penanggung_jawab || (p.is_penanggung_jawab === 1), 
                    jabatan: p.jabatan || null,
                })),
                
                // Masukkan array foto
                foto_pekerjaan: rawPhotos,
                
                // Tambahkan path tanda tangan
                ttd_pelaksana_path: item.penanggung_jawab_ttd || null,
                ttd_menyetujui_path: item.menyetujui_ttd || null,
                ttd_mengetahui_path: item.mengetahui_ttd || null,
                
                // Tambahkan data mengetahui dan menyetujui dari API
                mengetahui_name: item.mengetahui_name || '',
                mengetahui_npp: item.mengetahui_npp || '',
                mengetahui_jabatan: item.mengetahui || '',
                menyetujui_name: item.menyetujui_name || '',
                menyetujui_npp: item.menyetujui_npp || '',
                menyetujui_jabatan: item.menyetujui || '',
            };

            setSpkData(mappedData);
            setAssignedPeople(mappedData.personel_ditugaskan);
            
            // Set supervisor data langsung dari API
            if (mengetahuiData) {
                setSupervisorMengetahui(mengetahuiData);
            }
            if (menyetujuiData) {
                setSupervisorMenyetujui(menyetujuiData);
            }
            
            // --- LOAD PREVIEW FOTO ---
            // Mengubah path string menjadi URL preview dengan token
            if (mappedData.foto_pekerjaan && mappedData.foto_pekerjaan.length > 0) {
                const photoPromises = mappedData.foto_pekerjaan.map(async (path, index) => {
                    if (index < 4) { // Limit 4 foto
                        try {
                            const imageUrl = getProxyFileUrl(path);
                            if (imageUrl && token) {
                                const previewUrl = await loadImageWithProxy(imageUrl, token);
                                return {
                                    file: null,
                                    preview: previewUrl,
                                    path: path
                                };
                            }
                        } catch (error) {
                            console.error(`Error loading photo ${index}:`, error);
                        }
                    }
                    return { file: null, preview: null };
                });
                
                const loadedPhotos = await Promise.all(photoPromises);
                
                while (loadedPhotos.length < 4) {
                    loadedPhotos.push({ file: null, preview: null });
                }
                
                setFotoPekerjaan(loadedPhotos);
            } else {
                setFotoPekerjaan([
                    { file: null, preview: null },
                    { file: null, preview: null },
                    { file: null, preview: null },
                    { file: null, preview: null }
                ]);
            }

            // --- LOAD PREVIEW TTD ---
            // Load tanda tangan Pelaksana
            if (mappedData.ttd_pelaksana_path && token) {
                try {
                    const ttdUrl = getProxyFileUrl(mappedData.ttd_pelaksana_path);
                    if (ttdUrl) {
                        const ttdPreviewUrl = await loadImageWithProxy(ttdUrl, token);
                        setTtdPreview(ttdPreviewUrl);
                    }
                } catch (error) {
                    console.error("Error loading pelaksana TTD:", error);
                }
            }

            // Load tanda tangan Menyetujui
            if (mappedData.ttd_menyetujui_path && token) {
                try {
                    const ttdUrl = getProxyFileUrl(mappedData.ttd_menyetujui_path);
                    if (ttdUrl) {
                        const ttdPreviewUrl = await loadImageWithProxy(ttdUrl, token);
                        setTtdMenyetujuiPreview(ttdPreviewUrl);
                    }
                } catch (error) {
                    console.error("Error loading menyetujui TTD:", error);
                }
            }

            // Load tanda tangan Mengetahui
            if (mappedData.ttd_mengetahui_path && token) {
                try {
                    const ttdUrl = getProxyFileUrl(mappedData.ttd_mengetahui_path);
                    if (ttdUrl) {
                        const ttdPreviewUrl = await loadImageWithProxy(ttdUrl, token);
                        setTtdMengetahuiPreview(ttdPreviewUrl);
                    }
                } catch (error) {
                    console.error("Error loading mengetahui TTD:", error);
                }
            }

        } catch (err: any) { 
            setError(err.message || "Terjadi kesalahan saat memuat SPK."); 
        } finally { 
            setIsLoading(false); 
        }
    }, [spk_uuid]);

    const fetchSupervisorData = useCallback(async (npp: string) => {
        if (!npp) return null;
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return null;
        try {
            const response = await fetch(`/api/proxy-supervisor?npp=${npp}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            if (!response.ok) throw new Error("Gagal mengambil data supervisor.");
            const data = await response.json();
            if (data.status === 200 && data.data) {
                return { name: data.data.name, npp: data.data.npp, jabatan: data.data.position, unit: data.data.orgunit, tlp: data.data.tlp };
            }
            return null;
        } catch (error: any) { console.error("Error fetching supervisor:", error); return null; }
    }, []);

    const fetchUserTtd = useCallback(async (npp: string) => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return;
        try {
            const res = await fetch(`${TTD_PROXY_PATH}/${npp}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.ttd_path) {
                    const blobUrl = await loadImageWithProxy(json.ttd_path, token);
                    setTtdPreview(blobUrl);
                }
            }
        } catch (e) { console.error("Error fetching user TTD:", e); }
    }, []);

    // --- Effects ---

    useEffect(() => {
        
        if (hasFetchedSupervisors.current) {
            return;
        }

        if (!spkData || !spkData.personel_ditugaskan || spkData.personel_ditugaskan.length === 0 || !currentUserNpp) {
        
            return;
        }

        const processSupervisorData = async () => {
            setIsLoadingSupervisor(true);
            const picPerson = spkData.personel_ditugaskan.find(person => person.isPic);

            if (picPerson && picPerson.npp) {
                if(picPerson.npp === currentUserNpp) {
                    await fetchUserTtd(picPerson.npp);
                }

                // Hanya fetch supervisor data jika belum ada dari API
                if (!supervisorMenyetujui && !supervisorMengetahui) {
                    const menyetujuiData = await fetchSupervisorData(picPerson.npp);
                    if (menyetujuiData) {
                        setSupervisorMenyetujui(menyetujuiData);
                        if (menyetujuiData.npp) {
                            const mengetahuiData = await fetchSupervisorData(menyetujuiData.npp);
                            if (mengetahuiData) setSupervisorMengetahui(mengetahuiData);
                        }
                    }
                }
            }

            setIsLoadingSupervisor(false);
            // 4. Setelah proses selesai (berhasil atau gagal), tandai bahwa proses sudah pernah dijalankan.
            hasFetchedSupervisors.current = true;
        };

        processSupervisorData();

        // Tambahkan 'spkData' kembali ke dependency array.
    }, [currentUserNpp, spkData, fetchSupervisorData, fetchUserTtd]);


    useEffect(() => {
        const userData = typeof window !== 'undefined' ? localStorage.getItem("user_data") : null;
        if (userData) {
            try {
                const user = JSON.parse(userData);
                setCurrentUserNpp(user.npp || user.NPP);
            } catch (e) { console.error("Failed to parse user_data", e); }
        }
    }, []);

    useEffect(() => {
        if (!spkData || !spkData.personel_ditugaskan || !currentUserNpp) { 
            setCanEdit(false); 
            setCanEditSignature(false);
            return; 
        }
        
        // Cek apakah user adalah PIC (Pelaksana)
        const isUserPic = spkData.personel_ditugaskan.some(person => person.npp === currentUserNpp && person.isPic);
        
        // Cek apakah user adalah Menyetujui
        const isUserMenyetujui = supervisorMenyetujui && supervisorMenyetujui.npp === currentUserNpp;
        
        // Cek apakah user adalah Mengetahui
        const isUserMengetahui = supervisorMengetahui && supervisorMengetahui.npp === currentUserNpp;
        
        // Cek urutan tanda tangan
        const pelaksanaSigned = !!spkData.ttd_pelaksana_path || !!ttdPreview;
        const menyetujuiSigned = !!spkData.ttd_menyetujui_path || !!ttdMenyetujuiPreview;
        
        // --- PERUBAHAN 2: Pisahkan logika edit form dan edit tanda tangan ---
        // Cek apakah status sudah final (selesai atau tidak selesai)
        const isStatusFinal = spkData.status === "Selesai" || spkData.status === "Tidak Selesai";
        
        // User bisa edit form jika:
        // 1. Status belum final (belum selesai atau tidak selesai)
        // 2. User adalah PIC (Pelaksana)
        // 3. User adalah Menyetujui dan Pelaksana sudah tanda tangan
        // 4. User adalah Mengetahui dan Pelaksana serta Menyetujui sudah tanda tangan
        const canEditFormData = 
            !isStatusFinal && (
                isUserPic || 
                (isUserMenyetujui && pelaksanaSigned) || 
                (isUserMengetahui && pelaksanaSigned && menyetujuiSigned)
            );
        
        // User bisa edit tanda tangan jika (tidak peduli status):
        // 1. User adalah PIC (Pelaksana)
        // 2. User adalah Menyetujui dan Pelaksana sudah tanda tangan
        // 3. User adalah Mengetahui dan Pelaksana serta Menyetujui sudah tanda tangan
        const canEditSignatureData = 
            isUserPic || 
            (isUserMenyetujui && pelaksanaSigned) || 
            (isUserMengetahui && pelaksanaSigned && menyetujuiSigned);
        
        setCanEdit(canEditFormData);
        setCanEditSignature(canEditSignatureData);
    }, [spkData, currentUserNpp, supervisorMenyetujui, supervisorMengetahui, ttdPreview, ttdMenyetujuiPreview]);

    useEffect(() => { 
        fetchDetailSPK(); 
        fetchJenisPekerjaan(); 
        fetchStatusMaster();
    }, [fetchDetailSPK, fetchJenisPekerjaan, fetchStatusMaster]);

    // --- Handlers for TTD Upload ---
    const handleTtdFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        setTtdImageForCrop(previewUrl);
        setIsTtdCropModalOpen(true);
        e.target.value = '';
    };

    const handleTtdCropComplete = async (croppedImage: string, settings?: any) => {
        setIsTtdCropModalOpen(false);
        setTtdImageForCrop(null);
        const processedDataUrl = await resizeAndMakeTransparent(croppedImage, settings, 600);
        const processedFile = await dataURLtoFile(processedDataUrl, `ttd-pic-${Date.now()}.png`);

        setTtdFile(processedFile);
        setTtdPreview(processedDataUrl);
    };

    // --- Handlers for TTD Menyetujui Upload ---
    const handleTtdMenyetujuiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        setTtdMenyetujuiImageForCrop(previewUrl);
        setIsTtdMenyetujuiCropModalOpen(true);
        e.target.value = '';
    };

    const handleTtdMenyetujuiCropComplete = async (croppedImage: string, settings?: any) => {
        setIsTtdMenyetujuiCropModalOpen(false);
        setTtdMenyetujuiImageForCrop(null);
        const processedDataUrl = await resizeAndMakeTransparent(croppedImage, settings, 600);
        const processedFile = await dataURLtoFile(processedDataUrl, `ttd-menyetujui-${Date.now()}.png`);

        setTtdMenyetujuiFile(processedFile);
        setTtdMenyetujuiPreview(processedDataUrl);
    };

    const handleTtdMengetahuiFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);
        setTtdMengetahuiImageForCrop(previewUrl);
        setIsTtdMengetahuiCropModalOpen(true);
        e.target.value = '';
    };

    const handleTtdMengetahuiCropComplete = async (croppedImage: string, settings?: any) => {
        setIsTtdMengetahuiCropModalOpen(false);
        setTtdMengetahuiImageForCrop(null);
        const processedDataUrl = await resizeAndMakeTransparent(croppedImage, settings, 600);
        const processedFile = await dataURLtoFile(processedDataUrl, `ttd-mengetahui-${Date.now()}.png`);

        setTtdMengetahuiFile(processedFile);
        setTtdMengetahuiPreview(processedDataUrl);
    };

    const filterPhoneNumbers = (phoneString: string | null): string[] => {
        if (!phoneString) return [];
        
        const phoneNumbers = phoneString.split(',').map(phone => phone.trim());
        
        return phoneNumbers.filter(phone => phone.startsWith('08'));
    };

    const handleUpdateSPK = async () => {
        if (!spkData) return;
        setIsUpdating(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

        try {
            // ============================================================
            // 1. LOGIKA FOTO PEKERJAAN (Pisahkan Baru & Lama)
            // ============================================================
            
            const newPhotosToUpload = fotoPekerjaan.filter(foto => foto.file instanceof File);
            
            const existingPhotoPaths = fotoPekerjaan
                .filter(foto => !foto.file && typeof foto.path === 'string' && foto.path.trim() !== '')
                .map(foto => foto.path);

            let uploadedNewPaths: string[] = [];

            if (newPhotosToUpload.length > 0) {
                try {
                    if (!token) throw new Error("Token tidak ditemukan");
                    
                    uploadedNewPaths = await uploadPhotosToHandler(newPhotosToUpload, token);
                } catch (error: any) {
                    showToast(`Gagal mengunggah foto pekerjaan: ${error.message}`, 'error');
                    setIsUpdating(false);
                    return; 
                }
            }

            const finalFilePaths = [...existingPhotoPaths, ...uploadedNewPaths];

            console.log("Foto Lama:", existingPhotoPaths);
            console.log("Foto Baru Uploaded:", uploadedNewPaths);
            console.log("Final Paths to Send:", finalFilePaths);

            // ============================================================
            // 2. LOGIKA TANDA TANGAN (Cek Baru vs Lama)
            // ============================================================
            let finalTtdPelaksanaPath = null;
            let finalTtdMenyetujuiPath = null;
            let finalTtdMengetahuiPath = null;

            // Proses TTD Pelaksana
            if (ttdFile) {
                try {
                    const ttdPayload = [{ file: ttdFile }];
                    const uploadedTtdPaths = await uploadPhotosToHandler(ttdPayload, token || '');
                    if (uploadedTtdPaths && uploadedTtdPaths.length > 0) {
                        finalTtdPelaksanaPath = uploadedTtdPaths[0]; 
                    }
                } catch (error: any) {
                    showToast(`Gagal mengunggah tanda tangan pelaksana: ${error.message}`, 'error');
                    setIsUpdating(false);
                    return;
                }
            } else {
                if (spkData.ttd_pelaksana_path) {
                    finalTtdPelaksanaPath = spkData.ttd_pelaksana_path;
                }
            }

            // Proses TTD Menyetujui
            if (ttdMenyetujuiFile) {
                try {
                    const ttdPayload = [{ file: ttdMenyetujuiFile }];
                    const uploadedTtdPaths = await uploadPhotosToHandler(ttdPayload, token || '');
                    if (uploadedTtdPaths && uploadedTtdPaths.length > 0) {
                        finalTtdMenyetujuiPath = uploadedTtdPaths[0]; 
                    }
                } catch (error: any) {
                    showToast(`Gagal mengunggah tanda tangan menyetujui: ${error.message}`, 'error');
                    setIsUpdating(false);
                    return;
                }
            } else {
                if (spkData.ttd_menyetujui_path) {
                    finalTtdMenyetujuiPath = spkData.ttd_menyetujui_path;
                }
            }

            if (ttdMengetahuiFile) {
                try {
                    const ttdPayload = [{ file: ttdMengetahuiFile }];
                    const uploadedTtdPaths = await uploadPhotosToHandler(ttdPayload, token || '');
                    if (uploadedTtdPaths && uploadedTtdPaths.length > 0) {
                        finalTtdMengetahuiPath = uploadedTtdPaths[0]; 
                    }
                } catch (error: any) {
                    showToast(`Gagal mengunggah tanda tangan mengetahui: ${error.message}`, 'error');
                    setIsUpdating(false);
                    return;
                }
            } else {
                if (spkData.ttd_mengetahui_path) {
                    finalTtdMengetahuiPath = spkData.ttd_mengetahui_path;
                }
            }

            // ============================================================
            // 3. PERSIAPAN DATA (URLSearchParams / x-www-form-urlencoded)
            // ============================================================
            
            const matchedStatus = statusOptions.find(opt => 
                opt.name === spkData.status || opt.code === spkData.status
            );
            const statusIdToSend = matchedStatus ? matchedStatus.id : spkData.status_id;

            const params = new URLSearchParams();

            // Hanya kirim data form jika status belum final
            const isStatusFinal = spkData.status === "Selesai" || spkData.status === "Tidak Selesai";
            
            if (!isStatusFinal) {
                if (statusIdToSend) {
                    params.append('status_id', statusIdToSend.toString());
                }

                if (spkData.jenis_pekerjaan_id) {
                    params.append('jenis_pekerjaan_id', spkData.jenis_pekerjaan_id.toString());
                }

                params.append('kode_barang', spkData.id_barang || '');
                params.append('uraian_pekerjaan', spkData.pekerjaan_spk || '');

                params.delete('file[]'); 
                
                if (finalFilePaths.length > 0) {
                    finalFilePaths.forEach((path) => {
                        params.append('file[]', path); 
                    });
                }
            }

            // Kirim data tanda tangan tidak peduli status
            if (finalTtdPelaksanaPath) {
                params.append('penanggung_jawab_ttd', finalTtdPelaksanaPath);
            }

            if (finalTtdMenyetujuiPath) {
                params.append('ttd', finalTtdMenyetujuiPath);
            }

            if (finalTtdMengetahuiPath) {
                params.append('ttd', finalTtdMengetahuiPath);
            }

            if (supervisorMenyetujui) {
                params.append('menyetujui', supervisorMenyetujui.unit || '');
                params.append('menyetujui_name', supervisorMenyetujui.name || '');
                params.append('menyetujui_npp', supervisorMenyetujui.npp || '');
                const phones = filterPhoneNumbers(supervisorMenyetujui.tlp || '');
                if (phones.length > 0) params.append('menyetujui_tlp', phones[0]);
            }

            if (supervisorMengetahui) {
                params.append('mengetahui', supervisorMengetahui.unit || '');
                params.append('mengetahui_name', supervisorMengetahui.name || '');
                params.append('mengetahui_npp', supervisorMengetahui.npp || '');
                const phones = filterPhoneNumbers(supervisorMengetahui.tlp || '');
                if (phones.length > 0) params.append('mengetahui_tlp', phones[0]);
            }

            // ============================================================
            // 4. KIRIM REQUEST (PUT)
            // ============================================================
            const url = UPDATE_SPK_API_LOCAL.replace('{uuid}', spkData.uuid);
            
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: params
            });
            
            const result = await res.json();
            
            if (!res.ok || !result.success) {
                throw new Error(result.message || "Gagal menyimpan update SPK");
            }

            showToast(`SPK ${spkData.nomor_spk} berhasil diperbarui!`, "success");
            
            fetchDetailSPK();

        } catch (err: any) { 
            console.error("SPK Update Client: Error:", err);
            showToast(`Gagal update SPK: ${err.message}`, "error"); 
        } finally { 
            setIsUpdating(false); 
        }
    };

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-cyan-600 mr-3" size={32} /><span className="text-xl font-medium text-gray-700">Memuat detail SPK...</span></div>;
    if (error || !spkData) return <div className="p-8 space-y-6 text-center bg-white min-h-screen border-t-4 border-red-500"><AlertTriangle className="inline-block text-red-500" size={48} /><h2 className="text-3xl font-extrabold text-red-600">Akses Ditolak / Error</h2><p className="text-gray-700 text-lg">{error}</p><button onClick={() => router.push("/dashboard/spk")} className="mt-4 px-4 py-2 bg-gray-200 rounded-xl mx-auto flex items-center"><ArrowLeft size={16} className="mr-2" /> Kembali</button></div>;

    const { nomor_spk, tanggal_spk } = spkData;
    const awalanJabatan = "Kepala";

    // Cek apakah user bisa upload ttd di kolom tertentu
    const isUserMenyetujui = supervisorMenyetujui && supervisorMenyetujui.npp === currentUserNpp;
    const isUserMengetahui = supervisorMengetahui && supervisorMengetahui.npp === currentUserNpp;
    const isUserPic = pic && pic.npp === currentUserNpp;
    
    // Cek urutan tanda tangan
    const pelaksanaSigned = !!spkData.ttd_pelaksana_path || !!ttdPreview;
    const menyetujuiSigned = !!spkData.ttd_menyetujui_path || !!ttdMenyetujuiPreview;
    
    // Tentukan apakah user bisa upload ttd di setiap kolom
    const canUploadPelaksana = isUserPic;
    const canUploadMenyetujui = isUserMenyetujui && pelaksanaSigned;
    const canUploadMengetahui = isUserMengetahui && pelaksanaSigned && menyetujuiSigned;

    return (
        <div className="p-6 min-h-screen bg-gray-100 font-sans">
            <ToastBox toast={toast} onClose={closeToast} />
            <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />

            <TtdCropModal
                isOpen={isTtdCropModalOpen}
                imageSrc={ttdImageForCrop}
                onCancel={() => {setIsTtdCropModalOpen(false); setTtdImageForCrop(null);}}
                onCropComplete={handleTtdCropComplete}
            />

            <TtdCropModal
                isOpen={isTtdMenyetujuiCropModalOpen}
                imageSrc={ttdMenyetujuiImageForCrop}
                onCancel={() => {setIsTtdMenyetujuiCropModalOpen(false); setTtdMenyetujuiImageForCrop(null);}}
                onCropComplete={handleTtdMenyetujuiCropComplete}
            />

            <TtdCropModal
                isOpen={isTtdMengetahuiCropModalOpen}
                imageSrc={ttdMengetahuiImageForCrop}
                onCancel={() => {setIsTtdMengetahuiCropModalOpen(false); setTtdMengetahuiImageForCrop(null);}}
                onCropComplete={handleTtdMengetahuiCropComplete}
            />

            {!canEdit && !canEditSignature && (
                <div className="max-w-4xl mx-auto mb-4 p-3 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded-lg text-center flex items-center justify-center">
                    <AlertTriangle className="mr-2" size={20} />
                    Anda berada dalam mode lihat saja. Hanya Penanggung Jawab (PIC), Menyetujui, atau Mengetahui yang dapat mengisi tanda tangan sesuai urutan.
                </div>
            )}

            <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-xl rounded-xl">
                <div className="flex items-center justify-between border-b px-6 py-3 bg-cyan-50 rounded-t-xl">
                    <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ArrowLeft size={20} className="cursor-pointer hover:text-blue-600 transition" onClick={() => router.push("/dashboard/spk")} />
                        Edit / Detail SPK: {nomor_spk}
                    </h1>
                    <Button onClick={handlePrint}>Cetak (A4)</Button>
                </div>

                <div ref={docRef} className="p-8 text-[14px] leading-relaxed font-serif">
                    <div className="border-2 border-black p-8 rounded-md bg-white shadow-lg">
                        <h2 className="text-center font-bold underline mb-1 text-lg text-black">SURAT PERINTAH KERJA</h2>
                        <p className="text-center text-sm mb-4 font-bold text-black">(NO: {nomor_spk})</p>
                        <p className="text-right text-xs mb-6 text-black">Tanggal SPK: {tanggal_spk}</p>

                        <div className="mt-2 text-black space-y-4">
                            <div className="flex items-start mt-2 border p-2 rounded-lg bg-gray-50">
                                <div className="w-[140px] pt-1 font-semibold text-gray-700">Menugaskan Sdr:</div>
                                <div className="flex-1 flex flex-wrap gap-2 min-h-[40px]">
                                    {assignedPeople.length > 0 ? assignedPeople.map((person) => <Chip key={person.name} person={person} />) : <span className="text-gray-500 italic p-1">Belum ada personel.</span>}
                                </div>
                            </div>
                            <p className="mt-4">Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan</p>

                            <RequestDetailCollapse
                                nomorSpk={spkData.pengajuan_uuid || nomor_spk}
                                showToast={showToast}
                                spkData={spkData}
                                jenisPekerjaanOptions={jenisPekerjaanOptions}
                                updateField={updateField}
                                isUpdating={isUpdating}
                                handleUpdateSPK={handleUpdateSPK}
                                canEdit={canEdit}
                                canEditSignature={canEditSignature}
                                modalImageUrl={modalImageUrl}
                                setModalImageUrl={setModalImageUrl}
                                fotoPekerjaan={fotoPekerjaan}
                                setFotoPekerjaan={setFotoPekerjaan}
                                handleFotoUpload={handleFotoUpload}
                                handleRemoveFoto={handleRemoveFoto}
                                statusOptions={statusOptions}
                            />

                            {/* --- AREA TANDA TANGAN --- */}
                            <div className="mt-12 flex justify-between text-xs sm:text-sm min-h-[200px]">

                                {/* ========================== */}
                                {/* KIRI: QR CODE & MENGETAHUI */}
                                {/* ========================== */}
                                <div className="w-1/2 text-center flex flex-col justify-end items-center">
                                    
                                    {/* 1. QR Code (Ditaruh Di Sini, Di Atas Mengetahui) */}
                                    <div className="mb-8 flex flex-col items-center justify-center">
                                        <div className="bg-white p-1 border border-gray-200 rounded">
                                            <QRCode
                                                size={70}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                value={typeof window !== 'undefined' ? `${window.location.origin}/tracking/${spkData.uuid}` : ''}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                        <div className="text-[9px] text-gray-500 mt-1 font-mono tracking-tighter">SCAN TRACKING</div>
                                    </div>

                                    {/* 2. Mengetahui */}
                                    <div className="w-full">
                                        <div className="pb-1">Mengetahui</div>
                                        <div className="font-semibold flex items-end justify-center min-h-[10px] px-4">
                                            {supervisorMengetahui && supervisorMengetahui.unit
                                                ? `${awalanJabatan} ${supervisorMengetahui.unit}`
                                                : "Ka. Bid Pengembangan Program"
                                            }
                                        </div>
                                        <div style={{ height: 80 }}></div>
                                        {isLoadingSupervisor ? (
                                            <div className="flex justify-center items-center h-8"><Loader2 className="animate-spin mr-2" size={16} /> Memuat...</div>
                                        ) : (
                                            <>
                                                {/* Container Tanda Tangan Mengetahui */}
                                                <div className="flex justify-center items-center h-[80px] w-[150px] relative mb-1 mx-auto">
                                                    {ttdMengetahuiPreview ? (
                                                        <div className="relative group w-full h-full flex justify-center items-center">
                                                            <Draggable bounds="parent" nodeRef={ttdMengetahuiNodeRef}>
                                                                <div ref={ttdMengetahuiNodeRef} className="cursor-move p-1 border border-transparent hover:border-gray-300 rounded">
                                                                    <img src={ttdMengetahuiPreview} alt="TTD Mengetahui" className="h-[80px] w-auto object-contain" />
                                                                </div>
                                                            </Draggable>
                                                            
                                                            {/* Tombol edit TTD */}
                                                            {canUploadMengetahui && (
                                                                <button
                                                                    onClick={() => ttdMengetahuiFileInputRef.current?.click()}
                                                                    className="absolute top-0 right-0 bg-white shadow rounded-full p-1 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition print:hidden"
                                                                    title="Ganti TTD"
                                                                >
                                                                    <Upload size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        canUploadMengetahui ? (
                                                            <div
                                                                onClick={() => ttdMengetahuiFileInputRef.current?.click()}
                                                                className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition print:hidden"
                                                            >
                                                                <Upload size={20} className="text-gray-400 mb-1" />
                                                                <span className="text-[8px] text-gray-500 font-medium">Upload TTD</span>
                                                            </div>
                                                        ) : (
                                                            <div className="h-[80px]"></div>
                                                        )
                                                    )}
                                                    <input type="file" ref={ttdMengetahuiFileInputRef} className="hidden" accept="image/*" onChange={handleTtdMengetahuiFileUpload} />
                                                </div>
                                                
                                                {supervisorMengetahui ? (
                                                    <>
                                                        <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-2 mx-auto">
                                                            {supervisorMengetahui.name}
                                                        </div>
                                                        <div className="text-xs">NPP. {supervisorMengetahui.npp}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="border-b border-black w-40 mx-auto mt-8"></div>
                                                        <div className="text-xs mt-1">NPP. ........................</div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* ========================== */}
                                {/* KANAN: PELAKSANA & MENYETUJUI */}
                                {/* ========================== */}
                                <div className="w-1/2 flex flex-col justify-between">
                                    
                                    {/* 1. Pelaksana Section */}
                                    <div className="text-center">
                                        <div className="font-semibold mb-2">Pelaksana</div>
                                        
                                        {/* Container Tanda Tangan */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex justify-center items-center h-[80px] w-[150px] relative mb-1">
                                                {ttdPreview ? (
                                                    <div className="relative group w-full h-full flex justify-center items-center">
                                                        <Draggable bounds="parent" nodeRef={nodeRef}>
                                                            <div ref={nodeRef} className="cursor-move p-1 border border-transparent hover:border-gray-300 rounded">
                                                                <img src={ttdPreview} alt="TTD Pelaksana" className="h-[80px] w-auto object-contain" />
                                                            </div>
                                                        </Draggable>
                                                        
                                                        {/* Tombol edit TTD */}
                                                        {canUploadPelaksana && (
                                                            <button
                                                                onClick={() => ttdFileInputRef.current?.click()}
                                                                className="absolute top-0 right-0 bg-white shadow rounded-full p-1 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition print:hidden"
                                                                title="Ganti TTD"
                                                            >
                                                                <Upload size={14}/>
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    canUploadPelaksana ? (
                                                        <div
                                                            onClick={() => ttdFileInputRef.current?.click()}
                                                            className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition print:hidden"
                                                        >
                                                            <Upload size={20} className="text-gray-400 mb-1" />
                                                            <span className="text-[8px] text-gray-500 font-medium">Upload TTD</span>
                                                        </div>
                                                    ) : (
                                                        <div className="h-[80px]"></div>
                                                    )
                                                )}
                                                <input type="file" ref={ttdFileInputRef} className="hidden" accept="image/*" onChange={handleTtdFileUpload} />
                                            </div>

                                            {/* Nama Pelaksana */}
                                            {pic ? (
                                                <>
                                                    <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-1 mx-auto text-xs whitespace-nowrap">
                                                        {pic.name}
                                                    </div>
                                                    <div className="text-[10px]">
                                                        {pic.npp ? `NPP. ${pic.npp}` : 'NPP. -'}
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="border-b border-black w-32 mx-auto"></div>
                                                    <div className="text-[10px] mt-1">NPP. ........................</div>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* 2. Menyetujui Section */}
                                    <div className="mt-8 text-center">
                                        <div className="pb-1">Menyetujui</div>
                                        <div className="font-semibold flex items-end justify-center min-h-[10px] px-4">
                                            {supervisorMenyetujui && supervisorMenyetujui.unit
                                                ? `${awalanJabatan} ${supervisorMenyetujui.unit}`
                                                : "Ka. Sub Bid TI"
                                            }
                                        </div>
                                        <div style={{ height: 60 }}></div>
                                        {isLoadingSupervisor ? (
                                            <div className="flex justify-center items-center h-8"><Loader2 className="animate-spin mr-2" size={16} /> Memuat...</div>
                                        ) : (
                                            <>
                                                {/* Container Tanda Tangan Menyetujui */}
                                                <div className="flex justify-center items-center h-[80px] w-[150px] relative mb-1 mx-auto">
                                                    {ttdMenyetujuiPreview ? (
                                                        <div className="relative group w-full h-full flex justify-center items-center">
                                                            <Draggable bounds="parent" nodeRef={ttdMenyetujuiNodeRef}>
                                                                <div ref={ttdMenyetujuiNodeRef} className="cursor-move p-1 border border-transparent hover:border-gray-300 rounded">
                                                                    <img src={ttdMenyetujuiPreview} alt="TTD Menyetujui" className="h-[80px] w-auto object-contain" />
                                                                </div>
                                                            </Draggable>
                                                            
                                                            {/* Tombol edit TTD */}
                                                            {canUploadMenyetujui && (
                                                                <button
                                                                    onClick={() => ttdMenyetujuiFileInputRef.current?.click()}
                                                                    className="absolute top-0 right-0 bg-white shadow rounded-full p-1 text-blue-600 hover:text-blue-800 opacity-0 group-hover:opacity-100 transition print:hidden"
                                                                    title="Ganti TTD"
                                                                >
                                                                    <Upload size={14}/>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        canUploadMenyetujui ? (
                                                            <div
                                                                onClick={() => ttdMenyetujuiFileInputRef.current?.click()}
                                                                className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition print:hidden"
                                                            >
                                                                <Upload size={20} className="text-gray-400 mb-1" />
                                                                <span className="text-[8px] text-gray-500 font-medium">Upload TTD</span>
                                                            </div>
                                                        ) : (
                                                            <div className="h-[80px]"></div>
                                                        )
                                                    )}
                                                    <input type="file" ref={ttdMenyetujuiFileInputRef} className="hidden" accept="image/*" onChange={handleTtdMenyetujuiFileUpload} />
                                                </div>
                                                
                                                {supervisorMenyetujui ? (
                                                    <>
                                                        <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-2 mx-auto">
                                                            {supervisorMenyetujui.name}
                                                        </div>
                                                        <div className="text-xs">NPP. {supervisorMenyetujui.npp}</div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <div className="border-b border-black w-40 mx-auto mt-8"></div>
                                                        <div className="text-xs mt-1">NPP. ........................</div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>

                            </div>
                            {/* --- AKHIR AREA TANDA TANGAN --- */}

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}