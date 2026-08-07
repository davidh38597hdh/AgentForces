'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePathname } from 'next/navigation';

/**
 * Light product chrome after sign-in (portal / dashboard).
 * Marketing home + login stay dark-branded.
 */
export function ThemeSync() {
  const { data: session, status } = useSession();
  const pathname = usePathname() || '';

  useEffect(() => {
    // Product chrome (portal / mesh) is light. Marketing home + login stay dark.
    // Treat as “logged-in product” surfaces; guest mesh still gets light product UI.
    const productRoute =
      pathname.startsWith('/portal') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/ui');
    const light = productRoute;

    const root = document.documentElement;
    root.dataset.theme = light ? 'light' : 'dark';
    root.classList.toggle('theme-light', light);
    root.classList.toggle('theme-dark', !light);
  }, [session, status, pathname]);

  return null;
}
