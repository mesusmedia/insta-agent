import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

// POST — simula um evento de comentário para testar o processamento do webhook
export async function POST(request: NextRequest) {
  try {
    const { userId, commentText = "teste" } = await request.json()
    if (!userId) return NextResponse.json({ error: "Missing userId" }, { status: 400 })

    const supabase = await getSupabaseServerClient()
    const { data: user } = await supabase
      .from("users")
      .select("id, business_account_id, page_id, username")
      .eq("id", userId)
      .single()

    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

    const accountId = user.business_account_id || user.page_id || userId

    // Build a realistic Instagram comment webhook payload
    const testPayload = {
      object: "instagram",
      entry: [
        {
          id: accountId,
          time: Math.floor(Date.now() / 1000),
          changes: [
            {
              field: "comments",
              value: {
                id: `test_comment_${Date.now()}`,
                text: commentText,
                from: {
                  id: "999999999999999",
                  username: "test_user",
                },
                media: {
                  id: "test_media_123",
                  media_product_type: "POST",
                },
                parent_id: null,
              },
            },
          ],
        },
      ],
    }

    // Call our own webhook endpoint
    const origin = request.nextUrl.origin
    const webhookRes = await fetch(`${origin}/api/instagram/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
    })
    const webhookData = await webhookRes.json()

    return NextResponse.json({
      ok: true,
      message: "Test webhook sent",
      payload: testPayload,
      webhook_response: webhookData,
      account_id_used: accountId,
    })
  } catch (error) {
    console.error("[webhook/test] error:", error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
