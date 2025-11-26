import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } } 
) {
    try {
        const uuid = params.id; // Gunakan 'id' dari params sebagai UUID
        
        if (!uuid) {
            return NextResponse.json(
                { success: false, message: 'ID (UUID) tidak ditemukan dalam parameter URL.' },
                { status: 400 }
            );
        }

        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token otorisasi tidak ditemukan atau format salah' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); 

        const deleteApiUrl = process.env.DELETE_API_PENGAJUAN_URL; 
        
        if (!deleteApiUrl) {
            console.error('DELETE_API_PENGAJUAN_URL tidak dikonfigurasi di .env');
            return NextResponse.json(
                { success: false, message: 'Konfigurasi API tidak lengkap (Environment Variable Hilang)' },
                { status: 500 }
            );
        }

        const finalUrl = deleteApiUrl.replace('{uuid}', uuid);

        console.log(`[DELETE API] Menghapus data pengajuan ID: ${uuid}`);
        console.log(`[DELETE API] URL Eksternal yang Dipanggil: ${finalUrl}`);

        // 4. Kirim request DELETE ke external API
        const externalResponse = await fetch(finalUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true', 
            },
            // body: JSON.stringify({ uuid: uuid }),
            // // -----------------------------------------------------------
        });

        let responseData: any = { success: false, message: "Kesalahan internal: Respons external API tidak valid." };
        const contentType = externalResponse.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
            try {
                responseData = await externalResponse.json();
            } catch (e) {
                console.error('[DELETE API] Gagal parse JSON dari External API:', e);
                responseData = { success: false, message: `Gagal memproses JSON dari External API. Status: ${externalResponse.status}` };
            }
        } else {
            const textResponse = await externalResponse.text();
            
            responseData.message = `Respons non-JSON dari External API (Status ${externalResponse.status}): ${textResponse.substring(0, 100)}...`;
            responseData.details = textResponse; 
        }

        if (!externalResponse.ok || !responseData.success) { // Tambahkan cek responseData.success
            console.error(`[DELETE API] Gagal: Status ${externalResponse.status}`, responseData);
            
            return NextResponse.json(
                {
                    success: false,
                    message: responseData.message || `Gagal menghapus data (Status: ${externalResponse.status})`,
                    details: responseData.details 
                },
                { status: externalResponse.status }
            );
        }

        // 7. Berhasil
        console.log(`[DELETE API] Berhasil menghapus data pengajuan ID: ${uuid}`);
        
        return NextResponse.json({
            success: true,
            message: responseData.message || 'Data berhasil dihapus oleh External API',
            data: responseData
        });

    } catch (error: any) {
        console.error('[DELETE API] Error tak terduga:', error);
        
        return NextResponse.json(
            {
                success: false,
                message: 'Terjadi kesalahan internal tak terduga saat menghapus data',
                error: error.message
            },
            { status: 500 }
        );
    }
}