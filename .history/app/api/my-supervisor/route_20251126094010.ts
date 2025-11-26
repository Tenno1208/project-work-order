import { NextRequest, NextResponse } from 'next/server';

// Ganti URL ini dengan URL API yang benar
const SUPERVISOR_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/auth/my-supervisor";

/**
 * @param {NextRequest} request - Objek permintaan Next.js
 */
export async function GET(request: NextRequest) {
    // 1. Ambil token dari header Authorization
    const authorizationHeader = request.headers.get('Authorization');

    if (!authorizationHeader) {
        return NextResponse.json(
            { success: false, message: 'Authorization token not provided.' },
            { status: 401 }
        );
    }
    
    // 2. Panggil API eksternal
    try {
        const externalResponse = await fetch(SUPERVISOR_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': authorizationHeader, // Teruskan token
                'Content-Type': 'application/json',
            },
            // Penting: nonaktifkan cache untuk memastikan data selalu baru
            cache: 'no-store', 
        });

        // 3. Periksa respons dari API eksternal
        if (!externalResponse.ok) {
            // Ambil data error dari body respons eksternal
            let errorData;
            try {
                errorData = await externalResponse.json();
            } catch {
                errorData = { message: externalResponse.statusText };
            }

            // Kembalikan status error yang sama
            return NextResponse.json(
                { 
                    success: false, 
                    message: errorData.message || 'Gagal mengambil data supervisor dari API eksternal.',
                    details: errorData 
                },
                { status: externalResponse.status }
            );
        }

        // 4. Ambil data dan kembalikan ke frontend
        const data = await externalResponse.json();
        
        return NextResponse.json({ 
            success: true, 
            data: data.data || data // Sesuaikan struktur respons jika API PDAM membungkus data dalam 'data'
        }, { status: 200 });

    } catch (error) {
        console.error("Proxy error fetching supervisor data:", error);
        return NextResponse.json(
            { success: false, message: 'Internal Server Error during proxy request.' },
            { status: 500 }
        );
    }
}

// Opsional: Tolak method lain
export async function POST() {
    return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 });
}
// Tambahkan handler untuk PUT, DELETE, dll. jika diperlukan.