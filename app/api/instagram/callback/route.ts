import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase-server"

async function exchangeAndSave(code: string) {
  const clientId = process.env.INSTAGRAM_APP_ID
  const clientSecret = process.env.INSTAGRAM_APP_SECRET
  const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Env Vars")
  }

  // 1. Exchange code via Facebook Graph API
  const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${encodeURIComponent(code)}`
  const tokenRes = await fetch(tokenUrl)
  const tokenData = await tokenRes.json()

  if (tokenData.error) {
    console.error("[callback] Token Error:", JSON.stringify(tokenData))
    throw new Error(tokenData.error.message || "Token exchange failed")
  }

  const shortToken = tokenData.access_token

  // 2. Long-lived token (60 days)
  const longUrl = `https://graph.facebook.com/v24.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${clientId}&client_secret=${clientSecret}&fb_exchange_token=${shortToken}`
  const longRes = await fetch(longUrl)
  const longData = await longRes.json()
  const longToken = longData.access_token || shortToken
  const expiresIn = longData.expires_in || 5184000

  // 3. Get Facebook Pages
  const pagesRes = await fetch(`https://graph.facebook.com/v24.0/me/accounts?access_token=${longToken}`)
  const pagesData = await pagesRes.json()

  if (!pagesData.data || pagesData.data.length === 0) {
    throw new Error("No Facebook Pages found")
  }

  // 4. Find ALL Instagram Business Accounts
  const igAccounts: Array<{ igAccountId: string; username: string; profilePicture: string; pageAccessToken: string; pageName: string }> = []

  for (const page of pagesData.data) {
    const igRes = await fetch(`https://graph.facebook.com/v24.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`)
    const igData = await igRes.json()

    if (igData.instagram_business_account) {
      const igId = igData.instagram_business_account.id
      const profileRes = await fetch(`https://graph.facebook.com/v24.0/${igId}?fields=username,name,profile_picture_url&access_token=${page.access_token}`)
      const profileData = await profileRes.json()

      igAccounts.push({
        igAccountId: igId,
        username: profileData.username || page.name,
        profilePicture: profileData.profile_picture_url || "",
        pageAccessToken: page.access_token,
        pageName: page.name,
      })
    }
  }

  if (igAccounts.length === 0) {
    throw new Error("No Instagram Business account found")
  }

  console.log(`[callback] Found ${igAccounts.length} IG accounts:`, igAccounts.map(a => a.username))

  return { igAccounts, expiresIn }
}

async function saveAccount(account: { igAccountId: string; username: string; pageAccessToken: string }, expiresIn: number) {
  const supabase = await getSupabaseServerClient()

  const updates: any = {
    username: account.username,
    access_token: account.pageAccessToken,
    token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    business_account_id: account.igAccountId,
    page_id: account.igAccountId,
  }

  console.log(`[callback] Saving: ${account.username} | ig_id=${account.igAccountId}`)

  const { error: upsertError } = await supabase
    .from("users")
    .upsert({ id: account.igAccountId, ...updates }, { onConflict: "id" })

  if (upsertError) throw upsertError

  return { username: account.username, userId: account.igAccountId, expiresIn }
}

function setSessionCookies(response: NextResponse, username: string, userId: string, expiresIn: number) {
  const cookieOpts = {
    path: "/",
    maxAge: expiresIn,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  }
  response.cookies.set("insta_session", JSON.stringify({ username, userId }), cookieOpts)
  response.cookies.set("ig_user_id", userId, cookieOpts)
  response.cookies.set("ig_username", username, cookieOpts)
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
      const { igAccounts, expiresIn } = await exchangeAndSave(code)

      if (igAccounts.length === 1) {
        // Single account — save and redirect
        const result = await saveAccount(igAccounts[0], expiresIn)
        const response = NextResponse.redirect(new URL("/dashboard", request.url))
        setSessionCookies(response, result.username, result.userId, result.expiresIn)
        return response
      }

      // Multiple accounts — redirect to selector page
      const redirectUrl = new URL("/select-account", request.url)
      const response = NextResponse.redirect(redirectUrl)
      // Store accounts in cookie for selector page
      response.cookies.set("pending_accounts", JSON.stringify(igAccounts.map(a => ({
        id: a.igAccountId,
        username: a.username,
        pic: a.profilePicture,
        page: a.pageName,
      }))), { path: "/", maxAge: 300, sameSite: "lax" })
      // Store tokens temporarily
      response.cookies.set("pending_tokens", JSON.stringify(igAccounts.map(a => ({
        id: a.igAccountId,
        token: a.pageAccessToken,
      }))), { path: "/", maxAge: 300, sameSite: "lax", httpOnly: true })
      response.cookies.set("pending_expires", expiresIn.toString(), { path: "/", maxAge: 300 })
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { selectedAccountId } = body

    if (!selectedAccountId) {
      return NextResponse.json({ error: "No account selected" }, { status: 400 })
    }

    // Read pending tokens from cookie
    const tokensCookie = request.cookies.get("pending_tokens")?.value
    const expiresCookie = request.cookies.get("pending_expires")?.value

    if (!tokensCookie || !expiresCookie) {
      return NextResponse.json({ error: "Session expired. Please login again." }, { status: 400 })
    }

    const tokens = JSON.parse(tokensCookie)
    const expiresIn = parseInt(expiresCookie)
    const selected = tokens.find((t: any) => t.id === selectedAccountId)

    if (!selected) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 })
    }

    // Get username
    const profileRes = await fetch(`https://graph.facebook.com/v24.0/${selectedAccountId}?fields=username&access_token=${selected.token}`)
    const profileData = await profileRes.json()

    const result = await saveAccount({
      igAccountId: selectedAccountId,
      username: profileData.username || "user",
      pageAccessToken: selected.token,
    }, expiresIn)

    const response = NextResponse.json({ success: true, username: result.username, userId: result.userId })
    setSessionCookies(response, result.username, result.userId, result.expiresIn)

    // Clear pending cookies
    response.cookies.set("pending_accounts", "", { path: "/", maxAge: 0 })
    response.cookies.set("pending_tokens", "", { path: "/", maxAge: 0 })
    response.cookies.set("pending_expires", "", { path: "/", maxAge: 0 })

    return response
  } catch (error: any) {
    console.error("[callback] POST Error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
