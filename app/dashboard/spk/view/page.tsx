// app/dashboard/spk/view/page.tsx

"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Calendar, X, CheckCircle, Loader2, AlertTriangle, Users, ArrowLeft, ChevronDown, ChevronUp, File, Image as ImageIcon, Download, Printer, QrCode } from "lucide-react";
import QRCode from "react-qr-code";

// ====================================================================
// --- TYPES & CONSTANTS ----------------------------------------------
// ====================================================================

// --- KONFIGURASI API DIRECT ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=";
const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

const API_ENDPOINTS = {
    SPK_VIEW: `${API_BASE_URL}/spk/view`, // + /{uuid}
    PENGAJUAN_VIEW: `${API_BASE_URL}/pengajuan/view`, // + /{uuid}
};

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
// --- UTILITY FUNCTIONS UNTUK FILE/GAMBAR (DIRECT FETCH) -------------
// ====================================================================

// Mengambil gambar dari Server Storage menggunakan Token -> return Blob URL
async function fetchImageDirectly(pathOrUrl: string, token: string | null): Promise<string> {
    if (!pathOrUrl || pathOrUrl.trim() === '') return FALLBACK_IMAGE_URL;
    if (pathOrUrl.startsWith('data:')) return pathOrUrl; 

    try {
        let finalUrl = pathOrUrl;
        if (!pathOrUrl.startsWith('http')) {
            const sanitizedPath = pathOrUrl.startsWith('/') ? pathOrUrl.slice(1) : pathOrUrl;
            finalUrl = `${STORAGE_BASE_URL}${encodeURIComponent(sanitizedPath)}`;
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
        return FALLBACK_IMAGE_URL;
    }
}

// Proses Transparansi Gambar
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
                
                let hasInk = false;
                let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;

                if (useAdvanced) {
                   for (let i = 0; i < data.length; i += 4) {
                       const r = data[i], g = data[i + 1], b = data[i + 2];
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
            img.onerror = () => { resolve(dataUrl); };
        } catch (error) {
            resolve(dataUrl);
        }
    });
}

// Wrapper untuk TTD
async function fetchAndMakeTransparent(pathUrl: string, token: string | null): Promise<string> {
    const blobUrl = await fetchImageDirectly(pathUrl, token);
    return processImageTransparency(blobUrl);
}

// ====================================================================
// --- COMPONENTS -----------------------------------------------------
// ====================================================================

const ImageModal = ({ imageUrl, onClose }: { imageUrl: string | null, onClose: () => void }) => {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[9999]" onClick={onClose}>
            <div className="relative bg-white rounded-lg shadow-2xl max-w-4xl max-h-[90vh] overflow-auto" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition z-10" title="Tutup">
                    <X size={20} />
                </button>
                <img src={imageUrl} alt="Lampiran Detail" className="w-full h-auto max-w-[80vw] max-h-[85vh] object-contain p-2"/>
            </div>
        </div>
    );
};

const Button = ({ onClick, children, className = "bg-blue-600 hover:bg-blue-700 text-white", disabled = false }: any) => (
    <button onClick={onClick} className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={disabled}>
        {children}
    </button>
);

const ToastBox = ({ toast, onClose }: { toast: ToastMessage, onClose: () => void }) =>
    toast.show && (
        <div className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 transition-opacity duration-300 flex items-center gap-2 ${
                toast.type === "success" ? "bg-green-600" : (toast.type === "error" ? "bg-red-600" : "bg-yellow-600")
            }`}>
            {toast.message}
            <button onClick={onClose} className="text-white ml-2"><X size={14} /></button>
        </div>
    );

const Chip = ({ person }: { person: AssignedPerson }) => {
    return (
        <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full my-1 shadow-sm border border-blue-200">
            <div className={`mr-2 flex items-center justify-center`} title={person.isPic ? "Penanggung Jawab (PIC)" : "Anggota Tim"}>
                {person.isPic ? <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" /> : <div className="w-4 h-4 border-2 border-gray-400 rounded-full"></div>}
            </div>
            <Users className="w-4 h-4 mr-1 text-blue-600" />
            <span className="font-medium">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
        </div>
    );
};

const ViewBox = ({ value }: { value: string | undefined }) => {
    return (
        <div className={`min-h-[140px] p-2 text-black border border-gray-300 rounded-md shadow-inner text-sm bg-gray-100 cursor-not-allowed`} style={{ whiteSpace: "pre-wrap" }}>
            {value || "Tidak ada uraian pekerjaan tercatat."}
        </div>
    );
};

// ====================================================================
// --- COLLAPSIBLE COMPONENTS -----------------------------------------
// ====================================================================

const PengajuanDetailView = ({ detail, onImageClick }: { detail: PengajuanDetail; onImageClick: (url: string) => void; }) => {
    const [ttdPelaporBlob, setTtdPelaporBlob] = useState<string | null>(null);
    const [ttdMengetahuiBlob, setTtdMengetahuiBlob] = useState<string | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if(detail.ttd_pelapor_path) fetchAndMakeTransparent(detail.ttd_pelapor_path, token).then(setTtdPelaporBlob);
        if(detail.ttd_mengetahui_path) fetchAndMakeTransparent(detail.ttd_mengetahui_path, token).then(setTtdMengetahuiBlob);
    }, [detail]);

    return (
        <div className="space-y-1 text-sm pb-4 mb-4 border-b border-gray-200 print:border-none">
            <h4 className="font-bold underline mb-2 mt-2 text-md print:text-sm print:font-bold">DETAIL PENGAJUAN</h4>
            
            <div className="grid grid-cols-2 gap-4 text-xs print:text-[12px] mb-2">
                <div className="flex"><div className="w-[120px] text-gray-700">No. Pengajuan</div><div className="flex-1">:{detail.no_surat || '-'}</div></div>
                <div className="flex"><div className="w-[80px] text-gray-700">Tanggal</div><div className="flex-1">:{formatLongDate(detail.tanggal)}</div></div>
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
                    <div className="text-center h-40 flex flex-col justify-end items-center">
                        {ttdMengetahuiBlob ? (
                            <div className="h-32 w-full flex justify-center items-center">
                                <img src={ttdMengetahuiBlob} alt="TTD Mengetahui" className="h-full w-auto object-contain mb-1" />
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
                        {ttdPelaporBlob ? (
                            <div className="h-32 w-full flex justify-center items-center">
                                <img 
                                    src={ttdPelaporBlob} alt="TTD Pelapor" className="h-full w-auto object-contain mb-1 cursor-pointer" 
                                    onClick={() => onImageClick(ttdPelaporBlob)}
                                />
                            </div>
                        ) : (
                            <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak tersedia.</span>
                        )}
                        <p className="text-xs mt-1 text-gray-700">{detail.name_pelapor}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SPKSettingsView = ({ spkData, fotoPekerjaan, onImageClick }: { spkData: SPKDetail; fotoPekerjaan: any[]; onImageClick: (url: string) => void; }) => {
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
                    <ViewBox value={spkData.uraian_pekerjaan || ""} />
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
                                        <button type="button" onClick={(e) => { e.stopPropagation(); onImageClick(foto.preview); }} className="absolute top-1 left-1 bg-blue-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition" title="Lihat gambar">
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
                    <span className={`inline-block px-3 py-1 rounded-full text-white text-xs ${spkData.status?.name === 'Selesai' ? 'bg-green-600' : 'bg-orange-500'}`}>
                        {spkData.status?.name || 'N/A'}
                    </span>
                </div>
            </div>
        </div>
    );
};

const RequestDetailCollapse = ({ spkData, modalImageUrl, setModalImageUrl, fotoPekerjaan, onImageClick, showToast }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [detail, setDetail] = useState<PengajuanDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);

    const toggle = () => setIsOpen(!isOpen);

    const fetchRequestDetail = useCallback(async () => {
        if (!spkData.uuid_pengajuan) return;
        
        setLoading(true); 
        setLoadError(null);
        
        const url = `${API_ENDPOINTS.PENGAJUAN_VIEW}/${spkData.uuid_pengajuan}`;
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        
        try {
            if (!token) throw new Error("Otorisasi hilang. Mohon login ulang.");
            const res = await fetch(url, { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                } 
            });
            const result = await res.json();
            if (!res.ok || !result.success || !result.data) throw new Error(result.message || `Gagal memuat detail pengajuan.`);
            
            const data = result.data;
            const masterhal = result.masterhal;
            const parentSatker = result.kd_parent?.parent_satker || data.satker || 'N/A';

            const detailData = {
                uuid: data.uuid, 
                no_surat: data.no_surat, 
                nama_jenis: masterhal?.nama_jenis || data.hal || 'N/A', 
                hal_id: masterhal?.kode || data.hal_id || 'N/A', 
                kepada: data.kepada || 'N/A', 
                satker: parentSatker,
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
            <button onClick={toggle} className="w-full text-left p-3 font-semibold text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors flex justify-between items-center print:hidden">
                <span>{isOpen ? '🔽 Sembunyikan' : '➡️ Tampilkan'} Detail Pengajuan & Pengaturan Pekerjaan</span>
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {isOpen && (
                <div className={`p-4 bg-white border-t border-gray-200 transition-all duration-300 print:block print:border-none print:p-0`}>
                    {loading && <div className="flex items-center text-blue-600"><Loader2 className="animate-spin mr-2 w-4 h-4" /> Memuat data...</div>}
                    {loadError && <div className="text-red-600 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Error: {loadError}</div>}

                    {detail && <PengajuanDetailView detail={detail} onImageClick={onImageClick} />}
                    
                    <SPKSettingsView spkData={spkData} fotoPekerjaan={fotoPekerjaan} onImageClick={onImageClick} />
                </div>
            )}
        </div>
    );
};

// ====================================================================
// --- MAIN COMPONENT (UPDATED) --------------------------------------
// ====================================================================

function SPKDetailContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const spk_uuid = useMemo(() => {
        return searchParams.get('uuid') || searchParams.get('view'); 
    }, [searchParams]);

    const [spkData, setSpkData] = useState<SPKDetail | null>(null);
    const [assignedPeople, setAssignedPeople] = useState<AssignedPerson[]>([]);
    
    const [pengajuanDetail, setPengajuanDetail] = useState<PengajuanDetail | null>(null);
    const [fotoPengajuan, setFotoPengajuan] = useState<any[]>([]);
    const [ttdPelaporPengajuan, setTtdPelaporPengajuan] = useState<string | null>(null);
    const [ttdMengetahuiPengajuan, setTtdMengetahuiPengajuan] = useState<string | null>(null);

    const [fotoPekerjaan, setFotoPekerjaan] = useState<any[]>([]);
    
    const [ttdMengetahuiPreview, setTtdMengetahuiPreview] = useState<string | null>(null);
    const [ttdMenyetujuiPreview, setTtdMenyetujuiPreview] = useState<string | null>(null);
    const [ttdPelaksanaPreview, setTtdPelaksanaPreview] = useState<string | null>(null);

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
        if (!pengajuanDetail && spkData?.uuid_pengajuan) {
            showToast("Sedang memuat detail pengajuan untuk cetak...", "warning");
            return; 
        }
        window.print();
    };

    const handleImageClick = (fileUrl: string) => {
        setModalImageUrl(fileUrl);
    };

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

    const fetchPengajuanForPrint = useCallback(async (uuid: string) => {
        const token = localStorage.getItem('token');
        if(!token) return;

        try {
            const url = `${API_ENDPOINTS.PENGAJUAN_VIEW}/${uuid}`;
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
        if (!spk_uuid) {
            setError("UUID SPK tidak ditemukan dalam URL.");
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError(null);

        const url = `${API_ENDPOINTS.SPK_VIEW}/${spk_uuid}`;
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;

        try {
            if (!token) throw new Error("Otorisasi hilang. Silakan login ulang.");

            const res = await fetch(url, { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                } 
            });

            if (!res.ok) throw new Error(`Gagal memuat data SPK. Status: ${res.status}`);

            const result = await res.json();
            if (!result.success) throw new Error(result.message || "Gagal memuat data dari API.");

            const item = result.data as SPKDetail;
            setSpkData(item);
            
            const personnel = item.stafs || [];
            setAssignedPeople(personnel.map((p: any) => ({
                name: p.nama,
                npp: p.npp,
                isPic: !!p.is_penanggung_jawab || (p.is_penanggung_jawab === 1),
                jabatan: null,
            })));
            
            if (item.file && item.file.length > 0) {
                const photoPromises = item.file.map(async (path, index) => {
                    if (index < 4) { 
                        try {
                            const previewUrl = await fetchImageDirectly(path, token);
                            return { file: null, preview: previewUrl, path: path };
                        } catch (error) {
                            console.error(`Error loading photo ${index}:`, error);
                        }
                    }
                    return { file: null, preview: null };
                });
                
                const loadedPhotos = await Promise.all(photoPromises);
                while (loadedPhotos.length < 4) loadedPhotos.push({file:null,preview:null});
                setFotoPekerjaan(loadedPhotos);
            } else {
                setFotoPekerjaan([{file:null,preview:null},{file:null,preview:null},{file:null,preview:null},{file:null,preview:null}]);
            }
            
            if (item.mengetahui_ttd) fetchAndMakeTransparent(item.mengetahui_ttd, token).then(setTtdMengetahuiPreview);
            if (item.menyetujui_ttd) fetchAndMakeTransparent(item.menyetujui_ttd, token).then(setTtdMenyetujuiPreview);
            if (item.penanggung_jawab_ttd) fetchAndMakeTransparent(item.penanggung_jawab_ttd, token).then(setTtdPelaksanaPreview);

            if (item.uuid_pengajuan) {
                fetchPengajuanForPrint(item.uuid_pengajuan);
            }

        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan saat memuat SPK.");
        } finally {
            setIsLoading(false);
        }
    }, [spk_uuid, fetchPengajuanForPrint]);

    const pic = useMemo(() => {
        return assignedPeople.find(p => p.isPic);
    }, [assignedPeople]);

    useEffect(() => {
        fetchDetailSPK();
    }, [fetchDetailSPK]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
            </div>
        );
    }

    if (error || !spkData) {
        return (
            <div className="p-8 space-y-6 text-center bg-white min-h-screen border-t-4 border-red-500">
                <AlertTriangle className="inline-block text-red-500" size={48} />
                <h2 className="text-3xl font-extrabold text-red-600">Akses Ditolak / Data Tidak Ditemukan</h2>
                <p className="text-gray-700 text-lg">Error: {error || "Data SPK tidak dapat dimuat."}</p>
                <button onClick={() => router.push("/dashboard/spk")} className="mt-4 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors flex items-center mx-auto">
                    <ArrowLeft size={16} className="mr-2" /> Kembali ke Daftar SPK
                </button>
            </div>
        );
    }

    const { no_surat, tanggal } = spkData;
    const todayDate = new Date();
    const formatDateIndo = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(todayDate);

    return (
        <div className="p-6 min-h-screen bg-gray-100 font-sans">
            <ToastBox toast={toast} onClose={closeToast} />
            <ImageModal imageUrl={modalImageUrl} onClose={() => setModalImageUrl(null)} />

            <div className="max-w-4xl mx-auto mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg text-center items-center justify-center print:hidden">
                <Users className="mr-2 inline" size={20} />
                Anda berada dalam Mode Lihat Detail murni. Data tidak dapat diubah di halaman ini.
            </div>

            <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-xl rounded-xl">
                <div className="flex items-center justify-between border-b px-6 py-3 bg-cyan-50 rounded-t-xl print:hidden">
                    <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <ArrowLeft size={20} className="cursor-pointer hover:text-blue-600 transition" onClick={() => router.push("/dashboard/spk")} />
                        Detail SPK: {no_surat}
                    </h1>
                    <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md flex items-center gap-1">
                        <Printer size={16}/> Cetak (A3 Landscape)
                    </Button>
                </div>

                {/* Tampilan Normal di Layar (Screen Only) */}
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
                                <div className="w-1/2 text-center flex flex-col justify-end items-center">
                                    <div className="mb-8 flex flex-col items-center justify-center">
                                        <div className="bg-white p-1 border border-gray-200 rounded">
                                            {spkData && spkData.uuid_pengajuan ? (
                                                <QRCode size={70} value={`${window.location.origin}/tracking/${spkData.uuid_pengajuan}`} viewBox={`0 0 256 256`} />
                                            ) : <div className="w-[70px] h-[70px] flex items-center justify-center bg-gray-100 rounded"><Loader2 className="animate-spin text-gray-400" size={24} /></div>}
                                        </div>
                                        <div className="text-[9px] text-gray-500 mt-1 font-mono tracking-tighter">SCAN TRACKING</div>
                                    </div>

                                    <div className="w-full">
                                        <div className="pb-1">Mengetahui</div>
                                        <div className="font-semibold flex items-end justify-center min-h-[10px] px-4">
                                            {spkData.mengetahui || "Ka. Bid Pengembangan Program"}
                                        </div>
                                        <div style={{ height: 15 }}></div>
                                        <div className="flex justify-center items-center h-[100px] w-[200px] relative mb-1 mx-auto">
                                            {ttdMengetahuiPreview ? (
                                                <div className="relative group w-full h-full flex justify-center items-center">
                                                    <img src={ttdMengetahuiPreview} alt="TTD Mengetahui" className="h-[100px] w-auto object-contain" />
                                                </div>
                                            ) : <div className="h-[100px]"></div>}
                                        </div>
                                        <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-2 mx-auto">
                                            {spkData.mengetahui_name || "-"}
                                        </div>
                                        <div className="text-xs">NPP. {spkData.mengetahui_npp || "..."}</div>
                                    </div>
                                </div>

                                <div className="w-1/2 flex flex-col justify-between">
                                    <div className="text-center">
                                        <div className="font-semibold mb-2">Pelaksana</div>
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="flex justify-center items-center h-[100px] w-[200px] relative mb-1">
                                                {ttdPelaksanaPreview ? (
                                                    <div className="relative group w-full h-full flex justify-center items-center">
                                                        <img src={ttdPelaksanaPreview} alt="TTD Pelaksana" className="h-[100px] w-auto object-contain" />
                                                    </div>
                                                ) : <div className="h-[100px]"></div>}
                                            </div>
                                            {pic ? (
                                                <>
                                                    <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-1 mx-auto text-xs whitespace-nowrap">{pic.name}</div>
                                                    <div className="text-[10px]">{pic.npp ? `NPP. ${pic.npp}` : 'NPP. -'}</div>
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
                                            {spkData.menyetujui || "Ka. Sub Bid TI"}
                                        </div>
                                        <div style={{ height: 15 }}></div>
                                        <div className="flex justify-center items-center h-[100px] w-[200px] relative mb-1 mx-auto">
                                            {ttdMenyetujuiPreview ? (
                                                <div className="relative group w-full h-full flex justify-center items-center">
                                                    <img src={ttdMenyetujuiPreview} alt="TTD Menyetujui" className="h-[100px] w-auto object-contain" />
                                                </div>
                                            ) : <div className="h-[100px]"></div>}
                                        </div>
                                        <div className="font-bold border-t border-black inline-block mt-1 pt-1 text-black px-2 mx-auto">
                                            {spkData.menyetujui_name || "-"}
                                        </div>
                                        <div className="text-xs">NPP. {spkData.menyetujui_npp || "..."}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tampilan Khusus untuk Cetak (A3 LANDSCAPE) */}
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
        <p className="text-center text-[11pt] font-bold mb-[5px]">(NO: {no_surat})</p>
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
            <span className="print-value flex-1 text-[10pt] pt-[2px]">:{spkData.jenis_pekerjaan?.nama_pekerjaan || "N/A"}</span>
        </div>
        
        <div className="print-field flex items-center mt-[5px]">
            <span className="print-label font-bold w-[130px]">Kode Barang</span>
            <span className="print-value flex-1 text-[10pt] pt-[2px]">
                :{pengajuanDetail?.kode_barang || spkData.kode_barang || 'N/A'}
            </span>
        </div>
        
        <div className="print-field-block mt-[10px] w-full">
            <span className="print-label font-bold block mb-[5px]">Uraian Pekerjaan:</span>
            <div className="print-text-block border border-black p-[8px] min-h-[60px] text-[10pt] leading-tight w-full">
                {spkData.uraian_pekerjaan || "Tidak ada uraian."}
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
                    {spkData.status?.name === 'Selesai' ? '✓' : ''}
                </div>
                <span>Selesai</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[12pt]">
                    {spkData.status?.name === 'Belum Selesai' ? '✓' : ''}
                </div>
                <span>Belum Selesai</span>
            </div>
            <div className="flex items-center gap-2">
                <div className="w-4 h-4 border border-black flex items-center justify-center font-bold text-[12pt]">
                    {spkData.status?.name === 'Tidak Selesai' ? '✓' : ''}
                </div>
                <span>Tidak Selesai</span>
            </div>
        </div>

        {/* PENATAAN TTD: MENGETAHUI & MENYETUJUI SEJAJAR DI PALING BAWAH */}
        <div className="mt-[10px] grid grid-cols-2 gap-x-4 w-full h-[320px]">
            <div className="flex flex-col justify-between items-center h-full">
                <div className="flex flex-col items-center">
                    <div className="bg-white p-1 border border-black rounded mb-1">
                        {spkData && spkData.uuid_pengajuan ? (
                            <QRCode size={60} value={`${window.location.origin}/tracking/${spkData.uuid_pengajuan}`} />
                        ) : null}
                    </div>
                    <div className="text-[7pt] font-bold uppercase">Scan Tracking</div>
                </div>

                <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-[9pt] mb-1">Mengetahui:</div>
                    <div className="text-[7pt] text-center leading-tight h-[15px] font-semibold mb-1 uppercase">
                        {spkData.mengetahui}
                    </div>
                    <div className="h-[50px] flex items-center justify-center">
                        {ttdMengetahuiPreview && <img src={ttdMengetahuiPreview} alt="TTD" className="h-full object-contain" />}
                    </div>
                    <div className="font-bold border-t border-black w-[80%] text-center pt-1 text-[8pt] mt-1 uppercase">
                        {spkData.mengetahui_name || "-"}
                    </div>
                    <div className="text-[7pt]">NPP. {spkData.mengetahui_npp || "..."}</div>
                </div>
            </div>

            <div className="flex flex-col justify-between items-center h-full">
                <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-[9pt] mb-1">Pelaksana:</div>
                    <div className="h-[65px] flex items-center justify-center">
                        {ttdPelaksanaPreview && <img src={ttdPelaksanaPreview} alt="TTD" className="h-full object-contain" />}
                    </div>
                    <div className="font-bold border-t border-black w-[80%] text-center pt-1 text-[8pt] mt-1 uppercase">
                        {pic ? pic.name : '-'}
                    </div>
                    <div className="text-[7pt]">NPP. {pic ? pic.npp : '...'}</div>
                </div>

                <div className="flex flex-col items-center w-full">
                    <div className="font-bold text-[9pt] mb-1">Menyetujui:</div>
                    <div className="text-[7pt] text-center leading-tight h-[15px] font-semibold mb-1 uppercase">
                        {spkData.menyetujui}
                    </div>
                    <div className="h-[50px] flex items-center justify-center">
                        {ttdMenyetujuiPreview && <img src={ttdMenyetujuiPreview} alt="TTD" className="h-full object-contain" />}
                    </div>
                    <div className="font-bold border-t border-black w-[80%] text-center pt-1 text-[8pt] mt-1 uppercase">
                        {spkData.menyetujui_name || "-"}
                    </div>
                    <div className="text-[7pt]">NPP. {spkData.menyetujui_npp || "..."}</div>
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
                        size: A3 landscape; /* UPDATE: A3 Landscape */
                        margin: 10mm; /* Margin agar isi tidak terpotong printer */
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
                        /* UPDATE: Menghapus height fixed 210mm agar memenuhi kertas A3 */
                        height: 100%; 
                        page-break-inside: avoid;
                    }
                    
                    .print-section {
                        padding: 10mm;
                        font-family: 'Times New Roman', serif;
                        line-height: 1.4;
                        /* UPDATE: Pastikan kolom memanjang penuh */
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

                    /* Styles dari Lampiran View */
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