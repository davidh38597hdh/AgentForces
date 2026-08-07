'use client';

import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';

export type CompanyZoneData = {
  name: string;
  color: string;
  agentCount: number;
  focused: boolean;
};

function CompanyZoneNodeComponent({ data }: NodeProps) {
  const d = data as CompanyZoneData;
  return (
    <div
      className="rounded-2xl border-2 border-dashed pointer-events-none select-none"
      style={{
        width: '100%',
        height: '100%',
        borderColor: d.focused ? `${d.color}99` : `${d.color}40`,
        background: d.focused
          ? `linear-gradient(180deg, ${d.color}18 0%, ${d.color}08 40%, transparent 100%)`
          : `linear-gradient(180deg, ${d.color}0d 0%, transparent 70%)`,
        boxShadow: d.focused ? `0 0 40px ${d.color}22 inset` : undefined,
      }}
    >
      <div className="px-3 pt-2.5 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: d.color, boxShadow: `0 0 8px ${d.color}` }}
        />
        <span
          className="text-xs font-semibold tracking-wide truncate"
          style={{ color: d.focused ? '#fafafa' : '#a1a1aa' }}
        >
          {d.name}
        </span>
        <span className="text-[10px] text-zinc-600 ml-auto tabular-nums">
          {d.agentCount} agent{d.agentCount === 1 ? '' : 's'}
        </span>
      </div>
    </div>
  );
}

export default memo(CompanyZoneNodeComponent);
