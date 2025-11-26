// pages/api/spk/riwayat-staff/[npp].ts atau app/api/spk/riwayat-staff/[npp]/route.ts

import { NextApiRequest, NextApiResponse } from 'next';

// Ambil URL dari Environment Variables Anda
const API_BASE_URL = process.env.API_BASE_URL;
const GET_API_SPK_RIWAYAT_STAF = `${API_BASE_URL}/api/spk/staf`; // Tanpa {npp}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Ambil NPP dari parameter URL
    const { npp } = req.query;

    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    if (!npp || Array.isArray(npp)) {
        return res.status(400).json({ message: 'NPP parameter is required' });
    }

    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized: Token missing' });
    }

    try {
        // Panggil API eksternal dengan NPP yang didapat
        const externalApiUrl = `${GET_API_SPK_RIWAYAT_STAF}/${npp}`;

        const apiResponse = await fetch(externalApiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
                // Tambahkan headers lain yang dibutuhkan oleh API eksternal
            },
        });

        const data = await apiResponse.json();

        // Kirim response dari API eksternal kembali ke client
        return res.status(apiResponse.status).json(data);

    } catch (error) {
        console.error('Error fetching staff SPK history:', error);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
}