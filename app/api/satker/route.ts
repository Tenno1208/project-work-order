import { NextResponse } from "next/server";
import https from "https";

const agent = new https.Agent({ rejectUnauthorized: false });

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization"); 
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/client/satker/all",
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: auth, 
        },
        cache: "no-store",
        // @ts-ignore
        agent,
      }
    );

    const text = await res.text();

    if (!res.ok) {
      console.error("❌ API PDAM Error:", res.status, text);
      return NextResponse.json(
        { error: "Gagal ambil data dari PDAM", detail: text },
        { status: res.status }
      );
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);

  } catch (error: any) {
    console.error("❌ Route /api/satker gagal:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server lokal", detail: error.message },
      { status: 500 }
    );
  }
}