"use client";

import { useState } from "react";
import { History, Eye, Download, Search } from "lucide-react";

// Using type alias for better type hints in TypeScript/JSX environment
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type RiwayatItem = {
  id: string;
  tanggalPengajuan: string;
  namaPengaju: string;
  jenisPengajuan: string;
  status: "Diterima" | "Ditolak" | "Diproses" | "Selesai";
  keterangan: string;
}

export default function RiwayatDataPengajuan() {
  const [searchTerm, setSearchTerm] = useState("");

  const riwayatData: RiwayatItem[] = [
    {
      id: "001",
      tanggalPengajuan: "2023-10-01",
      namaPengaju: "John Doe",
      jenisPengajuan: "Pemasangan Baru",
      status: "Selesai",
      keterangan: "Pemasangan berhasil dilakukan pada 2023-10-05 dan telah diverifikasi oleh tim lapangan.",
    },
    {
      id: "002",
      tanggalPengajuan: "2023-10-03",
      namaPengaju: "Jane Smith",
      jenisPengajuan: "Perbaikan",
      status: "Diproses",
      keterangan: "Sedang dalam proses perbaikan, menunggu konfirmasi persetujuan manajer area.",
    },
    {
      id: "003",
      tanggalPengajuan: "2023-09-28",
      namaPengaju: "Bob Johnson",
      jenisPengajuan: "Penggantian Meter",
      status: "Diterima",
      keterangan: "Pengajuan diterima, menunggu jadwal penugasan teknisi untuk pemasangan.",
    },
    {
      id: "004",
      tanggalPengajuan: "2023-09-25",
      namaPengaju: "Alice Brown",
      jenisPengajuan: "Penutupan Sementara",
      status: "Ditolak",
      keterangan: "Pengajuan ditolak karena alasan administrasi, dokumen kurang lengkap.",
    },
    {
      id: "005",
      tanggalPengajuan: "2023-09-20",
      namaPengaju: "Charlie Wilson",
      jenisPengajuan: "Pemasangan Baru",
      status: "Selesai",
      keterangan: "Pemasangan selesai pada 2023-09-25",
    },
  ];

  const filteredData = riwayatData.filter(
    (item) =>
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
    <div className="space-y-4 max-w-7xl mx-auto"> {/* Reduced vertical spacing */}
      {/* Header - Reduced padding and font size */}
      <div className="bg-gradient-to-r from-blue-50 to-white rounded-2xl p-5 border border-blue-100 shadow-lg"> {/* p-8 -> p-5, rounded-3xl -> rounded-2xl */}
        <div className="flex items-center gap-3 mb-3"> {/* Reduced gap and margin-bottom */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-3 rounded-xl shadow-md"> {/* p-4 -> p-3, rounded-2xl -> rounded-xl */}
            <History className="text-white" size={24} strokeWidth={2.5} /> {/* size={32} -> size={24} */}
          </div>
          <div>
            <h2 className="text-xl font-bold text-black mb-1"> {/* text-3xl -> text-xl, mb-2 -> mb-1 */}
              Riwayat Data Pengajuan
            </h2>
            <p className="text-black text-sm"> {/* text-lg -> text-sm */}
              Pantau dan kelola riwayat pengajuan pelanggan PDAM
            </p>
          </div>
        </div>

        <div className="relative max-w-sm mt-3"> {/* Reduced max-width and margin-top */}
          <Search
            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-black"
            size={16} 
          />
          <input
            type="text"
            placeholder="Cari berdasarkan nama, jenis, atau status..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-200 transition-all duration-300 bg-white shadow-sm text-sm text-black"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden"> 
        <div className="px-5 py-4 border-b border-blue-100"> 
          <h3 className="text-lg font-bold text-black"> 
            Daftar Riwayat Pengajuan
          </h3>
          <p className="text-black text-xs mt-1"> 
            Total {filteredData.length} pengajuan ditemukan
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gradient-to-r from-blue-50 to-blue-100">
              <tr>
                {[
                  "ID",
                  "Tanggal", 
                  "Nama Pengaju",
                  "Jenis Pengajuan",
                  "Status",
                  "Keterangan",
                  "Aksi",
                ].map((title) => (
                  <th
                    key={title}
                    className="px-4 py-3 text-left text-xs font-bold text-black uppercase tracking-wider whitespace-nowrap" // px-6 py-4 -> px-4 py-3, text-sm -> text-xs
                  >
                    {title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50">
              {filteredData.map((item, index) => (
                <tr
                  key={item.id}
                  className={`hover:bg-blue-50/50 transition-colors duration-200 ${
                    index % 2 === 0 ? "bg-white" : "bg-blue-25"
                  }`}
                >
                  <td className="px-4 py-3 text-xs font-medium text-black">{item.id}</td> 
                  <td className="px-4 py-3 text-xs text-black whitespace-nowrap"> 
                    {new Date(item.tanggalPengajuan).toLocaleDateString(
                      "id-ID",
                      { year: "numeric", month: "short", day: "numeric" } 
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-black">{item.namaPengaju}</td> 
                  <td className="px-4 py-3 text-xs text-black whitespace-nowrap">{item.jenisPengajuan}</td> 
                  <td className="px-4 py-3 whitespace-nowrap"> 
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusColor(
                        item.status
                      )}`} 
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-black max-w-sm truncate"> 
                    {item.keterangan}
                  </td>
                  <td className="px-4 py-3 text-xs font-medium"> 
                    <div className="flex gap-1.5">
                      <button
                        className="p-1.5 bg-blue-100 hover:bg-blue-200 rounded-md transition-colors duration-200" 
                        title="Lihat Detail"
                      >
                        <Eye
                          className="text-blue-700 hover:scale-110 transition-transform"
                          size={14} 
                        />
                      </button>
                      <button
                        className="p-1.5 bg-green-100 hover:bg-green-200 rounded-md transition-colors duration-200" 
                        title="Download Dokumen"
                      >
                        <Download
                          className="text-green-700 hover:scale-110 transition-transform"
                          size={14} 
                        />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredData.length === 0 && (
          <div className="px-5 py-8 text-center"> 
            <History className="mx-auto text-black mb-3" size={40} /> 
            <p className="text-black text-base font-medium">
              Tidak ada data riwayat yang ditemukan
            </p>
            <p className="text-black text-xs mt-1"> 
              Coba ubah kata kunci pencarian
            </p>
          </div>
        )}
      </div>

      {/* Footer - Reduced padding and font size */}
      <div className="bg-gradient-to-r from-blue-50 to-white rounded-xl p-4 border border-blue-100"> 
        <div className="flex items-center justify-between">
          <div className="text-xs text-black"> 
            <p className="font-medium">Informasi Tambahan:</p>
            <ul className="mt-1 space-y-0.5 list-disc list-inside"> 
              <li>Data riwayat diperbarui secara real-time</li>
              <li>Klik ikon mata untuk melihat detail lengkap</li>
              <li>Klik ikon download untuk mengunduh dokumen terkait</li>
            </ul>
          </div>
          <div className="text-right">
            <p className="text-xs text-black">Terakhir diperbarui:</p>
            <p className="text-base font-bold text-black"> 
              {new Date().toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}