// app/api/notifications/update/all/[npp]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  context: { params: { npp: string } }
) {
  try {
    const { npp } = await context.params; 

    // 1. Cek Token Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);

    let apiUrl = process.env.UPDATE_ALL_NOTIFIKASI_READ;

    if (!apiUrl) {
      throw new Error('Env Variable UPDATE_ALL_NOTIFIKASI_READ belum diset');
    }

    if (apiUrl.includes('{npp}')) {
      apiUrl = apiUrl.replace('{npp}', npp);
    } else {
      apiUrl = `${apiUrl.replace(/\/$/, '')}/${npp}`;
    }

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: 'Gagal update status notifikasi',
          detail: errorText,
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
