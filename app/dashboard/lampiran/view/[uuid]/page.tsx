"use client";

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from "next/navigation";
import { Loader2, AlertTriangle, Eye, Printer, FileText, X, Lock, Home } from 'lucide-react';

// --- KONFIGURASI API DIRECT (DARI ENV) ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/?path=";

const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

async function fetchImageDirectly(pathOrUrl: string, token: string | null): Promise<string> {
    if (!pathOrUrl) return FALLBACK_IMAGE_URL;
    if (pathOrUrl.startsWith('data:')) return pathOrUrl; 

    try {
        let finalUrl = pathOrUrl;
        if (!pathOrUrl.startsWith('http')) {
            finalUrl = `${STORAGE_BASE_URL}${encodeURIComponent(pathOrUrl)}`;
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
        } catch (error) {
            resolve(dataUrl);
        }
    });
}

async function fetchAndMakeTransparent(pathUrl: string, token: string | null): Promise<string> {
    const blobUrl = await fetchImageDirectly(pathUrl, token);
    return processImageTransparency(blobUrl);
}

// --- DEFINISI TIPE DATA ---
type MasterHal = {
    id: number;
    kode: string;
    nama_jenis: string;
    created_at: string | null;
    updated_at: string | null;
    status: number;
};

type DetailData = {
    uuid: string;
    no_surat: string;
    keterangan: string;
    hal: string;
    hal_id: string;
    no_referensi: string;
    status: string;
    name_pelapor: string;
    npp_pelapor: string;
    kepada: string;
    satker: string;
    created_at: string;
    mengetahui: string | null;
    mengetahui_name: string | null;
    mengetahui_npp: string | null;
    ttd_mengetahui: string | null;
    ttd_pelapor: string | null; 
    file: string[] | string | null;
    kode_barang: string;
    catatan_status: string | null;
    masterhal: MasterHal | null;
    display_kepada?: string;
    display_satker_asal?: string;
};

type ApiResponseDetail = {
    success: boolean;
    data: DetailData; 
    masterhal?: MasterHal;
    kd_satker?: { satker_name: string };
    kd_parent?: { parent_satker: string };
};

type ModalViewer = {
    isOpen: boolean;
    src: string | null;
    isPdf: boolean;
    title: string;
};

// --- SUB COMPONENTS ---

