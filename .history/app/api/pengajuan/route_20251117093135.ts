import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';


const GET_API_URL = process.env.GET_API_PENGAJUAN_URL || "http://default-get-pengajuan-api-gagal-dimuat.com";
const EXTERNAL_API_URL = process.env.POST_API_PENGAJUAN_URL || "http://default-post-pengajuan-api-gagal-dimuat.com";

const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

interface FileHandlerResponse {
    success: boolean;
    message?: string;
    data?: {
        fileUrl: string;
        errors?: Record<string, string[]>;
    }
}

/**
 * Mengunggah file ke File Handler eksternal.
 * CATATAN: URL FILE_HANDLER_URL (PDAM Gateway) tetap konstan di sini.
 */

// File: /api/pengajuan.ts

// ... (definition FileHandlerResponse dan import lainnya)

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
        },
        body: formData,
        cache: "no-store",
    });

    const rawText = await res.text();
    let result: any; // Menggunakan any untuk fleksibilitas parsing respons eksternal

    try {
        result = JSON.parse(rawText);
    } catch (e) {
        // Jika gagal parsing, lempar error yang menunjukkan masalah di respons API File Handler
        console.error(`Gagal parsing respons dari File Handler (${type}). Status: ${res.status}. Raw: ${rawText.slice(0, 200)}`, e);
        throw new Error(`Gagal membaca respons JSON dari File Handler. Status HTTP: ${res.status}. Response mentah: ${rawText.slice(0, 50)}...`);
    }
    if (res.ok && result.data?.fileUrl) { 
        return result.data.fileUrl; 
    } else { 
        // Jika ada kegagalan, ambil pesan error sejelas mungkin dari respons body
        let errorMsg = result.message || res.statusText || 'Kesalahan API File Handler (Tidak ada pesan spesifik dari backend).';
        
        // Cek jika status 200 tapi tidak ada fileUrl (Failure body)
        if (res.status === 200) {
            errorMsg = `Status 200 OK, tetapi upload gagal di backend. Pesan API: ${result.message || 'Error tidak spesifik.'}`;
        } else if (!res.ok) {
            errorMsg = `Status HTTP ${res.status}. Pesan: ${errorMsg}`;
        }
        
        // Lempar error untuk ditangkap di POST handler utama
        throw new Error(`Gagal upload File Handler (${type}). ${errorMsg}`);
    }
    // --- END PERBAIKAN LOGIKA UTAMA ---
}

export async function GET(req: Request) {
    // Cek apakah URL API GET tersedia
    if (GET_API_URL.startsWith("http://default-")) {
        console.error("[GET /api/pengajuan] GAGAL: GET_API_PENGAJUAN_URL tidak diset di .env");
        return NextResponse.json(
            { success: false, message: "URL API GET Pengajuan (GET_API_PENGAJUAN_URL) tidak diset di lingkungan." },
            { status: 500 }
        );
    }

    try {
        const authHeader = req.headers.get("authorization");
        
        console.log(`[GET /api/pengajuan] Header Authorization diterima: ${authHeader ? authHeader.slice(0, 20) + '...' : 'TIDAK ADA'}`);

        const token = authHeader?.split(" ")[1];

        if (!token) {
            console.error("[GET /api/pengajuan] GAGAL: Token otorisasi tidak ditemukan setelah parsing header.");
            return NextResponse.json(
                { success: false, message: "Token otorisasi tidak ditemukan. Harap pastikan header Authorization disertakan di frontend." },
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

export async function POST(req: Request) {
    // Cek apakah URL API POST tersedia
    if (EXTERNAL_API_URL.startsWith("http://default-")) {
        console.error("[POST /api/pengajuan] GAGAL: POST_API_PENGAJUAN_URL tidak diset di .env");
        return NextResponse.json(
            { success: false, message: "URL API POST Pengajuan (POST_API_PENGAJUAN_URL) tidak diset di lingkungan." },
            { status: 500 }
        );
    }

    try {
        const authHeader = req.headers.get("authorization");
        
        console.log(`[POST /api/pengajuan] Header Authorization diterima: ${authHeader ? authHeader.slice(0, 20) + '...' : 'TIDAK ADA'}`);
        
        const token = authHeader?.split(" ")[1];

        if (!token) {
            console.error("[POST /api/pengajuan] GAGAL: Token otorisasi tidak ditemukan setelah parsing header.");
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
        
        const externalFormData = new FormData();

        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "catatan", externalName: "catatan" }, 
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "npp_pelapor" }, 
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "npp_mengetahui" }, 
        ];
        
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value) {
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
            if (rawText.includes("ERR_NGROK_6024") || rawText.includes("ngrok") || rawText.toLowerCase().includes("html")) {
                 console.error("[POST /api/pengajuan] Backend Ngrok mengembalikan peringatan ERR_NGROK_6024 (HTML response).");
                 return NextResponse.json(
                     { success: false, message: "Akses API eksternal (Ngrok) diblokir saat POST. Harap periksa URL Ngrok Anda. (ERR_NGROK_6024)" },
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