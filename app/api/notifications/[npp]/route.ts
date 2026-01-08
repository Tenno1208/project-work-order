import { NextRequest, NextResponse } from 'next/server';

const NGROK_API_URL = process.env.API_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti";

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/'); 
  const token = request.headers.get('Authorization');

  try {
    const res = await fetch(`${NGROK_API_URL}/api/notifications/${path}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Error in notifications proxy GET:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/'); 
  const token = request.headers.get('Authorization');
  let body;
  try {
    body = await request.json();
  } catch (e) {
    body = {};
  }

  try {
    const res = await fetch(`${NGROK_API_URL}/api/notifications/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': token }),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    console.error('Error in notifications proxy POST:', error);
    return NextResponse.json({ success: false, message: 'Internal Server Error' }, { status: 500 });
  }
}