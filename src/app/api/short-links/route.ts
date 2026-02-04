import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createShortLink, getAllShortLinks } from "@/lib/db";

// POST - Create a new short link
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Ensure URL has protocol
    let originalUrl = url.trim();
    if (!originalUrl.startsWith('http://') && !originalUrl.startsWith('https://')) {
      originalUrl = 'https://' + originalUrl;
    }

    const shortLink = await createShortLink(originalUrl, userId);

    return NextResponse.json(shortLink, { status: 201 });
  } catch (error: any) {
    console.error("Error creating short link:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create short link" },
      { status: 500 }
    );
  }
}

// GET - Get all short links with pagination
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const result = await getAllShortLinks(page, limit, userId);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching short links:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch short links" },
      { status: 500 }
    );
  }
}
