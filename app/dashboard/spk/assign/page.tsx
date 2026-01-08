"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation"; 
import { X, CheckCircle, Loader2, AlertTriangle, Users, Send, ArrowLeft, File, Image as ImageIcon, Download } from "lucide-react"; 

// --- KONSTANTA API ---
const API_BASE_URL = "https://workorder123.loca.lt"; 
const GET_API_SPK_VIEW_TEMPLATE_PROXY = "/api/spk-proxy/view/{uuid}";
const GET_API_PENGAJUAN_VIEW_PROXY = "/api/pengajuan/view/{uuid}"; 
const GET_PEGAWAI_API_LOCAL = "/api/pegawai-proxy/all-pegawai";
const ASSIGN_SPK_API_LOCAL = "/api/spk-proxy/menugaskan";
const GET_PHONE_NUMBERS_API = "/api/search-npp-proxy"; 

// Helper function: Menggunakan route proxy lokal untuk mengambil file.
const getProxyFileUrl = (path: string | null | undefined): string | null => {
    if (!path || path.trim() === '') return null;
    
    const sanitizedPath = path.startsWith('/') ? path.slice(1) : path;
    
    if (path.startsWith('http')) {
        return `/api/image-proxy?url=${encodeURIComponent(path)}`;
    }

    return `/api/image-proxy?path=${encodeURIComponent(sanitizedPath)}`;
};

// --- TYPES (Dilewati) ---
type PegawaiItem = { name: string; npp: string | null; jabatan: string | null; };
type AssignedPerson = PegawaiItem & { isPic: boolean; tlp?: string; };
type ToastMessage = { show: boolean; message: string; type: "success" | "error"; };

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

// --- KOMPONEN MODAL BARU ---
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
                    className="absolute top-3 right-3 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition z-10"
                    title="Tutup"
                >
                    <X size={20} />
                </button>
                
                <img src={imageUrl} alt="Lampiran Detail" className="w-full h-auto max-w-[80vw] max-h-[85vh] object-contain p-2"/>
            </div>
        </div>
    );
};

// --- UTILITY COMPONENTS (Dilewati) ---
const Button = ({ onClick, children, className = "bg-blue-600 hover:bg-blue-700 text-white", disabled = false }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        disabled={disabled}
    >
        {children}
    </button>
);

