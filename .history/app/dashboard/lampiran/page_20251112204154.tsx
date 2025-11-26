"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Search, Loader2, Eye, Frown } from "lucide-react";

// Definisi Tipe data Pengajuan
type Pengajuan = {
  id: number;
  tanggal: string;
  hal: string;
  pelapor: string;
  status: string;
};

// URL API yang akan digunakan
const API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
const MAX_RETRIES = 3;
// Kunci di localStorage tempat Anda menyimpan token. Sesuaikan jika nama kuncinya berbeda.
const AUTH_TOKEN_KEY = "token_user"; 

export default function DataPengajuanPage() {
  // Mock useRouter for standalone compatibility in the immersive environment
  const router = {
    push: (path: string) => {
      console.log(`Navigating to: ${path}`);
      if (path.endsWith('tambah')) {
          console.log("Simulasi navigasi ke halaman Tambah Pengajuan. Nomor Surat: " + localStorage.getItem("nomor_surat_terakhir"));
      }
    }
  };
  
  const [loading, setLoading] = useState(true);
  const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Fungsi untuk Mengambil Data dari API dengan Token Otorisasi ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);

      // 1. Ambil Token dari localStorage
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      
      if (!token) {
        // Jika token tidak ada, hentikan proses dan tampilkan error otorisasi
        const authErrorMsg = "Token otorisasi tidak ditemukan di localStorage. Harap login atau dapatkan token terlebih dahulu.";
        setError(authErrorMsg);
        setLoading(false);
        return;
      }
      
      // Definisikan header dengan token
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      for (let i = 0; i < MAX_RETRIES; i++) {
        try {
          const response = await fetch(API_URL, { headers });
          
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                // Tangani khusus error otorisasi (Token tidak valid/kadaluarsa)
                throw new Error(`Otorisasi Gagal. Token tidak valid atau kadaluarsa. Kode Status: ${response.status}`);
            }
            throw new Error(`Gagal memuat data. Kode Status: ${response.status}`);
          }

          const data: Pengajuan[] = await response.json();
          
          // Memeriksa jika API mengembalikan respons error JSON (meskipun status 200)
          // Ini untuk kasus di mana API mengembalikan {success: false, message: "..."}
          if (Array.isArray(data) && data.length === 0) {
              // Jika response adalah array kosong, ini berarti tidak ada data.
          } else if (data && !Array.isArray(data) && (data as any).success === false) {
              // Jika API mengembalikan JSON error, gunakan pesan dari API
              throw new Error((data as any).message || "Respons API menunjukkan kegagalan otorisasi atau data.");
          }


          setPengajuans(data);
          setLoading(false);
          return; // Berhasil, keluar dari loop
        } catch (error) {
          console.error(`Gagal memuat data (Percobaan ${i + 1}/${MAX_RETRIES}):`, error.message);
          
          if (i < MAX_RETRIES - 1) {
            const delay = Math.pow(2, i) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            const finalErrorMsg = `Gagal total memuat data pengajuan setelah mencoba berkali-kali. Pesan: ${error.message}`;
            console.error(finalErrorMsg);
            setError(finalErrorMsg);
            setLoading(false);
          }
        }
      }
    };

    fetchData();
  }, []); // Dependensi kosong, hanya dijalankan sekali saat mount

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
    const nomorSuratBaru = generateNoSurat();
    localStorage.setItem("nomor_surat_terakhir", nomorSuratBaru);

    setTimeout(() => {
      setCreating(false);
      router.push("/dashboard/lampiran/tambah");
    }, 1000);
  };

  const filtered = pengajuans.filter(
    (p) =>
      p.hal.toLowerCase().includes(search.toLowerCase()) ||
      p.pelapor.toLowerCase().includes(search.toLowerCase()) ||
      p.status.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "selesai":
        return "bg-green-200 text-green-900";
      case "diproses":
        return "bg-yellow-200 text-yellow-900";
      default:
        return "bg-gray-200 text-gray-900";
    }
  };

  // Tampilkan Error jika ada
  if (error) {
    return (
      <div className="p-10 text-center bg-white rounded-xl shadow-lg border-red-300 border-2 my-10 max-w-2xl mx-auto">
        <Frown size={48} className="text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-red-700 mb-2">Gagal Memuat Data</h3>
        <p className="text-gray-600">{error}</p>
        <p className="text-sm text-gray-500 mt-4">Pastikan kunci token di `localStorage` adalah **`token_user`** dan nilainya valid.</p>
        <p className="text-sm text-gray-500 mt-2">Cek API di URL: <a href={API_URL} target="_blank" className="text-blue-600 underline break-all">{API_URL}</a></p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 space-y-6 text-gray-800 bg-gray-50 min-h-screen">
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

      <div className="relative max-w-lg">
        <Search className="absolute left-3 top-3 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Cari berdasarkan hal, pelapor, atau status..."
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
              <th className="py-3 px-4 text-left font-semibold w-[30%]">Hal</th>
              <th className="py-3 px-4 text-left font-semibold w-[25%]">Pelapor</th>
              <th className="py-3 px-4 text-left font-semibold w-[15%]">Status</th>
              <th className="py-3 px-4 text-center font-semibold w-[10%]">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center bg-white">
                  <Loader2 className="animate-spin inline-block text-blue-600 mr-2" size={24}/>
                  <span className="text-gray-600 font-medium">Memuat data dari API...</span>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500 bg-white">
                  <div className="flex flex-col items-center justify-center">
                     <Search size={36} className="mb-2"/>
                     <p>Tidak ada data pengajuan ditemukan. (Kemungkinan API mengembalikan array kosong)</p>
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
                  <td className="py-3 px-4">{p.hal}</td>
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
                      onClick={() => router.push(`/dashboard/lampiran/${p.id}`)}
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