import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const GET_API_URL = process.env.GET_API_PENGAJUAN_URL || "http://default-get-pengajuan-api-gagal-dimuat.com";
const EXTERNAL_API_URL = process.env.POST_API_PENGAJUAN_URL || "http://default-post-pengajuan-api-gagal-dimuat.com";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

function generateDynamicPath(type: 'ttd' | 'pengajuans'): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `work-order/${year}/${month}/`;
}

// File: route.ts (Hanya fungsi uploadFile yang dimodifikasi)

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

    // --- LOGIKA PERUBAHAN UNTUK DEBUGGING ---
    if (res.ok && result.data?.fileurl) { 
        console.log(`[SUCCESS]: File Handler (${type}) berhasil. URL: ${result.data.fileurl.slice(0, 50)}...`);
        return result.data.fileurl; 
    } else { 
        // 🚨 Mencetak body lengkap dari API PDAM ke konsol server Next.js Anda
        console.error(`🔴 RESPONS API PDAM GAGAL LENGKAP (${type}): HTTP ${res.status}. BODY:`, result);
        
        const apiMessage = result.message || result.status || 'Tidak ada pesan spesifik dari File Handler.';
        
        // Melemparkan error kembali ke frontend
        throw new Error(`Gagal upload File Handler (${type}). Status ${res.status}. Pesan API: ${apiMessage}`);
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

// File: route.ts (di dalam function POST)

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
        const uploadPromises = [];
        let ttdUrl: string | undefined; // Variabel ini tetap didefinisikan tapi tidak diisi

        const dummyUuid = '87c54c75-c124-4242-8e7d-bac0f7003e40';
        const dummyNpp = '05010175-1002-202412';
        
        // --- LOGIKA LAMA (DIHAPUS/DIUBAH) ---
        // const ttdFile = formData.get('ttdPelapor');
        // if (ttdFile instanceof File && ttdFile.size > 0) {
        //     console.warn("[POST /api/pengajuan] ⚠️ PERINGATAN: Upload TTD dilewati sesuai permintaan pengguna untuk tujuan pengujian.");
        // } 
        // --- END LOGIKA LAMA ---

        // #################################################
        // >> PERUBAHAN TTD: Mengambil File Mentah <<
        // #################################################
        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File && ttdFile.size > 0) {
             console.warn("[POST /api/pengajuan] ⚠️ TTD Pelapor akan dikirim sebagai file mentah ke API Utama.");
        }
        
        // #################################################
        // 1. LOGIKA UPLOAD LAMPIRAN BARU (menggunakan key new_file_0, new_file_1, dst.)
        // #################################################
        for (let i = 0; i < 4; i++) { // Cek sampai 4 file baru
            const file = formData.get(`new_file_${i}`); 
            if (file instanceof File && file.size > 0) {
                const fileExt = file.name.split('.').pop();
                const fileCustomName = `work-order-${dummyUuid}-${dummyNpp}-${timestamp}-${i}.${fileExt}`; 
                // Catatan: uploadFile() ini yang memanggil API PDAM
                uploadPromises.push(uploadFile(file, token, fileCustomName, 'pengajuans'));
            }
        }
        
        // PROSES UPLOAD PDAM & TANGKAP URL
        let fileUrls: string[] = [];
        try {
            const results = await Promise.all(uploadPromises); 
            fileUrls = results.filter(url => url); // Filter URL yang valid saja
        } catch (e) {
            let errorMsg = e instanceof Error ? e.message : "Error tidak diketahui saat upload lampiran ke PDAM.";
            return NextResponse.json({ success: false, message: errorMsg }, { status: 500 });
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
            // Tambahkan UUID jika mode edit (field ini ada di client, kita masukkan ke standardFields)
            { clientKey: "uuid", externalName: "uuid" }, 
        ];
        
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value !== null && value !== undefined) { 
                const finalValue = field.clientKey === "hal" ? Number(value) : String(value);
                externalFormData.append(field.externalName, finalValue);
            }
        }
        
        // #################################################
        // 3. LOGIKA TTD PELAPOR (Mengirim File Mentah)
        // #################################################
        
        if (ttdFile instanceof File && ttdFile.size > 0) {
            // Mengirim file mentah ke API Utama dengan nama field 'ttd_pelapor'
            externalFormData.append('ttd_pelapor', ttdFile);
            
        } else {
             // Jika tidak ada file TTD (baru), kirim nilai kosong untuk memenuhi 'required' field
             // Jika API eksternal menolak string kosong, Anda mungkin harus mengirim null atau placeholder.
             // Kita coba string kosong dulu.
             externalFormData.append('ttd_pelapor', '');
        }

        
        // #################################################
        // 4. PENGIRIMAN file_paths (Wajib Ada + Format Array)
        // #################################################
        
        // Dapatkan existing file paths dari form data (hanya ada saat EDIT)
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
        
        // Gabungkan URL lama (tersisa) dan URL baru (dari PDAM)
        const allFileUrls = existingFileUrls.concat(fileUrls);

        // KIRIM file_paths: Wajib ada (required)
        if (allFileUrls.length > 0) {
            // KIRIM SEBAGAI MULTIPLE KEY-VALUE PAIRS
            allFileUrls.forEach(url => {
                externalFormData.append('file_paths', url);
            });
        } else {
            // KIRIM ARRAY KOSONG DALAM FORMAT STRING "[]" jika tidak ada file sama sekali
            externalFormData.append('file_paths', '[]'); 
        }
        
        // --- Hapus Baris Ini (sudah tidak digunakan) ---
        if (ttdUrl) {
            externalFormData.append('ttd_url', ttdUrl); 
        }

        // Panggil API Pengajuan Utama
        const res = await fetch(EXTERNAL_API_URL, {
            method: "POST", // Note: Jika ini adalah endpoint UPDATE/PUT, method harus disesuaikan di server external
            headers: {
                "Authorization": `Bearer ${token}`, 
                "ngrok-skip-browser-warning": "true",
            },
            body: externalFormData,
            cache: "no-store",
        });

        // ==========================================================
        // >> MENGEMBALIKAN RESPONS MENTAH (SESUAI PERMINTAAN) <<
        // ==========================================================
        
        // Log respons mentah dari API Utama di konsol server
        const rawText = await res.text();
        if (!res.ok) {
            console.error(`❌ API Pengajuan Utama GAGAL (${res.status}). Respons Mentah: ${rawText.slice(0, 500)}`);
        } else {
            console.log(`✅ API Pengajuan Utama SUKSES (${res.status}). Respons Mentah: ${rawText.slice(0, 500)}`);
        }
        
        // Mengembalikan respons mentah ke frontend
        return new NextResponse(rawText, {
            status: res.status,
            headers: {
                'Content-Type': 'application/json',
            },
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