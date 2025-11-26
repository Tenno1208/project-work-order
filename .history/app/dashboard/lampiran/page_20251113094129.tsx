"use client";

import React, { useEffect, useState } from "react";
// import { useRouter } from 'next/navigation'; // DIHAPUS: Modul Next.js tidak dapat diselesaikan
import { PlusCircle, Search, Loader2, Eye } from "lucide-react";


type ApiPengajuanItem = {
  id: number;
  uuid: string;
  hal_id: number;
  catatan: string;
  kepada: string;
  satker: string;
  kode_barang: string;
  keterangan: string; 
  file: string | null;
  status: string;
  name: string | null;
  npp: string | null;
  mengetahui: string | null;
  is_deleted: number;
  created_at: string; 
  updated_at: string;
};

type ApiResponse = {
  success: boolean;
  data: ApiPengajuanItem[];
};

type Pengajuan = {
  id: number;
  tanggal: string;
  hal: string;
  pelapor: string;
  status: string;
  uuid?: string; // Menambahkan uuid untuk navigasi detail (jika perlu)
};

// --- HELPER FUNCTION ---
/**
 * Memformat ISO string menjadi DD-MM-YYYY
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

// API_URL ini tidak lagi digunakan, kita memanggil route handler Next.js
const API_ROUTE_URL = "/api/pengajuan"; 
const MAX_RETRIES = 3;

/**
 * Hook kustom untuk navigasi yang kompatibel dengan lingkungan non-Next.js
 */
const useSimpleRouter = () => {
    // Navigasi menggunakan window.location.href (solusi universal)
    const push = (path: string) => {
        if (typeof window !== 'undefined') {
            window.location.href = path;
        }
    };
    return { push };
};


export default function DataPengajuanPage() {
  // Menggunakan hook kustom pengganti useRouter
  const router = useSimpleRouter(); 
    
  const [loading, setLoading] = useState(true);
  const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null); // Reset error
      
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null; // Ambil token, asumsikan disimpan di localStorage
      
      // 🚨 LOG DIAGNOSTIK SISI KLIEN
      console.log(`[CLIENT] Status Token (auth_token): ${token ? 'Ditemukan, Panjang: ' + token.length : 'NULL / Tidak Ditemukan'}`);

      if (!token) {
        setError("Token otorisasi TIDAK DITEMUKAN di penyimpanan lokal. Harap lakukan login ulang.");
        setLoading(false);
        return;
      }

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          // Panggil Next.js API Route Handler (Proxy)
          console.log(`[CLIENT] Melakukan fetch ke ${API_ROUTE_URL} dengan token...`);
          const response = await fetch(API_ROUTE_URL, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            cache: 'no-store' // Pastikan selalu fresh
          });
            
          const result = await response.json();
          
          if (!response.ok || !result.success) {
            // Tangkap pesan error dari route handler (termasuk Ngrok block)
            const errorMessage = result?.message || `Gagal memuat data. Status: ${response.status}`;
            throw new Error(errorMessage);
          }
          
          if (!result.data || !Array.isArray(result.data)) {
            throw new Error("Struktur respons API tidak valid: 'data' bukan array.");
          }

          const mappedData: Pengajuan[] = result.data.map((item: ApiPengajuanItem) => ({
            id: item.id,
            tanggal: formatDate(item.created_at), 
            hal: item.keterangan || item.catatan || 'Tidak Ada Keterangan', 
            pelapor: item.name || item.npp || 'Anonim', 
            status: item.status || 'Pending',
            uuid: item.uuid // Sertakan UUID untuk detail
          }));

          setPengajuans(mappedData);
          setLoading(false);
          return; 
        } catch (err: any) {
          const message = err.message.includes("ERR_NGROK_6024") 
            ? "Akses API Ngrok diblokir. Coba lagi atau periksa link backend."
            : err.message;
            
          console.error(`Gagal memuat data (Percobaan ${i + 1}/${MAX_RETRIES}):`, message);
          
          if (i === MAX_RETRIES - 1) {
            setError(`Gagal total memuat data: ${message}`);
            setLoading(false);
            setPengajuans([]);
          } else {
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
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

  /**
   * 🚨 PERBAIKAN: handleBuatPengajuan sudah aman dari ReferenceError
   */
  const handleBuatPengajuan = async () => {
    setCreating(true);
    const nomorSuratBaru = generateNoSurat();
    
    // Pengecekan klien untuk menghindari ReferenceError (meskipun use client sudah ada)
    if (typeof window !== 'undefined') { 
        localStorage.setItem("nomor_surat_terakhir", nomorSuratBaru);
    }

    setTimeout(() => {
        setCreating(false);
        // Navigasi ke halaman tambah/formulir
        router.push("/dashboard/lampiran/tambah"); 
    }, 1000);
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
        return "bg-green-200 text-green-800";
      case "rejected":
        return "bg-red-200 text-red-800";
      case "pending":
        return "bg-yellow-200 text-yellow-800";
      case "diproses":
        return "bg-blue-200 text-blue-800";
      case "error":
        return "bg-gray-700 text-white";
      default:
        return "bg-gray-200 text-gray-800";
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
              <Loader2 size={18} className="animate-spin" /> Membuat...
            </>
          ) : (
            <>
              <PlusCircle size={18} /> Buat Pengajuan Baru
            </>
          )}
        </button>
      </div>
      
      {error && (
        <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-xl" role="alert">
          <p className="font-bold">Error Memuat Data:</p>
          <p>{error}</p>
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
                  <span className="text-gray-600 font-medium">Memuat data...</span>
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
                      className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                        getStatusStyle(p.status)
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      // Navigasi menggunakan router kustom yang berbasis window.location.href
                      onClick={() => router.push(`/dashboard/lampiran/${p.uuid || p.id}`)}
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