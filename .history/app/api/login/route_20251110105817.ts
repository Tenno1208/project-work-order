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

    // Jika login berhasil dan token ada di respons
    if (res.ok && data?.data?.token) {
      const response = NextResponse.json(
        { success: true, message: "Login berhasil", data },
        { status: 200 }
      );

      // Simpan token di cookie
      response.cookies.set("token", data.data.token, {
        httpOnly: true, // tidak bisa diakses JS
        secure: true, // hanya via HTTPS
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 4, // 4 jam
      });

      return response;
    }

    // Jika gagal login
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
