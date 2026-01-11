import { NextRequest, NextResponse } from 'next/server';

const NGROK_API_URL = (process.env.API_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti").replace(/\/$/, '');

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npp = searchParams.get('npp');
  const token = searchParams.get('token');

  if (!npp || !token) {
    return new Response('NPP dan token diperlukan', { status: 400 });
  }

  let intervalId: NodeJS.Timer;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const fetchNotifications = async () => {
        try {
          const res = await fetch(`${NGROK_API_URL}/api/notifications/${npp}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const data = await res.json();
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
          } else {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: `HTTP ${res.status}` })}\n\n`));
          }
        } catch (err) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Gagal mengambil notifikasi' })}\n\n`));
        }
      };

      // Kirim data awal
      await fetchNotifications();

      // Interval untuk fetch setiap 5 detik
      intervalId = setInterval(fetchNotifications, 5000);
    },

    cancel() {
      // Bersihkan interval jika client disconnect
      if (intervalId) clearInterval(intervalId);
      console.log('[SSE] Client disconnected, interval cleared.');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Authorization',
    },
  });
}
