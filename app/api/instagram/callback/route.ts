import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

async function exchangeAndSave(code: string) {
  const clientId = process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Env Vars")
  }

  // 1. Exchange code via Instagram API
  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  })

  const tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || tokenData.error_message) {
    console.error("[callback] Token Error:", JSON.stringify(tokenData))
    throw new Error(tokenData.error_message || "Token exchange failed")
  }

  const shortToken = tokenData.access_token
  const loginUserId = tokenData.user_id.toString()

  // 2. Long-lived token (60 days)
  const longUrl = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
  const longRes = await fetch(longUrl)
  const longData = await longRes.json()
  const accessToken = longData.access_token || shortToken
  const expiresIn = longData.expires_in || 5184000

  // 3. Get username
  let username = `user_${loginUserId}`
  let businessAccountId = loginUserId

  try {
    const meRes = await fetch(`https://graph.instagram.com/v24.0/me?fields=user_id,username&access_token=${accessToken}`)
    const meData = await meRes.json()
    console.log("[callback] /me:", JSON.stringify(meData))
    if (meData.username) username = meData.username
    if (meData.user_id) businessAccountId = meData.user_id.toString()
  } catch (e) {
    console.error("[callback] /me failed:", e)
  }

  // 4. Save to Supabase
  const supabase = await getSupabaseServerClient()

  const { error: upsertError } = await supabase
    .from("users")
    .upsert({
      id: loginUserId,
      username,
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      updated_at: new Date().toISOString(),
      business_account_id: businessAccountId,
      page_id: businessAccountId,
    }, { onConflict: "id" })

  if (upsertError) throw upsertError

  console.log(`[callback] Saved: ${username} | id=${loginUserId}`)
  return { username, userId: loginUserId, expiresIn }
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
      const result = await exchangeAndSave(code)
      const response = NextResponse.redirect(new URL("/dashboard", request.url))

      const cookieOpts = {
        path: "/",
        maxAge: result.expiresIn,
        sameSite: "lax" as const,
        secure: process.env.NODE_ENV === "production",
      }
      response.cookies.set("insta_session", JSON.stringify({ username: result.username, userId: result.userId }), cookieOpts)
      response.cookies.set("ig_user_id", result.userId, cookieOpts)
      response.cookies.set("ig_username", result.username, cookieOpts)

      return response
    } catch (err: any) {
      console.error("[callback] GET failed:", err.message)
      const redirectUrl = new URL("/", request.url)
      redirectUrl.searchParams.set("error", err.message)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.json({ error: "Invalid callback" }, { status: 400 })
}
