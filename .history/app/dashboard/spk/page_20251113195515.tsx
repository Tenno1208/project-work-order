"use client";

import React, { useEffect, useState } from "react";
// next/navigation telah dihapus untuk memperbaiki error kompilasi.
import { FileText, Search, Loader2, Calendar, Filter, Pencil, Trash2, Eye, Plus } from "lucide-react";

type SPKItem = {
  id: number;
  nomor: string;
  pekerjaan: string;
  tanggal: string;
  status: "Selesai" | "Proses" | "Menunggu";
}

// Menentukan path tujuan sesuai permintaan Anda
const TARGET_PATH = "/dashboard/spk/format/page.tsx";

export default function DaftarSPKPage() {
  // const router = useRouter(); // Dihapus karena menyebabkan error kompilasi
  const [loading, setLoading] = useState(true);
  const [spks, setSpks] = useState<SPKItem[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");

  // --- HANDLER AKSI ---

  // Handler untuk Tombol "Daftar SPK Baru"
  const handleAdd = () => {
    // Simulasi Redirect
    alert(`Mengarahkan ke: ${TARGET_PATH} (Pendaftaran SPK Baru)`);
  };

  const handleView = (spk: SPKItem) => {
    // Simulasi Redirect
    alert(`Mengarahkan ke: ${TARGET_PATH} (Lihat Detail SPK ${spk.nomor})`);
  };

  const handleEdit = (spk: SPKItem) => {
    // Simulasi Redirect
    alert(`Mengarahkan ke: ${TARGET_PATH} (Edit SPK ${spk.nomor})`);
  };

  const handleDelete = (spk: SPKItem) => {
    // Menggunakan window.prompt karena konfirmasi dilarang di lingkungan ini
    const confirmation = window.prompt(`Ketik 'HAPUS' untuk mengkonfirmasi penghapusan SPK: ${spk.nomor}`);
    if (confirmation?.toUpperCase() === 'HAPUS') {
      // Dalam proyek nyata, Anda akan memanggil API di sini
      alert(`SPK ${spk.nomor} berhasil dihapus (Simulasi)`);
      // Update state setelah penghapusan simulasi
      setSpks(spks.filter(item => item.id !== spk.id));
    } else if (confirmation !== null) {
        // Karena alert() dilarang, kita gunakan console.log atau modal notifikasi
        console.log("Penghapusan dibatalkan atau konfirmasi tidak cocok.");
    }
  };
  // -------------------------

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Simulasi delay fetch data
      await new Promise((r) => setTimeout(r, 800));
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-4 font-sans">
      <div className="max-w-7xl mx-auto space-y-4">

        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-blue-100">
          <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2.5 rounded-xl shadow-md">
                <FileText className="text-white" size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                  Daftar Surat Perintah Kerja
                </h1>
                <p className="text-black/70 text-xs mt-0.5">
                  Kelola dan pantau seluruh SPK dalam satu tempat. Total SPK: {spks.length}
                </p>
              </div>
            </div>
            {/* Tombol Daftar SPK Baru yang mengarah ke TARGET_PATH */}
            <button
              onClick={handleAdd}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-100 whitespace-nowrap"
              title="Buat SPK Baru"
            >
              <Plus size={20} />
              Daftar SPK Baru
            </button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {Object.entries(statusCount).map(([key, value]) => (
              <div
                key={key}
                className={`${getStatusColor(
                  key === "semua"
                    ? "Semua"
                    : key.charAt(0).toUpperCase() + key.slice(1)
                )} rounded-xl p-3 text-white shadow-md hover:scale-[1.02] transition-transform`}
              >
                <p className="text-xs opacity-90 capitalize">
                  {key === "semua" ? "Total SPK" : key}
                </p>
                <p className="text-2xl font-bold mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="bg-white rounded-2xl shadow-lg p-4 border border-blue-100">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60" size={16} />
              <input
                type="text"
                placeholder="Cari nomor SPK atau jenis pekerjaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border border-gray-300 rounded-xl py-2 pl-10 pr-3 focus:border-cyan-500 focus:bg-white outline-none text-sm text-black transition-all"
              />
            </div>

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
                      className="border-b border-gray-200 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all text-sm"
                    >
                      <td className="px-4 py-3 text-black">{index + 1}</td>
                      <td className="px-4 py-3 font-semibold text-blue-700 whitespace-nowrap">
                        {spk.nomor}
                      </td>
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
                      {/* Kolom Aksi dengan 3 tombol ikon */}
                      <td className="px-4 py-3 text-center whitespace-nowrap">
                        <div className="flex justify-center gap-2">
                          {/* 1. Tombol Lihat (View) -> Simulasi Redirect ke /dashboard/spk/format/page.tsx */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleView(spk);
                            }}
                            className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition duration-200 shadow-md hover:scale-105"
                            title="Lihat Detail SPK"
                          >
                            <Eye size={16} />
                          </button>

                          {/* 2. Tombol Edit (Pencil) -> Simulasi Redirect ke /dashboard/spk/format/page.tsx */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(spk);
                            }}
                            className="p-2 bg-yellow-100 text-yellow-700 hover:bg-yellow-200 rounded-lg transition duration-200 shadow-md hover:scale-105"
                            title="Edit SPK"
                          >
                            <Pencil size={16} />
                          </button>

                          {/* 3. Tombol Hapus (Trash2) */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(spk);
                            }}
                            className="p-2 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg transition duration-200 shadow-md hover:scale-105"
                            title="Hapus SPK"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
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