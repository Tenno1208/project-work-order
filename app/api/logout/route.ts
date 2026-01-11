import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    const token = request.headers.get('Authorization');
    
    // Periksa token
    if (!token) {
        return NextResponse.json({ message: 'Token not provided' }, { status: 401 });
    }

    // Mengambil URL dari Environment Variable
    // Fallback ke hardcoded URL jika env tidak terbaca (untuk keamanan dev)
    const baseUrl = process.env.API_BASE_URL_LOGOUT_PORTAL_PEGAWAI || "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/auth/logout";

    try {
        const externalRes = await fetch(`${baseUrl}/auth/logout`, {
            method: 'POST',
            headers: {
                'Authorization': token, 
                'Content-Type': 'application/json',
            },
        });

        // Teruskan status dan data dari API eksternal
        // .catch(() => ({})) menangani kasus jika logout sukses tapi tidak ada body response
        const data = await externalRes.json().catch(() => ({}));
        
        // Kembalikan respons yang valid ke client
        return NextResponse.json(data, { status: externalRes.status });

    } catch (error) {
        console.error("External API Error:", error);
        return NextResponse.json({ message: 'Failed to reach external API' }, { status: 500 });
    }
}