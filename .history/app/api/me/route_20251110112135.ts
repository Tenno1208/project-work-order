import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.split(" ")[1];

  if (!token) {
    return NextResponse.json({ message: "Token tidak ditemukan" }, { status: 401 });
  }

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/me",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    const text = await res.text();
    console.log("Response dari /me:", text); // 👈 biar bisa lihat struktur aslinya
    const data = text ? JSON.parse(text) : {};

    // Coba ambil nama & npp dari berbagai kemungkinan struktur
    const user = data?.data?.user || data?.data || data?.user || {};
    const nama = user.name || user.nama || user.full_name || "-";
    const npp = user.npp || "-";

    if (res.ok) {
      return NextResponse.json({ nama, npp });
    }

    return NextResponse.json(
      { message: data?.message || "Gagal ambil data user" },
      { status: res.status }
    );
  } catch (error) {
    console.error("Error /me:", error);
    return NextResponse.json({ message: "Terjadi kesalahan" }, { status: 500 });
  }
}
