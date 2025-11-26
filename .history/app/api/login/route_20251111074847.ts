import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();

  try {
    const res = await fetch(
      "https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          npp: body.npp,
          password: body.password,
          hwid: body.hwid || "prod",
        }),
      }
    );

    const text = await res.text();
    console.log("Response dari PDAM:", text);

    // Coba parsing JSON, jika gagal tangkap errornya
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (e) {
      console.error("Gagal parse JSON dari PDAM:", e);
      // Jika respons bukan JSON, kita anggap sebagai error
      return NextResponse.json(
        { success: false, message: "Respon server tidak valid." },
        { status: 500 }
      );
    }

    // ✅ Ambil token dari respons PDAM jika sukses
    if (res.ok && data?.data?.access_token) {
      return NextResponse.json({
        success: true,
        message: "Login berhasil",
        token: data.data.access_token,
        token_type: data.data.token_type,
        expires_in: data.data.expires_in,
        refresh_token: data.data.refresh_token,
      });
    }
    const pdamErrorMessage = data?.message || data?.error || "NPP atau Password salah.";
    
    // Kirim pesan error dari PDAM ke frontend dengan status code yang sama
    return NextResponse.json(
      { success: false, message: pdamErrorMessage },
      { status: res.status || 401 } // Gunakan status dari PDAM, default ke 401 jika tidak ada
    );

  } catch (err: any) {
    console.error("Error proxy ke server PDAM:", err);
    return NextResponse.json(
      { message: "Gagal menghubungi server PDAM. Coba lagi nanti." },
      { status: 503 } // 503 Service Unavailable adalah kode yang tepat di sini
    );
  }
}