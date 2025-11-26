"use client";

import { useState } from "react";
import { History, Search, Eye, Download, Filter, Calendar } from "lucide-react";

type SPKData = {
  id: string;
  tanggalSPK: string;
  nomorSPK: string;
  namaPetugas: string;
  jenisPekerjaan: string;
  lokasi: string;
  status: "Selesai" | "Dalam Proses" | "Pending";
  keterangan: string;
};

export default function RiwayatSPKPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dummy data
  const dummyData: SPKData[] = [
    {
      id: "SPK-001",
      tanggalSPK: "5 November 2025",
      nomorSPK: "SPK/2025/001",
      namaPetugas: "Ahmad Subandi",
      jenisPekerjaan: "Pemasangan Baru",
      lokasi: "Seksi Produksi",
      status: "Selesai",
      keterangan: "SPK telah selesai dikerjakan pada tanggal 10 November 2025",
    },
    {
      id: "SPK-002",
      tanggalSPK: "7 November 2025",
      nomorSPK: "SPK/2025/002",
      namaPetugas: "Budi Santoso",
      jenisPekerjaan: "Perbaikan",
      lokasi: "Sub Bid Keuangan",
      status: "Dalam Proses",
      keterangan: "Sedang dalam proses perbaikan sistem keuangan",
    },
    {
      id: "SPK-003",
      tanggalSPK: "8 November 2025",
      nomorSPK: "SPK/2025/003",
      namaPetugas: "Siti Aminah",
      jenisPekerjaan: "Pemeliharaan",
      lokasi: "Kasatker Wilayah Barat",
      status: "Pending",
      keterangan: "Menunggu konfirmasi jadwal pemeliharaan",
    },
    {
      id: "SPK-004",
      tanggalSPK: "9 November 2025",
      nomorSPK: "SPK/2025/004",
      namaPetugas: "Rudi Hermawan",
      jenisPekerjaan: "Perbaikan Meter",
      lokasi: "Sub Bag Umum",
      status: "Selesai",
      keterangan: "Perbaikan meter air selesai dilakukan",
    },
    {
      id: "SPK-005",
      tanggalSPK: "10 November 2025",
      nomorSPK: "SPK/2025/005",
      namaPetugas: "Dewi Kusuma",
      jenisPekerjaan: "Pengaduan Kerusakan",
      lokasi: "Seksi Produksi",
      status: "Dalam Proses",
      keterangan: "Penanganan kerusakan pipa distribusi",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Selesai":
        return "bg-green-100 text-green-700 border-green-200";
      case "Dalam Proses":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "Pending":
        return "bg-blue-100 text-blue-700 border-blue-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const filteredData = dummyData.filter((item) => {
    const matchSearch =
      item.nomorSPK.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.namaPetugas.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.jenisPekerjaan.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchFilter = filterStatus === "all" || item.status === filterStatus;
    
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-2xl shadow-lg p-8 border border-blue-100">
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-blue-100 p-4 rounded-2xl">
            <History className="text-blue-600" size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Riwayat SPK</h2>
            <p className="text-gray-600 text-sm">
              Pantau dan kelola riwayat Surat Perintah Kerja PDAM
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[300px] relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor SPK, petugas, atau jenis pekerjaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-10 pr-8 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer"
              >
                <option value="all">
                  Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-5 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Total SPK</p>
              <p className="text-3xl font-bold text-green-700 mt-1">{dummyData.length}</p>
            </div>
            <div className="bg-green-200 p-3 rounded-lg">
              <History className="text-green-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-5 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Selesai</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {dummyData.filter((d) => d.status === "Selesai").length}
              </p>
            </div>
            <div className="bg-blue-200 p-3 rounded-lg">
              <Calendar className="text-blue-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-5 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Dalam Proses</p>
              <p className="text-3xl font-bold text-yellow-700 mt-1">
                {dummyData.filter((d) => d.status === "Dalam Proses").length}
              </p>
            </div>
            <div className="bg-yellow-200 p-3 rounded-lg">
              <Calendar className="text-yellow-700" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-5 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 text-sm font-medium">Pending</p>
              <p className="text-3xl font-bold text-purple-700 mt-1">
                {dummyData.filter((d) => d.status === "Pending").length}
              </p>
            </div>
            <div className="bg-purple-200 p-3 rounded-lg">
              <Calendar className="text-purple-700" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-blue-100 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
          <h3 className="text-lg font-bold text-gray-800">
            Daftar Riwayat SPK
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Total {filteredData.length} SPK ditemukan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tanggal SPK
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nomor SPK
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Nama Petugas
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Jenis Pekerjaan
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Lokasi
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <Search className="text-gray-300" size={48} />
                      <p className="text-gray-500 font-medium">
                        Tidak ada data yang ditemukan
                      </p>
                      <p className="text-sm text-gray-400">
                        Coba ubah filter atau kata kunci pencarian
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-blue-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-blue-600">
                        {item.id}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {item.tanggalSPK}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-800">
                        {item.nomorSPK}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {item.namaPetugas}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {item.jenisPekerjaan}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {item.lokasi}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(
                          item.status
                        )}`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex gap-2">
                        <button
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Lihat Detail"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}