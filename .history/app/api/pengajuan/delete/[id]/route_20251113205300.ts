// File: app/api/pengajuan/delete/[id]/route.ts
// Atau: pages/api/pengajuan/delete/[id].ts (jika menggunakan Pages Router)

import { NextRequest, NextResponse } from 'next/server';


export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id } = params;
        
        // Validasi ID
        if (!id || isNaN(Number(id))) {
            return NextResponse.json(
                { success: false, message: 'ID tidak valid' },
                { status: 400 }
            );
        }

        // Ambil token dari header Authorization
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token tidak ditemukan atau format salah' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); // Hapus 'Bearer '

        // Ambil URL dari environment variable
        const deleteApiUrl = process.env.DELETE_API_PENGAJUAN_URL;
        
        if (!deleteApiUrl) {
            console.error('DELETE_API_PENGAJUAN_URL tidak dikonfigurasi di .env');
            return NextResponse.json(
                { success: false, message: 'Konfigurasi API tidak lengkap' },
                { status: 500 }
            );
        }

        // Ganti {id} dengan ID yang sebenarnya
        const finalUrl = deleteApiUrl.replace('{id}', id);

        console.log(`[DELETE API] Menghapus data pengajuan ID: ${id}`);
        console.log(`[DELETE API] URL: ${finalUrl}`);

        // Kirim request DELETE ke external API
        const externalResponse = await fetch(finalUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true', // Untuk localtunnel
            },
        });

        // Baca response body
        let responseData: any;
        const contentType = externalResponse.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            responseData = await externalResponse.json();
        } else {
            const textResponse = await externalResponse.text();
            responseData = { message: textResponse || 'No response body' };
        }

        // Jika external API gagal
        if (!externalResponse.ok) {
            console.error(`[DELETE API] Gagal: Status ${externalResponse.status}`, responseData);
            
            return NextResponse.json(
                {
                    success: false,
                    message: responseData.message || `Gagal menghapus data (Status: ${externalResponse.status})`,
                    details: responseData
                },
                { status: externalResponse.status }
            );
        }

        // Berhasil
        console.log(`[DELETE API] Berhasil menghapus data pengajuan ID: ${id}`);
        
        return NextResponse.json({
            success: true,
            message: 'Data berhasil dihapus',
            data: responseData
        });

    } catch (error: any) {
        console.error('[DELETE API] Error:', error);
        
        return NextResponse.json(
            {
                success: false,
                message: 'Terjadi kesalahan saat menghapus data',
                error: error.message
            },
            { status: 500 }
        );
    }
}

// Untuk Pages Router (Alternative):
/*
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Hanya izinkan DELETE method
    if (req.method !== 'DELETE') {
        return res.status(405).json({ success: false, message: 'Method not allowed' });
    }

    try {
        const { id } = req.query;
        
        if (!id || typeof id !== 'string' || isNaN(Number(id))) {
            return res.status(400).json({ success: false, message: 'ID tidak valid' });
        }

        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ success: false, message: 'Token tidak ditemukan' });
        }

        const token = authHeader.substring(7);
        const deleteApiUrl = process.env.DELETE_API_PENGAJUAN_URL;
        
        if (!deleteApiUrl) {
            return res.status(500).json({ success: false, message: 'Konfigurasi API tidak lengkap' });
        }

        const finalUrl = deleteApiUrl.replace('{id}', id);

        const externalResponse = await fetch(finalUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true',
            },
        });

        const responseData = await externalResponse.json().catch(() => ({ message: 'No response' }));

        if (!externalResponse.ok) {
            return res.status(externalResponse.status).json({
                success: false,
                message: responseData.message || 'Gagal menghapus data',
                details: responseData
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Data berhasil dihapus',
            data: responseData
        });

    } catch (error: any) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Terjadi kesalahan',
            error: error.message
        });
    }
}
*/