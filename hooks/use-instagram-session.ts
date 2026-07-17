"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"

interface IgAccount {
    igAccountId: string
    username: string
    name: string
    profilePicture: string
    pageName: string
}

export function useInstagramSession() {
    const [username, setUsername] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [pendingAccounts, setPendingAccounts] = useState<IgAccount[] | null>(null)
    const [pendingCode, setPendingCode] = useState<string | null>(null)
    const [pendingTokenData, setPendingTokenData] = useState<any>(null)

    const searchParams = useSearchParams()
    const router = useRouter()

    useEffect(() => {
        const code = searchParams.get("code")

        const handleSession = async () => {
            // CASE A: New Login from Instagram
            if (code) {
                try {
                    const res = await fetch("/api/instagram/callback", {
                        method: "POST",
                        body: JSON.stringify({ code }),
                    })
                    const data = await res.json()

                    if (data.needsSelection) {
                        // Multiple accounts — show selector
                        setPendingAccounts(data.accounts)
                        setPendingCode(code)
                        setPendingTokenData(data.tokenData)
                        setIsLoading(false)
                        return
                    }

                    if (data.success) {
                        localStorage.setItem("ig_user_id", data.userId)
                        localStorage.setItem("ig_username", data.username)
                        setUserId(data.userId)
                        setUsername(data.username)
                        router.replace("/dashboard")
                    }
                } catch (err) {
                    console.error("Login failed:", err)
                }
            }
            // CASE B: Restore Session from LocalStorage
            else {
                const savedId = localStorage.getItem("ig_user_id")
                const savedName = localStorage.getItem("ig_username")

                if (savedId && savedName) {
                    setUserId(savedId)
                    setUsername(savedName)
                }
            }
            setIsLoading(false)
        }

        handleSession()
    }, [searchParams, router])

    const selectAccount = async (igAccountId: string) => {
        if (!pendingCode) return
        setIsLoading(true)

        try {
            const res = await fetch("/api/instagram/callback", {
                method: "POST",
                body: JSON.stringify({ code: pendingCode, selectedAccountId: igAccountId }),
            })
            const data = await res.json()

            if (data.success) {
                localStorage.setItem("ig_user_id", data.userId)
                localStorage.setItem("ig_username", data.username)
                setUserId(data.userId)
                setUsername(data.username)
                setPendingAccounts(null)
                setPendingCode(null)
                router.replace("/dashboard")
            }
        } catch (err) {
            console.error("Account selection failed:", err)
        } finally {
            setIsLoading(false)
        }
    }

    const logout = () => {
        localStorage.removeItem("ig_user_id")
        localStorage.removeItem("ig_username")
        document.cookie = "insta_session=; Max-Age=0; path=/;"
        setUsername(null)
        setUserId(null)
        setPendingAccounts(null)
        router.push("/")
    }

    return { userId, username, isLoading, logout, pendingAccounts, selectAccount }
}
