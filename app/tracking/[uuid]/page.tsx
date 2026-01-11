// app/dashboard/tracking/page.tsx

"use client";

import React, { useEffect, useState, useCallback } from 'react';
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
    Users, 
    ChevronDown, 
    ChevronUp, 
    Award,
    Lock,       
    Key,        
    LogIn,      
    X,
    Eye,        
    EyeOff      
} from 'lucide-react';

// ====================================================================
// --- HELPER FUNCTIONS -----------------------------------------------
// ====================================================================

const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: "-", time: "-" };
    const dateObj = new Date(dateString);
    const date = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const time = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
};

// Fungsi untuk menerjemahkan status dan pesan
const translateStatusAndMessage = (status: string, message: string, title: string) => {
    let translatedStatus = status;
    let translatedMessage = message;
    let translatedTitle = title;
    
    // Terjemahan status
    if (status === "pending") translatedStatus = "Menunggu";
    else if (status === "approved") translatedStatus = "Disetujui";
    else if (status === "rejected") translatedStatus = "Ditolak";
    else if (status === "signed") translatedStatus = "Ditandatangani";
    
    // Terjemahan pesan khusus
    if (message && message.includes("Status diupdate menjadi")) {
        translatedMessage = message.replace("approved", "disetujui").replace("rejected", "ditolak").replace("pending", "menunggu");
    }
    
    // Terjemahan judul khusus
    if (title === "Status Pengajuan Diupdate") {
        translatedTitle = "Status Diperbarui";
    } else if (title === "Pengajuan Baru Dibuat") {
        translatedTitle = "Pengajuan Baru";
    } else if (title === "SPK Ditugaskan") {
        translatedTitle = "SPK Ditugaskan";
    } else if (title === "SPK Diperbarui") {
        translatedTitle = "SPK Diperbarui";
    } else if (title === "Persetujuan SPK") {
        translatedTitle = "Persetujuan SPK";
    } else if (title === "TTD SPK") {
        translatedTitle = "Dokumen Ditandatangani";
    } else if (title === "Pengajuan Diedit") {
        translatedTitle = "Pengajuan Diedit";
    }
    
    // Terjemahan pesan untuk tanda tangan
    if (message && message.includes("telah disetujui oleh")) {
        translatedMessage = message.replace("telah disetujui oleh", "telah disetujui oleh");
    } else if (message && message.includes("telah ditandatangani oleh")) {
        translatedMessage = message.replace("telah ditandatangani oleh", "telah ditandatangani oleh");
    }
    
    return {
        status: translatedStatus,
        message: translatedMessage,
        title: translatedTitle
    };
};

// ====================================================================
// --- SUB COMPONENTS -------------------------------------------------
// ====================================================================

