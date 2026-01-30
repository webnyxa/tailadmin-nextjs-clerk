import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use Clerk Backend API directly via HTTP
    // In Clerk v6, clerkClient.sessions might not be available
    // So we'll use the Backend API directly
    const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
    
    if (!CLERK_SECRET_KEY) {
      console.error("CLERK_SECRET_KEY is not set");
      return NextResponse.json({ sessions: [] }, { status: 200 });
    }

    let sessions: any[] = [];
    
    try {
      // Use Clerk Backend API v1 to get user sessions
      // Correct endpoint: GET /v1/sessions?user_id={userId}
      console.log("🔍 Fetching sessions for userId:", userId);
      console.log("🔍 Using CLERK_SECRET_KEY:", CLERK_SECRET_KEY ? `${CLERK_SECRET_KEY.substring(0, 10)}...` : "NOT SET");
      
      const apiUrl = `https://api.clerk.com/v1/sessions?user_id=${userId}`;
      console.log("🔍 API URL:", apiUrl);
      
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${CLERK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      });

      console.log("🔍 Response status:", response.status);
      console.log("🔍 Response ok:", response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log("🔍 Raw API response:", JSON.stringify(data, null, 2));
        
        // Clerk API might return data in different formats
        if (Array.isArray(data)) {
          sessions = data;
        } else if (data?.data && Array.isArray(data.data)) {
          sessions = data.data;
        } else if (data?.sessions && Array.isArray(data.sessions)) {
          sessions = data.sessions;
        } else {
          sessions = [];
        }
        
        console.log(`✅ Found ${sessions.length} sessions for user ${userId}`);
        if (sessions.length > 0) {
          console.log("📋 Sessions details:", sessions.map((s: any) => ({
            id: s.id,
            lastActive: s.last_active_at || s.lastActiveAt || s.lastActive,
            expireAt: s.expire_at || s.expireAt || s.expireAt,
          })));
        } else {
          console.log("⚠️ No sessions found. This might be normal if:");
          console.log("   - User just logged in");
          console.log("   - Sessions haven't been created yet");
          console.log("   - Check Clerk Dashboard → Users → Sessions tab");
        }
      } else {
        const errorData = await response.text();
        console.error("❌ Clerk API error:", response.status);
        console.error("❌ Error response:", errorData);
        sessions = [];
      }
    } catch (apiError: any) {
      console.error("❌ Error calling Clerk Backend API:", apiError);
      console.error("❌ Error message:", apiError?.message);
      console.error("❌ Error stack:", apiError?.stack);
      sessions = [];
    }

    return NextResponse.json({
      sessions: sessions.map((session: any) => ({
        id: session.id,
        lastActiveAt: session.last_active_at || session.lastActiveAt,
        lastActiveOrganizationId: session.last_active_organization_id || session.lastActiveOrganizationId || null,
        actor: session.actor || null,
        expireAt: session.expire_at || session.expireAt,
      })),
    });
  } catch (error: any) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { 
        error: error?.message || "Failed to fetch sessions",
        sessions: [] // Always return sessions array even on error
      },
      { status: 500 }
    );
  }
}
