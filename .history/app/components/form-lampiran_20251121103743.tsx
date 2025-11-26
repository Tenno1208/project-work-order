"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload, X, Check, AlertTriangle, Loader2, PlusCircle, History, Crop, Settings } from "lucide-react"; 
import { useRouter, useSearchParams } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select";
import Cropper, { Point, Area } from 'react-easy-crop';


// Tentukan Base URL dan Path API (Dipertahankan sama)
const EXTERNAL_EDIT_BASE_URL = process.env.NEXT_PUBLIC_EDIT_BASE_URL || "https://brave-chefs-refuse.loca.lt";
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt"; 
const SUBMIT_API_PATH = "/api/pengajuan"; 
const DETAIL_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/detail`;
const UPDATE_API_PATH = `${EXTERNAL_EDIT_BASE_URL}/api/pengajuan/update`; 
const MAX_RETRIES = 1;
const MAX_FILES = 4; 
const TTD_PROXY_PATH = "/api/ttd-proxy"; 


// --- TYPES BARU ---
type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type NotificationType = 'success' | 'error' | 'warning';

type PegawaiDef = { 
    id: number; 
    name: string; 
    npp: string; 
    satker_id: number; 
    jabatan: string; 
};

type ApiPengajuanDetail = {
    id: number;
    uuid: string; 
    hal_id: number;
    catatan: string; 
    kepada: string;
    satker: string;
    kode_barang: string;
    keterangan: string; 
    file_paths: string | null; 
    status: string;
    name: string | null; 
    npp: string | null; 
    mengetahui: string | null;
    npp_mengetahui: string | null;
    ttd_pelapor: string | null; 
    created_at: string;
    // Tambahkan properti dari API detail lainnya jika ada:
    hal_nama: string | null;
    satker_id: string | null;
    // Dan mungkin referensiSurat jika ada di API
};

interface FormDataState {
    hal: string;
    hal_nama: string;
    kepada: string;
    satker: string;
    kodeBarang: string;
    keterangan: string;
    pelapor: string;
    nppPelapor: string;
    mengetahui: string; 
    nppMengetahui: string; 
    referensiSurat: string;
}

// ... (Komponen Notification, ConfirmationModal, TtdHistoryModal, TtdCropModal, 
// Helper TTD Functions tetap SAMA) ...

// --- DEFINISI ULANG KOMPONEN MENJADI FormLampiran ---

// Anggap FormLampiran menerima prop 'initialData' jika ada (untuk mode EDIT)
export default function FormLampiran({ initialData }: { initialData: ApiPengajuanDetail | null }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Ambil UUID dari URL parameter
    const urlUuid = searchParams.get('uuid');
    const isViewMode = searchParams.get('view') === 'true';
    
    // Ganti logika ini, karena sekarang data dihandle oleh prop initialData
    const [editUuid, setEditUuid] = useState<string | null>(urlUuid); 
    const isEditMode = !!editUuid && !isViewMode && !!initialData; // Jika ada UUID DAN ada initialData
    const isViewOnlyMode = !!editUuid && isViewMode;
    const [existingFilePaths, setExistingFilePaths] = useState<string[]>([]); 
    // ---------------------------------

    const [loading, setLoading] = useState(true);
    const [initialLoading, setInitialLoading] = useState(true); // Biarkan true, karena data pendukung tetap harus di-fetch
    const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);
    const [halOptions, setHalOptions] = useState<HalOption[]>([]);

    const [refSuratOptions, setRefSuratOptions] = useState<string[]>([
        // ... (data mock/placeholder)
    ]);

    const [allPegawai, setAllPegawai] = useState<PegawaiDef[]>([]);

    // Default form state
    const initialFormState: FormDataState = {
        hal: "", hal_nama: "", kepada: "", satker: "", kodeBarang: "", keterangan: "",
        pelapor: "", nppPelapor: "", mengetahui: "", nppMengetahui: "", referensiSurat: "",
    };
    
    const [form, setForm] = useState<FormDataState>(initialFormState);

// ... (kode untuk fileInputRefs, files, previews, isSubmitting, TTD states tetap sama) ...
// ... (kode untuk fetchTtdHistory, TtdCropModal, TtdHistoryModal components tetap sama) ...
// ... (kode untuk makeImageTransparent, processImageTransparency tetap sama) ...


    // #################################################
    // PENGAMBILAN DATA DETAIL JIKA MODE EDIT (Hampir Dihapus, diganti initFormFromProps)
    // #################################################
    // FUNGSI INI DIBUAT DUMMY KARENA LOGIC UTAMA SUDAH PINDAH KE KOMPONEN INDUK
    // Namun kita akan simpan logicnya ke initFormFromProps
    
    const initFormFromProps = useCallback(async (data: ApiPengajuanDetail, token: string, halOptionsMap: HalOption[], satkersMap: SatkerDef[]) => {
        // Logika pengisian form
        const halOption = halOptionsMap.find(opt => opt.id.toString() === data.hal_id?.toString());
        const satkerId = satkersMap.find(s => s.label === data.satker)?.id || "";

        setForm({
            hal: data.hal_id?.toString() || "",
            hal_nama: halOption?.nama_jenis || data.catatan || "",
            kepada: data.kepada || "",
            satker: satkerId,
            kodeBarang: data.kode_barang || "",
            keterangan: data.keterangan || data.catatan || "",
            pelapor: data.name || "",
            nppPelapor: data.npp || "",
            mengetahui: data.mengetahui || "",
            nppMengetahui: data.npp_mengetahui || "",
            referensiSurat: "", // Sesuaikan jika API memberikan nilai referensi
        });

        // Logika file paths
        if (data.file_paths) {
            // ... (Logic parsing file paths, sama seperti di kode Anda)
            try {
                let rawPaths: string[] = [];
                const pathsString = data.file_paths.trim();
                
                // [LOGIC PARSING FILE PATHS DARI STRING KE ARRAY TETAP SAMA]
                try {
                    const parsed = JSON.parse(pathsString);
                    if (Array.isArray(parsed)) {
                        rawPaths = parsed;
                    } else {
                        throw new Error("Not a JSON array.");
                    }
                } catch {
                    const cleanString = pathsString.replace(/\\/g, '').replace(/[\[\]"]/g, '');
                    rawPaths = cleanString.split(',').map(s => s.trim()).filter(s => s.length > 0);
                }
                
                const baseUrl = EXTERNAL_EDIT_BASE_URL.endsWith('/') ? EXTERNAL_EDIT_BASE_URL.slice(0, -1) : EXTERNAL_EDIT_BASE_URL;
                const finalFilePaths = rawPaths.map(path => {
                    let cleanPath = path.replace(/\\/g, '/').replace(/\/\//g, '/');
                    if (cleanPath.startsWith('http') || cleanPath.startsWith('data:')) {
                        return cleanPath;
                    }
                    return `${baseUrl}/${cleanPath.replace(/^\//, '')}`;
                });
                
                setExistingFilePaths(finalFilePaths); 
                setPreviews(finalFilePaths); 
            } catch (e) {
                console.error("❌ Error memproses file path:", e);
                setNotification({ type: 'warning', message: `Gagal memproses lampiran file lama.` });
            }
        }

        // Logika TTD
        if (data.ttd_pelapor) {
            const ttdUrl = data.ttd_pelapor.startsWith('http') ? data.ttd_pelapor : `${EXTERNAL_EDIT_BASE_URL}/${data.ttd_pelapor.replace(/^\//, '')}`; 
            setTtdPelaporPreview(await makeImageTransparent(ttdUrl, token, transparencySettings)); 
        }

    }, [transparencySettings, setNotification, setExistingFilePaths, setPreviews, setTtdPelaporPreview]);
    
    // #################################################
    // MAIN USE EFFECT: Load initial data & check edit mode 
    // #################################################
    useEffect(() => {
        const token = localStorage.getItem("token");
        
        // Simpan UUID ke localStorage untuk referensi
        if (urlUuid) {
            localStorage.setItem('current_edit_uuid', urlUuid);
        } else {
            localStorage.removeItem('current_edit_uuid');
        }
        
        // setEditUuid(urlUuid); // Tidak perlu disetel ulang di sini

        if (!token) {
            router.push("/");
            return;
        }

        const fetchInitialData = async () => {
            if (!urlUuid) {
                setInitialLoading(true);
            }
            const headers = { Authorization: `Bearer ${token}` };

            try {
                // Fetch Data Pendukung (User, Hal, Satker, Pegawai)
                const [userRes, halRes, satkerRes, pegawaiRes] = await Promise.all([
                    fetch("/api/me", { headers }),
                    fetch("/api/hal", { headers, cache: "no-store" }),
                    fetch("/api/satker", { headers }),
                    fetch("/api/all-pegawai", { headers }),
                ]);

                const [userData, halJson, satkerData, pegawaiJson] = await Promise.all([
                    userRes.json(),
                    halRes.json(),
                    satkerRes.json(),
                    pegawaiRes.json(),
                ]);

                // --- 1. Map Data Pendukung ---
                let halOptionsMap: HalOption[] = [];
                if (halJson?.success && Array.isArray(halJson.data)) {
                    halOptionsMap = halJson.data.map((item: any) => ({ id: item.id, nama_jenis: item.nama_jenis }));
                    setHalOptions(halOptionsMap);
                }

                let satkersMap: SatkerDef[] = [];
                if (Array.isArray(satkerData?.data)) {
                    satkersMap = satkerData.data.map((item: any) => ({ id: item.id?.toString(), label: item.satker_name, jabatan: item.jabsatker || "Ka.Unit" }));
                    setSatkers(satkersMap);
                }
                
                let pegawaiMap: PegawaiDef[] = [];
                if (pegawaiJson?.success && Array.isArray(pegawaiJson.data)) {
                    pegawaiMap = pegawaiJson.data.map((item: any) => ({ id: item.id, name: item.name, npp: item.npp, satker_id: item.satker_id, jabatan: item.jabatan || item.position || "Pegawai" }));
                    setAllPegawai(pegawaiMap);
                }
                
                // --- 2. Isi Form State Awal ---
                let userNpp = null;
                if (userData?.nama && userData?.npp) {
                    userNpp = userData.npp;
                    setUser({ nama: userData.nama, npp: userData.npp });

                    if (!urlUuid) {
                        // MODE TAMBAH BARU (set otomatis dari user login)
                        setForm((f) => ({
                            ...f,
                            pelapor: userData.nama,
                            nppPelapor: userData.npp,
                        }));
                    } else if (initialData) {
                        // MODE EDIT/VIEW (set dari data API yang sudah di-fetch di komponen induk)
                        await initFormFromProps(initialData, token, halOptionsMap, satkersMap);
                    }
                }
                
                // --- 3. TTD History ---
                if (userNpp) {
                    await fetchTtdHistory(token, userNpp);
                }
                
            } catch (err: any) {
                console.error("❌ Error fetch data pendukung:", err.message);
                setNotification({ type: 'error', message: `Gagal memuat data pendukung: ${err.message}` });
            } finally {
                setInitialLoading(false);
                setLoading(false); // Selesai loading
            }
        };

        // Hanya jalankan fetchInitialData jika initialData belum ada (mode Tambah) atau jika mode Edit/View dan initialData sudah tersedia.
        // Pada mode Edit/View, initialData akan diteruskan dari komponen parent.
        if (urlUuid && !initialData) {
            // Jika initialData belum ada padahal ada UUID, kita asumsikan fetch data detail utama gagal di parent.
            // Biarkan pesan error di parent yang tampil. Kita tidak melakukan fetchDetail di sini lagi.
            setLoading(false);
            return;
        }

        if (!urlUuid || initialData) {
            fetchInitialData();
        }

    }, [router, urlUuid, initialData, fetchTtdHistory, initFormFromProps]);


    // #################################################
    // HANDLER LOGIC
    // #################################################
    
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    
    // ... (useEffect untuk Satker/Pimpinan, handleHalChange, handleAddFile, 
    // handleRemoveFile, TTD Handlers, handlePrint, proceedSubmission, handleAjukan
    // Semuanya dipertahankan SAMA) ...


