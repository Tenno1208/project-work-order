import { NextResponse, NextRequest } from 'next/server';

const ALL_PEGAWAI_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/client/user/all-pegawai";

export async function GET(request: NextRequest) {
    const token = request.headers.get('authorization');

    if (!token) {
        return NextResponse.json({ message: 'Authorization token is missing' }, { status: 401 });
    }

    try {
        const apiResponse = await fetch(ALL_PEGAWAI_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Accept': 'application/json',
                "ngrok-skip-browser-warning": "true",
                "bypass-tunnel-reminder": "true",
            },
            cache: 'no-store',
        });

        if (!apiResponse.ok) {
            console.error(`External All Pegawai API error (${apiResponse.status}):`, await apiResponse.text());
            return NextResponse.json(
                { message: `Gagal memuat data pegawai. Status: ${apiResponse.statusText}` },
                { status: apiResponse.status }
            );
        }

        const data = await apiResponse.json();
        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("All Pegawai Proxy Network Error:", error);
        return NextResponse.json({ message: 'Internal Server Error during pegawai proxy operation' }, { status: 500 });
    }
}