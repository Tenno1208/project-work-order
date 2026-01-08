import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get("Authorization");
        
        if (!token) {
            return NextResponse.json({ success: false, message: "Token diperlukan." }, { status: 401 });
        }

        const backendUrl = `${process.env.API_BASE_URL}/api/master/status/spk`;

        const response = await fetch(backendUrl, {
            method: "GET",
            headers: {
                "Authorization": token,
                "Accept": "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(`Gagal mengambil data status: ${response.status}`);
        }

        const data = await response.json();
        
        return NextResponse.json(data, { status: response.status });

    } catch (error: any) {
        console.error("SPK Status Proxy Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Terjadi kesalahan di server internal (Proxy)." },
            { status: 500 }
        );
    }
}