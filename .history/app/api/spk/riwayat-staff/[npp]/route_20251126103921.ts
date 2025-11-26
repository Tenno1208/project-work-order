// File: pages/api/spk/riwayat-staff/[npp].ts

import { NextApiRequest, NextApiResponse } from 'next';

const API_BASE_URL = process.env.API_BASE_URL;
// Pastikan API eksternal yang dipanggil HANYA BASE URL tanpa NPP di akhir
const GET_API_SPK_RIWAYAT_STAF = `${API_BASE_URL}/api/spk/staf`; 

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // 1. Ambil parameter NPP dari path dinamis
    const { npp } = req.query;

    // 2. Cek Metode HTTP (Ini yang mengatasi error 405)
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed', error_location: 'Next.js API Handler' });
    }

    if (!npp || Array.isArray(npp)) {
        return res.status(400).json({ message: 'NPP parameter is required' });
    }

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token missing' });
    }

    try {
        // Panggil API eksternal dengan NPP sebagai path parameter
        const externalApiUrl = `${GET_API_SPK_RIWAYAT_STAF}/${npp}`;

        console.log(`[Proxy] Fetching SPK data for NPP: ${npp} from ${externalApiUrl}`);
        
        const apiResponse = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
        });

        const data = await apiResponse.json();

        // Mengembalikan status asli dari API eksternal
        return res.status(apiResponse.status).json(data);

    } catch (error) {
        console.error('Error fetching staff SPK history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}