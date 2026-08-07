import type { NextConfig } from 'next';

/**
 * Standalone output enables Docker / Fly / Railway / Render without Vercel.
 * Vercel ignores standalone and uses its own builder.
 */
const nextConfig: NextConfig = {
  output: 'standalone',
};

export default nextConfig;
