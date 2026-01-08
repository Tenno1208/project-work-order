import { NextRequest } from 'next/server';

const NGROK_API_URL = process.env.API_BASE_URL || "https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti/api/";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const npp = searchParams.get('npp');
  const token = searchParams.get('token');
  
  if (!npp || !token) {
    return new Response('NPP dan token diperlukan', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Kirim pesan koneksi awal
      controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ connected: true })}\n\n`));
      
      // Fungsi untuk mengambil dan mengirim notifikasi
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
            
            // Kirim data sebagai SSE
            const eventData = `data: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventData));
          } else {
            // Kirim pesan error
            const errorMessage = `data: ${JSON.stringify({ error: `HTTP error! status: ${res.status}` })}\n\n`;
            controller.enqueue(new TextEncoder().encode(errorMessage));
          }
        } catch (error) {
          console.error('Error fetching notifications:', error);
          // Kirim pesan error
          const errorMessage = `data: ${JSON.stringify({ error: 'Gagal mengambil notifikasi' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorMessage));
        }
      };

      // Ambil data awal
      fetchNotifications();
      
      const intervalId = setInterval(fetchNotifications, 5000);
      
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    },
  });

  // Return stream dengan headers yang tepat untuk SSE
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}