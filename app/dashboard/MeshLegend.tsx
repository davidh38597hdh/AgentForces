'use client';

export type LegendCompany = {
  id: string;
  name: string;
  color: string;
};

type CompanyOnMesh = LegendCompany;

type Props = {
  agentCount: number;
  companiesOnMesh: CompanyOnMesh[];
  companies: LegendCompany[];
  companyCounts: Map<string, number>;
  focusCompanyId: string | 'all';
  onFocusCompany: (id: string | 'all') => void;
  selectedName?: string | null;
  selectedCompany?: string;
  onAssignCompany: (company: LegendCompany | null) => void;
  connectHint?: string;
  /** When true, width matches inspector column */
  dockedToInspector?: boolean;
};

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
  dockedToInspector,
}: Props) {
  return (
    <div
      className={`space-y-2 text-zinc-800 ${
        dockedToInspector ? 'w-full' : 'w-[min(100vw-2rem,18.5rem)]'
      }`}
    >
      <div className="rounded-xl border border-zinc-200 bg-white shadow-lg shadow-zinc-200/70 overflow-hidden max-h-[min(52vh,28rem)] flex flex-col">
        <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-700">
            Mesh legend
          </p>
          <span className="text-[10px] text-zinc-500 tabular-nums">
            {agentCount} agent{agentCount === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-y-auto min-h-0">
          <div className="px-3 py-2.5 border-b border-zinc-200">
            <p className="text-[10px] font-medium text-zinc-500 mb-1.5">
              Companies <span className="font-normal">— click to focus</span>
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => onFocusCompany('all')}
                className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                  focusCompanyId === 'all'
                    ? 'border-zinc-900 bg-zinc-900 text-white'
                    : 'border-zinc-200 text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'
                }`}
              >
                All ({agentCount})
              </button>
              {companiesOnMesh.length === 0 ? (
                <span className="text-[10px] text-zinc-500 self-center px-1">
                  None yet — Library → Companies
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
                          : 'border-zinc-200 text-zinc-500 hover:text-zinc-800'
                      }`}
                      style={
                        active
                          ? {
                              backgroundColor: `${c.color}33`,
                              boxShadow: `inset 0 0 0 1px ${c.color}88`,
                            }
                          : undefined
                      }
                    >
                      <span
                        className="h-2 w-2 rounded-full shrink-0"
                        style={{ backgroundColor: c.color }}
                      />
                      <span className="max-w-[6.5rem] truncate">{c.name}</span>
                      <span className="opacity-70 tabular-nums">{count}</span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="px-3 py-2.5 space-y-2">
            <p className="text-[10px] font-medium text-zinc-500">
              Symbols <span className="font-normal">— graph key</span>
            </p>
            <ul className="space-y-1.5">
              <li className="flex items-center gap-2.5 text-[10px] text-zinc-500">
                <span className="w-7 shrink-0 border-t-2 border-zinc-400" aria-hidden />
                <span>
                  <span className="text-zinc-800">Internal link</span>
                  <span className="text-zinc-500"> — same company / network</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-[10px] text-zinc-500">
                <span
                  className="w-7 shrink-0 border-t-2 border-dashed border-amber-500"
                  aria-hidden
                />
                <span>
                  <span className="text-amber-700">External / Ext link</span>
                  <span className="text-zinc-500"> — cross-company or inter-network</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-[10px] text-zinc-500">
                <span className="w-7 shrink-0 flex justify-center" aria-hidden>
                  <span className="text-[8px] uppercase tracking-wide text-amber-700 border border-amber-300 bg-amber-50 rounded px-0.5">
                    Ext
                  </span>
                </span>
                <span>
                  <span className="text-zinc-800">Ext agent</span>
                  <span className="text-zinc-500"> — may talk across boundaries</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-[10px] text-zinc-500">
                <span className="w-7 shrink-0 flex justify-center" aria-hidden>
                  <span className="h-2.5 w-2.5 rounded border border-dashed border-violet-400 bg-violet-50" />
                </span>
                <span>
                  <span className="text-zinc-800">Company lane</span>
                  <span className="text-zinc-500"> — dashed frame around an org</span>
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-[10px] text-zinc-500">
                <span className="w-7 shrink-0 flex justify-center" aria-hidden>
                  <span className="h-2 w-2 rounded-full bg-zinc-500 ring-2 ring-zinc-200" />
                </span>
                <span>
                  <span className="text-zinc-800">Node color</span>
                  <span className="text-zinc-500"> — company or role accent</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {selectedName && (
        <div className="rounded-xl border border-zinc-200 bg-white shadow-md shadow-zinc-200/60 px-3 py-2.5">
          <p className="text-[10px] font-medium text-zinc-500 mb-1.5">
            Assign company <span className="font-normal">— {selectedName}</span>
          </p>
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => onAssignCompany(null)}
              className={`text-[10px] px-2 py-1 rounded-md border transition-colors ${
                !selectedCompany?.trim()
                  ? 'border-zinc-900 bg-zinc-900 text-white'
                  : 'border-zinc-200 text-zinc-500 hover:text-zinc-800'
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
                      : 'border-zinc-200 text-zinc-500 hover:text-zinc-800'
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
                Create companies in Library first
              </span>
            )}
          </div>
        </div>
      )}

      {connectHint ? (
        <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          {connectHint}
        </p>
      ) : null}
    </div>
  );
}
