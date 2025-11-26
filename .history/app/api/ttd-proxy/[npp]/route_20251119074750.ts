import { NextRequest } from 'next/server';

// Pastikan API_BASE_URL didefinisikan di environment variables Anda
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";
// Asumsi API TTD eksternal mengembalikan JSON dengan field `ttd_url` atau array `data`
const EXTERNAL_TTD_API_PATH = "/api/user/ttd";

/**
 * Endpoint Proxy GET untuk mengambil TTD berdasarkan NPP, 
 * mengembalikan data gambar BUKAN JSON.
 * Klien memanggil: /api/ttd-proxy/[npp]
 */
export async function GET(request: NextRequest, { params }: { params: { npp: string } }) {
  const npp = params.npp;
  const token = request.headers.get('authorization');

  if (!token) {
    return new Response('Authorization token is missing', { status: 401 });
  }

  try {
    // 1. Ambil URL TTD dari API Eksternal (API ini mengembalikan JSON)
    const urlTtdFetcher = `${API_BASE_URL}${EXTERNAL_TTD_API_PATH}/${npp}`;

    const ttdUrlResponse = await fetch(urlTtdFetcher, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!ttdUrlResponse.ok) {
        // Log error dari API eksternal (jika 404/500)
        console.error(`External TTD API URL error (${ttdUrlResponse.status}):`, await ttdUrlResponse.text());
        return new Response('Failed to fetch TTD URL from external API.', { status: ttdUrlResponse.status });
    }

    const ttdData = await ttdUrlResponse.json();
    let ttdPath = null;
    
    // Logika adaptif untuk mengambil path TTD (disamakan dengan frontend)
    if (ttdData.ttd_url && typeof ttdData.ttd_url === 'string') {
        ttdPath = ttdData.ttd_url;
    } else if (ttdData.data && Array.isArray(ttdData.data) && ttdData.data.length > 0) {
        // Ambil TTD yang paling baru (yang pertama di array)
        ttdPath = ttdData.data[0].path || ttdData.data[0].url; 
    }

    if (!ttdPath) {
        return new Response('TTD path not found in external API response.', { status: 404 });
    }

    // Pastikan URL TTD adalah URL yang lengkap
    const finalTtdUrl = ttdPath.startsWith('http') ? ttdPath : `${API_BASE_URL}/${ttdPath.replace(/^\//, '')}`;


    // 2. Ambil konten gambar TTD (Data Gambar)
    const imageResponse = await fetch(finalTtdUrl, {
      headers: {
        // Penting: Sertakan token lagi jika API gambar juga butuh otorisasi
        // 'Authorization': token,
      },
      cache: 'no-store',
    });
    
    if (!imageResponse.ok) {
        console.error(`External TTD Image Fetch error (${imageResponse.status}):`, await imageResponse.text());
        return new Response('Failed to fetch TTD image content.', { status: 404 });
    }

    // 3. Mengembalikan respons dengan data gambar dan header yang sesuai
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    
    return new Response(imageResponse.body, { // Mengembalikan body stream (data gambar)
        status: 200,
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
        },
    });

  } catch (error) {
    console.error("TTD Proxy Network Error:", error);
    return new Response('Internal Server Error during TTD proxy operation', { status: 500 });
  }
}