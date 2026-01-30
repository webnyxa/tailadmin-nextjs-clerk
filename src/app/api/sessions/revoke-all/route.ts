import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    
    if (!CLERK_SECRET_KEY) {
      return NextResponse.json(
        { error: "CLERK_SECRET_KEY is not set" },
        { status: 500 }
      );
    }

    // Get all sessions using Clerk Backend API
    let sessions: any[] = [];
    
    try {
      // Use correct endpoint: GET /v1/sessions?user_id={userId}
      const response = await fetch(
        `https://api.clerk.com/v1/sessions?user_id=${userId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${CLERK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        sessions = Array.isArray(data) ? data : [];
      } else {
        const errorData = await response.text();
        console.error("Clerk API error:", response.status, errorData);
        return NextResponse.json(
          { error: "Failed to fetch sessions for revocation" },
          { status: 500 }
        );
      }
    } catch (apiError: any) {
      console.error("Error fetching sessions for revocation:", apiError);
      return NextResponse.json(
        { error: "Failed to fetch sessions for revocation" },
        { status: 500 }
      );
    }

    // Revoke all sessions using Clerk Backend API
    if (sessions.length > 0) {
      const revokePromises = sessions.map(async (session: any) => {
        try {
          const revokeResponse = await fetch(
            `https://api.clerk.com/v1/sessions/${session.id}/revoke`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${CLERK_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
            }
          );
          return revokeResponse.ok;
        } catch (error) {
          console.error(`Error revoking session ${session.id}:`, error);
          return false;
        }
      });
      
      await Promise.all(revokePromises);
      console.log(`Revoked ${sessions.length} sessions for user ${userId}`);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error revoking sessions:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to revoke sessions" },
      { status: 500 }
    );
  }
}
