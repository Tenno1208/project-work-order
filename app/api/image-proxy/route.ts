//app/api/image-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';

const FILE_SERVER_BASE_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/file-handler/foto/";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const path = searchParams.get('path');
  const filename = searchParams.get('filename');
  const full_url = searchParams.get('url');

  if (!path && !full_url) {
    return new NextResponse('Missing path or url parameter', { status: 400 });
  }

  const authHeader = request.headers.get('authorization'); 
  
  let fetchUrl: string;

  if (full_url) {
      if (full_url.startsWith('http')) {
          fetchUrl = full_url;
      } else {
          console.warn("⚠️ Parameter 'url' berisi path relatif, menggabungkan dengan Base URL.");
          if (full_url.includes('?')) {
             fetchUrl = `${FILE_SERVER_BASE_URL}${full_url.startsWith('/') ? full_url.slice(1) : full_url}`;
          } else {
             fetchUrl = `${FILE_SERVER_BASE_URL}?path=${full_url}`;
          }
      }
  } else {
      // Logika Path biasa
      const params = new URLSearchParams();
      if (path) params.append('path', path);
      if (filename) params.append('filename', filename);
      fetchUrl = `${FILE_SERVER_BASE_URL}?${params.toString()}`;
  }


  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        ...(authHeader && { 'Authorization': authHeader }),
        'Accept': 'image/jpeg, image/png, image/gif, application/pdf',
      },
    });

    if (!response.ok) {
        console.error(`❌ Proxy Gagal (${response.status}): ${fetchUrl}`);
        return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    return new NextResponse(response.body, {
        status: 200,
        headers: {
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
            'Content-Length': response.headers.get('Content-Length') || '',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });

  } catch (error: any) {
    console.error('❌ Internal Error Proxy:', error.message);
    return new NextResponse(`Internal Proxy Error: ${error.message}`, { status: 500 });
  }
}