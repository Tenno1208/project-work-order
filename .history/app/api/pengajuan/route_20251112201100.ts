
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/file-handler/foto";

// --- FUNGSI HELPER BARU DENGAN CUSTOM FILENAME ---
async function uploadFile(file: File, token: string, customName: string, apiType: string = 'pengajuans'): Promise<string> {
    const uploadFormData = new FormData();
    // Menggunakan nama file kustom
    uploadFormData.append('file', file, customName); 
    uploadFormData.append('type', apiType);

    const res = await fetch(FILE_HANDLER_URL, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true',
        },
        body: uploadFormData,
        cache: 'no-store',
    });

    const json = await res.json();
    
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
    
    const formData = await req.formData();
    const externalFormData = new FormData();
    const fileUrls = [];
    
    // --- LANGKAH 1: UPLOAD FILE LAMPIRAN DAN TANDA TANGAN ---
    const timestamp = Date.now();
    const uploadPromises = [];
    let ttdUrl: string | undefined;

    // A. Cari dan Upload Tanda Tangan
    const ttdFile = formData.get('ttdPelapor');
    if (ttdFile instanceof File) {
        const ttdExt = ttdFile.name.split('.').pop();
        const ttdCustomName = `work-order_${timestamp}_ttd.${ttdExt}`;
        // Tunggu upload ttd (ini penting agar kita tahu URL-nya untuk payload)
        ttdUrl = await uploadFile(ttdFile, token, ttdCustomName, 'ttd'); 
    }

    // B. Cari dan Upload File Lampiran
    let fileIndex = 0;
    while (true) {
        // Asumsi client mengirim file lampiran dengan key 'file0', 'file1', dst.
        const file = formData.get(`file${fileIndex}`); 
        if (file instanceof File) {
            const fileExt = file.name.split('.').pop();
            const fileCustomName = `work-order_${timestamp}_${fileIndex + 1}.${fileExt}`;
            uploadPromises.push(uploadFile(file, token, fileCustomName, 'pengajuans'));
            fileIndex++;
        } else {
            break;
        }
    }
    
    // Menjalankan semua proses upload file lampiran secara paralel
    const results = await Promise.all(uploadPromises);
    results.forEach(url => fileUrls.push(url));
    

    // --- LANGKAH 2: MEMBUAT PAYLOAD DATA UNTUK API PENGAJUAN ---
    
    // Mapping field form biasa
    const standardFields = [
      { clientKey: "hal", externalName: "hal_id" }, 
      { clientKey: "kepada", externalName: "kepada" }, 
      { clientKey: "satker", externalName: "satker" }, 
      { clientKey: "kodeBarang", externalName: "kode_barang" }, 
      { clientKey: "keterangan", externalName: "keterangan" }, 
      { clientKey: "keterangan", externalName: "catatan" }, 
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
    
    // C. Tambahkan URL File yang berhasil diunggah
    if (fileUrls.length > 0) {
        // Mengirim URL file lampiran sebagai string JSON
        externalFormData.append('file', JSON.stringify(fileUrls)); 
    }
    
    // D. Tambahkan URL Tanda Tangan
    if (ttdUrl) {
        // Ganti 'ttd_url' dengan nama field yang dibutuhkan API eksternal Anda
        externalFormData.append('ttd_url', ttdUrl); 
    }

    // Panggil API eksternal Pengajuan
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
    // ... (rest of the response handling remains the same)
    
    let json;
    try {
        json = JSON.parse(rawText);
    } catch (e) {
        console.error("[POST PENGAJUAN] Gagal parse JSON. Respon adalah HTML/teks.");
        return NextResponse.json(
            { success: false, message: "API eksternal mengembalikan HTML/format tak dikenal. Cek terminal untuk detail Ngrok.", raw: rawText.slice(0, 500) },
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
    console.error("Error API /pengajuan:", error);
    return NextResponse.json(
      { success: false, message: `Error Internal Server: ${String(error)}` },
      { status: 500 }
    );
  }
}