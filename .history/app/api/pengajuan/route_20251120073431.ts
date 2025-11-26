import { NextResponse, NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

const GET_API_URL = process.env.GET_API_PENGAJUAN_URL || "http://default-get-pengajuan-api-gagal-dimuat.com";
const EXTERNAL_API_URL = process.env.POST_API_PENGAJUAN_URL || "http://default-post-pengajuan-api-gagal-dimuat.com";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";
const MULTIPLE_FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/multiple/foto"; // URL API Multiple Upload

function generateDynamicPath(type: 'ttd' | 'pengajuans'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `work-order/${year}/${month}/`;
}

// -------------------------------------------------------------------------
// FUNGSI 1: uploadFile (Untuk TTD Tunggal)
// -------------------------------------------------------------------------
async function uploadFile(file: File, token: string, customName: string, type: 'ttd' | 'pengajuans'): Promise<string> {
    const formData = new FormData();
    const uploadPath = generateDynamicPath(type); 
    
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
        throw new Error(`Gagal membaca respons JSON dari File Handler. Status HTTP: ${res.status}. Response: ${rawText.slice(0, 50)}...`);
    }

    if (res.ok && result.data?.filepath) { 
        console.log(`[SUCCESS]: File Handler (${type}) berhasil. FilePath: ${result.data.filepath.slice(0, 50)}...`);
        return result.data.filepath; // <<< MENGEMBALIKAN FILEPATH
    } else { 
        console.error(`🔴 RESPONS API PDAM GAGAL LENGKAP (${type}): HTTP ${res.status}. BODY:`, result);
        
        const apiMessage = result.message || result.status || 'Tidak ada pesan spesifik dari File Handler.';
        
        throw new Error(`Gagal upload File Handler (${type}). Status ${res.status}. Pesan API: ${apiMessage}`);
    }
} 

