"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
    FileBarChart, Filter, Building2, Printer, 
    Loader2, FileText, Briefcase, Hash, ChevronDown, Search, X,
    Lock, Home // Tambahan Icon
} from "lucide-react";

// --- KONSTANTA PERMISSION ---
const VIEW_LAPORAN_PERMISSION = "workorder-pti.view.laporan";

// --- TIPE DATA ---
interface OptionItem {
    id: number | string;
    satker_name?: string;
    parent_satker?: string;
    kd_satker?: string;
    kd_parent?: string;
    nama_jenis?: string;
    nama?: string;
    name?: string;
    code?: string;
    [key: string]: any; 
}

// --- KOMPONEN: ACCESS DENIED UI (Sesuai Referensi) ---
const AccessDeniedUI = ({ missingPermission }: { missingPermission: string }) => {
    const router = useRouter();
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-8 md:p-10 text-center transform transition-all">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-6">
                    <Lock className="text-red-600" size={32} />
                </div>
                <h1 className="text-3xl font-bold text-black mb-3">Akses Ditolak</h1>
                <p className="text-black mb-6 leading-relaxed">
                    Maaf, Anda tidak memiliki izin yang cukup untuk mengakses halaman ini.
                </p>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                    <p className="text-sm font-semibold text-black mb-1">Izin yang Diperlukan:</p>
                    <code className="block bg-white px-3 py-2 rounded border border-red-200 text-red-600 font-mono text-sm">
                        {missingPermission}
                    </code>
                </div>
                <button
                    onClick={() => router.push('/dashboard')} 
                    className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-6 rounded-lg transition-colors shadow-md"
                >
                    <Home size={18} />
                    Kembali ke Dashboard
                </button>
            </div>
        </div>
    );
};

