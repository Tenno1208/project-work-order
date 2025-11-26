import { NextRequest } from 'next/server';

// Pastikan API_BASE_URL didefinisikan di environment variables Anda
const API_BASE_URL = process.env.API_BASE_URL || "https://workorder123.loca.lt";
// Path ke API eksternal yang mengembalikan daftar TTD (dalam bentuk JSON)
const EXTERNAL_TTD_API_PATH = "/api/user/ttd";

/**
 * Endpoint Proxy GET untuk mengambil riwayat TTD (URL TTD) berdasarkan NPP.
 * API ini sekarang mengembalikan JSON dari API eksternal.
 * Klien memanggil: /api/ttd-proxy/[npp]
 */
export async function GET(request: NextRequest, { params }: { params: { npp: string } }) {
  const npp = params.npp;
  const token = request.headers.get('authorization');

  if (!token) {
    return Response.json({ message: 'Authorization token is missing' }, { status: 401 });
  }

  try {
    // Membangun URL eksternal menggunakan NPP dari params
    const externalUrl = `${API_BASE_URL}${EXTERNAL_TTD_API_PATH}/${npp}`;
    
    // Melakukan fetch ke API eksternal untuk mendapatkan JSON (riwayat TTD)
    const apiResponse = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
        const errorText = await apiResponse.text();
        console.error(`External TTD API error (${apiResponse.status}):`, errorText);
        return Response.json(
          { message: `External TTD API error: ${apiResponse.statusText}`, detail: errorText }, 
          { status: apiResponse.status }
        );
    }

    const data = await apiResponse.json();
    // Mengembalikan respons JSON DARI API EKSTERNAL langsung ke frontend
    return Response.json(data, { status: 200 });

  } catch (error) {
    console.error("TTD Proxy Network Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return Response.json({ message: 'Internal Server Error during TTD proxy operation', error: errorMessage }, { status: 500 });
  }
}