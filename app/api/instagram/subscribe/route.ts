import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"
import { subscribeToWebhooks } from "@/lib/instagram-api"

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase
      .from("users")
      .select("access_token, username")
      .eq("id", userId)
      .single()

    if (!user?.access_token) {
      return NextResponse.json({ error: "User not found or no token" }, { status: 404 })
    }

    const result = await subscribeToWebhooks(user.access_token)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ ok: true, username: user.username })
  } catch (error) {
    console.error("[subscribe] error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
