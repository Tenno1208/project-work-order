import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const hwid = body.hwid || "web-client";

    const res = await fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, hwid }),
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Proxy login error:", err);
    return NextResponse.json({ message: "Proxy login error" }, { status: 500 });
  }
}
