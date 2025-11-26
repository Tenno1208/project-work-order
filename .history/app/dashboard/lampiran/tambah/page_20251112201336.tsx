
import React, { useEffect, useState, useRef, useCallback } from "react";
import { Droplet, Printer, Upload } from "lucide-react";

// Placeholder for external dependencies not included in this environment
const useNoopRouter = () => ({ push: (path) => console.log('Navigation attempt:', path) });
const NoopSelect = ({ options, value, onChange, placeholder, ...props }) => (
    <select
        value={value?.value || ""}
        onChange={(e) => {
            const selected = options.find(opt => opt.value === e.target.value);
            onChange(selected);
        }}
        className="text-sm w-full p-1 border border-gray-300 rounded bg-white"
        {...props}
    >
        <option value="" disabled>{placeholder}</option>
        {options.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
        ))}
    </select>
);
// Replaced Draggable with a static container for simplicity
const StaticTtdContainer = ({ children, ttdScale, nodeRef }) => (
    <div ref={nodeRef} className="ttd-container border border-gray-300 rounded inline-block relative w-[180px] h-[100px] bg-gray-50 shadow-sm overflow-hidden flex items-center justify-center">
        {children}
    </div>
);

type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };

export default function LampiranPengajuanPage() {
    const router = useNoopRouter();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
    const [satkers, setSatkers] = useState<SatkerDef[]>([]);

    const [form, setForm] = useState({
        hal: "",
        hal_nama: "",
        kepada: "",
        satker: "",
        kodeBarang: "",
        keterangan: "",
        pelapor: "",
        nppPelapor: "",
        mengetahui: "",
        nppMengetahui: "",
    });

    const [files, setFiles] = useState<File[]>([]);
    const [isPrintMode, setIsPrintMode] = useState(false);
    const [previews, setPreviews] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // 🔹 Tanda tangan pelapor
    const [ttdPelaporFile, setTtdPelaporFile] = useState<File | null>(null);
    const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
    const [ttdScale, setTtdScale] = useState(1);
    const nodeRef = useRef(null);

    // Placeholder data (simulating localStorage or environment variables)
    const nomorSurat = "WO-2025/11/001"; // Faked number
    const [halOptions, setHalOptions] = useState<HalOption[]>([
        { id: 1, nama_jenis: "Pengajuan Perbaikan" },
        { id: 2, nama_jenis: "Penggantian Suku Cadang" },
        { id: 3, nama_jenis: "Permintaan Barang" },
    ]);

    // Mock API Fetching (Simplified to prevent actual network errors in sandbox)
    useEffect(() => {
        // Mock user and satker data fetch
        const mockFetch = () => {
            const mockUser = { nama: "John Doe", npp: "12345" };
            setUser(mockUser);
            setForm((f) => ({
                ...f,
                pelapor: mockUser.nama,
                nppPelapor: mockUser.npp,
            }));

            const mockSatkers = [
                { id: "S001", label: "Kantor Pusat", jabatan: "Direktur Utama" },
                { id: "S002", label: "Unit Pelayanan Barat", jabatan: "Ka. Unit" },
            ];
            setSatkers(mockSatkers);

            setLoading(false);
        };
        mockFetch();
    }, []);

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
        // Note: The uploadedFileUrls state and logic are removed as files are now sent raw to the local API
    };

    // Helper to make image background transparent (kept as it is self-contained logic)
    async function makeImageTransparent(imgUrl: string): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d")!;
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;

                const whiteThreshold = 235;
                const blackThreshold = 35;

                for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const brightness = (r + g + b) / 3;

                    // Make near-white and near-black pixels transparent
                    if (brightness > whiteThreshold || brightness < blackThreshold) {
                        data[i + 3] = 0;
                    }
                }

                ctx.putImageData(imageData, 0, 0);
                resolve(canvas.toDataURL("image/png"));
            };
            img.src = imgUrl;
        });
    }

    const handleTtdPelaporChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const file = e.target.files[0];
        setTtdPelaporFile(file);
        const previewUrl = URL.createObjectURL(file);
        // Try to make the background transparent
        try {
            const transparentUrl = await makeImageTransparent(previewUrl);
            setTtdPelaporPreview(transparentUrl);
        } catch (error) {
            console.error("Failed to make image transparent, using raw preview:", error);
            setTtdPelaporPreview(previewUrl);
        }
    };

    const handlePrint = () => {
        setIsPrintMode(true);
        setTimeout(() => {
            window.print();
            setIsPrintMode(false);
        }, 300);
    };

    const handleAjukan = async () => {
        // 1. Validation checks
        const wajibDiisi = [
            { field: "hal", label: "Hal" },
            { field: "kepada", label: "Kepada" },
            { field: "satker", label: "Satker" },
            { field: "kodeBarang", label: "Kode Barang" },
            { field: "keterangan", label: "Keterangan" },
            { field: "pelapor", label: "Nama Pelapor" },
            { field: "nppPelapor", label: "NPP Pelapor" },
        ];

        const kosong = wajibDiisi.filter((f) => !form[f.field as keyof typeof form]);

        if (kosong.length > 0) {
            // Using alert instead of modal as per original user code
            alert(
                `Data berikut belum lengkap:\n- ${kosong
                    .map((f) => f.label)
                    .join("\n- ")}`
            );
            return;
        }

        if (!ttdPelaporFile) {
            alert("Harap upload tanda tangan pelapor terlebih dahulu.");
            return;
        }

        if (files.length === 0) {
            // Using confirm instead of modal as per original user code
            if (typeof window !== 'undefined' && !window.confirm(
                "Belum ada foto/lampiran yang diunggah. Yakin ingin tetap mengajukan?"
            )) return;
        }

        setIsSubmitting(true);

        try {
            const token = localStorage.getItem("token") || "mock_token_12345"; // Use a mock token if not found
            if (!token) {
                alert("Token tidak ditemukan. Silakan login ulang.");
                router.push('/');
                return;
            }

            // 2. PREPARE FORM DATA WITH ALL FILES AND TEXT FIELDS
            const formData = new FormData();

            // Add text fields
            Object.entries(form).forEach(([key, value]) => {
                if (key !== 'hal_nama') {
                    formData.append(key, value);
                }
            });

            // Add signature file (Server expects 'ttdPelapor')
            if (ttdPelaporFile) {
                formData.append('ttdPelapor', ttdPelaporFile, ttdPelaporFile.name);
            }

            // Add attachment files (Server expects 'file0', 'file1', etc.)
            files.forEach((file, index) => {
                formData.append(`file${index}`, file, file.name);
            });

            console.log("Submitting FormData to local API /api/pengajuan...");

            // 3. Send form data to the local API (which handles external upload)
            const res = await fetch("/api/pengajuan", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                },
                body: formData,
            });

            const result = await res.json();

            if (res.ok && result.success) {
                alert(`✅ Sukses: ${result.message}`);
                // router.push('/dashboard/riwayat'); // Re-enable if using Next.js router
            } else {
                console.error("Gagal Ajukan:", result);
                alert(`❌ Gagal mengajukan: ${result.message || 'Terjadi kesalahan server.'}`);
            }

        } catch (error) {
            console.error("Error jaringan saat mengajukan:", error);
            alert("❌ Error jaringan/server. Silakan cek koneksi atau log terminal.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (d: Date) =>
        `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
            .toString()
            .padStart(2, "0")}-${d.getFullYear()}`;
    const todayStr = `Semarang, ${formatDate(new Date())}`;
    const selectedSatker = satkers.find((s) => s.id === form.satker);
    const jabatan = selectedSatker?.jabatan || "Ka.Unit";

    return (
        <div className="p-6 font-[Inter]">
            <style>{`
                @page { size: A4; margin: 20mm; }
                @media print {
                    body * { visibility: hidden !important; }
                    #print-area, #print-area * { visibility: visible !important; }
                    #print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; margin: 0 !important; }
                    .no-print { display: none !important; }
                    #print-area input, #print-area select, #print-area textarea {
                        border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important;
                    }
                    #print-area .ttd-container { border: none !important; box-shadow: none !important; background: transparent !important; }
                    .print-signature-gap { margin-top: 50px; } /* Adjust signature positioning for print */
                }
                .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
            `}</style>

            <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-xl rounded-xl text-gray-800">
                {/* Header */}
                <div className="p-4 flex items-center justify-between border-b no-print bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 rounded-lg text-white"><Droplet size={20} /></div>
                        <div>
                            <div className="font-bold text-lg">Lampiran Pengajuan Perbaikan</div>
                            <div className="text-xs text-gray-500">Form PDAM — preview dan cetak satu halaman</div>
                        </div>
                    </div>
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2 hover:bg-blue-700 transition shadow-md"
                    >
                        <Printer size={16} /> Cetak
                    </button>
                </div>

                {/* Isi Form */}
                <div id="print-area" className="p-8">
                    {/* Header Form */}
                    <div className="flex justify-between items-start border-b border-gray-400 pb-2">
                        <div>
                            <div className="font-extrabold text-base">PERUMDA AIR MINUM TIRTA MOEDAL</div>
                            <div className="font-extrabold text-base">KOTA SEMARANG</div>
                        </div>
                        <div className="text-right text-sm">
                            <div>No. Surat: <strong className="font-mono text-blue-800">{nomorSurat || "Belum ada"}</strong></div>
                            <div>{todayStr}</div>
                        </div>
                    </div>

                    {/* HAL & Kepada */}
                    <div className="mt-4 flex gap-6 border-b border-gray-200 pb-4">
                        <div className="w-1/2 text-sm font-semibold">
                            Hal:
                            {isPrintMode ? (
                                <span className="ml-2 font-normal">{form.hal_nama}</span>
                            ) : (
                                <select
                                    name="hal"
                                    value={form.hal}
                                    onChange={handleHalChange}
                                    className="ml-2 w-[calc(100%-40px)] p-2 border border-gray-300 rounded-lg bg-white text-sm focus:ring-blue-500 focus:border-blue-500"
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

                        <div className="w-1/2 text-sm">
                            Kepada Yth. <br />
                            {isPrintMode ? (
                                <strong className="text-base">{form.kepada || "__________________"}</strong>
                            ) : (
                                <NoopSelect
                                    name="kepada"
                                    value={form.kepada ? { value: form.kepada, label: form.kepada } : null}
                                    onChange={(option) =>
                                        setForm((f) => ({ ...f, kepada: option ? option.value : "" }))
                                    }
                                    options={satkers.map((s) => ({ value: s.label, label: s.label }))}
                                    placeholder="Cari atau pilih tujuan..."
                                    className="text-sm w-full"
                                    style={{ zIndex: 50 }}
                                />
                            )}
                            <br />
                            PERUMDA AIR MINUM Tirta Moedal <br /> di <strong>SEMARANG</strong>
                        </div>
                    </div>

                    {/* Satker & Kode Barang */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-1/3 font-semibold">Satker:</div>
                            <div className="w-2/3">
                                {isPrintMode ? (
                                    <span>{selectedSatker?.label || "__________________"}</span>
                                ) : (
                                    <NoopSelect
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
                                        style={{ zIndex: 40 }}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-1/3 font-semibold">Kode Barang:</div>
                            <div className="w-2/3">
                                {isPrintMode ? (
                                    <span>{form.kodeBarang || "__________________"}</span>
                                ) : (
                                    <input
                                        type="text"
                                        name="kodeBarang"
                                        value={form.kodeBarang}
                                        onChange={handleChange}
                                        placeholder="Isi kode barang"
                                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                    />
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Keterangan */}
                    <div className="mt-4 big-box text-sm bg-gray-50 border-gray-400 rounded-lg">
                        <div className="font-semibold mb-1">Uraian Kerusakan / Perbaikan:</div>
                        {isPrintMode ? (
                            <div className="text-xs" style={{ whiteSpace: "pre-wrap" }}>{form.keterangan}</div>
                        ) : (
                            <textarea
                                name="keterangan"
                                value={form.keterangan}
                                onChange={handleChange}
                                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                                className="w-full resize-none border border-gray-300 rounded-lg p-2 min-h-[100px] focus:ring-blue-500 focus:border-blue-500"
                                rows={6}
                            />
                        )}
                    </div>

                    {/* Upload Foto / Lampiran */}
                    {!isPrintMode && (
                        <div className="mt-4 p-4 border border-dashed border-gray-400 rounded-lg bg-yellow-50/50 no-print">
                            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700 hover:text-blue-600 transition">
                                <Upload size={18} /> Upload Foto/Dokumen Bukti (max 4 file)
                                <input
                                    type="file"
                                    multiple
                                    accept=".jpg,.jpeg,.png,.pdf"
                                    onChange={handleFileChange}
                                    className="hidden"
                                />
                            </label>
                            {previews.length > 0 && (
                                <div className="mt-3 grid grid-cols-4 gap-3">
                                    {previews.map((src, i) => (
                                        <div key={i} className="relative aspect-video">
                                            <img src={src} alt={`preview-${i}`} className="w-full h-full object-cover rounded-lg shadow-md border border-gray-300" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Print Previews */}
                    {isPrintMode && previews.length > 0 && (
                        <div className="mt-4 grid grid-cols-4 gap-3 break-inside-avoid">
                            {previews.map((src, i) => (
                                <img key={i} src={src} alt={`foto-${i}`} className="w-full h-28 object-cover border border-gray-400" />
                            ))}
                        </div>
                    )}

                    {/* Kalimat penutup */}
                    <div className="mt-8 text-xs text-left">
                        Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
                    </div>

                    {/* Tanda tangan */}
                    <div className="mt-12 flex justify-between text-center max-w-[500px] mx-auto">
                        {/* Mengetahui (Fixed input fields for print) */}
                        <div className="w-1/2 px-4">
                            <div className="text-sm font-bold">Mengetahui</div>
                            <div className="text-xs">{jabatan}</div>
                            <div className="mt-1 flex justify-center h-[70px] items-center">
                                {/* Placeholder for TTD Mengetahui (if uploaded) */}
                            </div>
                            <div className="mt-12 text-sm border-b border-black w-full text-center py-1 print-signature-gap">
                                {isPrintMode ? form.mengetahui : (
                                    <input
                                        type="text"
                                        name="mengetahui"
                                        value={form.mengetahui}
                                        onChange={handleChange}
                                        placeholder="Nama yang Mengetahui"
                                        className="w-full text-center border-none focus:ring-0 text-sm p-0"
                                    />
                                )}
                            </div>
                            <div className="text-xs mt-1">
                                NPP: {isPrintMode ? form.nppMengetahui : (
                                    <input
                                        type="text"
                                        name="nppMengetahui"
                                        value={form.nppMengetahui}
                                        onChange={handleChange}
                                        placeholder="NPP"
                                        className="w-full text-center border-none focus:ring-0 text-xs p-0"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Pelapor */}
                        <div className="w-1/2 px-4">
                            <div className="text-sm font-bold">Pelapor</div>

                            {!ttdPelaporPreview && !isPrintMode && (
                                <div className="mt-3 text-center no-print">
                                    <label className="flex flex-col items-center gap-2 cursor-pointer mb-2 text-xs text-gray-600 hover:text-blue-600">
                                        <Upload size={16} /> Upload Tanda Tangan
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleTtdPelaporChange}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}

                            {ttdPelaporPreview && !isPrintMode && (
                                <>
                                    <StaticTtdContainer ttdScale={ttdScale} nodeRef={nodeRef}>
                                        <img
                                            src={ttdPelaporPreview}
                                            alt="Tanda tangan pelapor"
                                            style={{
                                                maxWidth: 160,
                                                maxHeight: 80,
                                                transform: `scale(${ttdScale})`,
                                                transformOrigin: "center center",
                                            }}
                                            className="object-contain"
                                        />
                                    </StaticTtdContainer>
                                    <div className="mt-2 flex justify-center items-center gap-2 text-xs select-none no-print">
                                        Zoom:
                                        <input
                                            type="range"
                                            min="0.4"
                                            max="2"
                                            step="0.1"
                                            value={ttdScale}
                                            onChange={(e) => setTtdScale(parseFloat(e.target.value))}
                                            className="cursor-pointer"
                                        />
                                    </div>
                                </>
                            )}

                            {isPrintMode && ttdPelaporPreview && (
                                <div className="mt-1 flex justify-center h-[70px] items-center">
                                    <img
                                        src={ttdPelaporPreview}
                                        alt="Tanda tangan pelapor"
                                        style={{ transform: `scale(${ttdScale})`, transformOrigin: "center center" }}
                                        className="w-28 h-auto object-contain"
                                    />
                                </div>
                            )}

                            <div className="mt-12 text-sm border-b border-black w-full text-center py-1 print-signature-gap">
                                {form.pelapor || "..........................."}
                            </div>
                            <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
                        </div>
                    </div>

                    {/* Tombol Ajukan */}
                    {!isPrintMode && (
                        <button
                            onClick={handleAjukan}
                            disabled={isSubmitting}
                            className={`fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 transition-all duration-300 transform ${
                                isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'
                            } hover:scale-[1.03]`}
                        >
                            <Droplet size={18} />
                            {isSubmitting ? "Mengajukan..." : "Ajukan"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}