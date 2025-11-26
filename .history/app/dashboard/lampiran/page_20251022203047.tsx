"use client";

import React, { useEffect, useState, useRef } from "react";
import { Droplet, Printer, UploadCloud } from "lucide-react";

/**
 * Halaman Lampiran Pengajuan (form + preview di satu halaman)
 *
 * - Ambil user dari endpoint /api-gw-balanced/api/auth/me menggunakan token di localStorage
 * - Upload file ke endpoint foto / document (menggunakan XMLHttpRequest untuk progress)
 * - Satker + seksi hardcoded (bisa diganti jadi fetch dari API kalau ada)
 *
 * NOTE:
 * - Pastikan token tersimpan di localStorage dengan key "token"
 * - Pastikan endpoint upload mengizinkan CORS dari origin frontend
 */

type MeResponse = {
  name?: string;
  npp?: string;
  // kemungkinan struktur lain, kita coba akses name/npp; jika beda, ubah sesuai response sebenarnya
  full_name?: string;
};

export default function LampiranPengajuanPage() {
  // form data
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
  const [loadingMeError, setLoadingMeError] = useState<string | null>(null);

  // files
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [photoUploadProgress, setPhotoUploadProgress] = useState(0);
  const [docUploadProgress, setDocUploadProgress] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // preview toggle not needed because form + preview are same page (preview always shown)
  const printRef = useRef<HTMLDivElement | null>(null);

  // satker data (hardcoded). Struktur: satker -> array of sekis (strings)
  const SATKERS: { id: string; label: string; sekis: string[] }[] = [
    {
      id: "satker-1",
      label: "Satker A",
      sekis: ["Seksi A1", "Seksi A2", "Sub Bid A3"],
    },
    {
      id: "satker-2",
      label: "Satker B",
      sekis: ["Seksi B1", "Seksi B2"],
    },
    {
      id: "satker-pti",
      label: "PTI",
      sekis: ["Sub Bid PTI 1", "Sub Bid PTI 2"],
    },
    // tambahkan sesuai kebutuhan / atau ganti jadi fetch dari API
  ];

  // util: ambil token dari localStorage
  const getToken = () => typeof window !== "undefined" ? localStorage.getItem("token") : null;

  // ambil data user dari API me
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoadingMeError("Token tidak ditemukan. Silakan login terlebih dahulu.");
      setMeLoaded(true);
      return;
    }

    // panggil endpoint me
    fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`Gagal ambil user: ${res.status} ${txt}`);
        }
        return res.json();
      })
      .then((json: any) => {
        // menyesuaikan properti: coba cari name/nama/full_name dan npp
        const name = json.name || json.nama || json.full_name || json.fullName || json.user?.name || "";
        const npp = json.npp || json.nip || json.user?.npp || "";

        setForm((prev) => ({
          ...prev,
          pelapor: name || prev.pelapor,
          nppPelapor: npp || prev.nppPelapor,
        }));

        setMeLoaded(true);
        setLoadingMeError(null);
      })
      .catch((err) => {
        console.error(err);
        setLoadingMeError(String(err.message || err));
        setMeLoaded(true);
      });
  }, []);

  // ketika memilih satker, set seksi ke kosong & set mengetahui ke satker label
  const handleSatkerChange = (satkerId: string) => {
    const s = SATKERS.find((x) => x.id === satkerId);
    setForm((prev) => ({
      ...prev,
      satker: satkerId,
      seksi: "", // reset
      mengetahui: s ? s.label : "",
      nppMengetahui: "", // optionally we could set NPP mengetahui if known
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // upload helper using XMLHttpRequest to get real progress
  const uploadFile = (file: File, url: string, onProgress: (p: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const token = getToken();
      const xhr = new XMLHttpRequest();
      const fd = new FormData();
      // field name biasanya "file" atau sesuai API; asumsi "file"
      fd.append("file", file);

      xhr.open("POST", url, true);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      // jika server butuh header lain, tambahkan di sini

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
            // response may contain url key - adjust if your API returns another shape
            const uploadedUrl = res.url || res.data?.url || res.path || res.fileUrl || res.result || null;
            if (!uploadedUrl) {
              // jika server mengembalikan objek lain, kita fallback ke entire json stringify
              resolve(JSON.stringify(res));
            } else {
              resolve(uploadedUrl);
            }
          } catch (err) {
            // jika bukan json, resolve raw text
            resolve(xhr.responseText);
          }
        } else {
          reject(new Error(`Upload gagal: ${xhr.status} ${xhr.statusText} - ${xhr.responseText}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error("Network error saat upload file"));
      };

      xhr.send(fd);
    });
  };

  const handleUploadPhoto = async () => {
    setUploadError(null);
    setPhotoUploadProgress(0);
    if (!photoFile) return setUploadError("Pilih file foto terlebih dahulu");

    try {
      const uploaded = await uploadFile(photoFile, "https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/foto", (p) =>
        setPhotoUploadProgress(p)
      );
      setPhotoUrl(uploaded);
    } catch (err: any) {
      console.error(err);
      setUploadError(String(err.message || err));
    }
  };

  const handleUploadDoc = async () => {
    setUploadError(null);
    setDocUploadProgress(0);
    if (!docFile) return setUploadError("Pilih file dokumen terlebih dahulu");

    try {
      const uploaded = await uploadFile(docFile, "https://gateway.pdamkotasmg.co.id/api-gw/file-handler/api/upload/document", (p) =>
        setDocUploadProgress(p)
      );
      setDocUrl(uploaded);
    } catch (err: any) {
      console.error(err);
      setUploadError(String(err.message || err));
    }
  };

  // print the preview area
  const handlePrint = () => {
    if (!printRef.current) return;
    const markup = printRef.current.innerHTML;
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return alert("Popup diblokir. Izinkan popup untuk mencetak.");
    w.document.write(`
      <html>
        <head>
          <title>Lampiran Pengajuan - Print</title>
          <style>
            body { font-family: Arial, Helvetica, sans-serif; padding: 24px; color: #000; }
            h2 { margin: 0; }
            .header { text-align: center; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; }
            td, th { border: 1px solid #000; padding: 6px; }
            .no-border td { border: none; }
            .signature { margin-top: 40px; display:flex; justify-content:space-between;}
          </style>
        </head>
        <body>
          ${markup}
        </body>
      </html>
    `);
    w.document.close();
    w.focus();
    // wait a bit for render then open print dialog
    setTimeout(() => {
      w.print();
    }, 500);
  };

  // helper: format tanggal
  const formatDate = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // derived: today string
  const todayStr = `Semarang, ${formatDate(new Date())}`;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="bg-white rounded-2xl shadow p-6 border border-blue-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-3 rounded-lg">
            <Droplet className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-blue-800">Lampiran Pengajuan Perbaikan</h1>
            <p className="text-sm text-slate-500">Format resmi PDAM — isi data di kiri, preview di kanan</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: FORM */}
          <div>
            {/* show me loading / error */}
            {!meLoaded ? (
              <div className="text-sm text-slate-500 mb-4">Mengambil data user...</div>
            ) : loadingMeError ? (
              <div className="text-sm text-red-600 mb-4">Gagal ambil data user: {loadingMeError}</div>
            ) : null}

            <label className="block text-sm font-medium text-slate-700">Satker</label>
            <select
              className="w-full mt-1 mb-3 p-3 border rounded"
              value={form.satker}
              onChange={(e) => handleSatkerChange(e.target.value)}
            >
              <option value="">-- Pilih Satker --</option>
              {SATKERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>

            <label className="block text-sm font-medium text-slate-700">Seksi / Sub Bid / Sub Bag</label>
            <select
              className="w-full mt-1 mb-3 p-3 border rounded"
              name="seksi"
              value={form.seksi}
              onChange={handleChange}
              disabled={!form.satker}
            >
              <option value="">{form.satker ? "-- Pilih Seksi --" : "Pilih satker dulu"}</option>
              {form.satker &&
                SATKERS.find((x) => x.id === form.satker)?.sekis.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
            </select>

            <label className="block text-sm font-medium text-slate-700">Kode Barang (wajib diisi)</label>
            <input
              className="w-full mt-1 mb-3 p-3 border rounded"
              name="kodeBarang"
              value={form.kodeBarang}
              onChange={handleChange}
              placeholder="Contoh: KD-001"
            />

            <label className="block text-sm font-medium text-slate-700">Keterangan Kerusakan / Perbaikan</label>
            <textarea
              name="keterangan"
              value={form.keterangan}
              onChange={handleChange}
              rows={5}
              className="w-full mt-1 mb-3 p-3 border rounded"
              placeholder="Jelaskan kerusakan..."
            />

            <label className="block text-sm font-medium text-slate-700">Pelapor</label>
            <input
              className="w-full mt-1 mb-2 p-3 border rounded bg-slate-50"
              name="pelapor"
              value={form.pelapor}
              onChange={handleChange}
              placeholder="Nama pelapor"
            />
            <label className="text-xs text-slate-500 mb-2">NPP Pelapor</label>
            <input
              className="w-full mb-3 p-3 border rounded bg-slate-50"
              name="nppPelapor"
              value={form.nppPelapor}
              onChange={handleChange}
              placeholder="NPP pelapor"
            />

            <label className="block text-sm font-medium text-slate-700">Mengetahui (otomatis mengikuti Satker)</label>
            <input
              className="w-full mt-1 mb-2 p-3 border rounded bg-slate-50"
              name="mengetahui"
              value={form.mengetahui}
              onChange={handleChange}
              placeholder="Mengetahui"
            />
            <label className="text-xs text-slate-500 mb-2">NPP Mengetahui</label>
            <input
              className="w-full mb-3 p-3 border rounded"
              name="nppMengetahui"
              value={form.nppMengetahui}
              onChange={handleChange}
              placeholder="NPP mengetahui (opsional)"
            />

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Lampiran Foto (jpg/png)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
              />
              {photoFile && (
                <div className="mt-2">
                  <div className="text-sm">File dipilih: {photoFile.name}</div>
                  <div className="w-full bg-slate-200 h-2 rounded mt-1">
                    <div className="bg-blue-600 h-2 rounded" style={{ width: `${photoUploadProgress}%` }} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleUploadPhoto}
                      className="px-3 py-2 bg-blue-600 text-white rounded"
                    >
                      Upload Foto
                    </button>
                    {photoUrl && (
                      <a className="px-3 py-2 bg-green-600 text-white rounded" href={photoUrl} target="_blank" rel="noreferrer">
                        Lihat Foto
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">Lampiran Dokumen (pdf/doc)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
              />
              {docFile && (
                <div className="mt-2">
                  <div className="text-sm">File dipilih: {docFile.name}</div>
                  <div className="w-full bg-slate-200 h-2 rounded mt-1">
                    <div className="bg-blue-600 h-2 rounded" style={{ width: `${docUploadProgress}%` }} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleUploadDoc}
                      className="px-3 py-2 bg-blue-600 text-white rounded"
                    >
                      Upload Dokumen
                    </button>
                    {docUrl && (
                      <a className="px-3 py-2 bg-green-600 text-white rounded" href={docUrl} target="_blank" rel="noreferrer">
                        Lihat Dokumen
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {uploadError && <div className="text-red-600 mt-3">{uploadError}</div>}
          </div>

          {/* RIGHT: PREVIEW */}
          <div>
            <div className="border border-gray-300 rounded p-4" ref={printRef}>
              <div className="text-center mb-3">
                <h2 className="font-bold">PERUMDA AIR MINUM TIRTA MOEDAL</h2>
                <div className="text-sm">KOTA SEMARANG</div>
              </div>

              <div className="text-right mb-3 text-sm text-slate-600">{todayStr}</div>

              <div className="mb-2">
                <b>Hal:</b> Pemeliharaan/Perbaikan Pengaduan Kerusakan
              </div>

              <div className="mb-3 text-sm">
                Kepada Yth. <br />
                Ka.Sub Bid PTI <br />
                PERUMDA AIR MINUM Tirta Moedal <br />
                di <b>SEMARANG</b>
              </div>

              <div className="mb-3">
                Bersama surat ini kami beritahukan bahwa terdapat kerusakan atau diperlukan perbaikan di:
              </div>

              <table className="w-full text-sm mb-3">
                <tbody>
                  <tr>
                    <td className="py-2 w-32 font-semibold">Satker</td>
                    <td>{SATKERS.find(s=>s.id===form.satker)?.label || "____________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Seksi / Sub Bid</td>
                    <td>{form.seksi || "____________________"}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Kode Barang</td>
                    <td>{form.kodeBarang || "____________________"}</td>
                  </tr>
                </tbody>
              </table>

              <div className="border border-gray-300 rounded p-3 min-h-[100px] mb-3">
                <div className="text-sm">{form.keterangan || "........................................................................................................"}</div>
                {photoUrl && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-500">Foto terlampir:</div>
                    <img src={photoUrl} alt="foto" className="max-w-full mt-2 border" />
                  </div>
                )}
                {docUrl && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-500">Dokumen terlampir: </div>
                    <a className="text-blue-600 underline" href={docUrl} target="_blank" rel="noreferrer">
                      {docUrl}
                    </a>
                  </div>
                )}
              </div>

              <div className="mb-3">Demikian laporan kami untuk menjadi periksa dan mohon untuk perbaikan.</div>

              <div className="grid grid-cols-2 gap-4 mt-8 text-center">
                <div>
                  <div className="font-semibold">Mengetahui</div>
                  <div className="mt-12">{form.mengetahui || "(..............................)"}</div>
                  <div className="text-sm mt-2">NPP: {form.nppMengetahui || "_____________"}</div>
                </div>
                <div>
                  <div className="font-semibold">Pelapor</div>
                  <div className="mt-12">{form.pelapor || "(..............................)"}</div>
                  <div className="text-sm mt-2">NPP: {form.nppPelapor || "_____________"}</div>
                </div>
              </div>
            </div>

            {/* action buttons under preview */}
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  // reset form? we'll just scroll to form
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                className="px-4 py-2 border rounded"
              >
                Edit
              </button>
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
              >
                <Printer size={16} /> Cetak
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