// --- KOMPONEN: SEARCHABLE DROPDOWN ---
const SearchableDropdown = ({ 
    label, 
    options, 
    value, 
    onChange, 
    placeholder = "Pilih...",
    valueKey = "id",    
    labelKey = "nama"   
}: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Cari item yang sedang dipilih
    const selectedItem = options.find((opt: any) => String(opt[valueKey]) === String(value));

    // Filter opsi berdasarkan ketikan
    const filteredOptions = options.filter((opt: any) => {
        const labelText = opt[labelKey] || ""; 
        return labelText.toLowerCase().includes(searchTerm.toLowerCase());
    });

    useEffect(() => {
        if (!isOpen) setSearchTerm("");
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: any) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</label>
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 bg-white border border-gray-300 rounded-xl cursor-pointer flex items-center justify-between transition-all hover:border-blue-400 ${isOpen ? 'ring-2 ring-blue-500 border-transparent' : ''}`}
            >
                <span className={`text-sm font-medium ${selectedItem ? 'text-black' : 'text-gray-400'}`}>
                    {/* TAMPILKAN NAMA, JIKA NULL TAMPILKAN STRIP */}
                    {selectedItem ? (selectedItem[labelKey] || "-") : placeholder}
                </span>
                
                {value ? (
                     <div onClick={(e) => {
                         e.stopPropagation(); 
                         onChange(""); 
                     }} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={16} className="text-gray-500" />
                     </div>
                ) : (
                    <ChevronDown size={18} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mb-2 bottom-full left-0 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    
                    <div className="p-2 border-b border-gray-100 bg-gray-50 sticky top-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Ketik untuk mencari..." 
                                className="w-full pl-9 pr-3 py-2 text-sm text-black font-medium border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {/* --- OPSI RESET: SEMUA SATKER --- */}
                        <div 
                            onClick={() => {
                                onChange(""); // Kosongkan value
                                setIsOpen(false);
                            }}
                            className="px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 font-bold text-blue-600 italic"
                        >
                            -- Semua Satker (Reset) --
                        </div>

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((item: any, index: number) => {
                                // Fallback Label: Jika null, ganti "-"
                                const labelText = item[labelKey] || "-";
                                const itemValue = item[valueKey];
                                
                                return (
                                    <div 
                                        key={`${itemValue}-${index}`} 
                                        onClick={() => {
                                            onChange(itemValue);
                                            setIsOpen(false);
                                        }}
                                        className={`px-4 py-3 text-sm cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${String(value) === String(itemValue) ? 'bg-blue-100 text-blue-700 font-bold' : 'text-gray-700'}`}
                                    >
                                        {labelText}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-4 py-3 text-sm text-gray-400 text-center italic">
                                Data tidak ditemukan.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- KOMPONEN: MODERN SELECT ---
const ModernSelect = ({ label, value, onChange, options, icon: Icon, placeholder = "Pilih...", valueKey="id", labelKey="nama" }: any) => (
    <div className="space-y-2">
        <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">{label}</label>
        <div className="relative group">
            {Icon && <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-500 transition-colors" size={18} />}
            <select 
                value={value} 
                onChange={onChange} 
                className={`w-full ${Icon ? 'pl-11' : 'pl-4'} pr-10 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-black appearance-none cursor-pointer hover:border-gray-400 transition-all`}
            >
                <option value="">{placeholder}</option>
                {options.map((opt: any) => (
                    <option key={opt[valueKey]} value={opt[valueKey]}>
                        {opt[labelKey]}
                    </option>
                ))}
            </select>
            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
        </div>
    </div>
);

// --- MAIN PAGE ---
export default function LaporanPage() {
    const router = useRouter();
    const [permissionsLoaded, setPermissionsLoaded] = useState(false);
    const [hasAccess, setHasAccess] = useState(false);

    // --- STATE FILTER ---
    const [jenisLaporan, setJenisLaporan] = useState("pengajuan"); 
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [status, setStatus] = useState(""); 
    
    // State Nilai Filter
    const [satker, setSatker] = useState(""); 
    const [halId, setHalId] = useState(""); 
    const [jenisPekerjaanId, setJenisPekerjaanId] = useState(""); 

    // --- STATE DATA OPSI ---
    const [listSatker, setListSatker] = useState<OptionItem[]>([]);
    const [listHal, setListHal] = useState<OptionItem[]>([]);
    const [listJenisPekerjaan, setListJenisPekerjaan] = useState<OptionItem[]>([]);
    const [listStatusSpk, setListStatusSpk] = useState<OptionItem[]>([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    // --- CHECK PERMISSION ---
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const storedPermissions = localStorage.getItem('user_permissions');
            if (storedPermissions) {
                try {
                    const permissions = JSON.parse(storedPermissions);
                    if (Array.isArray(permissions) && permissions.includes(VIEW_LAPORAN_PERMISSION)) {
                        setHasAccess(true);
                    } else {
                        setHasAccess(false);
                    }
                } catch (e) {
                    console.error("Gagal parse user_permissions:", e);
                    setHasAccess(false);
                }
            } else {
                setHasAccess(false);
            }
            setPermissionsLoaded(true);
        }
    }, []);

    // --- LOAD DATA (Hanya jika punya akses) ---
    useEffect(() => {
        if (!hasAccess) return;

        const fetchOptions = async () => {
            setLoadingOptions(true);
            try {
                const token = localStorage.getItem('token');
                const headers: HeadersInit = {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) 
                };

                const [resSatker, resHal, resJenis] = await Promise.all([
                    fetch('/api/satker', { headers }),
                    fetch('/api/hal', { headers }),
                    fetch('/api/jenis-pekerjaan', { headers })
                ]);

                if (resSatker.ok) {
                    const json = await resSatker.json();
                    setListSatker(Array.isArray(json.data) ? json.data : []);
                }
                if (resHal.ok) {
                    const json = await resHal.json();
                    setListHal(Array.isArray(json.data) ? json.data : []);
                }
                if (resJenis.ok) {
                    const json = await resJenis.json();
                    setListJenisPekerjaan(Array.isArray(json.data) ? json.data : []);
                }

            } catch (err) {
                console.error("Gagal load opsi:", err);
            } finally {
                setLoadingOptions(false);
            }
        };
        fetchOptions();
    }, [hasAccess]);

    // Load Status SPK
    useEffect(() => {
        if (jenisLaporan === 'spk' && hasAccess) {
            const fetchStatus = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) };
                    const res = await fetch('/api/spk/status', { headers });
                    if (res.ok) {
                        const json = await res.json();
                        setListStatusSpk(Array.isArray(json.data) ? json.data : []);
                    }
                } catch (e) { console.error(e); }
            };
            fetchStatus();
        }
    }, [jenisLaporan, hasAccess]);

    // Reset filter
    useEffect(() => {
        setStatus(""); setSatker(""); setHalId(""); setJenisPekerjaanId("");
    }, [jenisLaporan]);

    // --- HANDLE CETAK ---
    const handleOpenPDF = (e: React.FormEvent) => {
        e.preventDefault();
        const savedSettings = localStorage.getItem("print_settings");
        const settings = savedSettings ? JSON.parse(savedSettings) : {};

        // Cari Nama Satker untuk Display
        let namaSatkerDisplay = "";
        if (satker) {
            const selectedSatkerObj = listSatker.find(item => String(item.kd_parent) === satker);
            namaSatkerDisplay = selectedSatkerObj ? (selectedSatkerObj.parent_satker || "-") : "";
        }

        const printPayload = {
            mode: jenisLaporan,
            start_date: startDate,
            end_date: endDate,
            status, status_id: status, 
            
            satker: namaSatkerDisplay, 
            satker_id: satker,
            
            hal_id: halId,
            jenis_pekerjaan_id: jenisPekerjaanId,
            
            // --- DATA PENGATURAN CETAK (TERMASUK KOTA & HIDE DATE) ---
            kota: settings.kota || "Semarang", // Tambahkan Kota
            
            ttd_kiri_judul: settings.kiriJudul || "Dibuat Oleh",
            ttd_kiri_jabatan: settings.kiriJabatan || "",
            ttd_kiri_nama: settings.kiriNama || "",
            ttd_kiri_npp: settings.kiriNpp || "",
            ttd_kiri_tanggal: settings.kiriTanggal || "", 
            ttd_kiri_hide_date: settings.kiriHideDate || false, // Tambahkan Flag Hide

            ttd_tengah_judul: settings.tengahJudul || "Diperiksa Oleh",
            ttd_tengah_jabatan: settings.tengahJabatan || "",
            ttd_tengah_nama: settings.tengahNama || "",
            ttd_tengah_npp: settings.tengahNpp || "",
            ttd_tengah_tanggal: settings.tengahTanggal || "",
            ttd_tengah_hide_date: settings.tengahHideDate || false, // Tambahkan Flag Hide

            ttd_kanan_judul: settings.kananJudul || "Mengetahui",
            ttd_kanan_jabatan: settings.kananJabatan || "",
            ttd_kanan_nama: settings.kananNama || "",
            ttd_kanan_npp: settings.kananNpp || "",
            ttd_kanan_tanggal: settings.kananTanggal || "",
            ttd_kanan_hide_date: settings.kananHideDate || false // Tambahkan Flag Hide
        };

        localStorage.setItem("temp_print_data", JSON.stringify(printPayload));
        window.open('/cetak/laporan', '_blank');
    };

    const getStatusPengajuanOptions = () => [
        { value: "approved", label: "Approved" },
        { value: "pending", label: "Pending" },
        { value: "rejected", label: "Reject" },
    ];

    if (!permissionsLoaded) return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="animate-spin text-blue-600"/></div>;
    
    // --- SHOW ACCESS DENIED UI JIKA TIDAK PUNYA IZIN ---
    if (!hasAccess) {
        return <AccessDeniedUI missingPermission={VIEW_LAPORAN_PERMISSION} />;
    }

    return (
        <div className="space-y-6">
            {/* Header Card */}
             <div className="bg-white rounded-2xl shadow-sm p-6 border border-blue-50 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-3 rounded-xl shadow-lg shadow-blue-200">
                        <FileBarChart className="text-white" size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 leading-tight">Laporan & Rekapitulasi</h1>
                        <p className="text-gray-500 text-sm mt-1">Cetak laporan berdasarkan filter yang tersedia.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg border border-gray-100">
                {/* Header Filter */}
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
                    <Filter className="text-blue-600" size={18} />
                    <h2 className="font-bold text-gray-800 text-base">Filter Pencarian</h2>
                </div>

                <form onSubmit={handleOpenPDF} className="p-6 space-y-8">
                    
                    {/* JENIS LAPORAN (Tabs) */}
                    <div className="bg-gray-50 p-1.5 rounded-xl border border-gray-200 inline-flex w-full md:w-auto">
                        <button 
                            type="button"
                            onClick={() => setJenisLaporan("pengajuan")} 
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${jenisLaporan === "pengajuan" ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <FileText size={16} /> Laporan Pengajuan
                        </button>
                        <button 
                            type="button"
                            onClick={() => setJenisLaporan("spk")} 
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${jenisLaporan === "spk" ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5" : "text-gray-500 hover:text-gray-700"}`}
                        >
                            <Briefcase size={16} /> Laporan SPK
                        </button>
                    </div>

                    {/* GRID FILTER UTAMA */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tgl Mulai */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Tanggal Mulai</label>
                            <input 
                                type="date" 
                                value={startDate} 
                                onChange={(e) => setStartDate(e.target.value)} 
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-black transition-all" 
                            />
                        </div>
                        {/* Tgl Selesai */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">Tanggal Selesai</label>
                            <input 
                                type="date" 
                                value={endDate} 
                                onChange={(e) => setEndDate(e.target.value)} 
                                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-medium text-black transition-all" 
                            />
                        </div>
                        {/* Status */}
                        <ModernSelect 
                            label="Status"
                            value={status}
                            onChange={(e: any) => setStatus(e.target.value)}
                            options={jenisLaporan === 'pengajuan' ? getStatusPengajuanOptions() : listStatusSpk}
                            placeholder="Semua Status"
                            valueKey={jenisLaporan === 'pengajuan' ? "value" : "id"}
                            labelKey={jenisLaporan === 'pengajuan' ? "label" : "name"}
                        />
                    </div>

                    {/* FILTER KHUSUS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-dashed border-gray-200">
                        {jenisLaporan === "pengajuan" && (
                            <>
                                {/* HAL */}
                                <ModernSelect 
                                    label="Hal (Jenis Surat)"
                                    icon={Hash}
                                    value={halId}
                                    onChange={(e: any) => setHalId(e.target.value)}
                                    options={listHal}
                                    placeholder="Semua Hal"
                                    valueKey="id"
                                    labelKey="nama_jenis"
                                />

                                {/* SATKER - Gunakan Parent Satker */}
                                <SearchableDropdown 
                                    label="Parent Satker"
                                    options={listSatker}
                                    value={satker}
                                    onChange={(val: any) => setSatker(val)}
                                    placeholder="Cari Parent Satker..."
                                    valueKey="kd_parent"     
                                    labelKey="parent_satker" 
                                />
                            </>
                        )}

                        {jenisLaporan === "spk" && (
                            <div className="md:col-span-2">
                                <ModernSelect 
                                    label="Jenis Pekerjaan"
                                    icon={Briefcase}
                                    value={jenisPekerjaanId}
                                    onChange={(e: any) => setJenisPekerjaanId(e.target.value)}
                                    options={listJenisPekerjaan}
                                    placeholder="Semua Jenis Pekerjaan"
                                    valueKey="id"
                                    labelKey="nama"
                                />
                            </div>
                        )}
                    </div>

                    <div className="pt-6 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={loadingOptions} 
                            className={`px-8 py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center gap-3 font-bold text-white text-sm ${jenisLaporan === 'spk' ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-purple-200' : 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-200'}`}
                        >
                            {loadingOptions ? <Loader2 className="animate-spin" size={20}/> : <Printer size={20} />}
                            {jenisLaporan === 'spk' ? 'Cetak Laporan SPK' : 'Cetak Laporan Pengajuan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}