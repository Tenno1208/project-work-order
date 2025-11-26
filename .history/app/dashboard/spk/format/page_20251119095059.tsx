"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, X, CheckCircle } from "lucide-react";
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

// Untuk kemudahan, kita definisikan ulang 'motion' dan 'AnimatePresence' agar kode bisa berjalan tanpa library 'framer-motion'
const motion = { div: ({ children, ...props }) => <div {...props}>{children}</div> };
// KOREKSI SINTAKS DI SINI: Hanya mengembalikan Fragment yang berisi children
const AnimatePresence = ({ children }) => <>{children}</>; 

// ----------------------
// Autocomplete Premium
// ----------------------
const AutoCompletePerson = ({
  inputValue,
  setInputValue,
  onSelect, // (name) => { setCurrentPersonInput(name); handleAddPerson(); }
  pegawaiList,
  assignedPeople,
  isLoadingPegawai,
  onKeyDownExtra, // e.g. handleKeyDown from parent to handle Backspace when input empty
}) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);

  // filtered suggestions (limit 10)
  const filtered = pegawaiList
    .filter(
      (p) =>
        p.name &&
        p.name.toLowerCase().includes((inputValue || "").toLowerCase()) &&
        !assignedPeople.some((a) => a.name === p.name)
    )
    .slice(0, 10);

  // highlight matching substring (returns JSX)
  const renderHighlighted = (text, query) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <span className="font-semibold underline decoration-2 decoration-blue-300">
          {text.substring(idx, idx + query.length)}
        </span>
        {text.substring(idx + query.length)}
      </>
    );
  };

  // Close on outside click
  useEffect(() => {
    const onDoc = (e) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Adjust highlight when filtered changes
  useEffect(() => {
    if (filtered.length === 0) {
      setHighlight(0);
    } else {
      setHighlight((h) => Math.min(h, filtered.length - 1));
    }
  }, [filtered.length]);

  // Ensure highlighted item is visible
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const el = listEl.querySelector(`[data-idx="${highlight}"]`);
    if (el) {
      const top = el.offsetTop;
      const bottom = top + el.offsetHeight;
      if (top < listEl.scrollTop) listEl.scrollTop = top;
      else if (bottom > listEl.scrollTop + listEl.clientHeight) listEl.scrollTop = bottom - listEl.clientHeight;
    }
  }, [highlight, open]);

  const handleKey = (e) => {
    // First allow parent to handle Backspace/hotkeys for chips
    if (onKeyDownExtra) onKeyDownExtra(e);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      setHighlight((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
    } else if (e.key === "Enter") {
      // Enter should pick highlighted suggestion if exists; otherwise let parent handle add from raw input
      if (open && filtered[highlight]) {
        e.preventDefault();
        const pick = filtered[highlight];
        onSelect(pick.name);
        setInputValue("");
        setOpen(false);
      }
      // else parent will handle (handleAddPerson)
    } else if (e.key === "Escape") {
      setOpen(false);
    } else {
      // other keys -> open
      if (!open) setOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[150px]"> {/* flex-1 agar input mengambil sisa ruang */}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setOpen(true);
        }}
        onKeyDown={handleKey}
        placeholder={isLoadingPegawai ? "Memuat daftar pegawai..." : (assignedPeople.length === 0 ? "Ketik nama personel lalu tekan Enter..." : "")}
        className="flex-1 bg-transparent outline-none p-1 text-sm w-full"
        disabled={isLoadingPegawai}
        aria-autocomplete="list"
        aria-expanded={open}
      />

      {/* Dropdown */}
      {open && (filtered.length > 0 || isLoadingPegawai) && (
        <div className="absolute left-0 top-full mt-1 w-[400px] max-w-[calc(100vw-40px)] max-h-64 overflow-hidden rounded-2xl shadow-2xl z-50"> 
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            {isLoadingPegawai ? (
              <div className="p-3 text-sm text-gray-500">Memuat pegawai...</div>
            ) : (
              <div
                ref={listRef}
                className="max-h-64 overflow-y-auto"
                role="listbox"
                tabIndex={-1}
              >
                {filtered.map((item, idx) => (
                  <div
                    key={item.npp + "-" + idx}
                    data-idx={idx}
                    onMouseDown={(e) => { // use onMouseDown to prevent input blur before click
                      e.preventDefault();
                      onSelect(item.name);
                      setInputValue("");
                      setOpen(false);
                    }}
                    onMouseEnter={() => setHighlight(idx)}
                    className={`flex items-center gap-3 px-3 py-2 cursor-pointer select-none transition-colors ${
                      idx === highlight ? "bg-blue-600 text-white" : "hover:bg-gray-50 text-gray-800"
                    }`}
                  >
                    {/* avatar initial */}
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      idx === highlight ? "bg-white/20" : "bg-gray-100"
                    } text-sm font-medium`}>
                      {item.nama ? item.nama[0] : item.name?.[0] || "?"}
                    </div>

                    <div className="flex-1 text-sm overflow-hidden"> {/* Menghilangkan truncate di sini */}
                      <div className="whitespace-normal">
                        <span className={idx === highlight ? "font-semibold" : "font-medium"}>
                          {/* highlight matched substring */}
                          {renderHighlighted(item.name || item.nama, inputValue)}
                        </span>
                      </div>
                      <div className={idx === highlight ? "text-white/90 text-xs" : "text-gray-500 text-xs"}>
                        {item.npp || "-"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen Chip yang menerima fungsi toggle PIC
const Chip = ({ person, onRemove, onTogglePic }) => (
    // Penyesuaian: Menghilangkan `truncate` pada span nama, dan memastikan padding/margin cukup
    <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mr-2 mb-2 shadow-sm border border-blue-200 h-fit max-w-full">
        
        {/* Tombol Radio Centang (Penanggung Jawab) */}
        <div 
            className="cursor-pointer mr-2 flex items-center justify-center transition-colors duration-200 flex-shrink-0" 
            onClick={() => onTogglePic(person.name)}
            title="Set sebagai Penanggung Jawab (PIC)"
        >
            {person.isPic ? (
                // Centang Hijau jika PIC
                <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" />
            ) : (
                // Lingkaran Kosong jika bukan PIC
                <div className="w-4 h-4 border-2 border-blue-400 rounded-full hover:bg-blue-200 flex-shrink-0"></div>
            )}
        </div>

        <svg className="w-4 h-4 mr-1 text-blue-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        {/* Show Nama (NPP) - Menghilangkan truncate */}
        <span className="whitespace-nowrap overflow-auto max-w-full">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
        <X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors flex-shrink-0" onClick={() => onRemove(person.name)} />
    </div>
);


export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState({
    // Sekarang menyimpan objek: { name: string, npp: string/null, isPic: boolean }
    assignedPeople: [], 
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
    jenisPekerjaan: "",
  });

  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<{ id: string | number; nama: string }[]>([]);
  const [currentPersonInput, setCurrentPersonInput] = useState("");
  const [isAssigning, setIsAssigning] = useState(false); // State untuk status loading API POST

  // --- STATE UNTUK DATA PEGAWAI DARI API EKSTERNAL ---
  const [pegawaiList, setPegawaiList] = useState([]); // Daftar nama pegawai dari API
  const [isLoadingPegawai, setIsLoadingPegawai] = useState(false); // Status loading data pegawai

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

  // 🔹 FETCH DATA SEMUA PEGAWAI DARI API EKSTERNAL (Menggunakan PROXY LOKAL)
  useEffect(() => {
    const fetchAllPegawai = async () => {
      setIsLoadingPegawai(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token tidak ditemukan di localStorage. Tidak dapat mengambil daftar pegawai.");
          return;
        }

        const apiUrl = "/api/pegawai-proxy/all-pegawai"; 
        
        const res = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        if (!res.ok) {
          // Log error 401/500 dari proxy
          const errorDetail = await res.json();
          console.error("Error fetching pegawai:", errorDetail);
          // throw new Error(`Proxy request failed with status: ${res.status}`);
          // Lanjutkan tanpa melempar error agar app tidak crash saat API tidak tersedia
          return;
        }

        const json = await res.json();
        
        // Asumsi struktur respons API: { data: [ {nama: '...' }, {nama_pegawai: '...'} ] }
        const dataArray = json.data || json; 

        if (Array.isArray(dataArray)) {
          // Kita akan menyimpan objek dengan nama, npp, dan jabatan untuk memudahkan.
          const formattedPegawai = dataArray
            .map(item => ({
              // Ambil nama dari field 'nama_pegawai' atau 'nama'
              name: item.nama_pegawai || item.nama || null,
              npp: item.npp || null,
              jabatan: item.jabatan || null,
            }))
            // Filter yang valid
            .filter(person => person.name && person.name.trim() !== '');

          setPegawaiList(formattedPegawai);
        } else {
          console.error("Format data Pegawai tidak sesuai. Mengharapkan array atau object dengan properti 'data'.");
        }

      } catch (err) {
        console.error("❌ Error ambil data Pegawai:", err);
      } finally {
        setIsLoadingPegawai(false);
      }
    };

    fetchAllPegawai();
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

  // Fungsi untuk mencari detail NPP dan Jabatan dari pegawaiList
  const getPersonDetail = (name) => {
    // Cari detail pegawai di list yang sudah diformat
    return pegawaiList.find(p => p.name === name) || { npp: null, jabatan: null };
  };

  const handleAddPerson = () => {
    const name = currentPersonInput.trim();
    if (!name) return;

    // Cek apakah nama sudah ada
    if (data.assignedPeople.some(p => p.name === name)) {
      setCurrentPersonInput("");
      return;
    }
    
    const detail = getPersonDetail(name);
    
    // Tentukan apakah ini akan menjadi PIC pertama
    // Hanya set PIC jika assignedPeople masih kosong
    const isFirstPerson = data.assignedPeople.length === 0;

    const newPerson = {
        name: name,
        npp: detail.npp,
        isPic: isFirstPerson, 
    };

    let updatedPeople;
    if (isFirstPerson) {
        // Jika orang pertama, tambahkan sebagai PIC
        updatedPeople = [newPerson];
    } else {
        // Jika bukan yang pertama, tambahkan biasa
        updatedPeople = [...data.assignedPeople, newPerson];
    }


    setData(s => ({ 
        ...s, 
        assignedPeople: updatedPeople 
    }));
    setCurrentPersonInput("");
  };

  const handleRemovePerson = (nameToRemove) => {
    let newAssignedPeople = data.assignedPeople.filter(p => p.name !== nameToRemove);
    
    // Cek apakah PIC yang dihapus
    const removedPersonIsPic = data.assignedPeople.find(p => p.name === nameToRemove)?.isPic;

    if (removedPersonIsPic && newAssignedPeople.length > 0) {
        // Atur orang pertama yang tersisa sebagai PIC baru
        newAssignedPeople = newAssignedPeople.map((p, index) => ({
            ...p,
            isPic: index === 0 ? true : p.isPic, // Set orang pertama sebagai PIC baru
        }));
    }

    setData(s => ({
      ...s,
      assignedPeople: newAssignedPeople,
    }));
  };

  const handleTogglePic = (nameToSetAsPic) => {
    setData(s => ({
        ...s,
        assignedPeople: s.assignedPeople.map(p => ({
            ...p,
            // Centang yang dipilih, uncentang yang lain
            isPic: p.name === nameToSetAsPic, 
        }))
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Mencegah form submit
      // If user hasn't selected suggestion, handleAddPerson will try to add by raw input
      handleAddPerson();
    }
    // Jika backspace dan input kosong, hapus chip terakhir
    if (e.key === 'Backspace' && currentPersonInput === '' && data.assignedPeople.length > 0) {
      const lastPersonName = data.assignedPeople[data.assignedPeople.length - 1].name;
      handleRemovePerson(lastPersonName);
    }
  };
  
  // --- LOGIKA API MENUGASKAN ---

  const postTaskAssignment = async () => {
    if (data.assignedPeople.length === 0) {
        console.error("Minimal harus ada satu personel yang ditugaskan.");
        return;
    }
    
    const pic = data.assignedPeople.find(p => p.isPic);
    if (!pic) {
        console.error("Harap tentukan satu Penanggung Jawab (PIC).");
        // Anda bisa menampilkan modal/notifikasi di sini
        return;
    }

    setIsAssigning(true);
    
    // Mengubah assignedPeople menjadi struktur stafs sesuai format API Anda
    const stafsPayload = data.assignedPeople.map(p => ({
        // Pastikan NPP digunakan jika tersedia, ini penting untuk API
        npp: p.npp || 'NPP_KOSONG', 
        nama: p.name,
        is_penanggung_jawab: p.isPic,
    }));
    
    // 1. Prepare data (menggunakan array stafs)
    const taskData = {
        stafs: stafsPayload, // Kunci payload yang benar untuk daftar personel
        tanggalSelesai: data.tanggalSelesai,
        idBarang: data.idBarang,
        uraianPekerjaan: data.uraianPekerjaan,
        jenisPekerjaan: data.jenisPekerjaan,
        // Data lain yang dibutuhkan API POST
    };

    try {
        const token = localStorage.getItem("token");
        if (!token) {
            console.error("Token not found. Cannot assign task.");
            setIsAssigning(false);
            return;
        }

        console.log("Menugaskan API Payload (Stafs):", stafsPayload);
        
        // --- SIMULASI PANGGILAN API /api/menugaskan (Ganti dengan kode real) ---
        await new Promise(resolve => setTimeout(resolve, 1500)); // Simulasi delay 1.5s
        
        // Asumsi jika berhasil
        setShowDetail(true);

    } catch (err) {
        console.error("❌ Error during task assignment:", err);
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
    
    const assignedNames = data.assignedPeople
        .map(p => `${p.name} ${p.isPic ? '(PIC)' : ''}`)
        .join(', ');

    finalPrintContents = finalPrintContents.replace(
      /class="flex flex-col gap-1 flex-1 print-hidden"/, 
      `class="flex flex-col gap-1 flex-1 print-hidden"`
    );
    
    // Add a print-friendly version of assigned people
    // Logic ini disesuaikan untuk menemukan tag pembuka <div> yang sesuai di HTML yang dihasilkan
    finalPrintContents = finalPrintContents.replace(
        `<div style="width: 140px; margin-top: 2px;">Menugaskan Sdr:</div>`, // Menggunakan margin-top: 2px dari update
        `<div style="display: flex;">
             <div style="width: 140px; margin-top: 4px;">Menugaskan Sdr:</div>
             <div style="flex: 1; margin-top: 4px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
                ${assignedNames || '....................................................................'}
             </div>
         </div>
         <div class="print-hidden">
             <div style="width: 140px; margin-top: 2px;">Menugaskan Sdr:</div>`
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
                {/* Disesuaikan margin-top menjadi mt-2 agar sejajar dengan baris pertama chip */}
                <div className="w-[140px] mt-2">Menugaskan Sdr:</div> 
                <div className="flex-1 flex flex-col gap-1">
                  {/* CHIP INPUT BARU: Kontainer Chip + Input */}
                  <div className="flex flex-wrap items-start p-1 border border-gray-500 rounded-md bg-white min-h-[40px] focus-within:ring-2 focus-within:ring-blue-300">
                    
                    {/* Display Chips */}
                    {/* Flex-wrap diaktifkan, dan chip diberi mr-2 mb-2 agar turun baris dengan rapi */}
                    {data.assignedPeople.map((person) => (
                      <Chip 
                        key={person.name} 
                        person={person} 
                        onRemove={handleRemovePerson}
                        onTogglePic={handleTogglePic}
                      />
                    ))}

                    {/* NEW: Autocomplete Premium and + Button */}
                    <div className="flex items-center flex-1 min-w-[150px] relative mt-1 mb-1">
                        <AutoCompletePerson
                          inputValue={currentPersonInput}
                          setInputValue={setCurrentPersonInput}
                          onSelect={(name) => {
                            // set input then call existing handleAddPerson which will lookup NPP from pegawaiList
                            // To preserve your original handleAddPerson behavior (it reads currentPersonInput),
                            // we set state then call handleAddPerson in next tick:
                            setCurrentPersonInput(name);
                            setTimeout(() => {
                              handleAddPerson();
                            }, 0);
                          }}
                          pegawaiList={pegawaiList}
                          assignedPeople={data.assignedPeople}
                          isLoadingPegawai={isLoadingPegawai}
                          onKeyDownExtra={handleKeyDown}
                        />

                        {/* Tombol + dipindahkan ke samping AutocompletePerson di dalam flex container */}
                        <Button 
                          onClick={() => handleAddPerson()} 
                          className="px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full h-fit flex-shrink-0" 
                          disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
                        >
                            +
                        </Button>
                    </div>

                  </div>
                  {/* End Chip Input */}

                </div>
              </div>

              <div>
                Untuk melaksanakan Pemeliharaan / Perbaikan / Pengaduan kerusakan
              </div>

              {!showDetail && (
                <Button
                  onClick={postTaskAssignment} 
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white transition-transform transform hover:scale-[1.01] shadow-lg"
                  disabled={isAssigning || data.assignedPeople.length === 0}
                >
                  {isAssigning ? "Menugaskan..." : "Tugaskan"}
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