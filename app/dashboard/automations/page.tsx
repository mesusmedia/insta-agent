"use client"

import { useState, useCallback, useEffect } from "react"
import { useInstagramSession } from "@/hooks/use-instagram-session"
import { AutomationList } from "@/components/dashboard/AutomationList"
import { CreateRuleForm, type AutomationTemplate } from "@/components/dashboard/CreateRuleForm"
import { MessageCircle, Send, Sparkles, Zap, Plus, Brain, Loader2, FileText, Tag, CalendarCheck, Gift, X } from "lucide-react"
import type { Automation } from "@/lib/types"

const TEMPLATES: { key: string; icon: React.ReactNode; label: string; desc: string; template: AutomationTemplate }[] = [
    {
        key: "lead-magnet",
        icon: <FileText className="w-5 h-5" />,
        label: "Isca Digital",
        desc: "Comentou a palavra-chave → recebe ebook/PDF no DM + follow gate",
        template: {
            name: "Isca Digital — Ebook Grátis",
            triggerSource: "comment",
            triggers: ["EBOOK"],
            type: "text",
            messageText: "Aqui está seu material exclusivo! 📖\n\nAcesse pelo link: [COLE SEU LINK AQUI]\n\nQualquer dúvida, é só responder essa mensagem!",
            replyMode: "both",
            publicReplies: ["Enviamos no seu DM! 📩", "Confira sua caixa de entrada! ✉️", "Acabei de enviar pra você! 🎁"],
            checkFollow: true,
            delaySeconds: 3,
            typingIndicator: true,
            quickReplies: [
                { id: "qr1", title: "Quero saber mais" },
                { id: "qr2", title: "Agendar conversa" },
            ],
        },
    },
    {
        key: "coupon",
        icon: <Tag className="w-5 h-5" />,
        label: "Cupom de Desconto",
        desc: "Comentou a palavra-chave → recebe cupom exclusivo no DM",
        template: {
            name: "Cupom de Desconto Exclusivo",
            triggerSource: "comment",
            triggers: ["CUPOM"],
            type: "text",
            messageText: "Aqui está seu cupom exclusivo! 🎉\n\n🏷️ Código: [SEU_CUPOM]\n\nUse no link: [COLE SEU LINK AQUI]\n\nVálido por 48h!",
            replyMode: "both",
            publicReplies: ["Enviamos seu cupom no DM! 🎁", "Confira sua caixa de entrada! 💰", "Cupom enviado! Corre lá! 🏃"],
            checkFollow: true,
            delaySeconds: 3,
            typingIndicator: true,
            quickReplies: [
                { id: "qr1", title: "Ver produtos" },
                { id: "qr2", title: "Falar com atendente" },
            ],
        },
    },
    {
        key: "booking",
        icon: <CalendarCheck className="w-5 h-5" />,
        label: "Link de Agendamento",
        desc: "Comentou a palavra-chave → recebe link para agendar no DM",
        template: {
            name: "Agendamento Automático",
            triggerSource: "comment",
            triggers: ["AGENDAR"],
            type: "card",
            messageText: "",
            cardTitle: "Agende seu horário",
            cardSubtitle: "Escolha o melhor dia e horário para você. Atendimento rápido e sem fila!",
            buttons: [
                { id: "btn1", type: "web_url", title: "Agendar agora", url: "https://SEU-LINK-DE-AGENDAMENTO", payload: "" },
            ],
            replyMode: "both",
            publicReplies: ["Enviamos o link no seu DM! 📅", "Confira sua caixa de entrada! ✅", "Link enviado! É só clicar e agendar 🗓️"],
            checkFollow: false,
            delaySeconds: 3,
            typingIndicator: true,
            quickReplies: [],
        },
    },
    {
        key: "dm-faq",
        icon: <Gift className="w-5 h-5" />,
        label: "FAQ Automático (DM)",
        desc: "Quando alguém manda DM com palavra-chave → responde automaticamente",
        template: {
            name: "Resposta Automática — FAQ",
            triggerSource: "dm",
            triggers: ["PREÇO", "VALOR", "QUANTO"],
            type: "text",
            messageText: "Obrigado pelo interesse! 😊\n\nAqui estão nossas opções:\n\n📦 [Descreva seus planos/serviços aqui]\n\nQuer saber mais sobre algum em especial?",
            replyMode: "dm_only",
            publicReplies: [],
            checkFollow: false,
            delaySeconds: 5,
            typingIndicator: true,
            quickReplies: [
                { id: "qr1", title: "Ver planos" },
                { id: "qr2", title: "Falar com humano" },
            ],
        },
    },
]

