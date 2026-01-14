"use client";

import React, { useState, useRef, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
// --- PERBAIKAN IMPORT ---
import { X, CheckCircle, Loader2, AlertTriangle, Users, Send, ArrowLeft, File, Image as ImageIcon, Download, Home } from "lucide-react"; 

// --- KONFIGURASI URL ASLI DARI ENV ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || ""; 
const API_BASE_URL_PORTAL_PEGAWAI = process.env.NEXT_PUBLIC_API_BASE_URL_PORTAL_PEGAWAI || "";
const IMAGE_STORAGE_BASE_URL = process.env.NEXT_PUBLIC_IMAGE_STORAGE_BASE_URL || "";

// --- URL ENDPOINT ASLI (NO PROXY) ---
const GET_SPK_VIEW_URL = `${API_BASE_URL}/spk/view`;
const POST_ASSIGN_SPK_URL = `${API_BASE_URL}/spk/menugaskan`;

const GET_PENGAJUAN_VIEW_URL = `${API_BASE_URL}/pengajuan/view`;

const GET_PEGAWAI_ALL_URL = `${API_BASE_URL_PORTAL_PEGAWAI}/client/user/all-pegawai`;

const FALLBACK_IMAGE_URL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

// --- TYPES ---
type PegawaiItem = { name: string; npp: string | null; jabatan: string | null; tlp: string | null };
type AssignedPerson = PegawaiItem & { isPic: boolean };
type ToastMessage = { show: boolean; message: string; type: "success" | "error" };

type SPKDetail = {
    uuid: string;
    nomor_spk: string;
    pekerjaan_spk: string;
    tanggal_spk: string;
    status: string;
    pengajuan_uuid: string | null;
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
    ttd_mengetahui_path: string | null; 
    keterangan: string; 
    file_paths: string[]; 
    status: string;
};

// --- KOMPONEN MODAL ---
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
                    className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 z-10"
                    title="Tutup"
                >
                    <X size={20} />
                </button>
                <img src={imageUrl} alt="Lampiran Detail" className="w-full h-auto" />
            </div>
        </div>
    );
};

// --- UTILITY COMPONENTS ---
const Button = ({ onClick, children, className = "bg-blue-600 hover:bg-blue-700 text-white", disabled = false }: any) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
    >
        {children}
    </button>
);

