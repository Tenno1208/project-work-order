"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar } from "lucide-react";
// Pastikan komponen ini ada atau ganti dengan elemen HTML biasa jika tidak menggunakan shadcn/ui
// import { Button } from "@/components/ui/button"; 
import { motion, AnimatePresence } from "framer-motion";

// Asumsi Button adalah komponen standar atau diganti dengan elemen <button>
const Button = ({ onClick, children, className }: any) => (
  <button onClick={onClick} className={className}>
    {children}
  </button>
);


export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState({
    menugaskan1: "",
    menugaskan2: "",
    menugaskan3: "",
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
    jenisPekerjaan: "",
  });

  // State untuk menyimpan daftar jenis pekerjaan yang diambil dari API
  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<{ id: string | number; nama: string }[]>([]);
  const [loadingMessage, setLoadingMessage] = useState("Memuat Data..."); // State pesan loading/error

  // 🔹 FETCH DATA JENIS PEKERJAAN
  useEffect(() => {
    const fetchJenisPekerjaan = async () => {
      setLoadingMessage("Memuat Data..."); // Reset pesan
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token tidak ditemukan di localStorage");
          setLoadingMessage("Token tidak ditemukan. Harap login.");
          return;
        }

        const res = await fetch("/api/jenis-pekerjaan", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = await res.json();
        
        if (res.ok && json?.success && Array.isArray(json.data)) {
          const mappedOptions = json.data.map((item: any) => ({
            id: item.id,
            nama: item.nama, 
          }));
          setJenisPekerjaanOptions(mappedOptions);
          setLoadingMessage("-- Pilih Jenis Pekerjaan --"); // Sukses
        } else {
          console.error("Gagal Ambil Data JP:", json?.message || "Data kosong/format salah");
          setLoadingMessage(`Gagal: ${json.message || "Kesalahan format data API."}`); // Gagal dari API Route
        }
      } catch (err: any) {
        console.error("❌ Error ambil data Jenis Pekerjaan (client side):", err);
        setLoadingMessage(`Error Koneksi: ${err.message || "Gagal menghubungi server."}`); // Gagal koneksi
      }
    };

    fetchJenisPekerjaan();
  }, []);

  // ... (Sisa kode SPKPage Anda) ...
  const docRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    setData((s) => ({ ...s, tanggalSelesai: formatted }));
  }, []);

  const updateField = (key: string, value: string) =>
    setData((s) => ({ ...s, [key]: value }));

  const handlePrint = () => {
    const printContents = docRef.current?.innerHTML;
    if (!printContents) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Surat Perintah Kerja</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: 'Times New Roman', serif; color: #000; }
            .bordered {
              border: 1px solid #000;
              padding: 20px;
              min-height: 270mm;
            }
          </style>
        </head>
        <body>${printContents}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const EditableBox = ({ value, onChange }: any) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(e: any) => onChange(e.currentTarget.innerText || "")}
      className="min-h-[140px] p-2 text-black bg-white border border-gray-300 rounded-md"
      style={{ outline: "none", whiteSpace: "pre-wrap" }}
    >
      {value || " "}
    </div>
  );

  const toggleStatus = (val: string) =>
    setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  const daftarNama = [
    "Budi Santoso",
    "Siti Rahma",
    "Andi Wijaya",
    "Dewi Lestari",
    "Rudi Hartono",
  ];

  const formatTanggal = (val: string) => {
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-lg rounded-lg">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b px-6 py-3 bg-gray-50">
          <h1 className="text-base font-semibold text-gray-800">
            Surat Perintah Kerja (SPK) — Editable
          </h1>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg">
            Cetak (A4)
          </Button>
        </div>

        {/* Isi dokumen */}
        <div ref={docRef} className="p-8 text-[13px] leading-relaxed font-serif">
          <div className="border border-black p-8 rounded-md bordered">
            <h2
              className="text-center font-bold underline mb-4 text-black"
              style={{ fontSize: 16 }}
            >
              SURAT PERINTAH KERJA
            </h2>

            {/* Bagian awal */}
            <div className="mt-2 text-black space-y-4">
              <div className="flex items-start mt-2">
                <div className="w-[140px] mt-1">Menugaskan Sdr:</div>
                <div className="flex flex-col gap-10 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-[50px] text-right">{i}.</div>
                      <select
                        value={data[`menugaskan${i}` as keyof typeof data]}
                        onChange={(e) => updateField(`menugaskan${i}`, e.target.value)}
                        className="border border-gray-500 rounded-md bg-white text-sm py-1 px-2 w-full focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">--- Pilih nama dari daftar ---</option>
                        {daftarNama.map((nama) => (
                          <option key={nama} value={nama}>
                            {nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan
              </div>

              {!showDetail && (
                <Button
                  onClick={() => setShowDetail(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Selesai
                </Button>
              )}
            </div>

            {/* Bagian bawah (detail) */}
            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mt-6 text-black border-t border-gray-300 pt-4 rounded-lg shadow-inner bg-white p-5"
                >
                {/* Tanggal selesai */}
                <div className="flex mt-3 items-center">
                  <div className="w-[140px]">Tanggal Selesai</div>
                  <div className="relative">
                    <input
                      type="date"
                      value={
                        data.tanggalSelesai.split("/").reverse().join("-") // ubah format ke yyyy-mm-dd agar bisa tampil
                      }
                      onChange={(e) =>
                        updateField("tanggalSelesai", formatTanggal(e.target.value))
                      }
                      className="border border-gray-400 rounded-md bg-white outline-none px-3 py-1 text-sm w-[180px] focus:ring-2 focus:ring-blue-300"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                  </div>
                </div>


                {/* JENIS PEKERJAAN */}
                <div className="flex mt-4 items-center">
                    <div className="w-[170px]">Jenis Pekerjaan</div>
                    <select
                        value={data.jenisPekerjaan}
                        onChange={(e) => updateField("jenisPekerjaan", e.target.value)}
                        className="border border-gray-400 rounded-md bg-white text-sm py-1 px-2 w-full focus:ring-2 focus:ring-blue-300"
                    >
                        <option value="">
                          {jenisPekerjaanOptions.length > 0 ? loadingMessage : loadingMessage}
                        </option>
                        {jenisPekerjaanOptions.map((jp) => (
                            <option key={jp.id} value={jp.nama}>
                                {jp.nama}
                            </option>
                        ))}
                    </select>
                </div>


                {/* ID Barang */}
                <div className="flex mt-4 items-center">
                  <div className="w-[140px]">ID Barang</div>
                  <input
                    type="text"
                    value={data.idBarang}
                    onChange={(e) => updateField("idBarang", e.target.value)}
                    placeholder="(Ketik ID barang...)"
                    className="border border-gray-400 rounded-md bg-white outline-none px-2 py-1 text-sm flex-1 focus:ring focus:ring-blue-300"
                  />
                </div>

                {/* Uraian */}
                <div className="flex mt-4">
                  <div className="w-[140px]">Uraian Pekerjaan</div>
                  <div className="flex-1">
                    <EditableBox
                      value={data.uraianPekerjaan}
                      onChange={(v: string) => updateField("uraianPekerjaan", v)}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="mt-6 flex items-start">
                  <div className="w-[140px]">Status Pekerjaan</div>
                  <div className="flex items-center gap-8">
                    {["Selesai", "Belum Selesai"].map((s) => (
                      <div
                        key={s}
                        className="flex items-center gap-2 cursor-pointer"
                        onClick={() => toggleStatus(s)}
                      >
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            border: "1px solid #000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {data.status === s ? "✓" : ""}
                        </div>
                        <div>{s}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tanda tangan */}
                <div className="mt-12 flex justify-between">
                  <div className="w-1/2 text-center">
                    <div>Mengetahui</div>
                    <div>Ka. Bid Pengembangan Program</div>
                    <div style={{ height: 70 }}></div>
                    <div className="font-bold border-t inline-block mt-1">
                      Arief Endrawan J, S.E.
                    </div>
                    <div>NPP.690839804</div>
                  </div>

                  <div className="w-1/2 text-center">
                    <div>Ka. Sub Bid TI</div>
                    <div style={{ height: 70 }}></div>
                    <div className="font-bold border-t inline-block mt-1">
                      A. Sigit Dwiyoga, S.Kom.
                    </div>
                    <div>NPP.690830502</div>
                  </div>
                </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}