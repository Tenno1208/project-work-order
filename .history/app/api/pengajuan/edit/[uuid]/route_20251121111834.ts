"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, AlertTriangle, Home } from "lucide-react";
import FormLampiran from "@/app/components/form-lampiran";

// ✅ GUNAKAN API INTERNAL (PROXY) - BUKAN EXTERNAL LANGSUNG
const DETAIL_API_PATH = "/api/pengajuan/edit"; // Proxy internal Next.js

export default function EditPengajuanPage({ params }: any) {
  const uuid = params.uuid;

  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDataForEdit = useCallback(async () => {
    setLoading(true);
    setError(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setError("Token tidak ditemukan. Silakan login.");
      setLoading(false);
      return;
    }

    try {
      // ✅ FETCH KE PROXY INTERNAL (NO CORS!)
      const res = await fetch(`${DETAIL_API_PATH}/${uuid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Gagal memuat data.");
        console.error("Error API Response:", result);
        setLoading(false);
        return;
      }

      const item = result.data;

      setFormData({
        uuid: item.uuid,
        hal_id: item.hal_id,
        kepada: item.kepada || "",
        satker: item.satker || "",
        kode_barang: item.kode_barang || "",
        keterangan: item.keterangan || item.catatan || "",
        name_pelapor: item.name_pelapor || item.name || "",
        npp_pelapor: item.npp_pelapor || item.npp || "",
        mengetahui: item.mengetahui || "",
        npp_mengetahui: item.npp_mengetahui || "",
        file_paths: item.file_paths || "",
        ttd_pelapor: item.ttd_pelapor || "",
        created_at: item.created_at,
      });

      console.log("✅ Data berhasil di-fetch via proxy:", item);

    } catch (err: any) {
      setError(err.message);
      console.error("❌ Error fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [uuid]);

  useEffect(() => {
    fetchDataForEdit();
  }, [fetchDataForEdit]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen bg-gray-100">
        <Loader2 className="animate-spin text-blue-600 mr-3" size={32} />
        <span className="text-xl">Memuat data...</span>
      </div>
    );

  if (error)
    return (
      <div className="p-8 max-w-2xl mx-auto bg-white rounded-xl shadow-xl mt-10">
        <AlertTriangle className="text-red-500 mb-4 mx-auto" size={40} />
        <h3 className="text-2xl font-bold text-red-600 text-center mb-2">
          Terjadi Kesalahan
        </h3>
        <p className="text-gray-700 text-center mb-6">{error}</p>
        <button
          onClick={() => window.location.href = "/dashboard/lampiran"}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <Home size={18} className="inline-block mr-2" />
          Kembali ke Daftar
        </button>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto mt-8">
      {formData && (
        <FormLampiran
          initialData={formData}
          mode="edit"
        />
      )}
    </div>
  );
}