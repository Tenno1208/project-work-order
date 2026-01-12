import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  'https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ npp: string }> }
) {
  const { npp } = await params; 
  const token = request.headers.get('authorization');

  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${npp}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ npp: string }> }
) {
  const { npp } = await params; 
  const token = request.headers.get('authorization');
  const body = await request.json().catch(() => ({}));

  try {
    const res = await fetch(`${API_BASE_URL}/api/notifications/${npp}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: token }),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
