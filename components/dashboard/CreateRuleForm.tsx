"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus, Trash2, Film, Check, MessageCircle, Send, AtSign, Heart,
  MessageSquare, Image as ImageIcon, Timer, Eye, Megaphone, Lock,
  Link2, Zap, ChevronDown, ChevronRight, ChevronLeft, X, Loader2,
  ArrowLeft, Phone, Video, Info, Sparkles, Smile, Camera, Mic, Image as PicIcon,
  Globe
} from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"
import type { ProButton, QuickReplyOption, Automation } from "@/lib/types"
import { toast } from "sonner"

/* ============================================================
   AESTHETIC & SEXY WIZARD FOR INSTAGRAM AUTOMATION RULES
   Step 1: TRIGGER  — Select Reel/Post first, then set keywords
   Step 2: RESPONSE — What do they get?
   Step 3: SETTINGS — Name it & delivery options
   ============================================================ */

interface CreateRuleFormProps {
  userId: string
  triggerSource: "comment" | "dm" | "story"
  onSuccess: () => void
  editRule?: Automation | null
}

const STEPS = [
  { key: "trigger", label: "Origem do Gatilho", sub: "Quando dispara?" },
  { key: "response", label: "Resposta", sub: "O que recebem?" },
  { key: "settings", label: "Configuracoes Finais", sub: "Velocidade e restricoes" },
] as const

