import { NextResponse } from "next/server";

// Helper Header CORS agar bisa diakses dari localhost & 127.0.0.1
const corsHeaders = {
    "Access-Control-Allow-Origin": "*", // Mengizinkan semua domain
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, ngrok-skip-browser-warning",
};

// Handle Preflight Request (Penting untuk CORS)
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    // Ambil Header Auth dari Frontend
    const authHeader = request.headers.get('Authorization');

    // URL Backend Ngrok
    const API_BASE_URL = "https://fermentable-nonarchitecturally-brittney.ngrok-free.dev";
    
    let targetEndpoint = "";
    if (mode === 'pengajuan') {
        targetEndpoint = `${API_BASE_URL}/api/report/data/pengajuan`;
    } else {
        targetEndpoint = `${API_BASE_URL}/api/report/data/spk`;
    }

    const backendUrl = new URL(targetEndpoint);
    
    // Teruskan Query Params
    searchParams.forEach((value, key) => {
        if (key !== 'mode') { 
            backendUrl.searchParams.append(key, value);
        }
    });

    try {
        console.log("Proxy Fetching to:", backendUrl.toString());

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
        };

        if (authHeader) {
            headers['Authorization'] = authHeader;
        }

        const res = await fetch(backendUrl.toString(), {
            method: "GET",
            headers: headers,
            cache: "no-store"
        });

        if (!res.ok) {
            return NextResponse.json(
                { error: `Backend Error: ${res.statusText}` },
                { status: res.status, headers: corsHeaders } // Sertakan CORS saat error
            );
        }

        const data = await res.json();
        
        // Sertakan CORS saat sukses
        return NextResponse.json(data, { headers: corsHeaders });

    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500, headers: corsHeaders } // Sertakan CORS saat error
        );
    }
}