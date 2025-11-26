import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Pastikan variabel lingkungan ini diset di .env Anda
const GET_API_URL = process.env.GET_API_PENGAJUAN_URL || "http://default-get-pengajuan-api-gagal-dimuat.com";
const EXTERNAL_API_URL = process.env.POST_API_PENGAJUAN_URL || "http://default-post-pengajuan-api-gagal-dimuat.com";

// URL File Handler PDAM
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

/**
 * Mengunggah file ke File Handler eksternal (Hanya untuk Lampiran saat ini).
 * Logika diubah agar hanya memeriksa res.ok dan data.fileUrl (sesuai respons Postman PDAM).
 */
// File: /api/pengajuan.ts

// ... (Kode di atas tidak berubah)

async function uploadFile(file: File, token: string, customName: string, type: 'ttd' | 'pengajuans'): Promise<string> {
    const formData = new FormData();
    
    // Gunakan path sesuai yang Anda uji di Postman
    const uploadPath = type === 'ttd' ? 'work-order/ttd/' : 'work-order/attachment/'; 
    
    formData.append('photo', file, customName); 
    formData.append('path', uploadPath); 
    formData.append('filename', customName);
    
    const res = await fetch(FILE_HANDLER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`, 
        },
        body: formData,
        cache: "no-store",
    });

    const rawText = await res.text();
    let result: any;

    try {
        result = JSON.parse(rawText);
    } catch (e) {
        console.error(`❌ Gagal parsing JSON dari File Handler (${type}). Status: ${res.status}. Raw: ${rawText.slice(0, 200)}`);
        // Mengembalikan pesan yang mencantumkan respons mentah jika gagal parsing
        throw new Error(`Gagal membaca respons JSON dari File Handler. Status HTTP: ${res.status}. Response: ${rawText.slice(0, 50)}...`);
    }

    // --- LOGIKA PERBAIKAN UNTUK MENGAMBIL PESAN ASLI PDAM ---
    if (res.ok && result.data?.fileUrl) { 
        // Sukses: Kembalikan URL
        return result.data.fileUrl; 
    } else { 
        // Gagal: Langsung gunakan pesan dari API PDAM (result.message)
        
        // 1. Ambil pesan API yang paling orisinal (OK, Validation Error, dll.)
        const apiMessage = result.message || result.status || 'Tidak ada pesan spesifik dari File Handler.';
        
        // 2. Tampilkan respons lengkap di log server Next.js Anda (untuk debug)
        // console.error(`❌ Gagal Upload File Handler (${type}): HTTP ${res.status}. Body:`, result);
        
        // 3. Lempar error hanya dengan pesan dari API PDAM (ditambah status HTTP)
        throw new Error(`Gagal upload File Handler (${type}). Status ${res.status}. Pesan API: ${apiMessage}`);
    }
    // --- END LOGIKA PERBAIKAN ---
}


export async function GET(req: Request) {
    if (GET_API_URL.startsWith("http://default-")) {
        console.error("[GET /api/pengajuan] GAGAL: GET_API_PENGAJUAN_URL tidak diset di .env");
        return NextResponse.json(
            { success: false, message: "URL API GET Pengajuan (GET_API_PENGAJUAN_URL) tidak diset di lingkungan." },
            { status: 500 }
        );
    }

    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            console.error("[GET /api/pengajuan] GAGAL: Token otorisasi tidak ditemukan.");
            return NextResponse.json(
                { success: false, message: "Token otorisasi tidak ditemukan." },
                { status: 401 }
            );
        }

        const res = await fetch(GET_API_URL, { 
            method: 'GET',
            headers: {
                Accept: "application/json",
                'Authorization': `Bearer ${token}`, 
            },
            cache: "no-store",
        });

        const rawText = await res.text();
        let json;
        
        try {
            json = JSON.parse(rawText);
        } catch (e) {
             console.error("[GET /api/pengajuan] Gagal parse JSON dari API eksternal. Raw:", rawText.slice(0, 500));
             return NextResponse.json(
                 { success: false, message: "API eksternal mengembalikan format tak dikenal (bukan JSON)." },
                 { status: 500 }
             );
        }

        if (!res.ok || !json?.success) { 
            return NextResponse.json(
                { success: false, message: json?.message || `Gagal mengambil data dari API eksternal. Status: ${res.status}` },
                { status: res.status }
            );
        }

        return NextResponse.json(json); 

    } catch (error) {
        console.error("Error API GET /api/pengajuan:", error);
        return NextResponse.json(
            { success: false, message: `Terjadi kesalahan server proxy GET: ${error instanceof Error ? error.message : "Tidak diketahui"}` },
            { status: 500 }
        );
    }
}

// ----------------------------------------------------------------------------------

export async function POST(req: Request) {
    if (EXTERNAL_API_URL.startsWith("http://default-")) {
        console.error("[POST /api/pengajuan] GAGAL: POST_API_PENGAJUAN_URL tidak diset di .env");
        return NextResponse.json(
            { success: false, message: "URL API POST Pengajuan (POST_API_PENGAJUAN_URL) tidak diset di lingkungan." },
            { status: 500 }
        );
    }

    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            console.error("[POST /api/pengajuan] GAGAL: Token otorisasi tidak ditemukan.");
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

        const ttdFile = formData.get('ttdPelapor');
        
        // ==========================================================
        // >> START MODIFIKASI: MELEWATI UPLOAD TTD SESUAI PERMINTAAN <<
        // ==========================================================
        if (ttdFile instanceof File && ttdFile.size > 0) {
            console.warn("[POST /api/pengajuan] ⚠️ PERINGATAN: Upload TTD dilewati sesuai permintaan pengguna untuk tujuan pengujian.");
        } else {
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
        
        // Menyiapkan data untuk API Pengajuan Utama
        const externalFormData = new FormData();

        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            // Catatan: Jika hal_id adalah ID (numerik), hal_nama akan masuk ke catatan
            { clientKey: "hal_nama", externalName: "catatan" }, 
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "npp_pelapor" }, 
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "npp_mengetahui" }, 
        ];
        
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value) {
                // Konversi hal_id kembali ke angka jika diperlukan oleh API eksternal
                const finalValue = field.clientKey === "hal" ? Number(value) : String(value);
                externalFormData.append(field.externalName, finalValue);
            }
        }
        
        if (fileUrls.length > 0) {
            externalFormData.append('file', JSON.stringify(fileUrls)); 
        }
        
        if (ttdUrl) {
            externalFormData.append('ttd_url', ttdUrl); 
        }

        // Panggil API Pengajuan Utama
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
            if (rawText.toLowerCase().includes("ngrok") || rawText.toLowerCase().includes("html")) {
                 console.error("[POST /api/pengajuan] Backend Ngrok mengembalikan peringatan (HTML response).");
                 return NextResponse.json(
                     { success: false, message: "Akses API eksternal (Ngrok) diblokir atau URL Ngrok salah. (ERR_NGROK)" },
                     { status: 503 } 
                 );
            }
            console.error("[POST /api/pengajuan] Gagal parse JSON dari API eksternal. Raw:", rawText.slice(0, 500));
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
        console.error("Error API POST /api/pengajuan:", error);
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