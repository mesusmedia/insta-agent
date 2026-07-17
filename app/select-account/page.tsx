"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface Account {
  id: string
  username: string
  pic: string
  page: string
}

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : null
}

export default function SelectAccountPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selecting, setSelecting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const raw = getCookie("pending_accounts")
    if (raw) {
      try { setAccounts(JSON.parse(raw)) } catch {}
    } else {
      router.replace("/")
    }
  }, [router])

  const handleSelect = async (id: string) => {
    setSelecting(true)
    try {
      const res = await fetch("/api/instagram/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedAccountId: id }),
      })
      const data = await res.json()
      if (data.success) {
        localStorage.setItem("ig_user_id", data.userId)
        localStorage.setItem("ig_username", data.username)
        router.replace("/dashboard")
      }
    } catch (err) {
      console.error("Selection failed:", err)
    } finally {
      setSelecting(false)
    }
  }

  if (accounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <h2 className="text-3xl text-white text-center mb-2 font-bold">
          Escolha a conta
        </h2>
        <p className="text-neutral-500 text-sm text-center mb-8">
          Selecione qual Instagram deseja conectar
        </p>
        <div className="space-y-3">
          {accounts.map((account) => (
            <button
              key={account.id}
              onClick={() => handleSelect(account.id)}
              disabled={selecting}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-[#111114] hover:border-[#3b82f6]/50 hover:bg-white/5 transition-all disabled:opacity-50"
            >
              {account.pic ? (
                <img src={account.pic} alt={account.username} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#3b82f6]/10 flex items-center justify-center text-[#3b82f6] text-lg font-bold">
                  {account.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="text-left">
                <p className="text-white font-medium text-sm">@{account.username}</p>
                <p className="text-neutral-500 text-xs">{account.page}</p>
              </div>
            </button>
          ))}
        </div>
        {selecting && (
          <div className="flex justify-center mt-6">
            <Loader2 className="w-6 h-6 text-[#3b82f6] animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}
