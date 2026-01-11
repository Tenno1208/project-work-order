import { NextRequest } from 'next/server';

const API_BASE_URL =
  process.env.API_BASE_URL ||
  'https://gateway.pdamkotasmg.co.id/api-gw/workorder-pti';

const EXTERNAL_TTD_API_PATH = '/api/user/ttd';

export async function GET(
  request: NextRequest,
  context: { params: { npp: string } }
) {
  const { npp } = await context.params; 
  const token = request.headers.get('authorization');

  if (!token) {
    return Response.json(
      { message: 'Authorization token is missing' },
      { status: 401 }
    );
  }

  try {
    const externalUrl = `${API_BASE_URL}${EXTERNAL_TTD_API_PATH}/${npp}`;

    const apiResponse = await fetch(externalUrl, {
      headers: {
        Authorization: token,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      return Response.json(
        {
          message: 'External TTD API error',
          detail: errorText,
        },
        { status: apiResponse.status }
      );
    }

    const data = await apiResponse.json();
    return Response.json(data);
  } catch (error) {
    return Response.json(
      { message: 'Internal Server Error', error },
      { status: 500 }
    );
  }
}
