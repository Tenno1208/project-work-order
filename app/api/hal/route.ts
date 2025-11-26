import { NextResponse } from "next/server";

const API_BASE_URL = process.env.API_BASE_URL;
const EXTERNAL_HAL_API = `${API_BASE_URL}/api/hal`;

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];

    if (!API_BASE_URL) {
      console.error("API_BASE_URL is not defined in environment variables.");
      return NextResponse.json( 
        { success: false, message: "Konfigurasi server (API URL) tidak ditemukan." },
        { status: 500 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token tidak ditemukan" },
        { status: 401 }
      );
    }

    const res = await fetch(EXTERNAL_HAL_API, { 
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        "ngrok-skip-browser-warning": "true",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const errorBody = await res.json().catch(() => ({}));
      const errorMessage = errorBody.message || "Gagal mengambil data dari API eksternal";

      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: res.status }
      );
    }

    const json = await res.json();

    if (!json || !Array.isArray(json.data)) {
      return NextResponse.json(
        { success: false, message: "Format data tidak sesuai", raw: json },
        { status: 500 }
      );
    }

    const hasil = json.data.map((item: any) => ({
      id: item.id,
      kode: item.kode,
      nama_jenis: item.nama_jenis,
      status: item.status,
    }));

    return NextResponse.json({
      success: true,
      message: "Data master hal berhasil diambil",
      data: hasil,
    });
  } catch (error) {
    console.error("Error mengambil data master hal:", error);
    return NextResponse.json(
      { success: false, message: "Terjadi kesalahan server", error: String(error) },
      { status: 500 }
    );
  }
}