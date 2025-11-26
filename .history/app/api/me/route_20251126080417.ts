import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return NextResponse.json(
        { message: "Token tidak ditemukan di header Authorization" },
        { status: 401 }
      );
    }

    // 🔹 Panggil API PDAM
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
    
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Gagal parse JSON dari API PDAM:", e);
      return NextResponse.json(
        { message: "Gagal parse JSON dari API PDAM", raw_response: text.slice(0, 200) },
        { status: 500 }
      );
    }

    const userBase = data?.data?.user;
    const userPegawai = data?.data?.rl_pegawai;

    const nama = userBase?.name || userBase?.nama || userBase?.full_name || "-";
    const npp = userBase?.npp || "-";

    const satker = userPegawai?.satker || userBase?.satker || null; 
    
    const no_telp = userPegawai?.tlp || '-'; 

    if (res.ok) {
      return NextResponse.json({ 
          status: data.status,
          message: data.message,
          data: {
              user: userBase,
              rl_pegawai: userPegawai,
          }
      });
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