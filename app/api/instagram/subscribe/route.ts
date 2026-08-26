import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

const GRAPH = "https://graph.instagram.com/v24.0"

async function getToken(userId: string) {
  const supabase = await getSupabaseServerClient()
  const { data: user } = await supabase
    .from("users")
    .select("access_token, username, business_account_id, page_id")
    .eq("id", userId)
    .single()
  return user
}

// GET — diagnóstico: mostra subscrição atual + dados do usuário no banco
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId")
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const user = await getToken(userId)
    if (!user?.access_token) return NextResponse.json({ error: "No token" }, { status: 404 })

    // Check current webhook subscriptions
    const res = await fetch(
      `${GRAPH}/me/subscribed_apps?access_token=${encodeURIComponent(user.access_token)}`
    )
    const data = await res.json()

    // Also check /me to see what account we're dealing with
    const meRes = await fetch(
      `${GRAPH}/me?fields=id,username&access_token=${encodeURIComponent(user.access_token)}`
    )
    const meData = await meRes.json()

    return NextResponse.json({
      db_user: {
        id: userId,
        username: user.username,
        business_account_id: user.business_account_id,
        page_id: user.page_id,
      },
      instagram_me: meData,
      subscribed_apps: data,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST — ativa subscrição de webhook para a conta
export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const user = await getToken(userId)
    if (!user?.access_token) {
      return NextResponse.json({ error: "User not found or no token" }, { status: 404 })
    }

    // Try subscribing via graph.instagram.com (Instagram Login flow)
    const res = await fetch(
      `${GRAPH}/me/subscribed_apps?subscribed_fields=comments,messages,mentions&access_token=${encodeURIComponent(user.access_token)}`,
      { method: "POST" },
    )
    const data = await res.json()
    console.log("[subscribe] POST /me/subscribed_apps response:", JSON.stringify(data))

    if (data.error) {
      return NextResponse.json({ ok: false, error: data.error, raw: data }, { status: 400 })
    }

    return NextResponse.json({ ok: true, username: user.username, raw: data })
  } catch (error) {
    console.error("[subscribe] error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