// Tambahkan kembali fungsi formatDate yang Anda hapus sebelumnya, ini penting
    const formatDate = (d: Date) =>
        `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${d.getFullYear()}`;

    const todayStr = `Semarang, ${formatDate(new Date())}`;
    const selectedSatker = satkers.find((s) => s.id === form.satker);
    const jabatan = selectedSatker?.jabatan || "Ka.Unit";
    
    const totalFilesCount = previews.length;
    const isMaxFilesReached = totalFilesCount >= MAX_FILES;
    
    // Tampilkan loading screen jika data pendukung belum siap
    if (initialLoading) {
        return (
            <div className="p-6 min-h-screen flex items-center justify-center">
                <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
                <span className="text-xl text-gray-700">Memuat data pendukung...</span>
            </div>
        );
    }

    return (
        <div className="p-6 min-h-screen">
            {/* ... (Style, Notif, Modals tetap SAMA) ... */}

            <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
                {/* Header Komponen tetap SAMA */}
                

                <div id="print-area" className="p-6">
                    {/* Header Cetak tetap SAMA */}

                    <div className="mt-4 flex gap-20">
                        <div className="w-1/2 text-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="font-semibold whitespace-nowrap">Hal:</span>
                                {isPrintMode || isViewOnlyMode ? (
                                    <span className="font-normal">{form.hal_nama || form.hal}</span> 
                                ) : (
                                    {/* Select Hal tetap SAMA */}
                                    <select
                                        name="hal"
                                        value={form.hal}
                                        onChange={handleHalChange}
                                        className="flex-1 p-1 border border-gray-300 rounded bg-white text-sm select-input-only"
                                    >
                                        <option value="">-- Pilih Hal --</option>
                                        {halOptions.length === 0 ? (
                                            <option disabled>Memuat data...</option>
                                        ) : (
                                            halOptions.map((opt) => (
                                                <option key={opt.id} value={opt.id}> 
                                                    {opt.nama_jenis}
                                                </option>
                                            ))
                                        )}
                                    </select>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold whitespace-nowrap">Ref. Surat:</span>
                                {isPrintMode || isViewOnlyMode ? (
                                    <span className="font-normal text-xs">{form.referensiSurat || "-"}</span> 
                                ) : (
                                    {/* Select Ref. Surat tetap SAMA */}
                                    <div className="flex-1">
                                        <Select
                                            name="referensiSurat"
                                            value={form.referensiSurat ? { value: form.referensiSurat, label: form.referensiSurat } : null}
                                            onChange={(option) =>
                                                setForm((f) => ({ ...f, referensiSurat: option ? option.value : "" }))
                                            }
                                            options={refSuratOptions.map((opt) => ({ value: opt, label: opt }))}
                                            placeholder="Pilih referensi surat..."
                                            className="mt-5 text-xs select-input-only" 
                                            styles={{
                                                menu: (base) => ({ ...base, zIndex: 50, position: "absolute" }),
                                                control: (base) => ({ ...base, fontSize: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.25rem', background: 'white' }),
                                            }}
                                            menuPlacement="auto"
                                            isClearable
                                        />
                                        <div className="text-xs text-gray-500 italic mt-1"> 
                                            *Opsional
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="w-1/2 text-sm">
                            Kepada Yth. <br />
                            {isPrintMode || isViewOnlyMode ? (
                                <div className="font-semibold">{form.kepada}</div>
                            ) : (
                                    {/* Select Kepada tetap SAMA */}
                                <div className="select-input-only">
                                    <Select
                                        name="kepada"
                                        value={form.kepada ? { value: form.kepada, label: form.kepada } : null}
                                        onChange={(option) =>
                                            setForm((f) => ({ ...f, kepada: option ? option.value : "" }))
                                        }
                                        options={satkers.map((s) => ({ value: s.label, label: s.label }))}
                                        placeholder="Cari atau pilih tujuan..."
                                        className="text-sm w-64"
                                        styles={{
                                            menu: (base) => ({ ...base, zIndex: 50, position: "absolute" }),
                                        }}
                                        menuPlacement="auto"
                                    />
                                </div>
                            )}
                            <br className="no-print" />
                            PERUMDA AIR MINUM Tirta Moedal <br /> di <strong>SEMARANG</strong>
                        </div>
                    </div>

                    <div className="mt-3 text-sm grid grid-cols-12 gap-3 items-center">
                        <div className="col-span-3 font-semibold">Satker :</div>
                        <div className="col-span-9">
                            {isPrintMode || isViewOnlyMode ? (
                                <span>{selectedSatker?.label || form.satker}</span>
                            ) : (
                                    {/* Select Satker tetap SAMA */}
                                <div className="select-input-only">
                                    <Select
                                        name="satker"
                                        value={
                                            form.satker
                                                ? { value: form.satker, label: satkers.find((s) => s.id === form.satker)?.label }
                                                : null
                                        }
                                        onChange={(option) =>
                                            setForm((f) => ({ ...f, satker: option ? option.value : "" }))
                                        }
                                        options={satkers.map((s) => ({ value: s.id, label: s.label }))}
                                        placeholder="Cari atau pilih satker..."
                                        className="text-sm w-full"
                                        styles={{
                                            menu: (base) => ({...base,
                                            zIndex: 100,
                                            position: "absolute",
                                            marginTop: 2,
                                            }),
                                        }}
                                        menuPlacement="bottom"
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-12 gap-3 items-center mt-3 text-sm">
                        <div className="col-span-3 font-semibold">Kode Barang :</div>
                        <div className="col-span-9">
                            {isPrintMode || isViewOnlyMode ? (
                                <span>{form.kodeBarang}</span>
                            ) : (
                                    {/* Input Kode Barang tetap SAMA */}
                                <input
                                    type="text"
                                    name="kodeBarang"
                                    value={form.kodeBarang}
                                    onChange={handleChange}
                                    placeholder="Isi kode barang"
                                    className="w-full p-1 border border-gray-300 rounded"
                                />
                            )}
                        </div>
                    </div>

                    <div className="mt-4 big-box text-sm">
                        {isPrintMode || isViewOnlyMode ? (
                            <div style={{ whiteSpace: "pre-wrap" }}>{form.keterangan}</div>
                        ) : (
                                    {/* Textarea Keterangan tetap SAMA */}
                            <textarea
                                name="keterangan"
                                value={form.keterangan}
                                onChange={handleChange}
                                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                                className="w-full resize-none border border-gray-300 rounded p-2"
                                rows={6}
                            />
                        )}
                    </div>

                    {!isViewOnlyMode && (
                        {/* File Upload Section tetap SAMA */}
                    )}

                    {isPrintMode && previews.length > 0 && (
                        {/* Preview Gambar Cetak tetap SAMA */}
                    )}

                    <div className="mt-3 text-xs text-left">
                        Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
                    </div>

                    <div className="mt-20 flex justify-center text-center gap-60">
                        <div>
                            <div className="text-sm font-semibold">Mengetahui</div>
                            <div className="text-xs">{jabatan}</div>
                            <div className="mt-1 flex justify-center h-[40px] items-center">
                            </div>
                            <div className="mt-1 text-sm">
                                ({form.mengetahui || "..........................."})
                            </div>
                            <div className="text-xs mt-1">
                                NPP: {form.nppMengetahui || "__________"}
                            </div>
                        </div>

                        <div>
                            <div className="text-sm font-semibold">Pelapor</div>
                                {/* TTD Section tetap SAMA */}
                            <div className="mt-0 text-sm">{form.pelapor || "(...........................)"}</div>
                            <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
                        </div>
                    </div>
                    
                    {!isPrintMode && !isViewOnlyMode && (
                        {/* Tombol Ajukan/Ubah tetap SAMA */}
                    )}
                </div>
            </div>
        </div>
    );
}