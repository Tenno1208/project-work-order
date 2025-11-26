import { NextRequest } from 'next/server';

const EXTERNAL_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/client/user/all-pegawai";

/**
 * Endpoint Proxy GET untuk mengambil data pegawai dari API eksternal 
 * tanpa menimbulkan error CORS di sisi klien.
 * Klien (SPKPage.jsx) memanggil: /api/pegawai-proxy/all-pegawai
 * Server (route.ts) meneruskan panggilan ke: EXTERNAL_API_URL
 */
export async function GET(request: NextRequest) {
  // 1. Ambil token dari header Authorization yang dikirim oleh klien
  let tokenWithBearer = request.headers.get('authorization'); 

  if (!tokenWithBearer) {
    return Response.json({ message: 'Authorization token is missing' }, { status: 401 });
  }

  // >>> PERUBAHAN: Hapus awalan 'Bearer ' jika ada. Kita kirimkan raw token saja, 
  // >>> atau bergantung pada server eksternal yang akan menanganinya.
  // >>> Ini mengatasi masalah jika API eksternal tidak menyukai format Bearer yang kita buat.
  let token = tokenWithBearer;
  if (token.toLowerCase().startsWith('bearer ')) {
    token = token.substring(7); // Ambil token murni setelah "Bearer "
  }
  
  // Pastikan token yang dikirim ke API eksternal berformat Bearer lagi, 
  // karena ini adalah format standar. Jika sebelumnya 500, mungkin token murni yang salah.
  // Kita kembalikan ke format Bearer penuh, tapi kita pastikan token dari klien sudah bersih.

  const finalAuthorizationHeader = tokenWithBearer; // Gunakan format penuh dari klien

  try {
    // 2. Panggil API eksternal dari sisi server
    const apiResponse = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        // Menggunakan header Authorization langsung dari klien (misal: "Bearer xyz...")
        'Authorization': finalAuthorizationHeader, 
        'Content-Type': 'application/json',
      },
      // Penting untuk memastikan data selalu baru dan tidak di-cache oleh Next.js atau CDN
      cache: 'no-store', 
    });

    // 3. Cek jika API eksternal gagal
    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      
      console.error(`External API returned status ${apiResponse.status}:`, errorText);

      // Mengembalikan status dan detail error yang sama dari API eksternal
      return Response.json(
        { 
          message: `External API error: ${apiResponse.statusText}`, 
          // Jika detail masih HTML 500, kita tampilkan pesan agar user tahu
          detail: errorText.length > 500 ? 'Error detail truncated (too long, possibly HTML error page)' : errorText 
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