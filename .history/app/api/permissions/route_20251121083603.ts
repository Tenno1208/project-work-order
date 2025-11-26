// app/api/permissions/route.ts

const EXTERNAL_PERMISSIONS_URL = process.env.API_BASE_URL + "/api/workorder/permissions";

export async function GET(request: Request) {
    const authorizationHeader = request.headers.get('authorization');

    if (!authorizationHeader) {
        return new Response(JSON.stringify({ success: false, message: 'Unauthorized' }), { status: 401 });
    }

    try {
        const externalResponse = await fetch(EXTERNAL_PERMISSIONS_URL, {
            method: 'GET',
            headers: {
                'Authorization': authorizationHeader, // Meneruskan token
                'Content-Type': 'application/json',
            },
            cache: 'no-store'
        });

        const data = await externalResponse.json();

        return new Response(JSON.stringify(data), {
            status: externalResponse.status,
            headers: { 'Content-Type': 'application/json' },
        });

    } catch (error) {
        console.error('Error in permissions proxy:', error);
        return new Response(JSON.stringify({ success: false, message: 'Internal Server Error' }), { status: 500 });
    }
}