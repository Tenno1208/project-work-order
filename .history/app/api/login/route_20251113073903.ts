import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  if (!body.npp || !body.password) {
    return NextResponse.json(
      { success: false, message: "NPP dan password wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const formBody = new URLSearchParams({
      npp: body.npp,
      password: body.password,
      hwid: body.hwid || "prod",
    });

    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formBody.toString(),
      }
    );

    // Kadang PDAM tidak mengirim JSON, jadi kita tangani aman:
    let data: any = {};
    try {
      const text = await res.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

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

    let message = "Terjadi kesalahan saat login.";
    if (res.status === 400) {
      message = "NPP atau password salah. Silakan periksa kembali.";
    } else if (data?.message) {
      message = data.message;
    }

    return NextResponse.json(
      { success: false, message },
      { status: res.status || 400 }
    );
  } catch (err) {
    console.error("Error proxy:", err);
    return NextResponse.json(
      { success: false, message: "Gagal menghubungi server PDAM." },
      { status: 500 }
    );
  }
}
