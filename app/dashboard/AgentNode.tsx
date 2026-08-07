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
  team: string;
  company: string;
  /** If true, may send/receive across company or network boundaries */
  exposed: boolean;
  /** Orchestrate network id (research | computation | creative | …) */
  network?: string;
  /** Allowlisted connector ids this agent may invoke as tools */
  connectorIds?: string[];
  /** Visual focus: dim when another company is active in the mesh UI */
  companyFocused?: boolean;
};

function AgentNodeComponent({ data, selected }: NodeProps) {
  const d = data as AgentNodeData;
  const focused = d.companyFocused !== false;
  return (
    <div
      className={`min-w-[190px] max-w-[230px] rounded-xl border bg-zinc-900/95 shadow-lg backdrop-blur transition-opacity duration-200 ${
        selected ? 'border-white/40 ring-1 ring-white/20' : 'border-zinc-700'
      } ${d.exposed ? 'ring-1 ring-amber-500/30' : ''} ${focused ? '' : 'opacity-30 grayscale-[40%]'}`}
      style={{
        borderLeftWidth: 4,
        borderLeftColor: d.color,
        boxShadow: focused && selected ? `0 0 0 1px ${d.color}55` : undefined,
      }}
    >
      {/* Multiple inbound connections allowed */}
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-zinc-400"
        isConnectable={true}
      />
      <div className="px-3 pt-2.5 pb-1 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
        <span className="text-sm font-medium text-zinc-100 truncate flex-1">{d.name}</span>
        {d.exposed && (
          <span className="text-[9px] uppercase tracking-wide text-amber-400/90 border border-amber-500/30 rounded px-1">
            Ext
          </span>
        )}
      </div>
      <div className="px-3 pb-2.5 space-y-0.5">
        <p
          className={`text-[10px] font-medium truncate inline-flex items-center gap-1 max-w-full ${
            d.company?.trim() ? '' : 'text-zinc-600'
          }`}
          style={d.company?.trim() ? { color: d.color } : undefined}
        >
          {d.company?.trim() ? (
            <>
              <span
                className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              {d.company}
            </>
          ) : (
            'No company'
          )}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">
          {d.team} · {d.role}
        </p>
        {d.network && (
          <p className="text-[10px] text-indigo-400/90 truncate">net:{d.network}</p>
        )}
        {d.connectorIds && d.connectorIds.length > 0 && (
          <p className="text-[10px] text-cyan-500/80 truncate">
            {d.connectorIds.length} connector{d.connectorIds.length === 1 ? '' : 's'}
          </p>
        )}
        <p className="text-[10px] text-zinc-600 truncate">
          {d.provider} · {d.model}
        </p>
      </div>
      {/* Multiple outbound connections allowed (fan-out) */}
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !bg-zinc-500 !border-zinc-400"
        isConnectable={true}
      />
    </div>
  );
}

export default memo(AgentNodeComponent);
