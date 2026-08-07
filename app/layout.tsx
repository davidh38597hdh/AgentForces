import type { Metadata } from 'next';
import './globals.css';
import { Providers } from './providers';
import { getPublicAppUrl } from '@/lib/deploy';

const appUrl = getPublicAppUrl();

export const metadata: Metadata = {
  title: {
    default: 'AgentForces — Private multi-agent mesh for business outcomes',
    template: '%s · AgentForces',
  },
  description:
    'Field a force of agents that work together toward shared outcomes. Multi-company mesh, Ext boundaries, chief routing, BYOK, AMEP/1 path — not another agent framework.',
  metadataBase: new URL(appUrl),
  openGraph: {
    title: 'AgentForces — Force, not framework',
    description:
      'Private multi-agent mesh for business. Boundaries by design. Your keys. AMEP mesh security path.',
    url: appUrl,
    siteName: 'AgentForces',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AgentForces',
    description: 'Create your own force with a mesh of agents — business boundaries included.',
  },
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
