"use client";

import { useState } from "react";
import { Droplet, Printer, Eye } from "lucide-react";

export default function LampiranPengajuanPage() {
  const [preview, setPreview] = useState(false);
  const [formData, setFormData] = useState({
    satker: "",
    seksi: "",
    kodeBarang: "",
    keterangan: "",
    pelapor: "",
    nppPelapor: "",
    mengetahui: "",
    nppMengetahui: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
      <div className="flex items-center gap-3 mb-8 border-b pb-4">
        <div className="bg-blue-600 p-3 rounded-xl">
          <Droplet className="text-white" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-blue-800">Lampiran Pengajuan Perbaikan</h1>
      </div>

      {!preview ? (
        <>
          {/* FORM INPUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="text-sm font-semibold text-blue-700">Satker</label>
              <input
                type="text"
                name="satker"
                value={formData.satker}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-blue-700">Seksi / Sub Bid / Sub Bag</label>
              <input
                type="text"
                name="seksi"
                value={formData.seksi}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-blue-700">Kode Barang (wajib diisi)</label>
              <input
                type="text"
                name="kodeBarang"
                value={formData.kodeBarang}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-semibold text-blue-700">Keterangan Kerusakan / Perbaikan</label>
            <textarea
              name="keterangan"
              value={formData.keterangan}
              onChange={handleChange}
              rows={5}
              className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="text-sm font-semibold text-blue-700">Pelapor</label>
              <input
                type="text"
                name="pelapor"
                value={formData.pelapor}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <label className="text-sm text-blue-500 mt-2 block">NPP Pelapor</label>
              <input
                type="text"
                name="nppPelapor"
                value={formData.nppPelapor}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-blue-700">Mengetahui</label>
              <input
                type="text"
                name="mengetahui"
                value={formData.mengetahui}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <label className="text-sm text-blue-500 mt-2 block">NPP Mengetahui</label>
              <input
                type="text"
                name="nppMengetahui"
                value={formData.nppMengetahui}
                onChange={handleChange}
                className="w-full border border-blue-300 rounded-lg p-3 mt-1 focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
          </div>

          {/* Tombol */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => setPreview(true)}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200"
            >
              <Eye size={18} /> Preview Surat
            </button>
          </div>
        </>
      ) : (
        <>
          {/* PREVIEW SURAT */}
          <div className="border border-blue-300 rounded-xl p-8 text-gray-800 leading-relaxed bg-white">
            <div className="text-center mb-6">
              <h2 className="font-bold text-lg">PERUMDA AIR MINUM TIRTA MOEDAL</h2>
              <p>KOTA SEMARANG</p>
            </div>

            <p className="text-right mb-4">Semarang, ______________________</p>

            <p className="font-semibold">Hal: Pemeliharaan/Perbaikan Pengaduan Kerusakan</p>
            <p className="mt-2">
              Kepada Yth. <br />
              Ka.Sub Bid PTI <br />
              PERUMDA AIR MINUM Tirta Moedal <br />
              di <b>SEMARANG</b>
            </p>

            <p className="mt-4">
              Bersama surat ini kami beritahukan bahwa terdapat kerusakan atau diperlukan perbaikan di:
            </p>

            <div className="mt-3">
              <p>
                <b>Satker:</b> {formData.satker || "_____________________________"}
              </p>
              <p>
                <b>Seksi/Sub Bid/Sub Bag:</b> {formData.seksi || "_________________________"}
              </p>
              <p>
                <b>Kode Barang:</b> {formData.kodeBarang || "_________________________"}
              </p>
            </div>

            <div className="border border-gray-400 rounded-lg mt-4 p-4 min-h-[150px]">
              <p>{formData.keterangan || ".................................................."}</p>
            </div>

            <p className="mt-4">
              Demikian laporan kami untuk menjadi periksa dan mohon untuk perbaikan.
            </p>

            <div className="grid grid-cols-2 mt-8 text-center">
              <div>
                <p className="font-semibold">Mengetahui</p>
                <p>Ka.Cab / Ka.Bag / Ka.Bid / Kasatker</p>
                <div className="mt-12">
                  <p>{formData.mengetahui || "(..............................)"}</p>
                  <p>NPP: {formData.nppMengetahui || "_____________"}</p>
                </div>
              </div>
              <div>
                <p className="font-semibold">Pelapor</p>
                <div className="mt-12">
                  <p>{formData.pelapor || "(..............................)"}</p>
                  <p>NPP: {formData.nppPelapor || "_____________"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tombol bawah */}
          <div className="flex justify-end gap-4 mt-8 no-print">
            <button
              onClick={() => setPreview(false)}
              className="px-6 py-3 rounded-xl bg-gray-300 hover:bg-gray-400 text-gray-800 transition-all duration-200"
            >
              Kembali
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-all duration-200"
            >
              <Printer size={18} /> Cetak
            </button>
          </div>
        </>
      )}
    </div>
  );
}
