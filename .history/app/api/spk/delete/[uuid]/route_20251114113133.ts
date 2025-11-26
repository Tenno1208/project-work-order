import { NextResponse } from "next/server";

// Mengambil URL dasar dari environment variable.
const API_BASE_URL = process.env.API_BASE_URL; 

const DELETE_API_SPK_URL_TEMPLATE = `${API_BASE_URL}/api/spk/delete`; 


export async function DELETE(
    req: Request, 
    { params }: { params: { uuid: string } }
) {
    const { uuid } = params; 
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
        return NextResponse.json({ success: false, message: "Token otorisasi tidak ditemukan." }, { status: 401 });
    }

    if (!API_BASE_URL) {
        return NextResponse.json({ success: false, message: "Konfigurasi API server tidak lengkap." }, { status: 500 });
    }
    
    const externalDeleteUrl = `${DELETE_API_SPK_URL_TEMPLATE}${uuid}`; 
    
    try {
        const res = await fetch(externalDeleteUrl, {
            method: 'DELETE',
            headers: {
                "Authorization": `Bearer ${token}`,
                "Accept": "application/json",
                "ngrok-skip-browser-warning": "true",
            },
            cache: "no-store",
        });

        const rawText = await res.text();
        
        if (!res.ok) {
            let errorJson = null;
            try { errorJson = JSON.parse(rawText); } catch {}
            
            return NextResponse.json(
                { 
                    success: false, 
                    message: errorJson?.message || `Gagal menghapus SPK. Status: ${res.status}`,
                    debug_url_eksternal: externalDeleteUrl,
                },
                { status: res.status }
            );
        }

        let json;
        try { json = JSON.parse(rawText); } catch (e) {
            return NextResponse.json({ success: false, message: "API eksternal mengembalikan format tak dikenal." }, { status: 500 });
        }

        return NextResponse.json(json, { status: 200 });

    } catch (error) {
        return NextResponse.json({ success: false, message: "Kesalahan server internal Next.js." }, { status: 500 });
    }
}