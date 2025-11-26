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

    const res = await fetch(
      "https://zephyrean-cycloidally-triston.ngrok-free.dev/api/master-jenis-pekerjaan",
      {
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
        { success: false, message: `Gagal ambil data (status ${res.status})` },
        { status: res.status }
      );
    }

    const json = await res.json();

    if (!json || !Array.isArray(json.data)) {
      return NextResponse.json(
        { success: false, message: "Format data salah", raw: json },
        { status: 500 }
      );
    }

    const hasil = json.data.map((item: any) => ({
      id: item.id,
      nama: item.nama_pekerjaan ?? item.nama ?? "-",
      keterangan: item.keterangan ?? "",
    }));

    return NextResponse.json({
      success: true,
      data: hasil,
    });
  } catch (err) {
    console.error("Error API /jenis-pekerjaan:", err);
    return NextResponse.json(
      { success: false, message: "Kesalahan server", error: String(err) },
      { status: 500 }
    );
  }
}
