import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  console.log("✅ HIT: Route Handler /api/user/delete/ttd terpanggil!");

  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader) {
      return NextResponse.json(
        { success: false, message: "Unauthorized: Token missing" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const API_BASE_URL = process.env.API_BASE_URL || "https://fermentable-nonarchitecturally-brittney.ngrok-free.dev";
    
    const backendEndpoint = `${API_BASE_URL}/api/user/delete/ttd`;

    console.log("🚀 Fetching to Backend:", backendEndpoint);
    console.log("📦 Payload:", JSON.stringify(body));

    const res = await fetch(backendEndpoint, {
      method: "DELETE",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });

    
    const responseText = await res.text();
    
    console.log(`⚠️ STATUS DARI BACKEND: ${res.status} ${res.statusText}`);
    console.log("📄 ISI RESPONS BACKEND:", responseText);

    try {
        const jsonBody = JSON.parse(responseText);
        return NextResponse.json(jsonBody, { status: res.status });
    } catch (e) {
        return new NextResponse(responseText, { 
            status: res.status,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

  } catch (error: any) {
    console.error("❌ Error in Next.js Proxy:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}