import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;
const GET_API_SPK_RIWAYAT_STAF = `${API_BASE_URL}/api/spk/riwayat`; 

// Fungsi GET tidak lagi memerlukan parameter 'params' karena NPP sudah tidak digunakan
export async function GET(request: NextRequest) {
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    // Validasi token tetap diperlukan
    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized: Token missing' }, { status: 401 });
    }

    try {
        const externalApiUrl = GET_API_SPK_RIWAYAT_STAF;

        console.log(`[Proxy] Fetching all SPK staff history data from ${externalApiUrl}`);

        const apiResponse = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
        });

        const data = await apiResponse.json();

        return NextResponse.json(data, { status: apiResponse.status });

    } catch (error) {
        console.error('Error fetching all staff SPK history:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

// Metode lain tidak berubah
export async function POST() { return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 }); }