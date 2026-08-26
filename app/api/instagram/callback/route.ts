import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { subscribeToWebhooks } from "@/lib/instagram-api"

export const runtime = "nodejs"

async function exchangeAndSave(code: string, origin: string) {
  const clientId = process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI || `${origin}/api/instagram/callback`

  console.log("[callback] env check:", {
    clientId: !!clientId,
    clientSecret: !!clientSecret,
    redirectUri,
    origin,
  })

  if (!clientId || !clientSecret) {
    throw new Error("Missing INSTAGRAM_APP_ID or INSTAGRAM_APP_SECRET")
  }

  // Step 1: Exchange code for short-lived token
  console.log("[callback] step 1: exchanging code...")
  const tokenBody = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    redirect_uri: redirectUri,
    code,
  })

  let tokenRes: Response
  try {
    tokenRes = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody.toString(),
    })
  } catch (fetchErr: any) {
    console.error("[callback] step 1 fetch error:", fetchErr.message, fetchErr.cause)
    throw new Error(`Instagram token fetch failed: ${fetchErr.message}`)
  }

  const tokenText = await tokenRes.text()
  console.log("[callback] step 1 response:", tokenRes.status, tokenText.slice(0, 500))

  let tokenData: any
  try {
    tokenData = JSON.parse(tokenText)
  } catch {
    throw new Error(`Instagram returned non-JSON: ${tokenText.slice(0, 200)}`)
  }

  if (!tokenRes.ok || tokenData.error_message) {
    throw new Error(tokenData.error_message || `Token exchange failed (${tokenRes.status})`)
  }

  const shortToken = tokenData.access_token
  const loginUserId = tokenData.user_id.toString()
  console.log("[callback] step 1 OK, user:", loginUserId)

  // Step 2: Long-lived token (optional, fallback to short)
  let accessToken = shortToken
  let expiresIn = 5184000

  try {
    console.log("[callback] step 2: long-lived token...")
    const longRes = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`
    )
    const longData = await longRes.json()
    if (longData.access_token) {
      accessToken = longData.access_token
      expiresIn = longData.expires_in || 5184000
      console.log("[callback] step 2 OK")
    }
  } catch (e: any) {
    console.warn("[callback] step 2 failed (using short token):", e.message)
  }

  // Step 3: Get username (optional)
  let username = `user_${loginUserId}`
  let businessAccountId = loginUserId

  try {
    console.log("[callback] step 3: getting username...")
    const meRes = await fetch(
      `https://graph.instagram.com/v24.0/me?fields=user_id,username&access_token=${accessToken}`
    )
    const meData = await meRes.json()
    console.log("[callback] step 3 /me:", JSON.stringify(meData))
    if (meData.username) username = meData.username
    if (meData.user_id) businessAccountId = meData.user_id.toString()
  } catch (e: any) {
    console.warn("[callback] step 3 failed:", e.message)
  }

  // Step 4: Save to Supabase (non-blocking — login works even if this fails)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (supabaseUrl && supabaseKey) {
    try {
      console.log("[callback] step 4: saving to supabase...", supabaseUrl.slice(0, 30))
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
        console.error("[callback] step 4 supabase error:", JSON.stringify(upsertError))
      } else {
        console.log("[callback] step 4 OK")
      }

      // Step 5: Subscribe to Instagram webhooks for this account
      try {
        console.log("[callback] step 5: subscribing to webhooks...")
        const subResult = await subscribeToWebhooks(accessToken)
        if (subResult.ok) {
          console.log("[callback] step 5 OK — webhook subscription active")
        } else {
          console.warn("[callback] step 5 webhook subscription failed:", subResult.error)
        }
      } catch (e: any) {
        console.warn("[callback] step 5 failed (non-blocking):", e.message)
      }
    } catch (e: any) {
      console.error("[callback] step 4 supabase failed:", e.message)
    }
  } else {
    console.warn("[callback] step 4 skipped: missing SUPABASE env vars")
  }

  console.log(`[callback] DONE: ${username} | id=${loginUserId}`)
  return { username, userId: loginUserId, expiresIn }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const error = searchParams.get("error")
  const origin = request.nextUrl.origin

  console.log("[callback] GET:", { hasCode: !!code, error, origin })

  if (error) {
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(error)}`, origin))
  }

  if (!code) {
    return NextResponse.json({ error: "Missing code parameter" }, { status: 400 })
  }

  try {
    const result = await exchangeAndSave(code, origin)

    const dashUrl = new URL("/dashboard", origin)
    dashUrl.searchParams.set("ig_user_id", result.userId)
    dashUrl.searchParams.set("ig_username", result.username)
    const response = NextResponse.redirect(dashUrl)

    response.cookies.set("ig_user_id", result.userId, {
      path: "/",
      maxAge: result.expiresIn,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    })
    response.cookies.set("ig_username", result.username, {
      path: "/",
      maxAge: result.expiresIn,
      sameSite: "lax",
      secure: true,
      httpOnly: false,
    })

    return response
  } catch (err: any) {
    console.error("[callback] FAILED:", err.message, err.stack)
    return NextResponse.redirect(new URL(`/?error=${encodeURIComponent(err.message)}`, origin))
  }
}
