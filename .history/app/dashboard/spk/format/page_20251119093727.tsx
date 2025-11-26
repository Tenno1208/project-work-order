"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
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

// Mendefinisikan ulang motion dan AnimatePresence agar kode dapat berjalan
const motion = { div: ({ children, ...props }) => <div {...props}>{children}</div> };
const AnimatePresence = ({ children }) => <>{children}</>;

// --- TYPES (untuk Personel) ---
type PersonAssigned = {
    name: string;
    npp: string | null;
    jabatan: string | null;
    isPic: boolean;
};

// --- Komponen Chip ---
const Chip = ({ person, onRemove, onTogglePic }: { person: PersonAssigned, onRemove: (name: string) => void, onTogglePic: (name: string) => void }) => (
    <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mr-2 my-1 shadow-sm border border-blue-200">
        
        {/* Tombol Radio Centang (Penanggung Jawab) */}
        <div 
            className="cursor-pointer mr-2 flex items-center justify-center transition-colors duration-200" 
            onClick={() => onTogglePic(person.name)}
            title="Set sebagai Penanggung Jawab (PIC)"
        >
            {person.isPic ? (
                // Centang Hijau jika PIC
                <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" />
            ) : (
                // Lingkaran Kosong jika bukan PIC
                <div className="w-4 h-4 border-2 border-blue-400 rounded-full hover:bg-blue-200"></div>
            )}
        </div>

        <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        {person.name}
        <X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" onClick={() => onRemove(person.name)} />
    </div>
);


