import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'AgentForce',
  description: 'Multi-agent mesh — Orchestrate networks, AMEP/1 sessions, BYOK, Vercel',
  metadataBase: new URL('https://agentxforce.com'),
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
