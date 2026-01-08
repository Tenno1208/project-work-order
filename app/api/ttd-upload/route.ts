import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto'; 

export const dynamic = 'force-dynamic';

const FILE_HANDLER_URL = process.env.FILE_HANDLER_URL || "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/api/upload/foto";
const CREATE_TTD_API = process.env.GET_API_CREATE_TTD || "https://fermentable-nonarchitecturally-brittney.ngrok-free.dev/api/user/create/ttd";


function generateDynamicPath(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');

    return `workorder-ttd/${year}/${month}/`; 
}

/**
 * Handles POST request to upload a CROPPED TTD file.
 * The process involves two steps:
 * 1. Upload the processed image file to the external file handler service.
 * 2. Save the returned file path to the main application database via the create TTD API.
 */
export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const ttdFile = formData.get('ttd_file') as File; 
        const npp = formData.get('npp') as string;
        
        if (!ttdFile || !npp) {
            return NextResponse.json(
                { success: false, message: "File TTD yang sudah diproses dan NPP diperlukan" },
                { status: 400 }
            );
        }
        
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];
        
        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token otorisasi tidak ditemukan" },
                { status: 401 }
            );
        }
        
        const uploadFormData = new FormData();
        const uploadPath = generateDynamicPath();
        
        const timestamp = Date.now();
        const uuidPart = randomUUID(); 
        
        const fileName = `ttd-workorder-${uuidPart}-${timestamp}.png`;
        
        console.log("=".repeat(70));
        console.log("📤 Sedang upload TTD Mengetahui ke PDAM...");
        console.log("📦 Path Direktori:", uploadPath);
        console.log("📝 Nama File:", fileName);
        console.log("=".repeat(70));

        uploadFormData.append('photo', ttdFile, fileName);
        uploadFormData.append('path', uploadPath);
        uploadFormData.append('filename', fileName);
        
        const uploadResponse = await fetch(FILE_HANDLER_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: uploadFormData,
            cache: "no-store",
        });
        
        const rawText = await uploadResponse.text();
        let uploadResult: any;

        try {
            uploadResult = JSON.parse(rawText);
        } catch (e) {
            console.error(`❌ Gagal parsing JSON dari File Handler. Status: ${uploadResponse.status}. Raw: ${rawText.slice(0, 200)}`);
            return NextResponse.json(
                { success: false, message: `Gagal membaca respons JSON dari File Handler. Status: ${uploadResponse.status}` },
                { status: 500 }
            );
        }

        if (!uploadResponse.ok || !uploadResult.data?.filepath) {
            console.error("🔴 Gagal upload ke file handler:", uploadResult);
            return NextResponse.json(
                { success: false, message: uploadResult.message || "Gagal upload file TTD yang sudah diproses ke server penyimpanan" },
                { status: uploadResponse.status }
            );
        }
        
        const ttdPath = uploadResult.data.filepath.replace(/\/\//g, '/');
        
        console.log("✅ TTD berhasil di-upload ke File Handler PDAM");
        console.log("📦 Final FilePath (Path Relatif):", ttdPath);
        console.log("=".repeat(70));

        const createTTDResponse = await fetch(CREATE_TTD_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                npp: npp,
                ttd_path: ttdPath
            }),
            cache: "no-store",
        });
        
        const createTTDResult = await createTTDResponse.json();
        
        if (!createTTDResponse.ok || !createTTDResult.success) {
            console.error("🔴 Gagal menyimpan path TTD ke database:", createTTDResult);
            return NextResponse.json(
                { success: false, message: createTTDResult.message || "Gagal menyimpan path TTD ke database" },
                { status: createTTDResponse.status }
            );
        }
        
        return NextResponse.json({
            success: true,
            message: "TTD (hasil crop) berhasil diupload dan disimpan",
            data: {
                ttd_path: ttdPath
            }
        });
        
    } catch (error: any) {
        console.error("Error uploading cropped TTD:", error);
        return NextResponse.json(
            { success: false, message: `Terjadi kesalahan server: ${error.message}` },
            { status: 500 }
        );
    }
}