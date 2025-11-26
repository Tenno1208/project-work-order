import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    // 🔹 Ambil token dari header Authorization
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    // 🔹 Debug biar tahu apakah token-nya dikirim
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

    // 🔹 Parse JSON dengan aman
    let responseData: any = {};
    try {
      responseData = text ? JSON.parse(text) : {};
    } catch {
      console.error("Gagal parse JSON dari API PDAM");
    }

    // Logika JSON.parse yang redundan dihapus dan diganti dengan responseData di atas.

    
    // 🔹 Ambil seluruh objek user dari respons API eksternal
    // Ini termasuk sub-objek 'rl_pegawai' yang berisi 'tlp'
    const userObject = responseData?.data?.user || {};
    
    // Logika penemuan nama dan npp yang lama di Route Handler diabaikan.
    // Pengambilan nama, npp, dan tlp dilakukan di sisi klien (DashboardLayout) 
    // dengan data lengkap ini.

    if (res.ok) {
      // ✅ PERBAIKAN: Kembalikan SELURUH userObject yang berisi rl_pegawai.
      return NextResponse.json(userObject); 
    }

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