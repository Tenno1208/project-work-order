"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    menugaskan1: "",
    menugaskan2: "",
    menugaskan3: "",
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
  };

  const handlePrint = () => {
    const printContents = document.getElementById("printArea")?.innerHTML;
    if (!printContents) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Surat Perintah Kerja</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body { font-family: 'Times New Roman', serif; color: #000; }
            .container { width: 210mm; min-height: 297mm; }
          </style>
        </head>
        <body>
          <div class="container">${printContents}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 200);
  };

  const SPKContent = ({ data }) => (
    <div id="printArea" className="w-full text-[13px] leading-tight">
      <div className="w-full">
        <h2 className="text-center font-bold underline" style={{ fontSize: 16 }}>
          SURAT PERINTAH KERJA
        </h2>
      </div>

      <div className="mt-4">
        <div className="flex">
          <div className="w-[150px]">Menugaskan Sdr</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4">1.</div>
              <div className="flex-1 border-b pb-1">{data.menugaskan1 || ""}</div>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4">2.</div>
              <div className="flex-1 border-b pb-1">{data.menugaskan2 || ""}</div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4">3.</div>
              <div className="flex-1 border-b pb-1">{data.menugaskan3 || ""}</div>
            </div>
          </div>
        </div>

        <div className="mt-3 border-b pb-1">Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan</div>

        <div className="flex mt-3">
          <div className="w-[150px]">Tanggal Selesai</div>
          <div className="flex-1 border-b pb-1">{data.tanggalSelesai || ""}</div>
        </div>

        <div className="flex mt-3">
          <div className="w-[150px]">Jenis Pekerjaan</div>
          <div className="flex-1">
            <div>1. Pemeliharaan Jaringan</div>
            <div>2. Komputer</div>
            <div>3. Printer</div>
            <div>4. Monitor</div>
            <div>5. ....</div>
          </div>
        </div>

        <div className="flex mt-3">
          <div className="w-[150px]">ID Barang</div>
          <div className="flex-1 border-b pb-1">{data.idBarang || ""}</div>
        </div>

        <div className="flex mt-3">
          <div className="w-[150px]">Uraian Pekerjaan</div>
          <div className="flex-1 border border-black min-h-[140px] p-2">{data.uraianPekerjaan || ""}</div>
        </div>

        <div className="mt-6">
          <div className="flex items-start">
            <div className="w-[150px]">Status Pekerjaan</div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border flex items-center justify-center">{data.status === "Selesai" ? "✓" : ""}</div>
                <div>Selesai</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border flex items-center justify-center">{data.status === "Belum Selesai" ? "✓" : ""}</div>
                <div>Belum Selesai</div>
              </div>
            </div>
          </div>

          <div className="mt-12 flex justify-between">
            <div className="w-1/2 text-center">
              <div>Mengetahui</div>
              <div>Ka. Bid Pengembangan Program</div>
              <div style={{ height: 70 }}></div>
              <div className="font-bold border-t inline-block mt-1">Arief Endrawan J, S.E.</div>
              <div>NPP.690839804</div>
            </div>

            <div className="w-1/2 text-center">
              <div>Ka. Sub Bid TI</div>
              <div style={{ height: 70 }}></div>
              <div className="font-bold border-t inline-block mt-1">A. Sigit Dwiyoga, S.Kom.</div>
              <div>NPP.690830502</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-semibold">Surat Perintah Kerja (SPK)</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowPreview(true)}>Preview & Cetak</Button>
          </div>
        </div>

        <div className="bg-white border shadow rounded p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm">Menugaskan Sdr 1</label>
              <input name="menugaskan1" onChange={handleChange} className="w-full border p-2" />
            </div>
            <div>
              <label className="block text-sm">Menugaskan Sdr 2</label>
              <input name="menugaskan2" onChange={handleChange} className="w-full border p-2" />
            </div>
            <div>
              <label className="block text-sm">Menugaskan Sdr 3</label>
              <input name="menugaskan3" onChange={handleChange} className="w-full border p-2" />
            </div>
            <div>
              <label className="block text-sm">Tanggal Selesai</label>
              <input name="tanggalSelesai" onChange={handleChange} className="w-full border p-2" />
            </div>
            <div>
              <label className="block text-sm">ID Barang</label>
              <input name="idBarang" onChange={handleChange} className="w-full border p-2" />
            </div>
            <div>
              <label className="block text-sm">Status</label>
              <select name="status" onChange={handleChange} className="w-full border p-2">
                <option value="">Pilih Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Belum Selesai">Belum Selesai</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm">Uraian Pekerjaan</label>
            <textarea name="uraianPekerjaan" onChange={handleChange} className="w-full border p-2" rows={4} />
          </div>
        </div>

        {showPreview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white w-[800px] max-h-[90vh] overflow-auto rounded shadow-2xl p-6 relative">
              <SPKContent data={formData} />

              <div className="sticky bottom-0 left-0 right-0 bg-white/90 py-3 mt-4 flex justify-end gap-3">
                <Button onClick={handlePrint}>Cetak Dokumen</Button>
                <Button variant="secondary" onClick={() => setShowPreview(false)}>
                  Tutup
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
