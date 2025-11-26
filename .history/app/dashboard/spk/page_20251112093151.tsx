"use client";

import React, { useEffect, useState } from "react";
import { FileText, Search, PlusCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function DaftarSPKPage() {
  const [loading, setLoading] = useState(true);
  const [spks, setSpks] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    // 🔹 Simulasi ambil data (bisa diganti API fetch nanti)
    const fetchData = async () => {
      setLoading(true);
      await new Promise((r) => setTimeout(r, 1000)); // delay simulasi
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
      ]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const filteredSpk = spks.filter(
    (item) =>
      item.nomor.toLowerCase().includes(search.toLowerCase()) ||
      item.pekerjaan.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-cyan-600" /> Daftar Surat Perintah Kerja
          </h2>
          <p className="text-gray-500 text-sm">
            Menampilkan daftar seluruh surat perintah kerja (SPK)
          </p>
        </div>
        <Button
          onClick={() => router.push("/dashboard/spk/tambah")}
          className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-5 py-2 rounded-xl shadow-md hover:scale-105 transition-all flex items-center gap-2"
        >
          <PlusCircle size={18} /> Tambah SPK
        </Button>
      </div>

      {/* SEARCH BAR */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Cari SPK berdasarkan nomor atau pekerjaan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-4 shadow-sm focus:ring-2 focus:ring-cyan-500 outline-none transition"
        />
      </div>

      {/* TABLE */}
      <div className="bg-white/90 backdrop-blur-md shadow-xl border border-cyan-100/50 rounded-2xl overflow-hidden">
        <table className="w-full text-sm text-gray-700">
          <thead className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white">
            <tr>
              <th className="px-6 py-3 text-left">No</th>
              <th className="px-6 py-3 text-left">Nomor SPK</th>
              <th className="px-6 py-3 text-left">Pekerjaan</th>
              <th className="px-6 py-3 text-left">Tanggal</th>
              <th className="px-6 py-3 text-left">Status</th>
              <th className="px-6 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  <Loader2 className="mx-auto animate-spin text-cyan-600" size={24} />
                  <p>Memuat data SPK...</p>
                </td>
              </tr>
            ) : filteredSpk.length > 0 ? (
              filteredSpk.map((spk, index) => (
                <tr
                  key={spk.id}
                  className="border-b border-gray-100 hover:bg-cyan-50/40 transition-all cursor-pointer"
                  onClick={() => router.push(`/dashboard/spk/${spk.id}`)}
                >
                  <td className="px-6 py-3">{index + 1}</td>
                  <td className="px-6 py-3 font-medium text-cyan-700">{spk.nomor}</td>
                  <td className="px-6 py-3">{spk.pekerjaan}</td>
                  <td className="px-6 py-3">{spk.tanggal}</td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                        spk.status === "Selesai"
                          ? "bg-green-100 text-green-700"
                          : spk.status === "Proses"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {spk.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/spk/${spk.id}/edit`);
                      }}
                      className="text-cyan-600 hover:text-cyan-800 font-medium transition"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-10 text-center text-gray-500">
                  Tidak ada data SPK ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
