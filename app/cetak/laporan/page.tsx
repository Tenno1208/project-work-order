"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertTriangle, ArrowLeft, Printer } from 'lucide-react';

export default function CetakLaporanPage() {
    return (
        <Suspense fallback={<div className="h-screen bg-white flex items-center justify-center text-black">Menyiapkan Dokumen...</div>}>
            <LaporanContent />
        </Suspense>
    );
}

function LaporanContent() {
    const searchParams = useSearchParams();
    
    // State
    const [params, setParams] = useState<any>({});
    const [data, setData] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null); 
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [printDate, setPrintDate] = useState(""); 

    // --- INISIALISASI ---
    useEffect(() => {
        const init = async () => {
            // A. Set Tanggal Cetak
            const now = new Date();
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0'); 
            const year = now.getFullYear();
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            setPrintDate(`${day}-${month}-${year} ${hours}:${minutes} WIB`);

            // B. AMBIL DATA DARI LOCAL STORAGE
            let currentParams: any = {};
            const storedData = localStorage.getItem("temp_print_data");
            
            if (storedData) {
                try {
                    currentParams = JSON.parse(storedData);
                } catch (e) { console.error(e); }
            } 
            
            // Fallback ke URL jika localStorage kosong
            if (!currentParams.mode) {
                currentParams.mode = searchParams.get('mode');
            }

            setParams(currentParams);

            if (!currentParams.mode) {
                setLoading(false);
                return; 
            }

            // C. Fetch Data ke Server
            try {
                const token = searchParams.get('auth_token') || localStorage.getItem('token');
                let baseUrl = window.location.origin;
                if (baseUrl.includes('localhost')) {
                   baseUrl = baseUrl.replace('localhost', '127.0.0.1');
                }

                const proxyUrl = new URL('/api/proxy-laporan', baseUrl);
                
                // --- MAPPING PARAMETER ---
                if (currentParams.mode) proxyUrl.searchParams.append('mode', currentParams.mode);
                if (currentParams.start_date) proxyUrl.searchParams.append('start_date', currentParams.start_date);
                if (currentParams.end_date) proxyUrl.searchParams.append('end_date', currentParams.end_date);
                
                // Status
                if (currentParams.mode === 'spk' && currentParams.status_id) {
                    proxyUrl.searchParams.append('status_id', currentParams.status_id);
                } else if (currentParams.status) {
                    proxyUrl.searchParams.append('status', currentParams.status);
                }

                // Satker
                if (currentParams.satker_id) {
                    proxyUrl.searchParams.append('satker', currentParams.satker_id); 
                }

                // Hal ID
                if (currentParams.hal_id) {
                    proxyUrl.searchParams.append('nama_hal', currentParams.hal_id);
                }
                
                // Jenis Pekerjaan ID
                if (currentParams.jenis_pekerjaan_id) proxyUrl.searchParams.append('jenis_pekerjaan_id', currentParams.jenis_pekerjaan_id);

                console.log("Fetching URL:", proxyUrl.toString());

                const res = await fetch(proxyUrl.toString(), {
                    method: 'GET',
                    headers: { 
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    },
                    cache: 'no-store'
                });

                if (!res.ok) throw new Error(`Gagal mengambil data (${res.status})`);

                const json = await res.json();
                const resultData = Array.isArray(json) ? json : (json.data || []);
                const resultSummary = json.summary || null;

                setData(resultData);
                setSummary(resultSummary);

            } catch (err: any) {
                console.error("Fetch Error:", err);
                setError(err.message || "Gagal memuat data.");
            } finally {
                setLoading(false);
            }
        };

        init();
    }, [searchParams]);

    // Auto Print
    useEffect(() => {
        if (!loading && !error && data.length > 0) {
            setTimeout(() => window.print(), 1000); 
        }
    }, [loading, error, data]);

    // --- HELPER TRANSLATE STATUS & BADGE ---
    const getStatusBadge = (status: string) => {
        if (!status) return <span className="text-gray-500">-</span>;
        
        const s = status.toLowerCase();
        let label = status; // Default label = status asli
        let classes = "px-2 py-1 rounded text-[10px] font-bold uppercase inline-block border ";

        // Logika Translate & Warna
        if (s.includes("appr") || s.includes("selesai") || s.includes("produksi")) {
            label = "Disetujui"; // Translate ke Indonesia
            if (s.includes("selesai")) label = "Selesai";
            classes += "bg-green-100 text-green-700 border-green-200 print-green";
        } else if (s.includes("reject") || s.includes("tolak") || s.includes("batal")) {
            label = "Ditolak"; // Translate ke Indonesia
            classes += "bg-red-100 text-red-700 border-red-200 print-red";
        } else if (s.includes("pend") || s.includes("tunggu") || s.includes("menunggu") || s === "4") {
            label = "Menunggu"; // Translate ke Indonesia
            classes += "bg-orange-100 text-orange-700 border-orange-200 print-orange";
        } else if (s.includes("proses") || s.includes("jalan")) {
            label = "Proses";
            classes += "bg-blue-100 text-blue-700 border-blue-200 print-blue";
        } else {
            classes += "bg-gray-100 text-gray-700 border-gray-200 print-gray";
        }

        return <span className={classes}>{label}</span>;
    };

    // --- HELPER TANDA TANGAN (PERBAIKAN ALIGNMENT) ---
    const renderSignatureColumn = (
        judul: string, 
        jabatan: string, 
        nama: string, 
        npp: string, 
        tanggal: string, 
        hideDate: boolean
    ) => {
        if (!nama) return <div></div>;

        const kota = params.kota || "Semarang"; 
        
        // Format tanggal display
        const displayDate = `${kota}, ${tanggal || printDate.split(' ')[0]}`;

        return (
            <div className="flex flex-col items-center justify-start text-center">
                {/* LOGIKA PERBAIKAN: 
                    Gunakan visibility: hidden jika hideDate=true agar tempatnya tetap terjaga 
                    sehingga sejajar dengan kolom lain.
                */}
                <p className={`text-[11px] mb-1 ${hideDate ? 'invisible' : ''}`}>
                    {displayDate}
                </p>
                
                <p className="font-bold text-[11px] uppercase">{judul || "Mengetahui"}</p>
                {jabatan && <p className="font-bold text-[11px]">{jabatan}</p>}
                
                <div className="h-20"></div> 
                
                <p className="font-bold underline uppercase text-[11px]">{nama}</p>
                {npp && <p className="text-[11px] font-medium">NPP. {npp}</p>}
            </div>
        );
    };

    // --- HELPER PERIODE ---
    const renderPeriode = () => {
        if (params.start_date && params.end_date) {
            return <p className="text-sm text-black">Periode: <span className="font-semibold">{params.start_date}</span> s/d <span className="font-semibold">{params.end_date}</span></p>;
        } else if (params.start_date) {
            return <p className="text-sm text-black">Periode: Mulai <span className="font-semibold">{params.start_date}</span></p>;
        } else if (params.end_date) {
             return <p className="text-sm text-black">Periode: Sampai <span className="font-semibold">{params.end_date}</span></p>;
        }
        return null; 
    };

    return (
        // Menggunakan font-sans (Arial/Helvetica) untuk tampilan standar dokumen
        <div className="bg-white py-8 print:py-0 font-sans print:h-auto print:overflow-visible text-black">
            
            {/* Toolbar */}
            <div className="print:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 text-gray-800 px-6 py-3 shadow-sm z-50 flex justify-between items-center h-16">
                <div className="flex items-center gap-4">
                    <button onClick={() => window.close()} className="hover:bg-gray-100 p-2 rounded-full transition text-gray-600">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="font-bold text-lg leading-tight">Pratinjau Cetak</h1>
                        <p className="text-xs text-gray-500">
                            {loading ? 'Memuat...' : `Total Data: ${data.length} baris`}
                        </p>
                    </div>
                </div>
                <button onClick={() => window.print()} disabled={loading || !!error} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 transition disabled:opacity-50">
                    <Printer size={18}/> Cetak Dokumen
                </button>
            </div>

            <div className="h-16 print:hidden"></div>

            <div id="printable-area" className="w-[297mm] min-h-[210mm] mx-auto bg-white shadow-xl print:shadow-none p-[10mm] print:p-0 print:mx-0 print:w-full print:landscape">
                
                {loading && (
                    <div className="h-[100mm] flex flex-col items-center justify-center">
                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                        <p className="text-gray-400 font-medium text-sm">Menyiapkan halaman...</p>
                    </div>
                )}

                {error && (
                    <div className="h-[100mm] flex flex-col items-center justify-center text-center p-8 border border-red-200 rounded-lg bg-red-50 mt-10">
                        <AlertTriangle className="text-red-500 w-10 h-10 mb-3" />
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                )}

                {!loading && !error && (
                    <div className="text-black text-[12px] leading-tight">
                        
                        <div className="text-center mb-6 pb-2 border-b-2 border-black">
                            <h1 className="text-xl font-bold uppercase tracking-wide mb-1">
                                LAPORAN REKAPITULASI {params.mode === 'spk' ? 'SURAT PERINTAH KERJA (SPK)' : 'PENGAJUAN PEKERJAAN'}
                            </h1>
                            <p className="text-[11px] mb-1">
                                Dicetak: {printDate} — Total: {data.length} data
                            </p>
                            
                            {renderPeriode()}

                            {/* LOGIKA SATKER: HANYA TAMPIL JIKA ADA FILTERS */}
                            {params.satker && <p className="text-sm font-bold mt-1 uppercase">Satuan Kerja: {params.satker}</p>}
                        </div>

                        {summary && (
                            <div className="mb-4 flex gap-4 text-xs border border-black p-2 bg-white print:border-none print:p-0">
                                <span className="font-bold text-black">Total: {summary.total}</span>
                                <span className="text-green-700 font-bold">Disetujui: {summary.approved}</span>
                                <span className="text-orange-700 font-bold">Menunggu: {summary.pending}</span>
                                <span className="text-red-700 font-bold">Ditolak: {summary.rejected}</span>
                            </div>
                        )}

                        <table className="w-full border-collapse border border-black mb-6">
    <thead>
        <tr className="bg-gray-100 print:bg-gray-100 text-black font-bold text-center">
            <th className="border border-black p-2 w-10">No</th>
            {params.mode === 'spk' ? (
                <>
                    <th className="border border-black p-2">No. Surat & Referensi</th>
                    <th className="border border-black p-2">Jenis Pekerjaan</th>
                    <th className="border border-black p-2">Kode Barang</th>
                    <th className="border border-black p-2">Tanggal Pengerjaan</th>
                    <th className="border border-black p-2">Uraian</th>
                    <th className="border border-black p-2">Staff</th>
                    <th className="border border-black p-2 w-28">Status</th>
                </>
            ) : (
                <>
                    <th className="border border-black p-2">No. Surat</th>
                    <th className="border border-black p-2">Hal</th>
                    <th className="border border-black p-2">Kode Barang</th>
                    <th className="border border-black p-2">Keterangan</th>
                    <th className="border border-black p-2">Satuan Kerja</th>
                    <th className="border border-black p-2">Pelapor</th>
                    <th className="border border-black p-2 w-28">Status</th>
                </>
            )}
        </tr>
    </thead>
    <tbody>
        {data.length > 0 ? (
            data.map((item, index) => (
                <tr key={index} className="break-inside-avoid">
                    <td className="border border-black p-2 text-center align-top">{index + 1}</td>
                    {params.mode === 'spk' ? (
                        <>
                            <td className="border border-black p-2 align-top font-medium">
                                <div className="flex flex-col">
                                    <span>{item.no_surat || "-"}</span>
                                    {item.no_referensi && (
                                        <span className="text-[10px] text-gray-500 italic mt-1">
                                            Ref: {item.no_referensi}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="border border-black p-2 align-top">
                                {item.rl_master?.jenispekerjaan?.nama_pekerjaan || "-"}
                            </td>
                            <td className="border border-black p-2 align-top text-center">{item.kode_barang || "-"}</td>
                            <td className="border border-black p-2 align-top">
                                {item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID') : "-"}
                            </td>
                            <td className="border border-black p-2 align-top">
                                {item.uraian_pekerjaan || "-"}
                            </td>
                            <td className="border border-black p-2 align-top">
                                <div className="space-y-1">
                                    {item.stafs ? (
                                        (() => {
                                            try {
                                                const staffList = JSON.parse(item.stafs);
                                                return staffList.map((staff: any, staffIndex: number) => (
                                                    <div key={staffIndex} className="flex items-start gap-1">
                                                        <span className={`text-[10px] font-medium ${
                                                            staff.is_penanggung_jawab 
                                                                ? 'text-red-600' 
                                                                : 'text-black'
                                                        }`}>
                                                            {staff.is_penanggung_jawab ? 'PJ:' : '•'}
                                                        </span>
                                                        <div className="flex-1">
                                                            <div className="text-[10px] text-black font-medium">
                                                                {staff.nama}
                                                            </div>
                                                            <div className="text-[9px] text-gray-500">
                                                                NPP: {staff.npp}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ));
                                            } catch (e) {
                                                return <div className="text-[10px] text-gray-500">Format data staff tidak valid</div>;
                                            }
                                        })()
                                    ) : (
                                        <div className="text-[10px] text-gray-500 italic">-</div>
                                    )}
                                </div>
                            </td>
                            <td className="border border-black p-2 text-center align-top">
                                {getStatusBadge(item.rl_master?.status?.name || item.status)}
                            </td>
                        </>
                    ) : (
                        <>
                            <td className="border border-black p-2 align-top font-medium">
                                <div className="flex flex-col">
                                    <span>{item.no_surat || "-"}</span>
                                    {item.no_referensi && (
                                        <span className="text-[10px] text-gray-500 italic mt-1">
                                            Ref: {item.no_referensi}
                                        </span>
                                    )}
                                </div>
                            </td>
                            <td className="border border-black p-2 align-top">{item.rl_data?.masterhal?.nama_jenis || "-"}</td>
                            <td className="border border-black p-2 align-top text-center">{item.kode_barang || "-"}</td>
                            <td className="border border-black p-2 align-top">
                                <div dangerouslySetInnerHTML={{ __html: item.keterangan || "-" }} />
                            </td>
                            <td className="border border-black p-2 align-top">
                                <div className="text-[10px]">
                                    {item.rl_data?.kd_satker?.satker_name || "-"}
                                    {item.rl_data?.kd_parent?.parent_satker && (
                                        <div className="text-gray-500 text-[9px] italic mt-1">
                                            Parent: {item.rl_data.kd_parent.parent_satker}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="border border-black p-2 align-top">
                                <div className="text-[10px]">
                                    <div>{item.name_pelapor || "-"}</div>
                                    {item.npp_pelapor && (
                                        <div className="text-gray-500 text-[9px]">
                                            NPP: {item.npp_pelapor}
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="border border-black p-2 text-center align-top">
                                {getStatusBadge(item.status)}
                            </td>
                        </>
                    )}
                </tr>
            ))
        ) : (
            <tr><td colSpan={params.mode === 'spk' ? 8 : 7} className="border border-black p-8 text-center italic">Data tidak ditemukan.</td></tr>
        )}
    </tbody>
</table>
                        <div className="grid grid-cols-3 gap-4 mt-8 break-inside-avoid px-4 text-black">
                            {renderSignatureColumn(
                                params.ttd_kiri_judul, params.ttd_kiri_jabatan, params.ttd_kiri_nama, params.ttd_kiri_npp, params.ttd_kiri_tanggal, 
                                params.ttd_kiri_hide_date // Pass hide flag
                            )}
                            {renderSignatureColumn(
                                params.ttd_tengah_judul, params.ttd_tengah_jabatan, params.ttd_tengah_nama, params.ttd_tengah_npp, params.ttd_tengah_tanggal, 
                                params.ttd_tengah_hide_date // Pass hide flag
                            )}
                            {renderSignatureColumn(
                                params.ttd_kanan_judul, params.ttd_kanan_jabatan, params.ttd_kanan_nama, params.ttd_kanan_npp, params.ttd_kanan_tanggal, 
                                params.ttd_kanan_hide_date // Pass hide flag
                            )}
                        </div>

                    </div>
                )}
            </div>

            <style jsx global>{`
                @media print {
                    html, body {
                        height: initial !important;
                        overflow: initial !important;
                        background: white !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * { visibility: hidden; }
                    #printable-area, #printable-area * { visibility: visible; }
                    #printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    @page { size: A4 landscape; margin: 10mm; }
                    
                    /* Override warna untuk cetak */
                    .print-green { background-color: #dcfce7 !important; color: #166534 !important; border: 1px solid #86efac !important; }
                    .print-red { background-color: #fee2e2 !important; color: #991b1b !important; border: 1px solid #fca5a5 !important; }
                    .print-orange { background-color: #ffedd5 !important; color: #9a3412 !important; border: 1px solid #fdba74 !important; }
                    .print-blue { background-color: #dbeafe !important; color: #1e40af !important; border: 1px solid #93c5fd !important; }
                    .print-gray { background-color: #f3f4f6 !important; color: black !important; border: 1px solid #e5e7eb !important; }
                }
            `}</style>
        </div>
    );
}