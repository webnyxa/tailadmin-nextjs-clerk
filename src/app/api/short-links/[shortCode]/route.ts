import { NextResponse } from "next/server";
import { getShortLinkByCode } from "@/lib/db";

// GET - Redirect to original URL
export async function GET(
  request: Request,
  { params }: { params: { shortCode: string } }
) {
  try {
    const { shortCode } = params;

    if (!shortCode) {
      return NextResponse.json(
        { error: "Short code is required" },
        { status: 400 }
      );
    }

    const shortLink = getShortLinkByCode(shortCode);

    if (!shortLink) {
      return NextResponse.json(
        { error: "Short link not found" },
        { status: 404 }
      );
    }

    // Redirect to original URL
    return NextResponse.redirect(shortLink.originalUrl);
  } catch (error: any) {
    console.error("Error redirecting:", error);
    return NextResponse.json(
      { error: "Failed to redirect" },
      { status: 500 }
    );
  }
}
