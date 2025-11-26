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
    <div className="space-y-4 p-4 md:p-6"> {/* Padding Div Utama Diperkecil */}
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-md p-5 border border-blue-100"> {/* Padding Card Diperkecil */}
        <div className="flex items-center gap-3 mb-4"> {/* Spasi Diperkecil */}
          <div className="bg-blue-100 p-3 rounded-lg"> {/* Padding Icon Header Diperkecil */}
            <History className="text-blue-600" size={24} /> {/* Ukuran Icon Diperkecil */}
          </div>
          <div>
            <h2 className="text-xl font-bold text-black">Riwayat SPK</h2> {/* Ukuran Font Header Diperkecil */}
            <p className="text-black text-sm">
              Pantau dan kelola riwayat Surat Perintah Kerja PDAM
            </p>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 flex-wrap"> {/* Spasi Diperkecil */}
          <div className="flex-1 min-w-[250px] relative"> {/* Min-width Diperkecil */}
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60"
              size={16} // Ukuran Icon Diperkecil
            />
            <input
              type="text"
              placeholder="Cari berdasarkan nomor SPK, petugas, atau jenis pekerjaan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-black/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-black placeholder-black/60" // Ukuran Input Diperkecil
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-black/60"
                size={16} // Ukuran Icon Diperkecil
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-7 py-2 text-sm border border-black/30 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-black appearance-none cursor-pointer" // Ukuran Select Diperkecil
              >
                <option value="all">Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Dalam Proses">Dalam Proses</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
            {/* Tombol Download Tambahan */}
            <button
                className="p-2.5 flex items-center gap-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                title="Download Data"
            >
                <Download size={16} />
                <span className="hidden md:inline">Download</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3"> {/* Spasi Diperkecil */}
        {/* Card Total SPK */}
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200"> {/* Padding Card Diperkecil */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black text-xs font-medium">Total SPK</p> {/* Ukuran Font Diperkecil */}
              <p className="text-2xl font-bold text-black mt-1">{dummyData.length}</p> {/* Ukuran Font Diperkecil */}
            </div>
            <div className="bg-green-200 p-2 rounded-md"> {/* Padding Icon Diperkecil */}
              <History className="text-green-700" size={20} /> {/* Ukuran Icon Diperkecil */}
            </div>
          </div>
        </div>

        {/* Card Selesai */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black text-xs font-medium">Selesai</p>
              <p className="text-2xl font-bold text-black mt-1">
                {dummyData.filter((d) => d.status === "Selesai").length}
              </p>
            </div>
            <div className="bg-blue-200 p-2 rounded-md">
              <Calendar className="text-blue-700" size={20} />
            </div>
          </div>
        </div>

        {/* Card Dalam Proses */}
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-4 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black text-xs font-medium">Dalam Proses</p>
              <p className="text-2xl font-bold text-black mt-1">
                {dummyData.filter((d) => d.status === "Dalam Proses").length}
              </p>
            </div>
            <div className="bg-yellow-200 p-2 rounded-md">
              <Calendar className="text-yellow-700" size={20} />
            </div>
          </div>
        </div>

        {/* Card Pending */}
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-black text-xs font-medium">Pending</p>
              <p className="text-2xl font-bold text-black mt-1">
                {dummyData.filter((d) => d.status === "Pending").length}
              </p>
            </div>
            <div className="bg-purple-200 p-2 rounded-md">
              <Calendar className="text-purple-700" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-md border border-blue-100 overflow-hidden">
        <div className="p-4 border-b border-black/10 bg-gradient-to-r from-blue-50 to-white"> {/* Padding Header Tabel Diperkecil */}
          <h3 className="text-base font-bold text-black">Daftar Riwayat SPK</h3> {/* Ukuran Font Diperkecil */}
          <p className="text-xs text-black mt-1"> {/* Ukuran Font Diperkecil */}
            Total {filteredData.length} SPK ditemukan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full"> {/* min-w-full agar full width */}
            <thead className="bg-gray-50 border-b border-black/10">
              <tr>
                {[
                  "ID",
                  "Tanggal SPK",
                  "Nomor SPK",
                  "Petugas", // Singkat
                  "Jenis Pekerjaan",
                  "Lokasi",
                  "Status",
                  "Aksi",
                ].map((title) => (
                  <th
                    key={title}
                    className="px-4 py-3 text-left text-[10px] font-bold text-black uppercase tracking-wider whitespace-nowrap" // Padding dan Font Ukuran Header Tabel Diperkecil
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/10">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Search className="text-black/40" size={32} /> {/* Ukuran Icon Diperkecil */}
                      <p className="text-sm text-black font-medium"> {/* Ukuran Font Diperkecil */}
                        Tidak ada data yang ditemukan
                      </p>
                      <p className="text-xs text-black/60"> {/* Ukuran Font Diperkecil */}
                        Coba ubah filter atau kata kunci pencarian
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-4 py-3 text-xs font-semibold text-black whitespace-nowrap">{item.id}</td> {/* Padding dan Font Ukuran Data Tabel Diperkecil */}
                    <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.tanggalSPK}</td> {/* Padding dan Font Ukuran Data Tabel Diperkecil */}
                    <td className="px-4 py-3 text-xs font-medium text-black whitespace-nowrap">{item.nomorSPK}</td> {/* Padding dan Font Ukuran Data Tabel Diperkecil */}
                    <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.namaPetugas}</td> {/* Padding dan Font Ukuran Data Tabel Diperkecil */}
                    <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.jenisPekerjaan}</td> {/* Padding dan Font Ukuran Data Tabel Diperkecil */}
                    <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.lokasi}</td> {/* Padding dan Font Ukuran Data Tabel Diperkecil */}
                    <td className="px-4 py-3"> {/* Padding Data Tabel Diperkecil */}
                      <span
                        className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getStatusColor(
                          item.status
                        )} whitespace-nowrap`} // Ukuran Font Status Diperkecil
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3"> {/* Padding Data Tabel Diperkecil */}
                      <div className="flex gap-1"> {/* Spasi Diperkecil */}
                        <button
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" // Padding Tombol Aksi Diperkecil
                          title="Lihat Detail"
                        >
                          <Eye size={16} /> {/* Ukuran Icon Aksi Diperkecil */}
                        </button>
                        <button
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" // Padding Tombol Aksi Diperkecil
                          title="Download"
                        >
                          <Download size={16} /> {/* Ukuran Icon Aksi Diperkecil */}
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