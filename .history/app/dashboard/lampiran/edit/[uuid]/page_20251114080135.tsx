import LampiranPengajuanPage from "@/app/components/form-lampiran";

export default function EditPage({ params }) {
   localStorage.setItem("current_edit_uuid", params.uuid);
   return <LampiranPengajuanPage />;
}
