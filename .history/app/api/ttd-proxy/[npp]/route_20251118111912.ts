import { NextRequest } from 'next/server';

// Pastikan API_BASE_URL didefinisikan di environment variables Anda
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";

/**
 * Endpoint Proxy TTD yang sekarang berfungsi sebagai PROXY FILE GAMBAR.
 * Klien (LampiranPengajuanPage.jsx) harus memanggil proxy ini dengan URL gambar
 * sebagai query parameter, BUKAN hanya NPP.
 * * Contoh Panggilan: /api/ttd-proxy/[npp]?ttd_url=[URL_GAMBAR_PDAM]
 */
export async function GET(request: NextRequest, { params }: { params: { npp: string } }) {
  // 1. Ambil token dari header Authorization
  const token = request.headers.get('authorization'); 
  const ttdUrl = request.nextUrl.searchParams.get('ttd_url'); // Ambil URL gambar PDAM dari query
  
  if (!token) {
    return new Response('Authorization token is missing.', { status: 401 });
  }

  // Jika dipanggil tanpa URL spesifik, kembalikan error.
  if (!ttdUrl) {
       return new Response('TTD URL parameter is missing. This endpoint now serves image assets.', { status: 400 });
  }

  try {
    // URL yang harus dipanggil adalah URL GAMBAR PDAM yang dikirim dari klien.
    const apiResponse = await fetch(ttdUrl, { 
      method: 'GET',
      headers: {
        'Authorization': token, // Meneruskan token ke API PDAM (untuk otorisasi file)
        'User-Agent': 'NextJS/Proxy/TTD',
      },
      cache: 'no-store', // File TTD mungkin sensitif
    });

    if (!apiResponse.ok) {
      // Jika API PDAM gagal mengembalikan file gambar
      return new Response(`Failed to load TTD image: ${apiResponse.statusText}`, { status: apiResponse.status });
    }

    // Mengambil konten file (gambar) sebagai ArrayBuffer
    const arrayBuffer = await apiResponse.arrayBuffer();

    // Mengambil Content-Type, ini KRITIS agar browser tahu respons ini adalah gambar
    const contentType = apiResponse.headers.get('content-type') || 'image/png';

    // 2. Mengembalikan respons file gambar (bukan JSON)
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Memungkinkan browser mengakses gambar (penting untuk production environment)
        'Access-Control-Allow-Origin': '*', 
      },
    });

  } catch (error) {
    console.error("TTD Image Proxy Error:", error);
    return new Response('Internal proxy error while fetching image.', { status: 500 });
  }
}