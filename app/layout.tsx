import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getPublicAppUrl } from '@/lib/deploy';

const appUrl = getPublicAppUrl();

export const metadata: Metadata = {
  title: 'AgentForce',
  description:
    'Multi-agent mesh — Orchestrate networks, AMEP/1 sessions, BYOK. Deploy on Vercel or Docker/Fly.',
  metadataBase: new URL(appUrl),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
