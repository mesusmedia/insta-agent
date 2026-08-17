"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"

function getCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
    return match ? decodeURIComponent(match[2]) : null
}

export function useInstagramSession() {
    const [username, setUsername] = useState<string | null>(null)
    const [userId, setUserId] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        // 1. Check query params (set by callback redirect as fallback)
        const params = new URLSearchParams(window.location.search)
        const paramId = params.get("ig_user_id")
        const paramName = params.get("ig_username")

        if (paramId && paramName) {
            localStorage.setItem("ig_user_id", paramId)
            localStorage.setItem("ig_username", paramName)
            setUserId(paramId)
            setUsername(paramName)
            // Clean URL
            const url = new URL(window.location.href)
            url.searchParams.delete("ig_user_id")
            url.searchParams.delete("ig_username")
            window.history.replaceState({}, "", url.pathname)
            setIsLoading(false)
            return
        }

        // 2. Check cookies
        const cookieId = getCookie("ig_user_id")
        const cookieName = getCookie("ig_username")

        if (cookieId && cookieName) {
            localStorage.setItem("ig_user_id", cookieId)
            localStorage.setItem("ig_username", cookieName)
            setUserId(cookieId)
            setUsername(cookieName)
        } else {
            // 3. Fallback to localStorage
            const savedId = localStorage.getItem("ig_user_id")
            const savedName = localStorage.getItem("ig_username")
            if (savedId && savedName) {
                setUserId(savedId)
                setUsername(savedName)
            }
        }

        setIsLoading(false)
    }, [])

    const logout = () => {
        localStorage.removeItem("ig_user_id")
        localStorage.removeItem("ig_username")
        document.cookie = "insta_session=; Max-Age=0; path=/;"
        document.cookie = "ig_user_id=; Max-Age=0; path=/;"
        document.cookie = "ig_username=; Max-Age=0; path=/;"
        setUsername(null)
        setUserId(null)
        router.push("/")
    }

    return { userId, username, isLoading, logout }
}