const ToastBox = ({ toast, onClose }: {
    toast: ToastMessage,
    onClose: () => void
}) =>
    toast.show && (
        <div
            className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 transition-opacity duration-300 flex items-center gap-2 ${
                toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
        >
            {toast.type === "success" ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            {toast.message}
            <button onClick={onClose} className="text-white ml-2">
                <X size={14} />
            </button>
        </div>
    );

// --- DROPDOWN PEGAWAI ---
const GmailDropdown = ({ 
    items, 
    onSelect, 
    isOpen, 
    onClose, 
    inputValue, 
    setInputValue,
    assignedPeople
}: {
    items: PegawaiItem[];
    onSelect: (name: string) => void;
    isOpen: boolean;
    onClose: () => void;
    inputValue: string;
    setInputValue: (value: string) => void;
    assignedPeople: AssignedPerson[];
}) => {
    const safeItems = Array.isArray(items) ? items : []; 

    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null); 
    
    const filteredItems = safeItems.filter((item: PegawaiItem) => {
        const isAlreadyAssigned = assignedPeople.some((assigned: AssignedPerson) => 
            assigned.name === item.name
        );
        const matchesInput = item.name.toLowerCase().includes(inputValue.toLowerCase());
        return !isAlreadyAssigned && matchesInput;
    });

    useEffect(() => {
        setHighlightedIndex(0);
    }, [filteredItems]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose(); 
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]); 

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => prev < filteredItems.length - 1 ? prev + 1 : 0);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredItems.length - 1);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredItems[highlightedIndex]) {
                    handleSelect(filteredItems[highlightedIndex]);
                }
                break;
            case 'Escape':
                onClose(); 
                break;
        }
    };

    const handleSelect = (item: PegawaiItem) => {
        onSelect(item.name);
        setInputValue('');
        onClose(); 
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query) return text;
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return parts.map((part, i) => 
            part.toLowerCase() === query.toLowerCase() ? 
                <span key={i} className="font-bold">{part}</span> : part
        );
    };

    if (!isOpen || filteredItems.length === 0) return null;

    return (
        <div 
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
            onKeyDown={handleKeyDown as any}
        >
            {filteredItems.map((item: PegawaiItem, index: number) => (
                <div
                    key={item.npp || index}
                    className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                        index === highlightedIndex ? 'bg-gray-100' : ''
                    }`}
                    onClick={() => handleSelect(item)}
                >
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                        <span className="text-sm font-medium text-black">
                            {item.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-black">
                            {highlightMatch(item.name, inputValue)}
                        </div>
                        <div className="text-xs text-black">
                            {item.npp ? `NPP: ${item.npp}` : ''}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const Chip = ({ person, onRemove, onTogglePic }: { person: AssignedPerson, onRemove: (name: string) => void, onTogglePic: (name: string) => void }) => (
    <div className="inline-flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mr-1 shadow-sm border border-blue-200">
        <div 
            className="cursor-pointer mr-2 flex items-center justify-center transition-colors duration-200" 
            onClick={() => onTogglePic(person.name)}
            title="Set sebagai Penanggung Jawab (PIC)"
        >
            {person.isPic ? (
                <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" />
            ) : (
                <div className="w-4 h-4 border-2 border-blue-400 rounded-full hover:bg-blue-200"></div>
            )}
        </div>
        <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <span className="font-medium">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
        <X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" onClick={() => onRemove(person.name)} />
    </div>
);

// --- HELPER: FORMAT TANGGAL BAHASA INDONESIA ---
const formatDateIndo = (dateString: string) => {
    if (!dateString) return "-";
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            // Coba parse format DD/MM/YYYY jika ISO gagal
            const parts = dateString.split('/');
            if (parts.length === 3) {
                const formatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
                const newDate = new Date(formatted);
                if (!isNaN(newDate.getTime())) return dateString; // Fallback ke string asli jika tidak bisa parse
            }
            return dateString;
        }

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const months = [
            'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
            'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
        ];

        const dayName = days[date.getDay()];
        const day = date.getDate();
        const monthName = months[date.getMonth()];
        const year = date.getFullYear();

        return `${dayName}, ${day} ${monthName} ${year}`;
    } catch (e) {
        return dateString;
    }
};

// --- MAIN CONTENT ---
function AssignSPKContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const spk_uuid = searchParams.get('uuid'); 

    const [spkData, setSpkData] = useState<SPKDetail | null>(null);
    const [assignedPeople, setAssignedPeople] = useState<AssignedPerson[]>([]); 
    const [currentPersonInput, setCurrentPersonInput] = useState("");
    
    const [pegawaiList, setPegawaiList] = useState<PegawaiItem[]>([]);
    const [isLoadingPegawai, setIsLoadingPegawai] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<ToastMessage>({ show: false, message: "", type: "success" });

    const [pengajuanDetail, setPengajuanDetail] = useState<PengajuanDetail | null>(null);
    const [isLoadingPengajuan, setIsLoadingPengajuan] = useState(false);
    const [pengajuanError, setPengajuanError] = useState<string | null>(null);
    
    // STATE MODAL
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null); 

    // Ref untuk form penentuan personel
    const personelFormRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    const scrollToPersonelForm = () => {
        if (personelFormRef.current) {
            personelFormRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- FETCH PEGAWAI (DIRECT API) ---
    const fetchAllPegawai = useCallback(async () => {
        setIsLoadingPegawai(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
            console.error("Token tidak ditemukan");
            setIsLoadingPegawai(false);
            return;
        }

        try {
            const res = await fetch(GET_PEGAWAI_ALL_URL, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (!res.ok) throw new Error("Gagal mengambil data Pegawai dari Portal Pegawai API.");

            const json = await res.json();
            const dataArray = json.data || json;

            if (Array.isArray(dataArray)) {
                const formattedPegawai = dataArray
                    .map((item: any) => ({
                        name: item.nama_pegawai || item.nama || null,
                        npp: item.npp || null,
                        jabatan: item.jabatan || item.jabsatker || null,
                        tlp: item.rl_pegawai_local?.tlp || item.tlp || item.telepon || null
                    }))
                    .filter((person): person is PegawaiItem => person.name !== null && person.name.trim() !== '');

                setPegawaiList(formattedPegawai);
            }
        } catch (err) {
            console.error("Error fetching pegawai:", err);
        } finally {
            setIsLoadingPegawai(false);
        }
    }, []);

    // --- FETCH SPK DETAIL (DIRECT API) ---
    const fetchDetailSPK = useCallback(async () => {
        if (!spk_uuid) {
            setError("UUID SPK tidak ditemukan dalam URL.");
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

        try {
            const url = `${GET_SPK_VIEW_URL}/${spk_uuid}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, },
            });
            
            const contentType = res.headers.get("content-type");
            if (!res.ok || (contentType && !contentType.includes("application/json"))) {
                throw new Error(`Gagal memuat data SPK. Server Status: ${res.status}`);
            }
            
            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message || "Gagal memuat data dari API SPK.");
            }
            
            const item = result.data;

            const mappedData: SPKDetail = {
                uuid: item.uuid || spk_uuid,
                pengajuan_uuid: item.uuid_pengajuan || null, 
                nomor_spk: item.no_surat || item.uuid_pengajuan || "N/A",
                pekerjaan_spk: item.uraian_pekerjaan || item.jenis_pekerjaan?.nama_pekerjaan || "Tidak ada data",
                tanggal_spk: item.tanggal_spk || item.tanggal || "-",
                status: item.status?.name || "Tidak ada data",
            };

            setSpkData(mappedData);

        } catch (err: any) {
            console.error("Error fetch SPK Detail:", err);
            setError(err.message || "Terjadi kesalahan saat memuat SPK.");
        } finally {
            setLoading(false);
        }
    }, [spk_uuid, router]);

    // --- FETCH PENGAJUAN DETAIL (DIRECT API) ---
    const fetchDetailPengajuan = useCallback(async (pengajuanUuid: string) => {
        if (!pengajuanUuid) {
            setPengajuanError("UUID Pengajuan tidak ditemukan.");
            return;
        }

        setIsLoadingPengajuan(true);
        setPengajuanError(null);
        const token = localStorage.getItem("token");

        try {
            const url = `${GET_PENGAJUAN_VIEW_URL}/${pengajuanUuid}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
                cache: "no-store",
            });

            if (!res.ok) throw new Error(`Gagal memuat detail pengajuan. Status: ${res.status}`);

            const result = await res.json();
            
            if (!result.success || !result.data) throw new Error(result.message || "Gagal memuat data dari API.");

            const data = result.data;
            const masterhal = result.masterhal;

            // --- PERBAIKAN: AMBIL PARENT SATKER (kd_parent) ---
            const satkerName = result.kd_parent?.parent_satker || result.kd_satker?.satker_name || data.satker;

            const mappedPengajuan: PengajuanDetail = {
                uuid: data.uuid,
                no_surat: data.no_surat,
                nama_jenis: masterhal?.nama_jenis || 'N/A', 
                hal_id: masterhal?.id || 'N/A', 
                kepada: data.kepada,
                satker: satkerName, // PERBAIKAN LOGIKA SATKER
                name_pelapor: data.name_pelapor,
                npp_pelapor: data.npp_pelapor,
                tlp_pelapor: data.rl_pegawai_local?.tlp || data.tlp_pelapor,
                ttd_pelapor_path: data.ttd_pelapor,
                mengetahui: data.mengetahui,
                ttd_mengetahui_path: data.ttd_mengetahui,
                keterangan: data.keterangan,
                file_paths: Array.isArray(data.file) ? data.file : (data.file ? [data.file] : []),
                status: data.status,
            };

            setPengajuanDetail(mappedPengajuan);

        } catch (err: any) {
            console.error("Error fetching Pengajuan Detail:", err);
            setPengajuanError(err.message || "Gagal memuat data pengajuan.");
        } finally {
            setIsLoadingPengajuan(false);
        }
    }, []);

    // --- HANDLERS ---
    const handleAddPerson = (selectedName: string | null = null) => {
        const name = (selectedName || currentPersonInput).trim();
        if (!name) return;

        const detail = pegawaiList.find(p => p.name.toLowerCase() === name.toLowerCase());
        const fullName = detail ? detail.name : name;
        const npp = detail ? detail.npp : null;
        const tlp = detail ? detail.tlp : null; 

        if (assignedPeople.some(p => p.name.toLowerCase() === fullName.toLowerCase())) {
            setCurrentPersonInput("");
            setIsDropdownOpen(false);
            return;
        }
        
        const isFirstPerson = assignedPeople.length === 0;
        
        const newPerson: AssignedPerson = {
            name: fullName,
            npp: npp,
            isPic: isFirstPerson,
            jabatan: detail?.jabatan || null,
            tlp: tlp 
        };

        const updatedPeople = isFirstPerson 
            ? [newPerson]
            : [...assignedPeople, newPerson];

        setAssignedPeople(updatedPeople);
        setCurrentPersonInput("");
        setIsDropdownOpen(false);
    };

    const handleRemovePerson = (nameToRemove: string) => {
        let newAssignedPeople = assignedPeople.filter(p => p.name !== nameToRemove);
        const removedPersonIsPic = assignedPeople.find(p => p.name === nameToRemove)?.isPic;

        if (removedPersonIsPic && newAssignedPeople.length > 0) {
            newAssignedPeople = newAssignedPeople.map((p, index) => ({
                ...p,
                isPic: index === 0 ? true : p.isPic,
            }));
        }

        setAssignedPeople(newAssignedPeople);
    };

    const handleTogglePic = (nameToSetAsPic: string) => {
        setAssignedPeople(assignedPeople.map(p => ({
            ...p,
            isPic: p.name === nameToSetAsPic, 
        })));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && currentPersonInput.trim() !== '') {
            e.preventDefault();
            handleAddPerson();
        }
        if (e.key === 'Backspace' && currentPersonInput === '' && assignedPeople.length > 0) {
            const lastPersonName = assignedPeople[assignedPeople.length - 1].name;
            handleRemovePerson(lastPersonName);
        }
    };

    const handleSubmitAssignment = async () => {
        if (assignedPeople.length === 0) {
            showToast("Minimal harus ada satu personel yang ditugaskan.", "error");
            return;
        }
        
        const pic = assignedPeople.find(p => p.isPic);
        if (!pic) {
            showToast("Harap tentukan satu Penanggung Jawab (PIC).", "error");
            return;
        }

        if (!spkData) {
            showToast("Detail SPK belum termuat.", "error");
            return;
        }

        setIsSubmitting(true);
        
        const token = localStorage.getItem("token");
        if (!token) {
            showToast("Otorisasi hilang. Silakan login ulang.", "error");
            setIsSubmitting(false);
            return;
        }
        
        try {
            const stafsPayload = assignedPeople.map(p => ({
                npp: p.npp || 'NPP_KOSONG', 
                nama: p.name,
                tlp: p.tlp || null, 
                is_penanggung_jawab: p.isPic,
            }));
            
            const payload = {
                spk_uuid: spkData.uuid,
                pengajuan_uuid: spkData.pengajuan_uuid,
                stafs: stafsPayload,
            };

            const res = await fetch(POST_ASSIGN_SPK_URL, { 
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload),
            });
            
            const result = await res.json();
            
            if (!res.ok || !result.success) {
                throw new Error(result.message || "Gagal menyimpan penugasan.");
            }

            showToast(`SPK ${spkData.nomor_spk} berhasil ditugaskan! PIC: ${pic.name}`, "success");
            
            setTimeout(() => {
                router.push("/dashboard/spk");
            }, 1500);

        } catch (error: any) {
            console.error('Error submit assignment:', error);
            showToast(`Gagal menugaskan: ${error.message || 'Terjadi kesalahan'}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- EFFECTS ---
    useEffect(() => {
        fetchAllPegawai();
    }, [fetchAllPegawai]);

    useEffect(() => {
        if (spkData && spkData.pengajuan_uuid) {
            fetchDetailPengajuan(spkData.pengajuan_uuid);
        }
    }, [spkData, fetchDetailPengajuan]);

    useEffect(() => {
        fetchDetailSPK();
    }, [fetchDetailSPK]);

    // --- HELPER GAMBAR (DIRECT API) ---
    const getDirectImageUrl = (path: string | null): string | null => {
        if (!path) return null;
        
        if (path.startsWith('http')) {
            return path; 
        }

        return `${IMAGE_STORAGE_BASE_URL}${path}`; 
    };

    // --- RENDERING ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-black">Memuat data SPK...</span>
            </div>
        );
    }

    if (error || !spkData) {
        return (
            <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-xl mt-10">
                <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
                <h3 className="text-2xl font-bold text-red-600 text-center mb-2">Akses Ditolak / Data Tidak Ditemukan</h3>
                <p className="text-black text-center mb-6">{error || "Data SPK tidak dapat dimuat."}</p>
                <button
                    onClick={() => router.push("/dashboard/spk")}
                    className="w-full bg-blue-600 text-white py-2 rounded-lg mt-4 flex items-center justify-center"
                >
                    <Home size={18} className="inline-block mr-2" />
                    Kembali
                </button>
            </div>
        );
    }

    const picName = assignedPeople.find(p => p.isPic)?.name || "-";

    return (
        <div className="p-6 min-h-screen bg-gray-50">
            <style>{`
                @media print {
                    .no-print { display: none !important; }
                    body { background: white; }
                .shadow-xl { box-shadow: none !important; border: 1px solid #ddd; }
                .bg-gray-50 { background: white !important; }
                .rounded-2xl { border-radius: 0 !important; }
            }
            `}</style>

            <div className="max-w-5xl mx-auto space-y-6">
                <ToastBox toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
                <ImageModal 
                    imageUrl={modalImageUrl} 
                    onClose={() => setModalImageUrl(null)} 
                />

                {/* HEADER */}
                <div className="flex items-center justify-between bg-white p-5 rounded-2xl shadow-lg">
                    <button 
                        onClick={() => router.push("/dashboard/spk")} 
                        disabled={isSubmitting}
                        className="p-2 rounded-full bg-gray-800 text-white shadow hover:bg-gray-900 transition disabled:opacity-50 flex items-center justify-center"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="bg-cyan-600 p-3 rounded-xl shadow-lg">
                            <Users className="text-white" size={28} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-black">Penugasan Personel SPK</h1>
                            <p className="text-sm text-black">
                                Menugaskan personel untuk SPK: <span className="font-bold text-cyan-600">{spkData.nomor_spk}</span>
                            </p>
                        </div>
                    </div>
                    <button onClick={() => router.push("/dashboard/spk")} className="bg-gray-100 text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition">
                        Kembali ke Daftar SPK
                    </button>
                </div>

                {/* KONTEN UTAMA: VERTICAL STACK */}
                <div className="space-y-6">
                    
                    {/* BAGIAN 1: DETAIL SPK & PENGAJUAN */}
                    <div className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-black">Detail SPK & Pengajuan Terkait</h2>
                            <button 
                                onClick={scrollToPersonelForm}
                                className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors shadow-sm"
                            >
                                <Send size={16} /> Ke Form Penugasan
                            </button>
                        </div>
                        
                        {isLoadingPengajuan && <div className="text-center py-4 text-blue-600"><Loader2 className="animate-spin mx-auto" size={24} /> Memuat detail pengajuan...</div>}
                        {pengajuanError && <div className="text-red-600 bg-red-50 p-3 rounded border border-red-200 text-sm">{pengajuanError}</div>}
                        
                        {/* Detail SPK */}
                        <dl className="space-y-3 text-sm text-black mb-6 pb-6 border-b">
                            <div className="grid grid-cols-2 gap-4">
                                <dt className="font-semibold text-black">Nomor SPK:</dt>
                                <dd className="font-bold text-cyan-700">{spkData.nomor_spk}</dd>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <dt className="font-semibold text-black">Pekerjaan:</dt>
                                <dd>{spkData.pekerjaan_spk}</dd>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <dt className="font-semibold text-black">Tanggal SPK:</dt>
                                <dd className="font-semibold text-black">{formatDateIndo(spkData.tanggal_spk)}</dd>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <dt className="font-semibold text-black">Status:</dt>
                                <dd className={`inline-block px-2 py-1 rounded text-white text-xs ${spkData.status === 'Approved' ? 'bg-green-500' : 'bg-gray-400'}`}>
                                    {spkData.status}
                                </dd>
                            </div>
                        </dl>

                        {/* Detail Pengajuan */}
                        {pengajuanDetail && (
                            <div className="space-y-4 text-sm">
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="text-black">No. Pengajuan:</span>
                                        <span className="font-bold text-black">{pengajuanDetail.no_surat}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="text-black">Jenis (Perihal):</span>
                                        <span className="font-bold text-purple-700">{pengajuanDetail.nama_jenis}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="text-black">Pelapor:</span>
                                        <span className="text-black">{pengajuanDetail.name_pelapor} ({pengajuanDetail.npp_pelapor})</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="text-black">Mengetahui:</span>
                                        <span className="text-black">{pengajuanDetail.mengetahui}</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <span className="text-black">Satker Asal:</span>
                                        <span className="font-bold text-black">{pengajuanDetail.satker}</span>
                                    </div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 italic text-black whitespace-pre-wrap">
                                    {pengajuanDetail.keterangan}
                                </div>
                                
                                {/* TANDA TANGAN */}
                                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                                    <div className="border border-gray-200 rounded-lg p-3">
                                        <dt className="font-medium mb-2 text-black">Tanda Tangan Mengetahui</dt>
                                        <dd className="text-center h-40 flex flex-col justify-end items-center">
                                            {pengajuanDetail.ttd_mengetahui_path ? (
                                                <img 
                                                    src={getDirectImageUrl(pengajuanDetail.ttd_mengetahui_path) || ""} 
                                                    alt="TTD Mengetahui" 
                                                    className="h-32 w-auto mx-auto object-contain mb-1" 
                                                />
                                            ) : (
                                                <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-black italic text-xs">TTD tidak tersedia.</div>
                                            )}
                                            <p className="text-xs mt-1 text-black font-semibold">{pengajuanDetail.mengetahui || 'N/A'}</p>
                                        </dd>
                                    </div>
                                    <div className="border border-gray-200 rounded-lg p-3">
                                        <dt className="font-medium mb-2 text-black">Tanda Tangan Pelapor</dt>
                                        <dd className="text-center h-40 flex flex-col justify-end items-center">
                                            {pengajuanDetail.ttd_pelapor_path ? (
                                                <img 
                                                    src={getDirectImageUrl(pengajuanDetail.ttd_pelapor_path) || ""} 
                                                    alt="TTD Pelapor" 
                                                    className="h-32 w-auto mx-auto object-contain mb-1" 
                                                />
                                            ) : (
                                                <div className="h-32 bg-gray-100 rounded flex items-center justify-center text-black italic text-xs">TTD tidak tersedia.</div>
                                            )}
                                            <p className="text-xs mt-1 text-black font-semibold">{pengajuanDetail.name_pelapor}</p>
                                        </dd>
                                    </div>
                                </div>

                                {/* LAMPIRAN */}
                                {pengajuanDetail.file_paths.length > 0 && (
                                    <div className="pt-4 border-t">
                                        <h3 className="text-sm font-bold text-black mb-2">Lampiran ({pengajuanDetail.file_paths.length})</h3>
                                        <div className="grid grid-cols-4 gap-4">
                                            {pengajuanDetail.file_paths.map((path, index) => {
                                                const imgUrl = getDirectImageUrl(path);
                                                if (!imgUrl) return null;

                                                return (
                                                    <div key={index} className="relative group">
                                                        <div 
                                                            onClick={() => setModalImageUrl(imgUrl)}
                                                            className="h-24 w-full bg-gray-100 rounded-lg border border-gray-300 overflow-hidden cursor-pointer hover:border-blue-400 transition"
                                                        >
                                                            <img 
                                                                src={imgUrl} 
                                                                alt={`lampiran-${index}`}
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 flex items-center justify-center transition-all">
                                                                <ImageIcon className="text-white drop-shadow-md" size={20} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* BAGIAN 2: FORM PENUGASAN (DIPINDAH KE BAWAH) */}
                    <div ref={personelFormRef} className="bg-white p-6 rounded-2xl shadow-xl border border-gray-200 border-t-4 border-green-500">
                        <h2 className="text-xl font-bold text-black mb-6 flex items-center gap-2">
                            <Users size={20} className="text-green-600"/> Form Penugasan
                        </h2>

                        {/* INPUT PERSONEL */}
                        <div className="space-y-4">
                            <label className="text-sm font-medium text-black block">
                                Pilih Personel yang Ditugaskan:
                            </label>
                            
                            <div className="flex flex-wrap items-center p-3 border-2 border-dashed border-gray-300 rounded-xl bg-white min-h-[50px] focus-within:ring-2 focus-within:ring-green-300 transition-colors">
                                {assignedPeople.map((person) => (
                                    <Chip 
                                        key={person.name} 
                                        person={person} 
                                        onRemove={handleRemovePerson}
                                        onTogglePic={handleTogglePic}
                                    />
                                ))}

                                <div className="flex-1 relative min-w-[200px]">
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={currentPersonInput}
                                        onChange={(e) => {
                                            setCurrentPersonInput(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        onKeyDown={handleKeyDown}
                                        placeholder={isLoadingPegawai ? "Memuat daftar pegawai..." : "Ketik nama atau NPP..."}
                                        className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100 text-black placeholder:text-gray-900"
                                        disabled={isLoadingPegawai || isSubmitting}
                                    />
                                    
                                    {isLoadingPegawai && (
                                        <div className="absolute right-3 top-2.5">
                                            <Loader2 className="animate-spin text-gray-400" size={16} />
                                        </div>
                                    )}

                                    <GmailDropdown
                                        items={pegawaiList}
                                        onSelect={(name) => handleAddPerson(name)}
                                        isOpen={isDropdownOpen && currentPersonInput.length > 0}
                                        onClose={() => setIsDropdownOpen(false)}
                                        inputValue={currentPersonInput}
                                        setInputValue={setCurrentPersonInput}
                                        assignedPeople={assignedPeople}
                                    />
                                </div>
                                
                                <Button 
                                    onClick={() => handleAddPerson()} 
                                    className="ml-2 px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full text-white disabled:opacity-50" 
                                    disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
                                >
                                    +
                                </Button>
                            </div>

                            {/* CATATAN PIC */}
                            <p className="text-xs text-black">
                                * Klik ikon bulat <CheckCircle className="inline w-3 h-3 mx-1 text-green-600"/> pada chip untuk set sebagai Penanggung Jawab (PIC).
                            </p>

                            {/* LIST ASSIGNED */}
                            {assignedPeople.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-sm font-semibold text-black mb-2">Personel Ditugaskan:</h3>
                                    <div className="space-y-2">
                                        {assignedPeople.map((person, index) => (
                                            <div key={index} className={`flex items-center justify-between p-3 rounded-lg border ${person.isPic ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white'}`}>
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold text-black">
                                                                {person.name.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="text-sm font-bold text-black">{person.name}</div>
                                                                <div className="text-xs text-black flex items-center gap-2">
                                                                    <span>NPP: {person.npp || '-'}</span>
                                                                    <span className="text-gray-400">|</span>
                                                                    <span>{person.tlp || 'No HP'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="text-xs text-black mr-2">#{index + 1}</div>
                                                            {person.isPic && (
                                                                <span className="bg-green-100 text-green-800 text-[10px] font-bold px-2 py-0.5 rounded border border-green-300">PIC</span>
                                                            )}
                                                            <X 
                                                                size={16} 
                                                                className="cursor-pointer text-black hover:text-red-500" 
                                                                onClick={() => handleRemovePerson(person.name)}
                                                            />
                                                        </div>
                                                </div>
                                            ))}
                                    </div>
                                </div>
                            )}

                            {/* TOMBOL SUBMIT */}
                            <div className="pt-6">
                                <button
                                    onClick={handleSubmitAssignment} 
                                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 text-lg font-bold transition-transform transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
                                    disabled={isSubmitting || assignedPeople.length === 0 || !assignedPeople.some(p => p.isPic)}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 size={20} className="animate-spin" /> 
                                            Menyimpan...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={20} /> 
                                            Tugaskan Sekarang
                                        </>
                                    )}
                                </button>
                                {assignedPeople.some(p => p.isPic) && assignedPeople.length > 1 && (
                                     <p className="text-xs text-black text-center mt-2">
                                         Menugaskan untuk: <span className="font-bold text-green-600">{picName}</span> dan {assignedPeople.length - 1} staf lainnya.
                                     </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AssignSPKPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-black">Memuat Halaman...</span>
            </div>
        }>
            <AssignSPKContent />
        </Suspense>
    );
}