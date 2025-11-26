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

  const handlePrint = () => {
    const printContents = document.getElementById("printArea")?.innerHTML;
    const originalContents = document.body.innerHTML;
    document.body.innerHTML = printContents || "";
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="min-h-screen">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-blue-700">Surat Perintah Kerja (SPK)</h1>
        <Button onClick={() => setShowPreview(true)}>Preview & Cetak</Button>
      </div>

      {/* FORM INPUT (Dummy) */}
      <div className="bg-white shadow-lg rounded-xl p-8 border max-w-4xl">
        <p className="font-semibold text-center underline mb-4 text-lg">SURAT PERINTAH KERJA</p>

        <div className="space-y-4 text-sm">
          <div>
            <p className="font-semibold">Menugaskan Sdr:</p>
            {formData.menugaskan.map((nama, i) => (
              <p key={i}>
                {i + 1}. {nama}
              </p>
            ))}
          </div>

          <p>
            Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan
          </p>

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
            <div className="border p-3 rounded-md min-h-[100px]">
              {formData.uraianPekerjaan}
            </div>
          </div>

          <div className="mt-4">
            <p className="font-semibold">Status Pekerjaan:</p>
            <div className="flex items-center gap-4">
              <label>
                <input type="checkbox" checked={formData.status === "Selesai"} readOnly /> Selesai
              </label>
              <label>
                <input type="checkbox" checked={formData.status === "Belum Selesai"} readOnly /> Belum Selesai
              </label>
            </div>
          </div>

          <div className="mt-6 flex justify-between">
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

      {/* PREVIEW MODAL */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-[800px] h-[1100px] overflow-y-auto relative">
            <div id="printArea" className="p-8 text-sm">
              <p className="font-semibold text-center underline mb-4 text-lg">SURAT PERINTAH KERJA</p>
              <div className="space-y-4">
                <div>
                  <p className="font-semibold">Menugaskan Sdr:</p>
                  {formData.menugaskan.map((nama, i) => (
                    <p key={i}>
                      {i + 1}. {nama}
                    </p>
                  ))}
                </div>

                <p>
                  Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan
                </p>

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
                  <div className="border p-3 rounded-md min-h-[100px]">
                    {formData.uraianPekerjaan}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="font-semibold">Status Pekerjaan:</p>
                  <div className="flex items-center gap-4">
                    <label>
                      <input type="checkbox" checked={formData.status === "Selesai"} readOnly /> Selesai
                    </label>
                    <label>
                      <input type="checkbox" checked={formData.status === "Belum Selesai"} readOnly /> Belum Selesai
                    </label>
                  </div>
                </div>

                <div className="mt-6 flex justify-between">
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

            {/* Buttons */}
            <div className="absolute bottom-4 right-4 flex gap-3">
              <Button onClick={handlePrint}>Cetak</Button>
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
