'use client';

import React, { useState, useMemo } from 'react';
import type { NextPage } from 'next';

// --- TIPE DATA ---
// Mendefinisikan tipe untuk status SPK
type StatusSPK = 'pending' | 'on-progress' | 'selesai' | 'dibatalkan';

// Mendefinisikan interface untuk struktur data SPK
interface SPK {
  id: string;
  noSpk: string;
  tanggal: string; // Format: 'YYYY-MM-DD'
  pelanggan: string;
  proyek: string;
  status: StatusSPK;
  totalNilai: number;
  tenggatWaktu: string; // Format: 'YYYY-MM-DD'
}

// --- DATA PALSU (MOCK DATA) ---
// Data ini akan digunakan untuk menampilkan tabel. Di aplikasi nyata, data bisa diambil dari API.
const spkData: SPK[] = [
  {
    id: '1',
    noSpk: 'SPK-2023-001',
    tanggal: '2023-10-01',
    pelanggan: 'PT. Maju Bersama',
    proyek: 'Pembangunan Gedung Kantor',
    status: 'selesai',
    totalNilai: 2500000000,
    tenggatWaktu: '2023-12-31',
  },
  {
    id: '2',
    noSpk: 'SPK-2023-002',
    tanggal: '2023-10-15',
    pelanggan: 'CV. Sejahtera Abadi',
    proyek: 'Renovasi Rumah Tinggal',
    status: 'on-progress',
    totalNilai: 500000000,
    tenggatWaktu: '2024-02-15',
  },
  {
    id: '3',
    noSpk: 'SPK-2023-003',
    tanggal: '2023-11-05',
    pelanggan: 'PT. Teknologi Canggih',
    proyek: 'Instalasi Jaringan LAN',
    status: 'on-progress',
    totalNilai: 150000000,
    tenggatWaktu: '2023-12-05',
  },
  {
    id: '4',
    noSpk: 'SPK-2023-004',
    tanggal: '2023-11-20',
    pelanggan: 'Ibu Siti Nurhaliza',
    proyek: 'Pembuatan Kitchen Set',
    status: 'pending',
    totalNilai: 75000000,
    tenggatWaktu: '2024-01-20',
  },
  {
    id: '5',
    noSpk: 'SPK-2023-005',
    tanggal: '2023-09-10',
    pelanggan: 'Budi Santoso',
    proyek: 'Pemasangan Atap Baja Ringan',
    status: 'dibatalkan',
    totalNilai: 120000000,
    tenggatWaktu: '2023-11-10',
  },
  {
    id: '6',
    noSpk: 'SPK-2024-001',
    tanggal: '2024-01-10',
    pelanggan: 'PT. Nusantara Jaya',
    proyek: 'Konstruksi Jalan Akses',
    status: 'on-progress',
    totalNilai: 800000000,
    tenggatWaktu: '2024-03-10',
  },
  {
    id: '7',
    noSpk: 'SPK-2024-002',
    tanggal: '2024-02-01',
    pelanggan: 'Ani Wijaya',
    proyek: 'Desain Interior Kafe',
    status: 'pending',
    totalNilai: 90000000,
    tenggatWaktu: '2024-04-01',
  },
];

// --- KOMPONEN HALAMAN ---
const RiwayatSPKPage: NextPage = () => {
  // --- STATE MANAGEMENT ---
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusSPK | ''>('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Jumlah item per halaman

  // --- FUNGSI HELPER ---
  // Untuk memformat angka menjadi format Rupiah
  const formatRupiah = (angka: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(angka);
  };

  // Untuk memformat tanggal menjadi format yang lebih mudah dibaca
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Untuk mendapatkan kelas CSS badge berdasarkan status
  const getStatusBadgeClass = (status: StatusSPK): string => {
    switch (status) {
      case 'selesai':
        return 'bg-green-100 text-green-800';
      case 'on-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'dibatalkan':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // --- LOGIKA PEMROSESAN DATA (FILTERING & PAGINATION) ---
  // useMemo digunakan agar perhitungan hanya dijalankan ketika dependensi berubah
  const processedData = useMemo(() => {
    // 1. Filter data berdasarkan pencarian dan status
    let filteredData = spkData.filter((item) => {
      const matchesSearch =
        item.pelanggan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.proyek.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter ? item.status === statusFilter : true;
      return matchesSearch && matchesStatus;
    });

    // 2. Hitung total halaman
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);

    // 3. Potong data untuk halaman saat ini
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

    return { paginatedData, totalPages, totalItems: filteredData.length };
  }, [searchTerm, statusFilter, currentPage]);

  const { paginatedData, totalPages, totalItems } = processedData;

  // --- RENDER KOMPONEN ---
  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Riwayat Surat Perintah Kerja (SPK)</h1>
          <p className="mt-2 text-gray-600">Kelola dan pantau seluruh data SPK yang telah dibuat.</p>
        </div>

        {/* Kontrol Pencarian dan Filter */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-md mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Cari Pelanggan atau Proyek
              </label>
              <input
                type="text"
                id="search"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Masukkan kata kunci..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Reset ke halaman 1 saat pencarian berubah
                }}
              />
            </div>
            <div className="w-full md:w-64">
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
                Filter Status
              </label>
              <select
                id="status-filter"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as StatusSPK | '');
                  setCurrentPage(1); // Reset ke halaman 1 saat filter berubah
                }}
              >
                <option value="">Semua Status</option>
                <option value="pending">Pending</option>
                <option value="on-progress">On Progress</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabel Data */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    No. SPK
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Pelanggan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proyek
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Nilai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenggat Waktu
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedData.length > 0 ? (
                  paginatedData.map((spk) => (
                    <tr key={spk.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {spk.noSpk}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(spk.tanggal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {spk.pelanggan}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <span className="block truncate" style={{ maxWidth: '200px' }} title={spk.proyek}>
                          {spk.proyek}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(spk.status)}`}>
                          {spk.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatRupiah(spk.totalNilai)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(spk.tenggatWaktu)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Tidak ada data yang ditemukan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Menampilkan <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> hingga{' '}
                    <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari{' '}
                    <span className="font-medium">{totalItems}</span> hasil
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Previous</span>
                      &larr;
                    </button>
                    {[...Array(totalPages)].map((_, index) => {
                      const page = index + 1;
                      const isActive = page === currentPage;
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          aria-current={isActive ? 'page' : undefined}
                          className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                            isActive
                              ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                          }`}
                        >
                          {page}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="sr-only">Next</span>
                      &rarr;
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiwayatSPKPage;