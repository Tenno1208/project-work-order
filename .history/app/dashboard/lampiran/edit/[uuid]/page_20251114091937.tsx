"use client";

import LampiranPengajuanPage from "@/app/components/form-lampiran";

// Parameter props di Next.js App Router (params)
export default function EditPage({ params }: { params: { uuid: string } }) {
    // Memastikan kita berada di sisi klien sebelum mengakses localStorage
    if (typeof window !== "undefined") {
      // Menyimpan UUID dari parameter URL ke localStorage
      // Ini akan digunakan oleh LampiranPengajuanPage untuk mode EDIT
      localStorage.setItem("current_edit_uuid", params.uuid);
    }

    // Tampilkan LampiranPengajuanPage, yang akan mendeteksi mode edit
    // berdasarkan adanya 'current_edit_uuid' di localStorage.
    return <LampiranPengajuanPage />;
}