"use client";

import React, { useEffect, useRef, useState } from "react";
import { Droplet, Printer, UploadCloud } from "lucide-react";

/**
 * Lampiran Pengajuan (input + preview satu layout, print A4)
 *
 * - token diambil dari localStorage key "token"
 * - me endpoint: https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/me
 * - upload foto:   https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/foto
 * - upload document: https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/document
 *
 * Catatan: sesuaikan parsing response me / upload bila format berbeda.
 */

type SatkerDef = { id: string; label: string; sekis: string[] };

const SATKERS: SatkerDef[] = [
  { id: "satker-1", label: "Satker A", sekis: ["Seksi A1", "Sub Bid A2", "Sub Bag A3"] },
  { id: "satker-2", label: "Satker B", sekis: ["Seksi B1", "Seksi B2"] },
  { id: "satker-3", label: "Satker C", sekis: ["Seksi C1", "Seksi C2"] },
];

const getToken = () => (typeof window !== "undefined" ? localStorage.getItem("token") : null);

export default function LampiranPengajuanPage() {
  const [form, setForm] = useState({
    satker: "",
    seksi: "",
    kodeBarang: "",
    keterangan: "",
    pelapor: "",
    nppPelapor: "",
    mengetahui: "",
    nppMengetahui: "",
  });

  const [meLoaded, setMeLoaded] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);

  // files
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [photoProgress, setPhotoProgress] = useState(0);
  const [docProgress, setDocProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const printRef = useRef<HTMLDivElement | null>(null);

  // fetch me on mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setMeError("Token tidak ditemukan. Silakan login.");
      setMeLoaded(true);
      return;
    }

    fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Status ${res.status}: ${txt}`);
        }
        return res.json();
      })
      .then((json: any) => {
        // try multiple keys for name and npp
        const name =
          json.name || json.nama || json.full_name || json.fullName || json.user?.name || json.data?.name || "";
        const npp = json.npp || json.nip || json.user?.npp || json.data?.npp || "";
        setForm((p) => ({ ...p, pelapor: name, nppPelapor: npp }));
        setMeLoaded(true);
      })
      .catch((err) => {
        console.error("fetch /me error:", err);
        setMeError(String(err.message || err));
        setMeLoaded(true);
      });
  }, []);

  // when satker changes, auto set mengetahui to label
  const handleSatkerChange = (satkerId: string) => {
    const s = SATKERS.find((x) => x.id === satkerId);
    setForm((p) => ({ ...p, satker: satkerId, seksi: "", mengetahui: s?.label || "" }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // upload helper using XHR so we can track progress
  function uploadFile(file: File, url: string, onProgress: (p: number) => void) {
    return new Promise<string>((resolve, reject) => {
      const token = getToken();
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      // API might expect field name "file" or "foto" etc. Using "file" — adjust if needed
      fd.append("file", file);

      xhr.open("POST", url, true);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const percent = Math.round((ev.loaded / ev.total) * 100);
          onProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            // try common fields
            const uploadedUrl = res.url || res.data?.url || res.path || res.fileUrl || res.result || null;
            if (uploadedUrl) resolve(uploadedUrl);
            else resolve(JSON.stringify(res)); // fallback
          } catch (err) {
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload gagal: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error saat upload"));
      xhr.send(fd);
    });
  }

  const handleUploadPhoto = async () => {
    setUploadError(null);
    setPhotoProgress(0);
    if (!photoFile) return setUploadError("Pilih file foto terlebih dahulu.");
    try {
      const url = await uploadFile(photoFile, "https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/foto", (p) =>
        setPhotoProgress(p)
      );
      setPhotoUrl(url);
    } catch (err: any) {
      setUploadError(String(err.message || err));
    }
  };

  const handleUploadDoc = async () => {
    setUploadError(null);
    setDocProgress(0);
    if (!docFile) return setUploadError("Pilih file dokumen terlebih dahulu.");
    try {
      const url = await uploadFile(docFile, "https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/document", (p) =>
        setDocProgress(p)
      );
      setDocUrl(url);
    } catch (err: any) {
      setUploadError(String(err.message || err));
    }
  };

  // print - uses window.print; CSS @media print will format to A4 paper
  const handlePrint = () => {
    window.print();
  };

  // format date
  const formatDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  };

  const todayStr = `Semarang, ${formatDate(new Date())}`;

  return (
    <div className="p-6">
      {/* Print-specific styles included inline so easier to copy-paste */}
      <style>
        
        {`
        /* Desktop preview: keep inputs visible. */
        @page { size: A4; margin: 20mm; }
        @media print {
          /* hide controls when printing */
          .no-print { display: none !important; }
          /* ensure printed page uses the same layout and fonts */
          body { -webkit-print-color-adjust: exact; }
        }

        /* Make inputs look like printed fields (borderless) in preview area while staying editable */
        .form-print-area input[type="text"],
        .form-print-area textarea,
        .form-print-area select {
          border: none;
          background: transparent;
          font: inherit;
          padding: 0;
          margin: 0;
        }
        /* but when not printing, show subtle borders for editing */
        .edit .form-print-area input[type="text"],
        .edit .form-print-area textarea,
        .edit .form-print-area select {
          border-bottom: 1px dashed rgba(0,0,0,0.15);
        }

        /* printed boxes for table */
        .field-box { border: 1px solid #000; padding: 6px; min-height: 16px; }
        .big-box { border: 1px solid #000; min-height: 140px; padding: 8px; }
        `}

        @media print {
  /* Hanya tampilkan area print, sembunyikan sidebar & elemen lain */
  body * {
    visibility: hidden;
  }

  #print-area, #print-area * {
    visibility: visible;
  }

  #print-area {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  aside, .sidebar {
    display: none !important;
  }

  /* Pastikan ukuran tetap A4 */
  @page {
    size: A4;
    margin: 15mm;
  }
}
      </style>

      <div className="max-w-[900px] mx-auto bg-white border border-slate-100 shadow rounded-lg">
        {/* Controls */}
        <div className="p-4 flex items-center justify-between gap-4 no-print border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white">
              <Droplet />
            </div>
            <div>
              <div className="font-semibold">Lampiran Pengajuan Perbaikan</div>
              <div className="text-xs text-slate-500">Form PDAM (A4) — input & preview berada di tata letak yang sama</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 bg-gray-100 border rounded hover:bg-gray-200"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            >
              Kembali ke Form
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
              title="Cetak (A4)"
            >
              <Printer size={16} /> Cetak
            </button>
          </div>
        </div>

        {/* MAIN CONTENT: Form that visually matches print layout */}
        <div id="print-area" className="p-6 edit">
  <div ref={printRef} className="form-print-area">

            {/* Header row */}
            <div className="flex justify-between items-start">
              <div style={{ width: "58%" }}>
                <div className="text-sm font-bold">PERUMDA AIR MINUM TIRTA MOEDAL</div>
                <div className="text-sm font-bold">KOTA SEMARANG</div>
              </div>
              <div style={{ width: "40%", textAlign: "right" }}>
                {/* date */}
                <div className="text-sm">{todayStr}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-6">
                <div style={{ width: "55%" }}>
                  <div className="text-sm font-semibold">Hal: <span className="font-normal">Pemeliharaan/Perbaikan Pengaduan Kerusakan</span></div>
                </div>
                <div style={{ width: "45%" }}>
                  <div className="text-sm">
                    Kepada Yth.<br />
                    Ka.Sub Bid PTI<br />
                    PERUMDA AIR MINUM Tirta Moedal<br />
                    di <strong>SEMARANG</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-sm">
              Bersama surat ini kami beritahukan bahwa terdapat kerusakan atau diperlukan perbaikan di:
            </div>

            {/* Table fields: Satker | Seksi | Kode Barang */}
            <div className="mt-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 text-sm font-semibold">Satker :</div>
                <div className="col-span-5 field-box">
                  {/* select but styled like plain text */}
                  <select
                    name="satker"
                    value={form.satker}
                    onChange={(e) => handleSatkerChange(e.target.value)}
                    className="w-full"
                  >
                    <option value="">-- Pilih Satker --</option>
                    {SATKERS.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 text-sm font-semibold">Seksi / Sub Bid / Sub Bag :</div>
                <div className="col-span-2 field-box">
                  <select
                    name="seksi"
                    value={form.seksi}
                    onChange={handleChange}
                    disabled={!form.satker}
                    className="w-full"
                  >
                    <option value="">{!form.satker ? "Pilih satker dulu" : "-- Pilih Seksi --"}</option>
                    {form.satker &&
                      SATKERS.find((x) => x.id === form.satker)?.sekis.map((sec) => (
                        <option key={sec} value={sec}>
                          {sec}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3 items-center mt-3">
                <div className="col-span-2 text-sm font-semibold">Kode Barang :</div>
                <div className="col-span-10 field-box">
                  <input
                    type="text"
                    name="kodeBarang"
                    value={form.kodeBarang}
                    onChange={handleChange}
                    className="w-full"
                    placeholder="(wajib diisi)"
                  />
                </div>
              </div>
            </div>

            {/* big description box */}
            <div className="mt-4 big-box">
              <textarea
                name="keterangan"
                value={form.keterangan}
                onChange={handleChange}
                rows={8}
                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                className="w-full resize-none"
              />
            </div>

            {/* remark line */}
            <div className="mt-2 text-xs">Demikian laporan kami untuk menjadi periksa dan mohon untuk perbaikan.</div>

            {/* signature section */}
            <div className="grid grid-cols-12 gap-4 mt-8 items-start">
              <div className="col-span-6">
                <div className="text-sm font-semibold">Mengetahui</div>
                <div className="text-xs">Ka.Cab / Ka.Bag / Ka.Bid / Kasatker</div>

                <div className="mt-14 text-center">
                  <div style={{ borderTop: "1px dotted #000", width: "80%", margin: "0 auto" }}>
                    {form.mengetahui || "(..................................)"}
                  </div>
                  <div className="text-xs mt-1">NPP: {form.nppMengetahui || "__________"}</div>
                </div>
              </div>

              <div className="col-span-6">
                <div className="text-sm font-semibold">Pelapor</div>

                <div className="mt-14 text-center">
                  <div style={{ borderTop: "1px dotted #000", width: "80%", margin: "0 auto" }}>
                    {form.pelapor || "(..................................)"}
                  </div>
                  <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
                </div>
              </div>
            </div>

            {/* attachments preview */}
            <div className="mt-6 text-sm">
              {photoUrl && (
                <div className="mb-2">
                  <div className="text-xs font-semibold">Foto terlampir:</div>
                  <img src={photoUrl} alt="foto" className="max-w-full border mt-1" />
                </div>
              )}
              {docUrl && (
                <div>
                  <div className="text-xs font-semibold">Dokumen terlampir:</div>
                  <a href={docUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                    {docUrl}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* EDIT / UPLOAD PANEL (no-print) */}
          <div className="mt-6 no-print">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium">Pelapor (otomatis)</label>
                <input name="pelapor" value={form.pelapor} onChange={handleChange} className="mt-1 p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">NPP Pelapor</label>
                <input name="nppPelapor" value={form.nppPelapor} onChange={handleChange} className="mt-1 p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">Mengetahui (otomatis)</label>
                <input name="mengetahui" value={form.mengetahui} onChange={handleChange} className="mt-1 p-2 border rounded w-full" />
              </div>
              <div>
                <label className="block text-sm font-medium">NPP Mengetahui</label>
                <input name="nppMengetahui" value={form.nppMengetahui} onChange={handleChange} className="mt-1 p-2 border rounded w-full" />
              </div>

              <div>
                <label className="block text-sm font-medium">Lampirkan Foto</label>
                <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className="mt-1" />
                {photoFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-sm">{photoFile.name}</div>
                    <button onClick={handleUploadPhoto} className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-2">
                      <UploadCloud size={14} /> Upload
                    </button>
                    <div className="w-28 bg-slate-200 rounded h-2 overflow-hidden">
                      <div className="h-2 bg-blue-600" style={{ width: `${photoProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium">Lampirkan Dokumen (pdf/doc)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setDocFile(e.target.files?.[0] || null)} className="mt-1" />
                {docFile && (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="text-sm">{docFile.name}</div>
                    <button onClick={handleUploadDoc} className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-2">
                      <UploadCloud size={14} /> Upload
                    </button>
                    <div className="w-28 bg-slate-200 rounded h-2 overflow-hidden">
                      <div className="h-2 bg-blue-600" style={{ width: `${docProgress}%` }} />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {uploadError && <div className="text-sm text-red-600 mt-3">{uploadError}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
