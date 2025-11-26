"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Calendar, X, CheckCircle, Search, Loader2 } from "lucide-react";
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

// --- TYPES ---
type PersonDetail = { name: string; npp: string | null; jabatan: string | null };

// Komponen Dropdown Gmail-style
const GmailDropdown = ({ 
  items, 
  onSelect, 
  isOpen, 
  setIsOpen, 
  inputValue, 
  assignedPeople
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  
  // --- LOGIC FILTER DIPERBAIKI ---
  const filteredItems = items.filter((item: PersonDetail) => {
    // 1. Cek apakah sudah ditugaskan
    const isAlreadyAssigned = assignedPeople.some((assigned: PersonDetail) => 
      assigned.npp === item.npp
    );
    
    // 2. Cek kecocokan input
    const matchesInput = item.name.toLowerCase().includes(inputValue.toLowerCase());
    
    return !isAlreadyAssigned && matchesInput;
  });

  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [setIsOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || filteredItems.length === 0) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredItems[highlightedIndex]) {
          handleSelect(filteredItems[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  // --- DIPERBAIKI: Mengirim seluruh objek item ---
  const handleSelect = (item: PersonDetail) => {
    onSelect(item);
    setIsOpen(false);
  };

  // Highlight matching text
  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === query.toLowerCase() ? 
        <span key={i} className="font-bold">{part}</span> : part
    );
  };

  if (!isOpen || filteredItems.length === 0) return null;

  return (
    <div 
      ref={dropdownRef}
      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
      onKeyDown={handleKeyDown}
    >
      {filteredItems.map((item, index) => (
        <div
          key={item.npp || index}
          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${
            index === highlightedIndex ? 'bg-gray-100' : ''
          }`}
          onClick={() => handleSelect(item)}
        >
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center mr-3">
            <span className="text-sm font-medium text-gray-600">
              {item.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-sm">
              {highlightMatch(item.name, inputValue)}
            </div>
            <div className="text-xs text-gray-500">
              {item.npp ? `NPP: ${item.npp}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Komponen Chip yang menerima fungsi toggle PIC
const Chip = ({ person, onRemove, onTogglePic }) => (
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
        {/* Menampilkan nama lengkap dengan NPP jika ada */}
        <span className="font-medium">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
        <X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" onClick={() => onRemove(person.name)} />
    </div>
);


export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState({
    // Sekarang menyimpan objek: { name: string, npp: string/null, isPic: boolean }
    assignedPeople: [] as (PersonDetail & { isPic: boolean })[], 
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
  const [pegawaiList, setPegawaiList] = useState<PersonDetail[]>([]); // Daftar nama pegawai dari API
  const [isLoadingPegawai, setIsLoadingPegawai] = useState(false); // Status loading data pegawai
  
  // State untuk dropdown
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
          const mappedOptions = json.data.map((item: any) => ({
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
          const errorDetail = await res.json();
          console.error("Error fetching pegawai:", errorDetail);
          return;
        }

        const json = await res.json();
        
        const dataArray = json.data || json; 

        if (Array.isArray(dataArray)) {
          const formattedPegawai: PersonDetail[] = dataArray
            .map((item: any) => ({
              // Menggunakan nama dari API
              name: item.nama_pegawai || item.name || item.nama || null,
              npp: item.npp?.toString() || null, // Pastikan NPP berupa string atau null
              jabatan: item.jabatan || item.position || null,
            }))
            .filter((person: PersonDetail) => person.name && person.name.trim() !== '');

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

  const updateField = (key: keyof typeof data, value: string) =>
    setData((s) => ({ ...s, [key]: value }));

  const formatTanggal = (val: string) => {
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  const toggleStatus = (val: string) =>
    setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  // --- LOGIKA CHIP PERSONEL ---

  // Fungsi ini sudah tidak diperlukan karena dropdown mengirimkan objek lengkap
  // const getPersonDetail = (name) => { ... }


  // --- LOGIC UTAMA PENAMBAHAN PERSONEL ---
  const handleAddPerson = useCallback((selectedItem: PersonDetail | null = null) => {
    let nameToAdd: string;
    let nppToAdd: string | null;

    if (selectedItem) {
        // KASUS 1: Dipilih dari Dropdown (selectedItem adalah objek Pegawai dari API)
        nameToAdd = selectedItem.name;
        nppToAdd = selectedItem.npp;
    } else {
        // KASUS 2: Dienter/klik '+' dari Input (cari detailnya berdasarkan input)
        nameToAdd = currentPersonInput.trim();
        if (!nameToAdd) return;
        
        const detail = pegawaiList.find(p => p.name.toLowerCase() === nameToAdd.toLowerCase());
        
        // Jika detail ditemukan, gunakan detail lengkapnya, jika tidak gunakan input mentah
        nameToAdd = detail ? detail.name : nameToAdd;
        nppToAdd = detail ? detail.npp : null;
    }

    // 1. Cek Duplikasi (berdasarkan NPP atau Nama jika NPP tidak ada)
    const isDuplicate = data.assignedPeople.some(p => p.npp === nppToAdd || (!p.npp && p.name.toLowerCase() === nameToAdd.toLowerCase()));
    
    if (isDuplicate) {
        setCurrentPersonInput("");
        setIsDropdownOpen(false);
        return;
    }
    
    const isFirstPerson = data.assignedPeople.length === 0;

    const newPerson = {
        name: nameToAdd,
        npp: nppToAdd,
        isPic: isFirstPerson, 
    };

    let updatedPeople = [...data.assignedPeople, newPerson];

    setData(s => ({ 
        ...s, 
        assignedPeople: updatedPeople 
    }));
    
    setCurrentPersonInput("");
    setIsDropdownOpen(false);

  }, [currentPersonInput, data.assignedPeople, pegawaiList]);
  // --- AKHIR LOGIC UTAMA PENAMBAHAN PERSONEL ---


  const handleRemovePerson = (nameToRemove: string) => {
    let newAssignedPeople = data.assignedPeople.filter(p => p.name !== nameToRemove);
    
    // Cek apakah PIC yang dihapus
    const removedPersonIsPic = data.assignedPeople.find(p => p.name === nameToRemove)?.isPic;

    if (removedPersonIsPic && newAssignedPeople.length > 0) {
        // Atur orang pertama yang tersisa sebagai PIC baru
        newAssignedPeople = newAssignedPeople.map((p, index) => ({
            ...p,
            isPic: index === 0 ? true : false, // Set orang pertama sebagai PIC baru
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
            // Centang yang dipilih, uncentang yang lain
            isPic: p.name === nameToSetAsPic, 
        }))
    }));
  };

  const handleKeyDownOnInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Mencegah form submit
      
      // Jika ada input dan dropdown tidak terbuka, coba tambahkan orang (ini kasus ketik manual)
      if (currentPersonInput.trim() !== '' && !isDropdownOpen) {
        handleAddPerson();
      } 
      // Jika dropdown terbuka, logic Enter diurus oleh Dropdown component (handleKeyDown di GmailDropdown)
    }
    // Jika backspace dan input kosong, hapus chip terakhir
    if (e.key === 'Backspace' && currentPersonInput === '' && data.assignedPeople.length > 0) {
      const lastPersonName = data.assignedPeople[data.assignedPeople.length - 1].name;
      handleRemovePerson(lastPersonName);
    }
  };
  
  // --- LOGIKA API MENUGASKAN ---

  const postTaskAssignment = async () => {
    // ... (Logic postTaskAssignment tetap sama)
  };

  // --- KOMPONEN BANTUAN ---

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

  const handlePrint = () => {
    // ... (Logic print tetap sama)
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
                  {/* CHIP INPUT BARU dengan Gmail-style dropdown */}
                  <div className="relative flex flex-wrap items-center p-1 border border-gray-500 rounded-md bg-white min-h-[40px] focus-within:ring-2 focus-within:ring-blue-300">
                    
                    {/* Display Chips */}
                    {data.assignedPeople.map((person) => (
                      <Chip 
                        key={person.name} 
                        person={person} 
                        onRemove={handleRemovePerson}
                        onTogglePic={handleTogglePic}
                      />
                    ))}

                    {/* Input Field dengan ref untuk dropdown */}
                    <div className="flex-1 relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={currentPersonInput}
                        onChange={(e) => {
                          setCurrentPersonInput(e.target.value);
                          setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        onKeyDown={handleKeyDownOnInput}
                        placeholder={isLoadingPegawai 
                            ? "Memuat daftar pegawai..." 
                            : (data.assignedPeople.length === 0 ? "Ketik nama personel lalu tekan Enter..." : "")
                        }
                        className="flex-1 bg-transparent outline-none p-1 text-sm min-w-[100px]"
                        disabled={isLoadingPegawai}
                      />
                      
                      {/* Gmail-style Dropdown */}
                      <GmailDropdown
                        items={pegawaiList}
                        onSelect={(selectedObject: PersonDetail) => { // Menerima objek lengkap
                            // Panggil handleAddPerson dengan objek lengkap yang dipilih
                          setCurrentPersonInput(selectedObject.name); // Set input (opsional, hanya untuk visual)
                          handleAddPerson(selectedObject);
                        }}
                        isOpen={isDropdownOpen && currentPersonInput.length > 0}
                        setIsOpen={setIsDropdownOpen}
                        inputValue={currentPersonInput}
                        assignedPeople={data.assignedPeople}
                      />
                    </div>
                    
                    <Button 
                      onClick={() => handleAddPerson(null)} // Panggil manual add
                      className="ml-2 px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full" 
                      disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
                    >
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