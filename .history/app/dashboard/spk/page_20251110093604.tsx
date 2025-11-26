"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
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

  const updateField = (key: string, value: string) =>
    setData((s) => ({ ...s, [key]: value }));

  const handlePrint = () => {
    const content = docRef.current?.outerHTML;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    printWindow?.document.write(`
      <html>
        <head>
          <title>Surat Perintah Kerja</title>
          <style>
            @page { size: A4; margin: 18mm; }
            body {
              font-family: 'Times New Roman', serif;
              color: #000;
              background: white;
            }
            .bordered {
              border: 1px solid #000;
              padding: 32px;
              border-radius: 6px;
              width: 100%;
              box-sizing: border-box;
            }
            h2 {
              text-align: center;
              text-decoration: underline;
              font-weight: bold;
              font-size: 16px;
              margin-bottom: 16px;
            }
            .section {
              margin-top: 10px;
              line-height: 1.5;
              font-size: 13px;
            }
            .flex {
              display: flex;
              align-items: flex-start;
              gap: 8px;
            }
            .space-y-4 > * + * { margin-top: 12px; }
            .border-input {
              border: 1px solid #444;
              border-radius: 4px;
              padding: 2px 6px;
              min-width: 120px;
            }
            select, input {
              border: none;
              border-bottom: 1px solid #000;
              outline: none;
              width: 100%;
              font-family: inherit;
              font-size: 13px;
              background: transparent;
            }
            .uraian {
              border: 1px solid #000;
              border-radius: 4px;
              padding: 8px;
              min-height: 100px;
              white-space: pre-wrap;
            }
            .sign {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              text-align: center;
            }
            .sign div {
              width: 45%;
            }
            .checkbox {
              display: inline-flex;
              align-items: center;
              gap: 6px;
              cursor: pointer;
            }
            .box {
              width: 18px;
              height: 18px;
              border: 1px solid #000;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow?.document.close();
    setTimeout(() => printWindow?.print(), 500);
  };

  const EditableBox = ({ value, onChange }: any) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(e: any) => onChange(e.currentTarget.innerText || "")}
      className="uraian"
    >
      {value || " "}
    </div>
  );

  const toggleStatus = (val: string) =>
    setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  const daftarNama = [
    "Budi Santoso",
    "Siti Rahma",
    "Andi Wijaya",
    "Dewi Lestari",
    "Rudi Hartono",
  ];

  const formatTanggal = (val: string) => {
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100">
      <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-lg rounded-lg">
        <div className="flex items-center justify-between border-b px-6 py-3 bg-gray-50">
          <h1 className="text-base font-semibold text-gray-800">
            Surat Perintah Kerja (SPK) — Editable
          </h1>
          <Button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Cetak (A4)
          </Button>
        </div>

        <div ref={docRef} className="p-8 text-[13px] leading-relaxed font-serif">
          <div className="bordered">
            <h2>SURAT PERINTAH KERJA</h2>

            <div className="section space-y-4">
              <div className="flex">
                <div className="w-[130px] mt-2">Menugaskan Sdr:</div>
                <div className="flex flex-col gap-2 flex-1">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div>{i}.</div>
                      <select
                        value={data[`menugaskan${i}` as keyof typeof data]}
                        onChange={(e) =>
                          updateField(`menugaskan${i}`, e.target.value)
                        }
                      >
                        <option value="">--- Pilih nama ---</option>
                        {daftarNama.map((nama) => (
                          <option key={nama} value={nama}>
                            {nama}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan
              </div>

              {!showDetail && (
                <Button
                  onClick={() => setShowDetail(true)}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Selesai
                </Button>
              )}
            </div>

            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.5 }}
                  className="section border-t border-gray-300 pt-4"
                >
                  <div className="flex mt-3 items-center">
                    <div className="w-[140px]">Tanggal Selesai</div>
                    <div
                      onClick={() => setShowDateModal(true)}
                      className="border-input cursor-pointer"
                    >
                      {data.tanggalSelesai}
                    </div>
                  </div>

                  {/* Modal tanggal */}
                  <AnimatePresence>
                    {showDateModal && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
                      >
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.9, opacity: 0 }}
                          className="bg-white p-6 rounded-lg shadow-xl"
                        >
                          <h3 className="text-lg font-semibold mb-4">
                            Pilih Tanggal Selesai
                          </h3>
                          <input
                            type="date"
                            className="border border-gray-400 rounded-md px-3 py-2 text-sm w-full"
                            onChange={(e) =>
                              updateField(
                                "tanggalSelesai",
                                formatTanggal(e.target.value)
                              )
                            }
                          />
                          <div className="flex justify-end gap-3 mt-5">
                            <Button
                              variant="outline"
                              onClick={() => setShowDateModal(false)}
                            >
                              Batal
                            </Button>
                            <Button
                              onClick={() => setShowDateModal(false)}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Simpan
                            </Button>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex mt-4">
                    <div className="w-[140px]">Jenis Pekerjaan</div>
                    <div className="flex-1">
                      <div>1. Pemeliharaan Jaringan</div>
                      <div>2. Komputer</div>
                      <div>3. Printer</div>
                      <div>4. Monitor</div>
                      <div>5. ....</div>
                    </div>
                  </div>

                  <div className="flex mt-4 items-center">
                    <div className="w-[140px]">ID Barang</div>
                    <input
                      type="text"
                      value={data.idBarang}
                      onChange={(e) => updateField("idBarang", e.target.value)}
                      placeholder="(Ketik ID barang...)"
                    />
                  </div>

                  <div className="flex mt-4">
                    <div className="w-[140px]">Uraian Pekerjaan</div>
                    <div className="flex-1">
                      <EditableBox
                        value={data.uraianPekerjaan}
                        onChange={(v) => updateField("uraianPekerjaan", v)}
                      />
                    </div>
                  </div>

                  <div className="mt-6 flex items-start">
                    <div className="w-[140px]">Status Pekerjaan</div>
                    <div className="flex items-center gap-8">
                      {["Selesai", "Belum Selesai"].map((s) => (
                        <div
                          key={s}
                          className="checkbox"
                          onClick={() => toggleStatus(s)}
                        >
                          <div className="box">
                            {data.status === s ? "✓" : ""}
                          </div>
                          <div>{s}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="sign">
                    <div>
                      <div>Mengetahui</div>
                      <div>Ka. Bid Pengembangan Program</div>
                      <div style={{ height: 70 }}></div>
                      <div className="font-bold border-t inline-block mt-1">
                        Arief Endrawan J, S.E.
                      </div>
                      <div>NPP.690839804</div>
                    </div>

                    <div>
                      <div>Ka. Sub Bid TI</div>
                      <div style={{ height: 70 }}></div>
                      <div className="font-bold border-t inline-block mt-1">
                        A. Sigit Dwiyoga, S.Kom.
                      </div>
                      <div>NPP.690830502</div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
