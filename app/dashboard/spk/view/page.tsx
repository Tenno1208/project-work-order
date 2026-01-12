//app/dashboard/spk/view/page.tsx

"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, X, CheckCircle, Loader2, AlertTriangle, Users, ArrowLeft, ChevronDown, ChevronUp, File, Image as ImageIcon, Download, Printer, QrCode } from "lucide-react";
import QRCode from "react-qr-code";

// ====================================================================
// --- TYPES & CONSTANTS ----------------------------------------------
// ====================================================================

type PegawaiItem = {
    name: string;
    npp: string | null;
    jabatan: string | null;
    tlp?: string | null;
};

type AssignedPerson = PegawaiItem & {
    isPic: boolean;
};

type ToastMessage = {
    show: boolean;
    message: string;
    type: "success" | "error" | "warning";
};

type SPKDetail = {
    id: number;
    uuid: string;
    uuid_pengajuan: string | null;
    status_id: number;
    status: {
        id: number;
        code: string;
        name: string;
    };
    jenis_pekerjaan_id: number;
    jenis_pekerjaan: {
        id: number;
        kode: string;
        nama_pekerjaan: string;
    };
    no_referensi: string;
    no_surat: string;
    menyetujui: string;
    menyetujui_name: string;
    menyetujui_npp: string;
    menyetujui_tlp: string;
    menyetujui_ttd: string | null;
    mengetahui: string;
    mengetahui_name: string;
    mengetahui_npp: string;
    mengetahui_tlp: string;
    mengetahui_ttd: string | null;
    penanggung_jawab_name: string;
    penanggung_jawab_npp: string;
    penanggung_jawab_tlp: string;
    penanggung_jawab_ttd: string | null;
    npp_kepala_satker: string;
    stafs: Array<{
        npp: string;
        nama: string;
        tlp: string;
        is_penanggung_jawab: boolean;
    }>;
    tanggal: string;
    kode_barang: string;
    file: string[];
    uraian_pekerjaan: string;
    is_deleted: number;
    created_at: string;
    updated_at: string;
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

const API_BASE_URL = "https://workorder123.loca.lt";
const GET_API_SPK_VIEW_TEMPLATE_PROXY = "/api/spk-proxy/view/{uuid}";
const GET_API_PENGAJUAN_VIEW_PROXY = "/api/pengajuan/view/{uuid}";

// --- HELPER FORMAT TANGGAL BARU (Senin, 5 Januari 2026) ---
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
// --- UTILITY FUNCTIONS & COMPONENTS UNTUK FILE/MODAL ----------------
// ====================================================================

const getProxyFileUrl = (path: string | null | undefined): string | null => {
    if (!path || path.trim() === '') return null;
    
    const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (path.startsWith('http')) {
        return `/api/image-proxy?url=${encodeURIComponent(path)}`;
    }

    return `/api/image-proxy?path=${encodeURIComponent(sanitizedPath)}`;
};

// Fungsi untuk memuat gambar dengan batasan retry (untuk SPK)
async function loadImageWithProxy(imgUrl: string, token: string): Promise<string> {
    if (imgUrl.startsWith('data:')) return imgUrl;
    
    try {
        let targetUrl = imgUrl;
        if (!imgUrl.startsWith('http')) {
            const cleanPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl;
            targetUrl = `https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=${cleanPath}`;
        }
        const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(targetUrl)}`;
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
        console.error(`Error loading image:`, error);
        return imgUrl; // Kembalikan URL asli jika gagal
    }
}

// Fungsi untuk memuat gambar dengan batasan retry (untuk Pengajuan)
async function loadImageWithProxyRetry(imgUrl: string, token: string, maxRetries: number = 5): Promise<string> {
    if (imgUrl.startsWith('data:')) return imgUrl;
    
    let retryCount = 0;
    
    const attemptLoad = async (): Promise<string> => {
        try {
            let targetUrl = imgUrl;
            if (!imgUrl.startsWith('http')) {
                const cleanPath = imgUrl.startsWith('/') ? imgUrl.slice(1) : imgUrl;
                targetUrl = `https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=${cleanPath}`;
            }
            const proxyUrl = `/api/file-proxy?url=${encodeURIComponent(targetUrl)}`;
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

const ImageModal = ({ imageUrl, onClose }: { imageUrl: string | null, onClose: () => void }) => {
    if (!imageUrl) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999]"
            onClick={onClose}
        >
            <div 
                className="relative bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] overflow-auto"
                onClick={e => e.stopPropagation()} 
            >
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition z-10"
                    title="Tutup"
                >
                    <X size={20} />
                </button>
                
                <img src={imageUrl} alt="Lampiran Detail" className="w-full h-auto max-w-[80vw] max-h-[85vh] object-contain p-2"/>
            </div>
        </div>
    );
};

// ====================================================================
// --- UTILITY COMPONENTS ---------------------------------------------
// ====================================================================

const Button = ({ 
    onClick, 
    children, 
    className = "bg-blue-600 hover:bg-blue-700 text-white", 
    disabled = false 
}: { onClick: () => void, children: React.ReactNode, className?: string, disabled?: boolean }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
    >
        {children}
    </button>
);

const ToastBox = ({ toast, onClose }: { toast: ToastMessage, onClose: () => void }) =>
    toast.show && (
        <div
            className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 transition-opacity duration-300 flex items-center gap-2 ${
                toast.type === "success" ? "bg-green-600" : (toast.type === "error" ? "bg-red-600" : "bg-yellow-600")
            }`}
        >
            {toast.message}
            <button onClick={onClose} className="text-white ml-2">
                <X size={14} />
            </button>
        </div>
    );

