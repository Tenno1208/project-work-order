import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  // Validasi input kosong
  if (!body.npp || !body.password) {
    return NextResponse.json(
      { success: false, message: "NPP dan password wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npp: body.npp,
          password: body.password,
          hwid: body.hwid || "prod",
        }),
      }
    );

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    // ✅ Jika login sukses
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

    // ❌ Jika login gagal
    return NextResponse.json(
      {
        success: false,
        message:
          data?.message ||
          "NPP atau password salah. Silakan periksa kembali.",
      },
      { status: res.status || 401 }
    );
  } catch (err: any) {
    console.error("Error proxy:", err);
    return NextResponse.json(
      { success: false, message: "Gagal menghubungi server PDAM." },
      { status: 500 }
    );
  }
}
