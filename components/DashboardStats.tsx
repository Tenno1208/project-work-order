"use client";

import { ClipboardList, FileText, CircleCheckBig, TrendingUp, TrendingDown, X } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";

// --- TIPE DATA DARI API ---
interface DashboardData {
  success: boolean;
  filter: {
    active: boolean;
    start_date: string | null;
    end_date: string | null;
  };
  total: { pengajuan: number; spk: number; semua: number; };
  status: {
    pengajuan: { pending: { total: number }; approved: { total: number }; rejected: { total: number }; };
    spk: { menunggu: { total: number }; Proses: { total: number }; Selesai: { total: number }; "Belum Selesai": { total: number }; "Tidak Selesai": { total: number }; };
  };
  grafik_tahunan: {
    pengajuan: { tahun: number; total: number }[];
    spk: { tahun: number; total: number }[];
  };
  grafik_bulanan: {
    pengajuan: { bulan: number; total: number }[];
    spk: { bulan: number; total: number }[];
  };
  perbandingan_default: {
    pengajuan: { bulan_ini: number; bulan_lalu: number; selisih: number };
    spk: { bulan_ini: number; bulan_lalu: number; selisih: number };
  };
  perbandingan_custom: {
    pengajuan?: { bulan_ini: number; bulan_lalu: number; selisih: number };
    spk?: { bulan_ini: number; bulan_lalu: number; selisih: number };
  } | null;
}

interface DashboardPageProps {
  data: DashboardData | null;
  loading: boolean;
}

// --- KONSTANTA ---
// Warna khusus untuk status pengajuan: pending=kuning, ditolak=merah
const COLORS_PIE_PENGAJUAN = ['#F59E0B', '#10B981', '#EF4444']; // pending, approved, rejected
const COLORS_PIE_SPK = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444']; // menunggu, proses, selesai, belum selesai, tidak selesai

