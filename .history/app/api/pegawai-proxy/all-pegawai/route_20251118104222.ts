import { NextRequest } from 'next/server';

const EXTERNAL_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/client/user/all-pegawai";

/**
 * Endpoint Proxy GET untuk mengambil data pegawai dari API eksternal 
 * tanpa menimbulkan error CORS di sisi klien.
 * Klien (SPKPage.jsx) memanggil: /api/pegawai-proxy/all-pegawai
 * Server (route.ts) meneruskan panggilan ke: EXTERNAL_API_URL
 */
export async function GET(request: NextRequest) {
  // 1. Ambil token dari header Authorization
  let token = request.headers.get('authorization'); 

  if (!token) {
    return Response.json({ message: 'Authorization token is missing' }, { status: 401 });
  }

  // PERBAIKAN KRITIS: Memastikan token memiliki format "Bearer [token]"
  // Header dari klien mungkin sudah "Bearer...", tapi jika tidak, kita tambahkan.
  // Jika klien mengirimkan "Bearer xyz", kita gunakan itu. Jika hanya "xyz", kita tambahkan "Bearer ".
  if (!token.toLowerCase().startsWith('bearer ')) {
    token = `Bearer ${token}`;
  }

  try {
    // 2. Panggil API eksternal dari sisi server
    const apiResponse = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': token, // Menggunakan token yang sudah dipastikan berformat "Bearer "
        'Content-Type': 'application/json',
      },
      // Penting untuk memastikan data selalu baru dan tidak di-cache oleh Next.js atau CDN
      cache: 'no-store', 
    });

    // 3. Cek jika API eksternal gagal
    if (!apiResponse.ok) {
      // Perbaikan: Mencoba membaca body respons sebagai teks (termasuk HTML error 500)
      const errorText = await apiResponse.text();
      
      // Log error di server console untuk debugging
      console.error(`External API returned status ${apiResponse.status}:`, errorText);

      // Mengembalikan status dan detail error yang sama dari API eksternal
      return Response.json(
        { 
          message: `External API error: ${apiResponse.statusText}`, 
          detail: errorText.length > 500 ? 'Error detail truncated (too long)' : errorText 
        },
        { status: apiResponse.status }
      );
    }

    // 4. Ambil data dan kirim kembali ke klien
    const data = await apiResponse.json();
    
    // 5. Sukses: Kirim status 200 dan data ke klien
    return Response.json(data, { status: 200 });

  } catch (error) {
    // Menangkap error jaringan (misalnya DNS error, connection refused)
    console.error("Proxy Network or Internal Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    
    return Response.json(
      { message: 'Proxy failed to connect to external API', error: errorMessage }, 
      { status: 500 }
    );
  }
}