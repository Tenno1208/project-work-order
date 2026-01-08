"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
    CheckCircle2, 
    FileText, 
    User, 
    Loader2, 
    AlertCircle, 
    PenTool, 
    ClipboardList,
    Clock,
    Building2,
    CalendarDays
} from 'lucide-react';

// Helper format tanggal & jam
const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: "-", time: "-" };
    const dateObj = new Date(dateString);
    
    const date = dateObj.toLocaleDateString("id-ID", {
        day: "numeric", month: "short", year: "numeric"
    });
    
    const time = dateObj.toLocaleTimeString("id-ID", {
        hour: "2-digit", minute: "2-digit"
    });

    return { date, time };
};

// Helper untuk menentukan ikon berdasarkan jenis aktivitas
const getStepIcon = (item: any) => {
    const source = item.source?.toLowerCase() || "";
    const title = item.title?.toLowerCase() || "";
    const status = item.status?.toLowerCase() || "";

    if (source.includes("pengajuan")) return <FileText size={18} />;
    if (title.includes("ditandatangani") || source.includes("ttd")) return <PenTool size={18} />;
    if (source.includes("pic") || source.includes("update") || source.includes("edit")) return <ClipboardList size={18} />;
    if (status.includes("ditugaskan")) return <User size={18} />;
    if (status.includes("approved") || status.includes("selesai")) return <CheckCircle2 size={18} />;
    
    return <Clock size={18} />;
};

export default function TrackingPage() {
    const params = useParams();
    const uuid = params.uuid as string;
    
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!uuid) return;
            try {
                // Panggil API Proxy Lokal
                const res = await fetch(`/api/tracking-proxy?uuid=${uuid}`);
                
                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error("Respon server tidak valid.");
                }

                const json = await res.json();

                if (!res.ok) throw new Error(json.message || "Gagal memuat data tracking");
                
                setData(json); 
            } catch (err: any) {
                console.error("Error fetching:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [uuid]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-cyan-700">
                <Loader2 className="w-10 h-10 animate-spin mb-4" />
                <p className="font-medium text-sm">Memuat Data Pekerjaan...</p>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center">
                <div className="bg-red-100 p-4 rounded-full mb-4 inline-block">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                </div>
                <h1 className="text-lg font-bold text-gray-800 mb-2">Data Tidak Ditemukan</h1>
                <p className="text-gray-600 text-sm">{error || "Kode tracking tidak valid."}</p>
            </div>
        );
    }

    // Urutkan timeline dari TERBARU ke TERLAMA
    const sortedTimeline = [...(data.timeline || [])].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Ambil data utama (Prioritas SPK, fallback ke Pengajuan)
    const infoUtama = data.spk || data.pengajuan || {};
    const judulPekerjaan = infoUtama.uraian_pekerjaan || infoUtama.keterangan || "-";
    const noSurat = data.no_surat || "-";
    const statusTerakhir = sortedTimeline.length > 0 ? sortedTimeline[0].title : "Menunggu";

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            {/* Header Sederhana */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-2 text-cyan-700">
                    <Building2 size={20} />
                    <h1 className="text-lg font-bold tracking-tight">Status Pekerjaan</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-6">
                
                {/* KARTU INFO UTAMA (SPK) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
                    <div className="mb-4">
                        <span className="bg-cyan-50 text-cyan-700 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border border-cyan-100">
                            {statusTerakhir}
                        </span>
                    </div>
                    
                    <h2 className="text-lg font-bold text-gray-800 leading-snug mb-2">
                        {judulPekerjaan}
                    </h2>
                    
                    <div className="space-y-2 mt-4 pt-4 border-t border-gray-100 text-sm">
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500">No. Surat</span>
                            <span className="font-mono text-gray-800 text-right">{noSurat}</span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500">Pelaksana</span>
                            <span className="font-medium text-gray-800 text-right">
                                {infoUtama.stafs?.find((s:any) => s.is_penanggung_jawab)?.nama || 
                                 infoUtama.penanggung_jawab_name || 
                                 "-"}
                            </span>
                        </div>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-500">Satker / Unit</span>
                            <span className="font-medium text-gray-800 text-right">
                                {data.pengajuan?.satker || "-"}
                            </span>
                        </div>
                    </div>
                </div>

                {/* TIMELINE SECTION */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CalendarDays size={16} className="text-cyan-600" />
                        Riwayat Aktivitas
                    </h3>
                    
                    {/* Container Garis Vertikal */}
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                        {/* MAPPING DATA TIMELINE:
                           Bagian ini akan otomatis meloop data dari API.
                           Jika data ada 5, maka akan muncul 5 blok history + bulatan.
                        */}
                        {sortedTimeline.map((item: any, index: number) => {
                            const isLatest = index === 0; // Item paling atas
                            const { date, time } = formatDateTime(item.created_at);

                            return (
                                <div key={item.id || index} className="relative pl-8">
                                    
                                    {/* BULATAN INDIKATOR (DOTS) */}
                                    <div className={`absolute -left-[9px] top-1 w-[18px] h-[18px] rounded-full border-[3px] flex items-center justify-center z-10 bg-white ${
                                        isLatest 
                                            ? "border-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.2)]" // Style untuk status terbaru (Biru + Glow)
                                            : "border-slate-300" // Style untuk history lama (Abu-abu)
                                    }`}>
                                        {isLatest && <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>}
                                    </div>

                                    {/* KONTEN HISTORY */}
                                    <div className={`${isLatest ? "opacity-100" : "opacity-80"}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-sm font-bold ${isLatest ? 'text-cyan-700' : 'text-slate-700'}`}>
                                                {item.title}
                                            </span>
                                        </div>
                                        
                                        {/* Pesan / Message */}
                                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mb-1 leading-relaxed">
                                            <p className="font-medium mb-0.5">{item.status}</p>
                                            {item.message && item.message !== "-" && (
                                                <p className="text-slate-500 italic">"{item.message}"</p>
                                            )}
                                        </div>

                                        {/* Tanggal & Jam */}
                                        <p className="text-[10px] text-slate-400 font-medium mt-1">
                                            {date} • {time}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    {sortedTimeline.length === 0 && (
                        <div className="text-center text-gray-400 text-sm py-8 italic">
                            Belum ada riwayat aktivitas tercatat.
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center px-6 pb-6">
                    <p className="text-[10px] text-gray-400 font-mono">
                        ID: {data.tracking_id || uuid}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">PDAM Work Order System &copy; {new Date().getFullYear()}</p>
                </div>

            </div>
        </div>
    );
}