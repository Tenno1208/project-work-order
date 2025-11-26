"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, X } from "lucide-react";
// Mengasumsikan Button diimpor dari shadcn/ui atau sejenisnya
const Button = ({ onClick, children, className = "bg-blue-600 hover:bg-blue-700 text-white", disabled = false }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    disabled={disabled}
  >
    {children}
  </button>
);

const motion = { div: ({ children, ...props }) => <div {...props}>{children}</div> };
const AnimatePresence = ({ children }) => <>{children}</>;


export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState({
    assignedPeople: [], // KONSOLIDASI: Menggunakan array untuk menampung nama yang ditugaskan (chips)
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
    jenisPekerjaan: "",
  });

  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<{ id: string | number; nama: string }[]>([]);
  const [currentPersonInput, setCurrentPersonInput] = useState("");
  const [isAssigning, setIsAssigning] = useState(false); // State untuk status loading API

  // Daftar Personel Dummy (akan diganti dengan API /api/daftar-personel)
  const daftarNama = [
    "Budi Santoso",
    "Siti Rahma",
    "Andi Wijaya",
    "Dewi Lestari",
    "Rudi Hartono",
    "Joko Susilo",
    "Fahmi Azzam",
  ];

  // 🔹 FETCH DATA JENIS PEKERJAAN
  useEffect(() => {
    const fetchJenisPekerjaan = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token tidak ditemukan di localStorage");
          return;
        }

        const res = await fetch("/api/jenis-pekerjaan", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        const json = await res.json();
        
        if (json?.success && Array.isArray(json.data)) {
          const mappedOptions = json.data.map((item) => ({
            id: item.id,
            nama: item.nama, 
          }));
          setJenisPekerjaanOptions(mappedOptions);
        } else {
          console.error("Format data Jenis Pekerjaan tidak sesuai:", json?.message || "Data kosong/format salah");
        }
      } catch (err) {
        console.error("❌ Error ambil data Jenis Pekerjaan (client side):", err);
      }
    };

    fetchJenisPekerjaan();
  }, []);

  const docRef = useRef(null);

  useEffect(() => {
    // Set tanggal selesai default ke hari ini
    const today = new Date();
    const formatted = today.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    setData((s) => ({ ...s, tanggalSelesai: formatted }));
  }, []);

  const updateField = (key, value) =>
    setData((s) => ({ ...s, [key]: value }));

  const formatTanggal = (val) => {
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  const toggleStatus = (val) =>
    setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  // --- LOGIKA CHIP PERSONEL ---

  const handleAddPerson = () => {
    const name = currentPersonInput.trim();
    if (name && !data.assignedPeople.includes(name)) {
      setData(s => ({ ...s, assignedPeople: [...s.assignedPeople, name] }));
      setCurrentPersonInput("");
    }
  };

  const handleRemovePerson = (nameToRemove) => {
    setData(s => ({
      ...s,
      assignedPeople: s.assignedPeople.filter(name => name !== nameToRemove),
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Mencegah form submit
      handleAddPerson();
    }
    // Jika backspace dan input kosong, hapus chip terakhir
    if (e.key === 'Backspace' && currentPersonInput === '' && data.assignedPeople.length > 0) {
      setData(s => ({
        ...s,
        assignedPeople: s.assignedPeople.slice(0, -1)
      }));
    }
  };
  
  // --- LOGIKA API MENUGASKAN ---

  const postTaskAssignment = async () => {
    if (data.assignedPeople.length === 0) {
        console.error("Minimal harus ada satu personel yang ditugaskan.");
        // Ganti dengan UI modal error yang sesuai
        return;
    }

    setIsAssigning(true);
    
    // 1. Prepare data (menggunakan array assignedPeople)
    const taskData = {
        menugaskan: data.assignedPeople,
        tanggalSelesai: data.tanggalSelesai,
        idBarang: data.idBarang,
        uraianPekerjaan: data.uraianPekerjaan,
        jenisPekerjaan: data.jenisPekerjaan,
        // Status diabaikan saat POST, namun disertakan jika diperlukan
    };

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("Token not found. Cannot assign task.");
            setIsAssigning(false);
            return;
        }

        console.log("Menugaskan API Payload:", taskData);
        
        // --- SIMULASI PANGGILAN API /api/menugaskan ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulasi delay 1.5s
        
        /*
        // UNCOMMENT THIS BLOCK FOR REAL API CALL
        const res = await fetch("/api/menugaskan", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(taskData),
        });

        const result = await res.json();
        
        if (res.ok && result.success) {
            console.log("Task successfully assigned:", result.data);
            setShowDetail(true);
        } else {
            console.error("Failed to assign task:", result.message || "Unknown error");
            // Tampilkan pesan error ke user
        }
        */

        // Untuk demonstrasi, asumsikan sukses
        setShowDetail(true);

    } catch (err) {
        console.error("❌ Error during task assignment:", err);
        // Tampilkan pesan error koneksi ke user
    } finally {
        setIsAssigning(false);
    }
  };

  // --- KOMPONEN BANTUAN ---

  const EditableBox = ({ value, onChange }) => (
    <div
      contentEditable
      suppressContentEditableWarning
      onInput={(e) => onChange(e.currentTarget.innerText || "")}
      className="min-h-[140px] p-2 text-black bg-white border border-gray-300 rounded-md shadow-inner"
      style={{ outline: "none", whiteSpace: "pre-wrap", cursor: 'text' }}
    >
      {value || "Masukkan uraian pekerjaan di sini..."}
    </div>
  );

  const Chip = ({ name, onRemove }) => (
    <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mr-2 my-1 shadow-sm border border-blue-200">
      <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
      </svg>
      {name}
      <X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" onClick={onRemove} />
    </div>
  );


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
            body { 
                font-family: 'Times New Roman', serif; 
                color: #000;
                /* Reset margin for print */
                margin: 0;
                padding: 0;
            }
            .bordered {
              border: 1px solid #000;
              padding: 20px;
              min-height: 270mm;
              box-sizing: border-box; /* Pastikan padding tidak menambah ukuran */
            }
            .print-only-text {
                font-size: 13px;
                line-height: 1.5;
            }
            .print-hidden {
                display: none !important;
            }
            /* Menyesuaikan tampilan untuk cetak */
            .input-replacement {
                border-bottom: 1px solid #000;
                display: inline-block;
                min-width: 150px;
                padding: 0 4px;
            }
            /* Pastikan chips terlihat seperti teks biasa saat dicetak */
            .chip {
                border: 1px dashed #999;
                padding: 2px 5px;
                margin: 2px;
                display: inline-block;
                background-color: #f0f0f0;
                font-style: italic;
            }
          </style>
        </head>
        <body>
            <div class="print-only-text">
                ${printContents.replace(/class="flex flex-wrap items-center"/g, 'class="flex flex-wrap items-center print-hidden"')}
            </div>
        </body>
      </html>
    `);
    
    // Fallback for better print display for assigned people in print view
    let finalPrintContents = win.document.body.innerHTML;
    const assignedNames = data.assignedPeople.join(', ');
    finalPrintContents = finalPrintContents.replace(
      /class="flex flex-col gap-1 flex-1 print-hidden"/, 
      `class="flex flex-col gap-1 flex-1 print-hidden"`
    );
    
    // Add a print-friendly version of assigned people
    finalPrintContents = finalPrintContents.replace(
        `<div className="w-[140px] mt-1">Menugaskan Sdr:</div>`,
        `<div style="display: flex;">
             <div style="width: 140px; margin-top: 4px;">Menugaskan Sdr:</div>
             <div style="flex: 1; margin-top: 4px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
                ${assignedNames || '....................................................................'}
             </div>
         </div>
         <div class="print-hidden">
             <div className="w-[140px] mt-1">Menugaskan Sdr:</div>`
    );


    win.document.body.innerHTML = finalPrintContents;
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };


  return (
    <div className="p-6 min-h-screen bg-gray-100 font-inter">
      <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-xl rounded-xl">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b px-6 py-3 bg-gray-50 rounded-t-xl">
          <h1 className="text-lg font-bold text-gray-800">
            Surat Perintah Kerja (SPK)
          </h1>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
            Cetak (A4)
          </Button>
        </div>

        {/* Isi dokumen */}
        <div ref={docRef} className="p-8 text-[13px] leading-relaxed font-serif">
          <div className="border-2 border-black p-8 rounded-md bordered bg-white shadow-lg">
            <h2
              className="text-center font-bold underline mb-4 text-black"
              style={{ fontSize: 16 }}
            >
              SURAT PERINTAH KERJA
            </h2>

            {/* Bagian awal */}
            <div className="mt-2 text-black space-y-4">
              <div className="flex items-start mt-2">
                <div className="w-[140px] mt-2">Menugaskan Sdr:</div>
                <div className="flex-1 flex flex-col gap-1">
                  {/* CHIP INPUT BARU */}
                  <div className="flex flex-wrap items-center p-1 border border-gray-500 rounded-md bg-white min-h-[40px] focus-within:ring-2 focus-within:ring-blue-300">
                    
                    {/* Display Chips */}
                    {data.assignedPeople.map((name) => (
                      <Chip key={name} name={name} onRemove={() => handleRemovePerson(name)} />
                    ))}

                    {/* Input Field */}
                    <input
                      type="text"
                      value={currentPersonInput}
                      onChange={(e) => setCurrentPersonInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={data.assignedPeople.length === 0 ? "Ketik nama personel lalu tekan Enter..." : ""}
                      list="personnel-list"
                      className="flex-1 bg-transparent outline-none p-1 text-sm min-w-[100px]"
                    />
                    
                    {/* Simple Datalist for suggesting names (simulation of auto-complete) */}
                    <datalist id="personnel-list">
                      {daftarNama
                        .filter(name => !data.assignedPeople.includes(name))
                        .map(name => (
                          <option key={name} value={name} />
                      ))}
                    </datalist>
                    
                    <Button onClick={handleAddPerson} className="ml-2 px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full" >
                        +
                    </Button>
                  </div>
                  {/* End Chip Input */}

                </div>
              </div>

              <div>
                Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan
              </div>

              {!showDetail && (
                <Button
                  onClick={postTaskAssignment} // Panggil API saat Selesai ditekan
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white transition-transform transform hover:scale-[1.01] shadow-lg"
                  disabled={isAssigning || data.assignedPeople.length === 0}
                >
                  {isAssigning ? "Menugaskan..." : "Selesai & Lanjut Detail"}
                </Button>
              )}
            </div>

            {/* Bagian bawah (detail) */}
            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mt-6 text-black border-t-2 border-gray-300 pt-4 rounded-lg bg-gray-50 p-5 shadow-inner"
                >
                {/* Tanggal selesai */}
                <div className="flex mt-3 items-center">
                  <div className="w-[140px] font-medium">Tanggal Selesai</div>
                  <div className="relative">
                    <input
                      type="date"
                      value={
                        data.tanggalSelesai.split("/").reverse().join("-")  
                      }
                      onChange={(e) =>
                        updateField("tanggalSelesai", formatTanggal(e.target.value))
                      }
                      className="border border-gray-400 rounded-lg bg-white outline-none px-3 py-1.5 text-sm w-[180px] focus:ring-2 focus:ring-blue-500 transition-shadow"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                  </div>
                </div>

                {/* JENIS PEKERJAAN */}
                <div className="flex mt-4 items-center">
                    <div className="w-[140px] font-medium">Jenis Pekerjaan</div>
                    <select
                        value={data.jenisPekerjaan}
                        onChange={(e) => updateField("jenisPekerjaan", e.target.value)}
                        className="border border-gray-400 rounded-lg bg-white text-sm py-1.5 px-3 w-full max-w-sm focus:ring-2 focus:ring-blue-500 transition-shadow"
                    >
                        <option value="">
                            {jenisPekerjaanOptions.length > 0 ? "-- Pilih Jenis Pekerjaan --" : "Memuat Data..."}
                        </option>
                        {jenisPekerjaanOptions.map((jp) => (
                            <option key={jp.id} value={jp.nama}>
                                {jp.nama}
                            </option>
                        ))}
                    </select>
                </div>

                {/* ID Barang */}
                <div className="flex mt-4 items-center">
                  <div className="w-[140px] font-medium">ID Barang</div>
                  <input
                    type="text"
                    value={data.idBarang}
                    onChange={(e) => updateField("idBarang", e.target.value)}
                    placeholder="(Ketik ID barang...)"
                    className="border border-gray-400 rounded-lg bg-white outline-none px-3 py-1.5 text-sm flex-1 focus:ring-2 focus:ring-blue-500 transition-shadow"
                  />
                </div>

                {/* Uraian */}
                <div className="flex mt-4">
                  <div className="w-[140px] pt-2 font-medium">Uraian Pekerjaan</div>
                  <div className="flex-1">
                    <EditableBox
                      value={data.uraianPekerjaan}
                      onChange={(v) => updateField("uraianPekerjaan", v)}
                    />
                  </div>
                </div>

                {/* Status */}
                <div className="mt-6 flex items-start">
                  <div className="w-[140px] font-medium">Status Pekerjaan</div>
                  <div className="flex items-center gap-8">
                    {["Selesai", "Belum Selesai"].map((s) => (
                      <div
                        key={s}
                        className="flex items-center gap-2 cursor-pointer select-none"
                        onClick={() => toggleStatus(s)}
                      >
                        <div
                          className="w-5 h-5 border-2 border-black flex items-center justify-center rounded-sm transition-colors"
                          style={{
                            backgroundColor: data.status === s ? '#000' : '#fff',
                            color: data.status === s ? '#fff' : '#000',
                          }}
                        >
                          {data.status === s ? "✓" : ""}
                        </div>
                        <div className="text-sm">{s}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tanda tangan */}
                <div className="mt-12 flex justify-between">
                  <div className="w-1/2 text-center">
                    <div>Mengetahui</div>
                    <div className="font-semibold">Ka. Bid Pengembangan Program</div>
                    <div style={{ height: 70 }}></div>
                    <div className="font-bold border-t inline-block mt-1 pt-1 text-black">
                      Arief Endrawan J, S.E.
                    </div>
                    <div className="text-xs">NPP.690839804</div>
                  </div>

                  <div className="w-1/2 text-center">
                    <div>Menyetujui</div>
                    <div className="font-semibold">Ka. Sub Bid TI</div>
                    <div style={{ height: 70 }}></div>
                    <div className="font-bold border-t inline-block mt-1 pt-1 text-black">
                      A. Sigit Dwiyoga, S.Kom.
                    </div>
                    <div className="text-xs">NPP.690830502</div>
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