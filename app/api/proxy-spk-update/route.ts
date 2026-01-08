import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
    try {
        console.log("SPK Update Proxy: Request received");
        
        const { searchParams } = new URL(req.url);
        const uuid = searchParams.get("uuid");

        if (!uuid) {
            return NextResponse.json({ success: false, message: "UUID SPK diperlukan." }, { status: 400 });
        }

        // 1. Baca data yang masuk ke Proxy (dari Client)
        const incomingFormData = await req.formData();
        const authHeader = req.headers.get("Authorization");
        
        // 2. Log untuk debugging (Pastikan data masuk)
        console.log("SPK Update Proxy: Data received from client:");
        for (const [key, value] of incomingFormData.entries()) {
            console.log(`${key}: ${value}`);
        }
        
        // 3. KONVERSI KE URLSearchParams (Agar formatnya x-www-form-urlencoded)
        // Ini kuncinya agar Laravel bisa baca data di method PUT
        const params = new URLSearchParams();
        
        for (const [key, value] of incomingFormData.entries()) {
            // Pastikan value adalah string (karena kita kirim path file, bukan blob)
            if (typeof value === 'string') {
                params.append(key, value);
            }
        }

        const backendUrl = `${process.env.API_BASE_URL}/api/spk/update/${uuid}`;
        console.log("SPK Update Proxy: Forwarding to backend (as x-www-form-urlencoded):", backendUrl);

        // 4. Kirim ke Backend
        const backendResponse = await fetch(backendUrl, {
            method: "PUT", 
            headers: {
                "Authorization": authHeader || "",
                "Accept": "application/json",
                "Content-Type": "application/x-www-form-urlencoded", // Header Wajib untuk PUT di Laravel
            },
            body: params.toString(), // Kirim string URL encoded
        });

        console.log("SPK Update Proxy: Backend response status:", backendResponse.status);

        // 5. Handle Response
        const responseText = await backendResponse.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            console.error("SPK Update Proxy: Backend response is not JSON:", responseText);
            data = { success: false, message: "Backend Error (Non-JSON response)", raw: responseText };
        }

        return NextResponse.json(data, {
            status: backendResponse.status,
        });

    } catch (error: any) {
        console.error("SPK Update Proxy Error:", error);
        return NextResponse.json(
            { success: false, message: error.message || "Terjadi kesalahan di server internal (Proxy)." },
            { status: 500 }
        );
    }
}