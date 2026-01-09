import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const uuid = searchParams.get("uuid");

    const authHeader = request.headers.get("Authorization");

    if (!uuid) {
        return NextResponse.json({ message: "UUID is required" }, { status: 400 });
    }

    try {
        // 2. Siapkan header untuk request ke Backend
        const backendHeaders: HeadersInit = {
            "ngrok-skip-browser-warning": "true",
            "Accept": "application/json"
        };

        // 3. Jika Client mengirim token, teruskan ke Backend
        if (authHeader) {
            backendHeaders["Authorization"] = authHeader;
        }

        const res = await fetch(`${BACKEND_URL}/api/tracking/uuid/${uuid}`, {
            headers: backendHeaders
        });

        if (!res.ok) {
            // Jika error 401 (Unauthorized), teruskan statusnya agar Client tahu token expired/salah
            return NextResponse.json(
                { message: `Error from backend: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}