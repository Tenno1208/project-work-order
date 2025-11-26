import { NextResponse } from "next/server";

// Memaksa Next.js menjalankan kode ini setiap saat (tanpa cache)
export const dynamic = 'force-dynamic';

// URL API eksternal untuk pengajuan
const EXTERNAL_API_URL = "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/pengajuan";

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
    
    // Menerima FormData dari client
    const formData = await req.formData();
    
    // Kita membuat FormData baru untuk dikirim ke API eksternal
    const externalFormData = new FormData();

    // Mapping field form biasa
    // Catatan: Kunci (keys) harus sesuai dengan yang diharapkan oleh API eksternal
    const formFields = [
      "hal", "kepada", "satker", "kodeBarang", "keterangan", 
      "pelapor", "nppPelapor", "mengetahui", "nppMengetahui"
    ];

    for (const key of formFields) {
      const value = formData.get(key);
      if (value) {
        externalFormData.append(key, value);
      }
    }

    // Mapping file lampiran (files)
    // Di frontend, kita akan memberi nama 'file0', 'file1', dst.
    let fileIndex = 0;
    while (true) {
        const file = formData.get(`file${fileIndex}`);
        if (file instanceof File) {
            externalFormData.append('lampiran[]', file, file.name);
            fileIndex++;
        } else {
            break;
        }
    }

    // Mapping tanda tangan (ttd)
    const ttdFile = formData.get('ttdPelapor');
    if (ttdFile instanceof File) {
        // Ganti 'tanda_tangan_pelapor' dengan nama field yang diharapkan API Anda
        externalFormData.append('tanda_tangan_pelapor', ttdFile, ttdFile.name);
    }

    console.log(`[PENGAJUAN] Mengirim data ke: ${EXTERNAL_API_URL}`);

    // Panggil API eksternal
    const res = await fetch(EXTERNAL_API_URL, {
      method: "POST",
      headers: {
        // PENTING: JANGAN SET 'Content-Type' menjadi 'application/json' atau 'multipart/form-data'. 
        // JavaScript akan otomatis mengatur header Content-Type 'multipart/form-data' 
        // beserta boundary yang benar ketika menggunakan objek FormData di body.
        "Authorization": `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      body: externalFormData, // Mengirim objek FormData
      cache: "no-store",
    });

    const json = await res.json();
    
    if (!res.ok) {
        console.error(`[PENGAJUAN] Gagal POST ke API eksternal (Status ${res.status}):`, json);
        return NextResponse.json(
            { success: false, message: `Gagal pengajuan (Status ${res.status}): ${json?.message || 'Error API eksternal'}`, data: json },
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
      { success: false, message: "Terjadi kesalahan server saat memproses pengajuan.", error: String(error) },
      { status: 500 }
    );
  }
}