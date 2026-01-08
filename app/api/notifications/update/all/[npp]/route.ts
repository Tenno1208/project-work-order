// app/api/notifications/update/all/[npp]/route.ts
import { NextResponse } from 'next/server';

export async function PUT(request: Request, { params }: { params: { npp: string } }) {
  try {
    const { npp } = params;

    // 1. Cek Token Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.substring(7);

    // 2. Ambil URL dari ENV
    let apiUrl = process.env.UPDATE_ALL_NOTIFIKASI_READ;

    if (!apiUrl) {
        throw new Error("Env Variable UPDATE_ALL_NOTIFIKASI_READ belum diset");
    }

    if (apiUrl.includes('{npp}')) {
        apiUrl = apiUrl.replace('{npp}', npp);
    } else {
  
        apiUrl = `${apiUrl.replace(/\/$/, "")}/${npp}`;
    }

    console.log('Marking ALL read at URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'PUT', 
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
       const errorText = await response.text();
       console.error(`Backend Error (${response.status}):`, errorText);
       throw new Error(`Gagal update status notifikasi: ${response.statusText}`);
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