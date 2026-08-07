'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn, signOut } from 'next-auth/react';

const PREFS_STORAGE = 'agentforces_prefs_v1';

export type UserPrefs = {
  /** Prefer showing API key values when the keys panel opens */
  revealKeysByDefault?: boolean;
};

export function loadUserPrefs(): UserPrefs {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE);
    if (!raw) return {};
    return JSON.parse(raw) as UserPrefs;
  } catch {
    return {};
  }
}

export function saveUserPrefs(next: UserPrefs) {
  try {
    localStorage.setItem(PREFS_STORAGE, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

type Props = {
  email?: string | null;
  name?: string | null;
  image?: string | null;
  /** Open global API keys UI (dashboard) */
  onOpenApiKeys?: () => void;
  /** Open connectors UI (dashboard) */
  onOpenConnectors?: () => void;
  /** Called when prefs change so host can apply (e.g. reveal keys) */
  onPrefsChange?: (prefs: UserPrefs) => void;
  className?: string;
};

export function UserMenu({
  email,
  name,
  image,
  onOpenApiKeys,
  onOpenConnectors,
  onPrefsChange,
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>({});
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const signedIn = Boolean(email);

  useEffect(() => {
    setPrefs(loadUserPrefs());
  }, []);

  useEffect(() => {
    if (!open && !prefsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setPrefsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setPrefsOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, prefsOpen]);

  const updatePref = useCallback(
    (patch: Partial<UserPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        saveUserPrefs(next);
        onPrefsChange?.(next);
        return next;
      });
    },
    [onPrefsChange]
  );

  const label = email || name || 'Guest';
  const shortLabel =
    email && email.length > 28 ? `${email.slice(0, 14)}…${email.slice(-10)}` : label;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setPrefsOpen(false);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        className="inline-flex items-center gap-1.5 max-w-[14rem] rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-xs text-zinc-700 hover:border-zinc-300 hover:bg-zinc-50 transition-colors"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt=""
            className="h-5 w-5 rounded-full shrink-0 object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="h-5 w-5 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[10px] font-semibold shrink-0">
            {(email || name || 'G').charAt(0).toUpperCase()}
          </span>
        )}
        <span className="truncate hidden sm:inline">{shortLabel}</span>
        <span className="text-zinc-400 text-[10px] shrink-0" aria-hidden>
          ▾
        </span>
      </button>

      {open && !prefsOpen && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-50 w-56 rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/80 py-1 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Account</p>
            <p className="text-xs text-zinc-900 truncate mt-0.5" title={email || undefined}>
              {signedIn ? email : 'Guest · not signed in'}
            </p>
            {name && signedIn && (
              <p className="text-[11px] text-zinc-500 truncate">{name}</p>
            )}
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPrefsOpen(true);
              setOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Preferences…
          </button>

          {onOpenApiKeys && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenApiKeys();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Global API keys
            </button>
          )}

          {onOpenConnectors && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                onOpenConnectors();
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Connectors
            </button>
          )}

          <Link
            href="/portal"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50"
          >
            Portal / templates
          </Link>

          <div className="border-t border-zinc-100 my-1" />

          {signedIn ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => signOut({ callbackUrl: '/' })}
              className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50"
            >
              Log out
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => signIn('google', { callbackUrl: '/portal' })}
              className="w-full text-left px-3 py-2 text-xs text-violet-700 hover:bg-violet-50 font-medium"
            >
              Sign in with Google
            </button>
          )}
        </div>
      )}

      {prefsOpen && (
        <div
          role="dialog"
          aria-label="Preferences"
          className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/80 overflow-hidden"
        >
          <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
              Preferences
            </p>
            <button
              type="button"
              onClick={() => setPrefsOpen(false)}
              className="text-[11px] text-zinc-500 hover:text-zinc-800"
            >
              Close
            </button>
          </div>
          <div className="p-3 space-y-3">
            <label className="flex items-start gap-2 text-xs text-zinc-700 cursor-pointer">
              <input
                type="checkbox"
                className="mt-0.5 rounded border-zinc-300"
                checked={Boolean(prefs.revealKeysByDefault)}
                onChange={(e) => updatePref({ revealKeysByDefault: e.target.checked })}
              />
              <span>
                <span className="font-medium text-zinc-900">Show API keys by default</span>
                <span className="block text-[11px] text-zinc-500 mt-0.5 leading-relaxed">
                  When you open Global API keys, reveal secrets instead of masking them.
                </span>
              </span>
            </label>

            {onOpenApiKeys && (
              <button
                type="button"
                onClick={() => {
                  onOpenApiKeys();
                  setPrefsOpen(false);
                }}
                className="w-full h-8 rounded-lg border border-zinc-200 text-[11px] text-zinc-700 hover:bg-zinc-50"
              >
                Manage global API keys
              </button>
            )}

            {onOpenConnectors && (
              <button
                type="button"
                onClick={() => {
                  onOpenConnectors();
                  setPrefsOpen(false);
                }}
                className="w-full h-8 rounded-lg border border-zinc-200 text-[11px] text-zinc-700 hover:bg-zinc-50"
              >
                Manage connectors
              </button>
            )}

            {!onOpenApiKeys && (
              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Open the mesh dashboard for API keys and connectors.
              </p>
            )}

            <div className="border-t border-zinc-100 pt-2">
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="w-full text-left text-xs text-red-600 hover:text-red-700 py-1"
                >
                  Log out
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: '/portal' })}
                  className="w-full text-left text-xs text-violet-700 font-medium py-1"
                >
                  Sign in with Google
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
