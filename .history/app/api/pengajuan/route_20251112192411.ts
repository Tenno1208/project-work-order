import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

// Pastikan URL Ngrok ini benar dan masih aktif!
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

    // Field-field standar yang dikirim (termasuk ID Hal sebagai hal_id)
    const standardFields = [
      { clientKey: "hal", externalName: "hal_id" }, 
      { clientKey: "kepada", externalName: "kepada" }, 
      { clientKey: "satker", externalName: "satker" }, 
      { clientKey: "kodeBarang", externalName: "kodeBarang" }, 
      { clientKey: "keterangan", externalName: "keterangan" }, 
      { clientKey: "pelapor", externalName: "pelapor" }, 
      { clientKey: "nppPelapor", externalName: "nppPelapor" }, 
      { clientKey: "mengetahui", externalName: "mengetahui" }, 
      { clientKey: "nppMengetahui", externalName: "nppMengetahui" },
      { clientKey: "hal_nama", externalName: "hal_nama" }, // Walaupun kita tidak mengirim ini ke API, ini membantu debugging
    ];
    
    for (const field of standardFields) {
      const value = formData.get(field.clientKey);
      
      // Jika key adalah 'hal' (ID dari frontend), kita petakan ke 'hal_id' dan pastikan dikirim sebagai string angka
      if (field.clientKey === 'hal' && value) {
          externalFormData.append(field.externalName, String(value));
      } else if (value && field.clientKey !== 'hal_nama') {
          // Hanya kirim field lain yang memiliki nilai dan bukan hal_nama
          externalFormData.append(field.externalName, value);
      }
    }
    
    // Mapping file lampiran (file0, file1, dst.)
    let fileIndex = 0;
    while (true) {
        const file = formData.get(`file${fileIndex}`);
        if (file instanceof File) {
            // Asumsi API eksternal menerima array file di field 'lampiran[]'
            externalFormData.append('lampiran[]', file, file.name);
            fileIndex++;
        } else {
            break;
        }
    }

    // Mapping tanda tangan (ttdPelapor)
    const ttdFile = formData.get('ttdPelapor');
    if (ttdFile instanceof File) {
        externalFormData.append('tanda_tangan_pelapor', ttdFile, ttdFile.name);
    }

    console.log(`[POST PENGAJUAN] Mengirim data ke: ${EXTERNAL_API_URL}`);
    console.log(`[POST PENGAJUAN] Cek hal_id yang dikirim: ${externalFormData.get('hal_id')}`);

    // Panggil API eksternal
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
    console.log(`[POST PENGAJUAN] Respon Mentah: ${rawText.slice(0, 500)}...`);

    let json;
    try {
        json = JSON.parse(rawText);
    } catch (e) {
        // Jika Ngrok/API mengembalikan HTML
        console.error("[POST PENGAJUAN] Gagal parse JSON. Respon adalah HTML/teks.");
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
    console.error("Error API /pengajuan:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server saat memproses pengajuan.", error: String(error) },
      { status: 500 }
    );
  }
}