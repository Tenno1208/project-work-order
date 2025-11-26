"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const [showPreview, setShowPreview] = useState(false);

  // Dummy data
  const [formData, setFormData] = useState({
    menugaskan: ["Budi Santoso", "Agus Pratama"],
    tanggalSelesai: "24-10-2025",
    jenisPekerjaan: "Pemeliharaan Komputer",
    idBarang: "BRG-00123",
    uraianPekerjaan: "Perbaikan komputer kantor bagian administrasi yang mengalami kerusakan sistem.",
    status: "Belum Selesai",
    pelaksana: "Joko Widodo",
    nppPelaksana: "NPP.69081234",
  });

  // Menangani Cetak dengan menyembunyikan elemen non-cetak
  const handlePrint = () => {
    // Tambahkan CSS untuk menyembunyikan elemen dashboard saat mencetak
    const style = document.createElement('style');
    style.innerHTML = `
      @media print {
        body > :not(#printArea) { display: none !important; }
        #printArea {
          width: 100%;
          position: fixed;
          top: 0;
          left: 0;
          background: white;
        }
        @page { size: A4; margin: 20mm; }
      }
    `;
    document.head.appendChild(style);
    
    // Fokuskan pada area cetak
    const printArea = document.getElementById("printArea");
    if (printArea) {
      // Temporarily show only the print content
      const originalHtml = document.body.innerHTML;
      document.body.innerHTML = printArea.innerHTML;
      
      window.print();
      
      // Restore original content
      document.body.innerHTML = originalHtml;
    }

    // Hapus style cetak setelah selesai
    document.head.removeChild(style);
    setShowPreview(false); // Tutup modal setelah cetak
  };


  // Komponen Reusable untuk konten SPK (untuk Form dan Preview)
  const SPKContent = ({ id }: { id?: string }) => (
    <div id={id} className="text-sm leading-relaxed text-gray-800">
      <p className="font-bold text-center underline mb-6 text-lg">
        SURAT PERINTAH KERJA
      </p>

      <div className="space-y-4">
        <div>
          <p className="font-semibold">Menugaskan Sdr:</p>
          {formData.menugaskan.map((nama, i) => (
            <p key={i} className="ml-4">
              {i + 1}. {nama}
            </p>
          ))}
        </div>

        <p>Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan</p>

        <p>
          <strong>Tanggal Selesai:</strong> {formData.tanggalSelesai}
        </p>

        <div>
          <p className="font-semibold">Jenis Pekerjaan:</p>
          <ol className="list-decimal ml-5">
            <li>Pemeliharaan Jaringan</li>
            <li>Komputer</li>
            <li>Printer</li>
            <li>Monitor</li>
            <li>Dll.</li>
          </ol>
        </div>

        <p>
          <strong>ID Barang:</strong> {formData.idBarang}
        </p>

        <div>
          <p className="font-semibold">Uraian Pekerjaan:</p>
          {/* Hapus border saat preview/cetak */}
          <div className="p-3 min-h-[100px] border border-gray-300"> 
            {formData.uraianPekerjaan}
          </div>
        </div>

        <div className="mt-4">
          <p className="font-semibold">Status Pekerjaan:</p>
          <div className="flex items-center gap-4">
            <label>
              <input
                type="checkbox"
                checked={formData.status === "Selesai"}
                readOnly
              />{" "}
              Selesai
            </label>
            <label>
              <input
                type="checkbox"
                checked={formData.status === "Belum Selesai"}
                readOnly
              />{" "}
              Belum Selesai
            </label>
          </div>
        </div>

        <div className="mt-8 flex justify-between">
          <div>
            <p className="font-semibold">Mengetahui</p>
            <p>Ka. Bid Pengembangan Program</p>
            <div className="mt-16">
              <p className="font-bold underline">Arief Endrawan J, S.E.</p>
              <p>NPP.690839804</p>
          </div>
          </div>

          <div className="text-right">
            <p className="font-semibold">Pelaksana</p>
            <div className="mt-16">
              <p className="font-bold underline">{formData.pelaksana}</p>
              <p>{formData.nppPelaksana}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );


  return (
    <div className="p-6">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-700">Surat Perintah Kerja (SPK)</h1>
        <Button onClick={() => setShowPreview(true)} className="bg-blue-600 hover:bg-blue-700">Preview & Cetak</Button>
      </div>

      {/* FORM INPUT (Dummy) - Menggunakan komponen SPKContent yang sama */}
      <div className="bg-white shadow-lg rounded-xl p-8 border max-w-4xl mx-auto">
        <SPKContent />
      </div>

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[800px] h-[90vh] overflow-y-auto relative text-black">
            
            {/* Konten Preview - Tambahkan ID printArea di sini */}
            <SPKContent id="printArea" />

            {/* Tombol bawah */}
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