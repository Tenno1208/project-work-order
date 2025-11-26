import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";
const FILE_HANDLER_URL = "https://gateway.pdamkotasmg.co.id/api-gw/portal-pegawai/file-handler/foto";

// Fungsi helper untuk mengunggah satu file ke File Handler API
async function uploadFile(file: File, token: string, apiType: string = 'pengajuans'): Promise<string> {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file, file.name);
    uploadFormData.append('type', apiType); // Sesuaikan type jika API Anda membutuhkannya

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
    
    // Asumsi API mengembalikan JSON seperti { success: true, url: 'path/to/file.jpg' }
    if (res.ok && json?.success && json.data?.url) {
        // Log URL yang berhasil diunggah di terminal
        console.log(`[FILE UPLOAD SUKSES] File: ${file.name}, URL: ${json.data.url}`);
        return json.data.url; 
    } else {
        console.error(`[FILE UPLOAD GAGAL] Status ${res.status}:`, json);
        throw new Error(`Gagal upload ${file.name}. Pesan: ${json?.message || 'Error tidak diketahui'}`);
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

    // --- LANGKAH 1: UPLOAD FILE LAMPIRAN SAJA (MENGABAIKAN TTD) ---
    let fileIndex = 0;
    const uploadPromises = [];

    while (true) {
        const file = formData.get(`file${fileIndex}`);
        if (file instanceof File) {
            // Kumpulkan janji (Promise) untuk diunggah secara paralel
            uploadPromises.push(uploadFile(file, token, 'pengajuans'));
            fileIndex++;
        } else {
            break;
        }
    }
    
    // Menjalankan semua proses upload
    const results = await Promise.all(uploadPromises);
    results.forEach(url => fileUrls.push(url));
    
    // Cek apakah ada file lampiran yang berhasil diunggah
    if (fileUrls.length > 0) {
        // Mengirim URL file sebagai string JSON
        externalFormData.append('file', JSON.stringify(fileUrls)); 
    } else if (fileIndex > 0) {
        // Jika ada file yang dipilih tapi gagal diunggah (error dari Promise.all)
         throw new Error("Proses upload file lampiran gagal total.");
    }

    // --- LANGKAH 2: MEMBUAT PAYLOAD DATA UNTUK API PENGAJUAN ---
    
    // Mapping field form biasa
    const standardFields = [
      { clientKey: "hal", externalName: "hal_id" }, 
      { clientKey: "kepada", externalName: "kepada" }, 
      { clientKey: "satker", externalName: "satker" }, 
      { clientKey: "kodeBarang", externalName: "kode_barang" }, 
      { clientKey: "keterangan", externalName: "keterangan" }, 
      // Tambahkan 'catatan' dengan nilai yang sama dengan 'keterangan'
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
    
    // Panggil API eksternal Pengajuan
    const res = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: externalFormData, // Mengirim objek FormData
      cache: "no-store",
    });

    const rawText = await res.text();
    console.log(`[POST PENGAJUAN] Status ${res.status}`);

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
      { success: false, message: String(error) }, // Kirim error dari proses upload
      { status: 500 }
    );
  }
}