export function CreateRuleForm({ userId, triggerSource, onSuccess, editRule }: CreateRuleFormProps) {
  const isEditing = !!editRule
  const [step, setStep] = useState(0)

  /* ---------- WHEN ---------- */
  const [triggers, setTriggers] = useState<string[]>([])
  const [storyTriggerType, setStoryTriggerType] = useState<"mention" | "reaction" | "reply">("mention")
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [hasSelectedReelOption, setHasSelectedReelOption] = useState<boolean>(false)

  /* ---------- THEN ---------- */
  const [type, setType] = useState<"text" | "card" | "media">("text")
  const [messageText, setMessageText] = useState("")
  const [cardTitle, setCardTitle] = useState("")
  const [cardSubtitle, setCardSubtitle] = useState("")
  const [cardImage, setCardImage] = useState("")
  const [buttons, setButtons] = useState<ProButton[]>([])
  const [mediaUrl, setMediaUrl] = useState("")
  const [mediaType, setMediaType] = useState<"image" | "video" | "audio">("image")
  const [quickReplies, setQuickReplies] = useState<QuickReplyOption[]>([])

  /* ---------- Public comment reply ---------- */
  const [replyMode, setReplyMode] = useState<"both" | "dm_only" | "public_only">("both")
  const [publicReplies, setPublicReplies] = useState<string[]>([])
  const [includeReplies, setIncludeReplies] = useState(false)

  /* ---------- EXTRAS ---------- */
  const [name, setName] = useState("")
  const [checkFollow, setCheckFollow] = useState(false)
  const [delaySeconds, setDelaySeconds] = useState(0)
  const [typingIndicator, setTypingIndicator] = useState(false)

  const [saving, setSaving] = useState(false)
  const [reels, setReels] = useState<any[]>([])
  const [loadingReels, setLoadingReels] = useState(false)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoadingReels(true)
    fetch(`/api/instagram/media?userId=${userId}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return
        const list = j.data && Array.isArray(j.data) ? j.data : Array.isArray(j) ? j : []
        setReels(list)
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoadingReels(false))
    return () => { cancelled = true }
  }, [userId])

  /* Prefill on edit */
  useEffect(() => {
    if (!editRule) return
    const content: any =
      typeof editRule.response_content === "string"
        ? JSON.parse(editRule.response_content as any)
        : editRule.response_content || {}

    setName(editRule.name)
    if (["mention", "reaction", "reply"].includes(editRule.trigger_type)) {
      setStoryTriggerType(editRule.trigger_type as any)
    }
    const rawTriggers = (editRule.trigger_value || "")
      .split(",").map((t) => t.trim())
      .filter((t) => t && !["ALL", "ALL_COMMENTS", "ALL_MENTIONS", "ALL_REACTIONS"].includes(t.toUpperCase()))
    setTriggers(rawTriggers)

    if (content.media?.url) {
      setType("media"); setMediaUrl(content.media.url); setMediaType(content.media.type || "image"); setMessageText(content.message || "")
    } else if (content.card) {
      setType("card"); setCardTitle(content.card.title || ""); setCardSubtitle(content.card.subtitle || ""); setCardImage(content.card.image_url || "")
      setButtons((content.card.buttons || []).map((b: any, i: number) => ({ id: `${Date.now()}_${i}`, ...b })))
    } else {
      setType("text"); setMessageText(content.message || "")
    }
    setQuickReplies((content.quick_replies || []).map((q: any, i: number) => ({ id: `${Date.now()}_qr${i}`, title: q.title, payload: q.payload })))
    setReplyMode(content.reply_mode || "both")
    setPublicReplies(content.public_replies || [])
    setIncludeReplies(content.include_replies === true)
    setCheckFollow(content.check_follow === true)
    setDelaySeconds(Number(content.delay_seconds) || 0)
    setTypingIndicator(content.typing_indicator === true)
    
    if (editRule.specific_media_id) {
      setSelectedReel({ id: editRule.specific_media_id, caption: "Selected post" })
      setHasSelectedReelOption(true)
    } else {
      setHasSelectedReelOption(false)
    }
  }, [editRule])

  /* Auto name */
  useEffect(() => {
    if (name || isEditing) return
    const isReplyAll = triggerSource === "comment" && triggers.length === 0
    if (isReplyAll) setName("Responder a todos os comentarios")
    else if (triggers.length > 0) setName(`Responder a "${triggers[0]}"`)
  }, [triggers, name, isEditing, triggerSource])

  /* ---------- helpers ---------- */
  const addButton = () => {
    if (buttons.length >= 3) return
    setButtons([...buttons, { id: Date.now().toString(), type: "web_url", title: "", url: "", payload: "" }])
  }
  const updateButton = (id: string, field: keyof ProButton, value: string) =>
    setButtons(buttons.map((b) => (b.id === id ? { ...b, [field]: value } : b)))
  const removeButton = (id: string) => setButtons(buttons.filter((b) => b.id !== id))

  const addQuickReply = () => {
    if (quickReplies.length >= 4) return
    setQuickReplies([...quickReplies, { id: Date.now().toString(), title: "" }])
  }
  const updateQuickReply = (id: string, title: string) =>
    setQuickReplies(quickReplies.map((q) => (q.id === id ? { ...q, title } : q)))
  const removeQuickReply = (id: string) => setQuickReplies(quickReplies.filter((q) => q.id !== id))

  const needsKeywords = triggerSource === "dm" || (triggerSource === "story" && storyTriggerType !== "mention")

  const whenValid = triggerSource === "comment" 
    ? hasSelectedReelOption // Comment trigger is valid once they select a specific post or global option
    : !needsKeywords || triggers.length > 0

  const thenValid =
    replyMode === "public_only" ||
    (type === "text" ? messageText.trim().length > 0 : type === "card" ? cardTitle.trim().length > 0 : mediaUrl.trim().length > 0)
  const canSave = whenValid && thenValid && name.trim().length > 0

  const stepValid = [
    whenValid,  // step 0
    thenValid,  // step 1
    name.trim().length > 0, // step 2
  ]

  /* Plain-language summary sentence */
  const summary = useMemo(() => {
    const isReplyAll = triggerSource === "comment" && triggers.length === 0
    const who =
      triggerSource === "comment"
        ? isReplyAll ? "alguem comentar no seu post" : `alguem comentar ${triggers.length ? `"${triggers[0]}"` : "uma palavra-chave"}`
        : triggerSource === "dm"
          ? `alguem te enviar DM ${triggers.length ? `"${triggers[0]}"` : "uma palavra-chave"}`
          : storyTriggerType === "mention" ? "alguem te mencionar em um Story"
            : storyTriggerType === "reaction" ? "alguem reagir ao seu Story"
              : "alguem responder ao seu Story"
    const what =
      replyMode === "public_only" ? "responder publicamente"
        : type === "card" ? "enviar um card com botoes"
          : type === "media" ? `enviar ${mediaType === "image" ? "uma imagem" : `um ${mediaType}`}`
            : "enviar uma DM"
    return { who, what }
  }, [triggerSource, triggers, storyTriggerType, replyMode, type, mediaType])

  /* ---------- save ---------- */
  const handleSubmit = async () => {
    if (!canSave || saving) return
    setSaving(true)

    const isReplyAll = triggerSource === "comment" && triggers.length === 0

    const content: any = { check_follow: checkFollow }
    if (delaySeconds > 0) content.delay_seconds = delaySeconds
    if (typingIndicator) content.typing_indicator = true
    if (triggerSource === "comment") {
      content.reply_mode = replyMode
      if (publicReplies.length > 0) content.public_replies = publicReplies
      if (includeReplies) content.include_replies = true
    }
    if (quickReplies.filter((q) => q.title.trim()).length > 0) {
      content.quick_replies = quickReplies.filter((q) => q.title.trim()).map((q) => ({ title: q.title.trim(), payload: q.payload }))
    }

    if (type === "text") {
      content.message = messageText
    } else if (type === "media") {
      content.media = { type: mediaType, url: mediaUrl.trim() }
      if (messageText.trim()) content.message = messageText
    } else {
      const cleanButtons = buttons
        .map((b) => {
          if (b.type === "web_url") {
            let cleanUrl = b.url?.trim() || ""
            if (cleanUrl.startsWith("https://https://")) cleanUrl = cleanUrl.replace("https://https://", "https://")
            return { type: "web_url" as const, title: b.title, url: cleanUrl }
          }
          return { type: "postback" as const, title: b.title, payload: b.payload }
        })
        .filter((b) => b.title)
      content.card = { title: cardTitle, subtitle: cardSubtitle || undefined, image_url: cardImage || undefined, buttons: cleanButtons }
    }

    const payload = {
      userId,
      name,
      trigger_source: triggerSource,
      trigger_type: isReplyAll ? "reply_all" : triggerSource === "story" ? storyTriggerType : "keyword",
      trigger_value: isReplyAll ? "ALL_COMMENTS"
        : triggerSource === "story" && storyTriggerType === "mention" ? "ALL_MENTIONS"
          : triggerSource === "story" && storyTriggerType === "reaction" && triggers.length === 0 ? "ALL_REACTIONS"
            : triggers.length > 0 ? triggers.join(", ") : "ALL",
      content,
      specific_media_id: selectedReel?.id || null,
    }

    try {
      const res = await fetch("/api/automations", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isEditing ? { ...payload, id: editRule!.id } : payload),
      })
      if (res.ok) {
        toast.success(isEditing ? "Automacao atualizada" : "Automacao ativada")
        onSuccess()
      } else {
        toast.error("Erro ao salvar — tente novamente")
      }
    } catch {
      toast.error("Erro de conexao")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ── Sexy Stepper Timeline ── */}
      <div className="relative bg-neutral-900/60 border border-white/5 rounded-2xl p-4 md:px-8">
        <div className="flex items-center justify-between gap-4 relative">
          {STEPS.map((s, i) => {
            const isActive = i === step
            const isCompleted = i < step
            return (
              <div key={s.key} className="flex items-center gap-3 flex-1 last:flex-initial">
                <button
                  type="button"
                  onClick={() => { if (i < step || stepValid[step]) setStep(i) }}
                  className="flex items-center gap-3 group text-left focus:outline-none"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isCompleted
                      ? "bg-[#3b82f6] text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]"
                      : isActive
                        ? "bg-white text-black ring-4 ring-white/10"
                        : "bg-neutral-800 text-neutral-500 border border-white/5"
                  }`}>
                    {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : i + 1}
                  </div>
                  <div className="hidden md:block">
                    <p className={`text-xs font-bold tracking-tight uppercase ${isActive ? "text-white" : "text-neutral-400 group-hover:text-neutral-200"}`}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-neutral-500 font-mono-ui">{s.sub}</p>
                  </div>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 h-[2px] mx-2 relative bg-neutral-800 rounded-full overflow-hidden">
                    <div className={`absolute inset-y-0 left-0 transition-all duration-500 bg-[#3b82f6] ${
                      isCompleted ? "w-full" : "w-0"
                    }`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Two Column Workspace ── */}
      <div className="grid lg:grid-cols-[1fr_320px] gap-8 items-start">
        {/* ── LEFT: Config Form ── */}
        <div className="bg-[#111114] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
          {/* ===== STEP 1: TRIGGER ===== */}
          {step === 0 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <StepHeader
                number={1}
                title={triggerSource === "comment" ? "Selecione o post/reel alvo" : triggerSource === "dm" ? "Quando alguem te enviar DM" : "Quando alguem interagir com seu Story"}
                description={triggerSource === "comment" ? "Escolha a midia especifica para automatizar." : "Defina as condicoes que disparam esta automacao."}
              />

              {triggerSource === "story" && (
                <div className="space-y-3">
                  <FieldLabel>Tipo de interacao com Story</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    {([
                      { key: "mention" as const, icon: <AtSign className="w-5 h-5" />, label: "Me menciona", desc: "Marcado em um Story" },
                      { key: "reaction" as const, icon: <Heart className="w-5 h-5" />, label: "Reage", desc: "Envia reacao com emoji" },
                      { key: "reply" as const, icon: <MessageSquare className="w-5 h-5" />, label: "Responde", desc: "Resposta de texto ao Story" },
                    ]).map(({ key, icon, label, desc }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setStoryTriggerType(key)}
                        className={`p-4 rounded-xl border text-left flex flex-col gap-2 transition-all duration-200 ${
                          storyTriggerType === key
                            ? "border-[#3b82f6] bg-[#3b82f6]/[0.06] text-[#3b82f6]"
                            : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white bg-white/[0.01]"
                        }`}
                      >
                        <span className={storyTriggerType === key ? "text-[#3b82f6]" : "text-neutral-500"}>{icon}</span>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
                          <p className="text-[10px] text-neutral-500 font-normal mt-0.5">{desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {triggerSource === "comment" && (
                <div className="space-y-4">
                  <FieldLabel>Automatizar qual post ou reel?</FieldLabel>
                  {loadingReels ? (
                    <div className="p-8 flex flex-col items-center justify-center gap-3 border border-white/5 rounded-2xl bg-white/[0.01]">
                      <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
                      <span className="text-xs text-neutral-500 font-mono-ui">Carregando feed do Instagram...</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                      {/* Option: Global Post Rule */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedReel(null)
                          setHasSelectedReelOption(true)
                        }}
                        className={`aspect-square rounded-xl border flex flex-col items-center justify-center p-4 text-center transition-all duration-200 ${
                          hasSelectedReelOption && selectedReel === null
                            ? "border-[#3b82f6] bg-[#3b82f6]/[0.06] text-[#3b82f6]"
                            : "border-white/10 text-neutral-400 hover:border-white/20 hover:text-white bg-white/[0.01]"
                        }`}
                      >
                        <Globe className="w-8 h-8 mb-2 opacity-80" />
                        <span className="text-xs font-bold">Todos os Posts e Reels</span>
                        <span className="text-[9px] text-neutral-500 mt-1">Gatilho Global</span>
                      </button>

                      {reels.map((reel) => {
                        const isSelected = hasSelectedReelOption && selectedReel?.id === reel.id
                        return (
                          <button
                            key={reel.id}
                            type="button"
                            onClick={() => {
                              setSelectedReel(reel)
                              setHasSelectedReelOption(true)
                            }}
                            className={`aspect-square rounded-xl border overflow-hidden relative group text-left transition-all duration-200 ${
                              isSelected
                                ? "border-[#3b82f6] ring-2 ring-[#3b82f6]/20"
                                : "border-white/10 hover:border-white/25 bg-[#0e0e0e]"
                            }`}
                          >
                            {reel.image_url ? (
                              <img src={reel.image_url} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                            ) : (
                              <div className="w-full h-full bg-neutral-900 flex items-center justify-center">
                                <Film className="w-6 h-6 text-neutral-600" />
                              </div>
                            )}

                            {/* Type Overlay */}
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-[8px] font-mono-ui text-white uppercase tracking-wider">
                              {reel.media_type === "STORY" ? "Story" : reel.media_type === "VIDEO" ? "Reel" : "Post"}
                            </span>

                            {/* Selected Check overlay */}
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#3b82f6]/10 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="w-8 h-8 rounded-full bg-[#3b82f6] text-white flex items-center justify-center shadow-lg">
                                  <Check className="w-4 h-4 stroke-[3]" />
                                </div>
                              </div>
                            )}

                            {/* Caption snippet at bottom */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 pt-6">
                              <p className="text-[10px] text-white line-clamp-1 font-sans">{reel.caption || "Sem titulo"}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Configure keywords only after selection (for Comment triggers) or always for others */}
              {(triggerSource !== "comment" || hasSelectedReelOption) && (
                <div className="space-y-4 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-2 duration-300">
                  {triggerSource === "comment" ? (
                    <div className="space-y-2">
                      <FieldLabel>Palavras-chave para corresponder</FieldLabel>
                      <p className="text-[11px] text-neutral-500">
                        Qual palavra-chave dispara esta DM? <span className="text-[#3b82f6] font-semibold">Deixe vazio para responder a todos os comentarios.</span>
                      </p>
                      <TagInput
                        value={triggers}
                        onChange={setTriggers}
                        placeholder="digite a palavra-chave e pressione Enter (ex: guia)"
                      />
                    </div>
                  ) : needsKeywords ? (
                    <div className="space-y-2 bg-neutral-900/40 p-5 rounded-2xl border border-white/5">
                      <FieldLabel>
                        {triggerSource === "story" && storyTriggerType === "reaction"
                          ? "Reagir apenas a estes emojis"
                          : "Palavras-chave do gatilho"}
                      </FieldLabel>
                      <p className="text-[11px] text-neutral-500 mb-3">
                        {triggerSource === "story" && storyTriggerType === "reaction"
                          ? "Deixe vazio para disparar com qualquer reacao de emoji."
                          : "Corresponde a frases ou palavras exatas (sem diferenciar maiusculas)."}
                      </p>
                      <TagInput
                        value={triggers}
                        onChange={setTriggers}
                        placeholder={
                          triggerSource === "story" && storyTriggerType === "reaction" ? "ex: ❤️, 🔥, 👍" : "digite a palavra-chave e pressione Enter (ex: preco)"
                        }
                      />
                    </div>
                  ) : null}

                  {triggerSource === "comment" && triggers.length > 0 && (
                    <ToggleRow
                      icon={<MessageSquare className="w-5 h-5" />}
                      title="Verificar respostas a comentarios"
                      sub="Normalmente apenas comentarios primarios disparam respostas"
                      on={includeReplies}
                      onToggle={() => setIncludeReplies(!includeReplies)}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 2: RESPONSE ===== */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <StepHeader
                number={2}
                title="Compor mensagem de resposta"
                description="Escolha o formato e crie a mensagem enviada aos contatos."
              />

              {triggerSource === "comment" && (
                <div className="space-y-2">
                  <FieldLabel>Direcao do fluxo</FieldLabel>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: "both" as const, label: "Resposta + DM" },
                      { key: "public_only" as const, label: "Apenas resposta" },
                      { key: "dm_only" as const, label: "Apenas DM" },
                    ]).map(({ key, label }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setReplyMode(key)}
                        className={`h-11 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                          replyMode === key ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-white/10 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {triggerSource === "comment" && replyMode !== "dm_only" && (
                <div className="space-y-2 bg-neutral-900/40 p-5 rounded-2xl border border-white/5">
                  <FieldLabel>Rotacao de comentarios publicos</FieldLabel>
                  <p className="text-[11px] text-neutral-500 mb-3">Adicione varias frases. Alternamos dinamicamente para parecer humano.</p>
                  <TagInput value={publicReplies} onChange={setPublicReplies} placeholder={'ex: "Te mandei uma DM!", "Confere sua caixa de entrada!"'} />
                </div>
              )}

              {replyMode !== "public_only" && (
                <div className="space-y-5 pt-2">
                  <div className="space-y-2">
                    <FieldLabel>Formato da Mensagem Direta</FieldLabel>
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { key: "text" as const, icon: <MessageCircle className="w-4.5 h-4.5" />, label: "Apenas Texto" },
                        { key: "card" as const, icon: <Link2 className="w-4.5 h-4.5" />, label: "Card / Link" },
                        { key: "media" as const, icon: <ImageIcon className="w-4.5 h-4.5" />, label: "Midia Rica" },
                      ]).map(({ key, icon, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setType(key)}
                          className={`p-3 rounded-xl border text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                            type === key ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          {icon}
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {type === "text" && (
                    <div className="space-y-2">
                      <FieldLabel>Texto da Mensagem DM</FieldLabel>
                      <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        rows={5}
                        maxLength={1000}
                        className="w-full bg-white/[0.02] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#3b82f6]/50 transition-colors"
                        placeholder="Digite a mensagem para enviar por DM..."
                      />
                      <p className="font-mono-ui text-[10px] text-neutral-600 text-right">{messageText.length}/1000</p>
                    </div>
                  )}

                  {type === "card" && (
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <FieldLabel>Configuracao do card</FieldLabel>
                        <TextField value={cardTitle} onChange={setCardTitle} placeholder="Titulo principal do card" />
                        <TextField value={cardSubtitle} onChange={setCardSubtitle} placeholder="Descricao do subtitulo (opcional)" />
                        <TextField value={cardImage} onChange={setCardImage} placeholder="URL da imagem de capa (opcional)" />
                      </div>
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <FieldLabel>Botoes interativos ({buttons.length}/3)</FieldLabel>
                          <button type="button" onClick={addButton} disabled={buttons.length >= 3}
                            className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors">
                            <Plus className="w-3 h-3" /> Adicionar botao
                          </button>
                        </div>
                        {buttons.map((btn) => (
                          <div key={btn.id} className="flex gap-2 items-center bg-white/[0.02] p-3 rounded-2xl border border-white/5">
                            <input
                              value={btn.title}
                              onChange={(e) => updateButton(btn.id, "title", e.target.value)}
                              className="h-8 text-xs flex-1 bg-transparent border-none px-2 text-white placeholder:text-neutral-500 focus:outline-none"
                              placeholder="Texto do botao"
                            />
                            <select
                              value={btn.type}
                              onChange={(e) => updateButton(btn.id, "type", e.target.value)}
                              className="h-8 text-[11px] bg-black border border-white/10 rounded-lg px-2 text-neutral-300 focus:outline-none"
                            >
                              <option value="web_url">Abrir Link</option>
                              <option value="postback">Disparar Fluxo</option>
                            </select>
                            <input
                              value={btn.type === "web_url" ? btn.url : btn.payload}
                              onChange={(e) => updateButton(btn.id, btn.type === "web_url" ? "url" : "payload", e.target.value)}
                              className="h-8 text-xs flex-1 bg-transparent border-none px-2 text-white placeholder:text-neutral-500 focus:outline-none font-mono"
                              placeholder={btn.type === "web_url" ? "https://link" : "flow_keyword"}
                            />
                            <button type="button" onClick={() => removeButton(btn.id)} className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {type === "media" && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <FieldLabel>Tipo de Arquivo</FieldLabel>
                        <div className="grid grid-cols-3 gap-2">
                          {(["image", "video", "audio"] as const).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setMediaType(m)}
                              className={`h-10 rounded-xl border text-xs font-bold uppercase transition-all ${
                                mediaType === m ? "border-[#3b82f6] bg-[#3b82f6]/10 text-[#3b82f6]" : "border-white/10 text-neutral-400 hover:text-white"
                              }`}
                            >
                              {m === "image" ? "Foto" : m === "video" ? "Video" : "Audio"}
                            </button>
                          ))}
                        </div>
                      </div>
                      <TextField value={mediaUrl} onChange={setMediaUrl} placeholder="Link para arquivo de midia publico (ex: mp4, jpg)" />
                      <TextField value={messageText} onChange={setMessageText} placeholder="Mensagem de legenda opcional para enviar depois..." />
                    </div>
                  )}

                  {type !== "card" && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <FieldLabel>Respostas rapidas ({quickReplies.length}/4)</FieldLabel>
                        <button type="button" onClick={addQuickReply} disabled={quickReplies.length >= 4}
                          className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors">
                          <Plus className="w-3 h-3" /> Adicionar chip
                        </button>
                      </div>
                      {quickReplies.length > 0 && (
                        <div className="space-y-2">
                          {quickReplies.map((q) => (
                            <div key={q.id} className="flex gap-2 items-center">
                              <input
                                value={q.title}
                                onChange={(e) => updateQuickReply(q.id, e.target.value)}
                                maxLength={20}
                                className="h-10 text-xs flex-1 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#3b82f6]/50"
                                placeholder='ex: "Enviar Detalhes!"'
                              />
                              <button type="button" onClick={() => removeQuickReply(q.id)} className="text-neutral-500 hover:text-red-400 p-1.5 transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== STEP 3: SETTINGS ===== */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
              <StepHeader
                number={3}
                title="Configurar regras e nome"
                description="Finalize os parametros de desempenho e ative a automacao."
              />

              <div className="space-y-2">
                <FieldLabel>Nome identificador da automacao</FieldLabel>
                <TextField value={name} onChange={setName} placeholder='ex: "Gatilho Download Ebook Gratis"' />
              </div>

              <div className="space-y-4">
                <FieldLabel>Opcoes de entrega</FieldLabel>
                <ToggleRow icon={<Lock className="w-5 h-5" />} title="Bloqueio por seguidor obrigatorio" sub="Apenas seguidores recebem o conteudo. Nao-seguidores recebem convite para seguir primeiro." on={checkFollow} onToggle={() => setCheckFollow(!checkFollow)} />
                <ToggleRow icon={<Eye className="w-5 h-5" />} title="Simular status de digitacao" sub="Exibe indicador de digitacao para parecer completamente organico." on={typingIndicator} onToggle={() => setTypingIndicator(!typingIndicator)} />
                
                <div className="flex items-center justify-between p-4 rounded-2xl border border-white/10 bg-white/[0.01]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-neutral-900 flex items-center justify-center border border-white/5">
                      <Timer className="w-4.5 h-4.5 text-neutral-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Atraso aleatorio de entrega</p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">Aguarda antes de enviar para simular atrasos humanos reais.</p>
                    </div>
                  </div>
                  <select
                    value={delaySeconds}
                    onChange={(e) => setDelaySeconds(Number(e.target.value))}
                    className="bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none hover:border-white/20 transition-all cursor-pointer"
                  >
                    <option value={0}>Enviar Imediatamente</option>
                    <option value={3}>Atraso de 3s</option>
                    <option value={5}>Atraso de 5s</option>
                    <option value={10}>Atraso de 10s</option>
                    <option value={30}>Atraso de 30s</option>
                  </select>
                </div>
              </div>

              {/* Plain-text Summary Panel */}
              <div className="rounded-2xl border border-[#3b82f6]/15 bg-[#3b82f6]/[0.03] p-5 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#3b82f6]" />
                  <span className="text-xs font-mono-ui uppercase tracking-widest text-[#3b82f6] font-bold">Resumo da Logica da Regra</span>
                </div>
                <p className="text-sm text-neutral-300 leading-relaxed">
                  Quando <span className="text-white font-semibold underline decoration-[#3b82f6]/40 decoration-2">{summary.who}</span>, vamos <span className="text-[#3b82f6] font-semibold">{summary.what}</span>.
                </p>
              </div>
            </div>
          )}

          {/* ── Wizard Foot Navigation ── */}
          <div className="flex items-center justify-between border-t border-white/5 pt-6">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 h-11 px-5 rounded-full border border-white/10 text-neutral-400 hover:text-white hover:border-white/25 font-mono-ui text-xs font-bold transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            ) : <div />}

            {step < 2 ? (
              <button
                type="button"
                onClick={() => { if (stepValid[step]) setStep(step + 1) }}
                disabled={!stepValid[step]}
                className="flex items-center gap-2 h-11 px-6 rounded-full bg-white text-black font-mono-ui text-xs font-bold hover:bg-gradient-to-r hover:from-blue-500 hover:to-indigo-500 hover:text-white hover:shadow-[0_0_20px_rgba(59,130,246,0.25)] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSave || saving}
                className="flex items-center justify-center gap-2 h-11 px-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-mono-ui text-sm font-bold hover:brightness-110 hover:shadow-[0_0_25px_rgba(59,130,246,0.35)] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed ml-auto"
              >
                {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Zap className="w-4 h-4 stroke-[2.5]" />}
                {saving ? "Salvando..." : isEditing ? "Salvar Automacao" : "Ativar"}
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT: iPhone Mockup ── */}
        {replyMode !== "public_only" && (
          <div className="hidden lg:block sticky top-6">
            <div className="text-center mb-3">
              <span className="font-mono-ui text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold">Pre-visualizacao Interativa</span>
            </div>
            
            {/* iPhone Outer Frame */}
            <div className="w-[320px] h-[580px] rounded-[3rem] border-8 border-[#1f1f1e] bg-black shadow-2xl relative flex flex-col overflow-hidden ring-1 ring-white/10">
              
              {/* iPhone Dynamic Island */}
              <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-24 h-5 bg-black rounded-full z-50 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 border border-neutral-800 ml-auto mr-3" />
              </div>

              {/* Status Bar Mockup */}
              <div className="h-8 bg-neutral-950 flex items-end justify-between px-6 pb-1 text-[9px] text-white/80 font-mono-ui z-40 select-none">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <span>5G</span>
                  <div className="w-4 h-2 border border-white/40 rounded-sm p-[1px] flex items-center"><div className="w-2 h-full bg-white rounded-2xs" /></div>
                </div>
              </div>

              {/* True-to-life Instagram DM Header */}
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/5 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-40">
                <div className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4 text-white cursor-pointer" />
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#8a3ab9] via-[#e95950] to-[#fccc63] p-[1.5px]">
                      <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-[10px] font-bold text-white font-mono">
                        {(editRule?.name || "T").substring(0,1).toUpperCase()}
                      </div>
                    </div>
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-neutral-950" />
                  </div>
                  <div className="leading-tight">
                    <p className="text-[11px] font-semibold text-white truncate max-w-[100px]">@{userId ? "test_creator" : "creator"}</p>
                    <p className="text-[8px] text-green-500 font-medium">Ativo agora</p>
                  </div>
                </div>
                <div className="flex items-center gap-3.5 text-neutral-300">
                  <Phone className="w-3.5 h-3.5" />
                  <Video className="w-3.5 h-3.5" />
                  <Info className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Screen Body */}
              <div className="flex-1 bg-black px-3 py-4 space-y-4 overflow-y-auto font-sans flex flex-col justify-end">
                {/* Incoming bubble */}
                <div className="flex justify-start items-end gap-1.5">
                  <div className="w-6 h-6 rounded-full bg-neutral-800 flex items-center justify-center text-[9px] text-white">U</div>
                  <div className="bg-[#1f1f1e] text-white rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs max-w-[75%] shadow-md">
                    {incomingMsg(triggerSource, triggers)}
                  </div>
                </div>

                {/* Typing indicator simulator */}
                {typingIndicator && (
                  <div className="flex justify-end pr-1 animate-pulse">
                    <span className="text-[9px] text-neutral-500 font-mono-ui italic">indicador de digitacao ativo...</span>
                  </div>
                )}

                {/* Outgoing Reply Bubble */}
                {hasDMContent(type, messageText, cardTitle, mediaUrl) ? (
                  <div className="flex justify-end items-end gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="max-w-[80%] space-y-1.5 flex flex-col items-end">
                      {type === "text" && (
                        <div className="bg-[#3797f0] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-xs whitespace-pre-wrap break-words leading-relaxed shadow-lg">
                          {messageText || "Digite o conteudo da mensagem..."}
                        </div>
                      )}
                      {type === "card" && (
                        <div className="bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden w-48 shadow-2xl">
                          {cardImage && cardImage.startsWith("http") && (
                            <img src={cardImage} alt="" className="w-full h-24 object-cover" loading="lazy" />
                          )}
                          <div className="p-3">
                            <p className="text-xs font-bold text-white line-clamp-1">{cardTitle || "Titulo do Card"}</p>
                            {cardSubtitle && <p className="text-[10px] text-neutral-400 mt-1 line-clamp-2 leading-tight">{cardSubtitle}</p>}
                          </div>
                          {buttons.filter((b) => b.title).map((b) => (
                            <div key={b.id} className="border-t border-white/5 py-2 text-center text-[10px] font-bold text-[#3797f0] bg-white/[0.01] cursor-pointer hover:bg-white/[0.03] transition-colors">
                              {b.title}
                            </div>
                          ))}
                        </div>
                      )}
                      {type === "media" && (
                        <div className="bg-neutral-900 border border-white/10 rounded-2xl w-40 h-40 overflow-hidden flex items-center justify-center relative group shadow-xl">
                          {mediaType === "image" && mediaUrl.startsWith("http") ? (
                            <img src={mediaUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-neutral-500">
                              <ImageIcon className="w-6 h-6" />
                              <span className="text-[9px] uppercase font-mono-ui tracking-wider">{mediaType}</span>
                            </div>
                          )}
                        </div>
                      )}
                      {type === "media" && messageText && (
                        <div className="bg-[#3797f0] text-white rounded-2xl rounded-br-sm px-4 py-2.5 text-xs leading-relaxed shadow-lg">{messageText}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end animate-pulse">
                    <div className="border border-dashed border-white/15 bg-white/[0.01] rounded-2xl px-4 py-3 text-[10px] text-neutral-500 font-mono-ui italic text-center w-full">
                      Configure a etapa 2 para montar a resposta
                    </div>
                  </div>
                )}

                {/* Quick Reply Pills */}
                {type !== "card" && quickReplies.filter((q) => q.title.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-end pt-2">
                    {quickReplies.filter((q) => q.title.trim()).map((q) => (
                      <span key={q.id} className="border border-[#3797f0] text-[#3797f0] hover:bg-[#3797f0]/5 cursor-pointer rounded-full px-3 py-1 text-[10px] font-bold transition-all">
                        {q.title}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* iPhone Footer Navigation Bar */}
              <div className="h-12 bg-neutral-950 border-t border-white/5 flex items-center justify-between px-5 text-neutral-500">
                <Camera className="w-4 h-4" />
                <div className="flex-1 max-w-[150px] h-7 bg-neutral-900 border border-white/5 rounded-full px-3 flex items-center justify-between text-[9px] text-neutral-600">
                  <span>Mensagem...</span>
                  <Smile className="w-3 h-3" />
                </div>
                <Mic className="w-4 h-4" />
                <PicIcon className="w-4 h-4" />
              </div>

              {/* iPhone Bottom Bar Indicator */}
              <div className="h-5 bg-neutral-950 flex items-center justify-center pb-1">
                <div className="w-24 h-1 bg-white/40 rounded-full" />
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/* ============================================================
   Helper renders & string parsers
   ============================================================ */

function incomingMsg(triggerSource: string, triggers: string[]): string {
  const primaryKw = triggers.length > 0 ? triggers[0] : null
  if (triggerSource === "comment") {
    return primaryKw ? `Comentou "${primaryKw}"` : "Comentou no post"
  }
  if (triggerSource === "story") {
    return "Interagiu com seu Story"
  }
  return primaryKw ? `Enviou DM "${primaryKw}"` : "Enviou uma mensagem"
}

function hasDMContent(type: string, messageText: string, cardTitle: string, mediaUrl: string): boolean {
  if (type === "text" && messageText.trim().length > 0) return true
  if (type === "card" && cardTitle.trim().length > 0) return true
  if (type === "media" && mediaUrl.trim().length > 0) return true
  return false
}

function StepHeader({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="border-b border-white/5 pb-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="px-2 py-0.5 rounded-md bg-[#3b82f6]/10 border border-[#3b82f6]/25 text-[9px] font-mono-ui font-bold uppercase tracking-wider text-[#3b82f6]">
          Etapa {number}
        </div>
      </div>
      <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-xs text-neutral-500 mt-1 leading-relaxed">{description}</p>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono-ui text-[9px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-2">{children}</p>
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-11 bg-white/[0.02] border border-white/10 rounded-xl px-4 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#3b82f6]/50 focus:bg-white/[0.04] transition-all"
    />
  )
}

function ToggleRow({
  icon, title, sub, on, onToggle,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-all duration-200 bg-white/[0.01] ${
        on ? "border-[#3b82f6]/40 bg-[#3b82f6]/[0.03]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <span className={on ? "text-[#3b82f6]" : "text-neutral-500"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-xs text-neutral-500 mt-0.5 leading-relaxed">{sub}</span>
      </span>
      <span className={`w-10 h-5.5 rounded-full relative transition-colors shrink-0 ${on ? "bg-[#3b82f6]" : "bg-neutral-800"}`}>
        <span className={`absolute top-0.5 w-4.5 h-4.5 rounded-full bg-black shadow-md transition-all ${on ? "left-[20px]" : "left-0.5"}`} />
      </span>
    </button>
  )
}
