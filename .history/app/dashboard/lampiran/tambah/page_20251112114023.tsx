"use client";

import React, { useEffect, useState, useRef } from "react";
import { Droplet, Printer, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import Draggable from "react-draggable";
import Select from "react-select"; 

type SatkerDef = { id: string; label: string; jabatan: string };

export default function LampiranPengajuanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);
  const [satkers, setSatkers] = useState<SatkerDef[]>([]);

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

  // 🔹 Tanda tangan pelapor
  const [ttdPelaporFile, setTtdPelaporFile] = useState<File | null>(null);
  const [ttdPelaporPreview, setTtdPelaporPreview] = useState<string | null>(null);
  const [ttdScale, setTtdScale] = useState(1);
  const nodeRef = useRef(null);

  const nomorSurat = localStorage.getItem("nomor_surat_terakhir");

  const [halOptions, setHalOptions] = useState<string[]>([]);

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
        const names = json.data.map((item: any) => item.nama_jenis);
        setHalOptions(names);
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

  // 🔹 Handler upload lampiran
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files).slice(0, 4);
    setFiles(selectedFiles);
    const previews = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviews(previews);
  };

  // 🔹 Handler upload tanda tangan Pelapor + hapus background
  const handleTtdPelaporChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    setTtdPelaporFile(file);
    const previewUrl = URL.createObjectURL(file);
    const transparentUrl = await makeImageTransparent(previewUrl);
    setTtdPelaporPreview(transparentUrl);
  };

  // 🔹 Fungsi hapus background putih & hitam → transparan
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

  // 🔹 Fungsi cetak
  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  const handleAjukan = () => {
  // Validasi field wajib
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
    alert(
      `Data berikut belum lengkap:\n- ${kosong
        .map((f) => f.label)
        .join("\n- ")}`
    );
    return;
  }

  if (!ttdPelaporPreview) {
    alert("Harap upload tanda tangan pelapor terlebih dahulu.");
    return;
  }

  if (files.length === 0) {
    const konfirmasi = confirm(
      "Belum ada foto/lampiran yang diunggah. Yakin ingin tetap mengajukan?"
    );
    if (!konfirmasi) return;
  }

  alert("✅ Pengajuan berhasil dikirim!");
};


  const formatDate = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getFullYear()}`;
  const todayStr = `Semarang, ${formatDate(new Date())}`;
  const selectedSatker = satkers.find((s) => s.id === form.satker);
  const jabatan = selectedSatker?.jabatan || "Ka.Unit";

  return (
    <div className="p-6">
      <style>{`
        @page { size: A4; margin: 20mm; }
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          #print-area input, #print-area select, #print-area textarea {
            border: none !important; box-shadow: none !important; background: transparent !important; padding: 0 !important;
          }
          #print-area .ttd-container { border: none !important; box-shadow: none !important; background: transparent !important; }
        }
        .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
      `}</style>

      <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b no-print">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white"><Droplet /></div>
            <div>
              <div className="font-semibold text-base">Lampiran Pengajuan Perbaikan</div>
              <div className="text-xs text-gray-500">Form PDAM — preview dan print satu halaman</div>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
          >
            <Printer size={16} /> Cetak
          </button>
        </div>

        {/* Isi Form */}
        <div id="print-area" className="p-6">
          {/* Header Form */}
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-sm">PERUMDA AIR MINUM TIRTA MOEDAL</div>
              <div className="font-bold text-sm">KOTA SEMARANG</div>
            </div>
            <div className="text-right text-sm">
                <div>No. Surat: <strong>{nomorSurat || "Belum ada"}</strong></div>
                <div>{todayStr}</div>
          </div>
          </div>

          {/* HAL & Kepada */}
          <div className="mt-4 flex gap-6">
            <div className="w-1/2 text-sm font-semibold">
              Hal:
              {isPrintMode ? (
                <span className="ml-2 font-normal">{form.hal}</span>
              ) : (
                <select
                  name="hal"
                  value={form.hal}
                  onChange={handleChange}
                  className="ml-2 w-3/4 p-1 border border-gray-300 rounded bg-white text-sm"
                >
                  <option value="">-- Pilih Hal --</option>
                  {halOptions.length === 0 ? (
                    <option disabled>Memuat data...</option>
                  ) : (
                    halOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>

            <div className="w-1/2 text-sm">
              Kepada Yth. <br />
              {isPrintMode ? (
                <>{form.kepada}</>
              ) : (
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
              )}
              <br />
              PERUMDA AIR MINUM Tirta Moedal <br /> di <strong>SEMARANG</strong>
            </div>
          </div>

          {/* Satker */}
          <div className="mt-3 text-sm grid grid-cols-12 gap-3 items-center">
            <div className="col-span-3 font-semibold">Satker :</div>
            <div className="col-span-9">
              {isPrintMode ? (
                <span>{selectedSatker?.label || ""}</span>
              ) : (
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

              )}
            </div>
          </div>

          {/* Kode Barang */}
          <div className="grid grid-cols-12 gap-3 items-center mt-3 text-sm">
            <div className="col-span-3 font-semibold">Kode Barang :</div>
            <div className="col-span-9">
              {isPrintMode ? (
                <span>{form.kodeBarang}</span>
              ) : (
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

          {/* Keterangan */}
          <div className="mt-4 big-box text-sm">
            {isPrintMode ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{form.keterangan}</div>
            ) : (
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

          {/* Upload Foto */}
          {!isPrintMode && (
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <Upload size={16} /> Upload Foto/Dokumen (max 4 file)
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
                    <img key={i} src={src} alt={`preview-${i}`} className="w-full h-24 object-cover rounded border" />
                  ))}
                </div>
              )}
            </div>
          )}

          {isPrintMode && previews.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-3">
              {previews.map((src, i) => (
                <img key={i} src={src} alt={`foto-${i}`} className="w-full h-28 object-cover border border-gray-400" />
              ))}
            </div>
          )}

          {/* Kalimat penutup */}
          <div className="mt-3 text-xs text-left">
            Demikian laporan kami untuk menjadi periksa dan mohon untuk perhatian.
          </div>

          {/* Tanda tangan */}
          <div className="mt-20 flex justify-center text-center gap-60">
            {/* Mengetahui */}
            <div>
              <div className="text-sm font-semibold">Mengetahui</div>
              <div className="text-xs">{jabatan}</div>
              <div className="mt-16 text-sm">(...........................)</div>
              <div className="text-xs mt-1">NPP: {form.nppMengetahui || "__________"}</div>
            </div>

            {/* Pelapor */}
            <div>
              <div className="text-sm font-semibold">Pelapor</div>

              {/* Upload & edit tanda tangan */}
              {!ttdPelaporPreview && !isPrintMode && (
                <div className="mt-3 text-center">
                  <label className="flex flex-col items-center gap-2 cursor-pointer mb-2">
                    <Upload size={16} /> Upload Tanda Tangan Pelapor
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
                <div className="ttd-container border border-gray-300 rounded inline-block relative w-[180px] h-[100px] bg-gray-50 shadow-sm">
                  <Draggable bounds="parent" nodeRef={nodeRef}>
                    <img
                      ref={nodeRef}
                      src={ttdPelaporPreview}
                      alt="Tanda tangan pelapor"
                      style={{
                        width: 160,
                        height: 80,
                        transform: `scale(${ttdScale})`,
                        transformOrigin: "center center",
                      }}
                      className="cursor-move absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain"
                    />
                  </Draggable>
                </div>
              )}

              {ttdPelaporPreview && !isPrintMode && (
                <>
                  <div className="mt-2 flex justify-center items-center gap-2 text-xs select-none">
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
                  <div className="text-xs mt-1 text-gray-600 select-none">
                    Ukuran preview: {Math.round(160 * ttdScale)}px × {Math.round(80 * ttdScale)}px
                  </div>
                </>
              )}

              {isPrintMode && ttdPelaporPreview && (
                <div className="mt-1 flex justify-center">
                  <img
                    src={ttdPelaporPreview}
                    alt="Tanda tangan pelapor"
                    style={{ transform: `scale(${ttdScale})`, transformOrigin: "center center" }}
                    className="w-28 h-auto object-contain"
                  />
                </div>  
              )}
              <div className="mt-0 text-sm">{form.pelapor || "(...........................)"}</div>
              <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
            </div>
          </div>
                  {/* Tombol Ajukan di pojok kanan bawah */}
          {!isPrintMode && (
            <button
              onClick={handleAjukan}
              className="fixed bottom-6 right-6 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 transition-all duration-200"
            >
              <Droplet size={18} />
              Ajukan
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

