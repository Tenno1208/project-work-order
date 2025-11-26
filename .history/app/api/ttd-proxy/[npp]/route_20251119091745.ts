// app/api/asset-proxy/route.ts

import { NextRequest, NextResponse } from 'next/server';

const FILE_HANDLER_BASE_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/";

/**
 * Proxy untuk mengambil aset gambar/file dari File Handler PDAM
 * Klien memanggil: /api/asset-proxy?path=...&filename=...
 */
export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');
    const filename = searchParams.get('filename');
    const token = request.headers.get('authorization');

    if (!path || !filename) {
        return new Response('Missing path or filename parameters', { status: 400 });
    }

    if (!token) {
        return new Response('Authorization token is missing', { status: 401 });
    }

    // Rekonstruksi URL File Handler PDAM (berdasarkan format yang terlihat di console Anda)
    // Contoh: .../foto/?path=work-order/2025/11/&filename=file.jpg
    const externalFileUrl = `${FILE_HANDLER_BASE_URL}?path=${path}&filename=${filename}`;
    
    try {
        const fileResponse = await fetch(externalFileUrl, {
            method: 'GET',
            headers: {
                'Authorization': token,
            },
            cache: 'no-store',
        });

        if (!fileResponse.ok) {
            console.error(`External File Fetch Error (${fileResponse.status}): ${externalFileUrl}`);
            return new Response(`Failed to fetch file: ${fileResponse.statusText}`, { status: fileResponse.status });
        }

        // Mengembalikan file content dan header secara langsung
        const contentType = fileResponse.headers.get('content-type') || 'application/octet-stream';

        return new Response(fileResponse.body, {
            status: 200,
            headers: {
                'Content-Type': contentType,
                // Tambahkan header cache control untuk file asset
                'Cache-Control': 'public, max-age=3600', 
            },
        });

    } catch (error) {
        console.error("Asset Proxy Network Error:", error);
        return new Response('Internal Server Error fetching asset', { status: 500 });
    }
}