"use client"

import { useState, useEffect, useMemo } from "react"
import {
  Plus, Trash2, Film, Check, MessageCircle, Send, AtSign, Heart,
  MessageSquare, Image as ImageIcon, Timer, Eye, Megaphone, Lock,
  Link2, Zap, ChevronDown, X, Loader2,
} from "lucide-react"
import { TagInput } from "@/components/ui/tag-input"
import type { ProButton, QuickReplyOption, Automation } from "@/lib/types"
import { toast } from "sonner"

/* ============================================================
   ManyChat-style flow builder.
   One vertical flow: WHEN (trigger) → THEN (reply) → EXTRAS.
   Everything visible at once — no wizard. Live phone preview.
   ============================================================ */

const Y = "#ffe14d"

interface CreateRuleFormProps {
  userId: string
  triggerSource: "comment" | "dm" | "story"
  onSuccess: () => void
  editRule?: Automation | null
}

export function CreateRuleForm({ userId, triggerSource, onSuccess, editRule }: CreateRuleFormProps) {
  const isEditing = !!editRule

  /* ---------- WHEN ---------- */
  const [replyToAll, setReplyToAll] = useState(false)
  const [triggers, setTriggers] = useState<string[]>([])
  const [storyTriggerType, setStoryTriggerType] = useState<"mention" | "reaction" | "reply">("mention")
  const [selectedReel, setSelectedReel] = useState<any | null>(null)
  const [showReelPicker, setShowReelPicker] = useState(false)

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
  const [extrasOpen, setExtrasOpen] = useState(false)

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
    setReplyToAll(editRule.trigger_type === "reply_all")
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
    if (content.check_follow || content.delay_seconds || content.typing_indicator) setExtrasOpen(true)
    if (editRule.specific_media_id) setSelectedReel({ id: editRule.specific_media_id, caption: "Previously selected post" })
  }, [editRule])

  /* Auto name */
  useEffect(() => {
    if (name || isEditing) return
    if (replyToAll) setName("Reply to every comment")
    else if (triggers.length > 0) setName(`Reply to "${triggers[0]}"`)
  }, [triggers, replyToAll, name, isEditing])

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

  const needsKeywords =
    !(triggerSource === "comment" && replyToAll) &&
    !(triggerSource === "story" && storyTriggerType === "mention")

  const whenValid = replyToAll ? !!selectedReel : !needsKeywords || triggers.length > 0
  const thenValid =
    replyMode === "public_only" ||
    (type === "text" ? messageText.trim().length > 0 : type === "card" ? cardTitle.trim().length > 0 : mediaUrl.trim().length > 0)
  const canSave = whenValid && thenValid && name.trim().length > 0

  /* Plain-language summary sentence */
  const summary = useMemo(() => {
    const who =
      triggerSource === "comment"
        ? replyToAll ? "anyone comments on your post" : `someone comments ${triggers.length ? `"${triggers[0]}"` : "a keyword"}`
        : triggerSource === "dm"
          ? `someone DMs you ${triggers.length ? `"${triggers[0]}"` : "a keyword"}`
          : storyTriggerType === "mention" ? "someone mentions you in a story"
            : storyTriggerType === "reaction" ? "someone reacts to your story"
              : "someone replies to your story"
    const what =
      replyMode === "public_only" ? "reply publicly"
        : type === "card" ? "send them a card with buttons"
          : type === "media" ? `send them ${mediaType === "image" ? "an image" : `a ${mediaType}`}`
            : "send them a DM"
    return { who, what }
  }, [triggerSource, replyToAll, triggers, storyTriggerType, replyMode, type, mediaType])

  /* ---------- save ---------- */
  const handleSubmit = async () => {
    if (!canSave || saving) return
    setSaving(true)

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
      trigger_type: replyToAll ? "reply_all" : triggerSource === "story" ? storyTriggerType : "keyword",
      trigger_value: replyToAll ? "ALL_COMMENTS"
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
        toast.success(isEditing ? "Automation updated" : "Automation is live")
        onSuccess()
      } else {
        toast.error("Could not save — try again")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setSaving(false)
    }
  }

  /* ============================================================
     RENDER
     ============================================================ */
  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-8">
      {/* ================= LEFT: FLOW ================= */}
      <div className="relative">
        {/* vertical flow line */}
        <div className="absolute left-[15px] top-8 bottom-8 w-px bg-white/10" aria-hidden />

        <div className="space-y-4">
          {/* ---------- WHEN ---------- */}
          <FlowBlock kicker="WHEN" title={
            triggerSource === "comment" ? "Someone comments on your post"
              : triggerSource === "dm" ? "Someone sends you a DM"
                : "Someone interacts with your story"
          }>
            {triggerSource === "story" && (
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "mention" as const, icon: <AtSign className="w-4 h-4" />, label: "Mentions me" },
                  { key: "reaction" as const, icon: <Heart className="w-4 h-4" />, label: "Reacts" },
                  { key: "reply" as const, icon: <MessageSquare className="w-4 h-4" />, label: "Replies" },
                ]).map(({ key, icon, label }) => (
                  <Chip key={key} active={storyTriggerType === key} onClick={() => setStoryTriggerType(key)} icon={icon} label={label} />
                ))}
              </div>
            )}

            {triggerSource === "comment" && (
              <ToggleRow
                icon={<Megaphone className="w-4 h-4" />}
                title="Reply to every single comment"
                sub="No keywords needed — pick one post below"
                on={replyToAll}
                onToggle={() => setReplyToAll(!replyToAll)}
              />
            )}

            {needsKeywords && (
              <div className="space-y-1.5">
                <FieldLabel>
                  {triggerSource === "story" && storyTriggerType === "reaction"
                    ? "Only these emojis (leave empty = any reaction)"
                    : "Words that trigger the reply"}
                </FieldLabel>
                <TagInput
                  value={triggers}
                  onChange={setTriggers}
                  placeholder={
                    triggerSource === "story" && storyTriggerType === "reaction" ? "e.g. ❤️, 🔥" : "type a word, press Enter — e.g. price"
                  }
                />
                <p className="text-[11px] text-neutral-600">If their message contains any of these words, the automation runs.</p>
              </div>
            )}

            {triggerSource === "comment" && !replyToAll && (
              <ToggleRow
                icon={<MessageSquare className="w-4 h-4" />}
                title="Also check replies to comments"
                sub="Normally only top-level comments count"
                on={includeReplies}
                onToggle={() => setIncludeReplies(!includeReplies)}
                small
              />
            )}

            {(triggerSource === "comment" || triggerSource === "story") && (
              <div className="space-y-1.5">
                <FieldLabel>
                  {replyToAll ? "Which post?" : triggerSource === "story" ? "Which story? (optional — empty = all)" : "Which post? (optional — empty = all posts)"}
                </FieldLabel>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowReelPicker(!showReelPicker)}
                    className="w-full p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:border-white/25 transition-colors text-left flex items-center gap-3"
                  >
                    {selectedReel ? (
                      <>
                        {selectedReel.image_url && <img src={selectedReel.image_url} alt="" className="w-9 h-9 rounded object-cover" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{selectedReel.caption || "No caption"}</p>
                          <p className="font-mono-ui text-[10px] text-[#ffe14d]">Selected</p>
                        </div>
                        <X
                          className="w-4 h-4 text-neutral-500 hover:text-white shrink-0"
                          onClick={(e) => { e.stopPropagation(); setSelectedReel(null) }}
                        />
                      </>
                    ) : (
                      <>
                        <Film className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="text-sm text-neutral-500">Tap to choose from your posts</span>
                        <ChevronDown className="w-4 h-4 text-neutral-600 ml-auto" />
                      </>
                    )}
                  </button>
                  {showReelPicker && (
                    <ReelPicker
                      reels={reels}
                      loading={loadingReels}
                      storyOnly={triggerSource === "story"}
                      onPick={(r) => { setSelectedReel(r); setShowReelPicker(false) }}
                    />
                  )}
                </div>
              </div>
            )}
          </FlowBlock>

          {/* ---------- THEN: public reply (comments only) ---------- */}
          {triggerSource === "comment" && (
            <FlowBlock kicker="THEN" title="Reply under their comment" optional>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "both" as const, label: "Reply + DM" },
                  { key: "public_only" as const, label: "Reply only" },
                  { key: "dm_only" as const, label: "DM only" },
                ]).map(({ key, label }) => (
                  <Chip key={key} active={replyMode === key} onClick={() => setReplyMode(key)} label={label} />
                ))}
              </div>
              {replyMode !== "dm_only" && (
                <div className="space-y-1.5">
                  <FieldLabel>Public replies — we rotate them so it looks human</FieldLabel>
                  <TagInput value={publicReplies} onChange={setPublicReplies} placeholder={'e.g. "Check your DMs!" — Enter to add'} />
                  <p className="text-[11px] text-neutral-600">Leave empty to use our built-in replies.</p>
                </div>
              )}
            </FlowBlock>
          )}

          {/* ---------- THEN: DM ---------- */}
          {replyMode !== "public_only" && (
            <FlowBlock kicker="THEN" title="Send them a DM">
              <div className="grid grid-cols-3 gap-2">
                {([
                  { key: "text" as const, icon: <MessageCircle className="w-4 h-4" />, label: "Message" },
                  { key: "card" as const, icon: <Link2 className="w-4 h-4" />, label: "Card + buttons" },
                  { key: "media" as const, icon: <ImageIcon className="w-4 h-4" />, label: "Photo / video" },
                ]).map(({ key, icon, label }) => (
                  <Chip key={key} active={type === key} onClick={() => setType(key)} icon={icon} label={label} />
                ))}
              </div>

              {type === "text" && (
                <div className="space-y-1.5">
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full bg-white/[0.03] border border-white/10 rounded-lg px-3.5 py-3 text-sm text-white placeholder:text-neutral-600 resize-none focus:outline-none focus:border-[#ffe14d]/50 transition-colors"
                    placeholder="Hey! Here's the link you asked for…"
                  />
                  <p className="font-mono-ui text-[10px] text-neutral-600 text-right">{messageText.length}/1000</p>
                </div>
              )}

              {type === "card" && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <TextField value={cardTitle} onChange={setCardTitle} placeholder="Card title — e.g. Get the free guide" />
                    <TextField value={cardSubtitle} onChange={setCardSubtitle} placeholder="Small text under the title (optional)" />
                    <TextField value={cardImage} onChange={setCardImage} placeholder="Image link — https://… (optional)" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <FieldLabel>Buttons ({buttons.length}/3)</FieldLabel>
                      <button type="button" onClick={addButton} disabled={buttons.length >= 3}
                        className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Add button
                      </button>
                    </div>
                    {buttons.map((btn) => (
                      <div key={btn.id} className="flex gap-2 items-center bg-white/[0.03] p-2 rounded-lg border border-white/10">
                        <input
                          value={btn.title}
                          onChange={(e) => updateButton(btn.id, "title", e.target.value)}
                          className="h-8 text-xs flex-1 bg-transparent border-none px-2 text-white placeholder:text-neutral-600 focus:outline-none"
                          placeholder="Button text"
                        />
                        <select
                          value={btn.type}
                          onChange={(e) => updateButton(btn.id, "type", e.target.value)}
                          className="h-8 text-[11px] bg-black border border-white/10 rounded px-1.5 text-neutral-300 focus:outline-none"
                        >
                          <option value="web_url">Opens a link</option>
                          <option value="postback">Triggers a flow</option>
                        </select>
                        <input
                          value={btn.type === "web_url" ? btn.url : btn.payload}
                          onChange={(e) => updateButton(btn.id, btn.type === "web_url" ? "url" : "payload", e.target.value)}
                          className="h-8 text-xs flex-1 bg-transparent border-none px-2 text-white placeholder:text-neutral-600 focus:outline-none"
                          placeholder={btn.type === "web_url" ? "https://…" : "Keyword to trigger"}
                        />
                        <button type="button" onClick={() => removeButton(btn.id)} className="text-neutral-600 hover:text-red-400 p-1 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {type === "media" && (
                <div className="space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    {(["image", "video", "audio"] as const).map((m) => (
                      <Chip key={m} active={mediaType === m} onClick={() => setMediaType(m)} label={m === "image" ? "Photo" : m === "video" ? "Video" : "Audio"} />
                    ))}
                  </div>
                  <TextField value={mediaUrl} onChange={setMediaUrl} placeholder="Link to the file — https://…" />
                  <TextField value={messageText} onChange={setMessageText} placeholder="Message to send after (optional)" />
                </div>
              )}

              {/* Quick replies */}
              {type !== "card" && (
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Tap-to-answer chips ({quickReplies.length}/4)</FieldLabel>
                    <button type="button" onClick={addQuickReply} disabled={quickReplies.length >= 4}
                      className="font-mono-ui text-[11px] text-neutral-400 hover:text-white disabled:opacity-40 flex items-center gap-1 transition-colors">
                      <Plus className="w-3 h-3" /> Add chip
                    </button>
                  </div>
                  {quickReplies.length > 0 && (
                    <div className="space-y-1.5">
                      {quickReplies.map((q) => (
                        <div key={q.id} className="flex gap-2 items-center">
                          <input
                            value={q.title}
                            onChange={(e) => updateQuickReply(q.id, e.target.value)}
                            maxLength={20}
                            className="h-9 text-xs flex-1 bg-white/[0.03] border border-white/10 rounded-lg px-3 text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50"
                            placeholder='e.g. "Yes please!"'
                          />
                          <button type="button" onClick={() => removeQuickReply(q.id)} className="text-neutral-600 hover:text-red-400 p-1 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <p className="text-[11px] text-neutral-600">Buttons the person can tap instead of typing. Each tap can trigger another automation.</p>
                    </div>
                  )}
                </div>
              )}
            </FlowBlock>
          )}

          {/* ---------- EXTRAS ---------- */}
          <FlowBlock kicker="EXTRAS" title="Make it feel human" collapsible open={extrasOpen} onToggleOpen={() => setExtrasOpen(!extrasOpen)}>
            <ToggleRow icon={<Lock className="w-4 h-4" />} title="Followers only" sub="Non-followers get a follow prompt first, then the content" on={checkFollow} onToggle={() => setCheckFollow(!checkFollow)} small />
            <ToggleRow icon={<Eye className="w-4 h-4" />} title="Show typing…" sub="Displays the typing indicator before the reply lands" on={typingIndicator} onToggle={() => setTypingIndicator(!typingIndicator)} small />
            <div className="flex items-center justify-between p-3 rounded-lg border border-white/10">
              <div className="flex items-center gap-3">
                <Timer className="w-4 h-4 text-neutral-500" />
                <div>
                  <p className="text-sm text-white">Wait before replying</p>
                  <p className="text-[11px] text-neutral-600">Instant replies look botty</p>
                </div>
              </div>
              <select
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="bg-black border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              >
                <option value={0}>Instantly</option>
                <option value={3}>3 seconds</option>
                <option value={5}>5 seconds</option>
                <option value={10}>10 seconds</option>
                <option value={30}>30 seconds</option>
              </select>
            </div>
          </FlowBlock>

          {/* ---------- SAVE ---------- */}
          <div className="pl-10 space-y-3">
            <div className="space-y-1.5">
              <FieldLabel>Name this automation</FieldLabel>
              <TextField value={name} onChange={setName} placeholder='e.g. "Price question reply"' />
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSave || saving}
              className="w-full h-12 rounded-full bg-[#ffe14d] text-black font-mono-ui text-sm font-bold tracking-tight hover:brightness-95 active:scale-[0.99] transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {saving ? "Saving…" : isEditing ? "Save changes" : "Turn it on"}
            </button>
            <p className="text-center text-[11px] text-neutral-600">
              When {summary.who}, we'll {summary.what}.
            </p>
          </div>
        </div>
      </div>

      {/* ================= RIGHT: PHONE PREVIEW ================= */}
      {replyMode !== "public_only" && (
        <div className="hidden lg:block">
          <div className="sticky top-6">
            <p className="font-mono-ui text-[10px] uppercase tracking-[0.2em] text-neutral-600 mb-3 text-center">Live preview</p>
            <PhonePreview
              type={type}
              messageText={messageText}
              cardTitle={cardTitle}
              cardSubtitle={cardSubtitle}
              cardImage={cardImage}
              buttons={buttons}
              mediaType={mediaType}
              mediaUrl={mediaUrl}
              quickReplies={quickReplies}
              triggerText={triggers[0]}
              triggerSource={triggerSource}
            />
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   Building blocks
   ============================================================ */

function FlowBlock({
  kicker, title, children, optional, collapsible, open, onToggleOpen,
}: {
  kicker: string
  title: string
  children: React.ReactNode
  optional?: boolean
  collapsible?: boolean
  open?: boolean
  onToggleOpen?: () => void
}) {
  const isOpen = collapsible ? !!open : true
  return (
    <section className="relative pl-10">
      {/* node dot on the flow line */}
      <div className="absolute left-0 top-1.5 w-8 h-8 rounded-full bg-black border border-white/15 flex items-center justify-center z-10">
        <div className={`w-2 h-2 rounded-full ${kicker === "EXTRAS" ? "bg-neutral-600" : "bg-[#ffe14d]"}`} />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.015] overflow-hidden">
        <button
          type="button"
          onClick={collapsible ? onToggleOpen : undefined}
          className={`w-full flex items-center gap-3 px-5 py-4 text-left ${collapsible ? "cursor-pointer hover:bg-white/[0.02]" : "cursor-default"}`}
        >
          <span className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.2em] text-[#ffe14d]">{kicker}</span>
          <span className="text-sm font-medium text-white">{title}</span>
          {optional && <span className="font-mono-ui text-[9px] uppercase text-neutral-600 border border-white/10 rounded-full px-2 py-0.5">optional</span>}
          {collapsible && <ChevronDown className={`w-4 h-4 text-neutral-500 ml-auto transition-transform ${isOpen ? "rotate-180" : ""}`} />}
        </button>
        {isOpen && <div className="px-5 pb-5 space-y-4">{children}</div>}
      </div>
    </section>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="font-mono-ui text-[10px] font-bold uppercase tracking-[0.15em] text-neutral-500">{children}</p>
}

function TextField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full h-10 bg-white/[0.03] border border-white/10 rounded-lg px-3.5 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-[#ffe14d]/50 transition-colors"
    />
  )
}

function Chip({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon?: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-10 rounded-lg border text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
        active ? "border-[#ffe14d] bg-[#ffe14d]/10 text-[#ffe14d]" : "border-white/10 text-neutral-400 hover:border-white/25 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function ToggleRow({
  icon, title, sub, on, onToggle, small,
}: {
  icon: React.ReactNode
  title: string
  sub: string
  on: boolean
  onToggle: () => void
  small?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full ${small ? "p-3" : "p-4"} rounded-lg border text-left flex items-center gap-3 transition-colors ${
        on ? "border-[#ffe14d]/40 bg-[#ffe14d]/[0.04]" : "border-white/10 hover:border-white/25"
      }`}
    >
      <span className={on ? "text-[#ffe14d]" : "text-neutral-500"}>{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm text-white">{title}</span>
        <span className="block text-[11px] text-neutral-600">{sub}</span>
      </span>
      <span className={`w-9 h-5 rounded-full relative transition-colors shrink-0 ${on ? "bg-[#ffe14d]" : "bg-white/10"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  )
}

function ReelPicker({
  reels, loading, storyOnly, onPick,
}: {
  reels: any[]
  loading: boolean
  storyOnly: boolean
  onPick: (r: any) => void
}) {
  const filtered = storyOnly
    ? reels.filter((r: any) => r.media_type === "STORY" || r.media_product_type === "STORY")
    : reels

  return (
    <div className="absolute top-full left-0 right-0 mt-2 max-h-56 overflow-y-auto bg-neutral-950 border border-white/10 rounded-xl z-50 shadow-2xl">
      {loading ? (
        <p className="p-4 text-center text-sm text-neutral-500">Loading your posts…</p>
      ) : filtered.length === 0 ? (
        <p className="p-4 text-center text-sm text-neutral-500">{storyOnly ? "No active stories" : "No posts found"}</p>
      ) : (
        filtered.map((reel: any) => {
          const isStory = reel.media_type === "STORY" || reel.media_product_type === "STORY"
          const label = isStory ? "Story" : reel.media_type === "VIDEO" ? "Reel" : reel.media_type === "CAROUSEL_ALBUM" ? "Carousel" : "Post"
          return (
            <button
              key={reel.id}
              type="button"
              onClick={() => onPick(reel)}
              className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
            >
              {reel.image_url ? (
                <img src={reel.image_url} alt="" className="w-9 h-9 rounded object-cover opacity-80" loading="lazy" />
              ) : (
                <div className="w-9 h-9 rounded bg-white/5 flex items-center justify-center">
                  <Film className="w-4 h-4 text-neutral-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{reel.caption || "Untitled"}</p>
                <span className="font-mono-ui text-[9px] text-neutral-500 uppercase">{label}</span>
              </div>
            </button>
          )
        })
      )}
    </div>
  )
}

/* ---------- Instagram-style phone preview ---------- */
function PhonePreview({
  type, messageText, cardTitle, cardSubtitle, cardImage, buttons, mediaType, mediaUrl, quickReplies, triggerText, triggerSource,
}: {
  type: "text" | "card" | "media"
  messageText: string
  cardTitle: string
  cardSubtitle: string
  cardImage: string
  buttons: ProButton[]
  mediaType: string
  mediaUrl: string
  quickReplies: QuickReplyOption[]
  triggerText?: string
  triggerSource: string
}) {
  const incoming =
    triggerSource === "comment" ? (triggerText ? `${triggerText}?` : "price?")
      : triggerSource === "story" ? "❤️"
        : triggerText || "hey"
  const hasContent = type === "text" ? !!messageText : type === "card" ? !!cardTitle : !!mediaUrl

  return (
    <div className="rounded-[2rem] border border-white/10 bg-neutral-950 p-3 shadow-2xl">
      {/* header */}
      <div className="flex items-center gap-2 px-2 py-2 border-b border-white/5 mb-3">
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-500" />
        <span className="text-xs font-medium text-white">you</span>
        <span className="font-mono-ui text-[9px] text-neutral-600 ml-auto">Instagram DM</span>
      </div>

      <div className="space-y-2 px-1 pb-2 min-h-[180px]">
        {/* their message */}
        <div className="flex justify-start">
          <div className="bg-white/10 text-white rounded-2xl rounded-bl-md px-3.5 py-2 text-xs max-w-[80%]">{incoming}</div>
        </div>

        {/* our reply */}
        {hasContent ? (
          <div className="flex justify-end">
            <div className="max-w-[85%] space-y-1">
              {type === "text" && (
                <div className="bg-[#3797f0] text-white rounded-2xl rounded-br-md px-3.5 py-2 text-xs whitespace-pre-wrap break-words">
                  {messageText.slice(0, 300)}
                </div>
              )}
              {type === "card" && (
                <div className="bg-neutral-900 border border-white/10 rounded-xl overflow-hidden w-52">
                  {cardImage && cardImage.startsWith("http") && (
                    <img src={cardImage} alt="" className="w-full h-24 object-cover" loading="lazy" />
                  )}
                  <div className="p-2.5">
                    <p className="text-xs font-bold text-white">{cardTitle}</p>
                    {cardSubtitle && <p className="text-[10px] text-neutral-400 mt-0.5">{cardSubtitle}</p>}
                  </div>
                  {buttons.filter((b) => b.title).map((b) => (
                    <div key={b.id} className="border-t border-white/10 py-1.5 text-center text-[10px] font-medium text-[#3797f0]">
                      {b.title}
                    </div>
                  ))}
                </div>
              )}
              {type === "media" && (
                <div className="bg-neutral-900 border border-white/10 rounded-xl w-40 h-40 flex items-center justify-center">
                  {mediaType === "image" && mediaUrl.startsWith("http") ? (
                    <img src={mediaUrl} alt="" className="w-full h-full object-cover rounded-xl" loading="lazy" />
                  ) : (
                    <ImageIcon className="w-6 h-6 text-neutral-600" />
                  )}
                </div>
              )}
              {type === "media" && messageText && (
                <div className="bg-[#3797f0] text-white rounded-2xl rounded-br-md px-3.5 py-2 text-xs">{messageText.slice(0, 120)}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex justify-end">
            <div className="border border-dashed border-white/15 rounded-2xl px-3.5 py-2 text-[10px] text-neutral-600">
              your reply shows here
            </div>
          </div>
        )}

        {/* quick reply chips */}
        {quickReplies.filter((q) => q.title.trim()).length > 0 && (
          <div className="flex flex-wrap gap-1.5 justify-end pt-1">
            {quickReplies.filter((q) => q.title.trim()).map((q) => (
              <span key={q.id} className="border border-[#3797f0] text-[#3797f0] rounded-full px-2.5 py-1 text-[10px]">
                {q.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
