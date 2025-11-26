"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
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

  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    setData((s) => ({ ...s, tanggalSelesai: formatted }));
  }, []);

  const updateField = (key: string, value: string) => setData((s) => ({ ...s, [key]: value }));

  const handlePrint = () => {
    const printContents = docRef.current?.innerHTML;
    if (!printContents) return;

    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(`
      <html>
        <head>
          <title>Surat Perintah Kerja</title>
          <style>@page { size: A4; margin: 18mm; } body { font-family: 'Times New Roman', serif; color: #000; }</style>
        </head>
        <body>${printContents}</body>
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
      className="inline-block border-b border-black pb-0.5 min-w-[120px] text-black bg-white"
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
      className="min-h-[140px] p-2 text-black bg-white"
      style={{ outline: "none", whiteSpace: "pre-wrap" }}
    >
      {value || " "}
    </div>
  );

  const toggleStatus = (val: string) => setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  const daftarNama = [
    "Budi Santoso",
    "Siti Rahma",
    "Andi Wijaya",
    "Dewi Lestari",
    "Rudi Hartono",
  ];

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold text-gray-800">Surat Perintah Kerja (SPK) — Editable</h1>
          <Button onClick={handlePrint}>Cetak (A4)</Button>
        </div>

        <div
          ref={docRef}
          className="bg-white border border-gray-300 p-8 text-[13px] leading-relaxed font-serif shadow-md rounded-xl"
          style={{ width: "210mm", minHeight: "297mm" }}
        >
          <h2 className="text-center font-bold underline mb-4 text-black" style={{ fontSize: 16 }}>
            SURAT PERINTAH KERJA
          </h2>

          {/* Bagian awal */}
          <div className="mt-2 text-black space-y-4">
            <div className="flex">
              <div className="w-[110px] mt-2">Menugaskan Sdr:</div>
              <div className="flex flex-col gap-2 flex-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-[10px]">{i}.</div>
                    <select
                      value={data[`menugaskan${i}` as keyof typeof data]}
                      onChange={(e) => updateField(`menugaskan${i}`, e.target.value)}
                      className="border-b border-black outline-none bg-white text-sm py-0.5 w-full"
                      style={{ appearance: 'none', borderRadius: 0 }}
                    >
                      <option value="">--- Pilih nama dari daftar ---</option>
                      {daftarNama.map((nama) => (
                        <option key={nama} value={nama}>{nama}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div>Untuk melaksanakan Pemeliharaan/Perbaikan/Pengaduan kerusakan</div>

            {!showDetail && (
              <Button className= onClick={() => setShowDetail(true)} className="mt-4">Selesai</Button>
            )}
          </div>

          {/* Detail muncul dengan efek */}
          <AnimatePresence>
            {showDetail && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="mt-6 text-black border-t border-gray-300 pt-4 bg-gray-50 rounded-lg shadow-sm p-4"
              >
                <div className="flex mt-3 items-center">
                  <div className="w-[140px]">Tanggal Selesai</div>
                  <input
                    type="text"
                    value={data.tanggalSelesai}
                    onChange={(e) => updateField("tanggalSelesai", e.target.value)}
                    className="border-b border-black bg-white outline-none px-2 py-1 text-sm w-[150px]"
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
                  />
                </div>

                <div className="flex mt-3">
                  <div className="w-[140px]">Uraian Pekerjaan</div>
                  <div className="flex-1">
                    <EditableBox value={data.uraianPekerjaan} onChange={(v) => updateField("uraianPekerjaan", v)} />
                  </div>
                </div>

                <div className="mt-6 flex items-start">
                  <div className="w-[140px]">Status Pekerjaan</div>
                  <div className="flex items-center gap-8">
                    {['Selesai', 'Belum Selesai'].map((s) => (
                      <div key={s} className="flex items-center gap-2 cursor-pointer" onClick={() => toggleStatus(s)}>
                        <div
                          style={{
                            width: 18,
                            height: 18,
                            border: "1px solid #000",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
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
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}