const StafCard = ({ title, data, defaultOpen = false }: { title: string, data: any, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const stafs = data?.stafs || [];
    
    const menyetujui = { nama: data?.menyetujui_name || "-", npp: data?.menyetujui_npp || "-", jabatan: data?.menyetujui || "-" };
    const mengetahui = { nama: data?.mengetahui_name || "-", npp: data?.mengetahui_npp || "-", jabatan: data?.mengetahui || "-" };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 transition-all duration-300">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2 text-cyan-800 font-bold text-sm">
                    <Users size={18} /><span>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
            </button>
            {isOpen && (
                <div className="p-6 border-t border-gray-100 space-y-6 animate-in slide-in-from-top-2 duration-300">
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
                                            {staf.is_penanggung_jawab && <span className="inline-block mt-1 text-[10px] bg-cyan-600 text-white px-2 py-0.5 rounded-full font-medium">Penanggung Jawab</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-gray-400 italic text-center py-2">- Belum ada staf ditugaskan -</p>}
                    </div>
                    <div className="border-t border-gray-100 my-4"></div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Menyetujui</h4>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                                <p className="text-sm font-semibold text-gray-800">{menyetujui.nama}</p>
                                <p className="text-[10px] text-gray-500 mb-1">{menyetujui.jabatan}</p>
                                <p className="text-xs text-gray-500 font-mono">NPP: {menyetujui.npp}</p>
                            </div>
                        </div>
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

// ====================================================================
// --- MAIN PAGE COMPONENT --------------------------------------------
// ====================================================================

export default function TrackingPage() {
    const params = useParams();
    const uuid = params.uuid as string;
    
    // --- STATE TRACKING ---
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // --- STATE LOGIN MODAL ---
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [npp, setNpp] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    // --- FUNCTION FETCH DATA ---
    const fetchData = useCallback(async () => {
        if (!uuid) return;
        setLoading(true);
        setError(null);

        // 1. Cek Token di LocalStorage
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        
        // Jika tidak ada token, langsung tampilkan modal login dan stop loading
        if (!token) {
            setShowLoginModal(true);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`/api/tracking-proxy?uuid=${uuid}`, {
                headers: {
                    'Authorization': `Bearer ${token}` 
                }
            });
            
            // 3. Handle Unauthorized (401)
            if (res.status === 401) {
                localStorage.removeItem("token");
                setShowLoginModal(true);
                setLoading(false);
                return;
            }

            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("Respon server tidak valid.");
            }

            const json = await res.json();

            if (!res.ok) throw new Error(json.message || "Gagal memuat data tracking");
            
            setData(json); 
            setShowLoginModal(false); 

        } catch (err: any) {
            console.error("Error fetching:", err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [uuid]);

    // --- EFFECT ---
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- LOGIN HANDLER ---
    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        setLoginError("");

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ npp, password }),
            });

            const result = await res.json();

            if (res.ok && result.success) {
                localStorage.setItem("token", result.token);
                setShowLoginModal(false);
                setNpp("");
                setPassword("");
                fetchData();
            } else {
                setLoginError(result.message || "Login gagal.");
            }
        } catch (err) {
            setLoginError("Terjadi kesalahan koneksi.");
        } finally {
            setLoginLoading(false);
        }
    };

    // --- RENDER LOGIN MODAL ---
    if (showLoginModal) {
        return (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-90 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-300">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="w-8 h-8 text-cyan-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800">Akses Terbatas</h2>
                        <p className="text-slate-500 text-sm mt-2">Sesi Anda berakhir atau Anda belum login. Silakan login untuk melihat data.</p>
                    </div>

                    {/* ERROR MESSAGE DI ATAS FORM */}
                    {loginError && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm animate-in slide-in-from-top-2">
                            <AlertCircle size={18} className="shrink-0 mt-0.5" />
                            <span>{loginError}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">NPP</label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type="text" 
                                    value={npp}
                                    onChange={(e) => setNpp(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-800 text-sm font-medium"
                                    placeholder="Masukkan NPP Anda"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition-all text-slate-800 text-sm font-medium"
                                    placeholder="Masukkan Password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-600 transition-colors focus:outline-none"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={loginLoading}
                            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-cyan-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                        >
                            {loginLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <>
                                    <LogIn size={20} /> Login & Lihat Tracking
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // --- RENDER CONTENT (LOADING / ERROR / DATA) ---

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
                <button 
                    onClick={() => { localStorage.removeItem("token"); setShowLoginModal(true); }}
                    className="mt-4 text-cyan-600 underline text-sm"
                >
                    Coba Login Ulang
                </button>
            </div>
        );
    }

    const sortedTimeline = [...(data.timeline || [])].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const infoUtama = data.spk || data.pengajuan || {};
    const judulPekerjaan = infoUtama.uraian_pekerjaan || infoUtama.keterangan || "-";
    const noSurat = data.no_surat || "-";
    const statusTerakhir = sortedTimeline.length > 0 ? sortedTimeline[0].title : "Menunggu";

    // Ambil parent_satker dari response API
    const parentSatker = data.kd_parent?.parent_satker || data.pengajuan?.satker || "-";

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-10">
            <div className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-2 text-cyan-700">
                    <Building2 size={20} />
                    <h1 className="text-lg font-bold tracking-tight">Status Pekerjaan</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-6">
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
                                {parentSatker}
                            </span>
                        </div>
                    </div>
                </div>

                <StafCard title="Detail Staf & Pihak Terkait" data={infoUtama} />

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-sm font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <CalendarDays size={16} className="text-cyan-600" />
                        Riwayat Aktivitas
                    </h3>
                    
                    <div className="relative border-l-2 border-slate-200 ml-3 space-y-8 pb-2">
                        {sortedTimeline.map((item: any, index: number) => {
                            const isLatest = index === 0;
                            const { date, time } = formatDateTime(item.created_at);
                            
                            // Terjemahkan status dan pesan
                            const translated = translateStatusAndMessage(item.status, item.message, item.title);

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
                                                {translated.title}
                                            </span>
                                        </div>
                                        
                                        <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mb-1 leading-relaxed">
                                            <p className="font-medium mb-0.5">{translated.status}</p>
                                            {item.message && item.message !== "-" && (
                                                <p className="text-slate-500 italic">"{translated.message}"</p>
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