// File: app/api/file-handler/upload/multiple/foto/route.ts
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const PDAM_MULTIPLE_FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/multiple/foto";

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
        const forwardFormData = new FormData();
        
        // 1. SETUP PATH
        const uploadPath = generateDynamicPath();
        forwardFormData.append('path', uploadPath);
        
        // 2. SETUP JUMLAH FOTO
        const photoCount = parseInt(formData.get('photo_count') as string || '0');
        forwardFormData.append('photo_count', photoCount.toString());
        
        console.log(`[POST Multiple] Path: ${uploadPath}, Count: ${photoCount}`);

        // 3. LOOP PROSES FILE (NAMING & SANITIZING)
        let processedCount = 0;
        for (let i = 1; i <= photoCount; i++) {
            const photo = formData.get(`photo_${i}`);
            let rawFilename = formData.get(`filename_${i}`) as string; // misal: spk-005/PK/12.jpg

            if (photo && photo instanceof File && photo.size > 0) {
                // A. SANITASI NAMA FILE
                // Ganti '/' jadi '-'
                let cleanName = rawFilename ? rawFilename.replace(/\//g, '-') : `image-${i}.jpg`;
                
                // B. UBAH FORMAT AWALAN (REQUEST USER)
                // Jika diawali "spk-", ubah jadi "spk-work-order-"
                if (cleanName.toLowerCase().startsWith('spk-')) {
                     cleanName = cleanName.replace(/^spk-/i, 'spk-work-order-');
                } else if (!cleanName.toLowerCase().startsWith('spk-work-order-')) {
                     // Jika belum ada awalan sama sekali, tambahkan
                     cleanName = `spk-work-order-${cleanName}`;
                }

                // C. HAPUS EKSTENSI GANDA (Mencegah .jpg.jpg)
                // Kita hapus ekstensi .jpg/.png dari string nama, biarkan server/blob type yang menentukan
                // atau pastikan hanya ada satu.
                cleanName = cleanName.replace(/(\.[\w\d]+)+$/, ''); // Hapus ekstensi di ujung string
                
                // Tambahkan ekstensi asli dari file yang diupload (biar aman)
                const originalExt = photo.name.split('.').pop() || 'jpg';
                const finalFilename = `${cleanName}.${originalExt}`;

                console.log(`[File ${i}] Final Name: ${finalFilename}`);

                // D. PROSES BUFFER
                const buffer = await photo.arrayBuffer();
                const fileBlob = new Blob([buffer], { type: photo.type });

                forwardFormData.append(`photo_${i}`, fileBlob, finalFilename);
                forwardFormData.append(`filename_${i}`, finalFilename);
                
                processedCount++;
            }
        }

        if (processedCount === 0) {
             return NextResponse.json({ success: false, message: "Tidak ada file valid" }, { status: 400 });
        }
        
        // 4. KIRIM KE PDAM
        const response = await fetch(PDAM_MULTIPLE_FILE_HANDLER_URL, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: forwardFormData,
            cache: "no-store", 
        });
        
        const responseText = await response.text();
        let responseJson: any;
        
        try {
            responseJson = JSON.parse(responseText);
        } catch (e) {
            return NextResponse.json({ success: false, message: "Invalid JSON from PDAM", raw: responseText }, { status: 502 });
        }

        if (!response.ok || (responseJson.data && responseJson.data.error)) {
             return NextResponse.json({ success: false, message: "Gagal upload", data: responseJson.data }, { status: response.status });
        }

        // 5. PARSING DATA AGAR MUDAH DIPAKAI FRONTEND
        // API PDAM mengembalikan object {"1": {...}, "2": {...}}
        // Kita ubah jadi Array filepath yang bersih
        let filepaths: string[] = [];
        
        if (responseJson.data && typeof responseJson.data === 'object') {
            filepaths = Object.values(responseJson.data).map((item: any) => {
                // Ambil filepath dan bersihkan double slash //
                return item.filepath ? item.filepath.replace(/\/\//g, '/') : null;
            }).filter(p => p !== null) as string[];
        }

        // Return Data yang sudah rapi ke Frontend
        return NextResponse.json({
            success: true,
            message: "Upload berhasil",
            data: responseJson.data, // Data asli (untuk debug)
            clean_filepaths: filepaths // Data bersih untuk API selanjutnya
        });
        
    } catch (error) {
        console.error("[POST Multiple] Error:", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}