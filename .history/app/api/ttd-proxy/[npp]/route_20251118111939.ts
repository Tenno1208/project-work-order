import { NextRequest } from 'next/server';

// Pastikan API_BASE_URL didefinisikan di environment variables Anda
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";

/**
 * Endpoint Proxy GET untuk mengambil riwayat TTD berdasarkan NPP.
 * Klien memanggil: /api/ttd-proxy/[npp]
 * Server meneruskan panggilan ke: GET_API_PENGAJUAN_TTD (misal: /api/user/ttd/{npp})
 */
export async function GET(request: NextRequest, { params }: { params: { npp: string } }) {
  const npp = params.npp;
  const token = request.headers.get('authorization'); 

  if (!token) {
    return Response.json({ message: 'Authorization token is missing' }, { status: 401 });
  }

  try {
    // Membangun URL eksternal menggunakan NPP dari params
    const externalUrl = `${API_BASE_URL}/api/user/ttd/${npp}`;
    
    const apiResponse = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
        // Mengembalikan error yang diterima dari server eksternal
        const errorText = await apiResponse.text();
        console.error(`External TTD API error (${apiResponse.status}):`, errorText);
        return Response.json(
          { message: `External TTD API error: ${apiResponse.statusText}`, detail: errorText }, 
          { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    return Response.json(data, { status: 200 });

  } catch (error) {
    console.error("TTD Proxy Network Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return Response.json({ message: 'Internal Server Error during TTD proxy operation', error: errorMessage }, { status: 500 });
  }
}