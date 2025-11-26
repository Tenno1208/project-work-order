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
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      console.error("Gagal parse JSON dari API PDAM");
    }

    
console.log("RESPON MENTAH:", text); // <== baris debug Anda
let json;
try {
  json = JSON.parse(text);
} catch {
  console.error("Respon bukan JSON:", text.slice(0, 200));
  return NextResponse.json(
    { success: false, message: "Respon bukan JSON", raw: text.slice(0, 200) },
    { status: 500 }
  );
}


    // 🔹 Ambil data user
    const user = data?.data?.user || data?.data || data?.user || {};
    const nama = user.name || user.nama || user.full_name || "-";
    const npp = user.npp || "-";

    // ###############################################################
    // ✅ PENAMBAHAN: Ambil Nomor Telepon (tlp) dari rl_pegawai
    // Kita gunakan fallback optional chaining untuk menghindari error
    // jika rl_pegawai atau tlp tidak ada.
    // ###############################################################
    const no_telp = user?.rl_pegawai?.tlp || '-';

    if (res.ok) {
      // ✅ PERBAIKAN: Sertakan no_telp dalam objek yang dikembalikan
      return NextResponse.json({ nama, npp, no_telp });
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