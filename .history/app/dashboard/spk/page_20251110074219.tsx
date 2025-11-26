"use client";

import { useState } from "react";
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

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handlePrint = () => {
    const printContents = document.getElementById("printArea")?.innerHTML;
    if (printContents) {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>Surat Perintah Kerja</title>
            <style>
              @page { size: A4; margin: 20mm; }
              body { font-family: serif; font-size: 11pt; color: #000; }
              .text-center{text-align:center;}
              .border-b{border-bottom:1px solid #000;}
              .border{border:1px solid #000;}
              .w-100{width:100%;}
              .flex{display:flex;}
              .justify-between{justify-content:space-between;}
              .items-center{align-items:center;}
              .space-y-2>*+*{margin-top:0.5rem;}
              .signature{height:80px;}
            </style>
          </head>
          <body>${printContents}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const SPKContent = ({ data }: any) => (
    <div id="printArea" className="p-8 text-[13px] font-serif text-black leading-relaxed">
      <h2 className="text-center font-bold underline mb-4">SURAT PERINTAH KERJA</h2>

      <div className="space-y-2">
        <div className="flex">
          <p className="w-[140px]">Menugaskan Sdr</p>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span>1.</span>
              <span className="flex-1 border-b border-black">{data.menugaskan1}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>2.</span>
              <span className="flex-1 border-b border-black">{data.menugaskan2}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>3.</span>
              <span className="flex-1 border-b border-black">{data.menugaskan3}</span>
            </div>
          </div>
        </div>

        <p className="border-b border-black pb-1">
          Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan
        </p>

        <div className="flex items-center">
          <p className="w-[140px]">Tanggal Selesai</p>
          <span className="border-b border-black flex-1 pl-2">{data.tanggalSelesai}</span>
        </div>

        <div className="flex">
          <p className="w-[140px]">Jenis Pekerjaan</p>
          <div className="flex-1">
            <p>1. Pemeliharaan Jaringan</p>
            <p>2. Komputer</p>
            <p>3. Printer</p>
            <p>4. Monitor</p>
          </div>
        </div>

        <div className="flex items-center">
          <p className="w-[140px]">ID Barang</p>
          <span className="border-b border-black flex-1 pl-2">{data.idBarang}</span>
        </div>

        <div className="flex">
          <p className="w-[140px]">Uraian Pekerjaan</p>
          <div className="flex-1 border border-black min-h-[100px] p-2">
            {data.uraianPekerjaan}
          </div>
        </div>

        <div className="mt-6">
          <div className="flex items-start gap-6">
            <p className="w-[140px]">Status Pekerjaan</p>
            <div className="flex gap-10">
              <div className="border w-5 h-5 flex items-center justify-center">
                {data.status === "Selesai" ? "✓" : ""}
              </div>
              <span>Selesai</span>
              <div className="border w-5 h-5 flex items-center justify-center">
                {data.status === "Belum Selesai" ? "✓" : ""}
              </div>
              <span>Belum Selesai</span>
            </div>
          </div>

          <div className="mt-10 flex justify-between">
            <div className="text-center w-1/2">
              <p>Mengetahui</p>
              <p>Ka. Bid Pengembangan Program</p>
              <div className="signature"></div>
              <p className="font-bold border-t border-black inline-block">
                Arief Endrawan J, S.E.
              </p>
              <p>NPP.690839804</p>
            </div>

            <div className="text-center w-1/2">
              <p>Ka. Sub Bid TI</p>
              <div className="signature"></div>
              <p className="font-bold border-t border-black inline-block">
                A. Sigit Dwiyoga, S.Kom.
              </p>
              <p>NPP.690830502</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-gray-700">Surat Perintah Kerja (SPK)</h1>
        <Button onClick={() => setShowPreview(true)} className="bg-blue-600 hover:bg-blue-700">
          Preview & Cetak
        </Button>
      </div>

      <div className="bg-white shadow-lg rounded-xl p-6 border max-w-3xl mx-auto space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label>Menugaskan Sdr 1</label>
            <input name="menugaskan1" onChange={handleChange} className="w-full border p-1" />
          </div>
          <div>
            <label>Menugaskan Sdr 2</label>
            <input name="menugaskan2" onChange={handleChange} className="w-full border p-1" />
          </div>
          <div>
            <label>Menugaskan Sdr 3</label>
            <input name="menugaskan3" onChange={handleChange} className="w-full border p-1" />
          </div>
          <div>
            <label>Tanggal Selesai</label>
            <input name="tanggalSelesai" onChange={handleChange} className="w-full border p-1" />
          </div>
          <div>
            <label>ID Barang</label>
            <input name="idBarang" onChange={handleChange} className="w-full border p-1" />
          </div>
          <div>
            <label>Status</label>
            <select name="status" onChange={handleChange} className="w-full border p-1">
              <option value="">Pilih Status</option>
              <option value="Selesai">Selesai</option>
              <option value="Belum Selesai">Belum Selesai</option>
            </select>
          </div>
        </div>
        <div>
          <label>Uraian Pekerjaan</label>
          <textarea
            name="uraianPekerjaan"
            onChange={handleChange}
            className="w-full border p-2"
            rows={4}
          />
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex justify-center items-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl w-[800px] h-[90vh] overflow-y-auto relative text-black">
            <SPKContent data={formData} />
            <div className="sticky bottom-0 bg-white/90 border-t pt-4 -mx-8 px-8 flex justify-end gap-3">
              <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700">
                Cetak Dokumen
              </Button>
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
