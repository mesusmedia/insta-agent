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
        // Check cookies first (set by server callback), then localStorage
        const cookieId = getCookie("ig_user_id")
        const cookieName = getCookie("ig_username")

        if (cookieId && cookieName) {
            // Sync cookies to localStorage for persistence
            localStorage.setItem("ig_user_id", cookieId)
            localStorage.setItem("ig_username", cookieName)
            setUserId(cookieId)
            setUsername(cookieName)
        } else {
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
