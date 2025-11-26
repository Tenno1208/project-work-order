"use client";

import LampiranPengajuanPage from "@/app/components/form-lampiran";

export default function ViewPage({ params }) {
   if (typeof window !== "undefined") {
      localStorage.setItem("current_view_uuid", params.uuid);
   }

   return <LampiranPengajuanPage />;
}
