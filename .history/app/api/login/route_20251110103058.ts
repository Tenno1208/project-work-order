import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();

  // kalau hwid belum dikirim dari frontend, isi otomatis
  const hwid = body.hwid || "web-client";

  const res = await fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, hwid }),
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
