import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader || "",
        },
      }
    );

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Error fetching user info:", err);
    return NextResponse.json(
      { message: "Gagal mengambil data pengguna." },
      { status: 500 }
    );
  }
}
