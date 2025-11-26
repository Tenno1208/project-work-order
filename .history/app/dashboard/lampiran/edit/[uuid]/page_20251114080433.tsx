"use client";

import LampiranPengajuanPage from "/components/form-lampiran";

export default function EditPage({ params }) {
   if (typeof window !== "undefined") {
      localStorage.setItem("current_edit_uuid", params.uuid);
   }

   return <LampiranPengajuanPage />;
}
