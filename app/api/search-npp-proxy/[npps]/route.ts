import { NextRequest, NextResponse } from 'next/server';

const EXTERNAL_API_BASE_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/masterdata/users/search-npps/";

/**
 * Handle GET requests to /api/search-npp-proxy/[npps]
 * [npps] akan berisi daftar NPP yang dipisahkan koma, e.g., "12345,67890"
 */
export async function GET(
    request: NextRequest, 
    context: { params: { npps: string } }
) {
    const { npps } = await context.params;
    
    const token = request.headers.get('Authorization');

    if (!token) {
        return NextResponse.json({ 
            success: false, 
            message: "Authorization token is missing" 
        }, { status: 401 });
    }

    try {
        const externalUrl = `${EXTERNAL_API_BASE_URL}${npps}`;
        
        const response = await fetch(externalUrl, {
            method: 'GET',
            headers: {
                'Authorization': token, 
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            console.error(`External API error status ${response.status}: ${errorText}`);
            
            return NextResponse.json({ 
                success: false, 
                message: `Failed to fetch external API: ${response.statusText}` 
            }, { status: response.status });
        }
        
        const data = await response.json();

        return NextResponse.json(data, { status: 200 });

    } catch (error) {
        console.error("Proxy fetch error:", error);
        return NextResponse.json({ 
            success: false, 
            message: `Internal Server Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
}