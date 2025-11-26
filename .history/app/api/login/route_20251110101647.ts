import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  
  const response = await fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.text(); // gunakan text agar tetap aman
  return new NextResponse(data, {
    status: response.status,
    headers: { "Content-Type": "application/json" },
  });
}
