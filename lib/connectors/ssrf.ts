/** Basic SSRF guard for outbound webhook URLs. */

export function assertSafeHttpsUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error('Invalid URL');
  }
  if (u.protocol !== 'https:') {
    throw new Error('Only https:// URLs are allowed for connectors');
  }
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '::1' ||
    host === '0.0.0.0' ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal' ||
    host.startsWith('169.254.') ||
    host.startsWith('10.') ||
    host.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
  ) {
    throw new Error('Private or local hosts are not allowed for connectors');
  }
  return u;
}
