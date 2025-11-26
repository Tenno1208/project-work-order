"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar, X, CheckCircle } from "lucide-react";

// --- Button sederhana ---
const Button = ({ onClick, children, className = "bg-blue-600 hover:bg-blue-700 text-white", disabled = false }) => (
<button
onClick={onClick}
className={`px-4 py-2 font-semibold text-sm rounded-lg transition-colors ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
disabled={disabled}

>

```
{children}
```

  </button>
);

// Motion dummy
const motion = { div: ({ children, ...props }) => <div {...props}>{children}</div> };
const AnimatePresence = ({ children }) => <>{children}</>;

// ----------------------
// Autocomplete Premium
// ----------------------
const AutoCompletePerson = ({
inputValue,
setInputValue,
onSelect,
pegawaiList,
assignedPeople,
isLoadingPegawai,
onKeyDownExtra,
}) => {
const [open, setOpen] = useState(false);
const [highlight, setHighlight] = useState(0);
const containerRef = useRef(null);
const listRef = useRef(null);

const filtered = pegawaiList
.filter(
(p) =>
p.name &&
p.name.toLowerCase().includes((inputValue || "").toLowerCase()) &&
!assignedPeople.some((a) => a.name === p.name)
)
.slice(0, 10);

const renderHighlighted = (text, query) => {
if (!query) return text;
const idx = text.toLowerCase().indexOf(query.toLowerCase());
if (idx === -1) return text;
return (
<>
{text.substring(0, idx)} <span className="font-semibold underline decoration-2 decoration-blue-300">
{text.substring(idx, idx + query.length)} </span>
{text.substring(idx + query.length)}
</>
);
};

useEffect(() => {
const onDoc = (e) => {
if (!containerRef.current) return;
if (!containerRef.current.contains(e.target)) setOpen(false);
};
document.addEventListener("mousedown", onDoc);
return () => document.removeEventListener("mousedown", onDoc);
}, []);

useEffect(() => {
if (filtered.length === 0) setHighlight(0);
else setHighlight((h) => Math.min(h, filtered.length - 1));
}, [filtered.length]);

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
if (onKeyDownExtra) onKeyDownExtra(e);

```
if (e.key === "ArrowDown") {
  e.preventDefault();
  if (!open) setOpen(true);
  setHighlight((prev) => (filtered.length ? (prev + 1) % filtered.length : 0));
} else if (e.key === "ArrowUp") {
  e.preventDefault();
  if (!open) setOpen(true);
  setHighlight((prev) => (filtered.length ? (prev - 1 + filtered.length) % filtered.length : 0));
} else if (e.key === "Enter") {
  if (open && filtered[highlight]) {
    e.preventDefault();
    const pick = filtered[highlight];
    onSelect(pick.name);
    setInputValue("");
    setOpen(false);
  }
} else if (e.key === "Escape") {
  setOpen(false);
} else {
  if (!open) setOpen(true);
}
```

};

return ( <div ref={containerRef} className="relative flex-1 min-w-[150px]">
<input
type="text"
value={inputValue}
onChange={(e) => {
setInputValue(e.target.value);
setOpen(true);
}}
onKeyDown={handleKey}
placeholder={isLoadingPegawai ? "Memuat daftar pegawai..." : ""}
className="flex-1 bg-transparent outline-none p-1 text-sm w-full"
disabled={isLoadingPegawai}
aria-autocomplete="list"
aria-expanded={open}
/>

```
  {open && (filtered.length > 0 || isLoadingPegawai) && (
    <div className="absolute left-0 top-full mt-1 w-[320px] max-h-64 overflow-hidden rounded-2xl shadow-2xl z-50">
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
                onMouseDown={(e) => {
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
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  idx === highlight ? "bg-white/20" : "bg-gray-100"
                } text-sm font-medium`}>
                  {item.name ? item.name[0] : "?"}
                </div>

                <div className="flex-1 text-sm">
                  <div className="truncate">
                    <span className={idx === highlight ? "font-semibold" : "font-medium"}>
                      {renderHighlighted(item.name, inputValue)}
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
```

);
};

// ----------------------
// Chip Person
// ----------------------
const Chip = ({ person, onRemove, onTogglePic }) => (

  <div className="flex items-center bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full mr-2 mb-2 shadow-sm border border-blue-200">
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

```
<svg className="w-4 h-4 mr-1 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
</svg>

<span>{person.name}{person.npp ? ` (${person.npp})` : ''}</span>
<X className="w-3 h-3 ml-2 cursor-pointer hover:text-red-600 transition-colors" onClick={() => onRemove(person.name)} />
```

  </div>
);

// ----------------------
// Halaman SPK
// ----------------------
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

useEffect(() => {
const today = new Date();
const formatted = today.toLocaleDateString("id-ID", {
day: "2-digit",
month: "2-digit",
year: "numeric",
});
setData((s) => ({ ...s, tanggalSelesai: formatted }));
}, []);

const updateField = (key, value) => setData(s => ({ ...s, [key]: value }));
const formatTanggal = (val) => val.split("-").reverse().join("/");

const getPersonDetail = (name) => pegawaiList.find(p => p.name === name) || { npp: null };

const handleAddPerson = (nameParam, nppParam) => {
const name = nameParam || currentPersonInput.trim();
if (!name) return;
if (data.assignedPeople.some(p => p.name === name)) {
setCurrentPersonInput("");
return;
}

```
const detail = nppParam ? { npp: nppParam } : getPersonDetail(name);
const newPerson = {
  name,
  npp: detail.npp,
  isPic: data.assignedPeople.length === 0,
};

setData(s => ({ ...s, assignedPeople: [...s.assignedPeople, newPerson] }));
setCurrentPersonInput("");
```

};

const handleRemovePerson = (nameToRemove) => {
let newAssignedPeople = data.assignedPeople.filter(p => p.name !== nameToRemove);
const removedIsPic = data.assignedPeople.find(p => p.name === nameToRemove)?.isPic;
if (removedIsPic && newAssignedPeople.length > 0) {
newAssignedPeople = newAssignedPeople.map((p, idx) => ({ ...p, isPic: idx === 0 }));
}
setData(s => ({ ...s, assignedPeople: newAssignedPeople }));
};

const handleTogglePic = (nameToSetAsPic) => {
setData(s => ({
...s,
assignedPeople: s.assignedPeople.map(p => ({ ...p, isPic: p.name === nameToSetAsPic }))
}));
};

const handleKeyDown = (e) => {
if (e.key === 'Enter') {
e.preventDefault();
handleAddPerson();
}
if (e.key === 'Backspace' && currentPersonInput === '' && data.assignedPeople.length > 0) {
handleRemovePerson(data.assignedPeople[data.assignedPeople.length - 1].name);
}
};

return ( <div className="p-6 min-h-screen bg-gray-100 font-inter"> <div className="max-w-4xl mx-auto bg-white border border-gray-300 shadow-xl rounded-xl"> <div className="flex items-center justify-between border-b px-6 py-3 bg-gray-50 rounded-t-xl"> <h1 className="text-lg font-bold text-gray-800">Surat Perintah Kerja (SPK)</h1> </div>

```
    <div className="p-8 text-[13px] leading-relaxed font-serif">
      <div className="flex items-start mt-2">
        <div className="w-[140px] mt-2">Menugaskan Sdr:</div> 
        <div className="flex-1 flex flex-col gap-1">
          <div className="flex flex-wrap items-center p-1 border border-gray-500 rounded-md bg-white min-h-[40px] focus-within:ring-2 focus-within:ring-blue-300">
            {data.assignedPeople.map((person) => (
              <Chip
                key={person.name}
                person={person}
                onRemove={handleRemovePerson}
                onTogglePic={handleTogglePic}
              />
            ))}
            <div className="flex items-center flex-1 min-w-[150px] relative">
              <AutoCompletePerson
                inputValue={currentPersonInput}
                setInputValue={setCurrentPersonInput}
                onSelect={(name) => handleAddPerson(name)}
                pegawaiList={pegawaiList}
                assignedPeople={data.assignedPeople}
                isLoadingPegawai={isLoadingPegawai}
                onKeyDownExtra={handleKeyDown}
              />
              <Button
                onClick={() => handleAddPerson()}
                className="px-3 py-0.5 text-xs bg-green-500 hover:bg-green-600 rounded-full h-fit mr-1"
                disabled={isLoadingPegawai || currentPersonInput.trim() === ''}
              >
                +
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

);
}
