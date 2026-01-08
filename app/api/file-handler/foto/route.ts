// File: app/api/file-handler/upload/foto/route.ts
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const PDAM_FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";

function generateDynamicPath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    // PERBAIKAN: Jangan pakai slash di akhir
    return `work-order/${year}/${month}`; 
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
        
        // --- 1. PERBAIKAN PATH ---
        let clientPath = formData.get('path') as string;
        // Hapus slash di akhir jika ada
        if (clientPath && clientPath.endsWith('/')) {
            clientPath = clientPath.slice(0, -1);
        }
        const uploadPath = clientPath || generateDynamicPath();
        
        forwardFormData.append('path', uploadPath);
        
        // --- 2. PERBAIKAN PENAMAAN FILE ---
        const photo = formData.get('photo');
        let rawFilename = formData.get('filename') as string;

        if (!photo || !(photo instanceof File)) {
             return NextResponse.json({ success: false, message: "File photo tidak ditemukan" }, { status: 400 });
        }

        // Ambil ekstensi asli dari file yang diupload (misal: "jpg")
        const originalExt = photo.name.split('.').pop() || 'jpg';

        // Bersihkan filename dari frontend:
        // 1. Hapus ekstensi jika sudah ada di string (agar tidak jadi .jpg.jpg)
        // 2. Ganti karakter aneh dengan strip
        let baseName = rawFilename.replace(new RegExp(`\.${originalExt}$`, 'i'), ''); 
        baseName = baseName.replace(/[^a-zA-Z0-9-_]/g, '-');

        // Pastikan prefix work-order ada (kecuali TTD)
        if (!baseName.startsWith('ttd-') && !baseName.startsWith('work-order-')) {
             baseName = `work-order-${baseName}`;
        }

        // Gabungkan Nama Bersih + Ekstensi Satu Kali Saja
        const finalFilename = `${baseName}.${originalExt}`;

        // --- 3. KIRIM KE PDAM ---
        const buffer = await photo.arrayBuffer();
        const fileBlob = new Blob([buffer], { type: photo.type });

        forwardFormData.append('photo', fileBlob, finalFilename);
        forwardFormData.append('filename', finalFilename);

        const response = await fetch(PDAM_FILE_HANDLER_URL, {
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
            return NextResponse.json({ success: false, message: "Invalid JSON response", raw: responseText }, { status: 502 });
        }

        if (!response.ok || (responseJson.data && responseJson.data.error)) {
             return NextResponse.json({ success: false, message: "Gagal upload", data: responseJson }, { status: response.status });
        }

        // --- 4. BERSIHKAN PATH RESPONSE ---
        let finalFilePath = responseJson.data?.filepath || null;
        if (finalFilePath) {
            // Hapus double slash jika server PDAM mengembalikannya
            finalFilePath = finalFilePath.replace(/\/\//g, '/');
        }

        return NextResponse.json({
            success: true,
            message: "Upload berhasil",
            data: {
                filepath: finalFilePath,
                ...responseJson.data 
            }
        });
        
    } catch (error) {
        return NextResponse.json({ success: false, message: `Server Error: ${(error as Error).message}` }, { status: 500 });
    }
}