import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;

const EXTERNAL_SPK_LIST_URL = `${API_BASE_URL}/api/spk/views/data`;

/**
 * Rute lokal: /api/spk/list
 */
export async function GET(req: Request) {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return NextResponse.json(
            { success: false, message: "Token otorisasi tidak ditemukan." },
            { status: 401 }
        );
    }

    if (!API_BASE_URL) {
        console.error("Variabel environment API_BASE_URL tidak diatur!");
        return NextResponse.json(
            { success: false, message: "Konfigurasi API server tidak lengkap." },
            { status: 500 }
        );
    }

    try {
        console.log(`[PROXY INFO] Menghubungi API SPK: ${EXTERNAL_SPK_LIST_URL}`);

        const res = await fetch(EXTERNAL_SPK_LIST_URL, {
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true", 
            },
            cache: "no-store",
        });

        const rawText = await res.text();
        
        if (!res.ok) {
            console.error(`[PROXY ERROR] Gagal ambil data SPK (Status ${res.status}). Respon: ${rawText.slice(0, 200)}`);
            
            let errorJson = null;
            try {
                errorJson = JSON.parse(rawText);
            } catch {}
            
            return NextResponse.json(
                { 
                    success: false, 
                    message: `Gagal ambil data SPK (Status ${res.status}). Pesan Eksternal: ${errorJson?.message || 'Error API Eksternal.'}`,
                    debug_url_eksternal: EXTERNAL_SPK_LIST_URL,
                    raw: rawText 
                },
                { status: res.status }
            );
        }

        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error("[PROXY ERROR] Gagal parse JSON dari API eksternal.");
            return NextResponse.json(
                { success: false, message: "API eksternal mengembalikan format tak dikenal (bukan JSON)." },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Data SPK berhasil diambil.",
            data: json.data || [], 
        });

    } catch (error) {
        console.error("Error API /spk/list:", error);
        return NextResponse.json(
            { success: false, message: "Kesalahan server internal Next.js.", error: String(error) },
            { status: 500 }
        );
    }
}