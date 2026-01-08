// app/api/notifications/all/[npp]/route.ts
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const { npp } = params;
    
    // Ambil token dari header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const token = authHeader.substring(7);
    
    // URL API eksternal dari env
    const notificationsApiUrl = `${process.env.GET_ALL_API_NOTIFIKASI}/${npp}`;
    
    console.log('Fetching all notifications from:', notificationsApiUrl);
    
    // Kirim request ke API eksternal
    const response = await fetch(notificationsApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch notifications: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('All notifications data received:', data);
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching all notifications:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}