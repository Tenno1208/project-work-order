"use client";

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
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
// --- CONFIGURATION ---
// ====================================================================
const WORKORDER_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const PORTAL_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL_PORTAL_PEGAWAI;

// --- HELPERS ---
const formatDateTime = (dateString: string) => {
    if (!dateString) return { date: "-", time: "-" };
    const dateObj = new Date(dateString);
    const date = dateObj.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const time = dateObj.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
    return { date, time };
};

const translateStatusAndMessage = (status: string, message: string, title: string) => {
    let translatedStatus = status;
    let translatedMessage = message;
    let translatedTitle = title;
    
    if (status === "pending") translatedStatus = "Menunggu";
    else if (status === "approved") translatedStatus = "Disetujui";
    else if (status === "rejected") translatedStatus = "Ditolak";
    else if (status === "signed") translatedStatus = "Ditandatangani";
    
    if (message && message.includes("Status diupdate menjadi")) {
        translatedMessage = message.replace("approved", "disetujui").replace("rejected", "ditolak").replace("pending", "menunggu");
    }
    
    if (title === "Status Pengajuan Diupdate") translatedTitle = "Status Diperbarui";
    else if (title === "Pengajuan Baru Dibuat") translatedTitle = "Pengajuan Baru";
    else if (title === "TTD SPK") translatedTitle = "SPK Ditandatangani";

    return { status: translatedStatus, message: translatedMessage, title: translatedTitle };
};