// -------------------------------------------------------------------------
// FUNGSI 2: uploadMultipleFiles (Untuk Lampiran > 1) - BARU/DI-UPDATE
// -------------------------------------------------------------------------
async function uploadMultipleFiles(files: File[], token: string, customNamePrefix: string): Promise<string[]> {
    if (files.length === 0) return [];
    
    const formData = new FormData();
    const uploadPath = generateDynamicPath('pengajuans'); 
    
    formData.append('path', uploadPath); 
    formData.append('photo_count', files.length.toString());
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `${customNamePrefix}-${i}.${fileExt}`;
        
        formData.append(`photo_${i + 1}`, file, fileName);
        
        formData.append(`filename_${i + 1}`, `${uploadPath}${fileName}`);
    }
    
    const res = await fetch(MULTIPLE_FILE_HANDLER_URL, {
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
        console.error(`❌ Gagal parsing JSON dari Multiple File Handler. Status: ${res.status}. Raw: ${rawText.slice(0, 200)}`);
        throw new Error(`Gagal membaca respons JSON dari Multiple File Handler. Status HTTP: ${res.status}. Response: ${rawText.slice(0, 50)}...`);
    }

    if (res.ok && result.data && Array.isArray(result.data)) { 
        console.log(`[SUCCESS]: Multiple File Handler berhasil. Total files: ${result.data.length}`);
        
        // MENGEMBALIKAN ARRAY DARI FILEPATH
        return result.data.map((item: any) => item.filepath).filter((path: string) => path); 
    } else { 
        console.error(`🔴 RESPONS Multiple File Handler GAGAL LENGKAP: HTTP ${res.status}. BODY:`, result);
        const apiMessage = result.message || result.status || 'Tidak ada pesan spesifik dari Multiple File Handler.';
        throw new Error(`Gagal upload Multiple File Handler. Status ${res.status}. Pesan API: ${apiMessage}`);
    }
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
                { success: false, message: "Token otorisasi tidak ditemukan. Harap login ulang." },
                { status: 401 }
            );
        }

        const res = await fetch(GET_API_URL, { 
            method: 'GET',
            headers: { 
                Accept: "application/json", 
                'Authorization': `Bearer ${token}`, 
                "ngrok-skip-browser-warning": "true",
                "bypass-tunnel-reminder": "true",
            },
            cache: "no-store",
        });

        const rawText = await res.text();
        let json;
        
        try { 
            json = JSON.parse(rawText); 
        } catch (e) {
            console.error(`[GET /api/pengajuan] Gagal parse JSON (Status ${res.status}). Respons mentah:`, rawText.slice(0, 500));
            if (res.status >= 500 || res.status === 401 || rawText.toLowerCase().includes('html')) {
                return NextResponse.json(
                    { success: false, message: `Gagal memuat data. Status ${res.status}. Cek token atau API server (${GET_API_URL}).` },
                    { status: res.status }
                );
            }
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
            return NextResponse.json({ success: false, message: "Token otorisasi tidak ditemukan" }, { status: 401 });
        }
        
        const formData = await req.formData();
        const timestamp = Date.now();
        
        let ttdUrl: string | undefined = undefined; 
        const dummyUuid = '87c54c75-c124-4242-8e7d-bac0f7003e40';
        const dummyNpp = '05010175-1002-202412';
        
        // #################################################
        // 1. AKTIFKAN UPLOAD TTD PELAPOR (Satu File API)
        // #################################################
        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File && ttdFile.size > 0) {
            console.log("[POST /api/pengajuan] Sedang memproses upload TTD pelapor ke PDAM...");
            try {
                const fileExt = ttdFile.name.split('.').pop() || 'png';
                const ttdCustomName = `ttd-pelapor-${dummyUuid}-${timestamp}.${fileExt}`; 
                
                ttdUrl = await uploadFile(ttdFile, token!, ttdCustomName, 'ttd');
                
            } catch (e: any) {
                console.error("❌ Gagal upload TTD pelapor:", e.message);
                return NextResponse.json({ success: false, message: e.message }, { status: 500 });
            }
        } 
        
        // #################################################
        // 2. LOGIKA UPLOAD LAMPIRAN BARU (Multiple File API)
        // #################################################
        const newFiles: File[] = [];
        for (let i = 0; i < 4; i++) 
            const file = formData.get(`new_file_${i}`); 
            if (file instanceof File && file.size > 0) {
                newFiles.push(file); 
            }
        }
        
        let fileUrls: string[] = [];
        
        if (newFiles.length > 0) {
            const customNamePrefix = `work-order-${dummyUuid}-${dummyNpp}-${timestamp}`;
            
            try {
                if (newFiles.length === 1) {
                    console.log("[POST /api/pengajuan] Sedang memproses 1 lampiran baru menggunakan API single upload...");
                    const file = newFiles[0];
                    const fileExt = file.name.split('.').pop() || 'jpg';
                    const fileCustomName = `${customNamePrefix}-0.${fileExt}`; 
                    
                    const uploadedPath = await uploadFile(file, token!, fileCustomName, 'pengajuans');
                    fileUrls = [uploadedPath];
                } 
                else {
                    console.log(`[POST /api/pengajuan] Sedang memproses ${newFiles.length} lampiran baru menggunakan API multiple upload...`);
                    fileUrls = await uploadMultipleFiles(newFiles, token!, customNamePrefix); 
                }
                
            } catch (e) {
                let errorMsg = e instanceof Error ? e.message : "Error tidak diketahui saat upload lampiran ke PDAM.";
                return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
            }
        }
        
        // --- MEMBUAT DATA UNTUK API UTAMA ---
        const externalFormData = new FormData();
        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "hal_nama", externalName: "catatan" }, 
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "npp_pelapor" }, 
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "npp_mengetahui" }, 
            { clientKey: "uuid", externalName: "uuid" },
        ];
        
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value !== null) { 
                const finalValue = field.clientKey === "hal" ? Number(value) : String(value);
                externalFormData.append(field.externalName, finalValue);
            }
        }
        
        // #################################################
        // 3. PENGIRIMAN file_paths (Wajib Ada + Format Array)
        // #################################################
        const existingFilesJson = formData.get('existingFiles') as string | null;
        let existingFileUrls: string[] = [];
        if (existingFilesJson) {
            try {
                existingFileUrls = JSON.parse(existingFilesJson);
                if (!Array.isArray(existingFileUrls)) existingFileUrls = [];
            } catch (e) {
                console.error("Gagal parsing existingFiles:", e);
            }
        }
        
        const allFileUrls = existingFileUrls.concat(fileUrls);
        
        if (allFileUrls.length > 0) {
            externalFormData.append('file_paths', JSON.stringify(allFileUrls)); 
        } else {
            externalFormData.append('file_paths', '[]'); 
        }
        
        // #################################################
        // 4. PENGIRIMAN TTD URL (setelah sukses upload ke PDAM)
        // #################################################
        if (ttdUrl) {
            externalFormData.append('ttd_pelapor', ttdUrl);
        } else {
            externalFormData.append('ttd_pelapor', ''); 
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
        
        // ==========================================================
        // >> KEMBALIKAN LOGIKA PARSING DAN PENGEMBALIAN RESPON JSON <<
        // ==========================================================
        const rawText = await res.text();
        let responseJson: any; 

        try {
            responseJson = JSON.parse(rawText);
        } catch (e) {
            console.error(`❌ Gagal parse JSON dari API Utama (${res.status}). Respons mentah:`, rawText.slice(0, 500));
            return new NextResponse(rawText, {
                status: res.status,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        if (!res.ok) {
            console.error(`❌ API Pengajuan Utama GAGAL (${res.status}). Respons Mentah: ${rawText.slice(0, 500)}`);
        } else {
            console.log(`✅ API Pengajuan Utama SUKSES (${res.status}). Respons Mentah: ${rawText.slice(0, 500)}`);
        }
        
        if (responseJson?.data) {
            if (typeof responseJson.data.ttd_pelapor === 'string') {
                responseJson.data.ttd_pelapor = responseJson.data.ttd_pelapor.replace(/\\\//g, '/');
            }
        }
        
        return NextResponse.json(responseJson, {
            status: res.status,
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