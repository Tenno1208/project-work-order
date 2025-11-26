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

    const res = await fetch("https://zephyrean-cycloidally-triston.ngrok-free.dev/api/hal", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Gagal mengambil data dari API eksternal" },
        { status: res.status }
      );
    }

    const json = await res.json();

    if (!json || !Array.isArray(json.data)) {
      return NextResponse.json(
        { success: false, message: "Format data tidak sesuai", raw: json },
        { status: 500 }
      );
    }

    const hasil = json.data.map((item: any) => ({
      id: item.id,
      kode: item.kode,
      nama_jenis: item.nama_jenis,
      status: item.status,
    }));

    return NextResponse.json({
      success: true,
      message: "Data master hal berhasil diambil",
      data: hasil,
    });
  } catch (error) {
    console.error("Error mengambil data master hal:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server", error: String(error) },
      { status: 500 }
    );
  }
}
