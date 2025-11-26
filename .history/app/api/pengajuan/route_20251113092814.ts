import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
// URL File Handler asli
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

// --- Tipe Respon File Handler ---
interface FileHandlerResponse {
    success: boolean;
    message?: string;
    data?: {
        fileUrl: string;
        // Tambahkan properti lain yang mungkin ada di respon gagal (misal: errors)
        errors?: Record<string, string[]>;
    }
}

/**
 * Mengunggah file ke File Handler eksternal.
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
            // *** DIHAPUS: "ngrok-skip-browser-warning": "true", ***
        },
        body: formData,
    });

    const result: FileHandlerResponse = await res.json().catch((e) => {
        // Jika gagal parsing, kembalikan objek error
        console.error(`Gagal parsing respons dari File Handler (${type}):`, e);
        return { success: false, message: `Gagal membaca respons JSON (Status: ${res.status}). Body mungkin bukan JSON.` };
    });
    
    // Penanganan Error Diperkuat
    if (res.ok && result.success && result.data?.fileUrl) { 
        return result.data.fileUrl; 
    } else { 
        // 1. Ambil pesan spesifik dari API (jika ada)
        let errorMsg = result.message || res.statusText || 'Kesalahan API File Handler';
        
        // 2. Tambahkan detail validasi (jika API memberikan field 'errors')
        if (result.data?.errors) {
            const validationErrors = Object.entries(result.data.errors)
                .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
                .join('; ');
            errorMsg = `Validasi Gagal. Pesan: ${errorMsg}. Detail: ${validationErrors}`;
        }
        
        // 3. Tambahkan status respons jika bukan 200
        if (!res.ok) {
             errorMsg = `Status HTTP ${res.status}. Pesan: ${errorMsg}`;
        }
        
        // Kasus Anda: Status 200, Pesan OK, tapi success: false
        if (res.status === 200 && !result.success) {
             errorMsg = `Status 200 OK, tetapi 'success: false' di body. Pesan API: ${result.message || 'Tidak ada pesan spesifik.'}`;
        }

        throw new Error(`Gagal upload File Handler (${type}). ${errorMsg}`);
    }
}

// --- 1. HANDLER GET (PROXY) PERBAIKAN NGrok ---
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
                // Header Ngrok dipertahankan untuk mencoba melompati peringatan
                "ngrok-skip-browser-warning": "true", 
            },
            cache: "no-store",
        });

        // 🚨 PERBAIKAN: Baca sebagai teks dulu untuk deteksi Ngrok/HTML
        const rawText = await res.text();
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
             if (rawText.includes("ERR_NGROK_6024") || rawText.includes("ngrok")) {
                  console.error("[GET PENGAJUAN] Backend Ngrok mengembalikan peringatan ERR_NGROK_6024.");
                  return NextResponse.json(
                      { success: false, message: "Akses API eksternal (Ngrok) diblokir. Harap periksa URL atau pastikan header Ngrok berfungsi." },
                      { status: 503 } 
                  );
             }
             console.error("[GET PENGAJUAN] Gagal parse JSON dari API eksternal. Raw:", rawText.slice(0, 500));
             return NextResponse.json(
                 { success: false, message: "API eksternal mengembalikan format tak dikenal (bukan JSON)." },
                 { status: 500 }
             );
        }

        if (!res.ok || !json?.success) { // Cek res.ok DAN success di body (jika API konsisten)
            return NextResponse.json(
                { success: false, message: json?.message || `Gagal mengambil data dari API eksternal. Status: ${res.status}` },
                { status: res.status }
            );
        }

        return NextResponse.json(json); 

    } catch (error) {
        console.error("Error API GET /pengajuan:", error);
        return NextResponse.json(
            { success: false, message: `Terjadi kesalahan server proxy GET: ${error instanceof Error ? error.message : "Tidak diketahui"}` },
            { status: 500 }
        );
    }
}

// --- 2. HANDLER POST (UTAMA) (Menggunakan fungsi uploadFile yang diperbaiki) ---
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

        // --- 1. PROSES UPLOAD TTD ---
        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File && ttdFile.size > 0) {
            const ttdExt = ttdFile.name.split('.').pop();
            const ttdCustomName = `ttd_pelapor_${timestamp}.${ttdExt}`; 
            try {
                 ttdUrl = await uploadFile(ttdFile, token, ttdCustomName, 'ttd'); 
            } catch (e) {
                 return NextResponse.json({ 
                     success: false, 
                     message: `Gagal upload TTD: ${e instanceof Error ? e.message : "Error tidak diketahui"}` 
                 }, { status: 500 });
            }
        }

        // --- 2. PROSES UPLOAD LAMPIRAN ---
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
            results = await Promise.all(uploadPromises);
            results.forEach(url => fileUrls.push(url));
        } catch (e) {
             return NextResponse.json({ 
                 success: false, 
                 message: `Gagal upload Lampiran: ${e instanceof Error ? e.message : "Error tidak diketahui"}` 
             }, { status: 500 });
        }
        
        // --- 3. SIAPKAN DATA UNTUK EXTERNAL API ---
        const externalFormData = new FormData();

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
            console.error("[POST PENGAJUAN] Gagal parse JSON dari API eksternal. Raw:", rawText.slice(0, 500));
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