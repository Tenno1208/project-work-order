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

        // 3. LOOP PROSES FILE (UNIQUE NAMING)
        let processedCount = 0;
        
        // Buat timestamp sekali untuk batch ini (opsional, bisa juga per file)
        const batchTimestamp = Date.now(); 

        for (let i = 1; i <= photoCount; i++) {
            const photo = formData.get(`photo_${i}`);
            let rawFilename = formData.get(`filename_${i}`) as string; // misal: spk-005/PK/12.jpg

            if (photo && photo instanceof File && photo.size > 0) {
                // --- LOGIKA UNIK (MODIFIKASI DISINI) ---

                // A. Generator Unik (Timestamp + Random String 5 karakter)
                const uniqueId = `${batchTimestamp}-${Math.random().toString(36).substring(2, 7)}`;

                // B. Bersihkan Nama Dasar
                // Jika tidak ada nama, pakai 'image'. Ganti slash '/' jadi '-'
                let cleanName = rawFilename ? rawFilename.replace(/\//g, '-') : `image`;

                // C. Hapus Ekstensi Lama (agar tidak double, misal .jpg.jpg)
                cleanName = cleanName.replace(/(\.[\w\d]+)+$/, '');

                // D. Atur Prefix (Sesuai Request)
                if (cleanName.toLowerCase().startsWith('spk-')) {
                     cleanName = cleanName.replace(/^spk-/i, 'work-order-'); // Ubah spk- jadi work-order- (sesuaikan kebutuhan)
                     // ATAU jika ingin tetap spk-work-order-:
                     // cleanName = cleanName.replace(/^spk-/i, 'spk-work-order-');
                } 
                
                // Pastikan awalan konsisten. Contoh di sini kita paksa pakai "work-order-"
                if (!cleanName.toLowerCase().includes('work-order')) {
                    cleanName = `work-order-${cleanName}`;
                }

                // E. Ambil Ekstensi Asli File
                const originalExt = photo.name.split('.').pop() || 'jpg';

                // F. GABUNGKAN MENJADI FINAL FILENAME YANG UNIK
                // Format: [Nama]-[UniqueCode]-[IndexLoop].[Ext]
                // Contoh: work-order-laporan-1767586015029-6aekr-1.jpg
                const finalFilename = `${cleanName}-${uniqueId}-${i}.${originalExt}`;

                console.log(`[File ${i}] Original: ${photo.name} -> Final: ${finalFilename}`);

                // G. Proses Buffer & Append
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

        // 5. PARSING DATA
        let filepaths: string[] = [];
        
        if (responseJson.data && typeof responseJson.data === 'object') {
            filepaths = Object.values(responseJson.data).map((item: any) => {
                return item.filepath ? item.filepath.replace(/\/\//g, '/') : null;
            }).filter(p => p !== null) as string[];
        }

        return NextResponse.json({
            success: true,
            message: "Upload berhasil",
            data: responseJson.data,
            clean_filepaths: filepaths
        });
        
    } catch (error) {
        console.error("[POST Multiple] Error:", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}