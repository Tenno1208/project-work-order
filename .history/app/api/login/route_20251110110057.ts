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

    // Jika login berhasil
    if (res.ok && data?.data?.token) {
      return NextResponse.json({
        success: true,
        message: "Login berhasil",
        token: data.data.token,
        user: data.data.user || null,
      });
    }

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
