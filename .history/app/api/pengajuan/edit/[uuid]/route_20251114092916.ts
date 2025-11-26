import { NextResponse } from "next/server";

export async function GET(
  req: Request, 
  { params }: { params: { uuid: string } }
) {
  const { uuid } = params; 

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token otorisasi tidak ditemukan." },
        { status: 401 }
      );
    }

    // Mengambil URL dari environment variable
    const apiUrlTemplate = process.env.EDIT_API_PENGAJUAN_URL;

    if (!apiUrlTemplate) {
      console.error("Variabel environment EDIT_API_PENGAJUAN_URL tidak diatur!");
      return NextResponse.json(
        { success: false, message: "Konfigurasi API server EDIT_API_PENGAJUAN_URL tidak ditemukan." },
        { status: 500 }
      );
    }
    
    // Mengganti placeholder {uuid} dengan nilai aktual
    const finalApiUrl = apiUrlTemplate.replace('{uuid}', uuid);
    
    console.log(`Menghubungi API eksternal untuk Edit (UUID: ${uuid}): ${finalApiUrl}`);

    const res = await fetch(finalApiUrl, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      cache: "no-store",
    });

    const rawText = await res.text();
    
    if (!res.ok) {
      console.error(`Gagal ambil data edit (Status ${res.status}). URL: ${finalApiUrl}. Respon: ${rawText.slice(0, 200)}`);
      // Mencoba parsing JSON untuk mendapatkan pesan error yang lebih baik
      let errorJson = null;
      try {
        errorJson = JSON.parse(rawText);
      } catch {}

      return NextResponse.json(
        { 
            success: false, 
            message: `Gagal ambil data pengajuan (Status ${res.status}). ${errorJson?.message || 'Error API Eksternal.'}`,
            raw: rawText 
        },
        { status: res.status }
      );
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      console.error("Gagal parse JSON dari API eksternal.");
      return NextResponse.json(
        { success: false, message: "API eksternal mengembalikan format tak dikenal (bukan JSON)." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Data pengajuan berhasil diambil.",
      data: json.data, // Asumsi data tunggal ada di json.data
    });

  } catch (error) {
    console.error("Error API /pengajuan/edit/[uuid]:", error);
    return NextResponse.json(
      { success: false, message: "Kesalahan server internal Next.js.", error: String(error) },
      { status: 500 }
    );
  }
}