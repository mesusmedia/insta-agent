"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Zap, MessageCircle, Sparkles, ArrowUpRight,
  Send, AtSign, Clapperboard, Brain, Inbox, Lock, Terminal,
  Loader2, Mail,
} from "lucide-react"

const SUPPORT_URL = "#"

export function LandingPage() {
  const router = useRouter()

  const handleLogin = () => {
    window.location.href = `https://www.instagram.com/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_INSTAGRAM_APP_ID}&redirect_uri=${process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI}&response_type=code&scope=instagram_business_basic%2Cinstagram_business_manage_messages%2Cinstagram_business_manage_comments%2Cinstagram_business_content_publish%2Cinstagram_business_manage_insights`
  }

  const handleTestLogin = () => {
    localStorage.setItem("ig_user_id", "9999999999")
    localStorage.setItem("ig_username", "test_creator")
    router.push("/dashboard")
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#ededed] selection:bg-[#3b82f6]/30 selection:text-white overflow-x-hidden antialiased">
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .marquee-track { animation: marquee 30s linear infinite; }
        @keyframes fade-up { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .fade-up { animation: fade-up .7s cubic-bezier(.2,.7,.2,1) both; }
        .grain::before {
          content: ""; position: fixed; inset: 0; z-index: 5; pointer-events: none; opacity: .04;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");
        }
      `}</style>

      <div className="grain" />

      {/* Nav */}
      <nav className="relative z-50 flex items-center justify-between px-5 md:px-10 h-16 border-b border-white/[0.08]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-500 text-white flex items-center justify-center rounded-[6px]">
            <Zap className="w-3.5 h-3.5" strokeWidth={2.5} />
          </div>
          <span className="font-mono-ui text-sm font-bold tracking-tight">Insta Agent</span>
        </div>
        <div className="flex items-center gap-2">
          {process.env.NODE_ENV === "development" && (
            <button
              onClick={handleTestLogin}
              className="font-mono-ui text-xs font-bold text-blue-400 border border-blue-500/30 rounded-full px-4 py-1.5 hover:bg-blue-500/10 transition-colors"
            >
              Dev Login
            </button>
          )}
          <button
            onClick={handleLogin}
            className="font-mono-ui text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full px-4 py-1.5 hover:brightness-110 transition-all"
          >
            Entrar
          </button>
        </div>
      </nav>

      {/* Hero */}
      <main className="relative z-10">
        <section className="px-5 md:px-10 pt-16 md:pt-28 pb-16 max-w-6xl mx-auto">
          <div className="fade-up" style={{ animationDelay: "0ms" }}>
            <p className="font-mono-ui text-[11px] uppercase tracking-[0.25em] text-neutral-500 mb-6">
              Automacao para Instagram // para profissionais // zero esforco
            </p>
          </div>

          <h1 className="fade-up font-sans font-extrabold text-[15vw] md:text-[7.5rem] leading-[0.95] tracking-tight" style={{ animationDelay: "80ms" }}>
            Suas DMs,
            <br />
            <span className="italic bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">no piloto automatico.</span>
          </h1>

          <div className="fade-up mt-10 flex flex-col md:flex-row md:items-end gap-8 md:gap-16" style={{ animationDelay: "160ms" }}>
            <p className="text-neutral-400 text-base md:text-lg max-w-md leading-relaxed">
              Funis de comentario para DM, gatilhos por palavra-chave, reacoes a Stories, respostas com IA,
              caixa de entrada ao vivo e agendamento de Reels. A automacao inteligente para seu Instagram.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleLogin}
                className="group flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-mono-ui text-sm font-bold px-7 py-4 rounded-full hover:scale-[1.03] active:scale-[0.98] transition-transform shadow-[0_0_20px_rgba(59,130,246,0.25)]"
              >
                Conectar Instagram
                <ArrowUpRight className="w-4 h-4 group-hover:rotate-45 transition-transform" />
              </button>
              {process.env.NODE_ENV === "development" && (
                <button
                  onClick={handleTestLogin}
                  className="group flex items-center gap-2 font-mono-ui text-sm font-bold text-blue-400 border border-blue-500/25 px-7 py-4 rounded-full hover:bg-blue-500/10 active:scale-[0.98] transition-all"
                >
                  <Terminal className="w-4 h-4" />
                  Dev Login
                </button>
              )}
              <a
                href={SUPPORT_URL}
                className="flex items-center gap-2 font-mono-ui text-sm text-neutral-300 border border-white/15 px-6 py-4 rounded-full hover:border-blue-500/60 hover:text-blue-400 transition-colors"
              >
                <Mail className="w-4 h-4" />
                Fale com nosso time
              </a>
            </div>
          </div>
        </section>

        {/* Marquee */}
        <div className="border-y border-white/[0.08] py-3 overflow-hidden">
          <div className="marquee-track flex whitespace-nowrap font-mono-ui text-xs uppercase tracking-[0.2em] text-neutral-600 gap-8 w-max">
            {Array.from({ length: 2 }).map((_, copy) => (
              <div key={copy} className="flex gap-8">
                {["comentario → DM", "gatilhos por palavra-chave", "reacoes a stories", "resposta automatica com IA", "caixa de entrada", "ice breakers", "agendador de reels", "follow gate", "respostas rapidas", "anexos de midia", "respostas publicas + privadas"].map((t) => (
                  <span key={t} className="flex items-center gap-8">
                    {t} <span className="text-blue-400">✦</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Feature grid */}
        <section className="px-5 md:px-10 py-20 max-w-6xl mx-auto">
          <div className="flex items-baseline justify-between mb-10">
            <h2 className="font-sans font-extrabold text-4xl md:text-5xl">Tudo que as ferramentas pagas fazem.</h2>
            <span className="hidden md:block font-mono-ui text-xs text-neutral-600">Pronto para usar</span>
          </div>

          <div className="grid md:grid-cols-3 gap-px bg-white/[0.08] border border-white/[0.08]">
            <Feature icon={<MessageCircle className="w-4 h-4" />} title="Funis de comentario → DM"
              desc="Gatilhos por palavra-chave ou resposta geral em qualquer post. Escolha apenas DM, apenas resposta publica, ou ambos — com suas proprias respostas publicas rotativas." />
            <Feature icon={<Send className="w-4 h-4" />} title="Automacao de DM por palavra-chave"
              desc="Responda automaticamente a DMs com texto, midia ou cards com botoes. Chips de resposta rapida guiam as pessoas pelo seu funil." />
            <Feature icon={<AtSign className="w-4 h-4" />} title="Gatilhos de Stories"
              desc="Reaja a mencoes em Stories, reacoes com emoji e respostas a Stories. Filtre por emoji ou palavra-chave." />
            <Feature icon={<Brain className="w-4 h-4" />} title="Resposta automatica com IA"
              desc="Informe o contexto da sua conta — nicho, produtos, tom — e deixe a IA responder DMs nao correspondidas como um humano." />
            <Feature icon={<Inbox className="w-4 h-4" />} title="Caixa de entrada ao vivo"
              desc="Todas as conversas em um painel. Entre manualmente a qualquer momento, dispare respostas rapidas das suas automacoes salvas." />
            <Feature icon={<Clapperboard className="w-4 h-4" />} title="Agendador de Reels"
              desc="Pool de conteudo + publicacao por intervalo. Faca upload uma vez e publique no seu ritmo com automacoes vinculadas." />
            <Feature icon={<Lock className="w-4 h-4" />} title="Bloqueio por follow"
              desc="Bloqueie conteudo atras de um follow. Nao-seguidores recebem um convite para seguir; um toque depois desbloqueiam o conteudo." />
            <Feature icon={<Sparkles className="w-4 h-4" />} title="Envio humanizado"
              desc="Indicadores de digitacao opcionais e atrasos aleatorios para que as respostas parecam naturais, nao de bot." />
            <Feature icon={<Terminal className="w-4 h-4" />} title="Infraestrutura robusta"
              desc="Next.js + Supabase. Deploy seguro, seus dados ficam no seu banco. Performance e confiabilidade garantidas." />
          </div>
        </section>

        {/* Contact CTA strip */}
        <section className="px-5 md:px-10 pb-24 max-w-6xl mx-auto">
          <div className="border border-white/[0.08] rounded-2xl p-8 md:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 bg-gradient-to-br from-blue-500/[0.04] to-indigo-500/[0.02]">
            <div>
              <h3 className="font-sans font-extrabold text-3xl md:text-4xl mb-2">Pronto para automatizar?</h3>
              <p className="text-neutral-500 text-sm max-w-md">
                Fale com nosso time para configurar sua conta e comecar a automatizar
                seu Instagram medico hoje mesmo.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <a
                href={SUPPORT_URL}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:brightness-110 transition-all shadow-[0_0_15px_rgba(59,130,246,0.2)]"
              >
                <Mail className="w-3.5 h-3.5" /> Fale com nosso time
              </a>
              <button
                onClick={handleLogin}
                className="flex items-center gap-2 border border-white/15 text-neutral-300 font-mono-ui text-xs font-bold px-5 py-3 rounded-full hover:border-blue-500/40 hover:text-blue-400 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" /> Conectar Instagram
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] px-5 md:px-10 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <span className="font-mono-ui text-[11px] text-neutral-600">
          Insta Agent — automacao inteligente para Instagram
        </span>
        <div className="flex items-center gap-5 font-mono-ui text-[11px] text-neutral-500">
          <span>&copy; 2026 L3M / Mesus Media</span>
          <a href={SUPPORT_URL} className="hover:text-blue-400 transition-colors">Contato</a>
        </div>
      </footer>
    </div>
  )
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-[#09090b] p-7 group hover:bg-[#111114] transition-colors">
      <div className="w-9 h-9 rounded-lg border border-white/10 flex items-center justify-center text-neutral-500 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors mb-5">
        {icon}
      </div>
      <h3 className="font-mono-ui text-sm font-bold text-white mb-2">{title}</h3>
      <p className="text-[13px] text-neutral-500 leading-relaxed">{desc}</p>
    </div>
  )
}
