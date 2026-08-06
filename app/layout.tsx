import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentxForce – Multi-Agent Teams Powered by Grok",
  description: "Create, connect, and run intelligent agent networks in minutes. Templates, real-time execution, shareable demos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}