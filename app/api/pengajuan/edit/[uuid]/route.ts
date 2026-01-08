import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    const { uuid } = await params;
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token tidak ditemukan' },
        { status: 401 }
      );
    }

    const body = await request.json();
        const apiUrl = `${process.env.EDIT_API_PENGAJUAN_URL?.replace('{uuid}', uuid)}`;
    
    console.log('Sending request to:', apiUrl);
    console.log('Request body:', JSON.stringify(body, null, 2));
    
    // Kirim request ke API eksternal
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    const responseText = await response.text();
    console.log('Response body:', responseText);

    // Dapatkan content-type dari response API eksternal
    const contentType = response.headers.get('content-type') || '';

    // Jika response adalah JSON, parse dan teruskan dengan format yang sama
    if (contentType.includes('application/json')) {
      try {
        const jsonData = JSON.parse(responseText);
        
        // Teruskan response JSON asli dengan status yang sama
        return new NextResponse(JSON.stringify(jsonData), {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        return NextResponse.json(
          { success: false, message: 'Response dari API eksternal bukan format JSON yang valid' },
          { status: 500 }
        );
      }
    }
    
    // Jika response bukan JSON (HTML, text, dll), teruskan apa adanya
    return new NextResponse(responseText, {
      status: response.status,
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error) {
    console.error('Error updating pengajuan:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan server' },
      { status: 500 }
    );
  }
}