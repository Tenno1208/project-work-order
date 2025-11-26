import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // Ambil token dari header Authorization
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    // Ganti URL di bawah sesuai API Laravel kamu
    const res = await fetch(
      "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/master-jenis-pekerjaan",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "ngrok-skip-browser-warning": "true",
        },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          message: `Gagal mengambil data dari API eksternal (status ${res.status})`,
        },
        { status: res.status }
      );
    }

    const json = await res.json();

    // Pastikan data sesuai format
    if (!json || !Array.isArray(json.data)) {
      return NextResponse.json(
        { success: false, message: "Format data tidak sesuai", raw: json },
        { status: 500 }
      );
    }

    // Sesuaikan struktur datanya
    const hasil = json.data.map((item: any) => ({
      id: item.id,
      nama: item.nama_pekerjaan ?? item.nama ?? "-",
      keterangan: item.keterangan ?? "",
    }));

    return NextResponse.json({
      success: true,
      message: "Data master jenis pekerjaan berhasil diambil",
      data: hasil,
    });
  } catch (error) {
    console.error("Error ambil data:", error);
    return NextResponse.json(
      { success: false, message: "Kesalahan server", error: String(error) },
      { status: 500 }
    );
  }
}
