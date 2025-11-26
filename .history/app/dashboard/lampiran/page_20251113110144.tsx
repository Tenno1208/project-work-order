"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload, X, Check, AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";

// --- TIPE DATA ---
type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };
type NotificationType = 'success' | 'error' | 'warning';

interface ModalContent {
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

// --- KOMPONEN NOTIFIKASI ---
const Notification = ({ notification, setNotification }: { 
    notification: { type: NotificationType, message: string } | null, 
    setNotification: React.Dispatch<React.SetStateAction<{ type: NotificationType, message: string } | null>> 
}) => {
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification, setNotification]);

    if (!notification) return null;

    const baseClasses = "fixed top-4 right-4 z-[1000] p-4 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 transform hover:scale-[1.01]";
    let styleClasses = "";
    let Icon = AlertTriangle;

    switch (notification.type) {
        case 'success':
            styleClasses = "bg-green-100 border-l-4 border-green-500 text-green-700";
            Icon = Check;
            break;
        case 'error':
            styleClasses = "bg-red-100 border-l-4 border-red-500 text-red-700";
            Icon = X;
            break;
        case 'warning':
            styleClasses = "bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700";
            Icon = AlertTriangle;
            break;
    }

    return (
        <div className={`${baseClasses} ${styleClasses}`}>
            <Icon size={24} className="flex-shrink-0" />
            <div>
                <div className="font-bold capitalize">{notification.type}</div>
                <div className="text-sm">{notification.message}</div>
            </div>
            <button onClick={() => setNotification(null)} className="ml-4 text-gray-500 hover:text-gray-700">
                <X size={16} />
            </button>
        </div>
    );
};

