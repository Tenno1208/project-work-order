import { NextRequest } from 'next/server';

const EXTERNAL_API_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/client/user/all-pegawai";

/**
 * Endpoint Proxy GET untuk mengambil data pegawai dari API eksternal 
 * tanpa menimbulkan error CORS di sisi klien.
 */
export async function GET(request: NextRequest) {
  const authorizationHeader = request.headers.get('authorization'); 

  if (!authorizationHeader) {
    return Response.json({ message: 'Authorization token is missing' }, { status: 401 });
  }

  try {
    const apiResponse = await fetch(EXTERNAL_API_URL, {
      method: 'GET',
      headers: {
        'Authorization': authorizationHeader, 
        'Content-Type': 'application/json',
      },
      cache: 'no-store', 
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      
      console.error(`External API returned status ${apiResponse.status}:`, errorText);

      return Response.json(
        { 
          message: `External API error: ${apiResponse.statusText}`, 
          detail: errorText // Mengirim seluruh body error dari server eksternal
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