"use client"

import { useState, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Plus, Trash2, Save, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import type { IceBreaker } from "@/types/db"

export function IceBreakersManager() {
    const { userId, isLoading } = useInstagramSession()
    const [breakers, setBreakers] = useState<Partial<IceBreaker>[]>([])
    const [saving, setSaving] = useState(false)
    const [fetching, setFetching] = useState(true)

    useEffect(() => {
        if (!userId) return
        fetch(`/api/ice-breakers?userId=${userId}`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) setBreakers(data)
                setFetching(false)
            })
            .catch(err => {
                console.error(err)
                setFetching(false)
            })
    }, [userId])

    const handleAdd = () => {
        if (breakers.length >= 4) {
            toast.error("Maximo de 4 quebra-gelos permitidos pelo Instagram")
            return
        }
        setBreakers([...breakers, { question: "", response: "" }])
    }

    const handleChange = (index: number, field: "question" | "response", value: string) => {
        const newBreakers = [...breakers]
        newBreakers[index] = { ...newBreakers[index], [field]: value }
        setBreakers(newBreakers)
    }

    const handleRemove = (index: number) => {
        setBreakers(breakers.filter((_, i) => i !== index))
    }

    const handleSave = async () => {
        if (!userId) return

        // Validation
        if (breakers.some(b => !b.question?.trim() || !b.response?.trim())) {
            toast.error("Preencha todos os campos")
            return
        }

        setSaving(true)
        try {
            const res = await fetch("/api/ice-breakers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, iceBreakers: breakers })
            })
            const data = await res.json()
            if (data.success) {
                toast.success("Quebra-gelos salvos e sincronizados!")
            } else {
                toast.error("Falha ao salvar")
            }
        } catch (e) {
            toast.error("Erro ao salvar")
        } finally {
            setSaving(false)
        }
    }

    if (isLoading || fetching && !breakers.length) {
        return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-purple-500" /></div>
    }

    return (
        <div className="space-y-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="font-serif-display text-3xl text-white">Quebra-gelos</h2>
                    <p className="text-muted-foreground text-sm">
                        Perguntas que as pessoas veem ao iniciar uma conversa com voce.
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:brightness-110 text-white font-bold">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar e Sincronizar
                </Button>
            </div>

            <div className="space-y-4">
                {breakers.map((item, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl space-y-3 relative group">
                        <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 space-y-3">
                                <div>
                                    <label className="text-xs text-muted-foreground font-semibold uppercase">Pergunta</label>
                                    <Input
                                        value={item.question}
                                        onChange={e => handleChange(idx, "question", e.target.value)}
                                        placeholder="ex: Quais sao seus precos?"
                                        className="bg-black/20 border-white/10 mt-1"
                                        maxLength={80}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-muted-foreground font-semibold uppercase">Resposta Automatica</label>
                                    <Textarea
                                        value={item.response}
                                        onChange={e => handleChange(idx, "response", e.target.value)}
                                        placeholder="A resposta que os usuarios receberao..."
                                        className="bg-black/20 border-white/10 mt-1"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemove(idx)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}

                {breakers.length === 0 && (
                    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-muted-foreground">
                        Nenhum quebra-gelo ainda. Adicione um para comecar!
                    </div>
                )}

                {breakers.length < 4 && (
                    <Button variant="outline" onClick={handleAdd} className="w-full border-dashed border-white/20 hover:bg-white/5 text-muted-foreground hover:text-white">
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
                    </Button>
                )}
            </div>

            <div className="bg-white/[0.04] border border-white/10 p-4 rounded-xl flex gap-3 text-sm text-neutral-300">
                <RefreshCw className="w-5 h-5 shrink-0" />
                <p>
                    As alteracoes feitas aqui sao sincronizadas automaticamente com seu Perfil do Instagram. Pode levar alguns minutos para aparecerem para todos os usuarios.
                </p>
            </div>
        </div>
    )
}
