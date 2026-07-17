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
    const { code, selectedAccountId } = body
    if (!code) return NextResponse.json({ error: "No code" }, { status: 400 })

    const clientId = process.env.INSTAGRAM_APP_ID
    const clientSecret = process.env.INSTAGRAM_APP_SECRET
    const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing Env Vars")
    }

    // 1. Exchange code for short token via Facebook Graph API
    const tokenUrl = `https://graph.facebook.com/v24.0/oauth/access_token?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${clientSecret}&code=${code}`
    const tokenRes = await fetch(tokenUrl)
    const tokenData = await tokenRes.json()

    if (tokenData.error) {
      console.error("[callback] Token Error:", JSON.stringify(tokenData))
      return NextResponse.json({ error: tokenData.error.message || "Token exchange failed" }, { status: 400 })
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
    console.log("[callback] Pages:", JSON.stringify(pagesData))

    if (!pagesData.data || pagesData.data.length === 0) {
      return NextResponse.json({ error: "No Facebook Pages found. Instagram must be connected to a Facebook Page." }, { status: 400 })
    }

    // 4. Find ALL Instagram Business Accounts from Pages
    const igAccounts: Array<{ igAccountId: string; username: string; name: string; profilePicture: string; pageAccessToken: string; pageName: string }> = []

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
          name: profileData.name || page.name,
          profilePicture: profileData.profile_picture_url || "",
          pageAccessToken: page.access_token,
          pageName: page.name,
        })
      }
    }

    if (igAccounts.length === 0) {
      return NextResponse.json({ error: "No Instagram Business account found on your Pages." }, { status: 400 })
    }

    // 5. If multiple accounts and no selection yet, return list for user to choose
    if (igAccounts.length > 1 && !selectedAccountId) {
      return NextResponse.json({
        needsSelection: true,
        accounts: igAccounts.map(a => ({
          igAccountId: a.igAccountId,
          username: a.username,
          name: a.name,
          profilePicture: a.profilePicture,
          pageName: a.pageName,
        })),
        // Pass token data so frontend can re-send without re-exchanging code
        tokenData: { longToken, expiresIn },
      })
    }

    // 6. Pick the selected account or the only one
    const chosen = selectedAccountId
      ? igAccounts.find(a => a.igAccountId === selectedAccountId) || igAccounts[0]
      : igAccounts[0]

    // 7. Save to Supabase
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

    const response = NextResponse.json({ success: true, username: chosen.username, userId: chosen.igAccountId })
    response.cookies.set("insta_session", JSON.stringify({ username: chosen.username, userId: chosen.igAccountId }), {
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
