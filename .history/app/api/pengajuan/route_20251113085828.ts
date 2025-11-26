import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
// /api/pengajuan (Route Handler)

// ... Konstanta URL
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

async function uploadFile(file: File, token: string, customName: string): Promise<string> {
    const formData = new FormData();
    
    // Ganti 'file' (atau nama field file lama) menjadi 'photo'
    formData.append('photo', file, customName); // <-- Pastikan nama field di sini 'photo'

    formData.append('path', 'work-order/2025/11/');
    formData.append('filename', customName);
    
    // Lakukan fetch ke FILE_HANDLER_URL
    const res = await fetch(FILE_HANDLER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // Hapus 'Content-Type': 'multipart/form-data', karena FormData sudah menanganinya
        },
        body: formData,
    });

    const result = await res.json();

    if (res.ok && result.success) {
        return result.data.fileUrl; // Asumsi URL file ada di result.data.fileUrl
    } else {
        throw new Error(`Gagal upload ${customName}. Pesan: ${result.message || 'Error tidak diketahui'}`);
    }
}


// ---------------------------------------------------------------------
// FUNGSI BARU: HANDLER GET untuk mengambil data pengajuan
// ---------------------------------------------------------------------
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token tidak ditemukan" },
                { status: 401 }
            );
        }

        // Panggil backend API (proxy)
        const res = await fetch(EXTERNAL_API_URL, {
            method: 'GET',
            headers: {
                Accept: "application/json",
                // Teruskan token ke backend Laravel
                'Authorization': `Bearer ${token}`,
                // WAJIB: Header untuk melewati peringatan ngrok
                "ngrok-skip-browser-warning": "true",
            },
            cache: "no-store",
        });

        // Cek status respons dari backend
        if (!res.ok) {
            console.error(`[GET PENGAJUAN] Backend merespons status ${res.status}.`);
            return NextResponse.json(
                { success: false, message: "Gagal mengambil data dari API eksternal" },
                { status: res.status }
            );
        }

        // Ambil dan kembalikan data JSON langsung ke frontend
        const json = await res.json();
        return NextResponse.json(json); 

    } catch (error) {
        console.error("Error API GET /pengajuan:", error);
        return NextResponse.json(
            { success: false, message: "Terjadi kesalahan server proxy GET" },
            { status: 500 }
        );
    }
}
// ---------------------------------------------------------------------


// ---------------------------------------------------------------------
// HANDLER POST YANG SUDAH ADA (Tidak diubah)
// ---------------------------------------------------------------------
export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token tidak ditemukan" },
                { status: 401 }
            );
        }
        
        const formData = await req.formData();
        const externalFormData = new FormData();
        const fileUrls: string[] = [];
        
        const timestamp = Date.now();
        const uploadPromises = [];
        let ttdUrl: string | undefined;

        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File) {
            const ttdExt = ttdFile.name.split('.').pop();
            const ttdCustomName = `work-order_${timestamp}.${ttdExt}`; 
            ttdUrl = await uploadFile(ttdFile, token, ttdCustomName, 'ttd'); 
        }

        let fileIndex = 0;
        while (true) {
            const file = formData.get(`file${fileIndex}`); 
            if (file instanceof File) {
                const fileExt = file.name.split('.').pop();
                const fileCustomName = `work-order_${timestamp}_${fileIndex + 1}.${fileExt}`; 
                uploadPromises.push(uploadFile(file, token, fileCustomName, 'pengajuans'));
                fileIndex++;
            } else {
                break; 
            }
        }
        
        const results = await Promise.all(uploadPromises);
        results.forEach(url => fileUrls.push(url));
        

        
        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "keterangan", externalName: "catatan" },
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "nppPelapor" }, 
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "nppMengetahui" },
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
            console.error("[POST PENGAJUAN] Gagal parse JSON dari API eksternal. Respon mungkin HTML/teks. Cek terminal untuk detail Ngrok.");
            return NextResponse.json(
                { success: false, message: "API eksternal mengembalikan HTML/format tak dikenal.", raw: rawText.slice(0, 500) },
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
        console.error("Error API /pengajuan:", error);
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