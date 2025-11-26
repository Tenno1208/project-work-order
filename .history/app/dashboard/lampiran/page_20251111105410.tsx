"use client";

import React, { useEffect, useState } from "react";
import { Droplet, Printer, Upload } from "lucide-react";

type SatkerDef = { id: string; label: string };

const SATKERS: SatkerDef[] = [
  { id: "satker-1", label: "Seksi Produksi" },
  { id: "satker-2", label: "Sub Bid Keuangan" },
  { id: "satker-3", label: "Sub Bid Marketing" },
];

export default function SuratPerintahKerjaPage() {
  const [showForm, setShowForm] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [formData, setFormData] = useState({
    nomorSurat: "",
    tanggalSurat: "",
    tanggalSelesai: "",
    namaSatker: "",
    uraianPekerjaan: "",
  });

  // Set tanggal selesai otomatis ke hari ini
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setFormData((prev) => ({ ...prev, tanggalSelesai: today }));
  }, []);

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50 py-10">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-blue-700">
          SURAT PERINTAH KERJA
        </h1>
        <p className="text-gray-600">
          Formulir Pengajuan Surat Perintah Kerja
        </p>
      </div>

      {/* Kartu utama */}
      <div className="bg-white shadow-xl rounded-xl w-full max-w-[900px] overflow-hidden border">
        {/* Bagian Form */}
        <div id="print-area" className="p-6">
          {/* Nomor Surat */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium">
              Nomor Surat
            </label>
            <input
              type="text"
              value={formData.nomorSurat}
              onChange={(e) =>
                setFormData({ ...formData, nomorSurat: e.target.value })
              }
              className="w-full border rounded-md p-2"
              placeholder="Contoh: 001/SPK/2025"
            />
          </div>

          {/* Tanggal Surat */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 font-medium">
                Tanggal Surat
              </label>
              <input
                type="date"
                value={formData.tanggalSurat}
                onChange={(e) =>
                  setFormData({ ...formData, tanggalSurat: e.target.value })
                }
                className="w-full border rounded-md p-2"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={formData.tanggalSelesai}
                onChange={(e) =>
                  setFormData({ ...formData, tanggalSelesai: e.target.value })
                }
                className="w-full border rounded-md p-2"
              />
            </div>
          </div>

          {/* Satuan Kerja */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium">
              Menugaskan kepada
            </label>
            <select
              value={formData.namaSatker}
              onChange={(e) =>
                setFormData({ ...formData, namaSatker: e.target.value })
              }
              className="w-full border rounded-md p-2"
            >
              <option value="">Pilih Satuan Kerja</option>
              {SATKERS.map((satker) => (
                <option key={satker.id} value={satker.label}>
                  {satker.label}
                </option>
              ))}
            </select>
          </div>

          {/* Uraian Pekerjaan */}
          <div className="mb-4">
            <label className="block text-gray-700 font-medium">
              Uraian Pekerjaan
            </label>
            <textarea
              rows={3}
              value={formData.uraianPekerjaan}
              onChange={(e) =>
                setFormData({ ...formData, uraianPekerjaan: e.target.value })
              }
              className="w-full border rounded-md p-2"
              placeholder="Tuliskan uraian pekerjaan yang diperintahkan..."
            />
          </div>

          {/* Upload Dokumen */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-1">
              Upload Dokumen Pendukung
            </label>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-md cursor-pointer hover:bg-blue-200 transition">
                <Upload size={16} />
                <span>Pilih File</span>
                <input type="file" className="hidden" />
              </label>
              <span className="text-gray-500 text-sm">
                (PDF, JPG, PNG - Maks 5MB)
              </span>
            </div>
          </div>
        </div>

        {/* Footer tombol aksi */}
        {!isPrintMode && (
          <div className="flex justify-end items-center gap-3 p-4 border-t bg-gray-50">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-blue-600 text-white rounded flex items-center gap-2"
            >
              <Printer size={16} /> Cetak
            </button>

            <button
              onClick={() => alert("Pengajuan dikirim!")}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded flex items-center gap-2"
            >
              <Droplet size={16} /> Ajukan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
