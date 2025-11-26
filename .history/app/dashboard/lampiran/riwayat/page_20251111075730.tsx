"use client";

import { useState } from "react";
import { History, Eye, Download, Search } from "lucide-react";

interface RiwayatItem {
  id: string;
  tanggalPengajuan: string;
  namaPengaju: string;
  jenisPengajuan: string;
  status: "Diterima" | "Ditolak" | "Diproses" | "Selesai";
  keterangan: string;
}

export default function RiwayatDataPengajuan() {
  const [searchTerm, setSearchTerm] = useState("");

  // Data dummy untuk riwayat pengajuan
  const riwayatData: RiwayatItem[] = [
    {
      id: "001",
      tanggalPengajuan: "2023-10-01",
      namaPengaju: "John Doe",
      jenisPengajuan: "Pemasangan Baru",
      status: "Selesai",
      keterangan: "Pemasangan berhasil dilakukan pada 2023-10-05"
    },
    {
      id: "002",
      tanggalPengajuan: "2023-10-03",
      namaPengaju: "Jane Smith",
      jenisPengajuan: "Perbaikan",
      status: "Diproses",
      keterangan: "Sedang dalam proses perbaikan"
    },
    {
      id: "003",
      tanggalPengajuan: "2023-09-28",
      namaPengaju: "Bob Johnson",
      jenisPengajuan: "Penggantian Meter",
      status: "Diterima",
      keterangan: "Pengajuan diterima, menunggu jadwal"
    },
    {
      id: "004",
      tanggalPengajuan: "2023-09-25",
      namaPengaju: "Alice Brown",
      jenisPengajuan: "Penutupan Sementara",
      status: "Ditolak",
      keterangan: "Pengajuan ditolak karena alasan administrasi"
    },
    {
      id: "005",
      tanggalPengajuan: "2023-09-20",
      namaPengaju: "Charlie Wilson",
      jenisPengajuan: "Pemasangan Baru",
      status: "Selesai",
      keterangan: "Pemasangan selesai pada 2023-09-25"
    }
  ];

  const filteredData = riwayatData.filter(item =>
    item.namaPengaju.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.jenisPengajuan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Selesai":
        return "bg-green-100 text-green-800 border-green-200";
      case "Diproses":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Diterima":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Ditolak":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-8">
      {/* Header Halaman */}
      <div className="bg-gradient-to-r from-blue-50 to-white rounded-3xl p-8 border border-blue-100 shadow-lg">
        <div className="flex items-center gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-4 rounded-2xl shadow-lg">
            <History className="text-white" size={32} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-blue-900 mb-2">Riwayat Data Pengajuan</h2>
            <p className="text-blue-600 text-lg">Pantau dan kelola riwayat pengajuan pelanggan PDAM</p>
          </div>
        </div>
        
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-400" size={20} />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, jenis, atau status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-white shadow-sm"
          />
        </div>
      </div>

      {/* Tabel Riwayat */}
      <div className="bg-white rounded-3xl shadow-xl border border-blue-100 overflow-hidden">
        <div className="px-8 py-6 border-b border-blue-100">
          <h3 className="text-xl font-bold text-blue-900">Daftar Riwayat Pengajuan</h3>
          <p className="text-blue-600 text-sm mt-1">Total {filteredData.length} pengajuan ditemukan</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">ID</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">Tanggal Pengajuan</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">Nama Pengaju</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">Jenis Pengajuan</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">Keterangan</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-blue-900 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredData.map((item, index) => (
                <tr key={item.id} className={`hover:bg-blue-50/50 transition-colors duration-200 ${index % 2 === 0 ? 'bg-white' : 'bg-blue-25'}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-900">{item.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                    {new Date(item.tanggalPengajuan).toLocaleDateString('id-ID', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.namaPengaju}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{item.jenisPengajuan}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 max-w-xs truncate">{item.keterangan}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button className="p-2 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors duration-200 group" title="Lihat Detail">
                        <Eye className="text-blue-600 group-hover:scale-110 transition-transform" size={16} />
                      </button>
                      <button className="p-2 bg-green-100 hover:bg-green-200 rounded-lg transition-colors duration-200 group" title="Download Dokumen">
                        <Download className="text-green-600 group-hover:scale-110 transition-transform" size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredData.length === 0 && (
          <div className="px-8 py-12 text-center">
            <History className="mx-auto text-blue-300 mb-4" size={48} />
            <p className="text-blue-600 text-lg font-medium">Tidak ada data riwayat yang ditemukan</p>
            <p className="text-blue-400 text-sm mt-2">Coba ubah kata kunci pencarian</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-gradient-to-r from-blue-50 to-white rounded-2xl p-6 border border-blue-100">
        <div className="flex items-center justify-between">
          <div className="text-sm text-blue-600">
            <p className="font-medium">Informasi Tambahan:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Data riwayat diperbarui secara real-time</li>
              <li>Klik ikon mata untuk melihat detail lengkap</li>
              <li>Klik ikon download untuk mengunduh dokumen terkait</li>
            </ul>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-600">Terakhir diperbarui:</p>
            <p className="text-lg font-bold text-blue-900">
              {new Date().toLocaleDateString('id-ID', {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
