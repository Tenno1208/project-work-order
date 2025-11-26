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

    // Mengambil API_BASE_URL dari environment variable
    const apiBaseUrl = process.env.API_BASE_URL;

    if (!apiBaseUrl) {
      console.error("Variabel environment API_BASE_URL tidak diatur!");
      return NextResponse.json(
        { success: false, message: "Konfigurasi API server API_BASE_URL tidak ada." },
        { status: 500 }
      );
    }
    
    const finalApiUrl = `${apiBaseUrl}/api/pengajuan/edit/${uuid}`;
    
    console.log(`[PROXY INFO] Menghubungi API Detail (UUID: ${uuid}): ${finalApiUrl}`);

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
      console.error(`[PROXY ERROR] Gagal ambil data detail (Status ${res.status}). URL: ${finalApiUrl}. Respon: ${rawText.slice(0, 200)}`);
      
      let errorJson = null;
      try {
        errorJson = JSON.parse(rawText);
      } catch {}
      
      return NextResponse.json(
        { 
            success: false, 
            message: `Gagal ambil data pengajuan (Status ${res.status}). Cek URL Eksternal yang dicoba.`,
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

    // Mengembalikan data detail yang diambil
    return NextResponse.json({
      success: true,
      message: "Data pengajuan berhasil diambil dari Detail Endpoint.",
      data: json.data, 
    });

  } catch (error) {
    console.error("Error API /pengajuan/edit/[uuid]:", error);
    return NextResponse.json(
      { success: false, message: "Kesalahan server internal Next.js.", error: String(error) },
      { status: 500 }
    );
  }
}