// --- KOMPONEN MODAL KONFIRMASI ---
const ConfirmationModal = ({ isOpen, content }: { isOpen: boolean, content: ModalContent | null }) => {
    if (!isOpen || !content) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center z-[2000]">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-sm transform transition-all border-t-4 border-blue-600">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{content.title}</h3>
                <p className="text-sm text-gray-600 mb-6">{content.message}</p>
                <div className="flex justify-end gap-3">
                    <button
                        onClick={content.onCancel}
                        className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
                    >
                        Batal
                    </button>
                    <button
                        onClick={content.onConfirm}
                        className="px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition flex items-center gap-1"
                    >
                        Ya, Ajukan
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- KOMPONEN UTAMA ---
export default function LampiranPengajuanPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);

    const [form, setForm] = useState({
        hal: "", // ID Hal
        hal_nama: "", // Nama Hal
        kepada: "",
        satker: "",
        kodeBarang: "",
        keterangan: "",
        catatan: "", // Ditambahkan untuk form catatan
        pelapor: "",
        nppPelapor: "",
        mengetahui: "", 
        nppMengetahui: "", 
    });

    const [files, setFiles] = useState<File[]>([]);
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [ttdPelaporFile, setTtdPelaporFile] = useState<File | null>(null);
    const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
    const [ttdScale, setTtdScale] = useState(1);
    const nodeRef = useRef(null);

    const [notification, setNotification] = useState<{ type: NotificationType, message: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalContent, setModalContent] = useState<ModalContent | null>(null);

    const nomorSurat = typeof window !== 'undefined' ? localStorage.getItem("nomor_surat_terakhir") : null;
    const [halOptions, setHalOptions] = useState<HalOption[]>([]);

    // --- FETCH DATA MASTER HAL ---
    useEffect(() => {
        const fetchHal = async () => {
            try {
                const token = localStorage.getItem("token");
                if (!token) {
                    console.error("Token tidak ditemukan di localStorage");
                    setNotification({ type: 'warning', message: 'Anda tidak memiliki token otorisasi. Silakan login kembali.' });
                    return;
                }

                const res = await fetch("/api/hal", {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    cache: "no-store",
                });

                if (!res.ok) throw new Error("Gagal memuat data HAL.");
                const json = await res.json();

                if (json?.success && Array.isArray(json.data)) {
                    const options = json.data.map((item: any) => ({
                        id: item.id,
                        nama_jenis: item.nama_jenis,
                    }));
                    setHalOptions(options);
                } else {
                    console.error("Format data HAL tidak sesuai:", json);
                    setNotification({ type: 'error', message: 'Gagal memuat daftar Hal Pengajuan. Format data API tidak valid.' });
                }
            } catch (err) {
                console.error("❌ Error ambil data HAL:", err);
                setNotification({ type: 'error', message: `Gagal memuat data master HAL: ${err instanceof Error ? err.message : String(err)}` });
            }
        };

        fetchHal();
    }, []);

    // --- FETCH DATA USER & SATKER ---
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/");
            return;
        }

        // Fetch User Data
        fetch("/api/me", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data?.nama && data?.npp) {
                    setUser({ nama: data.nama, npp: data.npp });
                    setForm((f) => ({
                        ...f,
                        pelapor: data.nama,
                        nppPelapor: data.npp,
                    }));
                }
            })
            .catch((err) => console.error("Gagal ambil data user:", err))
            .finally(() => setLoading(false));

        // Fetch Satker Data
        fetch("/api/satker", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => res.json())
            .then((data) => {
                if (!Array.isArray(data?.data)) return;

                const mapped = data.data.map((item: any) => ({
                    id: item.id?.toString(),
                    label: item.satker_name,
                    jabatan: item.jabsatker || "Ka.Unit",
                }));

                setSatkers(mapped);
            })
            .catch((err) => console.error("Gagal ambil satker:", err));
    }, [router]);

    // --- HANDLERS ---
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

    const handleHalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedId = e.target.value;
        const selectedOption = halOptions.find(opt => String(opt.id) === selectedId);

        setForm(p => ({
            ...p,
            hal: selectedId,
            hal_nama: selectedOption ? selectedOption.nama_jenis : "",
        }));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const selectedFiles = Array.from(e.target.files).slice(0, 4);
        setFiles(selectedFiles);
        const previews = selectedFiles.map((file) => URL.createObjectURL(file));
        setPreviews(previews);
    };

    const handleTtdPelaporChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setTtdPelaporFile(file);
        const previewUrl = URL.createObjectURL(file);
        // Implement transparency logic here (omitted for brevity, keeping only preview)
        setTtdPelaporPreview(previewUrl); 
    };

    const removeFile = (index: number) => {
        setFiles(f => f.filter((_, i) => i !== index));
        setPreviews(p => p.filter((_, i) => i !== index));
    };

    // --- LOGIKA SUBMIT DAN VALIDASI ---
    const validateForm = () => {
        if (!form.hal || !form.kepada || !form.satker || !form.kodeBarang || !form.keterangan || !form.pelapor || !form.nppPelapor || !ttdPelaporFile) {
            setNotification({ type: 'error', message: 'Semua kolom bertanda bintang (*) dan Tanda Tangan Pelapor wajib diisi.' });
            return false;
        }
        return true;
    };

    const submitPengajuan = async () => {
        if (!validateForm()) return;
        
        setIsSubmitting(true);
        setNotification(null);

        try {
            const token = localStorage.getItem("token");
            if (!token) throw new Error("Token otorisasi tidak ditemukan. Silakan login ulang.");

            const formData = new FormData();
            
            // Append standard form fields
            formData.append("hal", form.hal); 
            formData.append("kepada", form.kepada);
            formData.append("satker", form.satker);
            formData.append("kodeBarang", form.kodeBarang);
            formData.append("keterangan", form.keterangan);
            formData.append("catatan", form.catatan); 
            formData.append("pelapor", form.pelapor);
            formData.append("nppPelapor", form.nppPelapor);
            formData.append("mengetahui", form.mengetahui);
            formData.append("nppMengetahui", form.nppMengetahui);

            // Append signature file
            if (ttdPelaporFile) {
                formData.append("ttdPelapor", ttdPelaporFile);
            }

            // Append attachment files
            files.forEach((file, index) => {
                formData.append(`file${index}`, file); 
            });

            const res = await fetch("/api/pengajuan", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await res.json();
            
            if (!res.ok || !result.success) {
                throw new Error(result.message || `Pengajuan gagal. Status: ${res.status}`);
            }

            setNotification({ type: 'success', message: result.message || "Pengajuan berhasil dikirim!" });
            // Redirect back to list page after successful submission
            router.push("/dashboard/lampiran"); 

        } catch (error: any) {
            console.error("Error saat submit:", error);
            setNotification({ type: 'error', message: `Gagal mengajukan data: ${error.message}` });
        } finally {
            setIsSubmitting(false);
            setIsModalOpen(false);
        }
    };
    
    const confirmSubmission = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        setModalContent({
            title: "Konfirmasi Pengajuan",
            message: "Apakah Anda yakin ingin mengirimkan pengajuan ini? Data akan segera diproses.",
            onConfirm: submitPengajuan,
            onCancel: () => setIsModalOpen(false),
        });
        setIsModalOpen(true);
    };

    // --- RENDER PRINTER MODE ---
    if (isPrintMode) {
        return (
            <div className="p-10 mx-auto max-w-4xl bg-white shadow-xl">
                {/* Simplified view for printing (omitted for brevity) */}
                <h1 className="text-2xl font-bold">Preview Cetak Surat Pengajuan</h1>
                <p>Fitur cetak akan menyertakan data formulir dan tanda tangan.</p>
                <button onClick={() => setIsPrintMode(false)} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded">
                    Kembali ke Edit
                </button>
            </div>
        );
    }
    
    // --- RENDER FORM ---
    return (
        <div className="p-6 md:p-10 space-y-8 text-gray-800 bg-gray-50 min-h-screen font-sans">
            <Notification notification={notification} setNotification={setNotification} />
            <ConfirmationModal isOpen={isModalOpen} content={modalContent} />

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4">
                <h2 className="text-3xl font-extrabold text-gray-900 flex items-center gap-2">
                    <Droplet size={28} className="text-blue-600" /> Buat Pengajuan Baru
                </h2>
                <div className="text-sm font-medium text-gray-500">
                    No. Surat Sementara: <span className="text-blue-600 font-bold">{nomorSurat || 'N/A'}</span>
                </div>
            </div>

            <form onSubmit={confirmSubmission} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* KOLOM KIRI: Data Utama */}
                <div className="lg:col-span-2 space-y-6 bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600">
                    <h3 className="text-xl font-semibold border-b pb-3 text-gray-700">Detail Pengajuan</h3>

                    {/* Hal Pengajuan */}
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="hal" className="font-medium text-gray-700">
                            Hal Pengajuan <span className="text-red-500">*</span>
                        </label>
                        <select
                            id="hal"
                            name="hal"
                            value={form.hal}
                            onChange={handleHalChange}
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition duration-150 ease-in-out bg-white appearance-none"
                            required
                            disabled={halOptions.length === 0}
                        >
                            <option value="" disabled>
                                {halOptions.length === 0 ? "Memuat Hal..." : "Pilih Hal Pengajuan"}
                            </option>
                            {halOptions.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                    {opt.nama_jenis}
                                </option>
                            ))}
                        </select>
                        <AlertTriangle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Kepada */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="kepada" className="font-medium text-gray-700">
                                Kepada (Jabatan) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="kepada"
                                name="kepada"
                                value={form.kepada}
                                onChange={handleChange}
                                placeholder="Cth: Kepala Bagian Umum"
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition"
                                required
                            />
                        </div>

                        {/* Satuan Kerja (Satker) */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="satker" className="font-medium text-gray-700">
                                Satuan Kerja <span className="text-red-500">*</span>
                            </label>
                            <select
                                id="satker"
                                name="satker"
                                value={form.satker}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition bg-white appearance-none"
                                required
                            >
                                <option value="" disabled>Pilih Satuan Kerja</option>
                                {satkers.map((s) => (
                                    <option key={s.id} value={s.label}>
                                        {s.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Kode Barang */}
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="kodeBarang" className="font-medium text-gray-700">
                            Kode Barang/Inventaris (Jika Ada) <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            id="kodeBarang"
                            name="kodeBarang"
                            value={form.kodeBarang}
                            onChange={handleChange}
                            placeholder="Cth: INV-001-2024 (atau Tulis 'Baru' jika barang baru)"
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition"
                            required
                        />
                    </div>

                    {/* Keterangan */}
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="keterangan" className="font-medium text-gray-700">
                            Keterangan Detail Pengajuan <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="keterangan"
                            name="keterangan"
                            value={form.keterangan}
                            onChange={handleChange}
                            rows={4}
                            placeholder="Jelaskan secara detail hal yang diajukan..."
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition"
                            required
                        ></textarea>
                    </div>

                    {/* Catatan Tambahan (Opsional) */}
                    <div className="flex flex-col space-y-2">
                        <label htmlFor="catatan" className="font-medium text-gray-700">
                            Catatan Internal (Opsional)
                        </label>
                        <textarea
                            id="catatan"
                            name="catatan"
                            value={form.catatan}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Catatan tambahan untuk proses internal..."
                            className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition"
                        ></textarea>
                    </div>
                </div>

                {/* KOLOM KANAN: Lampiran & TTD */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Data Pelapor & Mengetahui */}
                    <div className="space-y-4 bg-white p-6 rounded-xl shadow-lg border-t-4 border-gray-400">
                        <h3 className="text-xl font-semibold border-b pb-3 text-gray-700">Pelapor & Persetujuan</h3>
                        
                        {/* Pelapor (Read-only from User Data) */}
                        <div className="flex flex-col space-y-2">
                            <label className="font-medium text-gray-700">
                                Pelapor (NPP: {form.nppPelapor || 'N/A'})
                            </label>
                            <input
                                type="text"
                                value={form.pelapor || 'Memuat...'}
                                className="w-full border border-gray-300 rounded-xl p-3 bg-gray-100 text-gray-600 cursor-not-allowed"
                                readOnly
                            />
                        </div>

                        {/* Mengetahui (Tujuan Persetujuan) */}
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="mengetahui" className="font-medium text-gray-700">
                                Yang Mengetahui (Atasan)
                            </label>
                            <input
                                type="text"
                                id="mengetahui"
                                name="mengetahui"
                                value={form.mengetahui}
                                onChange={handleChange}
                                placeholder="Nama Lengkap Atasan"
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>
                        <div className="flex flex-col space-y-2">
                            <label htmlFor="nppMengetahui" className="font-medium text-gray-700">
                                NPP Yang Mengetahui
                            </label>
                            <input
                                type="text"
                                id="nppMengetahui"
                                name="nppMengetahui"
                                value={form.nppMengetahui}
                                onChange={handleChange}
                                placeholder="NPP Atasan"
                                className="w-full border border-gray-300 rounded-xl p-3 focus:ring-blue-500 focus:border-blue-500 transition"
                            />
                        </div>
                    </div>

                    {/* Lampiran File (Attachment) */}
                    <div className="space-y-4 bg-white p-6 rounded-xl shadow-lg border-t-4 border-yellow-500">
                        <h3 className="text-xl font-semibold border-b pb-3 text-gray-700">Lampiran Foto (Max 4)</h3>
                        
                        <label className="flex items-center justify-center border-2 border-dashed border-gray-300 hover:border-blue-500 p-6 rounded-xl cursor-pointer transition">
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                            />
                            <div className="text-center text-gray-600">
                                <Upload size={24} className="mx-auto text-blue-500 mb-2" />
                                <p className="text-sm font-medium">Klik untuk Unggah Foto</p>
                                <p className="text-xs text-gray-400">JPG, PNG, atau WEBP. Maksimal 4 file.</p>
                            </div>
                        </label>
                        
                        <div className="grid grid-cols-2 gap-3">
                            {previews.map((previewUrl, index) => (
                                <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                    <img 
                                        src={previewUrl} 
                                        alt={`Lampiran ${index + 1}`} 
                                        className="w-full h-full object-cover"
                                        onError={(e) => { e.currentTarget.src = 'https://placehold.co/100x100/A0AEC0/FFFFFF?text=Gagal'; }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Tanda Tangan Pelapor */}
                    <div className="space-y-4 bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500">
                        <h3 className="text-xl font-semibold border-b pb-3 text-gray-700">Tanda Tangan Pelapor <span className="text-red-500">*</span></h3>
                        
                        <label className={`flex items-center justify-center border-2 border-dashed ${ttdPelaporFile ? 'border-green-500' : 'border-gray-300 hover:border-blue-500'} p-6 rounded-xl cursor-pointer transition`}>
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleTtdPelaporChange}
                                className="hidden"
                                required
                            />
                            <div className="text-center text-gray-600">
                                {ttdPelaporFile ? (
                                    <div className="relative w-32 h-32 mx-auto">
                                        <img 
                                            src={ttdPelaporPreview || ''} 
                                            alt="Tanda Tangan" 
                                            className="w-full h-full object-contain"
                                            style={{ transform: `scale(${ttdScale})` }}
                                        />
                                        <p className="text-xs text-green-600 mt-1 font-medium">TTD berhasil diunggah.</p>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="mx-auto text-green-500 mb-2" />
                                        <p className="text-sm font-medium">Unggah File Tanda Tangan</p>
                                        <p className="text-xs text-gray-400">Hanya 1 file (JPG/PNG)</p>
                                    </>
                                )}
                            </div>
                        </label>
                    </div>
                    
                    {/* Tombol Aksi */}
                    <div className="flex flex-col space-y-3 pt-4">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className={`flex items-center justify-center gap-2 ${
                                isSubmitting ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                            } text-white px-5 py-3 rounded-xl shadow-xl transition-all transform hover:scale-[1.01] duration-200 ease-in-out font-semibold`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 size={20} className="animate-spin" /> Mengirim Pengajuan...
                                </>
                            ) : (
                                <>
                                    <Check size={20} /> Ajukan Data (Submit)
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsPrintMode(true)}
                            className="flex items-center justify-center gap-2 bg-gray-200 text-gray-700 px-5 py-3 rounded-xl hover:bg-gray-300 transition font-medium"
                        >
                            <Printer size={20} /> Preview Cetak
                        </button>
                    </div>
                </div>

            </form>
        </div>
    );
}