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
          npp: body.npp, // sesuai API
          password: body.password,
          hwid: body.hwid || "web-client", // tambahkan hwid
        }),
      }
    );

    const text = await res.text();
    console.log("Response dari PDAM:", text);

    const data = text ? JSON.parse(text) : {};
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Error proxy:", err);
    return NextResponse.json(
      { message: "Gagal menghubungi server PDAM." },
      { status: 500 }
    );
  }
}
