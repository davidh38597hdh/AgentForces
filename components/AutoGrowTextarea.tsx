'use client';

import { useCallback, useEffect, useRef, type TextareaHTMLAttributes } from 'react';

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'rows'> & {
  /** Minimum height in px (default ~3 lines) */
  minHeight?: number;
  /** Cap growth so the panel stays usable */
  maxHeight?: number;
  /** Starting rows before content exists */
  minRows?: number;
};

/**
 * Textarea that grows with content up to maxHeight, then scrolls.
 */
export function AutoGrowTextarea({
  value,
  minHeight = 72,
  maxHeight = 360,
  minRows = 3,
  className = '',
  onChange,
  ...rest
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(Math.max(el.scrollHeight, minHeight), maxHeight);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }, [minHeight, maxHeight]);

  useEffect(() => {
    resize();
  }, [value, resize]);

  useEffect(() => {
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    if (ref.current && ro) ro.observe(ref.current);
    return () => ro?.disconnect();
  }, [resize]);

  return (
    <textarea
      {...rest}
      ref={ref}
      rows={minRows}
      value={value}
      onChange={(e) => {
        onChange?.(e);
        // Grow on same frame as type
        requestAnimationFrame(resize);
      }}
      className={`resize-none overflow-hidden ${className}`}
    />
  );
}
