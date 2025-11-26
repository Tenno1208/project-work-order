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

  // Mengambil token Authorization dari klien (jika ada, untuk diteruskan)
  const authorizationHeader = request.headers.get('authorization');
  
  try {
    // Panggil URL gambar eksternal dari sisi server
    const apiResponse = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        // Meneruskan token (jika ada, untuk otorisasi aset)
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

    // Mengembalikan respons dengan Content-Type yang benar (diambil dari header sumber)
    // Ini PENTING agar browser tahu bahwa ini adalah gambar, bukan JSON.
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