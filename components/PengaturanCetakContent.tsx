"use client";

import React, { useState, useEffect } from "react";
import { 
    UserCircle, 
    Calendar, 
    Save, 
    CheckCircle,
    Printer,
    MapPin,
    IdCard, 
    Briefcase 
} from "lucide-react";

export default function PengaturanCetakContent() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // --- State Data ---
    const [kota, setKota] = useState("Semarang");

    // Kiri
    const [kiriJudul, setKiriJudul] = useState("Dibuat Oleh");
    const [kiriJabatan, setKiriJabatan] = useState(""); 
    const [kiriNama, setKiriNama] = useState("");
    const [kiriNpp, setKiriNpp] = useState("");
    const [kiriTanggal, setKiriTanggal] = useState("");
    
    // Tengah
    const [tengahJudul, setTengahJudul] = useState("Diperiksa Oleh");
    const [tengahJabatan, setTengahJabatan] = useState(""); 
    const [tengahNama, setTengahNama] = useState("");
    const [tengahNpp, setTengahNpp] = useState("");
    const [tengahTanggal, setTengahTanggal] = useState("");

    // Kanan
    const [kananJudul, setKananJudul] = useState("Mengetahui");
    const [kananJabatan, setKananJabatan] = useState(""); 
    const [kananNama, setKananNama] = useState("");
    const [kananNpp, setKananNpp] = useState("");
    const [kananTanggal, setKananTanggal] = useState("");

    const getTodayDate = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    };

    const formatDateDisplay = (dateString: string) => {
        if (!dateString) return "Tanggal Hari Ini (Otomatis)";
        const date = new Date(dateString);
        return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long' }).format(date);
    };

    // Load Data
    useEffect(() => {
        const savedSettings = localStorage.getItem("print_settings");
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setKota(parsed.kota || "Semarang");

                setKiriJudul(parsed.kiriJudul || "Dibuat Oleh");
                setKiriJabatan(parsed.kiriJabatan || "");
                setKiriNama(parsed.kiriNama || "");
                setKiriNpp(parsed.kiriNpp || "");
                setKiriTanggal(parsed.kiriTanggal || "");

                setTengahJudul(parsed.tengahJudul || "Diperiksa Oleh");
                setTengahJabatan(parsed.tengahJabatan || "");
                setTengahNama(parsed.tengahNama || "");
                setTengahNpp(parsed.tengahNpp || "");
                setTengahTanggal(parsed.tengahTanggal || "");

                setKananJudul(parsed.kananJudul || "Mengetahui");
                setKananJabatan(parsed.kananJabatan || "");
                setKananNama(parsed.kananNama || "");
                setKananNpp(parsed.kananNpp || "");
                setKananTanggal(parsed.kananTanggal || "");
            } catch (e) {
                console.error("Gagal load settings", e);
            }
        }
    }, []);

    // Simpan Data
    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const settings = {
            kota,
            kiriJudul, kiriJabatan, kiriNama, kiriNpp, kiriTanggal,
            tengahJudul, tengahJabatan, tengahNama, tengahNpp, tengahTanggal,
            kananJudul, kananJabatan, kananNama, kananNpp, kananTanggal
        };

        localStorage.setItem("print_settings", JSON.stringify(settings));

        setTimeout(() => {
            setLoading(false);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        }, 800);
    };

    return (
        <div className="p-6 lg:p-10">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-300">
                <div>
                    <h2 className="text-xl font-bold text-black flex items-center gap-2">
                        <Printer className="text-black" size={24} />
                        Konfigurasi Layout Cetak
                    </h2>
                    <p className="text-black text-sm mt-1 font-medium">
                        Atur kota, jabatan, nama, NPP, dan layout tanda tangan.
                    </p>
                </div>
                {success && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-900 border border-green-300 rounded-lg text-sm font-bold animate-pulse">
                        <CheckCircle size={18} /> Tersimpan!
                    </div>
                )}
            </div>

            <form onSubmit={handleSave}>
                
                {/* GLOBAL SETTING: KOTA */}
                <div className="mb-8 p-6 bg-gray-100 rounded-2xl border border-gray-300">
                     <label className="text-sm font-bold text-black uppercase mb-2 block flex items-center gap-2">
                        <MapPin size={16}/> Kota Penetapan (Surat/Laporan)
                     </label>
                     <input 
                        type="text" 
                        value={kota}
                        onChange={(e) => setKota(e.target.value)}
                        placeholder="Contoh: Semarang"
                        className="w-full md:w-1/2 px-4 py-2 bg-white border border-slate-400 rounded-xl text-black focus:ring-2 focus:ring-black outline-none text-sm font-bold"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
                    
                    {/* POSISI 1: KIRI */}
                    <SignatureInput 
                        num="1" 
                        title="Posisi Kiri" 
                        colorClass="bg-white text-black border-black"
                        borderClass="border-gray-400 bg-gray-50"
                        data={{ judul: kiriJudul, jabatan: kiriJabatan, nama: kiriNama, npp: kiriNpp, tanggal: kiriTanggal }}
                        handlers={{ setJudul: setKiriJudul, setJabatan: setKiriJabatan, setNama: setKiriNama, setNpp: setKiriNpp, setTanggal: setKiriTanggal }}
                        formatDateDisplay={formatDateDisplay}
                        getTodayDate={getTodayDate}
                    />

                    {/* POSISI 2: TENGAH */}
                    <SignatureInput 
                        num="2" 
                        title="Posisi Tengah" 
                        colorClass="bg-white text-black border-black"
                        borderClass="border-gray-400 bg-gray-50"
                        data={{ judul: tengahJudul, jabatan: tengahJabatan, nama: tengahNama, npp: tengahNpp, tanggal: tengahTanggal }}
                        handlers={{ setJudul: setTengahJudul, setJabatan: setTengahJabatan, setNama: setTengahNama, setNpp: setTengahNpp, setTanggal: setTengahTanggal }}
                        formatDateDisplay={formatDateDisplay}
                        getTodayDate={getTodayDate}
                    />

                    {/* POSISI 3: KANAN */}
                    <SignatureInput 
                        num="3" 
                        title="Posisi Kanan" 
                        colorClass="bg-white text-black border-black"
                        borderClass="border-gray-400 bg-gray-50"
                        data={{ judul: kananJudul, jabatan: kananJabatan, nama: kananNama, npp: kananNpp, tanggal: kananTanggal }}
                        handlers={{ setJudul: setKananJudul, setJabatan: setKananJabatan, setNama: setKananNama, setNpp: setKananNpp, setTanggal: setKananTanggal }}
                        formatDateDisplay={formatDateDisplay}
                        getTodayDate={getTodayDate}
                    />

                </div>

                <div className="mt-10 pt-6 border-t border-gray-300 flex justify-end">
                    <button 
                        type="submit"
                        disabled={loading}
                        className="bg-black text-white px-8 py-3 rounded-xl shadow-lg hover:bg-gray-800 transition-all flex items-center gap-2 font-bold disabled:opacity-70"
                    >
                        {loading ? 'Menyimpan...' : <><Save size={18} /> Simpan Pengaturan</>}
                    </button>
                </div>
            </form>
        </div>
    );
}

