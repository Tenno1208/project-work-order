"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Calendar, X, CheckCircle, Loader2, AlertTriangle, Users, ArrowLeft, ChevronDown, ChevronUp, File as FileIcon, Download, Crop, Settings, Upload, Image as ImageIcon, Printer, QrCode } from 'lucide-react';
import Cropper, { Point, Area } from 'react-easy-crop';
import Draggable from "react-draggable";
import QRCode from "react-qr-code";

// ====================================================================
// --- TYPES & CONSTANTS ----------------------------------------------
// ====================================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw-dev/workorder-pti/api";
const API_BASE_URL_PORTAL_PEGAWAI = process.env.NEXT_PUBLIC_API_BASE_URL_PORTAL_PEGAWAI || "https://gateway.pdamkotasmg.co.id/api-gw-dev/portal-pegawai/api";
const IMAGE_STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw-dev/file-handler/foto/?path=";

const GET_SPK_VIEW_URL = (uuid: string) => `${API_BASE_URL}/spk/view/${uuid}`;
const GET_PENGAJUAN_VIEW_URL = (uuid: string) => `${API_BASE_URL}/pengajuan/view/${uuid}`;
const GET_JENIS_PEKERJAAN_URL = `${API_BASE_URL}/master-jenis-pekerjaan`;
const GET_STATUS_MASTER_URL = `${API_BASE_URL}/master/status/spk`;
const UPDATE_SPK_URL = (uuid: string) => `${API_BASE_URL}/spk/${uuid}/update`;
const SUPERVISOR_URL = `${API_BASE_URL_PORTAL_PEGAWAI}/auth/my-supervisor`;
const USER_TTD_URL = (npp: string) => `${API_BASE_URL}/user/ttd/${npp}`;
const FILE_HANDLER_MULTIPLE_URL = "https://gateway.pdamkotasmg.co.id/api-gw-dev/file-handler/api/upload/multiple/foto";

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

// --- HELPER FORMAT TANGGAL ---
const formatLongDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString; 
        return new Intl.DateTimeFormat('id-ID', { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
        }).format(date);
    } catch (e) {
        return dateString;
    }
};

// ====================================================================
// --- UTILITY FUNCTIONS (IMAGE PROCESSING & DIRECT URL) -------------------
// ====================================================================

