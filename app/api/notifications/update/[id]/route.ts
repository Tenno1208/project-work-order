// app/api/notifications/update/[id]/route.ts

import { NextResponse } from "next/server";

// PERUBAHAN: Ganti nama fungsi dari POST ke PUT
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  const token = request.headers.get("Authorization");

  if (!token) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Backend URL dari .env
  const backendUrl = `${process.env.API_BASE_URL}/api/notifications/update/${id}`;

  try {
    const res = await fetch(backendUrl, {
      method: "PUT", // PERUBAHAN: Gunakan PUT ke Backend
      headers: {
        "Authorization": token,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return NextResponse.json(
        { message: "Gagal update status notifikasi di backend" },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error("Error updating notification:", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}