// --- KOMPONEN KARTU STATISTIK ---
const StatCard = ({ title, value, icon: Icon, color, comparison }: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  comparison?: { selisih: number };
}) => {
  const isPositive = comparison && comparison.selisih > 0;
  const isNegative = comparison && comparison.selisih < 0;

  return (
    <div className="bg-white rounded-xl p-4 shadow-lg border border-gray-200 hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${color} rounded-lg shadow-md`}>
          <Icon className="text-white" size={20} />
        </div>
        {comparison && (
          <div className={`flex flex-col items-end`}>
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${
              isPositive ? 'bg-green-100 text-green-700' : 
              isNegative ? 'bg-red-100 text-red-700' : 
              'bg-gray-100 text-black'
            }`}>
              {isPositive && <TrendingUp size={12} />}
              {isNegative && <TrendingDown size={12} />}
              <span>
                {isPositive && '+'}{comparison.selisih}
              </span>
            </div>
            <span className="text-xs text-black mt-0.5">vs bulan lalu</span>
          </div>
        )}
      </div>
      <h3 className="text-xs font-semibold text-black uppercase tracking-wide mb-1">{title}</h3>
      <p className="text-3xl font-extrabold text-black">
        {typeof value === 'number' ? value.toLocaleString('id-ID') : value}
      </p>
    </div>
  );
};

// --- FUNGSI PEMBANTU ---
const formatBulan = (bulan: number) => {
  const date = new Date();
  date.setMonth(bulan - 1);
  return date.toLocaleString('id-ID', { month: 'short' });
};

// --- CUSTOM TOOLTIP ---
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 rounded-lg shadow-xl border border-gray-200">
        <p className="font-bold text-black mb-1.5 text-sm">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-xs font-semibold text-black" style={{ color: entry.color }}>
            {entry.name}: {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardStats({ data, loading }: DashboardPageProps) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-3 border-blue-600 mb-3"></div>
          <div className="text-lg font-bold text-blue-700">Memuat data dashboard...</div>
          <div className="text-sm text-black mt-1">Mohon tunggu sebentar</div>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="flex h-64 items-center justify-center bg-gradient-to-br from-red-50 to-white rounded-xl shadow-lg border border-red-200">
        <div className="text-center">
          <div className="inline-block p-3 bg-red-100 rounded-full mb-3">
            <X size={32} className="text-red-600" />
          </div>
          <div className="text-lg font-bold text-red-700">Gagal memuat data dashboard</div>
          <div className="text-sm text-black mt-1">Silakan coba refresh halaman</div>
        </div>
      </div>
    );
  }

  // --- PROSES DATA UNTUK GRAFIK ---
  const pieDataPengajuan = [
    { name: 'Pending', value: data.status.pengajuan.pending.total },
    { name: 'Disetujui', value: data.status.pengajuan.approved.total },
    { name: 'Ditolak', value: data.status.pengajuan.rejected.total },
  ].filter(item => item.value > 0);

  const pieDataSpk = [
    { name: 'Menunggu', value: data.status.spk.menunggu.total },
    { name: 'Proses', value: data.status.spk.Proses.total },
    { name: 'Selesai', value: data.status.spk.Selesai.total },
    { name: 'Belum Selesai', value: data.status.spk["Belum Selesai"].total },
    { name: 'Tidak Selesai', value: data.status.spk["Tidak Selesai"].total },
  ].filter(item => item.value > 0);

  const combinedBulanan = (data.grafik_bulanan.pengajuan ?? []).map(item => ({
    bulan: formatBulan(item.bulan),
    pengajuan: item.total,
    spk: data.grafik_bulanan.spk?.find(s => s.bulan === item.bulan)?.total ?? 0,
  }));

  const combinedTahunan = (data.grafik_tahunan.pengajuan ?? []).map(item => ({
    tahun: item.tahun.toString(),
    pengajuan: item.total,
    spk: data.grafik_tahunan.spk?.find(s => s.tahun === item.tahun)?.total ?? 0,
  }));
  
  const activeComparison = data.filter.active ? data.perbandingan_custom : data.perbandingan_default;

  // --- RENDER UI ---
  return (
    <div className="space-y-5">
      {/* Kartu Statistik Utama */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Pengajuan"
          value={data.total.pengajuan}
          icon={ClipboardList}
          color="from-blue-500 to-blue-600"
          comparison={activeComparison?.pengajuan}
        />
        <StatCard
          title="Total SPK"
          value={data.total.spk}
          icon={FileText}
          color="from-green-500 to-green-600"
          comparison={activeComparison?.spk}
        />
        <StatCard
          title="Total Semua"
          value={data.total.semua}
          icon={CircleCheckBig}
          color="from-purple-500 to-purple-600"
        />
      </div>

      {/* Grafik Pie Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-blue-100 rounded-md">
              <ClipboardList size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Status Pengajuan</h3>
              <p className="text-xs text-black">Distribusi berdasarkan status</p>
            </div>
          </div>
          {pieDataPengajuan.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={pieDataPengajuan} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={85}
                  innerRadius={50}
                  fill="#8884d8" 
                  dataKey="value" 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieDataPengajuan.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE_PENGAJUAN[index % COLORS_PIE_PENGAJUAN.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-black py-16">
              <ClipboardList size={40} className="mx-auto mb-2 text-black" />
              <p className="font-semibold text-sm">Tidak ada data pengajuan</p>
              <p className="text-xs">untuk periode ini</p>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-green-100 rounded-md">
              <FileText size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Status SPK</h3>
              <p className="text-xs text-black">Distribusi berdasarkan status</p>
            </div>
          </div>
          {pieDataSpk.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie 
                  data={pieDataSpk} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={85}
                  innerRadius={50}
                  fill="#8884d8" 
                  dataKey="value" 
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieDataSpk.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS_PIE_SPK[index % COLORS_PIE_SPK.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-black py-16">
              <FileText size={40} className="mx-auto mb-2 text-black" />
              <p className="font-semibold text-sm">Tidak ada data SPK</p>
              <p className="text-xs">untuk periode ini</p>
            </div>
          )}
        </div>
      </div>

      {/* Grafik Bar Bulanan & Tahunan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-purple-100 rounded-md">
              <TrendingUp size={18} className="text-purple-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Tren Bulanan</h3>
              <p className="text-xs text-black">Perbandingan pengajuan & SPK</p>
            </div>
          </div>
          {combinedBulanan.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={combinedBulanan} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPengajuan" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.5}/>
                  </linearGradient>
                  <linearGradient id="colorSpk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="bulan" tick={{ fontSize: 11, fill: '#000000' }} />
                <YAxis tick={{ fontSize: 11, fill: '#000000' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#000000' }} />
                <Bar dataKey="pengajuan" fill="url(#colorPengajuan)" name="Pengajuan" radius={[6, 6, 0, 0]} />
                <Bar dataKey="spk" fill="url(#colorSpk)" name="SPK" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-black py-16">
              <TrendingUp size={40} className="mx-auto mb-2 text-black" />
              <p className="font-semibold text-sm">Tidak ada data bulanan</p>
              <p className="text-xs">untuk periode ini</p>
            </div>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="p-1.5 bg-indigo-100 rounded-md">
              <TrendingUp size={18} className="text-indigo-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-black">Tren Tahunan</h3>
              <p className="text-xs text-black">Perbandingan pengajuan & SPK</p>
            </div>
          </div>
          {combinedTahunan.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={combinedTahunan} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPengajuanYear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.5}/>
                  </linearGradient>
                  <linearGradient id="colorSpkYear" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.5}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="tahun" tick={{ fontSize: 11, fill: '#000000' }} />
                <YAxis tick={{ fontSize: 11, fill: '#000000' }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#000000' }} />
                <Bar dataKey="pengajuan" fill="url(#colorPengajuanYear)" name="Pengajuan" radius={[6, 6, 0, 0]} />
                <Bar dataKey="spk" fill="url(#colorSpkYear)" name="SPK" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-black py-16">
              <TrendingUp size={40} className="mx-auto mb-2 text-black" />
              <p className="font-semibold text-sm">Tidak ada data tahunan</p>
              <p className="text-xs">untuk periode ini</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}