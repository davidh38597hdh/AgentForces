'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';

const PILLARS = [
  {
    title: 'Force, not framework',
    body: 'Design and run a mesh in product — not another library to embed and operate yourself.',
  },
  {
    title: 'Boundaries by design',
    body: 'Companies, networks, and Ext-only edges. Cross-org talk is intentional, never a flat free-for-all.',
  },
  {
    title: 'Chief + networks',
    body: 'Research, computation, creative — chief routes the primary network; hops stay visible.',
  },
  {
    title: 'Your keys, your models',
    body: 'BYOK per agent: xAI, OpenAI, Anthropic. Token router prefers your keys over ours.',
  },
  {
    title: 'Connectors that ship',
    body: 'Gmail, Slack, webhooks as agent tools — notify and act without leaving the force.',
  },
  {
    title: 'Mesh protocol path',
    body: 'AMEP/1 session identity today. Sealed inter-agent hops are the security roadmap — not an afterthought.',
  },
  {
    title: 'Operator UX',
    body: 'Agent library, inspector, canvas, hop logs. Built for people who field forces, not only write them.',
  },
] as const;

const SLIDE_LABELS = ['Home', 'Why AgentForces', 'Compare'] as const;

type Props = {
  googleReady: boolean;
};

export function LandingCarousel({ googleReady }: Props) {
  const [index, setIndex] = useState(0);
  const total = SLIDE_LABELS.length;

  const go = useCallback(
    (next: number) => {
      setIndex(((next % total) + total) % total);
    },
    [total]
  );

  const prev = useCallback(() => go(index - 1), [go, index]);
  const next = useCallback(() => go(index + 1), [go, index]);

  // Optional slow auto-rotate; pause when tab hidden
  useEffect(() => {
    if (typeof document !== 'undefined' && document.hidden) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      setIndex((i) => (i + 1) % total);
    }, 14000);
    return () => window.clearInterval(id);
  }, [total]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prev, next]);

  return (
    <div className="w-full">
      {/* Carousel viewport — primary home first; Why/compare secondary */}
      <div className="relative w-full overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out will-change-transform"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {/* Slide 0 — Home hero (default) */}
          <section
            className="w-full min-w-full max-w-full shrink-0 grow-0 basis-full px-0.5"
            aria-hidden={index !== 0}
            aria-label="Home"
          >
            <div className="mb-6 sm:mb-8 overflow-visible flex items-center gap-4 sm:gap-5 px-0.5">
              <Logo size={56} className="shrink-0" />
              <h1 className="text-5xl sm:text-6xl font-semibold tracking-tight af-title-gradient">
                AgentForces
              </h1>
            </div>

            <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 mb-4">
              Private multi-agent mesh for business outcomes
            </p>

            <div className="af-card rounded-3xl px-6 sm:px-10 py-10 sm:py-12">
              <p className="text-lg sm:text-xl text-zinc-100 mb-4 max-w-2xl leading-relaxed font-medium">
                Create your own force with a mesh of agents who work together to get common
                outcomes.
              </p>
              <p className="text-sm text-zinc-400 mb-8 max-w-2xl leading-relaxed">
                Not a framework you embed. A product where you field agents across companies and
                networks — with controlled interfaces, chief routing, and your own API keys.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/login" className="af-btn-primary">
                  Continue with Google
                </Link>
                <Link href="/portal" className="af-btn-ghost">
                  Open portal
                </Link>
                <Link href="/dashboard" className="af-btn-ghost">
                  Mesh canvas
                </Link>
              </div>
              {!googleReady && (
                <p className="mt-4 text-[11px] text-amber-500/80">
                  Production requires Google OAuth env (GOOGLE_CLIENT_ID + SECRET + AUTH_SECRET).
                </p>
              )}
              <button
                type="button"
                onClick={() => go(1)}
                className="mt-8 text-[11px] text-zinc-500 hover:text-[var(--purple-soft)] transition-colors"
              >
                Why AgentForces →
              </button>
            </div>
          </section>

          {/* Slide 1 — Why AgentForces (secondary) */}
          <section
            className="w-full min-w-full max-w-full shrink-0 grow-0 basis-full px-0.5"
            aria-hidden={index !== 1}
            aria-label="Why AgentForces"
          >
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Secondary · differentiation
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
                Why AgentForces
              </h2>
              <p className="text-sm text-zinc-500 mt-2 max-w-xl leading-relaxed">
                Built for multi-party agent work — not another notebook of agent loops.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {PILLARS.map((p) => (
                <div
                  key={p.title}
                  className="rounded-2xl border border-white/[0.07] bg-black/50 px-4 py-4 hover:border-violet-500/30 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-zinc-100 mb-1.5">{p.title}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-6 text-sm text-zinc-500 max-w-2xl leading-relaxed">
              LangGraph programs control flow. CrewAI staffs a crew in code.{' '}
              <span className="text-zinc-300">AgentForces fields a force</span> — with edges that
              respect who can talk to whom.
            </p>
          </section>

          {/* Slide 2 — Layer comparison */}
          <section
            className="w-full min-w-full max-w-full shrink-0 grow-0 basis-full px-0.5"
            aria-hidden={index !== 2}
            aria-label="Compare layers"
          >
            <div className="mb-5">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-500 mb-2">
                Secondary · layer comparison
              </p>
              <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-zinc-100">
                Product vs frameworks
              </h2>
              <p className="text-sm text-zinc-500 mt-2 max-w-xl leading-relaxed">
                Same multi-agent space — different layer of the stack.
              </p>
            </div>
            <div className="af-card rounded-2xl px-5 sm:px-8 py-6 overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead>
                  <tr className="text-zinc-500 border-b border-white/[0.06]">
                    <th className="pb-2 pr-4 font-medium"> </th>
                    <th className="pb-2 pr-4 font-medium">LangGraph</th>
                    <th className="pb-2 pr-4 font-medium">CrewAI</th>
                    <th className="pb-2 font-medium text-[var(--cyan-soft)]">AgentForces</th>
                  </tr>
                </thead>
                <tbody className="text-zinc-400">
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2.5 pr-4 text-zinc-500">What it is</td>
                    <td className="py-2.5 pr-4">Graph runtime in code</td>
                    <td className="py-2.5 pr-4">Crews & roles in code</td>
                    <td className="py-2.5 text-zinc-200">Mesh product & canvas</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2.5 pr-4 text-zinc-500">Boundaries</td>
                    <td className="py-2.5 pr-4">Your app</td>
                    <td className="py-2.5 pr-4">Your app</td>
                    <td className="py-2.5 text-zinc-200">Companies · networks · Ext</td>
                  </tr>
                  <tr className="border-b border-white/[0.04]">
                    <td className="py-2.5 pr-4 text-zinc-500">Security story</td>
                    <td className="py-2.5 pr-4">App-level</td>
                    <td className="py-2.5 pr-4">App-level</td>
                    <td className="py-2.5 text-zinc-200">AMEP/1 path · auth · BYOK</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 text-zinc-500">Buyer</td>
                    <td className="py-2.5 pr-4">Engineers embedding agents</td>
                    <td className="py-2.5 pr-4">Builders scripting teams</td>
                    <td className="py-2.5 text-zinc-200">Teams fielding a force</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/login" className="af-btn-primary">
                Continue with Google
              </Link>
              <Link href="/portal" className="af-btn-ghost">
                Open portal
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2" role="tablist" aria-label="Landing slides">
          {SLIDE_LABELS.map((label, i) => (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={index === i}
              onClick={() => go(i)}
              className={`text-[11px] px-3 py-1.5 rounded-full border transition-colors ${
                index === i
                  ? 'border-violet-500/50 bg-violet-500/15 text-zinc-100'
                  : 'border-white/[0.08] text-zinc-500 hover:text-zinc-300 hover:border-white/20'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="h-9 w-9 rounded-full border border-white/[0.1] text-zinc-400 hover:text-zinc-100 hover:border-violet-500/40 transition-colors"
          >
            ‹
          </button>
          <span className="text-[11px] text-zinc-600 tabular-nums w-10 text-center">
            {index + 1}/{total}
          </span>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="h-9 w-9 rounded-full border border-white/[0.1] text-zinc-400 hover:text-zinc-100 hover:border-cyan-500/40 transition-colors"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
