import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // 🔹 Ambil token dari header Authorization
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    console.log("Header Authorization:", authHeader);

    if (!token) {
      return NextResponse.json(
        { message: "Token tidak ditemukan di header Authorization" },
        { status: 401 }
      );
    }

    // 🔹 Panggil API PDAM dengan token
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    const text = await res.text();
    console.log("Response dari /me (PDAM):", text);

    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("Gagal parse JSON dari API PDAM");
      return NextResponse.json(
        { success: false, message: "Respon PDAM bukan JSON", raw: text.slice(0, 200) },
        { status: 500 }
      );
    }

    // 🔹 Ambil data user
    const userBase = data?.data?.user || data?.data || data?.user || {};
    const userPegawai = data?.data?.rl_pegawai;

    const nama = userBase.name || userBase.nama || userBase.full_name || "-";
    const npp = userBase.npp || "-";

    // ✅ FINAL: Mengambil nama Satker dan No. Telp
    const satkerName = userPegawai?.satker || null; 
    const no_telp = userPegawai?.tlp || '-';

    if (res.ok) {
      return NextResponse.json({ nama, npp, no_telp, satkerName });
    }

    return NextResponse.json(
      { message: data?.message || "Gagal ambil data user", data },
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