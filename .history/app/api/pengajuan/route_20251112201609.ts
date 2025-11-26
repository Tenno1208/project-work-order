import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/file-handler/foto";

// --- FUNGSI HELPER BARU DENGAN CUSTOM FILENAME ---
async function uploadFile(file: File, token: string, customName: string, apiType: string = 'pengajuans'): Promise<string> {
    const uploadFormData = new FormData();
    // Menggunakan nama file kustom: file mentah, nama kustom
    uploadFormData.append('file', file, customName); 
    uploadFormData.append('type', apiType);

    console.log(`[FILE UPLOAD] Mengupload file dengan nama: ${customName}`);

    const res = await fetch(FILE_HANDLER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            // 'ngrok-skip-browser-warning': 'true', // Dihapus karena tidak relevan untuk fetch API
        },
        body: uploadFormData,
        cache: 'no-store',
    });

    const rawText = await res.text();
    let json;

    try {
        json = JSON.parse(rawText);
    } catch (e) {
        console.error(`[FILE UPLOAD GAGAL] Gagal parse JSON dari ${FILE_HANDLER_URL}. Respon:`, rawText.slice(0, 500));
        throw new Error(`Gagal upload ${customName}. Respon tidak valid.`);
    }
    
    if (res.ok && json?.success && json.data?.url) {
        console.log(`[FILE UPLOAD SUKSES] File: ${customName}, URL: ${json.data.url}`);
        return json.data.url; 
    } else {
        console.error(`[FILE UPLOAD GAGAL] Status ${res.status}:`, json);
        throw new Error(`Gagal upload ${customName}. Pesan: ${json?.message || 'Error tidak diketahui'}`);
    }
}


export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get("authorization");
        const token = authHeader?.split(" ")[1];

        if (!token) {
            return NextResponse.json(
                { success: false, message: "Token tidak ditemukan" },
                { status: 401 }
            );
        }
        
        // Mengambil semua data dari request client
        const formData = await req.formData();
        const externalFormData = new FormData();
        const fileUrls = [];
        
        // --- LANGKAH 1: UPLOAD FILE LAMPIRAN DAN TANDA TANGAN DENGAN NAMA UNIK ---
        const timestamp = Date.now();
        const uploadPromises = [];
        let ttdUrl: string | undefined;

        // A. Cari dan Upload Tanda Tangan
        const ttdFile = formData.get('ttdPelapor');
        if (ttdFile instanceof File) {
            const ttdExt = ttdFile.name.split('.').pop();
            // NAMA UNIK UNTUK TANDA TANGAN
            const ttdCustomName = `work-order_${timestamp}_ttd.${ttdExt}`; 
            // Tunggu upload ttd (ini penting agar kita tahu URL-nya untuk payload)
            ttdUrl = await uploadFile(ttdFile, token, ttdCustomName, 'ttd'); 
        }

        // B. Cari dan Upload File Lampiran (file0, file1, dst.)
        let fileIndex = 0;
        while (true) {
            const file = formData.get(`file${fileIndex}`); 
            if (file instanceof File) {
                const fileExt = file.name.split('.').pop();
                // NAMA UNIK UNTUK LAMPIRAN
                const fileCustomName = `work-order_${timestamp}_${fileIndex + 1}.${fileExt}`; 
                uploadPromises.push(uploadFile(file, token, fileCustomName, 'pengajuans'));
                fileIndex++;
            } else {
                break; // Hentikan loop jika tidak ada file lagi
            }
        }
        
        // Menjalankan semua proses upload file lampiran secara paralel
        const results = await Promise.all(uploadPromises);
        results.forEach(url => fileUrls.push(url));
        

        // --- LANGKAH 2: MEMBUAT PAYLOAD DATA UNTUK API PENGAJUAN EKSTERNAL ---
        
        // 1. Mapping field form biasa
        const standardFields = [
            { clientKey: "hal", externalName: "hal_id" }, 
            { clientKey: "kepada", externalName: "kepada" }, 
            { clientKey: "satker", externalName: "satker" }, 
            { clientKey: "kodeBarang", externalName: "kode_barang" }, 
            { clientKey: "keterangan", externalName: "keterangan" }, 
            { clientKey: "keterangan", externalName: "catatan" }, // Menggunakan 'keterangan' lagi untuk 'catatan'
            { clientKey: "pelapor", externalName: "pelapor" }, 
            { clientKey: "nppPelapor", externalName: "nppPelapor" }, 
            { clientKey: "mengetahui", externalName: "mengetahui" }, 
            { clientKey: "nppMengetahui", externalName: "nppMengetahui" },
        ];
        
        for (const field of standardFields) {
            const value = formData.get(field.clientKey);
            if (value) {
                externalFormData.append(field.externalName, String(value));
            }
        }
        
        // 2. Tambahkan URL File Lampiran yang berhasil diunggah
        if (fileUrls.length > 0) {
            // Mengirim URL file lampiran sebagai string JSON
            externalFormData.append('file', JSON.stringify(fileUrls)); 
        }
        
        // 3. Tambahkan URL Tanda Tangan
        if (ttdUrl) {
            // Ganti 'ttd_url' dengan nama field yang dibutuhkan API eksternal Anda
            externalFormData.append('ttd_url', ttdUrl); 
        }

        // --- LANGKAH 3: PANGGIL API EKSTERNAL ---

        const res = await fetch(EXTERNAL_API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "ngrok-skip-browser-warning": "true",
            },
            body: externalFormData, 
            cache: "no-store",
        });

        const rawText = await res.text();
        
        let json;
        try {
            json = JSON.parse(rawText);
        } catch (e) {
            console.error("[POST PENGAJUAN] Gagal parse JSON dari API eksternal. Respon mungkin HTML/teks. Cek terminal untuk detail Ngrok.");
            return NextResponse.json(
                { success: false, message: "API eksternal mengembalikan HTML/format tak dikenal.", raw: rawText.slice(0, 500) },
                { status: 500 }
            );
        }
        
        if (!res.ok) {
            return NextResponse.json(
                { success: false, message: json?.message || `Gagal pengajuan (Status ${res.status}): Error API eksternal` },
                { status: res.status }
            );
        }

        return NextResponse.json({
            success: true,
            message: json?.message || "Pengajuan berhasil dikirim!",
            data: json,
        });
    } catch (error) {
        // Tangani error yang terjadi saat upload file atau saat proses lainnya
        console.error("Error API /pengajuan:", error);
        let errorMessage = "Terjadi kesalahan server internal.";
        if (error instanceof Error) {
            errorMessage = error.message;
        }

        return NextResponse.json(
            { success: false, message: `Error Internal Server: ${errorMessage}` },
            { status: 500 }
        );
    }
}