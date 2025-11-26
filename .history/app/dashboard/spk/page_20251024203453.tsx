"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const [showPreview, setShowPreview] = useState(false);

  // Data yang akan diisi ke formulir
  const [formData, setFormData] = useState({
    menugaskan: ["Budi Santoso", "Agus Pratama", "3."], // Ditambah 3.
    tanggalSelesai: "24-10-2025",
    idBarang: "BRG-00123",
    uraianPekerjaan: "Perbaikan komputer kantor bagian administrasi yang mengalami kerusakan sistem.",
    status: "Belum Selesai",
    pelaksana: "", // Dikosongkan, hanya ada garis
    nppPelaksana: "", // Dikosongkan
  });

  // Data dummy untuk bagian "Mengetahui" dan "Ka. Sub Bid TI"
  const MENGETAHUI = {
    jabatan: "Ka. Bid Pengembangan Program",
    nama: "Arief Endrawan J, S.E.",
    npp: "NPP.690839804",
  };

  const KASUBBID = {
    jabatan: "Ka. Sub Bid TI",
    nama: "A. Sigit Dwiyoga, S.Kom.",
    npp: "NPP.690830502",
  };

  // Menangani Cetak
  const handlePrint = () => {
    setShowPreview(true); // Pastikan modal muncul

    setTimeout(() => {
      const printContents = document.getElementById("printArea")?.innerHTML;
      if (printContents) {
        const originalContents = document.body.innerHTML;
        
        // Tambahkan styling cetak A4
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
            <head>
              <title>Surat Perintah Kerja</title>
              <style>
                @page { size: A4; margin: 25mm; }
                body { font-family: serif; font-size: 11pt; color: #000; line-height: 1.4; }
                .container { width: 100%; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 20px; }
                .underline { text-decoration: underline; }
                .flex-line { display: flex; justify-content: space-between; align-items: flex-end; }
                .small-box { border: 1px solid black; padding: 2px; height: 16px; width: 16px; display: inline-block; margin-right: 5px; }
                .section-line { border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px; }
              </style>
            </head>
            <body>
              <div class="container">
                ${printContents}
              </div>
            </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.print();
          
          // Di Next.js, reload mungkin tidak diperlukan jika kita menggunakan CSS @media print
        }
      }
      setShowPreview(false);
    }, 100);
  };

  // Komponen Konten yang meniru formulir cetak
  const SPKContentPrinted = ({ id }: { id?: string }) => (
    <div id={id} className="text-black text-sm leading-relaxed font-serif">
      <div className="text-center font-bold underline text-lg mb-8">
        SURAT PERINTAH KERJA
      </div>

      <div className="space-y-3">
        {/* Menugaskan Sdr */}
        <div className="flex">
          <p className="w-[150px] shrink-0">Menugaskan Sdr</p>
          <div className="flex-1 space-y-2">
            {formData.menugaskan.map((nama, i) => (
              <div key={i} className="flex gap-2">
                <span className="w-4">{i + 1}.</span>
                <span className="flex-1 border-b border-black">
                  {i < 2 ? nama : ""}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Untuk Melaksanakan */}
        <div className="border-b border-black pb-1 mb-2">
          Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan
        </div>

        {/* Tanggal Selesai */}
        <div className="flex items-end">
          <p className="w-[150px] shrink-0">Tanggal Selesai</p>
          <span className="border-b border-black flex-1 pl-2">
            {formData.tanggalSelesai}
          </span>
        </div>

        {/* Jenis Pekerjaan */}
        <div className="flex">
          <p className="w-[150px] shrink-0">Jenis Pekerjaan</p>
          <div className="flex-1 space-y-1">
            <div className="flex items-center">
              <span className="w-4">:</span>
              <span className="w-4">1.</span>
              <span className="flex-1 border-b border-black">
                Pemeliharaan Jaringan
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-4 invisible">:</span>
              <span className="w-4">2.</span>
              <span className="flex-1 border-b border-black">
                Komputer
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-4 invisible">:</span>
              <span className="w-4">3.</span>
              <span className="flex-1 border-b border-black">
                Printer
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-4 invisible">:</span>
              <span className="w-4">4.</span>
              <span className="flex-1 border-b border-black">
                Monitor
              </span>
            </div>
            <div className="flex items-center">
              <span className="w-4 invisible">:</span>
              <span className="w-4">5.</span>
              <span className="flex-1 border-b border-black">
                ....
              </span>
            </div>
          </div>
        </div>

        {/* ID Barang */}
        <div className="flex items-end mt-4">
          <p className="w-[150px] shrink-0">ID Barang</p>
          <span className="w-4 shrink-0">:</span>
          <span className="border-b border-black flex-1 pl-2">
            {formData.idBarang}
          </span>
        </div>

        {/* Uraian Pekerjaan */}
        <div className="flex">
          <p className="w-[150px] shrink-0">Uraian Pekerjaan</p>
          <span className="w-4 shrink-0">:</span>
          <div className="flex-1 border border-black min-h-[120px] p-2 whitespace-pre-wrap">
            {formData.uraianPekerjaan}
          </div>
        </div>

        {/* Status Pekerjaan */}
        <div className="mt-8 flex items-center">
          <p className="w-[150px] shrink-0">Status Pekerjaan</p>
          <div className="flex-1 flex gap-10 items-center">
            {/* Placeholder Tanda Tangan & QR */}
            <div className="w-[100px] h-[100px] border border-black flex justify-center items-center text-xs text-gray-400">
              QR / TTD
            </div>

            {/* Checkbox Selesai */}
            <div className="flex items-center">
              <div className="w-4 h-4 border border-black mr-2 bg-black"></div>
              Selesai
            </div>
            {/* Checkbox Belum Selesai */}
            <div className="flex items-center">
              <div className="w-4 h-4 border border-black mr-2"></div>
              Belum Selesai
            </div>
          </div>
        </div>

        {/* Bagian Tanda Tangan */}
        <div className="mt-12 flex justify-between">
          <div className="w-1/2 pr-10">
            <p className="mb-1">{MENGETAHUI.jabatan}</p>
            {/* Placeholder TTD */}
            <div className="h-16"></div> 
            <p className="border-b border-black font-bold text-center">
              {MENGETAHUI.nama}
            </p>
            <p className="text-center">{MENGETAHUI.npp}</p>
          </div>

          <div className="w-1/2 pl-10">
            <p className="mb-1 text-right">{KASUBBID.jabatan}</p>
            {/* Placeholder TTD */}
            <div className="h-16"></div> 
            <p className="border-b border-black font-bold text-center">
              {KASUBBID.nama}
            </p>
            <p className="text-center">{KASUBBID.npp}</p>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="p-6">
      {/* HEADER (Hanya terlihat di dashboard) */}
      <div className="flex justify-between items-center mb-6 no-print">
        <h1 className="text-2xl font-bold text-gray-700">Surat Perintah Kerja (SPK)</h1>
        <Button onClick={() => setShowPreview(true)} className="bg-blue-600 hover:bg-blue-700">Preview & Cetak</Button>
      </div>

      {/* FORM INPUT (Tampilan Form di Dashboard) */}
      <div className="bg-white shadow-lg rounded-xl p-8 border max-w-4xl mx-auto no-print">
        <SPKContentPrinted />
      </div>

      {/* PREVIEW MODAL (Tampilan Cetak) */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[800px] h-[90vh] overflow-y-auto relative text-black">
            
            {/* Konten Preview - Tambahkan ID printArea di sini */}
            <SPKContentPrinted id="printArea" />

            {/* Tombol bawah (Hanya terlihat di modal) */}
            <div className="sticky bottom-0 bg-white/90 border-t pt-4 -mx-8 px-8 flex justify-end gap-3">
              <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">Cetak Dokumen</Button>
              <Button variant="secondary" onClick={() => setShowPreview(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}