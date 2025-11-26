"use client";

import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";

export default function SPKPage() {
  const [data, setData] = useState({
    menugaskan1: "",
    menugaskan2: "",
    menugaskan3: "",
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
  });

  const docRef = useRef<HTMLDivElement | null>(null);

  const updateField = (key: string, value: string) => {
    setData((s) => ({ ...s, [key]: value }));
  };

  const handlePrint = () => {
    const printContents = docRef.current?.innerHTML;
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
            .paper { width: 210mm; min-height: 297mm; }
          </style>
        </head>
        <body>
          <div class="paper">${printContents}</div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  const EditableLine = ({ value, placeholder, onChange }: any) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(e: any) => onChange(e.currentTarget.textContent || "")}
      className="inline-block border-b border-black pb-0.5 min-w-[120px]"
      style={{ outline: "none", minHeight: 18 }}
    >
      {value || placeholder || " "}
    </div>
  );

  const EditableBox = ({ value, onChange }: any) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(e: any) => onChange(e.currentTarget.innerText || "")}
      className="min-h-[140px] p-2"
      style={{ outline: "none", whiteSpace: "pre-wrap" }}
    >
      {value || " "}
    </div>
  );

  const toggleStatus = (val: string) => {
    setData((s) => ({ ...s, status: s.status === val ? "" : val }));
  };

  return (
    <div className="p-6 min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-700">Surat Perintah Kerja (SPK) — Editable</h1>
          <Button onClick={handlePrint}>Cetak (A4)</Button>
        </div>

        <div ref={docRef} className="bg-white p-8 text-[13px] leading-relaxed font-serif" style={{ width: "210mm", minHeight: "297mm" }}>
          <h2 className="text-center font-bold underline mb-4" style={{ fontSize: 16 }}>
            SURAT PERINTAH KERJA
          </h2>

          <div className="mt-2">
            <div className="flex items-start">
              <div className="w-[140px]">Menugaskan Sdr</div>
              <div className="flex-1 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div>{i}.</div>
                    <EditableLine
                      value={data[`menugaskan${i}` as keyof typeof data]}
                      placeholder="(ketik nama...)"
                      onChange={(v: string) => updateField(`menugaskan${i}`, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4">Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan</div>

            <div className="flex mt-3">
              <div className="w-[140px]">Tanggal Selesai</div>
              <EditableLine
                value={data.tanggalSelesai}
                placeholder="dd-mm-yyyy"
                onChange={(v) => updateField("tanggalSelesai", v)}
                className="flex-1"
              />
            </div>

            <div className="flex mt-3">
              <div className="w-[140px]">Jenis Pekerjaan</div>
              <div className="flex-1">
                <div>1. Pemeliharaan Jaringan</div>
                <div>2. Komputer</div>
                <div>3. Printer</div>
                <div>4. Monitor</div>
                <div>5. ....</div>
              </div>
            </div>

            <div className="flex mt-3">
              <div className="w-[140px]">ID Barang</div>
              <EditableLine
                value={data.idBarang}
                placeholder="(ketik ID...)"
                onChange={(v) => updateField("idBarang", v)}
                className="flex-1"
              />
            </div>

            <div className="flex mt-3">
              <div className="w-[140px]">Uraian Pekerjaan</div>
              <div className="flex-1">
                <EditableBox value={data.uraianPekerjaan} onChange={(v) => updateField("uraianPekerjaan", v)} />
              </div>
            </div>

            <div className="mt-6">
              <div className="flex items-start">
                <div className="w-[140px]">Status Pekerjaan</div>
                <div className="flex items-center gap-8">
                  {["Selesai", "Belum Selesai"].map((s) => (
                    <div key={s} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleStatus(s)}>
                      <div style={{ width: 18, height: 18, border: "1px solid #000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {data.status === s ? "✓" : ""}
                      </div>
                      <div>{s}</div>
                    </div>
                  ))}
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
      </div>
    </div>
  );
}