import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const npp = searchParams.get('npp');

  if (!npp) {
    return NextResponse.json({ success: false, message: 'Parameter NPP diperlukan' }, { status: 400 });
  }

  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    console.error("❌ Proxy Error: Header Authorization KOSONG dari Frontend.");
    return NextResponse.json({ success: false, message: 'Header Authorization hilang' }, { status: 401 });
  } else {
    console.log(`✅ Proxy: Menerima token: ${authHeader.substring(0, 15)}...`);
  }

  try {
    const externalApiUrl = `https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/api/user/supervisor-of?npp=${npp}`;
    
    const res = await fetch(externalApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,    
        'Content-Type': 'application/json',
        'Accept': 'application/json',     
      },
    });

    if (!res.ok) {
      console.error(`❌ Gateway Error (${res.status}): Token mungkin tidak valid untuk server gateway.`);
      const errorText = await res.text();
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized dari Gateway', 
        gateway_response: errorText 
      }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('❌ Internal Server Error:', error);
    return NextResponse.json({ success: false, message: 'Terjadi kesalahan internal server' }, { status: 500 });
  }
}