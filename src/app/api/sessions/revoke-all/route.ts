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
        
        // Handle different response formats
        if (Array.isArray(data)) {
          sessions = data;
        } else if (data?.data && Array.isArray(data.data)) {
          sessions = data.data;
        } else if (data?.sessions && Array.isArray(data.sessions)) {
          sessions = data.sessions;
        }
        
        console.log(`📊 Found ${sessions.length} total sessions to revoke for user ${userId}`);
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
    // We revoke ALL sessions regardless of status to ensure complete sign-out
    if (sessions.length > 0) {
      const revokeResults = await Promise.allSettled(
        sessions.map(async (session: any) => {
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
            
            if (!revokeResponse.ok) {
              const errorText = await revokeResponse.text();
              console.error(`Failed to revoke session ${session.id}:`, revokeResponse.status, errorText);
              return { success: false, sessionId: session.id };
            }
            
            return { success: true, sessionId: session.id };
          } catch (error) {
            console.error(`Error revoking session ${session.id}:`, error);
            return { success: false, sessionId: session.id };
          }
        })
      );
      
      const successful = revokeResults.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = revokeResults.length - successful;
      
      console.log(`✅ Revoked ${successful} sessions for user ${userId}${failed > 0 ? ` (${failed} failed)` : ''}`);
      
      if (failed > 0) {
        console.warn(`⚠️ Some sessions failed to revoke. This might be normal if they were already revoked.`);
      }
    } else {
      console.log(`ℹ️ No sessions found to revoke for user ${userId}`);
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
