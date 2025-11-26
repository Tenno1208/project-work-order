"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function EditPengajuanPage({ params }: any) {
  const router = useRouter();
  const uuid = params.uuid;

  useEffect(() => {
    if (uuid) {
      router.replace(`/dashboard/lampiran/tambah?uuid=${uuid}`);
    }
  }, [uuid, router]);

  // Loading state sementara
  return (
    <div className="flex justify-center items-center h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat halaman edit...</p>
      </div>
    </div>
  );
}