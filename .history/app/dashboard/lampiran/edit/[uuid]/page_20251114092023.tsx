"use client";

import LampiranPengajuanPage from "@/app/components/form-lampiran";

// Parameter props di Next.js App Router (params)
export default function EditPage({ params }: { params: { uuid: string } }) {
    // Memastikan kita berada di sisi klien sebelum mengakses localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("current_edit_uuid", params.uuid);
    }

    return <LampiranPengajuanPage />;
}