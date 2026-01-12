// app/api/notifications/all/[npp]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npp: string }> }
) {
  try {
    const { npp } = await params; // ✅ WAJIB await di Next 15

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);

    const notificationsApiUrl =
      `${process.env.GET_ALL_API_NOTIFIKASI}/${npp}`;

    const response = await fetch(notificationsApiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}
