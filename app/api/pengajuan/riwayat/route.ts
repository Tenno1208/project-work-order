import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

export async function GET(request: NextRequest) {
  const token = request.headers.get('Authorization');

  if (!API_BASE_URL) {
    return NextResponse.json({ success: false, message: "API_BASE_URL is not set." }, { status: 500 });
  }

  if (!token) {
    return NextResponse.json({ success: false, message: "Token tidak ditemukan." }, { status: 401 });
  }

  const externalUrl = `${API_BASE_URL}/api/pengajuan/riwayat`;

  try {
    const response = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
      }
    });

    if (response.status === 404) {
      return NextResponse.json(
        { success: false, message: "Tidak ada riwayat pengajuan" },
        { status: 404 }
      );
    }

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ success: false, message: errText }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 200 });

  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}