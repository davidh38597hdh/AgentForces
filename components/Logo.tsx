/**
 * AgentForces mark — abstract multi-agent mesh node.
 * Use next to the wordmark "AgentForces".
 */
export function Logo({
  className = '',
  size = 28,
  title = 'AgentForces',
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id="af-logo-grad" x1="4" y1="6" x2="36" y2="34" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8B5CF6" />
          <stop offset="0.55" stopColor="#6366F1" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
        <linearGradient id="af-logo-core" x1="14" y1="14" x2="26" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="1" stopColor="#67E8F9" />
        </linearGradient>
      </defs>
      {/* Outer ring — force field */}
      <circle cx="20" cy="20" r="17" stroke="url(#af-logo-grad)" strokeWidth="1.5" opacity="0.9" />
      {/* Mesh links */}
      <path
        d="M12 14 L20 20 L28 14 M12 26 L20 20 L28 26 M12 14 L12 26 M28 14 L28 26"
        stroke="url(#af-logo-grad)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Agent nodes */}
      <circle cx="12" cy="14" r="2.4" fill="#8B5CF6" />
      <circle cx="28" cy="14" r="2.4" fill="#22D3EE" />
      <circle cx="12" cy="26" r="2.4" fill="#A78BFA" />
      <circle cx="28" cy="26" r="2.4" fill="#67E8F9" />
      {/* Center chief node */}
      <circle cx="20" cy="20" r="4" fill="url(#af-logo-core)" />
      <circle cx="20" cy="20" r="1.6" fill="#0A0A0A" />
    </svg>
  );
}

/** Wordmark row: logo + AgentForces */
export function BrandMark({
  size = 28,
  className = '',
  textClassName = 'text-sm font-semibold tracking-wide text-zinc-100',
  href,
}: {
  size?: number;
  className?: string;
  textClassName?: string;
  href?: string;
}) {
  const inner = (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} />
      <span className={textClassName}>AgentForces</span>
    </span>
  );

  if (href) {
    // Avoid circular import of next/link in pure presentational — caller wraps if needed
    return inner;
  }
  return inner;
}
