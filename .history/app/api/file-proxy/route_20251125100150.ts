import { NextRequest } from 'next/server';
import https from 'https';

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

export async function GET(request: NextRequest) {
  const externalUrl = request.nextUrl.searchParams.get('url');
  
  if (!externalUrl) {
    return new Response('Missing external image URL parameter.', { status: 400 });
  }

  const authorizationHeader = request.headers.get('authorization');
  
  try {
    const apiResponse = await fetch(externalUrl, {
      method: 'GET',
      headers: {
        ...(authorizationHeader && { 'Authorization': authorizationHeader }),
        'User-Agent': 'Next.js Proxy',
      },
      agent: externalUrl.startsWith('https') ? httpsAgent : undefined,
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
      console.error(`Failed to fetch external file: ${apiResponse.status} for ${externalUrl}`);
      return new Response(`Failed to load external image: ${apiResponse.statusText}`, { status: apiResponse.status });
    }

    const arrayBuffer = await apiResponse.arrayBuffer();
    const contentType = apiResponse.headers.get('content-type') || 'image/jpeg';

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
      },
    });

  } catch (error: any) {
    console.error("File Proxy Network Error:", error);
    return new Response('Internal proxy error.', { status: 500 });
  }
}