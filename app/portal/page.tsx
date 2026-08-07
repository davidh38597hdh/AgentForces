'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { PROJECT_TEMPLATES } from '@/lib/projects';
import { Logo } from '@/components/Logo';

const ONBOARD_KEY = 'agentforces_onboarded_v1';
const LAST_PROJECT_KEY = 'agentforces_last_project_v1';

export default function PortalPage() {
  const { data: session } = useSession();
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

  return (
    <div className="af-app min-h-screen bg-zinc-50 text-zinc-900">
      <header className="af-app-header border-b border-zinc-200 bg-white">
        <div className="max-w-3xl mx-auto px-5 h-12 flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800"
          >
            <Logo size={22} />
            AgentForces
          </Link>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            {session?.user?.email ? (
              <>
                <span className="hidden sm:inline text-zinc-500">{session.user.email}</span>
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="hover:text-zinc-800"
                >
                  Sign out
                </button>
              </>
            ) : (
              <span className="text-zinc-500">Guest · no sign-in</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 pt-16 pb-20">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
          Field a force · not a framework
        </p>
        <h1 className="text-3xl sm:text-4xl font-medium tracking-tight text-zinc-900 mb-3">
          {firstVisit ? 'Choose how your force starts' : 'Your forces'}
        </h1>
        <p className="text-sm text-zinc-600 mb-10 max-w-lg leading-relaxed">
          {firstVisit
            ? 'Templates seed multi-network meshes with boundaries and chief routing. Start with Orchestrate mesh, a cross-org partnership, or a blank force — then open the canvas.'
            : 'Re-open a template or start blank. Every force is a mesh: agents, Ext interfaces, and hop-visible runs.'}
        </p>

        {!firstVisit && lastProject && (
          <button
            type="button"
            onClick={() => openProject(lastProject)}
            className="mb-8 w-full sm:w-auto text-left rounded-xl border border-zinc-300 bg-white px-4 py-3 hover:border-violet-400 hover:shadow-sm transition-colors"
          >
            <span className="text-[11px] text-zinc-500 block mb-1">Continue last</span>
            <span className="text-sm text-zinc-800">
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
              className="text-left rounded-xl border border-zinc-200 bg-white p-4 hover:border-violet-400 hover:shadow-sm transition-colors group"
            >
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 group-hover:text-violet-600">
                {project.tag}
              </span>
              <h2 className="mt-2 text-sm font-medium text-zinc-900">{project.title}</h2>
              <p className="mt-1.5 text-xs text-zinc-500 leading-relaxed">{project.description}</p>
            </button>
          ))}
        </div>

        <p className="mt-10 text-[11px] text-zinc-500">
          {session?.user?.email
            ? 'Signed in. BYOK keys stay in your browser.'
            : 'Guest access. Sign in with Google from the login page when available. BYOK keys stay in your browser.'}
        </p>
      </main>
    </div>
  );
}
