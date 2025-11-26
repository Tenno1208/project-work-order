import { NextResponse } from "next/server";

export async function GET() {
  try {
    // 🔹 Ambil data dari API eksternal
    const res = await fetch("https://zephyrean-cycloidally-triston.ngrok-free.dev/api/hal", {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store", 
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, message: "Gagal mengambil data dari API eksternal" },
        { status: res.status }
      );
    }

    // 🔹 Parse JSON dari API eksternal
    const json = await res.json();

    if (!json || !Array.isArray(json.data)) {
      return NextResponse.json(
        { success: false, message: "Format data tidak sesuai", raw: json },
        { status: 500 }
      );
    }

    // 🔹 Format ulang data biar rapi (opsional)
    const hasil = json.data.map((item: any) => ({
      id: item.id,
      kode: item.kode,
      nama_jenis: item.nama_jenis,
      status: item.status,
    }));

    // 🔹 Return hasil ke frontend
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
