import { NextResponse } from 'next/server';

// URL ini HANYA digunakan di sini, di sisi server.
const EXTERNAL_LOGOUT_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/auth/logout";

// 1. HAPUS 'export default'
// 2. Gunakan 'export async function POST' (wajib untuk App Router)
export async function POST(request: Request) {
    const token = request.headers.get('Authorization');
    
    // Periksa token
    if (!token) {
        // Harus menggunakan NextResponse di App Router
        return NextResponse.json({ message: 'Token not provided' }, { status: 401 });
    }

    try {
        const externalRes = await fetch(EXTERNAL_LOGOUT_URL, {
            method: 'POST',
            // Headers yang diteruskan ke API eksternal
            headers: {
                'Authorization': token, 
                'Content-Type': 'application/json',
            },
        });

        // Teruskan status dan data dari API eksternal
        const data = await externalRes.json().catch(() => ({}));
        
        // Kembalikan respons yang valid
        return NextResponse.json(data, { status: externalRes.status });

    } catch (error) {
        console.error("External API Error:", error);
        return NextResponse.json({ message: 'Failed to reach external API' }, { status: 500 });
    }
}

// Catatan: Jika ada metode lain (seperti GET) yang diakses oleh klien, 
// tetapi tidak didefinisikan di sini, Next.js akan mengembalikan 405 secara otomatis. 
// Karena Anda hanya mengekspor POST, error ini seharusnya hilang.