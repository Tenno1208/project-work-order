"use client";

import React, { useEffect, useState } from "react";
import { FileText, Search, Loader2, Calendar, Filter } from "lucide-react";
// Removed 'next/navigation' import to fix resolution error.

export default function DaftarSPKPage() {
  const [loading, setLoading] = useState(true);
  const [spks, setSpks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  
  // Custom router fallback for single-file environment
  const router = {
    push: (href: string) => {
      console.log(`Simulated navigation to: ${href}`);
      // window.location.href = href; // Uncomment if full navigation is desired
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Simulate network delay
      await new Promise((r) => setTimeout(r, 800)); // Reduced delay
      setSpks([
        { id: 1, nomor: "SPK-001/2025", pekerjaan: "Perbaikan Pipa Air", tanggal: "2025-11-12", status: "Selesai" },
        { id: 2, nomor: "SPK-002/2025", pekerjaan: "Pemasangan Sambungan Baru", tanggal: "2025-11-11", status: "Proses" },
        { id: 3, nomor: "SPK-003/2025", pekerjaan: "Pemeliharaan Reservoir", tanggal: "2025-11-10", status: "Menunggu" },
        { id: 4, nomor: "SPK-004/2025", pekerjaan: "Instalasi Meteran Digital", tanggal: "2025-11-09", status: "Selesai" },
        { id: 5, nomor: "SPK-005/2025", pekerjaan: "Perbaikan Kebocoran Utama", tanggal: "2025-11-08", status: "Proses" },
        { id: 6, nomor: "SPK-006/2025", pekerjaan: "Pengecekan Kualitas Air", tanggal: "2025-11-07", status: "Menunggu" },
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSpk = spks.filter((item) => {
    const matchSearch =
      item.nomor.toLowerCase().includes(search.toLowerCase()) ||
      item.pekerjaan.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "Semua" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCount = {
    semua: spks.length,
    selesai: spks.filter((s) => s.status === "Selesai").length,
    proses: spks.filter((s) => s.status === "Proses").length,
    menunggu: spks.filter((s) => s.status === "Menunggu").length,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Selesai":
        return "bg-gradient-to-r from-green-500 to-green-600";
      case "Proses":
        return "bg-gradient-to-r from-yellow-500 to-orange-500";
      case "Menunggu":
        return "bg-gradient-to-r from-gray-500 to-gray-600";
      default:
        return "bg-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4"> {/* Reduced padding: p-6 -> p-4 */}
      <div className="max-w-7xl mx-auto space-y-4"> {/* Reduced spacing: space-y-6 -> space-y-4 */}
        
        {/* HEADER & STATS */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-blue-100"> {/* Reduced padding: p-8 -> p-5, rounded-3xl -> rounded-2xl */}
          <div className="flex items-center gap-3 mb-4"> {/* Reduced gap: gap-4 -> gap-3, mb-2 -> mb-4 */}
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-md"> {/* Reduced padding: p-3 -> p-2.5, rounded-2xl -> rounded-xl */}
              <FileText className="text-white" size={24} /> {/* Reduced icon size: size={28} -> size={24} */}
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent"> {/* Reduced font size: text-3xl -> text-2xl */}
                Daftar Surat Perintah Kerja
              </h1>
              <p className="text-black/70 text-xs mt-0.5"> {/* Reduced font size: text-sm -> text-xs, mt-1 -> mt-0.5 */}
                Kelola dan pantau seluruh SPK dalam satu tempat
              </p>
            </div>
          </div>

          {/* STATS CARDS - Reduced padding and font size */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4"> {/* Reduced gap: gap-4 -> gap-3, mt-6 -> mt-4 */}
            {Object.entries(statusCount).map(([key, value]) => (
              <div
                key={key}
                className={`${getStatusColor(key === 'semua' ? 'Semua' : key.charAt(0).toUpperCase() + key.slice(1))} rounded-xl p-3 text-white shadow-md hover:scale-[1.02] transition-transform`} // Reduced padding: p-4 -> p-3, rounded-2xl -> rounded-xl
              >
                <p className="text-xs opacity-90 capitalize">
                  {key === 'semua' ? 'Total SPK' : key}
                </p>
                <p className="text-2xl font-bold mt-0.5">{value}</p> {/* Reduced font size: text-3xl -> text-2xl, mt-1 -> mt-0.5 */}
              </div>
            ))}
          </div>
        </div>

        {/* SEARCH & FILTER - Reduced padding and font size */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-blue-100"> {/* Reduced padding: p-6 -> p-4, rounded-3xl -> rounded-2xl */}
          <div className="flex flex-col md:flex-row gap-3"> {/* Reduced gap: gap-4 -> gap-3 */}
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60" size={16} /> 
              <input
                type="text"
                placeholder="Cari nomor SPK atau jenis pekerjaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                // Reduced padding/font size
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-3 focus:border-cyan-500 focus:bg-white outline-none text-sm text-black transition-all" 
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60" size={16} /> 
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-7 focus:border-cyan-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer min-w-[160px] text-sm text-black" 
              >
                <option value="Semua">Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Proses">Proses</option>
                <option value="Menunggu">Menunggu</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100"> 
          {loading ? (
            <div className="py-12 text-center"> 
              <Loader2 className="mx-auto animate-spin text-cyan-600 mb-3" size={32} /> 
              <p className="text-black text-sm font-medium">Memuat data SPK...</p> 
            </div>
          ) : filteredSpk.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm"> 
                    <th className="px-4 py-3 text-left font-semibold">No</th> 
                    <th className="px-4 py-3 text-left font-semibold">Nomor SPK</th> 
                    <th className="px-4 py-3 text-left font-semibold">Pekerjaan</th> 
                    <th className="px-4 py-3 text-left font-semibold">Tanggal</th> 
                    <th className="px-4 py-3 text-left font-semibold">Status</th> 
                    <th className="px-4 py-3 text-center font-semibold">Aksi</th> 
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSpk.map((spk, index) => (
                    <tr
                      key={spk.id}
                      className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all cursor-pointer group text-sm"
                      onClick={() => router.push(`/dashboard/spk/${spk.id}`)}
                    >
                      <td className="px-4 py-3 text-black">{index + 1}</td> 
                      <td className="px-4 py-3 font-semibold text-blue-700 group-hover:text-blue-800 whitespace-nowrap">{spk.nomor}</td> 
                      <td className="px-4 py-3 text-black">{spk.pekerjaan}</td> 
                      <td className="px-4 py-3 text-black flex items-center gap-1.5 whitespace-nowrap"> 
                        <Calendar size={14} className="text-black/60" /> 
                        <span className="text-xs">{spk.tanggal}</span> 
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-3 py-1 text-xs font-bold rounded-full shadow-sm ${ 
                            spk.status === "Selesai"
                              ? "bg-gradient-to-r from-green-400 to-green-500 text-white"
                              : spk.status === "Proses"
                              ? "bg-gradient-to-r from-yellow-400 to-orange-400 text-white"
                              : "bg-gradient-to-r from-gray-400 to-gray-500 text-white"
                          }`}
                        >
                          {spk.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center"> 
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/spk/${spk.id}/edit`);
                          }}
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-3 py-1.5 text-xs rounded-lg font-medium hover:shadow-lg hover:scale-[1.05] transition-all" // px-5 py-2 -> px-3 py-1.5, text-xs, rounded-xl -> rounded-lg
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center"> 
              <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"> 
                <FileText className="text-gray-400" size={32} /> 
              </div>
              <p className="text-black text-sm font-medium">Tidak ada data SPK ditemukan</p> 
              <p className="text-black/70 text-xs mt-1"> 
                Coba ubah kata kunci pencarian atau filter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}