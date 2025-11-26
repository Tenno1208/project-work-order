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

  const handleSatkerChange = (satkerId: string) => {
    const s = SATKERS.find((x) => x.id === satkerId);
    setForm((p) => ({ ...p, satker: satkerId, seksi: "", mengetahui: s?.label || "" }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // upload helper
  function uploadFile(file: File, url: string, onProgress: (p: number) => void) {
    return new Promise<string>((resolve, reject) => {
      const token = getToken();
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      fd.append("file", file);
      xhr.open("POST", url, true);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable) {
          onProgress(Math.round((ev.loaded / ev.total) * 100));
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            const uploadedUrl = res.url || res.data?.url || res.path || res.fileUrl || res.result || null;
            resolve(uploadedUrl || JSON.stringify(res));
          } catch {
            resolve(xhr.responseText);
          }
        } else reject(new Error(`Upload gagal: ${xhr.status}`));
      };
      xhr.onerror = () => reject(new Error("Network error saat upload"));
      xhr.send(fd);
    });
  }

  const handleUploadPhoto = async () => {
    setUploadError(null);
    if (!photoFile) return setUploadError("Pilih file foto terlebih dahulu.");
    try {
      const url = await uploadFile(
        photoFile,
        "https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/foto",
        setPhotoProgress
      );
      setPhotoUrl(url);
    } catch (err: any) {
      setUploadError(String(err.message || err));
    }
  };

  const handleUploadDoc = async () => {
    setUploadError(null);
    if (!docFile) return setUploadError("Pilih file dokumen terlebih dahulu.");
    try {
      const url = await uploadFile(
        docFile,
        "https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/document",
        setDocProgress
      );
      setDocUrl(url);
    } catch (err: any) {
      setUploadError(String(err.message || err));
    }
  };

  const handlePrint = () => window.print();

  const formatDate = (d: Date) => `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}-${d.getFullYear()}`;
  const todayStr = `Semarang, ${formatDate(new Date())}`;

  return (
    <div className="p-6">
      <style>{`
        @page { size: A4; margin: 20mm; }

        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          aside, .sidebar, .no-print {
            display: none !important;
            visibility: hidden !important;
          }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }

        .form-print-area input[type="text"],
        .form-print-area textarea,
        .form-print-area select {
          border: none;
          background: transparent;
          font: inherit;
          padding: 0;
          margin: 0;
        }

        .edit .form-print-area input[type="text"],
        .edit .form-print-area textarea,
        .edit .form-print-area select {
          border-bottom: 1px dashed rgba(0,0,0,0.15);
        }

        .field-box { border: 1px solid #000; padding: 6px; min-height: 16px; }
        .big-box { border: 1px solid #000; min-height: 140px; padding: 8px; }
      `}</style>

      <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
        <div className="p-4 flex items-center justify-between gap-4 no-print border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white"><Droplet /></div>
            <div>
              <div className="font-semibold">Lampiran Pengajuan Perbaikan</div>
              <div className="text-xs text-gray-600">Form PDAM (A4) — input & preview berada di tata letak yang sama</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 bg-gray-100 border rounded hover:bg-gray-200" onClick={() => window.scrollTo({ top: 0 })}>
              Kembali ke Form
            </button>
            <button onClick={handlePrint} className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2" title="Cetak (A4)">
              <Printer size={16} /> Cetak
            </button>
          </div>
        </div>

        {/* Form dan Preview */}
        <div id="print-area" className="p-6 edit">
          <div ref={printRef} className="form-print-area">
            <div className="flex justify-between items-start">
              <div style={{ width: "58%" }}>
                <div className="text-sm font-bold">PERUMDA AIR MINUM TIRTA MOEDAL</div>
                <div className="text-sm font-bold">KOTA SEMARANG</div>
              </div>
              <div style={{ width: "40%", textAlign: "right" }}>
                <div className="text-sm">{todayStr}</div>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex gap-6">
                <div style={{ width: "55%" }}>
                  <div className="text-sm font-semibold">
                    Hal: <span className="font-normal">Pemeliharaan/Perbaikan Pengaduan Kerusakan</span>
                  </div>
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

            <div className="mt-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 text-sm font-semibold">Satker :</div>
                <div className="col-span-5 field-box">
                  <select name="satker" value={form.satker} onChange={(e) => handleSatkerChange(e.target.value)} className="w-full">
                    <option value="">-- Pilih Satker --</option>
                    {SATKERS.map((s) => (
                      <option key={s.id} value={s.id}>{s.label}</option>
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
                        <option key={sec} value={sec}>{sec}</option>
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
                    placeholder="(wajib diisi)"
                    className="w-full"
                  />
                </div>
              </div>
            </div>

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

            <div className="mt-2 text-xs">
              Demikian laporan kami untuk menjadi periksa dan mohon untuk perbaikan.
            </div>

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
                  <a href={docUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">{docUrl}</a>
                </div>
              )}
            </div>
          </div>

          {/* panel upload */}
          <div className="mt-6 no-print">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* input upload foto & doc sama seperti versi kamu */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
