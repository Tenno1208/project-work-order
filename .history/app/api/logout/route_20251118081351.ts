import type { NextApiRequest, NextApiResponse } from 'next';

const EXTERNAL_LOGOUT_URL = "https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/logout";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const token = req.headers.authorization;
        
        if (!token) {
            return res.status(401).json({ message: 'Token not provided' });
        }

        try {
            const externalRes = await fetch(EXTERNAL_LOGOUT_URL, {
                method: 'POST',
                headers: {
                    'Authorization': token, // Teruskan token dari client
                    'Content-Type': 'application/json',
                },
            });

            // Teruskan status dan data dari API eksternal
            const data = await externalRes.json().catch(() => ({}));
            return res.status(externalRes.status).json(data);

        } catch (error) {
            console.error("External API Error:", error);
            return res.status(500).json({ message: 'Failed to reach external API' });
        }
    } else {
        // Hanya izinkan metode POST
        res.setHeader('Allow', ['POST']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}