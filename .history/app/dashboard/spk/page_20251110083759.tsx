"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const [showPreview, setShowPreview] = useState(false);
  const [formData, setFormData] = useState({
    menugaskan1: "",
    menugaskan2: "","use client";

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
