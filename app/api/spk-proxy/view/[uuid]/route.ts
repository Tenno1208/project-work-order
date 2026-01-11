import { NextResponse } from 'next/server';

// 💡 Definisikan URL API eksternal dari environment Anda
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";
const EXTERNAL_SPK_VIEW_TEMPLATE = `${API_BASE_URL}/api/spk/view/{uuid}`; 

// Definisikan tipe untuk parameter rute dinamis
interface RouteParams {
    uuid: string;
}

/**
 * Route Handler untuk mengambil detail SPK berdasarkan UUID.
 * Endpoint lokal: /api/spk-proxy/view/[uuid]
 * @param request Objek Request Next.js
 * @param context Objek context yang berisi params dinamis (uuid)
 */
export async function GET(request: Request, context: { params: RouteParams }) {
    
    const { uuid: spk_uuid } = await context.params;


    if (!spk_uuid) {
        return NextResponse.json({ success: false, message: 'SPK UUID is missing in the path.' }, { status: 400 });
    }

    const token = request.headers.get('Authorization')?.split(' ')[1];
    
    if (!token) {
        return NextResponse.json({ success: false, message: 'Authorization token is missing.' }, { status: 401 });
    }

    const externalUrl = EXTERNAL_SPK_VIEW_TEMPLATE.replace('{uuid}', spk_uuid);
    
    try {
        const response = await fetch(externalUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            cache: 'no-store', 
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`External SPK API Error (${response.status}):`, errorText);
            
            return new NextResponse(errorText, { status: response.status, headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' } });
        }
        
        const data = await response.json();
        
        return NextResponse.json(data);

    } catch (error) {
        console.error("Proxy fetch error for SPK Detail:", error);
        return NextResponse.json({ success: false, message: 'Internal server error or external API is unreachable.' }, { status: 500 });
    }
}