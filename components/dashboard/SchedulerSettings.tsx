"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Calendar, Clock, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

interface SchedulerSettingsProps {
    userId: string
}

export function SchedulerSettings({ userId }: SchedulerSettingsProps) {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    const [enabled, setEnabled] = useState(false)
    const [interval, setInterval] = useState("240") // minutes
    const [startTime, setStartTime] = useState("09:00")
    const [endTime, setEndTime] = useState("21:00")

    // Status info
    const [nextRun, setNextRun] = useState<string | null>(null)
    const [currentIndex, setCurrentIndex] = useState(1)

    useEffect(() => {
        if (userId) loadSettings()
    }, [userId])

    const loadSettings = async () => {
        try {
            setLoading(true)
            const res = await fetch(`/api/scheduler/config?userId=${userId}`)
            if (res.ok) {
                const data = await res.json()
                if (data) {
                    setEnabled(data.is_running)
                    setInterval(data.interval_minutes.toString())
                    setStartTime(data.start_time || "09:00")
                    setEndTime(data.end_time || "21:00")
                    setNextRun(data.next_run_at)
                    setCurrentIndex(data.current_sequence_index)
                }
            }
        } catch (err) {
            // ignore error if no config exists yet
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        try {
            setSaving(true)
            const res = await fetch('/api/scheduler/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    is_running: enabled,
                    interval_minutes: parseInt(interval),
                    start_time: startTime,
                    end_time: endTime
                })
            })

            if (res.ok) {
                toast.success("Configuracoes do agendador salvas")
                loadSettings() // reload to get calculated next_run
            } else {
                toast.error("Falha ao salvar configuracoes")
            }
        } catch (err) {
            toast.error("Erro de conexao")
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-4"><Loader2 className="w-6 h-6 animate-spin text-neutral-500" /></div>

    return (
        <div className="space-y-6 bg-white/5 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-medium text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> Configuracao de Agendamento
                    </h3>
                    <p className="text-sm text-neutral-500">
                        Automatize publicacoes com base em intervalos de tempo.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Label htmlFor="scheduler-toggle" className="text-sm font-medium">
                        {enabled ? "Ativo" : "Pausado"}
                    </Label>
                    <Switch
                        id="scheduler-toggle"
                        checked={enabled}
                        onCheckedChange={setEnabled}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <Label>Frequencia de Publicacao</Label>
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            value={parseInt(interval) / 60}
                            onChange={(e) => setInterval((parseFloat(e.target.value) * 60).toString())}
                            className="bg-black/20"
                        />
                        <div className="flex items-center text-neutral-400 text-sm">horas</div>
                    </div>
                    <p className="text-xs text-neutral-500">
                        (Aprox. {interval} minutos)
                    </p>
                </div>

                <div className="space-y-2">
                    <Label>Horario Ativo (Faixa de Horario)</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="bg-black/20"
                        />
                        <span className="text-neutral-500">ate</span>
                        <Input
                            type="time"
                            value={endTime}
                            onChange={(e) => setEndTime(e.target.value)}
                            className="bg-black/20"
                        />
                    </div>
                    <p className="text-xs text-neutral-500">
                        As publicacoes so ocorrem dentro desta janela.
                    </p>
                </div>
            </div>

            {nextRun && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-400 mt-0.5" />
                    <div>
                        <p className="text-sm text-blue-200 font-medium">
                            Proxima execucao agendada: {new Date(nextRun).toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-300/70">
                            Proximo Clip na Sequencia: #{currentIndex}
                        </p>
                    </div>
                </div>
            )}

            <div className="pt-4 border-t border-white/10 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="min-w-[100px]">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar Alteracoes"}
                </Button>
            </div>

            <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-3 flex gap-3 items-center">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <p className="text-xs text-yellow-200/80">
                    Nota: Esta automacao requer que a aplicacao permaneca ativa ou que um cron job em segundo plano esteja configurado acessando <code>/api/scheduler</code>.
                </p>
            </div>
        </div>
    )
}
