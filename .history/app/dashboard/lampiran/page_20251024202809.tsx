"use client";

import React, { useEffect, useState } from "react";
import { Droplet, Printer, Upload, X } from "lucide-react"; // ⬅️ tambahkan X untuk tombol tutup modal

type SatkerDef = { id: string; label: string };

const SATKERS: SatkerDef[] = [
  { id: "satker-1", label: "Seksi Produksi" },
  { id: "satker-2", label: "Sub Bid Keuangan" },
  { id: "satker-3", label: "Sub Bag Umum" },
  { id: "satker-4", label: "Kasatker Wilayah Barat" },
];

const KEPADA_OPTIONS = ["Ka.Sub Bid PTI", "Ka.Bag Umum", "Kasatker Wilayah Barat"];
const HAL_OPTIONS = ["Perbaikan", "Pemeliharaan", "Pengaduan Kerusakan"];

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

export default function LampiranPengajuanPage() {
  const [form, setForm] = useState({
    hal: "",
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
  const [zoomImage, setZoomImage] = useState<string | null>(null); // ⬅️ tambahan state

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((json: any) => {
        const name = json.name || json.user?.name || "";
        const npp = json.npp || json.user?.npp || "";
        setForm((f) => ({ ...f, pelapor: name, nppPelapor: npp }));
      })
      .catch(() => {});
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files).slice(0, 4);
    setFiles(selectedFiles);

    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(previews);
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  const formatDate = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getFullYear()}`;
  const todayStr = `Semarang, ${formatDate(new Date())}`;

  const selectedSatker = SATKERS.find((s) => s.id === form.satker);
  const getJabatanFromSatker = (s: string) => {
    const l = s.toLowerCase();
    if (l.includes("sub bag")) return "Ka.Bag";
    if (l.includes("sub bid")) return "Ka.Bid";
    if (l.includes("seksi")) return "Ka.Seksi";
    if (l.includes("kasatker")) return "Kasatker";
    return "Ka.Unit";
  };
  const jabatan = selectedSatker
    ? getJabatanFromSatker(selectedSatker.label)
    : "Ka.Unit";

  return (
    <div className="p-6 relative">
      {/* 🔍 Modal preview foto */}
      {zoomImage && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative">
            <img
              src={zoomImage}
              alt="Preview"
              className="max-h-[90vh] max-w-[90vw] rounded-lg shadow-lg"
            />
            <button
              onClick={() => setZoomImage(null)}
              className="absolute top-2 right-2 bg-white/80 hover:bg-white p-1 rounded-full"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      <style>{`
        @page { size: A4; margin: 20mm; }
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
      `}</style>

      {/* 🧩 Sisa kode kamu tetap sama */}
      <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b no-print">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white">
              <Droplet />
            </div>
            <div>
              <div className="font-semibold text-base">
                Lampiran Pengajuan Perbaikan
              </div>
              <div className="text-xs text-gray-500">
                Form PDAM — preview dan print satu halaman
              </div>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>

        <div id="print-area" className="p-6">
          {/* ...semua bagian form kamu tetap sama... */}

          {/* Upload Foto / Dokumen */}
          {!isPrintMode && (
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Upload size={16} /> Upload Foto/Dokumen (max 4 file)
                <input
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {previews.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-3">
                  {previews.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt={`preview-${i}`}
                      className="w-full h-24 object-cover rounded border cursor-pointer hover:opacity-80"
                      onClick={() => setZoomImage(src)} // ⬅️ klik untuk buka modal
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Foto preview saat print */}
          {isPrintMode && previews.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`foto-${i}`}
                  className="w-full h-28 object-cover border border-gray-400"
                />
              ))}
            </div>
          )}

          {/* sisanya tetap */}
        </div>
      </div>
    </div>
  );
}
