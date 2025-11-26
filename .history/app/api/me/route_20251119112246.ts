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
      // Pastikan URL ini benar
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

    // 🔹 Parse JSON dengan aman
    let responseData: any = {};
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch {
      console.error("Gagal parse JSON dari API PDAM");
    }

    // 🔹 Ambil seluruh objek user yang berisi rl_pegawai
    const userObject = responseData?.data?.user || {};

    if (res.ok) {
      // ###############################################################
      // ✅ PERBAIKAN UTAMA: Kembalikan SELURUH objek userObject
      // userObject berisi 'rl_pegawai' dan di dalamnya ada 'tlp'
      // ###############################################################
      return NextResponse.json(userObject);
    }

    // Jika response tidak OK, kembalikan pesan error dari API PDAM
    return NextResponse.json(
      { message: responseData?.message || "Gagal ambil data user", data: responseData },
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