export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState({
    assignedPeople: [] as PersonAssigned[], 
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
    jenisPekerjaan: "",
  });

  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState<{ id: string | number; nama: string }[]>([]);
  const [currentPersonInput, setCurrentPersonInput] = useState("");
  const [isAssigning, setIsAssigning] = useState(false); 

  // --- STATE UNTUK DATA PEGAWAI DARI API EKSTERNAL ---
  const [pegawaiList, setPegawaiList] = useState<{ name: string, npp: string | null, jabatan: string | null }[]>([]); 
  const [isLoadingPegawai, setIsLoadingPegawai] = useState(false); 
  // --- STATE BARU UNTUK DROPDOWN KUSTOM ---
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null); 
  
  // 🔹 FETCH DATA JENIS PEKERJAAN
  useEffect(() => {
    const fetchJenisPekerjaan = async () => {
      // ... (Logika fetch Jenis Pekerjaan tetap sama)
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const res = await fetch("/api/jenis-pekerjaan", {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });
        const json = await res.json();
        if (json?.success && Array.isArray(json.data)) {
          const mappedOptions = json.data.map((item: any) => ({ id: item.id, nama: item.nama }));
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
        if (!token) return;

        const apiUrl = "/api/pegawai-proxy/all-pegawai"; 
        
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}` }, cache: "no-store",
        });

        if (!res.ok) {
          const errorDetail = await res.json();
          console.error("Error fetching pegawai:", errorDetail);
          return;
        }

        const json = await res.json();
        const dataArray = json.data || json; 

        if (Array.isArray(dataArray)) {
          const formattedPegawai = dataArray
            .map((item: any) => ({
              name: item.nama_pegawai || item.nama || null,
              npp: item.npp || null,
              jabatan: item.jabatan || item.position || null,
            }))
            .filter(person => person.name && person.name.trim() !== '');

          setPegawaiList(formattedPegawai);
        } else {
          console.error("Format data Pegawai tidak sesuai.");
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

  const updateField = (key: keyof typeof data, value: any) =>
    setData((s) => ({ ...s, [key]: value }));

  const formatTanggal = (val: string) => {
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  const toggleStatus = (val: string) =>
    setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  // --- LOGIKA CHIP PERSONEL ---

  // Fungsi untuk mencari detail NPP dan Jabatan dari pegawaiList
  const getPersonDetail = (name: string) => {
    return pegawaiList.find(p => p.name === name) || { npp: null, jabatan: null };
  };

  // Fungsi untuk filter saran (disimpan sebagai variabel karena bergantung pada state)
  const filteredSuggestions = pegawaiList.filter(p => {
      // 1. Filter yang sudah ditugaskan
      const alreadyAssigned = data.assignedPeople.some(ap => ap.name === p.name);
      if (alreadyAssigned) return false;

      // 2. Filter berdasarkan input user (case-insensitive search di name atau npp)
      const inputLower = currentPersonInput.toLowerCase();
      if (inputLower.length < 2) return false; // Minimal 2 karakter untuk memicu saran
      
      return (
          p.name.toLowerCase().includes(inputLower) ||
          p.npp?.toLowerCase().includes(inputLower)
      );
  });

  const handleAddPerson = (nameOverride?: string) => {
    const name = (nameOverride || currentPersonInput).trim();
    if (!name) return;

    // Cek apakah nama sudah ada
    if (data.assignedPeople.some(p => p.name === name)) {
      setCurrentPersonInput("");
      return;
    }
    
    const detail = getPersonDetail(name);
    
    // Tentukan apakah ini akan menjadi PIC pertama
    const isFirstPerson = data.assignedPeople.length === 0;

    const newPerson: PersonAssigned = {
        name: name,
        npp: detail.npp,
        jabatan: detail.jabatan, 
        isPic: isFirstPerson, 
    };

    setData(s => ({ 
        ...s, 
        assignedPeople: [...s.assignedPeople, newPerson] 
    }));
    setCurrentPersonInput("");
    setShowSuggestions(false);
  };

  // 🔹 Handler untuk memilih dari saran
  const handleSelectSuggestion = (personName: string) => {
    handleAddPerson(personName); // Tambahkan langsung setelah memilih
    setCurrentPersonInput("");
    setShowSuggestions(false);
    inputRef.current?.focus(); // Fokus kembali ke input setelah memilih
  };


  const handleRemovePerson = (nameToRemove: string) => {
    let newAssignedPeople = data.assignedPeople.filter(p => p.name !== nameToRemove);
    
    const removedPersonIsPic = data.assignedPeople.find(p => p.name === nameToRemove)?.isPic;

    if (removedPersonIsPic && newAssignedPeople.length > 0) {
        // Atur orang pertama yang tersisa sebagai PIC baru
        newAssignedPeople = newAssignedPeople.map((p, index) => ({
            ...p,
            isPic: index === 0 ? true : p.isPic, 
        }));
    }

    setData(s => ({
      ...s,
      assignedPeople: newAssignedPeople,
    }));
  };

  const handleTogglePic = (nameToSetAsPic: string) => {
    setData(s => ({
        ...s,
        assignedPeople: s.assignedPeople.map(p => ({
            ...p,
            isPic: p.name === nameToSetAsPic, 
        }))
    }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); 
      
      // Jika saran muncul dan hanya ada satu, pilih saran itu
      if (filteredSuggestions.length === 1) {
        handleSelectSuggestion(filteredSuggestions[0].name);
      } else {
        // Jika tidak ada saran atau ada banyak, tambahkan input mentah
        handleAddPerson();
      }
    }
    
    if (e.key === 'Backspace' && currentPersonInput === '' && data.assignedPeople.length > 0) {
      const lastPersonName = data.assignedPeople[data.assignedPeople.length - 1].name;
      handleRemovePerson(lastPersonName);
    }
  };
  
  // --- LOGIKA API MENUGASKAN (Dibiarkan sama) ---
  const postTaskAssignment = async () => { /* ... */ };

  // --- KOMPONEN BANTUAN (EditableBox) ---
  const EditableBox = ({ value, onChange }: { value: string, onChange: (v: string) => void }) => (
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

  const handlePrint = () => { /* ... */ };


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
                <div className="flex-1 flex flex-col gap-1 relative"> {/* Tambah relative di sini */}
                  {/* CHIP INPUT BARU */}
                  <div className="flex flex-wrap items-center p-1 border border-gray-500 rounded-md bg-white min-h-[40px] focus-within:ring-2 focus-within:ring-blue-300">
                    
                    {/* Display Chips */}
                    {data.assignedPeople.map((person) => (
                      <Chip 
                        key={person.name} 
                        person={person} 
                        onRemove={handleRemovePerson}
                        onTogglePic={handleTogglePic}
                      />
                    ))}

                    {/* Input Field */}
                    <input
                      ref={inputRef}
                      type="text"
                      value={currentPersonInput}
                      onChange={(e) => {
                        setCurrentPersonInput(e.target.value);
                        // Tampilkan saran jika ada minimal 2 karakter
                        if (e.target.value.length > 1) setShowSuggestions(true);
                        else setShowSuggestions(false);
                    }}
                      onFocus={() => { if (currentPersonInput.length > 1) setShowSuggestions(true); }}
                      onBlur={() => {
                        // Beri delay untuk mengizinkan klik pada saran
                        setTimeout(() => setShowSuggestions(false), 200); 
                    }}
                      onKeyDown={handleKeyDown} 
                      placeholder={isLoadingPegawai 
                          ? "Memuat daftar pegawai..." 
                          : (data.assignedPeople.length === 0 ? "Ketik nama personel lalu tekan Enter..." : "")
                      }
                      className="flex-1 bg-transparent outline-none p-1 text-sm min-w-[100px]"
                      disabled={isLoadingPegawai}
                    />
                    
                    {/* Tombol Tambah */}
                    <Button 
                      onClick={() => handleAddPerson()} 
                      className="ml-2 px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full" 
                      disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
                    >
                        +
                    </Button>
                  </div>
                  {/* End Chip Input */}

                  {/* Dropdown Suggestions (Tampilan Mirip Gmail) */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full top-full mt-1 bg-white border border-gray-300 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                        {filteredSuggestions.slice(0, 7).map((person, index) => (
                            <div 
                                key={index}
                                // onMouseDown digunakan untuk menangkap klik sebelum onBlur menutup dropdown
                                onMouseDown={(e) => { 
                                    e.preventDefault(); // Mencegah onBlur input
                                    handleSelectSuggestion(person.name);
                                }}
                                className="flex flex-col p-2 cursor-pointer hover:bg-blue-50 transition-colors"
                            >
                                <div className="font-semibold text-sm text-gray-900">{person.name}</div>
                                <div className="text-xs text-gray-600">
                                    {person.jabatan} {person.npp ? `(NPP: ${person.npp})` : ''}
                                </div>
                            </div>
                        ))}
                      </div>
                  )}

                </div>
              </div>
              {/* ... (sisa code di bawah tetap sama) */}
              {/* ... (bagian tanggal selesai, jenis pekerjaan, id barang, dll) */}

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