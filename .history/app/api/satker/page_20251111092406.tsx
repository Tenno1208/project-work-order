import { NextResponse } from "next/server";

export async function GET() {
  const res = await fetch("https://gateway.pdamkotasmg.co.id/api-gw-balanced/portal-pegawai/api/client/satker/all");
  const data = await res.json();
  return NextResponse.json(data);
}