// --- PINDAHKAN INI KE LUAR (DI BAWAH) FUNGSI UTAMA ---
const SignatureInput = ({ title, colorClass, borderClass, num, data, handlers, formatDateDisplay, getTodayDate }: any) => (
    <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
            <span className={`flex items-center justify-center w-8 h-8 rounded-full font-bold border ${colorClass}`}>{num}</span>
            <h3 className="font-bold text-black text-lg">{title}</h3>
        </div>
        
        <div className={`p-6 rounded-2xl border ${borderClass} space-y-4 bg-opacity-40 transition-colors`}>
            
            {/* Judul Header */}
            <div>
                <label className="text-xs font-bold text-black uppercase mb-1 block">Judul Header</label>
                <input 
                    type="text" 
                    value={data.judul}
                    onChange={(e) => handlers.setJudul(e.target.value)}
                    className="w-full px-4 py-2 bg-white border border-slate-400 rounded-xl text-black focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                />
            </div>

            {/* Jabatan (BARU) */}
            <div>
                <label className="text-xs font-bold text-black uppercase mb-1 block">Jabatan (Opsional)</label>
                <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
                    <input 
                        type="text" 
                        placeholder="Contoh: Ka. Sub Bidang TI"
                        value={data.jabatan}
                        onChange={(e) => handlers.setJabatan(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-400 rounded-xl text-black focus:ring-2 focus:ring-black outline-none text-sm font-medium placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Nama Pejabat */}
            <div>
                <label className="text-xs font-bold text-black uppercase mb-1 block">Nama Pejabat/Petugas</label>
                <div className="relative">
                    <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
                    <input 
                        type="text" 
                        placeholder="Nama Lengkap..."
                        value={data.nama}
                        onChange={(e) => handlers.setNama(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-400 rounded-xl text-black focus:ring-2 focus:ring-black outline-none text-sm font-medium placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* NPP */}
            <div>
                <label className="text-xs font-bold text-black uppercase mb-1 block">NPP (Opsional)</label>
                <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
                    <input 
                        type="text" 
                        placeholder="Contoh: 690829809"
                        value={data.npp}
                        onChange={(e) => handlers.setNpp(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-400 rounded-xl text-black focus:ring-2 focus:ring-black outline-none text-sm font-medium placeholder:text-gray-400"
                    />
                </div>
            </div>

            {/* Tanggal */}
            <div>
                <label className="text-xs font-bold text-black uppercase mb-1 block">Custom Tanggal</label>
                <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-black" size={18} />
                    <input 
                        type="date" 
                        value={data.tanggal}
                        onChange={(e) => handlers.setTanggal(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-400 rounded-xl text-black focus:ring-2 focus:ring-black outline-none text-sm font-medium"
                    />
                </div>
                <p className="text-[11px] text-black mt-1.5 font-bold ml-1">
                    *Tgl: {data.tanggal ? formatDateDisplay(data.tanggal) : `Otomatis (${formatDateDisplay(getTodayDate())})`}
                </p>
            </div>
        </div>
    </div>
);