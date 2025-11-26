"use client";

import { useRef, useState } from "react";
import { Droplet, Printer } from "lucide-react";

export default function LampiranPengajuanPage() {
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrintPreview = () => {
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const handlePrint = () => {
    const printContents = printRef.current?.innerHTML;
    if (!printContents) return;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`
      <html>
        <head>
          <title>Cetak Lampiran Pengajuan</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
            h1, h2, h3 { margin: 0; }
            .header { text-align: center; border-bottom: 2px solid #007BFF; padding-bottom: 10px; margin-bottom: 20px; }
            .section { margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            td, th { border: 1px solid #000; padding: 8px; font-size: 14px; }
            th { background: #e8f0ff; }
            .signature { margin-top: 40px; text-align: right; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    printWindow?.document.close();
    printWindow?.print();
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100 text-blue-900">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Droplet className="text-blue-600" />
          Lampiran Pengajuan Perbaikan
        </h1>
        <button
          onClick={handlePrintPreview}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow transition-all"
        >
          <Printer size={18} /> Cetak Preview
        </button>
      </div>

      <div ref={printRef}>
        {/* Header Surat */}
        <div className="border-b border-blue-300 pb-4 mb-6">
          <h2 className="text-xl font-semibold text-center">
            LAMPIRAN PENGAJUAN PERBAIKAN
          </h2>
          <p className="text-center text-blue-600 text-sm">
            PDAM Kota Semarang - Divisi Teknologi Informasi
          </p>
        </div>

        {/* Data Pengajuan */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold mb-1">
              Nama Pemohon
            </label>
            <input
              type="text"
              className="w-full border border-blue-300 rounded-lg p-2 text-sm"
              placeholder="Masukkan nama pemohon"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Jabatan / Bagian
            </label>
            <input
              type="text"
              className="w-full border border-blue-300 rounded-lg p-2 text-sm"
              placeholder="Contoh: Staf Keuangan"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Tanggal Pengajuan
            </label>
            <input
              type="date"
              className="w-full border border-blue-300 rounded-lg p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-1">
              Lokasi / Unit Kerja
            </label>
            <input
              type="text"
              className="w-full border border-blue-300 rounded-lg p-2 text-sm"
              placeholder="Contoh: Kantor Pusat"
            />
          </div>
        </div>

        {/* Uraian Perbaikan */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            Uraian Permasalahan
          </label>
          <textarea
            rows={4}
            className="w-full border border-blue-300 rounded-lg p-2 text-sm"
            placeholder="Tuliskan deskripsi masalah yang ingin diperbaiki..."
          ></textarea>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2">
            Jenis Pengajuan
          </label>
          <select className="w-full border border-blue-300 rounded-lg p-2 text-sm">
            <option>Perbaikan Komputer</option>
            <option>Perbaikan Jaringan</option>
            <option>Lainnya</option>
          </select>
        </div>

        {/* Tabel Barang / Komponen */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Daftar Komponen</h3>
          <table className="border border-blue-300 w-full text-sm">
            <thead>
              <tr className="bg-blue-100 text-blue-800">
                <th>No</th>
                <th>Nama Komponen</th>
                <th>Jumlah</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((n) => (
                <tr key={n}>
                  <td className="text-center">{n}</td>
                  <td>
                    <input
                      type="text"
                      className="w-full p-1 border border-blue-100 rounded"
                      placeholder="Nama komponen"
                    />
                  </td>
                  <td className="text-center">
                    <input
                      type="number"
                      className="w-full p-1 border border-blue-100 rounded text-center"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      className="w-full p-1 border border-blue-100 rounded"
                      placeholder="Keterangan"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Tanda Tangan */}
        <div className="grid grid-cols-2 mt-10">
          <div>
            <p className="font-semibold mb-16">Pemohon,</p>
            <p>( _________________________ )</p>
          </div>
          <div className="text-right">
            <p className="font-semibold mb-16">Mengetahui,</p>
            <p>( _________________________ )</p>
          </div>
        </div>
      </div>

      {/* Modal Preview */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-[90%] md:w-[70%] lg:w-[60%] max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={handleClosePreview}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
            <h2 className="text-center text-xl font-bold mb-4 text-blue-700">
              Preview Cetak Lampiran Pengajuan
            </h2>
            <div>{printRef.current?.innerHTML}</div>

            <div className="mt-6 text-center">
              <button
                onClick={handlePrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg shadow"
              >
                Cetak Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
