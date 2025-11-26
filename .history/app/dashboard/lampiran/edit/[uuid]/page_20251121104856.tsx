// app/dashboard/lampiran/edit/[uuid]/page.tsx

"use client";

import { useRouter } from "next/navigation";
import React, { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, Home } from "lucide-react";
// Import FormLampiran


export default function EditPengajuanForm({ params }: { params: { uuid: string } }) { 
    // useRouter sekarang menggunakan import dari "next/navigation"
    const router = useRouter(); 
    const uuid = params.uuid; 

    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [debugUrl, setDebugUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

  const fetchDataForEdit = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDebugUrl(null);

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    if (!token) {
      setError("Token tidak ditemukan. Silakan login.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/pengajuan/edit/${uuid}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        setError(result.message || "Gagal memuat data.");
        setDebugUrl(result.debug_url_eksternal || null);
        setLoading(false);
        return;
      }

      const item = result.data;

      setFormData({
    id: item.id,
    uuid: item.uuid,
    hal_id: item.hal_id?.toString() || "",
    kepada: item.kepada || "",
    satker: item.satker || "",
    name_pelapor: item.name_pelapor || "",
    npp_pelapor: item.npp_pelapor || "",
    kode_barang: item.kode_barang || "",
    keterangan: item.keterangan || item.catatan || "",
    file: item.file || "",
    status: item.status || "",
    created_at: item.created_at,
    updated_at: item.updated_at,
});

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [uuid]); // Dependensi uuid diperlukan

  useEffect(() => {
    fetchDataForEdit();
  }, [fetchDataForEdit]);

  // UPDATE ACTION
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setIsSaving(true);

    await new Promise((r) => setTimeout(r, 1500));
    alert("Data berhasil disimpan (Simulasi)");

    router.push("/dashboard/lampiran");
  };

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

        {debugUrl && (
          <div className="text-sm bg-red-50 p-3 rounded-lg border-red-200 mb-6">
            <p className="font-semibold text-red-600">URL Eksternal:</p>
            <p className="text-xs text-red-500 break-words">{debugUrl}</p>
          </div>
        )}

        <button
          onClick={() => router.push("/dashboard/lampiran")}
          className="w-full bg-blue-600 text-white py-2 rounded-lg"
        >
          <Home size={18} className="inline-block mr-2" />
          Kembali
        </button>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto mt-8">
      {/* Pastikan FormLampiran di-import */}
      <FormLampiran
        initialData={formData} // Mengirim data yang sudah di-fetch
        // Anda mungkin perlu menambahkan prop lain yang dibutuhkan FormLampiran
        // setFormData={setFormData} // Jika FormLampiran perlu mengubah state induk
        isSaving={isSaving}
        onCancel={() => router.push("/dashboard/lampiran")}
        onSubmit={handleUpdate}
      />
    </div>
  );
}