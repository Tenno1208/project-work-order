import { NextResponse, NextRequest } from "next/server";

export const dynamic = 'force-dynamic';

const GET_API_URL = process.env.GET_API_PENGAJUAN_URL || "https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti";

export async function GET(req: NextRequest) {
    if (GET_API_URL.startsWith("http://default-")) {
        return NextResponse.json(
            { success: false, message: "URL API tidak diset dengan benar." },
            { status: 500 }
        );
    }

    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token otorisasi tidak ditemukan." },
                { status: 401 }
            );
        }

        // --- BAGIAN PERBAIKAN URL ---
        
        // 1. Buat object URL target dari .env
        const targetUrl = new URL(GET_API_URL);

        const incomingUrl = new URL(req.url);
        
        incomingUrl.searchParams.forEach((value, key) => {
            targetUrl.searchParams.set(key, value);
        });

        if (targetUrl.searchParams.get('page') === '{number}') {
             targetUrl.searchParams.set('page', '1');
        }

        console.log(`[PROXY] Final URL: ${targetUrl.toString()}`);

        const res = await fetch(targetUrl.toString(), { 
            method: 'GET',
            headers: { 
                Accept: "application/json", 
                'Authorization': `Bearer ${token}`, 
                "ngrok-skip-browser-warning": "true",
                "bypass-tunnel-reminder": "true",
            },
            cache: "no-store",
        });

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
             return NextResponse.json(
                { success: false, message: "Respons backend bukan JSON." },
                { status: res.status }
             );
        }

        const json = await res.json();
        return NextResponse.json(json, { status: res.status }); 

    } catch (error) {
        console.error("Error API Proxy:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
}