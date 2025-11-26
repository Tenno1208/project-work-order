import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // ↪ Ambil token
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { message: "Token tidak ditemukan di header Authorization" },
        { status: 401 }
      );
    }

    // ↪ Panggil API PDAM
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const rawText = await res.text();
    console.log("RESPON MENTAH:", rawText);

    let json: any;
    try {
      json = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { success: false, message: "Respon bukan JSON", raw: rawText.slice(0, 200) },
        { status: 500 }
      );
    }

    const user = json?.data?.user || {};
    const pegawai = user?.rl_pegawai || {};

    const nama = user?.name || "-";
    const npp = user?.npp || "-";
    const no_telp = pegawai?.tlp || "-";
    const satker = pegawai?.satker || "-";       
    const subsatker = pegawai?.subsatker || "-";  

    if (res.ok) {
      return NextResponse.json({
        nama,
        npp,
        no_telp,
        satker,
        subsatker,
      });
    }

    return NextResponse.json(
      { message: json?.message || "Gagal ambil data user", raw: json },
      { status: res.status }
    );

  } catch (error) {
    console.error("Error /api/me:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan internal", error: String(error) },
      { status: 500 }
    );
  }
}
