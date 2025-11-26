"use client";

import React, { useEffect, useState, useRef } from "react";
import { Droplet, Printer, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select";

type SatkerDef = { id: string; label: string; jabatan: string };
type HalOption = { id: string | number; nama_jenis: string };

export default function LampiranPengajuanPage() {
  const router = useRouter();
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

  const nomorSurat = localStorage.getItem("nomor_surat_terakhir");
  const [halOptions, setHalOptions] = useState<HalOption[]>([]);

  useEffect(() => {
    const fetchHal = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("/api/hal", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
        if (!res.ok) throw new Error("Gagal memuat data HAL");
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          setHalOptions(json.data.map((item: any) => ({ id: item.id, nama_jenis: item.nama_jenis })));
        }
      } catch (err) { console.error("❌ Error ambil data HAL:", err); }
    };
    fetchHal();
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/"); return; }
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (data?.nama && data?.npp) { setUser({ nama: data.nama, npp: data.npp }); setForm((f) => ({ ...f, pelapor: data.nama, nppPelapor: data.npp })); } })
      .catch((err) => console.error("Gagal ambil data user:", err))
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("/api/satker", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => { if (Array.isArray(data?.data)) { setSatkers(data.data.map((item: any) => ({ id: item.id?.toString(), label: item.satker_name, jabatan: item.jabsatker || "Ka.Unit" }))); } })
      .catch((err) => console.error("Gagal ambil satker:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleHalChange = (e: React.ChangeEvent<HTMLSelectElement>) => { const selectedId = e.target.value; const selectedOption = halOptions.find(opt => String(opt.id) === selectedId); setForm(p => ({ ...p, hal: selectedId, hal_nama: selectedOption ? selectedOption.nama_jenis : "" })); };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { if (!e.target.files) return; const selectedFiles = Array.from(e.target.files).slice(0, 4); setFiles(selectedFiles); setPreviews(selectedFiles.map((file) => URL.createObjectURL(file))); };
  
  const handleTtdPelaporChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setTtdPelaporFile(file);
    const previewUrl = URL.createObjectURL(file);
    const transparentUrl = await makeImageTransparent(previewUrl);
    setTtdPelaporPreview(transparentUrl);
  };

  async function makeImageTransparent(imgUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image(); img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas"); const ctx = canvas.getContext("2d")!;
        canvas.width = img.width; canvas.height = img.height; ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height); const data = imageData.data;
        const whiteThreshold = 235; const blackThreshold = 35;
        for (let i = 0; i < data.length; i += 4) { const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3; if (brightness > whiteThreshold || brightness < blackThreshold) { data[i + 3] = 0; } }
        ctx.putImageData(imageData, 0, 0); resolve(canvas.toDataURL("image/png"));
      };
      img.src = imgUrl;
    });
  }

  const handlePrint = () => { setIsPrintMode(true); setTimeout(() => { window.print(); setIsPrintMode(false); }, 300); };

  // === FUNGSI AJUKAN YANG SUDAH DIPERBAIKI ===
  const handleAjukan = async () => {
    const wajibDiisi = [{ field: "hal", label: "Hal" }, { field: "kepada", label: "Kepada" }, { field: "satker", label: "Satker" }, { field: "kodeBarang", label: "Kode Barang" }, { field: "keterangan", label: "Keterangan" }, { field: "pelapor", label: "Nama Pelapor" }, { field: "nppPelapor", label: "NPP Pelapor" }];
    const kosong = wajibDiisi.filter((f) => !form[f.field as keyof typeof form]);
    if (kosong.length > 0) { alert(`Data berikut belum lengkap:\n- ${kosong.map((f) => f.label).join("\n- ")}`); return; }
    if (!ttdPelaporFile) { alert("Harap upload tanda tangan pelapor terlebih dahulu."); return; }
    
    setIsSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) { alert("Token tidak ditemukan. Silakan login ulang."); return; }

      // 1. Siapkan FormData untuk dikirim ke API route /api/pengajuan
      const formData = new FormData();

      // 2. Tambahkan semua field teks dari form
      Object.entries(form).forEach(([key, value]) => { if (key !== 'hal_nama') { formData.append(key, value); } });

      // 3. Kirim nomor surat agar server bisa membuat nama file yang unik
      if (nomorSurat) {
        formData.append('nomorSurat', nomorSurat);
      }

      // 4. Tambahkan semua file lampiran
      files.forEach((file) => { formData.append('files', file); }); // Gunakan key 'files' untuk multiple files

      // 5. Tambahkan file tanda tangan
      if (ttdPelaporFile) { formData.append('ttdPelapor', ttdPelaporFile); }
      
      // 6. Kirim FormData ke server
      const res = await fetch("/api/pengajuan", { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: formData });
      const result = await res.json();
      
      if (result.success) { alert(`✅ Sukses: ${result.message}`); } 
      else { console.error("Gagal Ajukan:", result); alert(`❌ Gagal mengajukan: ${result.message || 'Terjadi kesalahan server.'}`); }

    } catch (error) { console.error("Error jaringan saat mengajukan:", error); alert("❌ Error jaringan/server. Silakan cek koneksi atau log terminal."); } 
    finally { setIsSubmitting(false); }
  };

  const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getFullYear()}`;
  const todayStr = `Semarang, ${formatDate(new Date())}`;
  const selectedSatker = satkers.find((s) => s.id === form.satker);
  const jabatan = selectedSatker?.jabatan || "Ka.Unit";

  return (
    <div className="p-6">
      <style>{` @page { size: A4; margin: 20mm; } @media print { body * { visibility: hidden !important; } #print-area, #print-area * { visibility: visible !important; } #print-area { position: absolute; left: 0; top: 0; width: 100%; } .no-print { display: none !important; } #print-area input, #print-area select, #print-area textarea { border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important; } #print-area .ttd-container { border: none !important; box-shadow: none !important; background: transparent !important; } } .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; } `}</style>
      <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
        <div className="p-4 flex items-center justify-between border-b no-print"> {/* Header */} </div>
        <div id="print-area" className="p-6"> {/* Isi Form */} </div>
        {/* Tombol Ajukan */}
        {!isPrintMode && (
          <button onClick={handleAjukan} disabled={isSubmitting} className={`fixed bottom-6 right-6 px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200 ${isSubmitting ? 'bg-gray-500 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 text-white'}`}>
            <Droplet size={18} /> {isSubmitting ? "Mengajukan..." : "Ajukan"}
          </button>
        )}
      </div>
    </div>
  );
}