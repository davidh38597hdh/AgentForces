'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export type AgentNodeData = {
  name: string;
  system: string;
  provider: 'xai' | 'openai' | 'anthropic';
  model: string;
  role: string;
  color: string;
  team?: string;
};

function AgentNodeComponent({ data, selected }: NodeProps) {
  const d = data as AgentNodeData;
  return (
    <div
      className={`min-w-[180px] max-w-[220px] rounded-xl border bg-zinc-900/95 shadow-lg backdrop-blur ${
        selected ? 'border-white/40 ring-1 ring-white/20' : 'border-zinc-700'
      }`}
      style={{ borderLeftWidth: 3, borderLeftColor: d.color }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-zinc-400"
      />
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full shrink-0"
          style={{ backgroundColor: d.color }}
        />
        <span className="text-sm font-medium text-zinc-100 truncate">{d.name}</span>
      </div>
      <div className="px-3 pb-2.5 space-y-0.5">
        <p className="text-[10px] text-zinc-500 truncate">{d.role}</p>
        <p className="text-[10px] text-zinc-600 truncate">
          {d.provider} · {d.model}
        </p>
        {d.team && (
          <p className="text-[10px] truncate" style={{ color: d.color }}>
            {d.team}
          </p>
        )}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-zinc-400"
      />
    </div>
  );
}

export default memo(AgentNodeComponent);
