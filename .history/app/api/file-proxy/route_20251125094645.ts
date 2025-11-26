import { NextRequest } from 'next/server';
import https from 'https'; // 1. Import modul https

// 2. Buat agent yang mengabaikan error sertifikat SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false, // Ini adalah kuncinya
});

/**
 * Endpoint Proxy GET untuk meneruskan permintaan file/gambar (aset) eksternal
 * melalui server lokal, guna menghindari masalah CORS pada elemen <img>.
 * Panggilan klien: /api/file-proxy?url=[URL_GAMBAR_EKSTERNAL]
 */
export async function GET(request: NextRequest) {
  const externalUrl = request.nextUrl.searchParams.get('url');

  if (!externalUrl) {
    return new Response('Missing external image URL parameter.', { status: 400 });
  }

  const authorizationHeader = request.headers.get('authorization');

  // 3. Tambahkan log untuk debugging
  console.log(`[File Proxy] Fetching URL: ${externalUrl}`);
  
  try {
    const apiResponse = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        ...(authorizationHeader && { 'Authorization': authorizationHeader }),
        'User-Agent': 'Next.js Proxy',
      },
      // 4. Gunakan agent ini untuk permintaan HTTPS
      agent: externalUrl.startsWith('https') ? httpsAgent : undefined,
      // Nonaktifkan cache sementara untuk memastikan Anda mendapatkan data terbaru
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
      console.error(`[File Proxy] Failed to fetch external file: ${apiResponse.status} ${apiResponse.statusText} for ${externalUrl}`);
      return new Response(`Failed to load external image: ${apiResponse.statusText}`, { status: apiResponse.status });
    }

    const arrayBuffer = await apiResponse.arrayBuffer();
    const contentType = apiResponse.headers.get('content-type') || 'image/jpeg';

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error: any) {
    // 5. Log error yang lebih detail
    console.error("[File Proxy] Network Error:", error.message);
    console.error(error); // Log seluruh objek error untuk trace stack
    return new Response(`Internal proxy error: ${error.message}`, { status: 500 });
  }
}