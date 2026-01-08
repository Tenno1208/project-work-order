// File: src/app/api/dashboard-data/route.ts

import { NextRequest, NextResponse } from 'next/server';

const NGROK_API_URL = process.env.API_BASE_URL || "https://fermentable-nonarchitecturally-brittney.ngrok-free.dev"; 
const BACKEND_DASHBOARD_ENDPOINT = "/api/dashboard/data";

export async function GET(request: NextRequest) {
    const token = request.headers.get('Authorization');
    
    // Mengambil semua query parameter dari request lokal (e.g., ?start_date=X&end_date=Y)
    const { searchParams } = new URL(request.url);
    const filterQuery = searchParams.toString(); 

    try {
        const fullBackendUrl = `${NGROK_API_URL}${BACKEND_DASHBOARD_ENDPOINT}?${filterQuery}`;

        const res = await fetch(fullBackendUrl, {
            method: 'GET', 
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true', 
                'Host': new URL(NGROK_API_URL).host, 
                ...(token && { 'Authorization': token }),
            },
        });
        
        const contentType = res.headers.get('content-type');
        
        if (!contentType || !contentType.includes('application/json')) {
            const text = await res.text(); 
            console.error(`[PROXY ERROR]: Backend returned non-JSON response (Status ${res.status}): ${text.substring(0, 100)}...`);
            
            const errorMessage = (text.includes("ERR_NGROK_6024") || text.includes("ngrok.com")) 
                ? "NGROK_SECURITY_ERROR: Pastikan Ngrok URL Anda valid dan berjalan." 
                : `Backend returned non-JSON error (Status ${res.status}).`;

            return NextResponse.json({ success: false, message: errorMessage }, { status: 502 }); 
        }
        // ------------------------------------------------------------------------

        const data = await res.json();
        return NextResponse.json(data, { status: res.status }); 

    } catch (error) {
        console.error('Error in dashboard proxy GET (Koneksi Gagal):', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}