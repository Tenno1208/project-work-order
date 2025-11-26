"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, X, CheckCircle } from "lucide-react";

// Button Component
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

// Gmail-style Dropdown Component
const GmailDropdown = ({ 
  items, 
  onSelect, 
  isOpen, 
  setIsOpen, 
  inputValue, 
  setInputValue,
  assignedPeople
}) => {
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef(null);
  
  const filteredItems = items.filter(item => {
    const isAlreadyAssigned = assignedPeople.some(assigned => 
      assigned.name.toLowerCase() === item.name.toLowerCase()
    );
    const matchesInput = item.name.toLowerCase().includes(inputValue.toLowerCase());
    return !isAlreadyAssigned && matchesInput;
  });

  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredItems]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsOpen]);

  const handleKeyDown = (e) => {
    if (!isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => prev < filteredItems.length - 1 ? prev + 1 : 0);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : filteredItems.length - 1);
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

  const handleSelect = (item) => {
    onSelect(item.name);
    setInputValue('');
    setIsOpen(false);
  };

  const highlightMatch = (text, query) => {
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

// Chip Component
const Chip = ({ person, onRemove, onTogglePic }) => (
  <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mr-2 my-1 shadow-sm border border-blue-200">
    <div 
      className="cursor-pointer mr-2 flex items-center justify-center transition-colors duration-200" 
      onClick={() => onTogglePic(person.name)}
      title="Set sebagai Penanggung Jawab (PIC)"
    >
      {person.isPic ? (
        <CheckCircle className="w-4 h-4 text-green-600 fill-green-200" />
      ) : (
        <div className="w-4 h-4 border-2 border-blue-400 rounded-full hover:bg-blue-200"></div>
      )}
    </div>
    <svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
    </svg>
    <span className="font-medium">{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
    <X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" onClick={() => onRemove(person.name)} />
  </div>
);

// Main Component
export default function SPKPage() {
  const [showDetail, setShowDetail] = useState(false);
  const [data, setData] = useState({
    assignedPeople: [], 
    tanggalSelesai: "",
    idBarang: "",
    uraianPekerjaan: "",
    status: "",
    jenisPekerjaan: "",
  });

  const [jenisPekerjaanOptions, setJenisPekerjaanOptions] = useState([]);
  const [currentPersonInput, setCurrentPersonInput] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [isLoadingPegawai, setIsLoadingPegawai] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const inputRef = useRef(null);
  const docRef = useRef(null);

  // Fetch Jenis Pekerjaan
  useEffect(() => {
    const fetchJenisPekerjaan = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token tidak ditemukan di localStorage");
          return;
        }

        const res = await fetch("/api/jenis-pekerjaan", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        const json = await res.json();
        
        if (json?.success && Array.isArray(json.data)) {
          const mappedOptions = json.data.map((item) => ({
            id: item.id,
            nama: item.nama, 
          }));
          setJenisPekerjaanOptions(mappedOptions);
        }
      } catch (err) {
        console.error("Error ambil data Jenis Pekerjaan:", err);
      }
    };

    fetchJenisPekerjaan();
  }, []);

  // Fetch Pegawai
  useEffect(() => {
    const fetchAllPegawai = async () => {
      setIsLoadingPegawai(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("Token tidak ditemukan");
          return;
        }

        const res = await fetch("/api/pegawai-proxy/all-pegawai", {
          headers: { Authorization: `Bearer ${token}` },
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
          const formattedPegawai = dataArray
            .map(item => ({
              name: item.nama_pegawai || item.nama || null,
              npp: item.npp || null,
              jabatan: item.jabatan || null,
            }))
            .filter(person => person.name && person.name.trim() !== '');

          setPegawaiList(formattedPegawai);
        }
      } catch (err) {
        console.error("Error ambil data Pegawai:", err);
      } finally {
        setIsLoadingPegawai(false);
      }
    };

    fetchAllPegawai();
  }, []);

  // Set default date
  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    setData((s) => ({ ...s, tanggalSelesai: formatted }));
  }, []);

  const updateField = (key, value) => setData((s) => ({ ...s, [key]: value }));

  const formatTanggal = (val) => {
    const [year, month, day] = val.split("-");
    return `${day}/${month}/${year}`;
  };

  const toggleStatus = (val) => setData((s) => ({ ...s, status: s.status === val ? "" : val }));

  const handleAddPerson = (selectedName = null) => {
    const name = (selectedName || currentPersonInput).trim();
    if (!name) return;

    // Cari detail pegawai berdasarkan nama (case-insensitive)
    const detail = pegawaiList.find(p => p.name.toLowerCase() === name.toLowerCase());
    
    // Gunakan nama lengkap dari detail jika ditemukan
    const fullName = detail ? detail.name : name;
    const npp = detail ? detail.npp : null;

    // Cek apakah nama sudah ada (case-insensitive)
    if (data.assignedPeople.some(p => p.name.toLowerCase() === fullName.toLowerCase())) {
      setCurrentPersonInput("");
      setIsDropdownOpen(false);
      return;
    }
    
    const isFirstPerson = data.assignedPeople.length === 0;
    
    const newPerson = {
      name: fullName,
      npp: npp,
      isPic: isFirstPerson, 
    };

    const updatedPeople = isFirstPerson 
      ? [newPerson]
      : [...data.assignedPeople, newPerson];

    console.log("Adding person:", newPerson);

    setData(s => ({ 
      ...s, 
      assignedPeople: updatedPeople 
    }));
    setCurrentPersonInput("");
    setIsDropdownOpen(false);
  };

  const handleRemovePerson = (nameToRemove) => {
    let newAssignedPeople = data.assignedPeople.filter(p => p.name !== nameToRemove);
    
    const removedPersonIsPic = data.assignedPeople.find(p => p.name === nameToRemove)?.isPic;

    if (removedPersonIsPic && newAssignedPeople.length > 0) {
      newAssignedPeople = newAssignedPeople.map((p, index) => ({
        ...p,
        isPic: index === 0 ? true : p.isPic,
      }));
    }

    setData(s => ({ ...s, assignedPeople: newAssignedPeople }));
  };

  const handleTogglePic = (nameToSetAsPic) => {
    setData(s => ({
      ...s,
      assignedPeople: s.assignedPeople.map(p => ({
        ...p,
        isPic: p.name === nameToSetAsPic, 
      }))
    }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPerson();
    }
    if (e.key === 'Backspace' && currentPersonInput === '' && data.assignedPeople.length > 0) {
      const lastPersonName = data.assignedPeople[data.assignedPeople.length - 1].name;
      handleRemovePerson(lastPersonName);
    }
  };
  
  const postTaskAssignment = async () => {
    if (data.assignedPeople.length === 0) {
      console.error("Minimal harus ada satu personel yang ditugaskan.");
      return;
    }
    
    const pic = data.assignedPeople.find(p => p.isPic);
    if (!pic) {
      console.error("Harap tentukan satu Penanggung Jawab (PIC).");
      return;
    }

    setIsAssigning(true);
    
    const stafsPayload = data.assignedPeople.map(p => ({
      npp: p.npp || 'NPP_KOSONG', 
      nama: p.name,
      is_penanggung_jawab: p.isPic,
    }));
    
    const taskData = {
      stafs: stafsPayload,
      tanggalSelesai: data.tanggalSelesai,
      idBarang: data.idBarang,
      uraianPekerjaan: data.uraianPekerjaan,
      jenisPekerjaan: data.jenisPekerjaan,
    };

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("Token not found");
        setIsAssigning(false);
        return;
      }

      console.log("Menugaskan API Payload:", stafsPayload);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowDetail(true);

    } catch (err) {
      console.error("Error during task assignment:", err);
    } finally {
      setIsAssigning(false);
    }
  };

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
              margin: 0;
              padding: 0;
            }
            .bordered {
              border: 1px solid #000;
              padding: 20px;
              min-height: 270mm;
              box-sizing: border-box;
            }
            .print-only-text {
              font-size: 13px;
              line-height: 1.5;
            }
            .print-hidden {
              display: none !important;
            }
            .input-replacement {
              border-bottom: 1px solid #000;
              display: inline-block;
              min-width: 150px;
              padding: 0 4px;
            }
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
            ${printContents}
          </div>
        </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <div className="p-6 min-h-screen bg-gray-100 font-inter">
      <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-xl rounded-xl">
        <div className="flex items-center justify-between border-b px-6 py-3 bg-gray-50 rounded-t-xl">
          <h1 className="text-lg font-bold text-gray-800">
            Surat Perintah Kerja (SPK)
          </h1>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
            Cetak (A4)
          </Button>
        </div>

        <div ref={docRef} className="p-8 text-[13px] leading-relaxed font-serif">
          <div className="border-2 border-black p-8 rounded-md bordered bg-white shadow-lg">
            <h2 className="text-center font-bold underline mb-4 text-black" style={{ fontSize: 16 }}>
              SURAT PERINTAH KERJA
            </h2>

            <div className="mt-2 text-black space-y-4">
              <div className="flex items-start mt-2">
                <div className="w-[140px] mt-2">Menugaskan Sdr:</div>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="relative flex flex-wrap items-center p-1 border border-gray-500 rounded-md bg-white min-h-[40px] focus-within:ring-2 focus-within:ring-blue-300">
                    
                    {data.assignedPeople.map((person) => (
                      <Chip 
                        key={person.name} 
                        person={person} 
                        onRemove={handleRemovePerson}
                        onTogglePic={handleTogglePic}
                      />
                    ))}

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
                        onKeyDown={handleKeyDown}
                        placeholder={isLoadingPegawai 
                          ? "Memuat daftar pegawai..." 
                          : (data.assignedPeople.length === 0 ? "Ketik nama personel lalu tekan Enter..." : "")
                        }
                        className="flex-1 bg-transparent outline-none p-1 text-sm min-w-[100px]"
                        disabled={isLoadingPegawai}
                      />
                      
                      <GmailDropdown
                        items={pegawaiList}
                        onSelect={(name) => handleAddPerson(name)}
                        isOpen={isDropdownOpen && currentPersonInput.length > 0}
                        setIsOpen={setIsDropdownOpen}
                        inputValue={currentPersonInput}
                        setInputValue={setCurrentPersonInput}
                        assignedPeople={data.assignedPeople}
                      />
                    </div>
                    
                    <Button 
                      onClick={() => handleAddPerson()} 
                      className="ml-2 px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full" 
                      disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
                    >
                      +
                    </Button>
                  </div>
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

            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ opacity: 0, y: 30, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="mt-6 text-black border-t-2 border-gray-300 pt-4 rounded-lg bg-gray-50 p-5 shadow-inner"
                >
                  <div className="flex mt-3 items-center">
                    <div className="w-[140px] font-medium">Tanggal Selesai</div>
                    <div className="relative">
                      <input
                        type="date"
                        value={data.tanggalSelesai.split("/").reverse().join("-")}
                        onChange={(e) => updateField("tanggalSelesai", formatTanggal(e.target.value))}
                        className="border border-gray-400 rounded-lg bg-white outline-none px-3 py-1.5 text-sm w-[180px] focus:ring-2 focus:ring-blue-500 transition-shadow"
                      />
                      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4 pointer-events-none" />
                    </div>
                  </div>

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

                  <div className="flex mt-4">
                    <div className="w-[140px] pt-2 font-medium">Uraian Pekerjaan</div>
                    <div className="flex-1">
                      <EditableBox
                        value={data.uraianPekerjaan}
                        onChange={(v) => updateField("uraianPekerjaan", v)}
                      />
                    </div>
                  </div>

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