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
    CalendarDays,
    Users, // Icon baru untuk Staf
    ChevronDown, // Icon untuk Collapse/Expand
    ChevronUp, // Icon untuk Collapse/Expand
    Award // Icon untuk Penanggung Jawab
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

const StafCard = ({ title, data, defaultOpen = false }: { title: string, data: any, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    const stafs = data?.stafs || [];
    
    const menyetujui = { 
        nama: data?.menyetujui_name || "-", 
        npp: data?.menyetujui_npp || "-",
        jabatan: data?.menyetujui || "-" 
    };
    const mengetahui = { 
        nama: data?.mengetahui_name || "-", 
        npp: data?.mengetahui_npp || "-",
        jabatan: data?.mengetahui || "-" 
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-6 py-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors"
            >
                <div className="flex items-center gap-2 text-cyan-800 font-bold text-sm">
                    <Users size={18} />
                    <span>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
            </button>

            {isOpen && (
                <div className="p-6 border-t border-gray-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
                    
                    {/* BAGIAN 1: STAF PELAKSANA */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Tim Pelaksana</h4>
                        {stafs.length > 0 ? (
                            <div className="space-y-3">
                                {stafs.map((staf: any, index: number) => (
                                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${staf.is_penanggung_jawab ? 'bg-cyan-50 border-cyan-100' : 'bg-white border-gray-100'}`}>
                                        <div className={`mt-1 p-1.5 rounded-full ${staf.is_penanggung_jawab ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {staf.is_penanggung_jawab ? <Award size={16} /> : <User size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{staf.nama || "-"}</p>
                                            <p className="text-xs text-gray-500 font-mono">NPP: {staf.npp || "-"}</p>
                                            {staf.is_penanggung_jawab && (
                                                <span className="inline-block mt-1 text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-medium">
                                                    Penanggung Jawab
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-400 italic text-center py-2">- Belum ada staf ditugaskan -</p>
                        )}
                    </div>

                    <div className="border-t border-gray-100 my-4"></div>

                    {/* BAGIAN 2: PIHAK TERKAIT (Grid 2 Kolom) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    

                        {/* MENYETUJUI */}
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menyetujui</h4>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-sm font-semibold text-gray-800">{menyetujui.nama}</p>
                                <p className="text-[10px] text-gray-500 mb-1">{menyetujui.jabatan}</p>
                                <p className="text-xs text-gray-500 font-mono">NPP: {menyetujui.npp}</p>
                            </div>
                        </div>

                        {/* MENGETAHUI (Full Width di Mobile, Grid di Desktop) */}
                        <div className="md:col-span-2">
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Mengetahui</h4>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-sm font-semibold text-gray-800">{mengetahui.nama}</p>
                                <p className="text-[10px] text-gray-500 mb-1">{mengetahui.jabatan}</p>
                                <p className="text-xs text-gray-500 font-mono">NPP: {mengetahui.npp}</p>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
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

    const sortedTimeline = [...(data.timeline || [])].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    // Ambil data utama (Prioritas SPK -> Pengajuan)
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

                {/* KOMPONEN STAF & PIHAK TERKAIT (COLLAPSIBLE) */}
                <StafCard title="Detail Staf & Pihak Terkait" data={infoUtama} />

                {/* TIMELINE SECTION */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CalendarDays size={16} className="text-cyan-600" />
                        Riwayat Aktivitas
                    </h3>
                    
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                        {sortedTimeline.map((item: any, index: number) => {
                            const isLatest = index === 0;
                            const { date, time } = formatDateTime(item.created_at);

                            return (
                                <div key={item.id || index} className="relative pl-8">
                                    <div className={`absolute -left-[9px] top-1 w-[18px] h-[18px] rounded-full border-[3px] flex items-center justify-center z-10 bg-white ${
                                        isLatest 
                                            ? "border-cyan-500 shadow-[0_0_0_3px_rgba(6,182,212,0.2)]" 
                                            : "border-slate-300"
                                    }`}>
                                        {isLatest && <div className="w-2 h-2 bg-cyan-500 rounded-full"></div>}
                                    </div>

                                    <div className={`${isLatest ? "opacity-100" : "opacity-80"}`}>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-sm font-bold ${isLatest ? 'text-cyan-700' : 'text-slate-700'}`}>
                                                {item.title}
                                            </span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mb-1 leading-relaxed">
                                            <p className="font-medium mb-0.5">{item.status}</p>
                                            {item.message && item.message !== "-" && (
                                                <p className="text-slate-500 italic">"{item.message}"</p>
                                            )}
                                        </div>

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