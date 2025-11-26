// app/api/me/route.ts
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ message: "Token tidak ditemukan" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (res.ok && data?.data?.user) {
      const user = data.data.user;
      return NextResponse.json({
        success: true,
        user: {
          npp: user.npp,
          name: user.name,
        },
      });
    }

    return NextResponse.json(
      { success: false, message: "Gagal ambil data user" },
      { status: res.status }
    );
  } catch (error) {
    console.error("Error /api/me:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan koneksi" },
      { status: 500 }
    );
  }
}
