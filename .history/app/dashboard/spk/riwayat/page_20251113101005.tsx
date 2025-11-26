import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, FileText, Eye, Download, Trash2 } from 'lucide-react';

const RiwayatSPK = () => {
  const [spkData, setSpkData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTahun, setFilterTahun] = useState('all');

  useEffect(() => {
    // Data dummy SPK
    const dummyData = [
      {
        id: 1,
        noSPK: 'SPK/2024/001',
        tanggal: '2024-01-15',
        vendor: 'PT. Mitra Sejahtera',
        pekerjaan: 'Pengadaan Peralatan Kantor',
        nilaiKontrak: 50000000,
        status: 'Selesai',
        tanggalSelesai: '2024-02-15'
      },
      {
        id: 2,
        noSPK: 'SPK/2024/002',
        tanggal: '2024-02-20',
        vendor: 'CV. Berkah Jaya',
        pekerjaan: 'Renovasi Gedung A',
        nilaiKontrak: 150000000,
        status: 'Dalam Proses',
        tanggalSelesai: '2024-12-20'
      },
      {
        id: 3,
        noSPK: 'SPK/2024/003',
        tanggal: '2024-03-10',
        vendor: 'PT. Teknologi Indonesia',
        pekerjaan: 'Instalasi Jaringan Komputer',
        nilaiKontrak: 75000000,
        status: 'Selesai',
        tanggalSelesai: '2024-04-10'
      },
      {
        id: 4,
        noSPK: 'SPK/2024/004',
        tanggal: '2024-05-05',
        vendor: 'UD. Karya Mandiri',
        pekerjaan: 'Pemeliharaan AC Gedung',
        nilaiKontrak: 25000000,
        status: 'Dalam Proses',
        tanggalSelesai: '2024-11-05'
      },
      {
        id: 5,
        noSPK: 'SPK/2023/015',
        tanggal: '2023-11-20',
        vendor: 'PT. Global Konstruksi',
        pekerjaan: 'Pembangunan Parkir',
        nilaiKontrak: 200000000,
        status: 'Selesai',
        tanggalSelesai: '2024-01-20'
      }
    ];
    setSpkData(dummyData);
  }, []);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(angka);
  };

  const formatTanggal = (tanggal) => {
    return new Date(tanggal).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const filteredData = spkData.filter(spk => {
    const matchSearch = 
      spk.noSPK.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spk.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      spk.pekerjaan.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = filterStatus === 'all' || spk.status === filterStatus;
    
    const tahunSPK = new Date(spk.tanggal).getFullYear().toString();
    const matchTahun = filterTahun === 'all' || tahunSPK === filterTahun;

    return matchSearch && matchStatus && matchTahun;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'Selesai':
        return 'bg-green-100 text-green-800';
      case 'Dalam Proses':
        return 'bg-blue-100 text-blue-800';
      case 'Dibatalkan':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const tahunList = [...new Set(spkData.map(spk => new Date(spk.tanggal).getFullYear()))].sort((a, b) => b - a);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Riwayat Data SPK</h1>
              <p className="text-gray-600 mt-1">Surat Perintah Kerja</p>
            </div>
            <FileText className="w-12 h-12 text-blue-600" />
          </div>

          {/* Filter & Search */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari nomor SPK, vendor, atau pekerjaan..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Semua Status</option>
                <option value="Selesai">Selesai</option>
                <option value="Dalam Proses">Dalam Proses</option>
              </select>
            </div>

            <div className="relative">
              <Calendar className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <select
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                value={filterTahun}
                onChange={(e) => setFilterTahun(e.target.value)}
              >
                <option value="all">Semua Tahun</option>
                {tahunList.map(tahun => (
                  <option key={tahun} value={tahun}>{tahun}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total SPK</p>
                <p className="text-2xl font-bold text-gray-800">{filteredData.length}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Dalam Proses</p>
                <p className="text-2xl font-bold text-blue-600">
                  {filteredData.filter(s => s.status === 'Dalam Proses').length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Selesai</p>
                <p className="text-2xl font-bold text-green-600">
                  {filteredData.filter(s => s.status === 'Selesai').length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">No SPK</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Vendor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Pekerjaan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Nilai Kontrak</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredData.length > 0 ? (
                  filteredData.map((spk) => (
                    <tr key={spk.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-medium text-gray-900">{spk.noSPK}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatTanggal(spk.tanggal)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {spk.vendor}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {spk.pekerjaan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatRupiah(spk.nilaiKontrak)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(spk.status)}`}>
                          {spk.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button 
                            className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                            title="Lihat Detail"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            title="Download"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                            title="Hapus"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      Tidak ada data SPK yang ditemukan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