const MediaViewerModal = ({ viewer, onClose }: { viewer: ModalViewer, onClose: () => void }) => {
    if (!viewer.isOpen || !viewer.src) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-5xl h-full max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-3 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">{viewer.title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700 p-1 transition-colors">
                        <X size={24} />
                    </button>
                </div>
                <div className="flex-1 p-2 overflow-auto">
                    {viewer.isPdf ? (
                        <iframe
                            src={viewer.src}
                            title={viewer.title}
                            className="w-full h-full min-h-[70vh] border-0"
                            allowFullScreen
                        />
                    ) : (
                        <div className="flex justify-center items-center h-full">
                            <img src={viewer.src} alt={viewer.title} className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                </div>
                <div className="p-3 border-t text-center text-sm text-gray-500">
                    {viewer.isPdf ? 'Pratinjau PDF' : 'Pratinjau Gambar'}
                </div>
            </div>
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
                    Maaf, Anda tidak memiliki izin untuk melihat detail pengajuan ini.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-black mb-1">Membutuhkan salah satu izin:</p>
                    <ul className="list-disc list-inside text-sm text-red-600 font-mono">
                        <li>workorder-pti.pengajuan.view</li>
                        <li>workorder-pti.pengajuan.riwayat.view</li>
                    </ul>
                </div>
                <button onClick={() => router.push('/dashboard')} className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-md">
                    <Home size={18} /> Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
};

// --- MAIN COMPONENT ---
export default function DetailPengajuanPage() {
    const params = useParams();
    const uuid = params?.uuid as string;
    const router = useRouter();
    
    // State
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);
    const [data, setData] = useState<DetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
    const [ttdMengetahuiPreview, setTtdMengetahuiPreview] = useState<string | null>(null); 
    const [filePreviews, setFilePreviews] = useState<string[]>([]);
    const [viewerModal, setViewerModal] = useState<ModalViewer>({ isOpen: false, src: null, isPdf: false, title: '' });
    
    const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
    const todayStr = `Semarang, ${formatDate(new Date())}`;

    const handleViewMedia = (src: string, isPdf: boolean, title: string) => {
        setViewerModal({ isOpen: true, src, isPdf, title });
    };

    const handleCloseMediaViewer = () => {
        setViewerModal({ isOpen: false, src: null, isPdf: false, title: '' });
    };

    // --- 1. CHECK PERMISSION ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            let perms: string[] = [];
            if (storedPermissions) {
                try { perms = JSON.parse(storedPermissions); } 
                catch (e) { console.error("Error parsing permissions", e); }
            }
            const hasViewPermission = perms.includes('workorder-pti.pengajuan.view');
            const hasRiwayatViewPermission = perms.includes('workorder-pti.pengajuan.riwayat.view');
            setHasAccess(hasViewPermission || hasRiwayatViewPermission);
            setPermissionsLoaded(true);
        }
    }, []);

    // --- 2. FETCH DATA (DIRECT API) ---
    useEffect(() => {
        const fetchDetail = async () => {
            if (!uuid) return;
            setLoading(true);
            setError(null);
            
            const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
            if (!token) {
                setError("Token otorisasi tidak ditemukan. Mohon login ulang.");
                setLoading(false);
                return;
            }

            try {
                // --- FETCH DATA JSON UTAMA (DIRECT) ---
                const response = await fetch(`${API_BASE_URL}/pengajuan/view/${uuid}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                });

                const result: ApiResponseDetail = await response.json();

                if (!response.ok || !result.success) {
                    setError(result.data ? (result.data as any).message : "Gagal memuat detail data.");
                    return;
                }
                
                const fetchedData: DetailData = {
                    ...result.data,
                    masterhal: result.masterhal || null,
                    display_kepada: result.kd_satker?.satker_name || result.data.kepada,
                    display_satker_asal: result.kd_parent?.parent_satker || result.data.satker
                };
                
                setData(fetchedData);
                
                // --- 3. FETCH & PROSES GAMBAR (DIRECT FETCH BLOB) ---
                // Menghindari Proxy, kita fetch blob langsung dari storage url menggunakan token
                
                // TTD Pelapor
                if (fetchedData.ttd_pelapor) {
                    const processed = await fetchAndMakeTransparent(fetchedData.ttd_pelapor, token);
                    setTtdPelaporPreview(processed);
                }

                // TTD Mengetahui
                if (fetchedData.ttd_mengetahui) {
                    const processed = await fetchAndMakeTransparent(fetchedData.ttd_mengetahui, token);
                    setTtdMengetahuiPreview(processed);
                }

                // Lampiran Files
                let rawFiles: string[] = [];
                if (Array.isArray(fetchedData.file)) {
                    rawFiles = fetchedData.file;
                } else if (fetchedData.file && typeof fetchedData.file === 'string') {
                    try { rawFiles = JSON.parse(fetchedData.file); } 
                    catch (e) { rawFiles = fetchedData.file.replace(/[\[\]"]/g, '').split(',').map(s => s.trim()).filter(s => s.length > 0); }
                }
                
                if (rawFiles.length > 0) {
                    // Fetch setiap file sebagai Blob URL agar bisa ditampilkan
                    const fileUrls = await Promise.all(rawFiles.map(async (path) => {
                        return await fetchImageDirectly(path, token);
                    }));
                    setFilePreviews(fileUrls);
                }

            } catch (err: any) {
                setError(`Terjadi kesalahan koneksi atau server: ${err.message || err.toString()}`);
            } finally {
                setLoading(false);
            }
        };

        if (permissionsLoaded && hasAccess) {
            fetchDetail();
        } else if (permissionsLoaded && !hasAccess) {
            setLoading(false); 
        }
    }, [uuid, permissionsLoaded, hasAccess]);
    
    const handlePrint = () => {
        setIsPrintMode(true);
        setTimeout(() => {
            window.print();
            setIsPrintMode(false);
        }, 300);
    };

    if (!permissionsLoaded) return <div className="flex items-center justify-center h-screen bg-gray-50"><Loader2 className="animate-spin text-blue-600 mr-2" size={32}/><span className="text-xl text-gray-700">Memeriksa izin akses...</span></div>;
    if (!hasAccess) return <AccessDeniedUI />;
    if (loading) return <div className="flex items-center justify-center h-screen bg-gray-50"><Loader2 className="animate-spin text-blue-600 mr-2" size={32}/><span className="text-xl text-gray-700">Memuat Detail Pengajuan...</span></div>;
    if (error) return <div className="p-8 text-center bg-red-100 text-red-700 rounded-lg m-8 border border-red-300"><AlertTriangle className="inline-block mr-2" size={24}/><h2 className="text-xl font-bold">Gagal Memuat Data</h2><p>{error}</p></div>;
    if (!data) return <div className="p-8 text-center bg-gray-100 text-gray-700 rounded-lg m-8 border border-gray-300"><h2 className="text-xl font-bold">Data Tidak Ditemukan</h2></div>;
    
    const { no_surat, no_referensi, keterangan, status, name_pelapor, npp_pelapor, mengetahui, masterhal, catatan_status, display_kepada, display_satker_asal } = data;
    const halDisplay = masterhal?.nama_jenis || data.hal || "-";
    const jabatanMengetahui = mengetahui || "...........................";

    return (
        <div className="p-6 min-h-screen">
            <style>{`
                @page { size: A4; margin: 20mm; }
                @media print {
                    body * { visibility: hidden !important; }
                    #print-area, #print-area * { visibility: visible !important; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
                    .no-print { display: none !important; }
                    .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
                }
                .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
                .ttd-container { border: 1px solid #ccc; }
                .kepada-yth-container { line-height: 1.2; }
                .kepada-yth-container div { margin-bottom: 2px; }
                .kepada-yth-container .font-semibold { margin-bottom: 5px; }
            `}</style>
            
            <MediaViewerModal viewer={viewerModal} onClose={handleCloseMediaViewer} />

            <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
                
                <div className="p-4 flex items-center justify-between border-b no-print">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded text-white"><Eye /></div>
                        <div>
                            <div className="font-semibold text-base">Detail Pengajuan Status: {status}</div>
                            <div className="text-xs text-gray-500">(No: {no_surat || 'N/A'})</div>
                        </div>
                    </div>
                    <button onClick={handlePrint} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2 hover:bg-blue-700 transition">
                        <Printer size={16} /> Cetak Form
                    </button>
                </div>
                
                {status && status.toLowerCase() === 'rejected' && catatan_status && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 no-print">
                        <div className="flex">
                            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">Catatan Penolakan</h3>
                                <div className="mt-2 text-sm text-red-700"><p>{catatan_status}</p></div>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* Area Konten Cetak */}
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
                                <span className="font-normal">{halDisplay}</span> 
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold whitespace-nowrap">Ref. Surat:</span>
                                <span className="font-normal text-xs">{no_referensi|| "-"}</span>
                            </div>
                        </div>

                        <div className="w-1/2 text-sm kepada-yth-container">
                            Kepada Yth. 
                            <div className="font-semibold">{display_kepada || "-"}</div>
                            PERUMDA AIR MINUM Tirta Moedal <div>di <strong>SEMARANG</strong></div>
                        </div>
                    </div>
                    
                    <div className="mt-3 text-sm grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 font-semibold">Satker Asal:</div>
                        <div className="col-span-9">
                            <span className="p-1 border border-gray-300 rounded block bg-gray-100/50">
                                {display_satker_asal || "-"}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center mt-3 text-sm">
                        <div className="col-span-3 font-semibold">Kode Barang :</div>
                        <div className="col-span-9">
                            <span className="p-1 border border-gray-300 rounded block bg-gray-100/50">
                                {data.kode_barang || "-"}
                            </span>
                        </div>
                    </div>
                    
                    <div className="mt-4 big-box text-sm">
                        <div style={{ whiteSpace: "pre-wrap" }}>{keterangan || "Tidak ada keterangan."}</div>
                    </div>
                    
                    {filePreviews.length > 0 && (
                        <div className="mt-4 pt-4 border-t text-sm">
                            <div className="font-semibold mb-2">Lampiran File :</div>
                            <div className="grid grid-cols-4 gap-3">
                                {filePreviews.map((src, i) => {
                                    // Deteksi PDF based on content (sedikit tricky dengan blob url, tapi nama file asli sudah tidak ada)
                                    // Kita coba render sebagai image dulu, kalau error (karena pdf), kita anggap PDF?
                                    // Atau lebih baik kita asumsikan semua image, dan sediakan tombol "Buka PDF" jika gagal render
                                    
                                    // NOTE: Blob URL tidak punya ekstensi. Kita gunakan state 'isPdf' di modal viewer.
                                    // Untuk thumbnail, kita coba tampilkan IMG.
                                    
                                    const title = `Lampiran File #${i + 1}`;
                                    
                                    return (
                                        <div key={i} onClick={() => handleViewMedia(src, false, title)} className="block cursor-pointer">
                                            <img 
                                                src={src} 
                                                alt={`Lampiran ${i + 1}`} 
                                                className="w-full h-24 object-cover rounded border border-gray-300 hover:border-blue-500 transition-colors"
                                                onError={(e) => {
                                                    // Jika gagal load sebagai image, mungkin PDF. Ganti icon PDF.
                                                    e.currentTarget.style.display = 'none';
                                                    e.currentTarget.parentElement!.classList.add('bg-red-50', 'flex', 'items-center', 'justify-center');
                                                    e.currentTarget.parentElement!.innerHTML = `
                                                        <div class="text-center p-2">
                                                            <svg class="w-8 h-8 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                                            <span class="text-xs text-red-700 block mt-1">Dokumen/PDF</span>
                                                        </div>
                                                    `;
                                                    // Update modal click handler to open as PDF iframe
                                                    e.currentTarget.parentElement!.onclick = () => handleViewMedia(src, true, title);
                                                }}
                                            />
                                            <span className="text-xs text-gray-600 mt-1 block truncate">File {i + 1}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 text-xs text-left">
                        Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
                    </div>
                    
                    <div className="mt-16 flex justify-between px-10 text-center">
                        {/* Kolom Mengetahui */}
                        <div className="flex flex-col items-center w-[200px]">
                            <div className="h-12 flex flex-col justify-end pb-2">
                                <div className="text-sm font-semibold">Mengetahui</div>
                                <div className="text-[10px] leading-none text-gray-600 max-w-[180px]">{jabatanMengetahui}</div> 
                            </div>
                            <div className="w-[200px] h-[80px] flex items-center justify-center my-1">
                                {ttdMengetahuiPreview && (
                                    <img src={ttdMengetahuiPreview} alt="TTD Mengetahui" className="max-w-full max-h-full object-contain"/>
                                )}
                            </div>
                            <div className="mt-1 w-full">
                                <div className="text-sm font-medium underline decoration-gray-400 underline-offset-2 break-words">
                                    {data.mengetahui_name || "(...........................)"}
                                </div>
                                <div className="text-xs mt-0.5">
                                    NPP: {data.mengetahui_npp || "__________"} 
                                </div>
                            </div>
                        </div>

                        {/* Kolom Pelapor */}
                        <div className="flex flex-col items-center w-[200px]">
                            <div className="h-12 flex flex-col justify-end pb-2">
                                <div className="text-sm font-semibold">Pelapor</div>
                            </div>
                            <div className="w-[200px] h-[80px] flex items-center justify-center my-1">
                                {ttdPelaporPreview && (
                                    <img src={ttdPelaporPreview} alt="Tanda tangan pelapor" className="max-w-full max-h-full object-contain"/>
                                )}
                            </div>
                            <div className="mt-1 w-full">
                                <div className="text-sm font-medium underline decoration-gray-400 underline-offset-2 break-words">
                                    {name_pelapor || "(...........................)"}
                                </div>
                                <div className="text-xs mt-0.5">
                                    NPP: {npp_pelapor || "__________"}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-center mt-6 no-print">
                <button onClick={() => router.back()} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors shadow-md">
                    Kembali ke Daftar Pengajuan
                </button>
            </div>
        </div>
    );
}