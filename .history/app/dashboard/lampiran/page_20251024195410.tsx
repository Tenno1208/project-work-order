"use client";

import React, { useEffect, useRef, useState } from "react";
import { Droplet, Printer } from "lucide-react";

type SatkerDef = { id: string; label: string };

const SATKERS: SatkerDef[] = [
  { id: "satker-1", label: "Seksi Produksi" },
  { id: "satker-2", label: "Sub Bid Keuangan" },
  { id: "satker-3", label: "Sub Bag Umum" },
  { id: "satker-4", label: "Kasatker Wilayah Barat" },
];

const HAL_OPTIONS = ["Perbaikan", "Pemeliharaan", "Pengaduan Kerusakan"];

const getToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

export default function LampiranPengajuanPage() {
  const [form, setForm] = useState({
    hal: "",
    satker: "",
    kodeBarang: "",
    keterangan: "",
    pelapor: "",
    nppPelapor: "",
    mengetahui: "",
    nppMengetahui: "",
  });

  const [meLoaded, setMeLoaded] = useState(false);
  const [meError, setMeError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement | null>(null);

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
        if (!res.ok) throw new Error(`Status ${res.status}: ${await res.text()}`);
        return res.json();
      })
      .then((json: any) => {
        const name =
          json.name ||
          json.nama ||
          json.full_name ||
          json.user?.name ||
          json.data?.name ||
          "";
        const npp =
          json.npp || json.nip || json.user?.npp || json.data?.npp || "";
        setForm((p) => ({ ...p, pelapor: name, nppPelapor: npp }));
        setMeLoaded(true);
      })
      .catch((err) => {
        console.error("fetch /me error:", err);
        setMeError(String(err.message || err));
        setMeLoaded(true);
      });
  }, []);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  // jabatan otomatis dari label satker
  const getJabatanFromSatker = (satkerLabel: string) => {
    const label = satkerLabel.toLowerCase();
    if (label.includes("sub bag")) return "Ka.Bag";
    if (label.includes("sub bid")) return "Ka.Bid";
    if (label.includes("seksi")) return "Ka.Seksi";
    if (label.includes("kasatker")) return "Kasatker";
    return "Ka.Unit";
  };

  const handlePrint = () => window.print();

  const formatDate = (d: Date) =>
    `${d.getDate().toString().padStart(2, "0")}-${(d.getMonth() + 1)
      .toString()
      .padStart(2, "0")}-${d.getFullYear()}`;
  const todayStr = `Semarang, ${formatDate(new Date())}`;

  const selectedSatker = SATKERS.find((s) => s.id === form.satker);
  const jabatan = selectedSatker
    ? getJabatanFromSatker(selectedSatker.label)
    : "Ka.Cab / Ka.Bag / Ka.Bid / Kasatker";

  return (
    <div className="p-6">
      <style>{`
        @page { size: A4; margin: 20mm; }
        @media print {
          body * { visibility: hidden; }
          #print-area, #print-area * { visibility: visible; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          aside, .sidebar, .no-print { display: none !important; visibility: hidden !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .form-print-area input, .form-print-area textarea, .form-print-area select {
          border: none; background: transparent; font: inherit; padding: 0; margin: 0;
        }
        .edit .form-print-area input, .edit .form-print-area textarea, .edit .form-print-area select {
          border-bottom: 1px dashed rgba(0,0,0,0.15);
        }
        .field-box { border: 1px solid #000; padding: 6px; min-height: 16px; }
        .big-box { border: 1px solid #000; min-height: 140px; padding: 8px; }
        .form-print-area { color: #1e293b; }
        .form-print-area input, .form-print-area select, .form-print-area textarea { color: #1e293b !important; }
      `}</style>

      <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
        {/* Header */}
        <div className="p-4 flex items-center justify-between gap-4 no-print border-b">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded text-white">
              <Droplet />
            </div>
            <div>
              <div className="font-semibold">Lampiran Pengajuan Perbaikan</div>
              <div className="text-xs text-gray-600">
                Form PDAM (A4) — input & preview berada di tata letak yang sama
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 bg-gray-100 border rounded hover:bg-gray-200"
              onClick={() => window.scrollTo({ top: 0 })}
            >
              Kembali ke Form
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
            >
              <Printer size={16} /> Cetak
            </button>
          </div>
        </div>

        {/* Form */}
        <div id="print-area" className="p-6 edit">
          <div ref={printRef} className="form-print-area">
            <div className="flex justify-between items-start">
              <div style={{ width: "58%" }}>
                <div className="text-sm font-bold">
                  PERUMDA AIR MINUM TIRTA MOEDAL
                </div>
                <div className="text-sm font-bold">KOTA SEMARANG</div>
              </div>
              <div style={{ width: "40%", textAlign: "right" }}>
                <div className="text-sm">{todayStr}</div>
              </div>
            </div>

            {/* Dropdown HAL */}
            <div className="mt-4 flex gap-6">
              <div style={{ width: "55%" }}>
                <div className="text-sm font-semibold">
                  Hal:
                  <select
                    name="hal"
                    value={form.hal}
                    onChange={handleChange}
                    className="ml-2 border-b border-gray-400"
                  >
                    <option value="">-- Pilih Hal --</option>
                    {HAL_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ width: "45%" }}>
                <div className="text-sm">
                  Kepada Yth.
                  <br />
                  Ka.Sub Bid PTI
                  <br />
                  PERUMDA AIR MINUM Tirta Moedal
                  <br />
                  di <strong>SEMARANG</strong>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="mt-4 text-sm">
              Bersama surat ini kami beritahukan bahwa terdapat kerusakan atau
              diperlukan perbaikan di:
            </div>

            {/* Satker */}
            <div className="mt-3">
              <div className="grid grid-cols-12 gap-3 items-center">
                <div className="col-span-3 text-sm font-semibold">Satker :</div>
                <div className="col-span-9 field-box">
                  <select
                    name="satker"
                    value={form.satker}
                    onChange={handleChange}
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
              </div>

              <div className="grid grid-cols-12 gap-3 items-center mt-3">
                <div className="col-span-2 text-sm font-semibold">
                  Kode Barang :
                </div>
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

            {/* Keterangan */}
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

            <div className="mt-2 text-xs text-center">
              Demikian laporan kami untuk menjadi periksa dan mohon untuk
              perbaikan.
            </div>

            {/* Tanda tangan tengah */}
            <div className="mt-10 flex justify-center text-center gap-24">
              <div>
                <div className="text-sm font-semibold">Mengetahui</div>
                <div className="text-xs">{jabatan}</div>
                <div className="mt-14">
                  <div
                    style={{
                      borderTop: "1px dotted #000",
                      width: "160px",
                      margin: "0 auto",
                    }}
                  >
                    {form.mengetahui || "(..................................)"}
                  </div>
                  <div className="text-xs mt-1">
                    NPP: {form.nppMengetahui || "__________"}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold">Pelapor</div>
                <div className="mt-16">
                  <div
                    style={{
                      borderTop: "1px dotted #000",
                      width: "160px",
                      margin: "0 auto",
                    }}
                  >
                    {form.pelapor || "(..................................)"}
                  </div>
                  <div className="text-xs mt-1">
                    NPP: {form.nppPelapor || "__________"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
