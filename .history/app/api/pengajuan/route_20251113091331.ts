import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

// --- Tipe Respon File Handler ---
interface FileHandlerResponse {
    success: boolean;
    message?: string;
    data?: {
        fileUrl: string;
    }
}

/**
 * Mengunggah file ke File Handler eksternal.
 * Menambahkan header ngrok-skip-browser-warning ke File Handler.
 */
async function uploadFile(file: File, token: string, customName: string, type: 'ttd' | 'pengajuans'): Promise<string> {
    const formData = new FormData();
    
    const uploadPath = type === 'ttd' ? 'work-order/ttd/' : 'work-order/attachment/';
    
    formData.append('photo', file, customName); 
    formData.append('path', uploadPath); 
    formData.append('filename', customName);
    
    const res = await fetch(FILE_HANDLER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // *** PENAMBAHAN HEADER NGrok DI SINI ***
            "ngrok-skip-browser-warning": "true", 
        },
        body: formData,
    });

    const result: FileHandlerResponse = await res.json().catch(() => ({ success: false, message: `Gagal parse JSON dari File Handler. Status: ${res.status}` }));
    
    if (res.ok && result.success && result.data?.fileUrl) { 
        return result.data.fileUrl; 
    } else { 
        let errorMsg = result.message || res.statusText || 'Error tidak diketahui';
        // Memberikan pesan error yang lebih jelas
        throw new Error(`Gagal upload File Handler (${type}). Pesan: ${errorMsg}. Status HTTP: ${res.status}`);
    }
}


// --- 1. HANDLER GET (PROXY) (Tidak Berubah, Sudah Benar) ---
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token otorisasi tidak ditemukan" },
                { status: 401 }
            );
        }

        const res = await fetch(EXTERNAL_API_URL, {
            method: 'GET',
            headers: {
                Accept: "application/json",
                'Authorization': `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            const errorBody = await res.json().catch(() => ({})); 
            return NextResponse.json(
                { success: false, message: errorBody.message || `Gagal mengambil data dari API eksternal. Status: ${res.status}` },
                { status: res.status }
            );
        }

        const json = await res.json();
        return NextResponse.json(json); 

    } catch (error) {
        console.error("Error API GET /pengajuan:", error);
        return NextResponse.json(
            { success: false, message: `Terjadi kesalahan server proxy GET: ${error instanceof Error ? error.message : "Tidak diketahui"}` },
            { status: 500 }
        );
    }
}
// ---------------------------------------------------------------------


// --- 2. HANDLER POST (UTAMA) (Perbaikan Error Handling) ---
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token otorisasi tidak ditemukan" },
                { status: 401 }
            );
        }
        
        const formData = await req.formData();
        const fileUrls: string[] = [];
        const timestamp = Date.now();
        const uploadPromises = [];
        let ttdUrl: string | undefined;

        // --- 1. PROSES UPLOAD TTD (Tambahkan try-catch agar error lebih spesifik) ---
        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File && ttdFile.size > 0) {
            const ttdExt = ttdFile.name.split('.').pop();
            const ttdCustomName = `ttd_pelapor_${timestamp}.${ttdExt}`; 
            try {
                 ttdUrl = await uploadFile(ttdFile, token, ttdCustomName, 'ttd'); 
            } catch (e) {
                 // Langsung return error spesifik dari upload TTD
                 return NextResponse.json({ 
                     success: false, 
                     message: `Gagal upload TTD: ${e instanceof Error ? e.message : "Error tidak diketahui"}` 
                 }, { status: 500 });
            }
        }

        // --- 2. PROSES UPLOAD LAMPIRAN (file0, file1, ...) ---
        let fileIndex = 0;
        while (fileIndex < 4) { 
            const file = formData.get(`file${fileIndex}`); 
            if (file instanceof File && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileCustomName = `work-order_${timestamp}_${fileIndex + 1}.${fileExt}`; 
                uploadPromises.push(uploadFile(file, token, fileCustomName, 'pengajuans'));
            }
            fileIndex++;
        }
        
        let results;
        try {
            // Tunggu semua proses upload lampiran selesai
            results = await Promise.all(uploadPromises);
            results.forEach(url => fileUrls.push(url));
        } catch (e) {
            // Langsung return error spesifik dari upload lampiran
             return NextResponse.json({ 
                 success: false, 
                 message: `Gagal upload Lampiran: ${e instanceof Error ? e.message : "Error tidak diketahui"}` 
             }, { status: 500 });
        }
        
        // --- 3. SIAPKAN DATA UNTUK EXTERNAL API (menggunakan FormData) ---
        const externalFormData = new FormData();
        // ... (sisanya tidak berubah) ...

        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "keterangan", externalName: "catatan" },
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "npp_pelapor" }, 
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "npp_mengetahui" }, 
        ];
        
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value) {
                externalFormData.append(field.externalName, String(value));
            }
        }
        
        if (fileUrls.length > 0) {
            externalFormData.append('file', JSON.stringify(fileUrls)); 
        }
        
        if (ttdUrl) {
            externalFormData.append('ttd_url', ttdUrl); 
        }

        // --- 4. KIRIM DATA KE EXTERNAL API ---
        const res = await fetch(EXTERNAL_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            body: externalFormData,
            cache: "no-store",
        });

        const rawText = await res.text();
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error("[POST PENGAJUAN] Gagal parse JSON dari API eksternal. Respon mungkin HTML/teks. Raw:", rawText.slice(0, 500));
            return NextResponse.json(
                { success: false, message: "API eksternal mengembalikan HTML/format tak dikenal." },
                { status: 500 }
            );
        }
        
        if (!res.ok) {
            return NextResponse.json(
                { success: false, message: json?.message || `Gagal pengajuan (Status ${res.status}): Error API eksternal` },
                { status: res.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: json?.message || "Pengajuan berhasil dikirim!",
            data: json,
        });
    } catch (error) {
        console.error("Error API POST /pengajuan:", error);
        let errorMessage = "Terjadi kesalahan server internal.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json(
            { success: false, message: `Error Internal Server: ${errorMessage}` },
            { status: 500 }
        );
    }
}