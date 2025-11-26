"use client";

import React, { useEffect, useState, useRef } from "react";
import { Droplet, Printer, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select"; // Import Select dari react-select

type SatkerDef = { id: string; label: string; jabatan: string };
// Definisikan tipe untuk opsi Hal
type HalOption = { id: string | number; nama_jenis: string };

export default function LampiranPengajuanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
  const [satkers, setSatkers] = useState<SatkerDef[]>([]);

  const [form, setForm] = useState({
    hal: "", // Menyimpan ID HAL yang akan dikirim ke API
    hal_nama: "", // Menyimpan Nama HAL untuk ditampilkan
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
  const [isSubmitting, setIsSubmitting] = useState(false); // State untuk tombol Ajukan

  // 🔹 Tanda tangan pelapor
  const [ttdPelaporFile, setTtdPelaporFile] = useState<File | null>(null);
  const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
  const [ttdScale, setTtdScale] = useState(1);
  const nodeRef = useRef(null);

  const nomorSurat = localStorage.getItem("nomor_surat_terakhir");

  // Ubah state halOptions agar menyimpan ID dan Nama
  const [halOptions, setHalOptions] = useState<HalOption[]>([]);

  useEffect(() => {
    const fetchHal = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token tidak ditemukan di localStorage");
          return;
        }

        const res = await fetch("/api/hal", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) throw new Error("Gagal memuat data HAL");
        const json = await res.json();

        if (json?.success && Array.isArray(json.data)) {
          // MAP PENTING: Simpan ID dan nama_jenis
          const options = json.data.map((item: any) => ({
            id: item.id,
            nama_jenis: item.nama_jenis,
          }));
          setHalOptions(options);
        } else {
          console.error("Format data HAL tidak sesuai:", json);
        }
      } catch (err) {
        console.error("❌ Error ambil data HAL:", err);
      }
    };

    fetchHal();
  }, []);

  
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

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
  }, [router]);

  // ✅ Ambil daftar satker
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

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
  }, []);

  // 🔹 Handler input form
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  // 🔹 Handler untuk SELECT HAL
  const handleHalChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedId = e.target.value;
      const selectedOption = halOptions.find(opt => String(opt.id) === selectedId);

      setForm(p => ({
          ...p,
          hal: selectedId, // Simpan ID
          hal_nama: selectedOption ? selectedOption.nama_jenis : "", // Simpan Nama
      }));
  };

  // 🔹 Handler upload lampiran
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files).slice(0, 4);
    setFiles(selectedFiles);
    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(previews);
  };

  // 🔹 Handler upload tanda tangan Pelapor (TANPA CANVAS)
  const handleTtdPelaporChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setTtdPelaporFile(file);
    // Simpan URL preview langsung dari file
    const previewUrl = URL.createObjectURL(file);
    setTtdPelaporPreview(previewUrl); 
  };


  // 🔹 Fungsi cetak
  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  // 🚀 FUNGSI UTAMA: MENGIRIM DATA KE API BACKEND
  const handleAjukan = async () => {
    // Validasi field wajib (HANYA CEK field teks)
    const wajibDiisi = [
      { field: "hal", label: "Hal" }, // CEK ID HAL
      { field: "kepada", label: "Kepada" },
      { field: "satker", label: "Satker" },
      { field: "kodeBarang", label: "Kode Barang" },
      { field: "keterangan", label: "Keterangan" },
      { field: "pelapor", label: "Nama Pelapor" },
      { field: "nppPelapor", label: "NPP Pelapor" },
    ];

    const kosong = wajibDiisi.filter((f) => !form[f.field as keyof typeof form]);

    if (kosong.length > 0) {
      alert(
        `Data berikut belum lengkap:\n- ${kosong
          .map((f) => f.label)
          .join("\n- ")}`
      );
      return;
    }

    // TTD Pelapor tidak diwajibkan untuk diupload ke API sekarang, tapi file-nya harus ada
    // if (!ttdPelaporFile) {
    //   alert("Harap upload tanda tangan pelapor terlebih dahulu.");
    //   return;
    // }

    if (files.length === 0) {
      const konfirmasi = window.confirm(
        "Belum ada foto/lampiran yang diunggah. Yakin ingin tetap mengajukan?"
      );
      if (!konfirmasi) return;
    }
    
    setIsSubmitting(true);
    
    // 1. Buat FormData
    const formData = new FormData();
    
    // Tambahkan field teks
    Object.entries(form).forEach(([key, value]) => {
        if (key !== 'hal_nama') { 
            formData.append(key, value);
        }
    });

    // Tambahkan file lampiran
    files.forEach((file, index) => {
      formData.append(`file${index}`, file, file.name); 
    });

    // TTD Pelapor dikirim ke backend sebagai file, meskipun kita tidak memprosesnya
    if (ttdPelaporFile) {
       formData.append('ttdPelapor', ttdPelaporFile, ttdPelaporFile.name);
    }
    
    // 2. Kirim ke API Route Next.js
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Token tidak ditemukan. Silakan login ulang.");
        return;
      }

      const res = await fetch("/api/pengajuan", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`, 
        },
        body: formData, 
      });

      const result = await res.json();
      
      if (result.success) {
        alert(`✅ Sukses: ${result.message}`);
        // router.push('/dashboard/riwayat'); 
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
  const today