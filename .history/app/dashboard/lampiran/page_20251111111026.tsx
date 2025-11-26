"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, FileText, Search, Loader2, Eye } from "lucide-react";

type Pengajuan = {
  id: number;
  tanggal: string;
  hal: string;
  pelapor: string;
  status: string;
};

export default function DataPengajuanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [pengajuans, setPengajuans] = useState<Pengajuan[]>([]);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  // ✅ Ambil data pengajuan (mock)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPengajuans([
        { id: 1, tanggal: "11-11-2025", hal: "Perbaikan", pelapor: "Budi Santoso", status: "Diproses" },
        { id: 2, tanggal: "10-11-2025", hal: "Pemeliharaan", pelapor: "Andi Wijaya", status: "Selesai" },
        { id: 3, tanggal: "09-11-2025", hal: "Pengaduan Kerusakan", pelapor: "Siti Lestari", status: "Menunggu" },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  // ✅ Fungsi buat nomor surat otomatis
  const generateNoSurat = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const random = Math.floor(100 + Math.random() * 900); // contoh random 3 digit
    return `SPK/${day}${month}${year}/${random}`;
  };

  // ✅ Fungsi buat pengajuan baru
  const handleBuatPengajuan = async () => {
    setCreating(true);

    // Simulasi panggil API create draft pengajuan
    const nomorSurat = generateNoSurat();
    const nomorSurat = localStorage.getItem("nomor_surat_terakhir");

    // Simpan ke localStorage biar bisa diakses di halaman form
    localStorage.setItem("nomor_surat_terakhir", nomorSurat);

    // Nanti bisa diganti ke POST API semisal:
    // await fetch("/api/pengajuan/create-draft", { method: "POST", body: JSON.stringify({ nomorSurat }) });

    // Arahkan ke halaman form tambah
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

  return (
    <div className="space-y-6">
      {/* Header + Tombol Buat Pengajuan */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Data Pengajuan</h2>
        <button
          onClick={handleBuatPengajuan}
          disabled={creating}
          className={`flex items-center gap-2 ${
            creating ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
          } text-white px-4 py-2 rounded-lg shadow-md transition-all`}
        >
          {creating ? (
            <>
              <Loader2 size={18} className="animate-spin" /> Membuat...
            </>
          ) : (
            <>
              <PlusCircle size={18} /> Buat Pengajuan
            </>
          )}
        </button>
      </div>

      {/* Pencarian */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Cari pengajuan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {/* Tabel Data */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="py-3 px-4 text-left font-semibold">#</th>
              <th className="py-3 px-4 text-left font-semibold">Tanggal</th>
              <th className="py-3 px-4 text-left font-semibold">Hal</th>
              <th className="py-3 px-4 text-left font-semibold">Pelapor</th>
              <th className="py-3 px-4 text-left font-semibold">Status</th>
              <th className="py-3 px-4 text-center font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center">
                  <Loader2 className="animate-spin inline-block text-blue-500 mr-2" />
                  Memuat data...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">
                  Tidak ada data pengajuan ditemukan.
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => (
                <tr
                  key={p.id}
                  className="border-t hover:bg-blue-50 transition-colors"
                >
                  <td className="py-3 px-4">{i + 1}</td>
                  <td className="py-3 px-4">{p.tanggal}</td>
                  <td className="py-3 px-4">{p.hal}</td>
                  <td className="py-3 px-4">{p.pelapor}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        p.status === "Selesai"
                          ? "bg-green-100 text-green-700"
                          : p.status === "Diproses"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => router.push(`/dashboard/lampiran/${p.id}`)}
                      className="flex items-center gap-1 mx-auto bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-md text-xs transition-all"
                    >
                      <Eye size={14} /> Lihat
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
