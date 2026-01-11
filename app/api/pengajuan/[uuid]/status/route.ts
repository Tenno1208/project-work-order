import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  'https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti';

export async function PUT(
  request: NextRequest,
  context: { params: { uuid: string } }
) {
  const { uuid } = await context.params; // ✅ FIX UTAMA

  const authHeader = request.headers.get('authorization');

  let body;
  try {
    body = await request.json();
    if (!body || typeof body.status !== 'string') {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid body format. Status field is required.',
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, message: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  try {
    const backendUpdateUrl =
      `${API_BASE_URL}/api/pengajuan/${uuid}/status`;

    const backendResponse = await fetch(backendUpdateUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
        'bypass-tunnel-reminder': 'true',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse
        .json()
        .catch(() => ({ message: backendResponse.statusText }));

      return NextResponse.json(errorData, {
        status: backendResponse.status,
      });
    }

    const data = await backendResponse.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Error proxying request to backend API:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal Server Error while updating status.',
      },
      { status: 500 }
    );
  }
}
