import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;
const GET_API_SPK_RIWAYAT_STAF = `${API_BASE_URL}/api/spk/staf`; 

export async function GET(request: NextRequest, { params }: { params: { npp: string } }) {
    const npp = params.npp;
    const token = request.headers.get('authorization')?.split(' ')[1];
    
    if (!npp) {
        return NextResponse.json({ success: false, message: 'NPP parameter is required' }, { status: 400 });
    }
    
    if (!token) {
        return NextResponse.json({ success: false, message: 'Unauthorized: Token missing' }, { status: 401 });
    }

    try {
        const externalApiUrl = `${GET_API_SPK_RIWAYAT_STAF}/${npp}`;

        console.log(`[Proxy] Fetching SPK data for NPP: ${npp} from ${externalApiUrl}`);

        const apiResponse = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
        });

        const data = await apiResponse.json();

        // Mengembalikan status asli
        return NextResponse.json(data, { status: apiResponse.status });

    } catch (error) {
        console.error('Error fetching staff SPK history:', error);
        return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
    }
}

// Opsional: Blokir semua method lain secara eksplisit
export async function POST() { return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 }); }
export async function PUT() { return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ success: false, message: 'Method Not Allowed' }, { status: 405 }); }