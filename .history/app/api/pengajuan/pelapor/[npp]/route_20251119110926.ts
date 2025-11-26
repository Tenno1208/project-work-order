// app/api/pengajuan/pelapor/[npp]/route.ts

import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(request: NextRequest, { params }: { params: { npp: string } }) {
  const { npp } = params; // Ambil NPP dari dynamic path segment
  const token = request.headers.get('Authorization'); // Ambil token dari header klien

  if (!API_BASE_URL) {
    return new NextResponse('Internal Server Error: API_BASE_URL is not set.', { status: 500 });
  }

  if (!token) {
    return new NextResponse('Unauthorized: Token not provided.', { status: 401 });
  }

  const externalUrl = `${API_BASE_URL}/api/pengajuan/pelapor/${npp}`;

  try {
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Teruskan Token Otorisasi ke API Backend
        'Authorization': token, 
      },
      // Cache handler jika diperlukan
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      return NextResponse.json(errorData, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error proxying request:', error);
    return new NextResponse('Internal Server Error while fetching external API.', { status: 500 });
  }
}