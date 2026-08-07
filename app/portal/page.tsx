'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { PROJECT_TEMPLATES } from '@/lib/projects';

const ONBOARD_KEY = 'agentforce_onboarded_v1';
const LAST_PROJECT_KEY = 'agentforce_last_project_v1';

export default function PortalPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [firstVisit, setFirstVisit] = useState(true);
  const [lastProject, setLastProject] = useState<string | null>(null);

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem(ONBOARD_KEY);
      const last = localStorage.getItem(LAST_PROJECT_KEY);
      setFirstVisit(!onboarded);
      setLastProject(last);
    } catch {
      setFirstVisit(true);
    }
  }, []);

  const openProject = (seed: string) => {
    try {
      localStorage.setItem(ONBOARD_KEY, '1');
      localStorage.setItem(LAST_PROJECT_KEY, seed);
    } catch {}
    router.push(`/dashboard?project=${encodeURIComponent(seed)}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-zinc-500 text-sm">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <header className="border-b border-zinc-900">
        <div className="max-w-3xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm font-medium text-zinc-500">
            AgentForce
          </Link>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {session?.user?.email && (
              <span className="hidden sm:inline text-zinc-600">{session.user.email}</span>
            )}
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="hover:text-zinc-300"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-16 pb-20">
        <p className="text-xs text-zinc-600 uppercase tracking-wider mb-3">Portal</p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-zinc-200 mb-3">
          {firstVisit ? 'Choose a starting project' : 'Your projects'}
        </h1>
        <p className="text-sm text-zinc-500 mb-10 max-w-lg leading-relaxed">
          {firstVisit
            ? 'First time here. Start with Orchestrate mesh (research · computation · creative + chief routing), or another template. You can edit everything on the canvas.'
            : 'Open a template or continue. Orchestrate mesh includes AMEP/1-style bus hops and network routing.'}
        </p>

        {!firstVisit && lastProject && (
          <button
            type="button"
            onClick={() => openProject(lastProject)}
            className="mb-8 w-full sm:w-auto text-left rounded-xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 hover:border-zinc-500 transition-colors"
          >
            <span className="text-[11px] text-zinc-500 block mb-1">Continue last</span>
            <span className="text-sm text-zinc-200">
              {PROJECT_TEMPLATES.find((p) => p.seed === lastProject)?.title || lastProject}
            </span>
          </button>
        )}

        <div className="grid sm:grid-cols-2 gap-3">
          {PROJECT_TEMPLATES.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => openProject(project.seed)}
              className="text-left rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 hover:border-zinc-600 transition-colors group"
            >
              <span className="text-[10px] uppercase tracking-wider text-zinc-600 group-hover:text-zinc-500">
                {project.tag}
              </span>
              <h2 className="mt-2 text-sm font-medium text-zinc-200">{project.title}</h2>
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{project.description}</p>
            </button>
          ))}
        </div>

        <p className="mt-10 text-[11px] text-zinc-600">
          Signed in with Google. Mesh access requires this session.
        </p>
      </main>
    </div>
  );
}
