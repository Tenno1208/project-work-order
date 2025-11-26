"use client";

// PERBAIKAN 1: Tambahkan useParams ke import
import { useRouter, useSearchParams, useParams } from "next/navigation"; 
import { useEffect, useState } from "react";
import LampiranPengajuanPage from "@/app/components/form-lampiran"; // Perhatikan path ini
import { Loader2 } from "lucide-react";

export default function ViewEditPengajuanPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // PERBAIKAN 2: useParams sekarang sudah terdefinisi
    const params = useParams(); 
    
    const uuid = params.uuid as string;
    const isEditMode = searchParams.get('edit') === 'true';
    const mode = isEditMode ? 'edit' : 'view';

    const [isValidating, setIsValidating] = useState(true);

    useEffect(() => {
        // PERBAIKAN 3: Logika sedikit lebih sederhana
        if (!uuid) {
            router.push("/dashboard/lampiran");
        } else {
            setIsValidating(false);
        }
    }, [uuid, router]);

    if (isValidating) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="animate-spin text-blue-600" size={48}/>
                <span className="ml-3 text-lg font-semibold">Memuat halaman...</span>
            </div>
        );
    }

    const handleSuccess = () => {
        router.push("/dashboard/lampiran");
    };
    
    return (
        <LampiranPengajuanPage 
            mode={mode} 
            uuid={uuid} 
            onSuccess={isEditMode ? handleSuccess : undefined} 
        />
    );
}