const ToastBox = ({ toast, onClose }: { toast: ToastMessage, onClose: () => void }) =>
    toast.show && (
        <div
            className={`fixed top-5 right-5 px-4 py-2 rounded-xl shadow-lg text-white text-sm z-50 transition-opacity duration-300 flex items-center gap-2 ${
                toast.type === "success" ? "bg-green-600" : "bg-red-600"
            }`}
        >
            {toast.message}
            <button onClick={onClose} className="text-white ml-2">
                <X size={14} />
            </button>
        </div>
    );

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
    // FIX: Pastikan 'items' selalu dianggap sebagai array.
    const safeItems = Array.isArray(items) ? items : []; 

    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null); 
    
    // Gunakan safeItems
    const filteredItems = safeItems.filter((item: PegawaiItem) => {
        const isAlreadyAssigned = assignedPeople.some((assigned: AssignedPerson) => 
            assigned.name.toLowerCase() === item.name.toLowerCase()
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
                        <span className="text-sm font-medium text-gray-600">
                            {item.name.charAt(0).toUpperCase()}
                        </span>
                    </div>
                    <div className="flex-1">
                        <div className="text-sm text-black">
                            {highlightMatch(item.name, inputValue)}
                        </div>
                        <div className="text-xs text-gray-500">
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

// --- MAIN COMPONENT ---
export default function AssignSPKPage() {
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
    
    // STATE BARU untuk Modal
    const [modalImageUrl, setModalImageUrl] = useState<string | null>(null); 

    // Ref untuk form penentuan personel
    const personelFormRef = useRef<HTMLDivElement>(null);

    const inputRef = useRef<HTMLInputElement>(null);

    const showToast = useCallback((message: string, type: "success" | "error") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
    }, []);

    // Fungsi untuk scroll ke form penentuan personel
    const scrollToPersonelForm = () => {
        if (personelFormRef.current) {
            personelFormRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // --- LOGIC MANIPULASI PERSON (Dilewati) ---
    const handleAddPerson = (selectedName: string | null = null) => {
        const name = (selectedName || currentPersonInput).trim();
        if (!name) return;

        const detail = pegawaiList.find(p => p.name.toLowerCase() === name.toLowerCase());
        const fullName = detail ? detail.name : name;
        const npp = detail ? detail.npp : null;

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
            jabatan: detail?.jabatan || null
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

    // --- FUNGSI UNTUK MENGAMBIL DETAIL PENGAJUAN (Dilewati) ---
    const fetchDetailPengajuan = useCallback(async (pengajuanUuid: string) => {
        if (!pengajuanUuid) {
            setPengajuanError("UUID Pengajuan tidak ditemukan.");
            return;
        }

        setIsLoadingPengajuan(true);
        setPengajuanError(null);

        const url = GET_API_PENGAJUAN_VIEW_PROXY.replace('{uuid}', pengajuanUuid);
        const token = localStorage.getItem("token");

        try {
            if (!token) throw new Error("Otorisasi hilang. Silakan login ulang.");

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error(`Gagal memuat detail pengajuan. Status: ${res.status}`);

            const result = await res.json();
            if (!result.success || !result.data) throw new Error(result.message || "Gagal memuat data dari API.");

            const data = result.data;
            const masterhal = result.masterhal;

            const mappedPengajuan: PengajuanDetail = {
                uuid: data.uuid,
                no_surat: data.no_surat,
                nama_jenis: masterhal?.nama_jenis || 'N/A', 
                hal_id: masterhal?.kode || 'N/A', 
                kepada: data.kepada,
                satker: data.satker,
                name_pelapor: data.name_pelapor,
                npp_pelapor: data.npp_pelapor,
                tlp_pelapor: data.tlp_pelapor,
                ttd_pelapor_path: data.ttd_pelapor,
                mengetahui: data.mengetahui,
                ttd_mengetahui_path: data.ttd_mengetahui,
                keterangan: data.keterangan,
                file_paths: Array.isArray(data.file) ? data.file : (data.file ? [data.file] : []),
                status: data.status,
            };

            setPengajuanDetail(mappedPengajuan);

        } catch (err: any) {
            setPengajuanError(err.message || "Terjadi kesalahan saat memuat detail pengajuan.");
        } finally {
            setIsLoadingPengajuan(false);
        }
    }, []);

    // --- FETCH DATA SPK DETAIL & PEGAWAI (Dilewati) ---
    const fetchDetailSPK = useCallback(async () => {
        if (!spk_uuid) {
            setError("UUID SPK tidak ditemukan dalam URL.");
            setLoading(false);
            return;
        }
        
        setLoading(true);
        setError(null);
        
        const url = GET_API_SPK_VIEW_TEMPLATE_PROXY.replace('{uuid}', spk_uuid);
        const token = localStorage.getItem("token");

        try {
            if (!token) {
                router.push("/login");
                return;
            }

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${token}`, "Cache-Control": "no-store" },
            });
            
            const contentType = res.headers.get("content-type");
            if (!res.ok || (contentType && !contentType.includes("application/json"))) {
                await res.text();
                throw new Error(`Gagal memuat data SPK. Server mengembalikan status ${res.status}.`);
            }
            
            const result = await res.json();

            if (!result.success) {
                throw new Error(result.message || "Gagal memuat data dari API.");
            }
            
            const item = result.data;

            const mappedData: SPKDetail = {
                uuid: item.uuid || spk_uuid,
                pengajuan_uuid: item.uuid_pengajuan || item.uuid || null, 
                nomor_spk: item.no_surat || item.uuid_pengajuan || "N/A",
                pekerjaan_spk: item.uraian_pekerjaan || item.jenis_pekerjaan?.nama_pekerjaan || "Tidak ada data",
                tanggal_spk: item.tanggal || "-",
                status: item.status?.name || "Tidak ada data",
            };

            setSpkData(mappedData);

        } catch (err: any) {
             let userErrorMessage = "Terjadi kesalahan tidak terduga saat memuat SPK.";
            if (err.message.includes("Otorisasi hilang") || err.message.includes("401")) {
                 userErrorMessage = "Sesi Anda habis. Harap login ulang.";
            } else if (err.message.includes("Gagal memuat data SPK")) {
                userErrorMessage = err.message;
            }

            setError(userErrorMessage);
            showToast(userErrorMessage, "error");
        } finally {
            setLoading(false);
        }
    }, [spk_uuid, showToast, router]);


    useEffect(() => {
        const fetchAllPegawai = async () => {
            setIsLoadingPegawai(true);
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    console.error("Token tidak ditemukan");
                    return;
                }

                const res = await fetch(GET_PEGAWAI_API_LOCAL, {
                    headers: { Authorization: `Bearer ${token}` },
                    cache: "no-store",
                });

                if (!res.ok) throw new Error("Gagal mengambil data Pegawai dari proxy.");

                const json = await res.json();
                const dataArray = json.data || json; 

                if (Array.isArray(dataArray)) {
                    const formattedPegawai = dataArray
                        .map((item: any) => ({
                            name: item.nama_pegawai || item.nama || null,
                            npp: item.npp || null,
                            jabatan: item.jabatan || null,
                        }))
                        .filter((person): person is PegawaiItem => person.name !== null && person.name.trim() !== '');

                    setPegawaiList(formattedPegawai);
                }
            } catch (err) {
                console.error("Error ambil data Pegawai:", err);
            } finally {
                setIsLoadingPegawai(false);
            }
        };

        fetchAllPegawai();
    }, []);
    
    useEffect(() => {
        if (spkData && spkData.pengajuan_uuid) {
            fetchDetailPengajuan(spkData.pengajuan_uuid);
        }
    }, [spkData, fetchDetailPengajuan]);

    useEffect(() => {
        fetchDetailSPK();
    }, [fetchDetailSPK]);
    
    // --- FUNGSI UNTUK MENGAMBIL NOMOR TELEPON & SUBMIT (Dilewati) ---
    const fetchPhoneNumbers = async (npps: string[]): Promise<{ [key: string]: string | null }> => {
        if (npps.length === 0) return {};
        
        const token = localStorage.getItem("token");
        if (!token) {
            throw new Error("Otorisasi hilang. Token tidak ditemukan.");
        }
        
        const phoneMap: { [key: string]: string | null } = {};

        for (const npp of npps) {
            try {
                const response = await fetch(`${GET_PHONE_NUMBERS_API}/${npp}`, {
                    method: 'GET',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                });
                
                if (!response.ok) {
                    const status = response.status;
                    if (status === 401) {
                         throw new Error(`Otorisasi gagal (401) saat mencari NPP ${npp}. Harap login ulang.`);
                    }
                    console.warn(`Gagal mencari nomor telepon untuk NPP ${npp}. Status: ${status}. Menggunakan null.`);
                    phoneMap[npp] = null;
                    continue;
                }
                
                const data = await response.json();
                const responseData = data.data || data; 
                let tlpFound: string | null = null;
                if (Array.isArray(responseData) && responseData.length > 0) {
                    const user = responseData.find((u: any) => u.npp === npp);
                    if (user) {
                        tlpFound = user.rl_pegawai_local?.tlp || user.tlp || null;
                    }
                } else if (responseData && responseData.npp === npp) {
                     tlpFound = responseData.rl_pegawai_local?.tlp || responseData.tlp || null;
                }
                phoneMap[npp] = tlpFound && tlpFound.trim() !== '' ? tlpFound.trim() : null;

            } catch (error) {
                console.error(`Error fatal saat memproses NPP ${npp}:`, error);
                throw error; 
            }
        }
        
        return phoneMap;
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
        
        const npps = assignedPeople.filter(p => p.npp).map(p => p.npp as string);
        
        let phoneNumbers: { [key: string]: string | null } = {};
        
        try {
            phoneNumbers = await fetchPhoneNumbers(npps);
        } catch (err: any) {
            showToast(`Gagal memverifikasi nomor telepon: ${err.message || 'Proses dihentikan.'}`, "error");
            setIsSubmitting(false);
            return;
        }
        
        const stafsPayload = assignedPeople.map(p => {
            const tlpValue = p.npp ? (phoneNumbers[p.npp] === undefined ? null : phoneNumbers[p.npp]) : null;
            return {
                npp: p.npp || 'NPP_KOSONG', 
                nama: p.name,
                tlp: tlpValue,
                is_penanggung_jawab: p.isPic,
            };
        });
        
        const payload = {
            spk_uuid: spkData.uuid,
            pengajuan_uuid: spkData.pengajuan_uuid,
            stafs: stafsPayload,
        };

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                showToast("Otorisasi hilang. Silakan login ulang.", "error");
                return;
            }

            const res = await fetch(ASSIGN_SPK_API_LOCAL, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            
            const result = await res.json();

            if (!res.ok || !result.success) {
                throw new Error(result.message || "Gagal menyimpan penugasan");
            }

            showToast(`SPK ${spkData.nomor_spk} berhasil ditugaskan! PIC: ${pic.name}`, "success");
            
            setTimeout(() => router.push("/dashboard/spk"), 1500); 

        } catch (err: any) {
            showToast(`Gagal menugaskan: ${err.message || 'Terjadi kesalahan saat menyimpan.'}`, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- RENDERING STATE (Dilewati) ---
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="animate-spin text-cyan-600 mr-3" size={32} />
                <span className="text-xl font-medium text-gray-700">Memuat detail SPK...</span>
            </div>
        );
    }

    if (error || !spkData) {
        return (
            <div className="p-8 space-y-6 text-center bg-white min-h-screen border-t-4 border-red-500">
                <AlertTriangle className="inline-block text-red-500" size={48} />
                <h2 className="text-3xl font-extrabold text-red-600">Akses Ditolak / Data Tidak Ditemukan</h2>
                <p className="text-gray-700 text-lg">Error: {error || "Data SPK tidak dapat dimuat."}</p>
                <button
                    onClick={() => router.push("/dashboard/spk")}
                    className="mt-4 px-4 py-2 text-sm bg-gray-800 text-white rounded-xl hover:bg-gray-900 transition-colors flex items-center mx-auto"
                >
                    <ArrowLeft size={16} className="mr-2" /> Kembali ke Daftar SPK
                </button>
            </div>
        );
    }

    // --- UI FORM UTAMA ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-4">
            <ToastBox toast={toast} onClose={() => setToast(prev => ({ ...prev, show: false }))} />
            <ImageModal 
                imageUrl={modalImageUrl} 
                onClose={() => setModalImageUrl(null)} 
            />

            <div className="max-w-4xl mx-auto space-y-6">
                
                <div className="flex items-center gap-4 bg-white p-5 rounded-2xl shadow-lg border border-blue-100">
                    <button 
                        onClick={() => router.push("/dashboard/spk")} 
                        disabled={isSubmitting} 
                        className="p-2 rounded-full bg-gray-800 text-white shadow hover:bg-gray-900 transition disabled:opacity-50 flex items-center justify-center"
                        title="Kembali ke Daftar SPK"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                            <Users size={24} className="text-cyan-600" />
                            Penugasan Personel SPK
                        </h1>
                        <p className="text-sm text-gray-500 mt-1">
                            Menugaskan personel untuk SPK: {spkData.nomor_spk}
                        </p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-cyan-500">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-700">Detail SPK & Pengajuan Terkait</h2>
                        <Button 
                            onClick={scrollToPersonelForm}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 flex items-center gap-2"
                        >
                            <Send size={16} />
                            Tugaskan
                        </Button>
                    </div>
                    
                    {isLoadingPengajuan && <div className="flex items-center text-blue-600 mb-4"><Loader2 className="animate-spin mr-2 w-4 h-4" /> Memuat detail pengajuan terkait...</div>}
                    {pengajuanError && <div className="text-red-600 mb-4 flex items-center"><AlertTriangle className="w-4 h-4 mr-2" /> Error: {pengajuanError}</div>}

                    <dl className="space-y-2 text-sm text-black">
                        <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                            <dt className="font-medium">Nomor SPK:</dt>
                            <dd className="font-bold text-cyan-700">{spkData.nomor_spk}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                            <dt className="font-medium">Tanggal SPK:</dt>
                            <dd>{spkData.tanggal_spk}</dd>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                            <dt className="font-medium">Status Awal:</dt>
                            <dd className="font-bold text-blue-500">{spkData.status}</dd>
                        </div>
                        
                        {/* --- TAMPILKAN DATA LENGKAP DARI PENGAJUAN --- */}
                        {pengajuanDetail && (
                            <div className="space-y-2 pt-2">
                                <h3 className="text-base font-semibold text-gray-600 border-b pb-1 mt-3">Detail Pengajuan:</h3>
                                <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                                    <dt className="font-medium">No. Pengajuan:</dt>
                                    <dd className="font-bold">{pengajuanDetail.no_surat}</dd>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                                    <dt className="font-medium">Jenis Pengajuan (Perihal):</dt>
                                    <dd className="font-bold text-purple-700">{pengajuanDetail.nama_jenis} ({pengajuanDetail.hal_id})</dd>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                                    <dt className="font-medium">Pelapor (NPP/TLP):</dt>
                                    <dd>{pengajuanDetail.name_pelapor} ({pengajuanDetail.npp_pelapor} / {pengajuanDetail.tlp_pelapor || 'N/A'})</dd>
                                </div>
                                <div className="grid grid-cols-2 gap-x-4 border-b pb-1">
                                    <dt className="font-medium">Satker Asal:</dt>
                                    <dd>{pengajuanDetail.satker}</dd>
                                </div>
                                <div className="pt-2 border-b pb-2">
                                    <dt className="font-medium block mb-1">Uraian Pekerjaan/Keterangan:</dt>
                                    <dd className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-lg italic text-black font-medium whitespace-pre-wrap">
                                        {pengajuanDetail.keterangan || spkData.pekerjaan_spk || "N/A"}
                                    </dd>
                                </div>

                                {/* BAGIAN TANDA TANGAN - Ukuran H-32 dan penempatan ditukar */}
                                <div className="grid grid-cols-2 gap-4 pt-4">
                                    
                                    <div className="border border-gray-200 rounded-lg p-3">
                                        <dt className="font-medium mb-2">Tanda Tangan Mengetahui:</dt>
                                        <dd className="text-center h-40 flex flex-col justify-end items-center">
                                            {pengajuanDetail.ttd_mengetahui_path ? (
                                                <img 
                                                    src={getProxyFileUrl(pengajuanDetail.ttd_mengetahui_path) || ""} 
                                                    alt="Tanda Tangan Mengetahui" 
                                                    className="h-32 w-auto max-w-full object-contain mb-1" 
                                                />
                                            ) : (
                                                <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak tersedia.</span>
                                            )}
                                             <p className="text-xs mt-1 text-gray-700 font-semibold">{pengajuanDetail.mengetahui || 'N/A'}</p>
                                        </dd>
                                    </div>

                                    <div className="border border-gray-200 rounded-lg p-3">
                                        <dt className="font-medium mb-2">Tanda Tangan Pelapor:</dt>
                                        <dd className="text-center h-40 flex flex-col justify-end items-center">
                                            {pengajuanDetail.ttd_pelapor_path ? (
                                                <img 
                                                    src={getProxyFileUrl(pengajuanDetail.ttd_pelapor_path) || ""} 
                                                    alt="Tanda Tangan Pelapor" 
                                                    className="h-32 w-auto max-w-full object-contain mb-1" 
                                                />
                                            ) : (
                                                <span className="text-gray-500 italic text-xs h-32 flex items-center justify-center">TTD tidak tersedia.</span>
                                            )}
                                            <p className="text-xs mt-1 text-gray-700 font-semibold">{pengajuanDetail.name_pelapor}</p>
                                        </dd>
                                    </div>
                                </div>

                                {pengajuanDetail.file_paths.length > 0 && (
                                    <div className="pt-4 border-t mt-4 border-gray-100">
                                        <dt className="font-medium block mb-2 flex items-center gap-1 text-cyan-700">
                                            <File size={16}/> Lampiran File ({pengajuanDetail.file_paths.length} file):
                                        </dt>
                                        <dd className="grid grid-cols-3 gap-3">

                                    {pengajuanDetail.file_paths.map((path, index) => {
                                        const fileUrl = getProxyFileUrl(path); 
                                        const isImage = /\.(jpe?g|png|gif|webp)$/i.test(path);
                                        const fileName = path.split('/').pop() || 'File';

                                        const handleClick = (e: React.MouseEvent) => {
                                            if (isImage && fileUrl) {
                                                e.preventDefault(); 
                                                setModalImageUrl(fileUrl); 
                                            } 
                                        };

                                        return (
                                            <a 
                                                key={index} 
                                                href={fileUrl || '#'} 
                                                target={isImage ? '_self' : '_blank'} 
                                                rel="noopener noreferrer"
                                                onClick={handleClick} 
                                                className="block p-3 border border-gray-300 rounded-lg text-center hover:bg-gray-100 transition h-36 flex flex-col justify-between overflow-hidden" // Tambahkan overflow-hidden
                                                title={fileName}
                                            >
                                                {isImage ? (
                                                    <>
                                                        <div className="relative w-full h-24 flex items-center justify-center">
                                                            <img 
                                                                src={fileUrl || ''} 
                                                                alt="Thumbnail" 
                                                                className="max-h-full max-w-full object-contain mx-auto rounded" 
                                                                onError={(e) => { 
                                                                    // FIX: Hapus on error handler agar tidak looping
                                                                    e.currentTarget.onerror = null; 
                                                                    // Ganti dengan placeholder icon sederhana atau image not found url yang VALID
                                                                    // Contoh menggunakan placeholder dari placehold.co atau icon SVG static
                                                                    e.currentTarget.src = 'https://placehold.co/100x100?text=No+Image'; 
                                                                    // Atau sembunyikan gambar jika error
                                                                    // e.currentTarget.style.display = 'none';
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-gray-700 block truncate mt-1 font-bold">Lihat Gambar</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <File size={36} className="mx-auto text-blue-500 flex-shrink-0"/>
                                                        <span className="text-xs text-gray-700 block truncate mt-1">
                                                            Unduh File 
                                                        </span>
                                                        <Download size={12} className="inline ml-1 text-blue-500"/>
                                                    </>
                                                )}
                                            </a>
                                        );
                                    })}

                                        </dd>
                                    </div>
                                )}
                            </div>
                        )}
                    </dl>
                </div>

                {/* ========================================================= */}
                {/* START: FORM PENUGASAN PERSONEL (DIPINDAH KE BAWAH) */}
                {/* ========================================================= */}
                <div ref={personelFormRef} className="bg-white rounded-2xl shadow-xl p-6 border-t-4 border-green-500">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <Users size={20} className="text-green-600"/> Penentuan Personel
                    </h2>

                    <div className="flex flex-col gap-4">
                        <label className="text-sm font-medium text-gray-700">
                            Pilih Personel yang Ditugaskan:
                        </label>
                        
                        <div className="flex flex-wrap items-center p-1 border border-gray-400 rounded-xl bg-gray-50 min-h-[50px] focus-within:ring-2 focus-within:ring-blue-300 transition">
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
                                    className="flex-1 bg-transparent outline-none p-1 text-sm text-black"
                                    disabled={isLoadingPegawai || isSubmitting}
                                />
                                
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
                                className="ml-2 px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full" 
                                disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
                            >
                                +
                            </Button>
                        </div>

                        {/* CATATAN PIC (Dilewati) */}
                        <p className="text-xs text-red-600">
                            * Wajib menentukan minimal 1 PIC (Penanggung Jawab) dengan mengklik ikon lingkaran/centang pada chip personel.
                        </p>

                        {/* TOMBOL SUBMIT (Dilewati) */}
                        <div className="pt-4">
                            <Button
                                onClick={handleSubmitAssignment} 
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white transition-transform transform hover:scale-[1.01] shadow-lg flex items-center justify-center gap-2"
                                disabled={isSubmitting || assignedPeople.length === 0 || !assignedPeople.some(p => p.isPic)}
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="animate-spin" size={20} /> 
                                        Menyimpan Penugasan...
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} /> 
                                        Tugaskan Sekarang
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}