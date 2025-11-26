import { NextRequest, NextResponse } from 'next/server';

export async function DELETE(
    request: NextRequest,
    // Nama folder dinamis [id] akan dipetakan ke params.id
    { params }: { params: { id: string } } 
) {
    try {
        const { id } = params;
        
        // 1. Validasi ID (id adalah string karena berasal dari URL path)
        if (!id) {
            return NextResponse.json(
                { success: false, message: 'ID (UUID) tidak ditemukan dalam parameter' },
                { status: 400 }
            );
        }

        // 2. Ambil token dari header Authorization
        const authHeader = request.headers.get('authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json(
                { success: false, message: 'Token otorisasi tidak ditemukan atau format salah' },
                { status: 401 }
            );
        }

        const token = authHeader.substring(7); 

        // 3. Ambil dan siapkan URL eksternal
        const deleteApiUrl = process.env.DELETE_API_PENGAJUAN_URL; // Isi: .../pengajuan/delete/{uuid}
        
        if (!deleteApiUrl) {
            console.error('DELETE_API_PENGAJUAN_URL tidak dikonfigurasi di .env');
            return NextResponse.json(
                { success: false, message: 'Konfigurasi API tidak lengkap (Environment Variable Hilang)' },
                { status: 500 }
            );
        }

        // Mengganti placeholder {uuid} dengan nilai ID yang didapat dari Next.js params
        // Perhatikan: Walaupun Anda mengirim ID numerik (misalnya '21'), parameter di API eksternal
        // menggunakan nama '{uuid}', jadi kita ikuti pola ini.
        const finalUrl = deleteApiUrl.replace('{uuid}', id);

        console.log(`[DELETE API] Menghapus data pengajuan ID: ${id}`);
        console.log(`[DELETE API] URL Eksternal yang Dipanggil: ${finalUrl}`);

        // 4. Kirim request DELETE ke external API
        const externalResponse = await fetch(finalUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'bypass-tunnel-reminder': 'true', 
            },
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

        // 6. Jika external API gagal (status 4xx atau 5xx)
        if (!externalResponse.ok) {
            console.error(`[DELETE API] Gagal: Status ${externalResponse.status}`, responseData);
            
            // Kembalikan error yang lebih spesifik ke klien
            return NextResponse.json(
                {
                    success: false,
                    message: responseData.message || `Gagal menghapus data (Status: ${externalResponse.status})`,
                    details: responseData.details // Sertakan detail jika ada
                },
                { status: externalResponse.status }
            );
        }

        // 7. Berhasil
        console.log(`[DELETE API] Berhasil menghapus data pengajuan ID: ${id}`);
        
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