const Chip = ({ person }: { person: AssignedPerson }) => {
    const isReadOnly = true; 

    return (
        <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full my-1 shadow-sm border border-blue-200">
            <div
                className={`
                    mr-2 flex items-center justify-center transition-colors duration-200
                    ${isReadOnly ? 'cursor-default opacity-80' : 'cursor-pointer'}
                `}
                title={person.isPic ? "Penanggung Jawab (PIC)" : "Anggota Tim"}
            >
                {person.isPic ? (
                    <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" />
                ) : (
                    <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>
                )}
            </div>
            <Users className="w-4 h-4 mr-1 text-blue-600" />
            <span className="font-medium">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
        </div>
    );
};

const ViewBox = ({ 
    value, 
}: {
    value: string | undefined;
}) => {
    return (
        <div
            className={`min-h-[140px] p-2 text-black border border-gray-300 rounded-md shadow-inner text-sm bg-gray-100 cursor-not-allowed`}
            style={{ whiteSpace: "pre-wrap" }}
        >
            {value || "Tidak ada uraian pekerjaan tercatat."}
        </div>
    );
};

// ====================================================================
// --- COLLAPSIBLE COMPONENTS -----------------------------------------
// ====================================================================

const PengajuanDetailView = ({ 
    detail, 
    onImageClick 
}: { 
    detail: PengajuanDetail; 
    onImageClick: (url: string) => void;
}) => {
    const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
    
    const handleImageError = (path: string) => {
        setImageLoadErrors(prev => new Set(prev).add(path));
    };
    
    return (
        <div className="space-y-1 text-sm pb-4 mb-4 border-b border-gray-200 print:border-none">
            <h4 className="font-bold underline mb-2 mt-2 text-md print:text-sm print:font-bold">DETAIL PENGAJUAN</h4>
            
            <div className="grid grid-cols-2 gap-4 text-xs print:text-[12px] mb-2">
                <div className="flex"><div className="w-[120px] text-gray-700">No. Pengajuan</div><div className="flex-1">:{detail.no_surat || '-'}</div></div>
                <div className="flex"><div className="w-[80px] text-gray-700">Tanggal</div><div className="flex-1">:{formatLongDate(detail.tanggal)}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs print:text-[12px] mb-2">
                <div className="flex"><div className="w-[120px] text-gray-700">Pelapor</div><div className="flex-1">:{detail.name_pelapor} (NPP :{detail.npp_pelapor})</div></div>
                {/* AMBIL PARENT SATKER DI SINI */}
                <div className="flex"><div className="w-[80px] text-gray-700">Satker Asal</div><div className="flex-1">:{detail.satker || '-'}</div></div>
            </div>
            <div className="flex text-xs mb-2 print:text-[12px]"><div className="w-[120px] text-gray-700">Perihal</div><div className="flex-1">:{detail.nama_jenis} ({detail.hal_id})</div></div>
            <div className="text-xs mb-2 p-2 border border-gray-200 rounded print:border-none print:p-0"><div className="text-gray-700 mb-1">Uraian Detail:</div><p className="whitespace-pre-wrap print:text-[12px]">{detail.keterangan || 'Tidak ada uraian detail.'}</p></div>

            {/* TTD Pengajuan View Only */}
            <div className="grid grid-cols-2 gap-4 pt-4 print:grid-cols-2">
                <div className="border border-gray-200 rounded-lg p-3 print:p-1 print:border-dashed">
                    <div className="text-black text-xs mb-2">Tanda Tangan Mengetahui:</div>
                    <div className="text-center h-40 flex flex-col justify-end items-center">
                        {/* CONTAINER TTD MENGETAHUI - UKURAN STANDAR */}
                        {detail.ttd_mengetahui_path ? (
                            <div className="h-32 w-full flex justify-center items-center">
                                {imageLoadErrors.has(detail.ttd_mengetahui_path) ? (
                                    <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak dapat dimuat.</span>
                                ) : (
                                    <img 
                                        src={getProxyFileUrl(detail.ttd_mengetahui_path) || ""} 
                                        alt="TTD Mengetahui" 
                                        className="h-full w-auto object-contain mb-1" 
                                        onError={() => handleImageError(detail.ttd_mengetahui_path || '')}
                                    />
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak tersedia.</span>
                        )}
                        <p className="text-xs mt-1 text-gray-700">{detail.mengetahui_name || '-'}</p>
                    </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-3 print:p-1 print:border-dashed">
                    <div className="text-black text-xs mb-2">Tanda Tangan Pelapor:</div>
                    <div className="text-center h-40 flex flex-col justify-end items-center">
                        {/* CONTAINER TTD PELAPOR - UKURAN STANDAR */}
                        {detail.ttd_pelapor_path ? (
                            <div className="h-32 w-full flex justify-center items-center">
                                {imageLoadErrors.has(detail.ttd_pelapor_path) ? (
                                    <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak dapat dimuat.</span>
                                ) : (
                                    <img 
                                        src={getProxyFileUrl(detail.ttd_pelapor_path) || ""} 
                                        alt="TTD Pelapor" 
                                        className="h-full w-auto object-contain mb-1 cursor-pointer" 
                                        onClick={() => onImageClick(getProxyFileUrl(detail.ttd_pelapor_path) || '')}
                                        onError={() => handleImageError(detail.ttd_pelapor_path || '')}
                                    />
                                )}
                            </div>
                        ) : (
                            <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak tersedia.</span>
                        )}
                        <p className="text-xs mt-1 text-gray-700">{detail.name_pelapor}</p>
                    </div>
                </div>
            </div>

            {/* Lampiran */}
            {detail.file_paths.length > 0 && (
                <div className="pt-4 border-t mt-4 border-gray-100 print:border-none">
                    <div className="text-cyan-700 text-sm mb-2 flex items-center gap-1"><File size={16}/> Lampiran File ({detail.file_paths.length} file):</div>
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
                                            <File size={36} className="mx-auto text-blue-500 flex-shrink-0"/>
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

const SPKSettingsView = ({ 
    spkData,
    fotoPekerjaan,
    onImageClick
}: {
    spkData: SPKDetail;
    fotoPekerjaan: any[];
    onImageClick: (url: string) => void;
}) => {
    return (
        <div className="mt-6 text-black border-t-2 border-gray-300 pt-4 rounded-lg bg-white p-5 shadow-inner space-y-4">
            <h3 className="font-bold text-base mb-4 text-cyan-700">⚙️ Pengaturan Detail Pekerjaan</h3>

            <div className="flex items-center">
                <div className="w-[140px] font-medium text-gray-600">Tanggal Pengerjaan</div>
                <div className="text-gray-800 font-semibold">{formatLongDate(spkData.tanggal) || 'Belum Selesai'}</div>
            </div>

            <div className="flex items-center">
                <div className="w-[140px] font-medium text-gray-600">Jenis Pekerjaan</div>
                <div className="text-gray-800 font-semibold">{spkData.jenis_pekerjaan?.nama_pekerjaan || "N/A"}</div>
            </div>

            <div className="flex items-center">
                <div className="w-[140px] font-medium text-gray-600">ID Barang</div>
                <div className="text-gray-800 font-semibold">{spkData.kode_barang || 'N/A'}</div>
            </div>

            <div className="flex">
                <div className="w-[140px] pt-2 font-medium text-gray-600">Uraian Pekerjaan</div>
                <div className="flex-1">
                    <ViewBox
                        value={spkData.uraian_pekerjaan || ""}
                    />
                </div>
            </div>

            {/* Foto Pekerjaan */}
            <div className="flex">
                <div className="w-[140px] pt-2 font-medium text-gray-600">Foto Pekerjaan</div>
                <div className="flex-1">
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
                </div>
            </div>

            <div className="flex items-start">
                <div className="w-[140px] font-medium text-gray-600">Status Pekerjaan</div>
                <div className="text-gray-800 font-bold">
                    <span 
                        className={`inline-block px-3 py-1 rounded-full text-white text-xs ${
                            spkData.status?.name === 'Selesai' ? 'bg-green-600' : 
                            spkData.status?.name === 'Belum Selesai' || spkData.status?.name === 'in_progress' ? 'bg-orange-500' : 'bg-gray-500'
                        }`}
                    >
                        {spkData.status?.name || 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
};

// Cache untuk menyimpan data detail pengajuan
const pengajuanDetailCache = new Map<string, PengajuanDetail>();

const RequestDetailCollapse = ({
    spkData,
    modalImageUrl,
    setModalImageUrl,
    fotoPekerjaan,
    onImageClick,
    showToast
}: {
    spkData: SPKDetail;
    modalImageUrl: string | null;
    setModalImageUrl: (url: string | null) => void;
    fotoPekerjaan: any[];
    onImageClick: (url: string) => void;
    showToast: (message: string, type: "success" | "error" | "warning") => void;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [detail, setDetail] = useState<PengajuanDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const toggle = () => setIsOpen(!isOpen);

    const fetchRequestDetail = useCallback(async () => {
        if (!spkData.uuid_pengajuan) return;
        
        if (pengajuanDetailCache.has(spkData.uuid_pengajuan)) {
            setDetail(pengajuanDetailCache.get(spkData.uuid_pengajuan) || null);
            return;
        }
        
        setLoading(true); 
        setLoadError(null);
        const url = GET_API_PENGAJUAN_VIEW_PROXY.replace('{uuid}', spkData.uuid_pengajuan);
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        try {
            if (!token) throw new Error("Otorisasi hilang. Mohon login ulang.");
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            const result = await res.json();
            if (!res.ok || !result.success || !result.data) throw new Error(result.message || `Gagal memuat detail pengajuan.`);
            
            const data = result.data;
            const masterhal = result.masterhal;
            
            // --- LOGIKA PARENT SATKER ---
            const parentSatker = result.kd_parent?.parent_satker || data.satker || 'N/A';

            const detailData = {
                uuid: data.uuid, 
                no_surat: data.no_surat, 
                nama_jenis: masterhal?.nama_jenis || data.hal || 'N/A', 
                hal_id: masterhal?.kode || data.hal_id || 'N/A', 
                kepada: data.kepada || 'N/A', 
                satker: parentSatker, // GUNAKAN PARENT SATKER
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
            
            pengajuanDetailCache.set(spkData.uuid_pengajuan, detailData);
            setDetail(detailData);
        } catch (err: any) { 
            setLoadError(err.message); 
            showToast(`Gagal memuat detail: ${err.message}`, "error"); 
        } finally { 
            setLoading(false); 
        }
    }, [spkData.uuid_pengajuan, showToast]);

    useEffect(() => { 
        if (isOpen && !detail) {
            fetchRequestDetail();
        }
    }, [isOpen, detail, fetchRequestDetail]);

    return (
        <div className="border border-gray-300 rounded-lg shadow-sm mt-4 print:border-none print:shadow-none print:mt-0 print:pt-0">
            <button
                onClick={toggle}
                className="w-full text-left p-3 font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex justify-between items-center print:hidden"
            >
                <span>
                    {isOpen ? '🔽 Sembunyikan' : '➡️ Tampilkan'} Detail Pengajuan & Pengaturan Pekerjaan
                </span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOpen && (
                <div className={`p-4 bg-white border-t border-gray-200 transition-all duration-300 print:block print:border-none print:p-0`}>
                    {loading && <div className="flex items-center text-blue-600"><Loader2 className="animate-spin mr-2 w-4 h-4" /> Memuat data...</div>}
                    {loadError && <div className="text-red-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Error: {loadError}</div>}

                    {detail && (
                        <PengajuanDetailView 
                            detail={detail} 
                            onImageClick={onImageClick} 
                        />
                    )}
                    
                    <SPKSettingsView 
                        spkData={spkData}
                        fotoPekerjaan={fotoPekerjaan}
                        onImageClick={onImageClick}
                    />
                </div>
            )}
        </div>
    );
};

// ====================================================================
// --- MAIN COMPONENT -------------------------------------------------
// ====================================================================

function SPKDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const spk_uuid = useMemo(() => {
        return searchParams.get('uuid') || searchParams.get('view'); 
    }, [searchParams]);

    const [spkData, setSpkData] = useState<SPKDetail | null>(null);
    const [assignedPeople, setAssignedPeople] = useState<AssignedPerson[]>([]);
    const [fotoPekerjaan, setFotoPekerjaan] = useState<any[]>([]);
    const [pengajuanDetail, setPengajuanDetail] = useState<PengajuanDetail | null>(null);
    
    // State untuk menyimpan preview tanda tangan
    const [ttdMengetahuiPreview, setTtdMengetahuiPreview] = useState<string | null>(null);
    const [ttdMenyetujuiPreview, setTtdMenyetujuiPreview] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null); 
    
    const docRef = useRef<HTMLDivElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error" | "warning") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    const closeToast = useCallback(() => {
        setToast(prev => ({ ...prev, show: false }));
    }, []);

    const handlePrint = () => {
        if (!docRef.current) {
            showToast("Gagal mencetak: Konten dokumen tidak ditemukan.", "error");
            return;
        }
        window.print();
    };

    const handleImageClick = (fileUrl: string) => {
        setModalImageUrl(fileUrl);
    };

    // --- Fetch Data Logics ---
    const fetchDetailSPK = useCallback(async () => {
        if (!spk_uuid) {
            setError("UUID SPK tidak ditemukan dalam URL.");
            setIsLoading(false);
            return;
        }

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

            const item = result.data as SPKDetail;

            setSpkData(item);
            
            // Map personnel data
            const personnel = item.stafs || [];
            setAssignedPeople(personnel.map((p: any) => ({
                name: p.nama,
                npp: p.npp,
                isPic: !!p.is_penanggung_jawab || (p.is_penanggung_jawab === 1),
                jabatan: null,
            })));
            
            // --- LOAD PREVIEW FOTO ---
            if (item.file && item.file.length > 0) {
                const photoPromises = item.file.map(async (path, index) => {
                    if (index < 4) { // Limit 4 foto
                        try {
                            const imageUrl = getProxyFileUrl(path);
                            if (imageUrl && token) {
                                // Gunakan fungsi tanpa retry untuk gambar SPK
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
            
            // --- LOAD PREVIEW TTD MENGETAHUI ---
            if (item.mengetahui_ttd && token) {
                try {
                    const ttdUrl = getProxyFileUrl(item.mengetahui_ttd);
                    if (ttdUrl) {
                        // Gunakan fungsi tanpa retry untuk TTD SPK
                        const ttdPreviewUrl = await loadImageWithProxy(ttdUrl, token);
                        setTtdMengetahuiPreview(ttdPreviewUrl);
                    }
                } catch (error) {
                    console.error("Error loading mengetahui TTD:", error);
                }
            }
            
            // --- LOAD PREVIEW TTD MENYETUJUI ---
            if (item.menyetujui_ttd && token) {
                try {
                    const ttdUrl = getProxyFileUrl(item.menyetujui_ttd);
                    if (ttdUrl) {
                        // Gunakan fungsi tanpa retry untuk TTD SPK
                        const ttdPreviewUrl = await loadImageWithProxy(ttdUrl, token);
                        setTtdMenyetujuiPreview(ttdPreviewUrl);
                    }
                } catch (error) {
                    console.error("Error loading menyetujui TTD:", error);
                }
            }

            // --- FETCH PENGAJUAN DETAIL ---
            if (item.uuid_pengajuan) {
                const pengajuanUrl = GET_API_PENGAJUAN_VIEW_PROXY.replace('{uuid}', item.uuid_pengajuan);
                try {
                    const pengajuanRes = await fetch(pengajuanUrl, { headers: { Authorization: `Bearer ${token}` } });
                    const pengajuanResult = await pengajuanRes.json();
                    
                    if (pengajuanRes.ok && pengajuanResult.success && pengajuanResult.data) {
                        const data = pengajuanResult.data;
                        const masterhal = pengajuanResult.masterhal;
                        
                        // --- LOGIKA PARENT SATKER ---
                        const parentSatker = pengajuanResult.kd_parent?.parent_satker || data.satker || 'N/A';

                        const detailData = {
                            uuid: data.uuid, 
                            no_surat: data.no_surat, 
                            nama_jenis: masterhal?.nama_jenis || data.hal || 'N/A', 
                            hal_id: masterhal?.kode || data.hal_id || 'N/A', 
                            kepada: data.kepada || 'N/A', 
                            satker: parentSatker, // GUNAKAN PARENT SATKER
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
                        
                        setPengajuanDetail(detailData);
                    }
                } catch (err: any) {
                    console.error("Error fetching pengajuan detail:", err);
                }
            }

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat memuat SPK.");
        } finally {
            setIsLoading(false);
        }
    }, [spk_uuid]);

    const pic = useMemo(() => {
        return assignedPeople.find(p => p.isPic);
    }, [assignedPeople]);

    useEffect(() => {
        fetchDetailSPK();
    }, [fetchDetailSPK]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat detail SPK...</span>
            </div>
        );
    }

    if (error || !spkData) {
        return (
            <div className="p-8 space-y-6 text-center bg-white min-h-screen border-t-4 border-red-500">
                <AlertTriangle className="inline-block text-red-500" size={48} />
                <h2 className="text-3xl font-extrabold text-red-600">Akses Ditolak / Data Tidak Ditemukan</h2>
                <p className="text-gray-700 text-lg">Error: {error || "Data SPK tidak dapat dimuat."}</p>
                <button
                    onClick={() => router.push("/dashboard/spk")}
                    className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors flex items-center mx-auto"
                >
                    <ArrowLeft size={16} className="mr-2" /> Kembali ke Daftar SPK
                </button>
            </div>
        );
    }

    const { no_surat, tanggal } = spkData;
    const awalanJabatan = "Kepala";

    return (
        <div className="p-6 min-h-screen bg-gray-100 font-sans">
            <ToastBox toast={toast} onClose={closeToast} />
            <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />

            <div className="max-w-4xl mx-auto mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg text-center flex items-center justify-center">
                <Users className="mr-2" size={20} />
                Anda berada dalam Mode Lihat Detail murni. Data tidak dapat diubah di halaman ini.
            </div>

            <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-xl rounded-xl">
                <div className="flex items-center justify-between border-b px-6 py-3 bg-cyan-50 rounded-t-xl print:hidden">
                    <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ArrowLeft size={20} className="cursor-pointer hover:text-blue-600 transition" onClick={() => router.push("/dashboard/spk")} />
                        Detail SPK: {no_surat}
                    </h1>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1">
                        <Printer size={16}/> Cetak (A4)
                    </Button>
                </div>

                {/* Tampilan Normal di Layar */}
                <div ref={docRef} className="p-8 text-[14px] leading-relaxed font-serif screen-only">
                    <div className="border-2 border-black p-8 rounded-md bg-white shadow-lg print:border print:p-4 print:shadow-none">
                        
                        <h2 className="text-center font-bold underline mb-1 text-lg text-black print:text-base">
                            SURAT PERINTAH KERJA
                        </h2>
                        <p className="text-center text-sm mb-4 font-bold text-black print:text-xs">(NO: {no_surat})</p>
                        <p className="text-right text-xs mb-6 text-black print:text-xs">Tanggal SPK: {formatLongDate(tanggal)}</p>
                        
                        
                        <div className="mt-2 text-black space-y-4">
                            <div className="flex items-start mt-2 border p-2 rounded-lg bg-gray-50 print:bg-white print:border-dashed">
                                <div className="w-[140px] pt-1 font-semibold text-gray-700 print:text-black">Menugaskan Sdr:</div>
                                <div className="flex-1 flex flex-wrap gap-2 min-h-[40px] print:flex-col print:gap-0">
                                    {assignedPeople.length > 0 ? (
                                        assignedPeople.map((person) => (
                                            <Chip key={person.name} person={person} />
                                        ))
                                    ) : (
                                        <span className="text-gray-500 italic p-1">Belum ada personel ditugaskan.</span>
                                    )}
                                </div>
                            </div>

                            <p className="mt-4 print:text-sm">
                                Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan
                            </p>
                            
                            <RequestDetailCollapse 
                                spkData={spkData}
                                modalImageUrl={modalImageUrl}
                                setModalImageUrl={setModalImageUrl}
                                fotoPekerjaan={fotoPekerjaan}
                                onImageClick={handleImageClick}
                                showToast={showToast}
                            />

                            <div className="mt-12 flex justify-between text-xs sm:text-sm print:text-xs min-h-[200px]">


                                {/* KIRI: QR CODE & MENGETAHUI */}
                                <div className="w-1/2 text-center flex flex-col justify-end items-center">
                                    
                                    <div className="mb-8 flex flex-col items-center justify-center">
                                        <div className="bg-white p-1 border border-gray-200 rounded">
                                            {/* PERBAIKAN: Gunakan uuid_pengajuan untuk QR Code */}
                                            {spkData && spkData.uuid_pengajuan ? (
                                                <QRCode
                                                    size={70} // Ukuran yang sama dengan halaman format
                                                    style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                    value={`${window.location.origin}/tracking/${spkData.uuid_pengajuan}`}
                                                    viewBox={`0 0 256 256`}
                                                />
                                            ) : (
                                                <div className="w-[70px] h-[70px] flex items-center justify-center bg-gray-100 rounded">
                                                    <Loader2 className="animate-spin text-gray-400" size={24} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-[9px] text-gray-500 mt-1 font-mono tracking-tighter">SCAN TRACKING</div>
                                    </div>

                                    {/* 2. Mengetahui */}
                                    <div className="w-full">
                                        <div className="pb-1">Mengetahui</div>
                                        <div className="font-semibold flex items-end justify-center min-h-[10px] px-4">
                                            {spkData.mengetahui || "Ka. Bid Pengembangan Program"}
                                        </div>
                                        <div style={{ height: 15 }}></div>
                                        <>
                                            {/* Container Tanda Tangan Mengetahui */}
                                            <div className="flex justify-center items-center h-[100px] w-[200px] relative mb-1 mx-auto">
                                                {ttdMengetahuiPreview ? (
                                                    <div className="relative group w-full h-full flex justify-center items-center">
                                                        <img src={ttdMengetahuiPreview} alt="TTD Mengetahui" className="h-[100px] w-auto object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="h-[100px]"></div>
                                                )}
                                            </div>
                                            <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-2 mx-auto">
                                                {spkData.mengetahui_name || "-"}
                                            </div>
                                            <div className="text-xs">NPP. {spkData.mengetahui_npp || "..."}</div>
                                        </>
                                    </div>
                                </div>

                                {/* KANAN: PELAKSANA & MENYETUJUI */}
                                <div className="w-1/2 flex flex-col justify-between">
                                    
                                    {/* 1. Pelaksana Section */}
                                    <div className="text-center">
                                        <div className="font-semibold mb-2">Pelaksana</div>
                                        
                                        {/* Container Tanda Tangan Pelaksana */}
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex justify-center items-center h-[100px] w-[200px] relative mb-1">
                                                {spkData.penanggung_jawab_ttd ? (
                                                    <div className="relative group w-full h-full flex justify-center items-center">
                                                        <img src={getProxyFileUrl(spkData.penanggung_jawab_ttd) || ""} alt="TTD Pelaksana" className="h-[100px] w-auto object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="h-[100px]"></div>
                                                )}
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
                                            {spkData.menyetujui || "Ka. Sub Bid TI"}
                                        </div>
                                        <div style={{ height: 15 }}></div>
                                        <>
                                            {/* Container Tanda Tangan Menyetujui */}
                                            <div className="flex justify-center items-center h-[100px] w-[200px] relative mb-1 mx-auto">
                                                {ttdMenyetujuiPreview ? (
                                                    <div className="relative group w-full h-full flex justify-center items-center">
                                                        <img src={ttdMenyetujuiPreview} alt="TTD Menyetujui" className="h-[100px] w-auto object-contain" />
                                                    </div>
                                                ) : (
                                                    <div className="h-[100px]"></div>
                                                )}
                                            </div>
                                            <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-2 mx-auto">
                                                {spkData.menyetujui_name || "-"}
                                            </div>
                                            <div className="text-xs">NPP. {spkData.menyetujui_npp || "..."}</div>
                                        </>
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Tampilan Khusus untuk Cetak */}
                <div className="print-only print-container">
                    <div className="print-layout">
                        {/* Bagian Kiri: Detail Pengajuan - Sesuai dengan gambar */}
                        <div className="print-section print-left">
                            <div className="print-header">
                                <div className="text-center font-bold text-base mb-2">PERUMDA AIR MINUM TIRTA MOEDAL KOTA SEMARANG</div>
                                <div className="text-center font-bold text-base mb-4 underline">Pemeliharaan/Perbaikan</div>
                            </div>
                            
                            {pengajuanDetail && (
                                <div className="print-body">
                                    <div className="print-form-container">
                                        <div className="print-form-row">
                                            <div className="print-form-label">Satker</div>
                                            <div className="print-form-value">: {pengajuanDetail.satker || '-'}</div>
                                        </div>
                                        
                                        <div className="print-form-row">
                                            <div className="print-form-label">Seksi /Sub Bid/Sub Bag</div>
                                            <div className="print-form-value">: {pengajuanDetail.kepada || '-'}</div>
                                        </div>
                                        
                                        <div className="print-form-row">
                                            <div className="print-form-label">Kode Barang : (wajib diisi)</div>
                                            <div className="print-form-value">: {pengajuanDetail.kode_barang || '-'}</div>
                                        </div>
                                        
                                        <div className="print-form-row">
                                            <div className="print-form-label">Kerusakan</div>
                                            <div className="print-form-value">: {pengajuanDetail.nama_jenis || '-'}</div>
                                        </div>
                                        
                                        <div className="print-form-row">
                                            <div className="print-form-label">Uraian</div>
                                            <div className="print-form-value-block">: {pengajuanDetail.keterangan || '-'}</div>
                                        </div>
                                        
                                        <div className="print-form-row">
                                            <div className="print-form-label">Tanggal</div>
                                            <div className="print-form-value">: {formatLongDate(pengajuanDetail.tanggal)}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="print-signatures-section">
                                        <div className="print-signature-left">
                                            <div className="print-signature-title">Mengetahui</div>
                                            <div className="print-signature-box">
                                                {pengajuanDetail.ttd_mengetahui_path ? (
                                                    <img src={getProxyFileUrl(pengajuanDetail.ttd_mengetahui_path) || ""} alt="TTD Mengetahui" className="print-signature-img" />
                                                ) : (
                                                    <div className="print-signature-empty"></div>
                                                )}
                                                <div className="print-signature-name">{pengajuanDetail.mengetahui_name || '-'}</div>
                                                <div className="print-signature-npp">NPP. {pengajuanDetail.mengetahui || '-'}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="print-signature-right">
                                            <div className="print-signature-title">Pelapor</div>
                                            <div className="print-signature-box">
                                                {pengajuanDetail.ttd_pelapor_path ? (
                                                    <img src={getProxyFileUrl(pengajuanDetail.ttd_pelapor_path) || ""} alt="TTD Pelapor" className="print-signature-img" />
                                                ) : (
                                                    <div className="print-signature-empty"></div>
                                                )}
                                                <div className="print-signature-name">{pengajuanDetail.name_pelapor}</div>
                                                <div className="print-signature-npp">NPP. {pengajuanDetail.npp_pelapor}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Bagian Kanan: SPK */}
                        <div className="print-section print-right">
                            <div className="print-header">
                                <h2 className="text-center font-bold text-base mb-2">SURAT PERINTAH KERJA</h2>
                                <p className="text-center text-xs font-bold mb-2">(NO: {no_surat})</p>
                                <p className="text-right text-xs mb-4">Tanggal SPK: {formatLongDate(tanggal)}</p>
                            </div>
                            
                            <div className="print-body">
                                <div className="print-field">
                                    <span className="print-label">Menugaskan Sdr:</span>
                                </div>
                                <div className="print-personnel-list">
                                    {assignedPeople.length > 0 ? (
                                        assignedPeople.map((person) => (
                                            <div key={person.name} className="print-person-item">
                                                {person.name}{person.npp ? ` (${person.npp})` : ''}
                                                {person.isPic && <span className="print-pic-badge"> (PIC)</span>}
                                            </div>
                                        ))
                                    ) : (
                                        <div className="print-person-item">Belum ada personel ditugaskan.</div>
                                    )}
                                </div>
                                
                                <div className="print-field print-field-block">
                                    <div className="print-text-block">Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan</div>
                                </div>
                                
                                <div className="print-field">
                                    <span className="print-label">Jenis Pekerjaan:</span>
                                    <span className="print-value">{spkData.jenis_pekerjaan?.nama_pekerjaan || "N/A"}</span>
                                </div>
                                
                                <div className="print-field">
                                    <span className="print-label">ID Barang:</span>
                                    <span className="print-value">{spkData.kode_barang || 'N/A'}</span>
                                </div>
                                
                                <div className="print-field print-field-block">
                                    <span className="print-label">Uraian Pekerjaan:</span>
                                    <div className="print-text-block">{spkData.uraian_pekerjaan || "Tidak ada uraian pekerjaan tercatat."}</div>
                                </div>

                                <div className="print-signatures-grid">
                                    <div className="print-signature-item">
                                        <div className="print-signature-title">Pelaksana:</div>
                                        <div className="print-signature-box">
                                            {spkData.penanggung_jawab_ttd ? (
                                                <img src={getProxyFileUrl(spkData.penanggung_jawab_ttd) || ""} alt="TTD Pelaksana" className="print-signature-img" />
                                            ) : (
                                                <div className="print-signature-empty"></div>
                                            )}
                                            <div className="print-signature-name">{pic ? pic.name : '-'}</div>
                                            <div className="print-signature-npp">{pic ? `NPP. ${pic.npp}` : 'NPP. -'}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="print-signature-item">
                                        <div className="print-signature-title">Mengetahui:</div>
                                        <div className="print-signature-box">
                                            {ttdMengetahuiPreview ? (
                                                <img src={ttdMengetahuiPreview} alt="TTD Mengetahui" className="print-signature-img" />
                                            ) : (
                                                <div className="print-signature-empty"></div>
                                            )}
                                            <div className="print-signature-name">{spkData.mengetahui_name || "-"}</div>
                                            <div className="print-signature-npp">NPP. {spkData.mengetahui_npp || "..."}</div>
                                        </div>
                                    </div>
                                    
                                    <div className="print-signature-item">
                                        <div className="print-signature-title">Menyetujui:</div>
                                        <div className="print-signature-box">
                                            {ttdMenyetujuiPreview ? (
                                                <img src={ttdMenyetujuiPreview} alt="TTD Menyetujui" className="print-signature-img" />
                                            ) : (
                                                <div className="print-signature-empty"></div>
                                            )}
                                            <div className="print-signature-name">{spkData.menyetujui_name || "-"}</div>
                                            <div className="print-signature-npp">NPP. {spkData.menyetujui_npp || "..."}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CSS untuk tampilan cetak */}
            <style jsx global>{`
                @media print {
                    @page {
                        size: A4 landscape;
                        margin: 0; /* Ubah margin @page ke 0 agar kita bisa atur di body */
                    }
                    
                    /* Sembunyikan semua elemen body secara default */
                    body * {
                        visibility: hidden;
                    }

                    /* Reset body */
                    body {
                        margin: 0;
                        padding: 0;
                        background: white;
                    }
                    
                    /* Pastikan elemen Screen Only benar-benar hilang dari layout */
                    .screen-only {
                        display: none !important;
                    }
                    
                    /* Tampilkan Container Print */
                    .print-only, .print-only * {
                        visibility: visible; /* Override visibility hidden dari body */
                    }
                    
                    .print-only {
                        display: block !important;
                        position: absolute; /* KUNCI PERBAIKAN: Paksa elemen ke posisi absolut */
                        left: 0;
                        top: 0;
                        width: 100%;
                        min-height: 100vh;
                        padding: 10mm; /* Pindahkan margin kertas ke padding container */
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
                        width: 100%;
                        /* Gunakan min-height alih-alih fixed height agar konten tidak terpotong */
                        min-height: 180mm; 
                        border: 1px solid #000;
                    }
                    
                    .print-section {
                        flex: 1;
                        padding: 12px;
                        font-family: 'Times New Roman', serif;
                        font-size: 11px;
                        line-height: 1.4;
                    }
                    
                    .print-left {
                        border-right: 1px solid #000;
                    }
                    
                    .print-header {
                        margin-bottom: 15px;
                        text-align: center;
                    }
                    
                    .print-body {
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .print-field {
                        display: flex;
                        margin-bottom: 6px;
                        align-items: flex-start;
                    }
                    
                    .print-field-block {
                        flex-direction: column;
                        margin-bottom: 10px;
                    }
                    
                    .print-label {
                        font-weight: bold;
                        min-width: 100px;
                        margin-right: 5px;
                    }
                    
                    .print-value {
                        flex: 1;
                    }
                    
                    .print-personnel-list {
                        margin-bottom: 10px;
                        margin-left: 10px;
                    }
                    
                    .print-person-item {
                        margin-bottom: 3px;
                    }
                    
                    .print-pic-badge {
                        font-weight: bold;
                        color: #000; /* Ubah warna biru ke hitam untuk print */
                    }
                    
                    .print-text-block {
                        white-space: pre-wrap;
                        margin-top: 3px;
                        margin-left: 10px;
                        text-align: justify;
                    }
                    
                    .print-signatures-grid {
                        display: flex;
                        justify-content: space-between;
                        margin-top: auto; /* Dorong TTD ke bawah */
                        padding-top: 20px;
                    }
                    
                    .print-signature-item {
                        width: 30%;
                        text-align: center;
                    }
                    
                    .print-signature-title {
                        margin-bottom: 5px;
                        font-weight: bold;
                        font-size: 10px;
                    }
                    
                    .print-signature-box {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        min-height: 80px;
                    }
                    
                    .print-signature-img {
                        height: 50px;
                        width: auto;
                        margin-bottom: 5px;
                        max-width: 100%;
                        object-fit: contain;
                    }
                    
                    .print-signature-empty {
                        height: 50px;
                        width: 80px;
                        margin-bottom: 5px;
                    }
                    
                    .print-signature-name {
                        font-weight: bold;
                        border-top: 1px solid #000;
                        padding-top: 3px;
                        width: 100%;
                        font-size: 10px;
                    }
                    
                    .print-signature-npp {
                        font-size: 8px;
                        margin-top: 2px;
                    }
                    
                    /* Form styles untuk detail pengajuan */
                    .print-form-container {
                        margin-bottom: 20px;
                    }
                    
                    .print-form-row {
                        display: flex;
                        margin-bottom: 8px;
                        align-items: flex-start;
                    }
                    
                    .print-form-label {
                        font-weight: bold;
                        min-width: 200px;
                    }
                    
                    .print-form-value {
                        flex: 1;
                    }
                    
                    .print-form-value-block {
                        flex: 1;
                        white-space: pre-wrap;
                    }
                    
                    .print-signatures-section {
                        display: flex;
                        justify-content: space-between;
                        margin-top: 30px;
                    }
                    
                    .print-signature-left, .print-signature-right {
                        width: 45%;
                        text-align: center;
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

export default function SPKDetailPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat Halaman...</span>
            </div>
        }>
            <SPKDetailContent />
        </Suspense>
    );
}