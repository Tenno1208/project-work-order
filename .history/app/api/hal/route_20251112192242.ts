import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

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

    // Mapping field form biasa (Eksplisit untuk Hal ID)
    
    const halIdValue = formData.get('hal');
    // --- PERBAIKAN: Memaksa hal_id menjadi angka ---
    if (halIdValue) {
        externalFormData.append('hal_id', Number(halIdValue).toString()); // Mengirim sebagai string angka
    } else {
        // Jika tidak ada hal yang dipilih, kirim 0 atau kosong jika API eksternal membolehkannya
        externalFormData.append('hal_id', '0'); 
    }
    // ------------------------------------------------

    // Field-field lain
    const standardFields = [
      "kepada", "satker", "kodeBarang", "keterangan", "pelapor", "nppPelapor", 
      "mengetahui", "nppMengetahui", "hal_nama"
    ];

    for (const key of standardFields) {
      const value = formData.get(key);
      if (value) {
          externalFormData.append(key, value);
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
        // Ganti 'tanda_tangan_pelapor' dengan nama field yang diharapkan API Anda
        externalFormData.append('tanda_tangan_pelapor', ttdFile, ttdFile.name);
    }

    console.log(`[POST PENGAJUAN] Mengirim data ke: ${EXTERNAL_API_URL}`);
    console.log(`[POST PENGAJUAN] Cek hal_id yang dikirim: ${externalFormData.get('hal_id')}`);


    // Panggil API eksternal
    const res = await fetch(EXTERNAL_API_URL, {
      method: "",
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