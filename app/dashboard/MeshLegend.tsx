'use client';

export type LegendCompany = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  agentCount: number;
  companiesOnMesh: LegendCompany[];
  companies: LegendCompany[];
  companyCounts: Map<string, number>;
  focusCompanyId: string | 'all';
  onFocusCompany: (id: string | 'all') => void;
  selectedName?: string | null;
  selectedCompany?: string;
  onAssignCompany: (company: LegendCompany | null) => void;
  connectHint?: string;
};

/**
 * Docked mesh legend for the inspector column footer.
 * Always rendered in the right rail — not a floating canvas overlay.
 */
export function MeshLegend({
  agentCount,
  companiesOnMesh,
  companies,
  companyCounts,
  focusCompanyId,
  onFocusCompany,
  selectedName,
  selectedCompany,
  onAssignCompany,
  connectHint,
}: Props) {
  return (
    <div className="flex flex-col min-h-0 max-h-[42vh] border-t border-zinc-200 bg-white text-zinc-800">
      <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between gap-2 shrink-0 bg-zinc-50">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
          Mesh legend
        </p>
        <span className="text-[10px] text-zinc-500 tabular-nums">
          {agentCount} agent{agentCount === 1 ? '' : 's'}
        </span>
      </div>

      <div className="overflow-y-auto min-h-0 flex-1">
        {/* Companies focus */}
        <div className="px-3 py-2 border-b border-zinc-100">
          <p className="text-[10px] font-medium text-zinc-500 mb-1.5">
            Companies <span className="font-normal">· click to focus</span>
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onFocusCompany('all')}
              className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                focusCompanyId === 'all'
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300'
              }`}
            >
              All ({agentCount})
            </button>
            {companiesOnMesh.length === 0 ? (
              <span className="text-[10px] text-zinc-500 self-center px-1">
                None — Library → Companies
              </span>
            ) : (
              companiesOnMesh.map((c) => {
                const count = companyCounts.get(c.name) || 0;
                const active = focusCompanyId === c.id;
                return (
                  <button
                    key={`leg-${c.id}`}
                    type="button"
                    onClick={() => onFocusCompany(c.id)}
                    title={`Focus ${c.name}`}
                    className={`inline-flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-md border transition-colors ${
                      active
                        ? 'text-zinc-900 border-transparent'
                        : 'border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: `${c.color}28`,
                            boxShadow: `inset 0 0 0 1px ${c.color}99`,
                          }
                        : undefined
                    }
                  >
                    <span
                      className="h-2 w-2 rounded-full shrink-0"
                      style={{ backgroundColor: c.color }}
                    />
                    <span className="max-w-[6rem] truncate">{c.name}</span>
                    <span className="opacity-70 tabular-nums">{count}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Symbol key — compact */}
        <div className="px-3 py-2 border-b border-zinc-100">
          <p className="text-[10px] font-medium text-zinc-500 mb-1.5">Symbols</p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span className="w-6 shrink-0 border-t-2 border-zinc-400" aria-hidden />
              <span>
                <span className="text-zinc-800 font-medium">Internal</span> link
              </span>
            </li>
            <li className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span
                className="w-6 shrink-0 border-t-2 border-dashed border-amber-500"
                aria-hidden
              />
              <span>
                <span className="text-amber-800 font-medium">External</span> / Ext link
              </span>
            </li>
            <li className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span className="w-6 shrink-0 flex justify-center" aria-hidden>
                <span className="text-[8px] uppercase text-amber-800 border border-amber-300 bg-amber-50 rounded px-0.5">
                  Ext
                </span>
              </span>
              <span>
                <span className="text-zinc-800 font-medium">Ext agent</span> · cross-boundary
              </span>
            </li>
            <li className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span className="w-6 shrink-0 flex justify-center" aria-hidden>
                <span className="h-2.5 w-2.5 rounded border border-dashed border-violet-400 bg-violet-50" />
              </span>
              <span>
                <span className="text-zinc-800 font-medium">Lane</span> · company frame
              </span>
            </li>
            <li className="flex items-center gap-2 text-[10px] text-zinc-600">
              <span className="w-6 shrink-0 flex justify-center" aria-hidden>
                <span className="h-2 w-2 rounded-full bg-zinc-500 ring-2 ring-zinc-200" />
              </span>
              <span>
                <span className="text-zinc-800 font-medium">Color</span> · company / role
              </span>
            </li>
          </ul>
        </div>

        {/* Assign company when agent selected */}
        {selectedName ? (
          <div className="px-3 py-2 border-b border-zinc-100">
            <p className="text-[10px] font-medium text-zinc-500 mb-1.5">
              Assign company <span className="font-normal">· {selectedName}</span>
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onAssignCompany(null)}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  !selectedCompany?.trim()
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-600 hover:text-zinc-900'
                }`}
              >
                None
              </button>
              {companies.map((c) => {
                const current = selectedCompany === c.name;
                return (
                  <button
                    key={`assign-${c.id}`}
                    type="button"
                    onClick={() => onAssignCompany(c)}
                    className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                      current
                        ? 'border-zinc-300 text-zinc-900'
                        : 'border-zinc-200 text-zinc-600 hover:text-zinc-900'
                    }`}
                    style={current ? { backgroundColor: `${c.color}28` } : undefined}
                  >
                    <span
                      className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle"
                      style={{ backgroundColor: c.color }}
                    />
                    {c.name}
                  </button>
                );
              })}
              {companies.length === 0 && (
                <span className="text-[10px] text-zinc-500 self-center">
                  Create companies in Library
                </span>
              )}
            </div>
          </div>
        ) : null}

        {connectHint ? (
          <p className="mx-3 my-2 text-[10px] text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
            {connectHint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
