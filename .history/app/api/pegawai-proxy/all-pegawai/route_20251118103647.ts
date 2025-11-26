import { NextRequest } from 'next/server';

const EXTERNAL_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/client/user/all-pegawai";

/**
 * Endpoint Proxy GET untuk mengambil data pegawai dari API eksternal 
 * tanpa menimbulkan error CORS di sisi klien.
 * * Klien (SPKPage.jsx) akan memanggil: /api/pegawai-proxy/all-pegawai
 * Server (Route.ts) akan meneruskan panggilan ke: EXTERNAL_API_URL
 */
export async function GET(request: NextRequest) {
  // 1. Ambil token dari header Authorization
  const token = request.headers.get('authorization'); 

  if (!token) {
    // Mengembalikan response JSON dengan status 401
    return Response.json({ message: 'Authorization token is missing' }, { status: 401 });
  }

  try {
    // 2. Panggil API eksternal dari sisi server
    const apiResponse = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': token, // Meneruskan token ke API eksternal
        'Content-Type': 'application/json',
      },
      // Penting untuk memastikan data selalu baru dan tidak di-cache oleh Next.js atau CDN
      cache: 'no-store', 
    });

    // 3. Cek jika API eksternal gagal
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      // Mengembalikan status yang sama dari API eksternal (e.g., 404, 500)
      return Response.json(
        { message: `External API error: ${apiResponse.statusText}`, detail: errorText },
        { status: apiResponse.status }
      );
    }

    // 4. Ambil data dan kirim kembali ke klien
    const data = await apiResponse.json();
    
    // 5. Sukses: Kirim status 200 dan data ke klien
    return Response.json(data, { status: 200 });

  } catch (error) {
    console.error("Proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return Response.json({ message: 'Internal Server Error during proxy operation', error: errorMessage }, { status: 500 });
  }
}