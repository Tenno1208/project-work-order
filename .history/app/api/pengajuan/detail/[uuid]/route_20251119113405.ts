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

    if (!apiUrlTemplate || !apiUrlTemplate.includes('{uuid}')) {
      console.error("Variabel environment EDIT_API_PENGAJUAN_URL tidak diatur atau format template salah!");
      return NextResponse.json(
        { 
            success: false, 
            message: "Konfigurasi API server EDIT_API_PENGAJUAN_URL tidak benar. Pastikan URL mengandung {uuid}." 
        },
        { status: 500 }
      );
    }
    
    // Mengganti placeholder {uuid} dengan nilai aktual
    const finalApiUrl = apiUrlTemplate.replace('{uuid}', uuid);
    
    console.log(`[PROXY INFO] Menghubungi API eksternal: ${finalApiUrl}`);

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
      console.error(`[PROXY ERROR] Gagal ambil data edit (Status ${res.status}). URL: ${finalApiUrl}. Respon: ${rawText.slice(0, 200)}`);
      
      let errorJson = null;
      try {
        errorJson = JSON.parse(rawText);
      } catch {}
      
      return NextResponse.json(
        { 
            success: false, 
            message: `Gagal ambil data pengajuan (Status ${res.status}). Pesan Eksternal: ${errorJson?.message || 'Error API Eksternal.'}`,
            debug_url_eksternal: finalApiUrl,
            raw: rawText 
        },
        { status: res.status }
      );
    }

    let json;
    try {
      json = JSON.parse(rawText);
    } catch (e) {
      console.error("[PROXY ERROR] Gagal parse JSON dari API eksternal.");
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