// File: app/api/file-handler/upload/foto/route.ts
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// URL API Single Upload PDAM
const PDAM_FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

function generateDynamicPath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    // Path server (Pastikan ada slash di akhir)
    return `work-order/${year}/${month}/`; 
}

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json({ success: false, message: "Token otorisasi tidak ditemukan" }, { status: 401 });
        }
        
        const formData = await req.formData();
        
        // --- 1. SIAPKAN FORMDATA BARU UNTUK DIKIRIM KE PDAM ---
        const forwardFormData = new FormData();
        
        // --- 2. TANGANI PATH (WAJIB ADA) ---
        // Ambil path dari client, kalau kosong generate otomatis
        const clientPath = formData.get('path') as string;
        const uploadPath = clientPath || generateDynamicPath();
        
        // Masukkan 'path' ke FormData yang akan dikirim (INI YANG BIKIN ERROR SEBELUMNYA JIKA HILANG)
        forwardFormData.append('path', uploadPath);
        
        // --- 3. AMBIL FILE & FILENAME DARI REQUEST ---
        const photo = formData.get('photo');
        let rawFilename = formData.get('filename') as string; // misal: "ttd-mengetahui-123" atau "foto-laptop"

        if (!photo || !(photo instanceof File)) {
             return NextResponse.json({ success: false, message: "File photo tidak ditemukan" }, { status: 400 });
        }

        // --- 4. LOGIKA PENAMAAN FILE (Sanitasi & Formatting) ---
        // Bersihkan nama file dari karakter aneh
        let cleanName = rawFilename ? rawFilename.replace(/[^a-zA-Z0-9-_]/g, '-') : 'image';
        
        // Cek awalan untuk membedakan TTD vs Foto Biasa
        if (cleanName.toLowerCase().startsWith('ttd-')) {
            // Jika ini TTD, pastikan formatnya rapi (misal: ttd-mengetahui-uuid)
            // Biarkan as-is atau sanitasi minor
            // Contoh hasil: ttd-mengetahui-87c54c75
        } else {
            // Jika BUKAN TTD, asumsikan ini foto lampiran work order
            // Tambahkan prefix jika belum ada
            if (!cleanName.toLowerCase().startsWith('work-order-')) {
                 cleanName = `work-order-${cleanName}`;
            }
        }

        // Hapus ekstensi ganda jika ada di string nama (misal nama file "foto.jpg" jadi "foto")
        cleanName = cleanName.replace(/(\.[\w\d]+)+$/, '');

        // Ambil ekstensi asli dari file blob
        const originalExt = photo.name.split('.').pop() || 'jpg';
        const finalFilename = `${cleanName}.${originalExt}`;

        console.log(`[POST Single] Path: ${uploadPath}, Final Name: ${finalFilename}`);

        // --- 5. MASUKKAN FILE KE FORMDATA ---
        // Kita perlu convert ke Blob/Buffer agar bisa dikirim ulang via fetch
        const buffer = await photo.arrayBuffer();
        const fileBlob = new Blob([buffer], { type: photo.type });

        forwardFormData.append('photo', fileBlob, finalFilename);
        forwardFormData.append('filename', finalFilename);

        // --- 6. KIRIM KE API PDAM ---
        const response = await fetch(PDAM_FILE_HANDLER_URL, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${token}` 
                // Jangan set Content-Type header manual saat pakai FormData, biar fetch yang atur boundary-nya
            },
            body: forwardFormData,
            cache: "no-store", 
        });
        
        const responseText = await response.text();
        let responseJson: any;
        
        try {
            responseJson = JSON.parse(responseText);
        } catch (e) {
            console.error("Invalid JSON from PDAM:", responseText);
            return NextResponse.json({ success: false, message: "Invalid JSON response from PDAM Server", raw: responseText }, { status: 502 });
        }

        if (!response.ok || (responseJson.data && responseJson.data.error)) {
             console.error("PDAM API Error:", responseJson);
             return NextResponse.json({ success: false, message: "Gagal upload ke File Handler", data: responseJson }, { status: response.status });
        }

        // --- 7. FORMAT RESPONSE UNTUK FRONTEND ---
        // Pastikan kita mengembalikan format yang konsisten
        // Biasanya API PDAM mengembalikan { status, message, data: { filepath: "...", ... } }
        
        let finalFilePath = null;
        if (responseJson.data && responseJson.data.filepath) {
            finalFilePath = responseJson.data.filepath;
            // Bersihkan double slash jika ada
            finalFilePath = finalFilePath.replace(/\/\//g, '/');
        }

        return NextResponse.json({
            success: true,
            message: "Upload berhasil",
            data: {
                filepath: finalFilePath,
                ...responseJson.data // sertakan data lain jika ada
            }
        });
        
    } catch (error) {
        console.error("[POST Single] Error:", error);
        return NextResponse.json({ success: false, message: `Server Error: ${(error as Error).message}` }, { status: 500 });
    }
}