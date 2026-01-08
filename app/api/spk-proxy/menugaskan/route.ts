// app/api/spk-proxy/menugaskan/route.ts
import { NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";
const EXTERNAL_ASSIGN_API = `${API_BASE_URL}/api/spk/menugaskan`;

export async function POST(request: Request) {
    
    const token = request.headers.get('authorization');
    if (!token) {
        return NextResponse.json({ success: false, message: 'Authorization token missing.' }, { status: 401 });
    }

    let payload: any;
    try {
        payload = await request.json();
    } catch (e) {
        // Gagal membaca body request
        return NextResponse.json(
            { success: false, message: 'Invalid JSON body sent from client.' },
            { status: 400 } 
        );
    }
    
    // Validasi Payload yang harus mengandung kedua UUID dan array stafs
    if (!payload || !payload.spk_uuid || !payload.pengajuan_uuid || !Array.isArray(payload.stafs)) {
        return NextResponse.json(
            { success: false, message: 'Payload is incomplete (missing spk_uuid, pengajuan_uuid, or stafs array).' },
            { status: 400 }
        );
    }
    
    // Opsional: Periksa apakah staf memiliki field 'tlp'
    if (payload.stafs.length > 0 && !payload.stafs[0].tlp) {
        return NextResponse.json(
            { success: false, message: 'Stafs array is incomplete (missing tlp field).' },
            { status: 400 }
        );
    }


    try {
        // 2. Meneruskan Payload dan Token ke API Eksternal
        const response = await fetch(EXTERNAL_ASSIGN_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token, 
            },
            body: JSON.stringify(payload),
        });

        const contentType = response.headers.get("content-type");

        if (!response.ok) {
            // Respons GAGAL (status 4xx/5xx)
            let errorData: any;
            if (contentType && contentType.includes("application/json")) {
                // Berhasil parsing JSON dari API eksternal
                errorData = await response.json();
            } else {
                // API eksternal mengembalikan non-JSON (HTML/Text) saat gagal
                const errorText = await response.text();
                errorData = { 
                    success: false, 
                    // Menampilkan 100 karakter pertama dari error teks API eksternal
                    message: `Error from External API (Status ${response.status}): ${errorText.substring(0, 100)}...` 
                };
            }
            
            // Meneruskan error yang lebih jelas ke klien
            return NextResponse.json(errorData, { status: response.status });

        } else {
            // Respons SUKSES (status 2xx)
            const data = await response.json();
            return NextResponse.json(data, { status: response.status });
        }

    } catch (error: any) {
        // Error Jaringan Kritis (misal: DNS, Timeout, Koneksi Gagal)
        console.error("Critical Network Error communicating with external API:", error.message);
        
        return NextResponse.json(
            { 
                success: false, 
                message: `Critical Network Error (502). Could not reach external service.` 
            },
            { status: 502 } 
        );
    }
}