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

  const [isPrintMode, setIsPrintMode] = useState(false);

  // Ambil data user login
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

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
    <div className="p-6">
      <style>{`
        @page { size: A4; margin: 20mm; }
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
        .field-box { border: 1px solid #000; padding: 6px; min-height: 20px; }
        .big-box { border: 1px solid #000; min-height: 140px; padding: 8px; }
      `}</style>

      <div className="max-w-[900px] mx-auto bg-white border border-gray-300 shadow-md rounded-lg text-gray-800">
        {/* Header (tidak ikut print) */}
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

        {/* Area Cetak */}
        <div id="print-area" className="p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-sm">
                PERUMDA AIR MINUM TIRTA MOEDAL
              </div>
              <div className="font-bold text-sm">KOTA SEMARANG</div>
            </div>
            <div className="text-right text-sm">{todayStr}</div>
          </div>

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
                  className="ml-2 border-b border-gray-400"
                >
                  <option value="">-- Pilih Hal --</option>
                  {HAL_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="w-1/2 text-sm">
              Kepada Yth. <br />
              Ka.Sub Bid PTI <br />
              PERUMDA AIR MINUM Tirta Moedal <br />
              di <strong>SEMARANG</strong>
            </div>
          </div>

          <div className="mt-4 text-sm">
            Bersama surat ini kami beritahukan bahwa terdapat kerusakan atau
            diperlukan perbaikan di:
          </div>

          <div className="mt-3 text-sm">
            <div className="grid grid-cols-12 gap-3 items-center">
              <div className="col-span-3 font-semibold">Satker :</div>
              <div className="col-span-9 field-box">
                {isPrintMode ? (
                  <span>{selectedSatker?.label || ""}</span>
                ) : (
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
                )}
              </div>
            </div>

            <div className="grid grid-cols-12 gap-3 items-center mt-3">
              <div className="col-span-3 font-semibold">Kode Barang :</div>
              <div className="col-span-9 field-box">
                {isPrintMode ? (
                  <span>{form.kodeBarang}</span>
                ) : (
                  <input
                    type="text"
                    name="kodeBarang"
                    value={form.kodeBarang}
                    onChange={handleChange}
                    placeholder="Isi kode barang"
                    className="w-full"
                  />
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 big-box text-sm">
            {isPrintMode ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{form.keterangan}</div>
            ) : (
              <textarea
                name="keterangan"
                value={form.keterangan}
                onChange={handleChange}
                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
                className="w-full resize-none"
                rows={8}
              />
            )}
          </div>

          <div className="mt-2 text-xs text-center">
            Demikian laporan kami untuk menjadi periksa dan mohon untuk
            perbaikan.
          </div>

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
                  {form.mengetahui || "(..............................)"}
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
                  {form.pelapor || "(..............................)"}
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
  );
}
