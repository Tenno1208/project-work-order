import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
// Ganti dengan URL internal File Handler yang benar
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
 * @param file Objek File yang akan diupload.
 * @param token Token otorisasi.
 * @param customName Nama file unik yang dibuat.
 * @param type Tipe upload ('ttd' atau 'pengajuans') untuk menentukan path.
 * @returns URL file yang berhasil diupload.
 */
async function uploadFile(file: File, token: string, customName: string, type: 'ttd' | 'pengajuans'): Promise<string> {
    const formData = new FormData();
    
    // Path bergantung pada tipe upload
    const uploadPath = type === 'ttd' ? 'work-order/ttd/' : 'work-order/attachment/';
    
    // *** Perbaikan Utama: Nama field file harus 'photo' ***
    formData.append('photo', file, customName); 

    // Field path dan filename yang diminta oleh File Handler
    formData.append('path', uploadPath); 
    formData.append('filename', customName);
    
    const res = await fetch(FILE_HANDLER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Hapus Content-Type: multipart/form-data, karena FormData menanganinya
        },
        body: formData,
    });

    const result: FileHandlerResponse = await res.json();
    
    // Penanganan Error: Cek status HTTP dan properti 'success' di body JSON
    if (res.ok && result.success && result.data?.fileUrl) { 
        return result.data.fileUrl; 
    } else { 
        let errorMsg = result.message || res.statusText || 'Error tidak diketahui';
        throw new Error(`Gagal upload ${customName} (${type}). Pesan: ${errorMsg}`);
    }
}


// --- 1. HANDLER GET (PROXY) ---
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

        // Panggil backend API (proxy)
        const res = await fetch(EXTERNAL_API_URL, {
            method: 'GET',
            headers: {
                Accept: "application/json",
                // Teruskan token
                'Authorization': `Bearer ${token}`,
                // WAJIB: Header untuk melewati peringatan ngrok
                "ngrok-skip-browser-warning": "true",
            },
            cache: "no-store",
        });

        if (!res.ok) {
            console.error(`[GET PENGAJUAN] Backend merespons status ${res.status}.`);
            // Coba ambil body JSON untuk pesan error yang lebih spesifik
            const errorBody = await res.json().catch(() => ({})); 
            return NextResponse.json(
                { success: false, message: errorBody.message || "Gagal mengambil data dari API eksternal" },
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


// --- 2. HANDLER POST (UTAMA) ---
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
            // Panggil uploadFile dengan tipe 'ttd'
            ttdUrl = await uploadFile(ttdFile, token, ttdCustomName, 'ttd'); 
        }

        // --- 2. PROSES UPLOAD LAMPIRAN (file0, file1, ...) ---
        let fileIndex = 0;
        while (true) {
            const file = formData.get(`file${fileIndex}`); 
            if (file instanceof File && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileCustomName = `work-order_${timestamp}_${fileIndex + 1}.${fileExt}`; 
                // Panggil uploadFile dengan tipe 'pengajuans'
                uploadPromises.push(uploadFile(file, token, fileCustomName, 'pengajuans'));
                fileIndex++;
            } else if (fileIndex < 4) { // Cek 4 slot yang mungkin
                fileIndex++;
            } else {
                break; 
            }
        }
        
        // Tunggu semua proses upload lampiran selesai
        const results = await Promise.all(uploadPromises);
        results.forEach(url => fileUrls.push(url));
        
        // --- 3. SIAPKAN DATA UNTUK EXTERNAL API (menggunakan FormData) ---
        const externalFormData = new FormData();

        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "keterangan", externalName: "catatan" }, // Keterangan dikirim juga sebagai catatan
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "npp_pelapor" }, // Perbaiki nama field jika perlu
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "npp_mengetahui" }, // Perbaiki nama field jika perlu
        ];
        
        // Salin data form standar
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value) {
                externalFormData.append(field.externalName, String(value));
            }
        }
        
        // Tambahkan URL File yang sudah diupload
        if (fileUrls.length > 0) {
            // Mengirim array URL sebagai string JSON. (Ini adalah praktik umum di beberapa Laravel API)
            externalFormData.append('file', JSON.stringify(fileUrls)); 
        }
        
        if (ttdUrl) {
            externalFormData.append('ttd_url', ttdUrl); 
        }

        // --- 4. KIRIM DATA KE EXTERNAL API ---
        const res = await fetch(EXTERNAL_API_URL, {
            method: "POST",
            headers: {
                // Jangan set 'Content-Type' menjadi 'application/json' karena kita menggunakan FormData
                "Authorization": `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            body: externalFormData, // Kirim sebagai FormData
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