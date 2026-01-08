import { NextResponse, NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

const GET_API_URL = process.env.GET_API_PENGAJUAN_URL || "http://default-get-pengajuan-api-gagal-dimuat.com";
const EXTERNAL_API_URL = process.env.POST_API_PENGAJUAN_URL || "http://default-post-pengajuan-api-gagal-dimuat.com";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";
const MULTIPLE_FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/multiple/foto"; 

function generateDynamicPath(type: 'ttd' | 'pengajuans'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `work-order/${year}/${month}/`; 
}

// -------------------------------------------------------------------------
// FUNGSI 1: uploadFile (Untuk TTD Tunggal dan Single Lampiran)
// -------------------------------------------------------------------------
async function uploadFile(file: File, token: string, customName: string, type: 'ttd' | 'pengajuans'): Promise<string> {
    const formData = new FormData();
    const uploadPath = generateDynamicPath(type); 
    
    const fileNameOnly = customName.split('/').pop() || customName; 
    
    formData.append('photo', file, fileNameOnly); 
    formData.append('path', uploadPath); 
    formData.append('filename', fileNameOnly); 
    
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
        const filepath = result.data.filepath;
        console.log(`✅ File Handler (${type}) berhasil. FilePath: ${filepath}`);
        
        const cleanPath = filepath.replace(/\/\//g, '/');
        
        return cleanPath; 
    } else { 
        console.error(`🔴 RESPONS API PDAM GAGAL LENGKAP (${type}): HTTP ${res.status}. BODY:`, result);
        
        const apiMessage = result.message || result.status || 'Tidak ada pesan spesifik dari File Handler.';
        
        throw new Error(`Gagal upload File Handler (${type}). Status ${res.status}. Pesan API: ${apiMessage}`);
    }
} 

// -------------------------------------------------------------------------
// FUNGSI 2: uploadMultipleFiles (Untuk Lampiran > 1)
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
        const fileNameOnly = `${customNamePrefix}-${i}.${fileExt}`; 
        
        formData.append(`photo_${i + 1}`, file, fileNameOnly); 
        formData.append(`filename_${i + 1}`, fileNameOnly); 
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
    
    if (res.ok && result.data && typeof result.data === 'object' && !Array.isArray(result.data)) { 
        console.log(`✅ Multiple File Handler berhasil. Total files: ${Object.keys(result.data).length}`);
        
        const uploadedPaths = Object.values(result.data)
            .map((item: any) => item.filepath)
            .filter((path: string) => path)
            .map((path: string) => path.replace(/\/\//g, '/')); 
            
        return uploadedPaths; 
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
        
        let ttdFilepath: string | undefined = undefined; 
        const dummyUuid = '87c54c75-c124-4242-8e7d-bac0f7003e40';
        const dummyNpp = '05010175-1002-202412';
        
        // ========================================================
        // 1. UPLOAD TTD PELAPOR (Satu File API)
        // ========================================================
        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File && ttdFile.size > 0) {
            console.log("[POST /api/pengajuan] 📤 Sedang upload TTD pelapor ke PDAM...");
            try {
                const ttdCustomName = `ttd-pelapor-${dummyUuid}-${timestamp}.png`; 
                
                ttdFilepath = await uploadFile(ttdFile, token!, ttdCustomName, 'ttd');
                
                console.log("=".repeat(70));
                console.log("✅ TTD berhasil di-upload ke File Handler PDAM");
                console.log("📦 FilePath (Path Relatif):", ttdFilepath);
                console.log("=".repeat(70));
                
            } catch (e: any) {
                console.error("❌ Gagal upload TTD pelapor:", e.message);
                return NextResponse.json({ success: false, message: e.message }, { status: 500 });
            }
        } 
        
        // ========================================================
        // 2. UPLOAD LAMPIRAN BARU (Multiple File API)
        // ========================================================
        const newFiles: File[] = [];
        for (let i = 0; i < 4; i++) {
            const file = formData.get(`new_file_${i}`); 
            if (file instanceof File && file.size > 0) {
                newFiles.push(file); 
            }
        }
        
        let fileFilepaths: string[] = [];
        
        if (newFiles.length > 0) {
            const customNamePrefix = `work-order-${dummyUuid}-${dummyNpp}-${timestamp}`;
            
            try {
                if (newFiles.length === 1) {
                    console.log("[POST /api/pengajuan] 📤 Upload 1 lampiran (single API)...");
                    const file = newFiles[0];
                    const fileExt = file.name.split('.').exp;
                    const fileCustomName = `${customNamePrefix}-0.${fileExt}`; 
                    
                    const uploadedFilepath = await uploadFile(file, token!, fileCustomName, 'pengajuans');
                    fileFilepaths = [uploadedFilepath];
                } 
                else {
                    console.log(`[POST /api/pengajuan] 📤 Upload ${newFiles.length} lampiran (multiple API)...`);
                    fileFilepaths = await uploadMultipleFiles(newFiles, token!, customNamePrefix); 
                }
                
                console.log("✅ Lampiran berhasil di-upload. Total:", fileFilepaths.length);
                
            } catch (e) {
                let errorMsg = e instanceof Error ? e.message : "Error tidak diketahui saat upload lampiran ke PDAM.";
                return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
            }
        }
        
        // ========================================================
        // 3. SIAPKAN DATA UNTUK API EKSTERNAL
        // ========================================================
        const externalFormData = new FormData();

        // ========================================================
        // 4. DEBUG LOG - LIHAT DATA YANG DITERIMA
        // ========================================================
        console.log("=".repeat(70));
        console.log("📥 DEBUG: Data yang diterima dari frontend:");
        for (let [key, value] of formData.entries()) {
            // Jangan log file binary
            if (value instanceof File) {
                console.log(`${key}: File: ${value.name} (${value.size} bytes)`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        console.log("=".repeat(70));

        // ========================================================
        // 5. MAPPING FIELD DENGAN DEBUG LOG LENGKAP
        // ========================================================
        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kd_satker" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "hal_nama", externalName: "catatan" }, 
            { 
                clientKey: "pelapor", 
                externalName: "pelapor" 
            }, 
            { 
                clientKey: "nppPelapor", 
                externalName: "npp_pelapor" 
            },  
            { 
                clientKey: "uuid", 
                externalName: "uuid" 
            },
            { 
                clientKey: "mengetahui", 
                externalName: "mengetahui" 
            }, 
            { 
                clientKey: "mengetahui_name", 
                externalName: "mengetahui_name" 
            }, 
            { 
                clientKey: "nppMengetahui", 
                externalName: "mengetahui_npp" 
            },
            { 
                clientKey: "referensiSurat", 
                externalName: "no_referensi" 
            },
            { 
                clientKey: "mengetahuiTlp", 
                externalName: "mengetahui_tlp" 
            }, 
        ];

        console.log("=".repeat(70));
        console.log("🔍 DEBUG: Proses mapping field:");
        
        // Kirim data ke FormData eksternal dengan validasi dan debug log
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            
            // Debug log sebelum mapping
            console.log(`   ${field.clientKey} (${field.externalName}): ${value}`);
            
            if (value !== null && value !== undefined) { 
                const finalValue = field.clientKey === "hal" ? Number(value) : String(value);
                
                // Debug log setelah mapping
                externalFormData.append(field.externalName, finalValue);
                console.log(`✅ ${field.clientKey} -> ${field.externalName}: ${finalValue}`);
            } else {
                console.log(`❌ ${field.clientKey} (${field.externalName}): NULL/TIDAK ADA`);
            }
        }
        
        console.log("=".repeat(70));
        console.log("📤 DEBUG: Final payload yang akan dikirim ke API eksternal:");
        for (let [key, value] of externalFormData.entries()) {
            // Jangan log file binary
            if (value instanceof File) {
                console.log(`${key}: File: ${value.name} (${value.size} bytes)`);
            } else {
                console.log(`${key}: ${value}`);
            }
        }
        console.log("=".repeat(70));

        // ========================================================
        // 6. PROSES FILE PATHS
        // ========================================================
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
        
        const allFilePaths = existingFileUrls.concat(fileFilepaths);
        
        if (allFilePaths.length > 0) {
            externalFormData.append('file_paths', JSON.stringify(allFilePaths)); 
        } else {
            externalFormData.append('file_paths', '[]'); 
        }
        
        // ========================================================
        // 7. TAMBAHKAN TTD
        // ========================================================
        if (ttdFilepath) {
            console.log("=".repeat(70));
            console.log("📤 MENGIRIM TTD KE API PENGAJUAN UTAMA");
            console.log("📦 FilePath yang dikirim:", ttdFilepath);
            console.log("=".repeat(70));
    
            externalFormData.append('ttd_pelapor', ttdFilepath);
        } else {
            console.log("⚠️ Tidak ada TTD baru yang di-upload");
            externalFormData.append('ttd_pelapor', ''); 
        }

        // ========================================================
        // 8. KIRIM KE API EKSTERNAL
        // ========================================================
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
        let responseJson: any; 

        try {
            responseJson = JSON.parse(rawText);
        } catch (e) {
            console.error(`❌ Gagal parse JSON dari API Utama (${res.status}). Respons mentah:`, rawText.slice(0, 500));
            
            if (!res.ok) {
                 return NextResponse.json(
                    { success: false, message: `API Pengajuan Utama GAGAL. Status: ${res.status}. Respons mentah tidak dapat diparse.` }, 
                    { status: res.status }
                );
            }
            return new NextResponse(rawText, {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
        
        // ========================================================
        // 9. DEBUG LOG RESPONS
        // ========================================================
        console.log("=".repeat(70));
        console.log(`📦 RESPONSE API EKSTERNAL (Status: ${res.status})`);
        console.log("=".repeat(70));
        
        if (!res.ok) {
            console.error(`❌ API Pengajuan Utama GAGAL (${res.status})`);
            console.error("RESPONSE ASLI:", responseJson);
        } else {
            console.log("✅ API PENGAJUAN UTAMA SUKSES");
            console.log("📦 Response data:", responseJson?.data);
            console.log("📦 npp_kepala_satker di response:", responseJson?.data?.npp_kepala_satker);
        }
        console.log("=".repeat(70));
        
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