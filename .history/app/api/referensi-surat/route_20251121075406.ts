// pages/api/referensi-surat.ts

const EXTERNAL_API_URL = process.env.API_BASE_URL + "/api/pengajuan/rferensi/surat";

export default async function handler(req: any, res: any) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    // Ambil token dari header request frontend (yang diteruskan oleh fetch)
    const authorizationHeader = req.headers.authorization;
    if (!authorizationHeader) {
        return res.status(401).json({ success: false, message: 'Authorization header missing' });
    }

    try {
        // Teruskan permintaan ke API eksternal
        const externalResponse = await fetch(EXTERNAL_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': authorizationHeader, // Teruskan token
                'Content-Type': 'application/json',
            },
        });

        const data = await externalResponse.json();

        // Teruskan status dan data dari API eksternal kembali ke frontend
        res.status(externalResponse.status).json(data);

    } catch (error) {
        console.error('Error fetching external reference letters API:', error);
        res.status(500).json({ success: false, message: 'Internal Server Error fetching reference letters' });
    }
}