// app/api/me/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader) {
    return NextResponse.json({ message: "Token tidak ditemukan" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        headers: {
          Authorization: authHeader,
        },
      }
    );

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error("Gagal ambil data user:", err);
    return NextResponse.json({ message: "Gagal mengambil data user" }, { status: 500 });
  }
}
