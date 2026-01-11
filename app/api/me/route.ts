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

    // Mengambil URL dari Environment Variable
    // Fallback ke hardcoded URL jika env tidak terbaca
    const baseUrl = process.env.API_BASE_URL_PORTAL_PEGAWAI || "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api";

    const res = await fetch(
      `${baseUrl}/auth/me`, 
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
    // console.log("RESPON MENTAH:", rawText); // Uncomment jika ingin debugging

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
    const idsatker = user?.rl_satker || {};

    const nama = user?.name || "-";
    const npp = user?.npp || "-";
    const no_telp = pegawai?.tlp || "-";
    const satker = pegawai?.satker || "-";  
    const alamat = pegawai?.alamat || "-";     
    const subsatker = pegawai?.subsatker || "-";  
    const kdparent = idsatker?.kd_parent || "-";
    
    // Tambahan: Jabatan seringkali penting untuk ditampilkan
    const jabatan = pegawai?.jabatan || "-"; 

    if (res.ok) {
      return NextResponse.json({
        nama,
        npp,
        no_telp,
        satker,
        subsatker,
        alamat,
        kdparent,
        jabatan // Mengirim jabatan juga (opsional, tapi berguna)
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