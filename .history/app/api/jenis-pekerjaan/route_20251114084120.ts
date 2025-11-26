import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    // 🚀 Mengambil URL API dari environment variable
    const apiURL = process.env.GET_API_JENISPEKERJAAN_DROPDOWN;
    
    if (!apiURL) {
      console.error("Variabel environment GET_API_JENISPEKERJAAN_DROPDOWN belum diatur!");
      return NextResponse.json(
        { success: false, message: "Konfigurasi API Jenis Pekerjaan belum diatur di server." },
        { status: 500 }
      );
    }

    console.log(`Menghubungi API eksternal: ${apiURL}`);

    const res = await fetch(apiURL, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        // Header ngrok-skip-browser-warning tetap dipertahankan
        "ngrok-skip-browser-warning": "true",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      cache: "no-store",
    });

    const rawText = await res.text();
    console.log("Status Respon Eksternal:", res.status);
    console.log("Isi Respon Mentah (max 200 karakter):", rawText.slice(0, 200) + "...");

    
    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: `Gagal ambil data (Status ${res.status}). Respon mungkin bukan JSON.`, raw: rawText },
        { status: res.status }
      );
    }

    let json;
    try {
        json = JSON.parse(rawText);
    } catch (e) {
        console.error("Gagal parse JSON. Respon adalah HTML/teks:", rawText.slice(0, 200) + "...");
        return NextResponse.json(
            { success: false, message: "API eksternal mengembalikan HTML/format tak dikenal.", raw: rawText.slice(0, 500) },
            { status: 500 }
        );
    }


    if (!json || !Array.isArray(json.data)) {
      return NextResponse.json(
        { success: false, message: "Format data tidak sesuai (Data bukan array)", raw: json },
        { status: 500 }
      );
    }

    const hasil = json.data.map((item: any) => ({
      id: item.id,
      nama: item.nama_pekerjaan ?? item.nama ?? "-", 
    }));

    return NextResponse.json({
      success: true,
      message: "Data master jenis pekerjaan berhasil diambil",
      data: hasil,
    });
  } catch (error) {
    console.error("Error API /jenis-pekerjaan:", error);
    return NextResponse.json(
      { success: false, message: "Kesalahan server", error: String(error) },
      { status: 500 }
    );
  }
}