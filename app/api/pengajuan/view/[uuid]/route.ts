import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti";

export async function GET(
  request: NextRequest,
  context: { params: { uuid: string } }
) {

  const { uuid } = await context.params;
  const authHeader = request.headers.get('authorization'); 
  
  try {
    const backendDetailUrl = `${API_BASE_URL}/api/pengajuan/view/${uuid}`;
    
    const backendResponse = await fetch(backendDetailUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { 'Authorization': authHeader }),
        "ngrok-skip-browser-warning": "69420",
      },
    });

    if (!backendResponse.ok) {
        const contentType = backendResponse.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
             console.error("Backend Error (HTML received):", await backendResponse.text());
             return NextResponse.json(
                 { message: "Terjadi kesalahan koneksi ke Backend (Ngrok/Server Error)." }, 
                 { status: 502 } 
             );
        }

        const errorData = await backendResponse.json().catch(() => ({ message: backendResponse.statusText }));
        return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: 200 });
    
  } catch (error) {
    console.error('Error proxying detail request to backend API:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error while fetching detail data.' }, { status: 500 });
  }
}