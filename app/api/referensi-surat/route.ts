// app/api/referensi-surat/route.ts

const EXTERNAL_API_URL = process.env.API_BASE_URL + "/api/pengajuan/rferensi/surat";

export async function GET(request: Request) {
    // 1. Ambil Authorization Header dari Request Frontend
    const authorizationHeader = request.headers.get('authorization');
    if (!authorizationHeader) {
        return new Response(JSON.stringify({ success: false, message: 'Authorization header missing' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        // 2. Teruskan permintaan ke API eksternal
        const externalResponse = await fetch(EXTERNAL_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': authorizationHeader, // Teruskan token
                'Content-Type': 'application/json',
            },
            cache: 'no-store' 
        });

        // 3. Ambil data dan status
        const data = await externalResponse.json();
        
        // 4. Kembalikan Response ke Frontend
        return new Response(JSON.stringify(data), {
            status: externalResponse.status,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error fetching external reference letters API:', error);
        return new Response(JSON.stringify({ success: false, message: 'Internal Server Error fetching reference letters' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}