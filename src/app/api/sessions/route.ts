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
        let allSessions: any[] = [];
        if (Array.isArray(data)) {
          allSessions = data;
        } else if (data?.data && Array.isArray(data.data)) {
          allSessions = data.data;
        } else if (data?.sessions && Array.isArray(data.sessions)) {
          allSessions = data.sessions;
        }
        
        console.log(`📊 Found ${allSessions.length} total sessions for user ${userId}`);
        
        // Filter for only ACTIVE sessions
        // Sessions can have status: active, ended, expired, removed, replaced, revoked, abandoned, pending
        // We only want to show "active" sessions that haven't expired
        const now = Date.now();
        const inactiveStatuses = ['ended', 'expired', 'removed', 'replaced', 'revoked', 'abandoned'];
        
        sessions = allSessions.filter((session: any) => {
          const status = (session.status || session.state || '').toLowerCase();
          const expireAt = session.expire_at || session.expireAt;
          
          // Explicitly exclude sessions with inactive statuses
          if (status && inactiveStatuses.includes(status)) {
            return false;
          }
          
          // Only include sessions with status "active" or no status (which might indicate active in some API versions)
          const isActive = status === 'active' || status === '' || status === undefined;
          
          // Also check if session hasn't expired
          let isNotExpired = true;
          if (expireAt) {
            const expireTime = typeof expireAt === 'number' ? expireAt : new Date(expireAt).getTime();
            isNotExpired = expireTime > now;
          }
          
          return isActive && isNotExpired;
        });
        
        console.log(`✅ Filtered to ${sessions.length} active sessions (removed ${allSessions.length - sessions.length} inactive/expired sessions)`);
        
        if (sessions.length > 0) {
          console.log("📋 Active sessions details:", sessions.map((s: any) => ({
            id: s.id,
            status: s.status || s.state,
            lastActive: s.last_active_at || s.lastActiveAt || s.lastActive,
            expireAt: s.expire_at || s.expireAt,
          })));
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
        status: session.status || session.state || "active",
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
