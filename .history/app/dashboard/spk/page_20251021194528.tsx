"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=600");

    if (printWindow && printContent) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Preview SPK PDAM</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; color: #000; }
              h2, h3 { text-align: center; margin-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #000; padding: 8px; font-size: 14px; }
              .no-border td { border: none; }
              .footer { margin-top: 50px; display: flex; justify-content: space-between; }
              .ttd { text-align: center; width: 40%; }
            </style>
          </head>
          <body>
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-blue-800">Surat Perintah Kerja (SPK)</h1>
        <Button
          onClick={handlePrint}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-md"
        >
          Preview & Cetak
        </Button>
      </div>

      {/* KONTEN SPK */}
      <div
        ref={printRef}
        className="bg-white rounded-xl shadow-md border border-blue-100 p-8"
      >
        <h2 className="text-xl font-bold text-center mb-1">PERUSAHAAN DAERAH AIR MINUM (PDAM)</h2>
        <h3 className="text-lg text-center mb-6">SURAT PERINTAH KERJA (SPK)</h3>

        <p className="text-sm mb-2"><strong>Nomor:</strong> 001/SPK/PDAM/2025</p>
        <p className="text-sm mb-6">
          Diberikan kepada petugas berikut untuk melaksanakan pekerjaan sesuai uraian yang tercantum di bawah ini.
        </p>

        <table>
          <tbody>
            <tr>
              <th className="w-1/3">Nama Petugas</th>
              <td>Ahmad Setiawan</td>
            </tr>
            <tr>
              <th>Bagian / Jabatan</th>
              <td>Teknisi Jaringan</td>
            </tr>
            <tr>
              <th>Lokasi Pekerjaan</th>
              <td>Jl. Sisingamangaraja No. 23</td>
            </tr>
            <tr>
              <th>Uraian Pekerjaan</th>
              <td>Perbaikan pipa bocor di area distribusi pelanggan.</td>
            </tr>
            <tr>
              <th>Status Pekerjaan</th>
              <td>Dalam Proses</td>
            </tr>
          </tbody>
        </table>

        <div className="footer mt-12">
          <div className="ttd">
            <p>Semarang, 21 Oktober 2025</p>
            <p className="font-semibold mt-8">Supervisor</p>
            <p>(___________________)</p>
          </div>
          <div className="ttd">
            <p>&nbsp;</p>
            <p className="font-semibold mt-8">Petugas</p>
            <p>(___________________)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