export default function AutomationsPage() {
    const { userId, isLoading: isSessionLoading } = useInstagramSession()
    const [automations, setAutomations] = useState<Automation[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'comment' | 'dm' | 'story'>('comment')
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [showTemplatePicker, setShowTemplatePicker] = useState(false)
    const [selectedTemplate, setSelectedTemplate] = useState<AutomationTemplate | null>(null)
    const [editRule, setEditRule] = useState<Automation | null>(null)
    const [aiEnabled, setAiEnabled] = useState(false)
    const [aiLoading, setAiLoading] = useState(true)
    const [aiToggling, setAiToggling] = useState(false)
    const [showAiContext, setShowAiContext] = useState(false)
    const [aiContext, setAiContext] = useState("")
    const [aiContextSaving, setAiContextSaving] = useState(false)
    const [aiContextSaved, setAiContextSaved] = useState(false)

    useEffect(() => {
        if (!userId) return
        fetch(`/api/groq/auto-reply?userId=${userId}`)
            .then(res => res.json())
            .then(data => {
                setAiEnabled(data.enabled ?? false)
                setAiContext(data.ai_context ?? "")
            })
            .catch(() => {})
            .finally(() => setAiLoading(false))
    }, [userId])

    const handleSaveAiContext = async () => {
        if (aiContextSaving) return
        setAiContextSaving(true)
        try {
            await fetch("/api/groq/auto-reply", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, enabled: aiEnabled, ai_context: aiContext }),
            })
            setAiContextSaved(true)
            setTimeout(() => setAiContextSaved(false), 2000)
        } catch {}
        setAiContextSaving(false)
    }

    const handleToggleAI = async () => {
        if (aiToggling) return
        setAiToggling(true)
        const newState = !aiEnabled
        try {
            const res = await fetch("/api/groq/auto-reply", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, enabled: newState }),
            })
            if (res.ok) setAiEnabled(newState)
        } catch {}
        setAiToggling(false)
    }

    const fetchAutomations = useCallback(async () => {
        if (!userId) return
        try {
            const res = await fetch(`/api/automations?userId=${userId}`)
            const data = await res.json()
            if (res.ok) setAutomations(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error("Fetch error:", err)
        } finally {
            setIsLoading(false)
        }
    }, [userId])

    useEffect(() => {
        if (userId) fetchAutomations()
    }, [userId, fetchAutomations])

    const handleDeleteRule = async (id: string) => {
        await fetch(`/api/automations?id=${id}`, { method: "DELETE" })
        fetchAutomations()
    }

    const handleEditRule = (rule: Automation) => {
        setEditRule(rule)
        setSelectedTemplate(null)
        setShowTemplatePicker(false)
        setShowCreateForm(true)
    }

    if (isSessionLoading) return <div className="h-screen flex items-center justify-center bg-black"><div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" /></div>
    if (!userId) return <div className="h-screen flex items-center justify-center bg-black text-neutral-500">Faça login para continuar</div>

    const filteredAutomations = automations.filter(a => a.trigger_source === activeTab)
    const counts = {
        comment: automations.filter(a => a.trigger_source === 'comment').length,
        dm: automations.filter(a => a.trigger_source === 'dm').length,
        story: automations.filter(a => a.trigger_source === 'story').length,
    }

    const tabs = [
        { key: 'comment' as const, icon: <MessageCircle className="w-4 h-4" />, label: 'Comentários', count: counts.comment },
        { key: 'dm' as const, icon: <Send className="w-4 h-4" />, label: 'DMs', count: counts.dm },
        { key: 'story' as const, icon: <Sparkles className="w-4 h-4" />, label: 'Stories', count: counts.story },
    ]

    return (
        <div className="min-h-screen bg-black">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 space-y-8">
                {/* Header */}
                <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div>
                        <p className="font-mono-ui text-[10px] uppercase tracking-[0.3em] text-neutral-600 mb-2">Motor de regras</p>
                        <h1 className="font-serif-display text-4xl md:text-5xl text-white leading-none">Automações</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {/* AI Auto-Reply Toggle */}
                        {aiLoading ? (
                            <Loader2 className="w-4 h-4 text-neutral-500 animate-spin" />
                        ) : (
                            <>
                                <button
                                    onClick={() => setShowAiContext(!showAiContext)}
                                    className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-neutral-500 hover:text-white hover:border-white/30 transition-colors"
                                    title="Configurações de IA"
                                >
                                    <Brain className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={handleToggleAI}
                                    disabled={aiToggling}
                                    className={`flex items-center gap-2 h-9 px-4 rounded-full font-mono-ui text-[11px] font-bold uppercase tracking-widest transition-colors ${
                                        aiEnabled
                                            ? 'bg-[#3b82f6]/10 border border-[#3b82f6]/40 text-[#3b82f6]'
                                            : 'border border-white/10 text-neutral-500 hover:text-white hover:border-white/30'
                                    }`}
                                >
                                    <Sparkles className={`w-3.5 h-3.5 ${aiToggling ? 'animate-pulse' : ''}`} />
                                    {aiToggling ? '...' : aiEnabled ? 'AI ON' : 'AI OFF'}
                                </button>
                            </>
                        )}
                        <button
                            onClick={() => {
                                if (showCreateForm || showTemplatePicker) {
                                    setShowCreateForm(false)
                                    setShowTemplatePicker(false)
                                    setEditRule(null)
                                    setSelectedTemplate(null)
                                } else {
                                    setShowTemplatePicker(true)
                                }
                            }}
                            className={`flex items-center gap-2 h-9 px-5 rounded-full font-mono-ui text-[11px] font-bold uppercase tracking-widest transition-all active:scale-95 ${
                                showCreateForm || showTemplatePicker
                                    ? 'border border-white/20 text-white hover:border-white/40'
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:brightness-110'
                            }`}
                        >
                            <Plus className={`w-4 h-4 transition-transform duration-200 ${showCreateForm || showTemplatePicker ? 'rotate-45' : ''}`} />
                            {showCreateForm || showTemplatePicker ? 'Fechar' : 'Nova Regra'}
                        </button>
                    </div>
                </div>

                {/* AI Context Panel */}
                {showAiContext && (
                    <div className="rounded-2xl border border-[#3b82f6]/20 bg-[#3b82f6]/[0.04] p-5 animate-in fade-in slide-in-from-top-2 duration-200 space-y-3">
                        <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-[#3b82f6]" />
                            <span className="text-sm font-semibold text-[#3b82f6]">Contexto de Personalidade da IA</span>
                        </div>
                        <p className="text-xs text-neutral-500">Conte à IA sobre sua conta — nicho, serviços, tom de voz, o que dizer/evitar. Mais contexto = respostas mais humanas.</p>
                        <textarea
                            value={aiContext}
                            onChange={e => setAiContext(e.target.value)}
                            placeholder={`Ex: Esta é uma conta de consultório médico dermatológico. Oferecemos consultas presenciais e online. Tom profissional e acolhedor. Se perguntarem sobre preços, orientar a enviar DM para agendar. Nunca prometer resultados específicos.`}
                            rows={4}
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                        />
                        <button
                            onClick={handleSaveAiContext}
                            disabled={aiContextSaving}
                            className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 hover:brightness-110 text-white text-xs font-bold transition-all disabled:opacity-50"
                        >
                            {aiContextSaving ? 'Salvando...' : aiContextSaved ? 'Salvo ✓' : 'Salvar Contexto'}
                        </button>
                    </div>
                )}

                {/* Tabs — editorial underline */}
                <div className="flex items-center gap-6 border-b border-white/10">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={`relative flex items-center gap-2 pb-3 -mb-px font-mono-ui text-xs uppercase tracking-widest transition-colors border-b-2 ${
                                activeTab === tab.key
                                    ? 'text-white border-[#3b82f6]'
                                    : 'text-neutral-600 border-transparent hover:text-neutral-300'
                            }`}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                                    activeTab === tab.key ? 'bg-[#3b82f6] text-white' : 'bg-white/10 text-neutral-400'
                                }`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Template Picker */}
                {showTemplatePicker && !showCreateForm && (
                    <div className="rounded-2xl border border-white/10 bg-[#111114] p-6 md:p-8 animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                        <div>
                            <h3 className="text-lg font-bold text-white">Escolha um modelo ou comece do zero</h3>
                            <p className="text-xs text-neutral-500 mt-1">Templates prontos com textos, gatilhos e configurações pré-definidas. Personalize depois.</p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {TEMPLATES.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => {
                                        setSelectedTemplate(t.template)
                                        setActiveTab(t.template.triggerSource)
                                        setShowTemplatePicker(false)
                                        setShowCreateForm(true)
                                    }}
                                    className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:border-blue-500/40 hover:bg-blue-500/[0.04] text-left transition-all group"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 group-hover:bg-blue-500/20 transition-colors">
                                        {t.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-white">{t.label}</p>
                                        <p className="text-[11px] text-neutral-500 mt-0.5 leading-relaxed">{t.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => {
                                setSelectedTemplate(null)
                                setShowTemplatePicker(false)
                                setShowCreateForm(true)
                            }}
                            className="w-full py-3 rounded-xl border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/40 transition-colors"
                        >
                            Começar do zero
                        </button>
                    </div>
                )}

                {/* Create Form (Collapsible) */}
                {showCreateForm && (
                    <div className="rounded-2xl border border-white/10 bg-[#111114] p-6 md:p-8 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CreateRuleForm
                            userId={userId}
                            triggerSource={editRule ? editRule.trigger_source : selectedTemplate ? selectedTemplate.triggerSource : activeTab}
                            editRule={editRule}
                            template={selectedTemplate}
                            onSuccess={() => {
                                fetchAutomations()
                                setShowCreateForm(false)
                                setShowTemplatePicker(false)
                                setEditRule(null)
                                setSelectedTemplate(null)
                            }}
                        />
                    </div>
                )}


                {/* Automation List */}
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    </div>
                ) : (
                    <AutomationList
                        automations={filteredAutomations}
                        onDelete={handleDeleteRule}
                        onEdit={handleEditRule}
                        onChanged={fetchAutomations}
                        userId={userId}
                    />
                )}
            </div>
        </div>
    )
}