// --- SUB COMPONENTS ---
const StafCard = ({ title, data, defaultOpen = false }: { title: string, data: any, defaultOpen?: boolean }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const stafs = data?.stafs || [];
    const menyetujui = { nama: data?.menyetujui_name || "-", npp: data?.menyetujui_npp || "-", jabatan: data?.menyetujui || "-" };
    const mengetahui = { nama: data?.mengetahui_name || "-", npp: data?.mengetahui_npp || "-", jabatan: data?.mengetahui || "-" };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
            <button onClick={() => setIsOpen(!isOpen)} className="w-full px-6 py-4 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex items-center gap-2 text-cyan-800 font-bold text-sm">
                    <Users size={18} /><span>{title}</span>
                </div>
                {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </button>
            {isOpen && (
                <div className="p-6 border-t border-gray-100 space-y-6">
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">Tim Pelaksana</h4>
                        {stafs.length > 0 ? (
                            <div className="space-y-3">
                                {stafs.map((staf: any, index: number) => (
                                    <div key={index} className={`flex items-start gap-3 p-3 rounded-lg border ${staf.is_penanggung_jawab ? 'bg-cyan-50 border-cyan-100' : 'bg-white border-gray-100'}`}>
                                        <div className={`mt-1 p-1.5 rounded-full ${staf.is_penanggung_jawab ? 'bg-cyan-100 text-cyan-600' : 'bg-gray-100 text-gray-500'}`}>
                                            {staf.is_penanggung_jawab ? <Award size={16} /> : <User size={16} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold text-gray-800">{staf.nama || "-"}</p>
                                            <p className="text-xs text-gray-500">NPP: {staf.npp || "-"}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : <p className="text-sm text-gray-400 italic">- Belum ada staf -</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

// ====================================================================
// --- MAIN TRACKING CONTENT ---
// ====================================================================
function TrackingContent() {
    const searchParams = useSearchParams();
    const uuid = searchParams.get('uuid'); // Mengambil UUID dari ?uuid=...

    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    
    // Login States
    const [npp, setNpp] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loginLoading, setLoginLoading] = useState(false);
    const [loginError, setLoginError] = useState("");

    const fetchData = useCallback(async () => {
        if (!uuid) {
            setLoading(false);
            setError("ID Tracking tidak ditemukan di URL.");
            return;
        }

        setLoading(true);
        const token = typeof window !== 'undefined' ? localStorage.getItem("token") : null;
        
        if (!token) {
            setShowLoginModal(true);
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${WORKORDER_BASE_URL}/tracking/uuid/${uuid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.status === 401) {
                localStorage.removeItem("token");
                setShowLoginModal(true);
                return;
            }

            const json = await res.json();
            if (!res.ok) throw new Error(json.message || "Gagal memuat data");
            
            setData(json);
            setShowLoginModal(false);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [uuid]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        try {
            const res = await fetch(`${PORTAL_BASE_URL}/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ npp, password, hwid: "prod" }), 
            });
            const result = await res.json();

            if (res.ok && result.data?.access_token) {
                localStorage.setItem("token", result.data.access_token);
                fetchData();
            } else {
                setLoginError(result.message || "Login gagal.");
            }
        } catch (err) {
            setLoginError("Koneksi gagal.");
        } finally {
            setLoginLoading(false);
        }
    };

    if (showLoginModal) {
        return (
            <div className="fixed inset-0 bg-slate-900/90 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock className="text-cyan-600" size={32} />
                        </div>
                        <h2 className="text-2xl font-bold">Akses Terbatas</h2>
                        <p className="text-gray-500 text-sm">Silakan login menggunakan akun Portal Pegawai.</p>
                    </div>
                    {loginError && <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg">{loginError}</div>}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input type="text" placeholder="NPP" value={npp} onChange={(e)=>setNpp(e.target.value)} className="w-full p-3 border rounded-xl" required />
                        <div className="relative">
                            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e)=>setPassword(e.target.value)} className="w-full p-3 border rounded-xl" required />
                            <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-3 top-3 text-gray-400">
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        <button disabled={loginLoading} className="w-full bg-cyan-600 text-white p-3 rounded-xl font-bold">
                            {loginLoading ? "Loading..." : "Login"}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    if (loading) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
    if (error || !data) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || "Data Kosong"}</div>;

    const sortedTimeline = [...(data.timeline || [])].sort((a: any, b: any) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const infoUtama = data.spk || data.pengajuan || {};

    return (
        <div className="min-h-screen bg-slate-50 pb-10">
            <div className="bg-white border-b px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-2 text-cyan-700">
                    <Building2 size={20} />
                    <h1 className="text-lg font-bold">Status Pekerjaan</h1>
                </div>
            </div>

            <div className="max-w-xl mx-auto px-4 pt-6">
                <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
                    <h2 className="text-lg font-bold text-gray-800">{infoUtama.uraian_pekerjaan || "-"}</h2>
                    <div className="mt-4 pt-4 border-t space-y-2 text-sm">
                        <div className="flex justify-between"><span>No. Surat</span><span className="font-mono">{data.no_surat}</span></div>
                    </div>
                </div>

                <StafCard title="Detail Staf & Pihak Terkait" data={infoUtama} />

                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="text-sm font-bold mb-6">Riwayat Aktivitas</h3>
                    <div className="relative border-l-2 ml-3 space-y-8">
                        {sortedTimeline.map((item: any, idx: number) => {
                            const translated = translateStatusAndMessage(item.status, item.message, item.title);
                            const { date, time } = formatDateTime(item.created_at);
                            return (
                                <div key={idx} className="relative pl-8">
                                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-cyan-500 border-2 border-white" />
                                    <p className="text-sm font-bold text-gray-800">{translated.title}</p>
                                    <div className="bg-gray-50 p-2 rounded text-xs mt-1">
                                        <p className="font-medium">{translated.status}</p>
                                        <p className="text-gray-500 italic">{translated.message}</p>
                                    </div>
                                    <p className="text-[10px] text-gray-400 mt-1">{date} • {time}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ====================================================================
// --- WRAPPER WITH SUSPENSE (REQUIRED BY NEXT.JS FOR SEARCHPARAMS) ---
// ====================================================================
export default function TrackingPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <TrackingContent />
        </Suspense>
    );
}