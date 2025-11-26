import { NextRequest, NextResponse } from 'next/server';
import https from 'https';

// Buat agent yang mengabaikan error sertifikat SSL
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { npp, ttd_url } = body;

    if (!npp || !ttd_url) {
      return NextResponse.json(
        { error: 'Parameter npp dan ttd_url diperlukan.' },
        { status: 400 }
      );
    }

    const authorizationHeader = request.headers.get('authorization');
    if (!authorizationHeader) {
        return NextResponse.json(
            { error: 'Header otorisasi diperlukan.' },
            { status: 401 }
        );
    }

    const externalApiUrl = `${process.env.API_BASE_URL}/api/user/delete/ttd`;
    
    console.log(`[TTD Delete Proxy] Meneruskan permintaan hapus ke: ${externalApiUrl}`);

    const apiResponse = await fetch(externalApiUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authorizationHeader,
      },
      body: JSON.stringify({ npp, ttd_url }),
      // Gunakan agent untuk permintaan HTTPS agar mengabaikan error SSL
      agent: externalApiUrl.startsWith('https') ? httpsAgent : undefined,
    });

    const responseData = await apiResponse.json();

    if (!apiResponse.ok) {
        console.error(`[TTD Delete Proxy] Gagal menghapus TTD: ${apiResponse.status} ${responseData.message}`);
        return NextResponse.json(
            { error: responseData.message || 'Gagal menghapus TTD di server utama.' },
            { status: apiResponse.status }
        );
    }

    console.log('[TTD Delete Proxy] Berhasil menghapus TTD.');
    return NextResponse.json(responseData, { status: 200 });

  } catch (error: any) {
    console.error('[TTD Delete Proxy] Terjadi error internal server:', error);
    return NextResponse.json(
      { error: 'Terjadi kesalahan internal server', details: error.message },
      { status: 500 }
    );
  }
}