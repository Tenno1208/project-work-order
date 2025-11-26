import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          npp: body.npp,
          password: body.password,
          hwid: body.hwid || "prod",
        }),
      }
    );

    const text = await res.text();
    console.log("Response dari PDAM:", text);

    const data = text ? JSON.parse(text) : {};

    // ✅ Ambil token dari respons PDAM
    if (res.ok && data?.data?.access_token) {
      return NextResponse.json({
        success: true,
        message: "Login berhasil",
        token: data.data.access_token,
        token_type: data.data.token_type,
        expires_in: data.data.expires_in,
        refresh_token: data.data.refresh_token,
      });
    }

    // ❌ Jika gagal login
    return NextResponse.json(
      { success: false, message: data?.message || "Login gagal" },
      { status: res.status }
    );
  } catch (err: any) {
    console.error("Error proxy:", err);
    return NextResponse.json(
      { message: "Gagal menghubungi server PDAM." },
      { status: 500 }
    );
  }
}
