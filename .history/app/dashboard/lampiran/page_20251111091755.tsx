"use client";

import React, { useEffect, useState } from "react";
import { Droplet, Printer, Upload } from "lucide-react";
import { useRouter } from "next/navigation";

type SatkerApi = {
  id: string;
  name: string;
  jabsatker?: string; // jabatan dari satker
};

const HAL_OPTIONS = ["Perbaikan", "Pemeliharaan", "Pengaduan Kerusakan"];

export default function LampiranPengajuanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ nama: string; npp: string } | null>(null);

  const [satkers, setSatkers] = useState<SatkerApi[]>([]); // ✅ data dari API
  const [selectedSatker, setSelectedSatker] = useState<SatkerApi | null>(null);

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

  // ✅ Ambil data user dari token
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/");
      return;
    }

    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
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

  // ✅ Ambil data satker dari API eksternal
  useEffect(() => {
    const fetchSatker = async () => {
      try {
        const res = await fetch(
          "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/client/satker/all"
        );
        const data = await res.json();
        if (Array.isArray(data)) setSatkers(data);
      } catch (err) {
        console.error("Gagal fetch data satker:", err);
      }
    };
    fetchSatker();
  }, []);

  // ✅ Saat pilih satker, isi otomatis kolom mengetahui & kepada
  useEffect(() => {
    if (!form.satker) return;
    const found = satkers.find((s) => s.id === form.satker);
    setSelectedSatker(found || null);

    if (found) {
      const jab = found.jabsatker || "Ka.Unit";
      setForm((f) => ({
        ...f,
        mengetahui: jab,
        kepada: `Kepada ${jab}`,
      }));
    }
  }, [form.satker, satkers]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files).slice(0, 4);
    setFiles(selectedFiles);
    setPreviews(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 300);
  };

  const todayStr = `Semarang, ${new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })}`;

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
            border: none !important;
            box-shadow: none !important;
            background: transparent !important;
            padding: 0 !important;
          }
        }
        .big-box { border: 1px solid #000; min-height: 120px; padding: 8px; }
      `}</style>

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

        {/* Isi Form */}
        <div id="print-area" className="p-6 text-sm">
          <div className="flex justify-between">
            <div>
              <div className="font-bold">PERUMDA AIR MINUM TIRTA MOEDAL</div>
              <div className="font-bold">KOTA SEMARANG</div>
            </div>
            <div>{todayStr}</div>
          </div>

          {/* Hal */}
          <div className="mt-4 flex justify-between">
            <div className="font-semibold w-1/2">
              Hal:
              {isPrintMode ? (
                <span className="ml-2 font-normal">{form.hal}</span>
              ) : (
                <select
                  name="hal"
                  value={form.hal}
                  onChange={handleChange}
                  className="ml-2 w-3/4 border rounded p-1"
                >
                  <option value="">-- Pilih Hal --</option>
                  {HAL_OPTIONS.map((h) => (
                    <option key={h}>{h}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="w-1/2">
              Kepada Yth. <br />
              {isPrintMode ? (
                <>{form.kepada}</>
              ) : (
                <input
                  type="text"
                  name="kepada"
                  value={form.kepada}
                  onChange={handleChange}
                  className="border rounded p-1 w-full"
                />
              )}
              <br />
              PERUMDA AIR MINUM Tirta Moedal <br />
              di <strong>SEMARANG</strong>
            </div>
          </div>

          {/* Satker */}
          <div className="mt-4 grid grid-cols-12 gap-3 items-center">
            <div className="col-span-3 font-semibold">Satker :</div>
            <div className="col-span-9">
              {isPrintMode ? (
                <span>{selectedSatker?.name || ""}</span>
              ) : (
                <select
                  name="satker"
                  value={form.satker}
                  onChange={handleChange}
                  className="w-full border rounded p-1"
                >
                  <option value="">-- Pilih Satker --</option>
                  {satkers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Kode Barang */}
          <div className="mt-3 grid grid-cols-12 gap-3 items-center">
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
                  className="w-full border rounded p-1"
                  placeholder="Isi kode barang"
                />
              )}
            </div>
          </div>

          {/* Keterangan */}
          <div className="mt-4 big-box">
            {isPrintMode ? (
              <div style={{ whiteSpace: "pre-wrap" }}>{form.keterangan}</div>
            ) : (
              <textarea
                name="keterangan"
                value={form.keterangan}
                onChange={handleChange}
                rows={6}
                className="w-full border rounded p-2"
                placeholder="Tuliskan uraian kerusakan / perbaikan di sini..."
              />
            )}
          </div>

          {/* Tanda Tangan */}
          <div className="mt-20 flex justify-center text-center gap-60">
            <div>
              <div className="font-semibold">Mengetahui</div>
              <div className="text-xs">{form.mengetahui}</div>
              <div className="mt-16">(...........................)</div>
              <div className="text-xs mt-1">NPP: {form.nppMengetahui || "__________"}</div>
            </div>

            <div>
              <div className="font-semibold">Pelapor</div>
              <div className="mt-20">{form.pelapor || "(...........................)"}</div>
              <div className="text-xs mt-1">NPP: {form.nppPelapor || "__________"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
