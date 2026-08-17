import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const TIMEOUT_MS = 8000

async function fetchWithTimeout(url: string, opts?: RequestInit) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(id)
  }
}

async function exchangeAndSave(code: string, origin: string) {
  const clientId = process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || `${origin}/api/instagram/callback`

  console.log("[callback] env check:", { clientId: !!clientId, clientSecret: !!clientSecret, redirectUri })

  if (!clientId || !clientSecret) {
    throw new Error("Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET")
  }

  const tokenParams = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  })

  const tokenRes = await fetchWithTimeout("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  })

  const tokenData = await tokenRes.json()

  if (!tokenRes.ok || tokenData.error_message) {
    console.error("[callback] Token Error:", JSON.stringify(tokenData))
    throw new Error(tokenData.error_message || `Token exchange failed (${tokenRes.status})`)
  }

  const shortToken = tokenData.access_token
  const loginUserId = tokenData.user_id.toString()
  console.log("[callback] got short token for user:", loginUserId)

  let accessToken = shortToken
  let expiresIn = 5184000

  try {
    const longRes = await fetchWithTimeout(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
    )
    const longData = await longRes.json()
    if (longData.access_token) {
      accessToken = longData.access_token
      expiresIn = longData.expires_in || 5184000
    }
  } catch (e: any) {
    console.warn("[callback] long-lived token failed, using short token:", e.message)
  }

  let username = `user_${loginUserId}`
  let businessAccountId = loginUserId

  try {
    const meRes = await fetchWithTimeout(
      `https://graph.instagram.com/v24.0/me?fields=user_id,username&access_token=${accessToken}`
    )
    const meData = await meRes.json()
    console.log("[callback] /me:", JSON.stringify(meData))
    if (meData.username) username = meData.username
    if (meData.user_id) businessAccountId = meData.user_id.toString()
  } catch (e: any) {
    console.warn("[callback] /me failed:", e.message)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing Supabase env vars")
  }

  // ponytail: direct client avoids cookies() issues in route handlers
  const supabase = createClient(supabaseUrl, supabaseKey)

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

  if (upsertError) {
    console.error("[callback] Supabase upsert error:", JSON.stringify(upsertError))
    throw upsertError
  }

  console.log(`[callback] Saved: ${username} | id=${loginUserId}`)
  return { username, userId: loginUserId, expiresIn }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const origin = request.nextUrl.origin

  console.log("[callback] GET hit:", { hasCode: !!code, error, origin })

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, origin))
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 })
  }

  try {
    const result = await exchangeAndSave(code, origin)

    // Pass session via query params as fallback (cookies may not survive redirect)
    const dashUrl = new URL("/dashboard", origin)
    dashUrl.searchParams.set("ig_user_id", result.userId)
    dashUrl.searchParams.set("ig_username", result.username)
    const response = NextResponse.redirect(dashUrl)

    const cookieOpts = {
      path: "/",
      maxAge: result.expiresIn,
      sameSite: "lax" as const,
      secure: true,
      httpOnly: false,
    }
    response.cookies.set("ig_user_id", result.userId, cookieOpts)
    response.cookies.set("ig_username", result.username, cookieOpts)

    return response
  } catch (err: any) {
    console.error("[callback] FAILED:", err.message, err.stack)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(err.message)}`, origin))
  }
}