const getProxyFileUrl = (path: string | null | undefined): string | null => {
    if (!path || path.trim() === '') return null;
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${IMAGE_STORAGE_BASE_URL}${cleanPath}`;
};

// Fetch image directly for Blob URL (Same as View Page)
async function fetchImageDirectly(pathOrUrl: string, token: string | null): Promise<string> {
    if (!pathOrUrl || pathOrUrl.trim() === '') return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    if (pathOrUrl.startsWith('data:')) return pathOrUrl; 

    try {
        let finalUrl = pathOrUrl;
        if (!pathOrUrl.startsWith('http')) {
            const sanitizedPath = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl;
            finalUrl = `${IMAGE_STORAGE_BASE_URL}${encodeURIComponent(sanitizedPath)}`;
        }

        const res = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            }
        });

        if (!res.ok) throw new Error("Gagal load gambar");

        const blob = await res.blob();
        return URL.createObjectURL(blob); 
    } catch (e) {
        console.error("Error fetching image direct:", e);
        return 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    }
}

// Proses Transparansi Gambar (Sama seperti View & Crop)
async function processImageTransparency(dataUrl: string, settings?: { whiteThreshold?: number, blackThreshold?: number, useAdvanced?: boolean }, targetWidth: number = 600): Promise<string> {
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

                let hasInk = false;
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

                if (useAdvanced) {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i]; const g = data[i + 1]; const b = data[i + 2];
                        const brightness = (r + g + b) / 3;
                        const colorVariance = Math.max(r, g, b) - Math.min(r, g, b);
                        let isTransparent = false;
                        if (brightness > whiteThreshold || brightness < blackThreshold) { data[i + 3] = 0; isTransparent = true; }
                        else if (colorVariance < 15 && brightness > 100 && brightness < 200) { data[i + 3] = 0; isTransparent = true; }
                        else if (brightness > 220) { data[i + 3] = Math.max(0, 255 - (brightness - 220) * 10); if (data[i + 3] === 0) isTransparent = true; }
                        
                        if (!isTransparent && data[i + 3] > 0) {
                            hasInk = true;
                            const x = (i / 4) % canvas.width;
                            const y = Math.floor((i / 4) / canvas.width);
                            if (x < minX) minX = x; if (x > maxX) maxX = x;
                            if (y < minY) minY = y; if (y > maxY) maxY = y;
                        }
                    }
                } else {
                   for (let i = 0; i < data.length; i += 4) {
                       const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3;
                       if (brightness > whiteThreshold) data[i + 3] = 0;
                       else hasInk = true; 
                   }
                }

                ctx.putImageData(imageData, 0, 0);

                if (hasInk && useAdvanced) {
                    const padding = 10;
                    minX = Math.max(0, minX - padding); minY = Math.max(0, minY - padding);
                    maxX = Math.min(canvas.width, maxX + padding); maxY = Math.min(canvas.height, maxY + padding);
                    const cw = maxX - minX, ch = maxY - minY;
                    const cCanvas = document.createElement("canvas");
                    cCanvas.width = cw; cCanvas.height = ch;
                    cCanvas.getContext("2d")!.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
                    resolve(cCanvas.toDataURL("image/png"));
                } else {
                    resolve(canvas.toDataURL("image/png"));
                }
            };
            img.onerror = () => resolve(dataUrl);
        } catch (error) { resolve(dataUrl); }
    });
}

// Wrapper untuk TTD (Pengajuan)
async function fetchAndMakeTransparent(pathUrl: string, token: string | null): Promise<string> {
    const blobUrl = await fetchImageDirectly(pathUrl, token);
    return processImageTransparency(blobUrl);
}

// Hapus Cache Load karena kita akan memakai Native Browser Loading untuk performa instan
// const imageLoadCache = new Map<string, Promise<string>>();

// Fungsi ini hanya dipakai saat UPLOAD/CROP (memerlukan base64), bukan saat VIEW
async function dataURLtoFile(dataUrl: string, filename: string): Promise<File> {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return new File([blob], filename, { type: 'image/png' });
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
                <div className="px-5 py-4 border-b flex justify-between items-center bg-white">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Crop size={20} className="text-blue-600"/> 
                        Crop Tanda Tangan
                    </h3>
                    <button onClick={() => setShowSettings(!showSettings)} className="text-xs font-medium bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full flex gap-1 items-center transition-colors">
                        <Settings size={14}/> {showSettings ? 'Tutup Pengaturan' : 'Pengaturan'}
                    </button>
                </div>

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

                <div className="px-6 py-5 bg-white space-y-4">
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-400 w-16">Zoom:</span>
                        <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700" />
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-semibold text-gray-400 w-16">Rotasi:</span>
                        <input type="range" value={rotation} min={0} max={360} step={1} onChange={(e) => setRotation(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:accent-blue-700" />
                    </div>
                </div>

                <div className="px-5 py-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button onClick={onCancel} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                    <button onClick={handleApply} className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">Terapkan</button>
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

            <div className="grid grid-cols-2 gap-4 pt-4 print:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-3 print:p-1 print:border-dashed">
                    <div className="text-black text-xs mb-2">Tanda Tangan Mengetahui:</div>
                    <div className="text-center min-h-[120px] flex flex-col justify-end items-center">
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
                                            foto.path ? (
                                                <img src={getProxyFileUrl(foto.path)!} alt={`Foto ${index + 1}`} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100">
                                                    <Upload size={20} className="text-gray-400 mb-1" />
                                                    <span className="text-xs text-gray-500">Upload Foto</span>
                                                </div>
                                            )
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
                                {foto.path ? (
                                    <>
                                        <img src={getProxyFileUrl(foto.path)!} alt={`Foto ${index + 1}`} className="w-full h-full object-cover cursor-pointer" onClick={() => onImageClick(getProxyFileUrl(foto.path)!)} />
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onImageClick(getProxyFileUrl(foto.path)!);
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
            {(canEdit || canEditSignature) && (
                <Button onClick={handleUpdateSPK} className="bg-green-600 hover:bg-green-700 text-white shadow-md flex items-center" disabled={isUpdating}>
                    {isUpdating ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> Menyimpan...</> : "💾 Simpan Perubahan SPK"}
                </Button>
            )}
        </div>
    </div>
);

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

        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        const url = GET_PENGAJUAN_VIEW_URL(nomorSpk);

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
            
            // OPTIMASI: JANGAN PRELOAD GAMBAR DISINI
            
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

function EditSPKContent() {
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

    const hasFetchedSupervisors = useRef(false);

    const [supervisorMenyetujui, setSupervisorMenyetujui] = useState<SupervisorData | null>(null);
    const [supervisorMengetahui, setSupervisorMengetahui] = useState<SupervisorData | null>(null);
    const [isLoadingSupervisor, setIsLoadingSupervisor] = useState(true);

    const [ttdFile, setTtdFile] = useState<File | null>(null);
    const [ttdPreview, setTtdPreview] = useState<string | null>(null);
    const [isTtdCropModalOpen, setIsTtdCropModalOpen] = useState(false);
    const [ttdImageForCrop, setTtdImageForCrop] = useState<string | null>(null);
    const ttdFileInputRef = useRef<HTMLInputElement>(null);
    const nodeRef = useRef(null);

    const [ttdMenyetujuiFile, setTtdMenyetujuiFile] = useState<File | null>(null);
    const [ttdMenyetujuiPreview, setTtdMenyetujuiPreview] = useState<string | null>(null);
    const [isTtdMenyetujuiCropModalOpen, setIsTtdMenyetujuiCropModalOpen] = useState(false);
    const [ttdMenyetujuiImageForCrop, setTtdMenyetujuiImageForCrop] = useState<string | null>(null);
    const ttdMenyetujuiFileInputRef = useRef<HTMLInputElement>(null);
    const ttdMenyetujuiNodeRef = useRef(null);

    const [ttdMengetahuiFile, setTtdMengetahuiFile] = useState<File | null>(null);
    const [ttdMengetahuiPreview, setTtdMengetahuiPreview] = useState<string | null>(null);
    const [isTtdMengetahuiCropModalOpen, setIsTtdMengetahuiCropModalOpen] = useState(false);
    const [ttdMengetahuiImageForCrop, setTtdMengetahuiImageForCrop] = useState<string | null>(null);
    const ttdMengetahuiFileInputRef = useRef<HTMLInputElement>(null);
    const ttdMengetahuiNodeRef = useRef(null);

    const [fotoPekerjaan, setFotoPekerjaan] = useState<any[]>([
        { file: null, preview: null, path: null },
        { file: null, preview: null, path: null },
        { file: null, preview: null, path: null },
        { file: null, preview: null, path: null }
    ]);

    // STATE UNTUK PRINT (Khusus Agar Layout Sama Dengan View)
    const [pengajuanDetail, setPengajuanDetail] = useState<PengajuanDetail | null>(null);
    const [fotoPengajuan, setFotoPengajuan] = useState<any[]>([]);
    const [ttdPelaporPengajuan, setTtdPelaporPengajuan] = useState<string | null>(null);
    const [ttdMengetahuiPengajuan, setTtdMengetahuiPengajuan] = useState<string | null>(null);
    const docRef = useRef<HTMLDivElement>(null);

    const pic = useMemo(() => {
        return assignedPeople.find(p => p.isPic);
    }, [assignedPeople]);

    const showToast = useCallback((message: string, type: "success" | "error" | "warning") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    const closeToast = useCallback(() => { setToast(prev => ({ ...prev, show: false })); }, []);

    const updateField = (key: keyof SPKDetail, value: any) => { 
        setSpkData(s => (s ? { ...s, [key]: value } : null));
    };

    const handlePrint = () => {
        // Logic cetak mirip view: pastikan data pengajuan ada
        if (!pengajuanDetail && spkData?.pengajuan_uuid) {
            showToast("Memuat detail pengajuan untuk cetak...", "warning");
            return; 
        }
        window.print();
    };

    // Helper italic sama seperti View Page
    const renderKeteranganWithItalic = (text: string) => {
        if (!text) return "Tidak ada keterangan.";
        const parts = text.split(/(<i>|<\/i>)/);
        let isItalic = false;

        return parts.map((part, index) => {
            if (part === "<i>") {
                isItalic = true;
                return null;
            } else if (part === "</i>") {
                isItalic = false;
                return null;
            }
            return isItalic ? <i key={index}>{part}</i> : <span key={index}>{part}</span>;
        });
    };

    const handleFotoUpload = (index: number, file?: File) => {
        if (!file) {
            document.getElementById(`foto-${index}`)?.click();
            return;
        }

        if (!file.type.startsWith('image/')) {
            showToast('File harus berupa gambar', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Ukuran file terlalu besar, maksimal 5MB', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const newFotoPekerjaan = [...fotoPekerjaan];
            newFotoPekerjaan[index] = {
                file: file,
                preview: reader.result as string,
                path: null 
            };
            setFotoPekerjaan(newFotoPekerjaan);
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveFoto = (index: number) => {
        const newFotoPekerjaan = [...fotoPekerjaan];
        newFotoPekerjaan[index] = {
            file: null,
            preview: null,
            path: null
        };
        setFotoPekerjaan(newFotoPekerjaan);
    };

    const uploadPhotosToHandler = async (photos: any[], token: string): Promise<string[]> => {
        if (!photos || photos.length === 0) return [];
        
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
            const response = await fetch(FILE_HANDLER_MULTIPLE_URL, {
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

    const fetchJenisPekerjaan = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return;
        try {
            const res = await fetch(GET_JENIS_PEKERJAAN_URL, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error("Gagal mengambil data Jenis Pekerjaan.");
            const json = await res.json();
            const dataArray = json.data || json;
            if (Array.isArray(dataArray)) {
                setJenisPekerjaanOptions(dataArray.map((item: any) => ({ id: item.id, nama: item.nama || item.nama_pekerjaan })));
            }
        } catch (err) { console.error(err); setJenisPekerjaanOptions([]); }
    }, []);

    const [statusOptions, setStatusOptions] = useState<any[]>(STATUS_PEKERJAAN);

    const fetchStatusMaster = useCallback(async () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return;
        try {
            const res = await fetch(GET_STATUS_MASTER_URL, { 
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

    const fetchPengajuanForPrint = useCallback(async (uuid: string) => {
        if (pengajuanDetailCache.has(uuid)) {
            const cachedData = pengajuanDetailCache.get(uuid)!;
            setPengajuanDetail(cachedData);
            if (!ttdPelaporPengajuan && cachedData.ttd_pelapor_path) fetchAndMakeTransparent(cachedData.ttd_pelapor_path, token).then(setTtdPelaporPengajuan);
            if (!ttdMengetahuiPengajuan && cachedData.ttd_mengetahui_path) fetchAndMakeTransparent(cachedData.ttd_mengetahui_path, token).then(setTtdMengetahuiPengajuan);
            return;
        }

        const token = localStorage.getItem('token');
        if(!token) return;

        try {
            const url = `${API_BASE_URL}/pengajuan/view/${uuid}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const result = await res.json();
            if (res.ok && result.success && result.data) {
                const data = result.data;
                const masterhal = result.masterhal;
                
                const kepadaSatker = result.kd_satker?.satker_name || data.kepada || 'N/A';
                const parentSatker = result.kd_parent?.parent_satker || data.satker || 'N/A';

                const pData: PengajuanDetail = {
                    uuid: data.uuid, 
                    no_surat: data.no_surat, 
                    nama_jenis: masterhal?.nama_jenis || data.hal || 'N/A', 
                    hal_id: masterhal?.kode || data.hal_id || 'N/A', 
                    kepada: kepadaSatker, 
                    satker: parentSatker,
                    name_pelapor: data.name_pelapor || data.name || 'N/A', 
                    npp_pelapor: data.npp_pelapor || 'N/A', 
                    tlp_pelapor: data.tlp_pelapor || 'N/A', 
                    ttd_pelapor_path: data.ttd_pelapor, 
                    mengetahui: data.mengetahui || 'N/A', 
                    mengetahui_name: data.mengetahui_name || 'N/A', 
                    mengetahui_npp: data.mengetahui_npp || null, 
                    ttd_mengetahui_path: data.ttd_mengetahui, 
                    keterangan: data.keterangan || 'Tidak ada keterangan.', 
                    file_paths: Array.isArray(data.file) ? data.file : (data.file ? [data.file] : []), 
                    tanggal: data.tanggal || '-', 
                    kode_barang: data.kode_barang || null,
                };
                
                // SIMPAN KE CACHE AGAR ACCORDION TIDAK LOADING LAGI
                pengajuanDetailCache.set(uuid, pData);

                setPengajuanDetail(pData);

                if (pData.file_paths.length > 0) {
                    const photoPromises = pData.file_paths.slice(0, 4).map(async (path) => {
                        try {
                            const previewUrl = await fetchImageDirectly(path, token);
                            return { preview: previewUrl, path: path };
                        } catch (e) { return { preview: null, path: path }; }
                    });
                    const loadedPhotos = await Promise.all(photoPromises);
                    setFotoPengajuan(loadedPhotos);
                }

                if (pData.ttd_pelapor_path) fetchAndMakeTransparent(pData.ttd_pelapor_path, token).then(setTtdPelaporPengajuan);
                if (pData.ttd_mengetahui_path) fetchAndMakeTransparent(pData.ttd_mengetahui_path, token).then(setTtdMengetahuiPengajuan);
            }
        } catch (e) {
            console.error("Gagal load pengajuan untuk print:", e);
        }
    }, []);

    const fetchDetailSPK = useCallback(async () => {
        if (!spk_uuid) { setError("UUID SPK tidak ditemukan dalam URL."); setIsLoading(false); return; }
        
        setIsLoading(true); 
        setError(null);
        
        const url = GET_SPK_VIEW_URL(spk_uuid);
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        
        try {
            if (!token) throw new Error("Otorisasi hilang. Silakan login ulang.");
            
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) throw new Error(`Gagal memuat data SPK. Status: ${res.status}`);
            
            const result = await res.json();
            if (!result.success) throw new Error(result.message || "Gagal memuat data dari API.");
            
            const item = result.data;
            const personnel = item.personel || item.stafs || [];

            let currentStatusName = "";
            let currentStatusId = item.status_id;

            if (item.status && typeof item.status === 'object') {
                currentStatusName = item.status.name; 
                if (!currentStatusId) currentStatusId = item.status.id;
            } else {
                currentStatusName = item.status;
            }

            if (currentStatusName === "pending" || currentStatusName === "in_progress") currentStatusName = "Belum Selesai";
            if (currentStatusName === "completed") currentStatusName = "Selesai";
            if (currentStatusName === "incomplete") currentStatusName = "Tidak Selesai";

            const rawPhotos = item.foto_pekerjaan || item.file || [];

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
                jenis_pekerjaan: item.jenis_pekerjaan || null, // Bisa string di format ini
                jenis_pekerjaan_id: item.jenis_pekerjaan_id || null,
                status: currentStatusName,
                status_id: currentStatusId,
                
                personel_ditugaskan: personnel.map((p: any) => ({
                    name: p.nama, 
                    npp: p.npp, 
                    isPic: !!p.is_penanggung_jawab || (p.is_penanggung_jawab === 1), 
                    jabatan: p.jabatan || null,
                })),
                
                foto_pekerjaan: rawPhotos,
                
                ttd_pelaksana_path: item.penanggung_jawab_ttd || null,
                ttd_menyetujui_path: item.menyetujui_ttd || null,
                ttd_mengetahui_path: item.mengetahui_ttd || null,
                
                mengetahui_name: item.mengetahui_name || '',
                mengetahui_npp: item.mengetahui_npp || '',
                mengetahui_jabatan: item.mengetahui || '',
                menyetujui_name: item.menyetujui_name || '',
                menyetujui_npp: item.menyetujui_npp || '',
                menyetujui_jabatan: item.menyetujui || '',
            };

            setSpkData(mappedData);
            setAssignedPeople(mappedData.personel_ditugaskan);
            
            if (mengetahuiData) {
                setSupervisorMengetahui(mengetahuiData);
            }
            if (menyetujuiData) {
                setSupervisorMenyetujui(menyetujuiData);
            }

            // Set Foto Pekerjaan (Hanya path)
            const photosInit = mappedData.foto_pekerjaan.slice(0, 4).map((path) => ({
                file: null,
                preview: null,
                path: path
            }));
            while(photosInit.length < 4) {
                photosInit.push({ file: null, preview: null, path: null });
            }
            setFotoPekerjaan(photosInit);

            // FETCH PENGAJUAN KHUSUS PRINT
            if (item.uuid_pengajuan) {
                fetchPengajuanForPrint(item.uuid_pengajuan);
            }
            
        } catch (err: any) { 
            setError(err.message || "Terjadi kesalahan saat memuat SPK."); 
        } finally { 
            setIsLoading(false); 
        }
    }, [spk_uuid, fetchPengajuanForPrint]);

    const fetchSupervisorData = useCallback(async (npp: string) => {
        if (!npp) return null;
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        if (!token) return null;
        try {
            const response = await fetch(`${SUPERVISOR_URL}?npp=${npp}`, {
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
            const res = await fetch(USER_TTD_URL(npp), {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const json = await res.json();
                if (json.ttd_path) {
                    console.log("User TTD path:", json.ttd_path);
                }
            }
        } catch (e) { console.error("Error fetching user TTD:", e); }
    }, []);

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
            hasFetchedSupervisors.current = true;
        };

        processSupervisorData();
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
        
        const isUserPic = spkData.personel_ditugaskan.some(person => person.npp === currentUserNpp && person.isPic);
        const isUserMenyetujui = supervisorMenyetujui && supervisorMenyetujui.npp === currentUserNpp;
        const isUserMengetahui = supervisorMengetahui && supervisorMengetahui.npp === currentUserNpp;
        
        const pelaksanaSigned = !!spkData.ttd_pelaksana_path || !!ttdPreview;
        const menyetujuiSigned = !!spkData.ttd_menyetujui_path || !!ttdMenyetujuiPreview;
        
        const isStatusFinal = spkData.status === "Selesai" || spkData.status === "Tidak Selesai";
        
        const canEditFormData = 
            !isStatusFinal && (
                isUserPic || 
                (isUserMenyetujui && pelaksanaSigned) || 
                (isUserMengetahui && pelaksanaSigned && menyetujuiSigned)
            );
        
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
        const processedDataUrl = await processImageTransparency(croppedImage, settings, 600);
        const processedFile = await dataURLtoFile(processedDataUrl, `ttd-pic-${Date.now()}.png`);

        setTtdFile(processedFile);
        setTtdPreview(processedDataUrl);
    };

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
        const processedDataUrl = await processImageTransparency(croppedImage, settings, 600);
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
        const processedDataUrl = await processImageTransparency(croppedImage, settings, 600);
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

            let finalTtdPelaksanaPath = null;
            let finalTtdMenyetujuiPath = null;
            let finalTtdMengetahuiPath = null;

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

            const matchedStatus = statusOptions.find(opt => 
                opt.name === spkData.status || opt.code === spkData.status
            );
            const statusIdToSend = matchedStatus ? matchedStatus.id : spkData.status_id;

            const params = new URLSearchParams();

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

            const url = UPDATE_SPK_URL(spkData.uuid);
            
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
    const todayDate = new Date();
    const formatDateIndo = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(todayDate);

    const isUserMenyetujui = supervisorMenyetujui && supervisorMenyetujui.npp === currentUserNpp;
    const isUserMengetahui = supervisorMengetahui && supervisorMengetahui.npp === currentUserNpp;
    const isUserPic = pic && pic.npp === currentUserNpp;
    
    const pelaksanaSigned = !!spkData.ttd_pelaksana_path || !!ttdPreview;
    const menyetujuiSigned = !!spkData.ttd_menyetujui_path || !!ttdMenyetujuiPreview;
    
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
                    <Button onClick={handlePrint}>Cetak</Button>
                </div>

                {/* SCREEN VIEW (Original) */}
                <div ref={docRef} className="p-8 text-[14px] leading-relaxed font-serif screen-only">
                    <div className="border-2 border-black p-8 rounded-md bg-white shadow-lg">
                        <h2 className="text-center font-bold underline mb-1 text-lg text-black">SURAT PERINTAH KERJA</h2>
                        <p className="text-center text-sm mb-4 font-bold text-black">(NO: {nomor_spk})</p>
                        <p className="text-right text-xs mb-6 text-black">Tanggal SPK: {formatLongDate(tanggal_spk)}</p>

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

                            <div className="mt-12 flex justify-between text-xs sm:text-sm min-h-[200px]">

                                <div className="w-1/2 text-center flex flex-col justify-end items-center">
                                    
                                    <div className="mb-8 flex flex-col items-center justify-center">
                                        <div className="bg-white p-1 border border-gray-200 rounded">
                                            <QRCode
                                                size={70}
                                                style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                value={typeof window !== 'undefined' ? `${window.location.origin}../tracking?uuid=${spkData.uuid}` : ''}
                                                viewBox={`0 0 256 256`}
                                            />
                                        </div>
                                        <div className="text-[9px] text-gray-500 mt-1 font-mono tracking-tighter">SCAN TRACKING</div>
                                    </div>

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
                                                <div className="flex justify-center items-center h-[80px] w-[150px] relative mb-1 mx-auto">
                                                    {ttdMengetahuiPreview ? (
                                                        <div className="relative group w-full h-full flex justify-center items-center">
                                                            <Draggable bounds="parent" nodeRef={ttdMengetahuiNodeRef}>
                                                                <div ref={ttdMengetahuiNodeRef} className="cursor-move p-1 border border-transparent hover:border-gray-300 rounded">
                                                                    <img src={ttdMengetahuiPreview} alt="TTD Mengetahui" className="h-[80px] w-auto object-contain" />
                                                                </div>
                                                            </Draggable>
                                                            
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
                                                    ) : spkData.ttd_mengetahui_path ? (
                                                        <img src={getProxyFileUrl(spkData.ttd_mengetahui_path)!} alt="TTD Mengetahui" className="h-[80px] w-auto object-contain" />
                                                    ) : canUploadMengetahui ? (
                                                        <div
                                                            onClick={() => ttdMengetahuiFileInputRef.current?.click()}
                                                            className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition print:hidden"
                                                        >
                                                            <Upload size={20} className="text-gray-400 mb-1" />
                                                            <span className="text-[8px] text-gray-500 font-medium">Upload TTD</span>
                                                        </div>
                                                    ) : (
                                                        <div className="h-[80px]"></div>
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

                                <div className="w-1/2 flex flex-col justify-between">
                                    
                                    <div className="text-center">
                                        <div className="font-semibold mb-2">Pelaksana</div>
                                        
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex justify-center items-center h-[80px] w-[150px] relative mb-1">
                                                {ttdPreview ? (
                                                    <div className="relative group w-full h-full flex justify-center items-center">
                                                        <Draggable bounds="parent" nodeRef={nodeRef}>
                                                            <div ref={nodeRef} className="cursor-move p-1 border border-transparent hover:border-gray-300 rounded">
                                                                <img src={ttdPreview} alt="TTD Pelaksana" className="h-[80px] w-auto object-contain" />
                                                            </div>
                                                        </Draggable>
                                                        
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
                                                ) : spkData.ttd_pelaksana_path ? (
                                                     <img src={getProxyFileUrl(spkData.ttd_pelaksana_path)!} alt="TTD Pelaksana" className="h-[80px] w-auto object-contain" />
                                                ) : canUploadPelaksana ? (
                                                    <div
                                                        onClick={() => ttdFileInputRef.current?.click()}
                                                        className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition print:hidden"
                                                    >
                                                        <Upload size={20} className="text-gray-400 mb-1" />
                                                        <span className="text-[8px] text-gray-500 font-medium">Upload TTD</span>
                                                    </div>
                                                ) : (
                                                    <div className="h-[80px]"></div>
                                                )}
                                                <input type="file" ref={ttdFileInputRef} className="hidden" accept="image/*" onChange={handleTtdFileUpload} />
                                            </div>

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
                                                <div className="flex justify-center items-center h-[80px] w-[150px] relative mb-1 mx-auto">
                                                    {ttdMenyetujuiPreview ? (
                                                        <div className="relative group w-full h-full flex justify-center items-center">
                                                            <Draggable bounds="parent" nodeRef={ttdMenyetujuiNodeRef}>
                                                                <div ref={ttdMenyetujuiNodeRef} className="cursor-move p-1 border border-transparent hover:border-gray-300 rounded">
                                                                    <img src={ttdMenyetujuiPreview} alt="TTD Menyetujui" className="h-[80px] w-auto object-contain" />
                                                                </div>
                                                            </Draggable>
                                                            
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
                                                    ) : spkData.ttd_menyetujui_path ? (
                                                        <img src={getProxyFileUrl(spkData.ttd_menyetujui_path)!} alt="TTD Menyetujui" className="h-[80px] w-auto object-contain" />
                                                    ) : canUploadMenyetujui ? (
                                                        <div
                                                            onClick={() => ttdMenyetujuiFileInputRef.current?.click()}
                                                            className="border-2 border-dashed border-gray-300 rounded-lg w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition print:hidden"
                                                        >
                                                            <Upload size={20} className="text-gray-400 mb-1" />
                                                            <span className="text-[8px] text-gray-500 font-medium">Upload TTD</span>
                                                        </div>
                                                    ) : (
                                                        <div className="h-[80px]"></div>
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

                        </div>
                    </div>
                </div>

                {/* PRINT ONLY VIEW (IDENTIK DENGAN HALAMAN VIEW) */}
                <div className="print-only print-container">
                    <div className="print-layout">
                        
                        {/* --- KOLOM KIRI: DETAIL PENGAJUAN --- */}
<div className="print-section print-left">
    <div className="flex justify-between items-start mb-[20px]">
        <div className="text-[12pt]">
            <div className="font-bold">PERUMDA AIR MINUM TIRTA MOEDAL</div>
            <div className="font-bold">KOTA SEMARANG</div>
        </div>
        <div className="text-right text-[12pt]">
            <div>Semarang, {formatDateIndo}</div>
        </div>
    </div>
    
    <div className="flex gap-[40px] text-[11pt] mb-[15px]">
        <div className="w-1/2">
            <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold whitespace-nowrap">Hal:</span>
                <span>{pengajuanDetail?.nama_jenis || '-'}</span> 
            </div>
            <div className="flex items-center gap-2">
                <span className="font-semibold whitespace-nowrap">Ref. Surat:</span>
                <span>{pengajuanDetail?.no_surat|| "-"}</span>
            </div>
        </div>

        <div className="w-1/2 kepada-yth-container">
            Kepada Yth. 
            <div className="font-semibold">{pengajuanDetail?.kepada || "-"}</div>
            PERUMDA AIR MINUM Tirta Moedal <div>di <strong>SEMARANG</strong></div>
        </div>
    </div>
    
    <div className="grid grid-cols-[120px_1fr] gap-y-[5px] items-center text-[11pt] mb-[10px]">
        <div className="col-span-3 font-bold">Satker Asal:</div>
        <div className="col-span-9 h-[18px] pb-1">{pengajuanDetail?.satker || "-"}</div>
        <div className="col-span-3 font-bold">Kode Barang :</div>
        <div className="col-span-9 h-[18px] pb-1">{pengajuanDetail?.kode_barang || "-"}</div>
    </div>
    
    <div className="big-box text-[10pt]">
        <div style={{ whiteSpace: "pre-wrap" }}>
            {renderKeteranganWithItalic(pengajuanDetail?.keterangan || 'Tidak ada keterangan.')}
        </div>
    </div>
    
    {fotoPengajuan.length > 0 && (
        <div className="mt-[10px] grid grid-cols-4 gap-[5px]">
            {fotoPengajuan.slice(0, 4).map((foto, idx) => (
                <div key={idx} className="border border-gray-300 h-[60px] flex items-center justify-center bg-gray-50">
                    {foto.preview ? (
                        <img src={foto.preview} alt={`Lampiran ${idx}`} className="max-h-full max-w-full object-cover" />
                    ) : (
                        <span className="text-[9px] text-gray-400">No Img</span>
                    )}
                </div>
            ))}
        </div>
    )}

    <div className="mt-[15px] text-[10pt] text-left">
        Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
    </div>
    
    <div className="mt-[25px] flex justify-between px-[10px] text-center items-end">
        <div className="w-[48%] flex flex-col items-center">
            <div className="text-[10pt] font-semibold mb-1">Mengetahui</div>
            {pengajuanDetail?.mengetahui && (
                <div className="text-[9pt] mb-1 text-gray-600">{pengajuanDetail.mengetahui}</div>
            )}
            <div className="w-[200px] h-[70px] flex items-center justify-center mb-1">
                {ttdMengetahuiPengajuan && (
                    <img src={ttdMengetahuiPengajuan} alt="TTD Mengetahui" className="max-w-full max-h-full object-contain"/>
                )}
            </div>
            <div className="w-full text-center">
                <div className="font-bold border-t border-black pt-1 text-[9pt]">
                    {pengajuanDetail?.mengetahui_name || "(...........................)"}
                </div>
                <div className="text-[8pt] mt-[1px]">
                    NPP: {pengajuanDetail?.mengetahui_npp || "__________"} 
                </div>
            </div>
        </div>

        <div className="w-[48%] flex flex-col items-center">
            <div className="text-[10pt] font-semibold mb-1">Pelapor</div>
            <div className="h-[20px]"></div>
            <div className="w-[200px] h-[70px] flex items-center justify-center mb-1">
                {ttdPelaporPengajuan && (
                    <img src={ttdPelaporPengajuan} alt="Tanda tangan pelapor" className="max-w-full max-h-full object-contain"/>
                )}
            </div>
            <div className="w-full text-center">
                <div className="font-bold border-t border-black pt-1 text-[9pt]">
                    {pengajuanDetail?.name_pelapor || "(...........................)"}
                </div>
                <div className="text-[8pt] mt-[1px]">
                    NPP: {pengajuanDetail?.npp_pelapor || "__________"}
                </div>
            </div>
        </div>
    </div>
</div>

{/* --- KOLOM KANAN: SPK --- */}
<div className="print-section print-right border-l border-gray-800 print:pl-[15px]">
    <div className="print-header">
        <h2 className="text-center font-bold text-[12pt] mb-[5px]">SURAT PERINTAH KERJA</h2>
        <p className="text-center text-[11pt] font-bold mb-[5px]">(NO: {nomor_spk})</p>
    </div>
    
    <div className="print-body text-[11pt]">
        <div className="print-field mb-[5px]">
            <span className="print-label font-bold">Menugaskan Sdr:</span>
        </div>
        
        <div className="mb-[10px] pl-[15px] border-l-2 border-black">
            <div className="grid grid-cols-1 text-[9pt]">
                {assignedPeople.map((person, idx) => (
                    <div key={person.name} className="flex gap-2 border-b border-gray-300 mb-1 pb-1">
                        <span className="font-bold">{idx + 1}. {person.name}</span>
                        <span className="text-gray-600">NPP: {person.npp || '-'}</span>
                    </div>
                ))}
            </div>
        </div>
        
        <div className="print-field mt-[10px]">
            <div className="print-text-block font-bold text-[10pt]">Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan</div>
        </div>
        
        <div className="print-field flex items-center mt-[5px]">
            <span className="print-label font-bold w-[130px]">Jenis Pekerjaan</span>
            {/* PERBAIKAN DISINI: Gunakann properti .nama_pekerjaan */}
            <span className="print-value flex-1 text-[10pt] pt-[2px]">
                :{spkData.jenis_pekerjaan?.nama_pekerjaan || spkData.jenis_pekerjaan || "N/A"}
            </span>
        </div>
        
        <div className="print-field flex items-center mt-[5px]">
            <span className="print-label font-bold w-[130px]">Kode Barang</span>
            <span className="print-value flex-1 text-[10pt] pt-[2px]">
                :{pengajuanDetail?.kode_barang || spkData.id_barang || 'N/A'}
            </span>
        </div>
        
        <div className="print-field-block mt-[10px] w-full">
            <span className="print-label font-bold block mb-[5px]">Uraian Pekerjaan:</span>
            <div className="print-text-block border border-black p-[8px] min-h-[60px] text-[10pt] leading-tight w-full">
                {spkData.pekerjaan_spk || "Tidak ada uraian."}
            </div>
        </div>

        {/* FOTO PEKERJAAN DI BAWAH URAIAN */}
        <div className="mt-[10px] w-full">
            <span className="print-label font-bold block mb-[5px] text-[10pt]">Foto Pekerjaan:</span>
            <div className="grid grid-cols-4 gap-[5px]">
                {fotoPekerjaan.map((foto, idx) => (
                    <div key={idx} className="border border-black h-[70px] flex items-center justify-center bg-gray-50 overflow-hidden">
                        {foto.preview ? (
                            <img src={foto.preview} alt={`Pekerjaan ${idx}`} className="h-full w-full object-cover" />
                        ) : foto.path ? (
                            <img src={getProxyFileUrl(foto.path)!} alt={`Pekerjaan ${idx}`} className="h-full w-full object-cover" />
                        ) : (
                            <span className="text-[8px] text-gray-400 italic">Lampiran {idx + 1}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>

        {/* STATUS PEKERJAAN */}
        <div className="flex items-center gap-6 mt-4 mb-4 text-[10pt]">
            <span className="font-bold">Status Pekerjaan:</span>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[12pt]">
                    {spkData.status === 'Selesai' ? '✓' : ''}
                </div>
                <span>Selesai</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[12pt]">
                    {spkData.status === 'Belum Selesai' ? '✓' : ''}
                </div>
                <span>Belum Selesai</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[12pt]">
                    {spkData.status === 'Tidak Selesai' ? '✓' : ''}
                </div>
                <span>Tidak Selesai</span>
            </div>
        </div>

        {/* PENATAAN TTD: MENGETAHUI & MENYETUJUI SEJAJAR DI PALING BAWAH */}
        <div className="mt-[10px] grid grid-cols-2 gap-x-4 w-full h-[320px]">
            <div className="flex flex-col justify-between items-center h-full">
                <div className="flex flex-col items-center">
                    <div className="bg-white p-1 border border-black rounded mb-1">
                        {spkData && spkData.uuid ? (
                            <QRCode size={60} value={`${window.location.origin}../tracking/${spkData.uuid}`} />
                        ) : null}
                    </div>
                    <div className="text-[7pt] font-bold uppercase">Scan Tracking</div>
                </div>

                <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-[9pt] mb-1">Mengetahui:</div>
                    <div className="text-[7pt] text-center leading-tight h-[15px] font-semibold mb-1 uppercase">
                        {supervisorMengetahui?.unit || spkData.mengetahui}
                    </div>
                    <div className="h-[50px] flex items-center justify-center">
                        {ttdMengetahuiPreview ? <img src={ttdMengetahuiPreview} alt="TTD" className="h-full object-contain" /> : spkData.ttd_mengetahui_path ? <img src={getProxyFileUrl(spkData.ttd_mengetahui_path)!} alt="TTD" className="h-full object-contain" /> : null}
                    </div>
                    <div className="font-bold border-t border-black w-[80%] text-center pt-1 text-[8pt] mt-1 uppercase">
                        {supervisorMengetahui?.name || spkData.mengetahui_name || "-"}
                    </div>
                    <div className="text-[7pt]">NPP. {supervisorMengetahui?.npp || spkData.mengetahui_npp || "..."}</div>
                </div>
            </div>

            <div className="flex flex-col justify-between items-center h-full">
                <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-[9pt] mb-1">Pelaksana:</div>
                    <div className="h-[65px] flex items-center justify-center">
                        {ttdPreview ? <img src={ttdPreview} alt="TTD" className="h-full object-contain" /> : spkData.ttd_pelaksana_path ? <img src={getProxyFileUrl(spkData.ttd_pelaksana_path)!} alt="TTD" className="h-full object-contain" /> : null}
                    </div>
                    <div className="font-bold border-t border-black w-[80%] text-center pt-1 text-[8pt] mt-1 uppercase">
                        {pic ? pic.name : '-'}
                    </div>
                    <div className="text-[7pt]">NPP. {pic ? pic.npp : '...'}</div>
                </div>

                <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-[9pt] mb-1">Menyetujui:</div>
                    <div className="text-[7pt] text-center leading-tight h-[15px] font-semibold mb-1 uppercase">
                        {supervisorMenyetujui?.unit || spkData.menyetujui}
                    </div>
                    <div className="h-[50px] flex items-center justify-center">
                        {ttdMenyetujuiPreview ? <img src={ttdMenyetujuiPreview} alt="TTD" className="h-full object-contain" /> : spkData.ttd_menyetujui_path ? <img src={getProxyFileUrl(spkData.ttd_menyetujui_path)!} alt="TTD" className="h-full object-contain" /> : null}
                    </div>
                    <div className="font-bold border-t border-black w-[80%] text-center pt-1 text-[8pt] mt-1 uppercase">
                        {supervisorMenyetujui?.name || spkData.menyetujui_name || "-"}
                    </div>
                    <div className="text-[7pt]">NPP. {supervisorMenyetujui?.npp || spkData.menyetujui_npp || "..."}</div>
                </div>
            </div>
        </div>
    </div>
</div>


                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page {
                        size: A3 landscape;
                        margin: 10mm;
                    }
                    
                    body * {
                        visibility: hidden;
                    }
                    
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                        -webkit-print-color-adjust: exact;
                    }
                    
                    .screen-only {
                        display: none !important;
                    }
                    
                    .print-only, .print-only * {
                        visibility: visible;
                    }
                    
                    .print-only {
                        display: block !important;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        height: 100vh;
                        padding: 0;
                        box-sizing: border-box;
                        z-index: 9999;
                        background: white;
                    }
                    
                    .print-container {
                        width: 100%;
                        height: 100%;
                    }
                    
                    .print-layout {
                        display: flex;
                        flex-direction: row;
                        width: 100%;
                        height: 100%; 
                        page-break-inside: avoid;
                    }
                    
                    .print-section {
                        padding: 10mm;
                        font-family: 'Times New Roman', serif;
                        line-height: 1.4;
                        height: 100%;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .print-left {
                        width: 48%;
                        border-right: 1px solid #000;
                        padding-right: 5mm;
                    }
                    
                    .print-right {
                        width: 48%;
                        padding-left: 5mm;
                    }

                    .big-box { 
                        border: 1px solid #000; 
                        min-height: 90px; 
                        padding: 5px; 
                        font-family: 'Times New Roman', serif;
                    }
                    
                    .kepada-yth-container { 
                        line-height: 1.3; 
                    }
                    
                    .kepada-yth-container div { 
                        margin-bottom: 2px; 
                    }

                    .print-header-pengajuan {
                        text-align: center;
                        margin-bottom: 10px;
                    }

                    .print-field {
                        display: flex;
                        margin-bottom: 5px;
                    }
                    
                    .print-field-block {
                        flex-direction: column;
                        margin-bottom: 10px;
                    }
                    
                    .print-label {
                        min-width: 120px;
                        margin-right: 10px;
                    }
                    
                    .print-value {
                        flex: 1;
                    }

                    .print-text-block {
                        white-space: pre-wrap;
                        text-align: justify;
                    }
                    
                    .print-personnel-list {
                        margin-bottom: 5px;
                        margin-left: 10px;
                    }
                    
                    .print-person-item {
                        margin-bottom: 1px;
                    }

                    .print-signatures-grid {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 15px;
                        border-top: 1px solid transparent; 
                        padding-top: 5px;
                    }
                    
                    .print-signature-item {
                        text-align: center;
                        display: flex;
                        flex-direction: column;
                        justify-content: flex-end; 
                    }
                    
                    .print-signature-title {
                        margin-bottom: 5px;
                        font-weight: bold;
                        font-size: 9pt;
                    }
                    
                    .print-signature-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 70px;
                        justify-content: space-between;
                    }
                    
                    .print-signature-img {
                        height: 50px;
                        width: auto;
                        margin-bottom: 2px;
                        max-width: 100%;
                        object-fit: contain;
                    }
                    
                    .print-signature-empty {
                        height: 50px;
                        width: 50px;
                        border-bottom: 1px solid #000;
                        margin-bottom: 2px;
                    }
                    
                    .print-signature-name {
                        font-weight: bold;
                        border-top: 1px solid #000;
                        padding-top: 1px;
                        width: 100%;
                        font-size: 9pt;
                        margin-bottom: 2px;
                    }
                    
                    .print-signature-npp {
                        font-size: 8pt;
                        margin-top: 0;
                    }
                }
                
                @media screen {
                    .print-only {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default function EditSPKPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat Halaman...</span>
            </div>
        }>
            <EditSPKContent />
        </Suspense>
    );
}