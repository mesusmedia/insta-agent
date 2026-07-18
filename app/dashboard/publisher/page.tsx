"use client"

import { ContentPool } from "@/components/dashboard/ContentPool"
import { SchedulerSettings } from "@/components/dashboard/SchedulerSettings"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function PublisherPage() {
    const { userId, isLoading } = useInstagramSession()

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-white/20" />
            </div>
        )
    }

    if (!userId) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-4">
                <h2 className="text-xl font-semibold text-white mb-2">Login necessário</h2>
                <p className="text-neutral-400">Conecte sua conta do Instagram para acessar este recurso.</p>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="font-serif-display text-4xl text-white w-fit">
                    Publicador de Reels
                </h1>
                <p className="text-neutral-400">
                    Faça upload de conteúdo e agende rotação automática para engajamento consistente.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <ContentPool userId={userId} />
                </div>

                <div className="lg:col-span-1">
                    <div className="sticky top-6">
                        <SchedulerSettings userId={userId} />

                        <Card className="mt-6 bg-[#111114] border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg text-white">Dicas de Automação</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm text-neutral-400">
                                <p>• <strong>Consistência é tudo:</strong> Defina um intervalo confortável como 4-6 horas para manter seu feed ativo.</p>
                                <p>• <strong>Varie o conteúdo:</strong> Adicione pelo menos 5-10 clipes para evitar repetição.</p>
                                <p>• <strong>Monitore:</strong> Confira os insights do Instagram para ver quais horários performam melhor e ajuste seu agendamento.</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    )
}
