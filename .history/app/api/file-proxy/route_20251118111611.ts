import { NextRequest } from 'next/server';

/**
 * Endpoint Proxy GET untuk meneruskan permintaan file/gambar (aset) eksternal
 * melalui server lokal, guna menghindari masalah CORS pada elemen <img>.
 * * Panggilan klien: /api/file-proxy?url=[URL_GAMBAR_EKSTERNAL]
 */
export async function GET(request: NextRequest) {
  const externalUrl = request.nextUrl.searchParams.get('url');
  
  if (!externalUrl) {
    return new Response('Missing external image URL parameter.', { status: 400 });
  }

  const authorizationHeader = request.headers.get('authorization');
  
  try {
    const apiResponse = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        ...(authorizationHeader && { 'Authorization': authorizationHeader }),
        // Menambahkan User-Agent standar
        'User-Agent': 'Node.js Proxy', 
      },
      // Cache response dari gambar selama 1 jam (bisa disesuaikan)
      cache: 'public, max-age=3600', 
    });

    if (!apiResponse.ok) {
      console.error(`Failed to fetch external file: ${apiResponse.status} for ${externalUrl}`);
      return new Response(`Failed to load external image: ${apiResponse.statusText}`, { status: apiResponse.status });
    }

    // Mengambil konten file (gambar) sebagai Buffer
    const arrayBuffer = await apiResponse.arrayBuffer();

    const contentType = apiResponse.headers.get('content-type') || 'image/jpeg';

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    console.error("File Proxy Network Error:", error);
    return new Response('Internal proxy error.', { status: 500 });
  }
}