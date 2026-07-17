import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  if (error) {
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("error", error)
    return NextResponse.redirect(redirectUrl)
  }

  if (code) {
    const redirectUrl = new URL("/", request.url)
    redirectUrl.searchParams.set("code", code)
    return NextResponse.redirect(redirectUrl)
  }

  return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 })

    // 1. Env Vars — Facebook App credentials (NOT Instagram App ID)
    const clientId = process.env.INSTAGRAM_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Env Vars: Check INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI")
    }

    // 2. Exchange Code for Short-Lived Token via Facebook Graph API
    const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`

    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error("[callback] Token Error:", JSON.stringify(tokenData, null, 2))
      return NextResponse.json({ error: tokenData.error.message || "Token exchange failed" }, { status: 400 })
    }

    const shortToken = tokenData.access_token

    // 3. Exchange for Long-Lived Token (60 days)
    const longUrl = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`
    const longRes = await fetch(longUrl)
    const longData = await longRes.json()
    const longToken = longData.access_token || shortToken
    const expiresIn = longData.expires_in || 5184000

    // 4. Get user's Facebook Pages
    const pagesRes = await fetch(
      `https://graph.facebook.com/v24.0/me/accounts?access_token=${longToken}`
    )
    const pagesData = await pagesRes.json()
    console.log("[callback] Pages:", JSON.stringify(pagesData))

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json({ error: "No Facebook Pages found. Your Instagram account must be connected to a Facebook Page." }, { status: 400 })
    }

    // 5. Find Instagram Business Account from Pages
    let igAccountId: string | null = null
    let igUsername = ""
    let pageAccessToken = ""

    for (const page of pagesData.data) {
      const igRes = await fetch(
        `https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`
      )
      const igData = await igRes.json()
      console.log(`[callback] Page ${page.name} (${page.id}) IG:`, JSON.stringify(igData))

      if (igData.instagram_business_account) {
        igAccountId = igData.instagram_business_account.id
        pageAccessToken = page.access_token

        // Get Instagram username
        const profileRes = await fetch(
          `https://graph.facebook.com/v24.0/${igAccountId}?fields=username,name,profile_picture_url&access_token=${page.access_token}`
        )
        const profileData = await profileRes.json()
        console.log("[callback] IG Profile:", JSON.stringify(profileData))
        igUsername = profileData.username || page.name
        break
      }
    }

    if (!igAccountId) {
      return NextResponse.json({
        error: "No Instagram Business account found on your Pages. Make sure your Instagram is connected to a Facebook Page as a Business or Creator account."
      }, { status: 400 })
    }

    // 6. Save/Update User in Supabase
    const supabase = await getSupabaseServerClient()

    const updates: any = {
      username: igUsername,
      access_token: pageAccessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      business_account_id: igAccountId,
      page_id: igAccountId,
    }

    console.log(`[callback] Saving: ${igUsername} | ig_id=${igAccountId}`)

    const { error: upsertError } = await supabase
      .from("users")
      .upsert({ id: igAccountId, ...updates }, { onConflict: "id" })

    if (upsertError) throw upsertError

    const response = NextResponse.json({ success: true, username: igUsername, userId: igAccountId })
    response.cookies.set("insta_session", JSON.stringify({ username: igUsername, userId: igAccountId }), {
      path: "/",
      maxAge: expiresIn,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    return response

  } catch (error: any) {
    console.error("[callback] Error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
