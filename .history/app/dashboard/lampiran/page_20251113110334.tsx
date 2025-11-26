"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, Search, Loader2, Eye, Info } from "lucide-react";
// Removed: import { useRouter } from 'next/navigation'; // Not supported here

// --- TIPE DATA & MOCK DATA ---

type Pengajuan = {
  id: number;
  uuid: string;
  tanggal: string;
  hal: string; // Mengambil dari keterangan/catatan
  pelapor: string;
  status: string;
};

// Mock Data to replace external API call
const MOCK_DATA: Pengajuan[] = [
    { id: 101, uuid: 'a001', tanggal: '11-11-2025', hal: 'Permintaan perbaikan laptop unit keuangan yang rusak total.', pelapor: 'Ahmad Budi', status: 'Approved' },
    { id: 102, uuid: 'a002', tanggal: '10-11-2025', hal: 'Pengadaan 5 unit kursi ergonomis untuk staf baru.', pelapor: 'Citra Dewi', status: 'Pending' },
    { id: 103, uuid: 'a003', tanggal: '09-11-2025', hal: 'Pengajuan penggantian tinta printer HP Laser Pro.', pelapor: 'Eko Firmansyah', status: 'Rejected' },
    { id: 104, uuid: 'a004', tanggal: '08-11-2025', hal: 'Pembersihan dan kalibrasi alat laboratorium bulan ini.', pelapor: 'Gita Handayani', status: 'Diproses' },
    { id: 105, uuid: 'a005', tanggal: '07-11-2025', hal: 'Permohonan cuti tahunan 5 hari kerja.', pelapor: 'Indra Jaya', status: 'Approved' },
];

// --- HELPER FUNCTION ---
/**
 * Formats ISO date string to DD-MM-YYYY (id-ID format)
 */
const formatDate = (isoString: string): string => {
  try {
    if (!isoString) return '-';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date).replace(/\//g, '-'); 
  } catch (e) {
    return 'Format Salah';
  }
};

export default function DataPengajuanPage() {
    // Removed: const router = useRouter(); 
    
  const [loading, setLoading] = useState(true);
  const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [simulationMessage, setSimulationMessage] = useState<string | null>(null);

  useEffect(() => {
    // Simulate data fetching delay and then load mock data
    const fetchData = () => {
      setLoading(true);
      
      // Simulating a successful API fetch after a delay
      setTimeout(() => {
        // In a real app, this would be: const mappedData = result.data.map(...)
        setPengajuans(MOCK_DATA);
        setLoading(false);
      }, 1500);
    };

    fetchData();
  }, []); 

  const generateNoSurat = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900);
    return `SPK-${day}${month}${year}-${random}`;
  };

  const handleBuatPengajuan = async () => {
    setCreating(true);
    setSimulationMessage(null);
    
    const nomorSuratBaru = generateNoSurat();
    
    if (typeof window !== 'undefined') {
        // This localStorage item is correctly set for the next page to use.
        localStorage.setItem("nomor_surat_terakhir", nomorSuratBaru);
    }

    setTimeout(() => {
        setCreating(false);
        // Simulation of navigation
        setSimulationMessage(`SIMULASI: Nomor surat sementara (${nomorSuratBaru}) telah disimpan di localStorage. Anda akan diarahkan ke halaman pembuatan pengajuan.`);
        // Original logic was: router.push("/dashboard/lampiran/tambah");
    }, 1000);
};

  // Action for viewing details (Simulated)
  const handleViewDetail = (id: number) => {
    setSimulationMessage(`SIMULASI: Anda akan melihat detail pengajuan ID ${id}.`);
    // Original logic was: router.push(`/dashboard/lampiran/${id}`);
  };

  const filtered = pengajuans.filter(
    (p) =>
      p.hal.toLowerCase().includes(search.toLowerCase()) ||
      p.pelapor.toLowerCase().includes(search.toLowerCase()) ||
      p.status.toLowerCase().includes(search.toLowerCase()) ||
      p.tanggal.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-300";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-300";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "diproses":
        return "bg-blue-100 text-blue-700 border-blue-300";
      case "error":
        return "bg-gray-700 text-white border-gray-900";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  return (
    <div className="p-6 md:p-10 space-y-6 text-gray-800 bg-gray-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h2 className="text-3xl font-extrabold text-gray-900">Data Pengajuan</h2>
        <button
          onClick={handleBuatPengajuan}
          disabled={creating}
          className={`flex items-center gap-2 ${
            creating ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
          } text-white px-5 py-2.5 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] duration-200 ease-in-out font-medium`}
        >
          {creating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Mempersiapkan...
            </>
          ) : (
            <>
              <PlusCircle size={18} /> Buat Pengajuan Baru
            </>
          )}
        </button>
      </div>

      {simulationMessage && (
          <div className="flex items-center gap-3 p-4 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-xl shadow-md transition-opacity">
              <Info size={20} className="flex-shrink-0" />
              <p className="text-sm font-medium">{simulationMessage}</p>
          </div>
      )}

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Cari berdasarkan tanggal, hal, pelapor, atau status..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-3 w-full border border-gray-300 text-gray-800 rounded-xl shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none transition-all"
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-lg overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700 divide-y divide-gray-200">
          <thead className="bg-blue-600 text-white sticky top-0">
            <tr>
              <th className="py-3 px-4 text-left font-semibold w-[5%]">No</th>
              <th className="py-3 px-4 text-left font-semibold w-[15%]">Tanggal</th>
              <th className="py-3 px-4 text-left font-semibold w-[30%]">Hal (Keterangan)</th>
              <th className="py-3 px-4 text-left font-semibold w-[25%]">Pelapor (Nama)</th>
              <th className="py-3 px-4 text-left font-semibold w-[15%]">Status</th>
              <th className="py-3 px-4 text-center font-semibold w-[10%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center bg-white">
                  <Loader2 className="animate-spin inline-block text-blue-600 mr-2" size={24}/>
                  <span className="text-gray-600 font-medium">Memuat data simulasi...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500 bg-white">
                  <div className="flex flex-col items-center justify-center">
                      <Search size={36} className="mb-2"/>
                      <p>Tidak ada data pengajuan ditemukan.</p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className="bg-white hover:bg-blue-50 transition-colors"
                >
                  <td className="py-3 px-4 text-center font-mono">{i + 1}</td>
                  <td className="py-3 px-4 whitespace-nowrap">{p.tanggal}</td>
                  <td className="py-3 px-4 line-clamp-2 max-w-xs">{p.hal}</td>
                  <td className="py-3 px-4 font-medium">{p.pelapor}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border ${
                        getStatusStyle(p.status)
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleViewDetail(p.id)}
                      className="flex items-center gap-1 mx-auto bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1.5 rounded-full text-xs font-semibold transition-all transform hover:scale-105"
                    >
                      <Eye size={14} /> Lihat Detail
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}