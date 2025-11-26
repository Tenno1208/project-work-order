"use client";

import React, { useEffect, useState } from "react";
import { FileText, Search, Loader2, Calendar, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DaftarSPKPage() {
  const [loading, setLoading] = useState(true);
  const [spks, setSpks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000));
      setSpks([
        {
          id: 1,
          nomor: "SPK-001/2025",
          pekerjaan: "Perbaikan Pipa Air",
          tanggal: "2025-11-12",
          status: "Selesai",
        },
        {
          id: 2,
          nomor: "SPK-002/2025",
          pekerjaan: "Pemasangan Sambungan Baru",
          tanggal: "2025-11-11",
          status: "Proses",
        },
        {
          id: 3,
          nomor: "SPK-003/2025",
          pekerjaan: "Pemeliharaan Reservoir",
          tanggal: "2025-11-10",
          status: "Menunggu",
        },
        {
          id: 4,
          nomor: "SPK-004/2025",
          pekerjaan: "Instalasi Meteran Digital",
          tanggal: "2025-11-09",
          status: "Selesai",
        },
        {
          id: 5,
          nomor: "SPK-005/2025",
          pekerjaan: "Perbaikan Kebocoran Utama",
          tanggal: "2025-11-08",
          status: "Proses",
        },
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSpk = spks.filter((item) => {
    const matchSearch =
      item.nomor.toLowerCase().includes(search.toLowerCase()) ||
      item.pekerjaan.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "Semua" || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCount = {
    semua: spks.length,
    selesai: spks.filter((s) => s.status === "Selesai").length,
    proses: spks.filter((s) => s.status === "Proses").length,
    menunggu: spks.filter((s) => s.status === "Menunggu").length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="bg-white rounded-3xl shadow-lg p-8 border border-blue-100">
          <div className="flex items-center gap-4 mb-2">
            <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-3 rounded-2xl shadow-lg">
              <FileText className="text-white" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
                Daftar Surat Perintah Kerja
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Kelola dan pantau seluruh SPK dalam satu tempat
              </p>
            </div>
          </div>

          {/* STATS CARDS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white shadow-lg hover:scale-105 transition-transform">
              <p className="text-sm opacity-90">Total SPK</p>
              <p className="text-3xl font-bold mt-1">{statusCount.semua}</p>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-white shadow-lg hover:scale-105 transition-transform">
              <p className="text-sm opacity-90">Selesai</p>
              <p className="text-3xl font-bold mt-1">{statusCount.selesai}</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl p-4 text-white shadow-lg hover:scale-105 transition-transform">
              <p className="text-sm opacity-90">Proses</p>
              <p className="text-3xl font-bold mt-1">{statusCount.proses}</p>
            </div>
            <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-2xl p-4 text-white shadow-lg hover:scale-105 transition-transform">
              <p className="text-sm opacity-90">Menunggu</p>
              <p className="text-3xl font-bold mt-1">{statusCount.menunggu}</p>
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER */}
        <div className="bg-white rounded-3xl shadow-lg p-6 border border-blue-100">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Cari nomor SPK atau jenis pekerjaan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl py-3.5 pl-12 pr-4 focus:border-cyan-500 focus:bg-white outline-none transition-all"
              />
            </div>

            {/* Filter */}
            <div className="relative">
              <Filter
                className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-gray-50 border-2 border-gray-200 rounded-2xl py-3.5 pl-12 pr-8 focus:border-cyan-500 focus:bg-white outline-none transition-all appearance-none cursor-pointer min-w-[180px]"
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
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden border border-blue-100">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2
                className="mx-auto animate-spin text-cyan-600 mb-4"
                size={40}
              />
              <p className="text-gray-500 font-medium">Memuat data SPK...</p>
            </div>
          ) : filteredSpk.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
                    <th className="px-6 py-4 text-left font-semibold">No</th>
                    <th className="px-6 py-4 text-left font-semibold">
                      Nomor SPK
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      Pekerjaan
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      Tanggal
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      Status
                    </th>
                    <th className="px-6 py-4 text-center font-semibold">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpk.map((spk, index) => (
                    <tr
                      key={spk.id}
                      className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-cyan-50 hover:to-blue-50 transition-all cursor-pointer group"
                      onClick={() => router.push(`/dashboard/spk/${spk.id}`)}
                    >
                      <td className="px-6 py-4 text-gray-700">{index + 1}</td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-cyan-700 group-hover:text-cyan-800">
                          {spk.nomor}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-700">
                        {spk.pekerjaan}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar size={16} className="text-gray-400" />
                          <span className="text-sm">{spk.tanggal}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-4 py-2 text-xs font-bold rounded-full shadow-sm ${
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
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/dashboard/spk/${spk.id}/edit`);
                          }}
                          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-2 rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-20 text-center">
              <div className="bg-gray-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="text-gray-400" size={40} />
              </div>
              <p className="text-gray-500 font-medium">
                Tidak ada data SPK ditemukan
              </p>
              <p className="text-gray-400 text-sm mt-1">
                Coba ubah kata kunci pencarian atau filter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}