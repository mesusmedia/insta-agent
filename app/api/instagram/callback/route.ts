import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

async function exchangeAndSave(code: string, request: NextRequest) {
  const clientId = process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Env Vars")
  }

  // 1. Exchange code for short token via Facebook Graph API
  const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${encodeURIComponent(code)}`
  const tokenRes = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()

  if (tokenData.error) {
    console.error("[callback] Token Error:", JSON.stringify(tokenData))
    throw new Error(tokenData.error.message || "Token exchange failed")
  }

  const shortToken = tokenData.access_token

  // 2. Exchange for long-lived token (60 days)
  const longUrl = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`
  const longRes = await fetch(longUrl)
  const longData = await longRes.json()
  const longToken = longData.access_token || shortToken
  const expiresIn = longData.expires_in || 5184000

  // 3. Get Facebook Pages
  const pagesRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?access_token=${longToken}`)
  const pagesData = await pagesRes.json()
  console.log("[callback] Pages found:", pagesData.data?.length || 0)

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found")
  }

  // 4. Find Instagram Business Accounts
  const igAccounts: Array<{ igAccountId: string; username: string; pageAccessToken: string }> = []

  for (const page of pagesData.data) {
    const igRes = await fetch(`https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
    const igData = await igRes.json()

    if (igData.instagram_business_account) {
      const igId = igData.instagram_business_account.id
      const profileRes = await fetch(`https://graph.facebook.com/v24.0/${igId}?fields=username,name&access_token=${page.access_token}`)
      const profileData = await profileRes.json()

      igAccounts.push({
        igAccountId: igId,
        username: profileData.username || page.name,
        pageAccessToken: page.access_token,
      })
    }
  }

  if (igAccounts.length === 0) {
    throw new Error("No Instagram Business account found")
  }

  // 5. Use first account (or selected one in future)
  const chosen = igAccounts[0]

  // 6. Save to Supabase
  const supabase = await getSupabaseServerClient()

  const updates: any = {
    username: chosen.username,
    access_token: chosen.pageAccessToken,
    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    business_account_id: chosen.igAccountId,
    page_id: chosen.igAccountId,
  }

  console.log(`[callback] Saving: ${chosen.username} | ig_id=${chosen.igAccountId}`)

  const { error: upsertError } = await supabase
    .from("users")
    .upsert({ id: chosen.igAccountId, ...updates }, { onConflict: "id" })

  if (upsertError) throw upsertError

  return { username: chosen.username, userId: chosen.igAccountId, expiresIn }
}

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
    try {
      // Exchange token directly in GET — avoids code corruption from redirects
      const result = await exchangeAndSave(code, request)

      const redirectUrl = new URL("/dashboard", request.url)
      const response = NextResponse.redirect(redirectUrl)

      // Set session cookie
      response.cookies.set("insta_session", JSON.stringify({
        username: result.username,
        userId: result.userId,
      }), {
        path: "/",
        maxAge: result.expiresIn,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })

      // Set individual cookies for the hook to read
      response.cookies.set("ig_user_id", result.userId, {
        path: "/",
        maxAge: result.expiresIn,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })
      response.cookies.set("ig_username", result.username, {
        path: "/",
        maxAge: result.expiresIn,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      })

      return response
    } catch (err: any) {
      console.error("[callback] GET exchange failed:", err.message)
      const redirectUrl = new URL("/", request.url)
      redirectUrl.searchParams.set("error", err.message)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { code } = body
    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 })

    const result = await exchangeAndSave(code, request)

    const response = NextResponse.json({ success: true, username: result.username, userId: result.userId })
    response.cookies.set("insta_session", JSON.stringify({
      username: result.username,
      userId: result.userId,
    }), {
      path: "/",
      maxAge: result.expiresIn,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    })
    return response

  } catch (error: any) {
    console.error("[callback] POST Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
