import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/client/satker/all",
      {
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        // Tambahkan ini jika API menggunakan HTTPS self-signed
        cache: "no-store", // biar tidak cache
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error("API PDAM error:", text);
      return NextResponse.json(
        { error: "Gagal ambil data dari server PDAM", detail: text },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("Route /api/satker gagal:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server lokal", detail: error.message },
      { status: 500 }
    );
  }
}
