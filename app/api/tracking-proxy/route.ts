import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = "https://fermentable-nonarchitecturally-brittney.ngrok-free.dev";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const uuid = searchParams.get("uuid");

    if (!uuid) {
        return NextResponse.json({ message: "UUID is required" }, { status: 400 });
    }

    try {
        const res = await fetch(`${BACKEND_URL}/api/tracking/uuid/${uuid}`, {
            headers: {
                "ngrok-skip-browser-warning": "true",
                "Accept": "application/json"
            }
        });

        if (!res.ok) {
            return NextResponse.json(
                { message: `Error from backend: ${res.status}` },
                { status: res.status }
            );
        }

        const data = await res.json();
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json(
            { message: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}