"use client"

import { Activity } from "lucide-react"

export default function AnalyticsPage() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-700">
            <div className="w-20 h-20 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mb-6 ring-1 ring-white/10">
                <Activity className="w-10 h-10 text-[#3b82f6]" />
            </div>
            <h1 className="font-serif-display text-4xl text-white mb-2">Analises Avancadas</h1>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
                Estamos construindo um painel completo de analises para ajudar voce a acompanhar engajamento, conversoes e desempenho das automacoes.
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 text-[#3b82f6] text-xs font-bold uppercase tracking-widest ring-1 ring-white/10">
                Em Breve
            </div>
        </div>
    )
}
