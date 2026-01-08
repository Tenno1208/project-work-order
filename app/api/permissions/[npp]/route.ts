import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.API_BASE_URL;

interface Params {
  npp: string;
}

export async function GET(
  req: NextRequest,
  context: { params: Params } 
) {
  const npp = context.params.npp;
  const authorizationHeader = req.headers.get('authorization');

  if (!authorizationHeader || !API_BASE_URL) {
    return NextResponse.json(
      { message: 'Authorization token or API Base URL not found' },
      { status: 401 }
    );
  }

  if (!npp) {
      return NextResponse.json(
          { message: 'NPP is required.' }, 
          { status: 400 }
      );
  }
  
  const permissionsApiUrl = `${API_BASE_URL}/api/workorder/permissions/${npp}`; 
  console.log("Proxying request to:", permissionsApiUrl);

  try {
    const apiRes = await fetch(permissionsApiUrl, {
      method: 'GET',
      headers: {
        'Authorization': authorizationHeader, 
        'Content-Type': 'application/json',
      },
    });

    if (!apiRes.ok) {
        console.error("External API error:", apiRes.status);
        let errorBody;
        try {
            errorBody = await apiRes.json();
        } catch (e) {
            errorBody = { message: `External API returned status ${apiRes.status}` };
        }
        return NextResponse.json(errorBody, { status: apiRes.status });
    }

    const data = await apiRes.json();
    return NextResponse.json(data, { status: 200 });

  } catch (error) {
    console.error('Error fetching permissions via proxy (NETWORK FAILURE):', error);
    return NextResponse.json(
      { message: 'Failed to connect to external API for permissions.' },
      { status: 500 }
    );
  }
}