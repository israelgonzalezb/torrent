import React from 'react';
import type { FilterCategory, SortField, TorrentItem } from '../types/bitstream';
import { formatAsciiBlocksOnly, formatEta } from '../utils/telemetryLogic';

interface TransferMatrixZoneCProps {
  torrents: TorrentItem[];
  totalCount: number;
  selectedTorrentId: string;
  onSelectTorrent: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  activeCategory: FilterCategory;
  onCategoryChange: (cat: FilterCategory) => void;
  sortBy: SortField;
  sortAsc: boolean;
  onSortChange: (field: SortField) => void;
  onTogglePause: (id: string) => void;
  onShiftPriority: (id: string) => void;
  onForceRecheck: (id: string) => void;
  onTriggerRoute: (id: string) => void;
  onResetFilters: () => void;
}

const CATEGORIES: { id: FilterCategory; label: string }[] = [
  { id: 'ALL', label: 'ALL' },
  { id: 'DOWNLOADING', label: 'DOWNLOADING' },
  { id: 'SEEDING', label: 'SEEDING' },
  { id: 'ROUTING', label: 'ROUTING' },
  { id: 'ERROR', label: 'ERROR' },
];

const SORT_FIELDS: SortField[] = ['VELOCITY', 'ETA', 'SIZE', 'RATIO'];

function renderStatusGlyph(status: TorrentItem['status']) {
  switch (status) {
    case 'DOWNLOADING':
      return <span className="text-[#38BDF8] font-bold">[▼]</span>;
    case 'SEEDING':
      return <span className="text-[#FFB000] font-bold">[▲]</span>;
    case 'ROUTED':
      return <span className="text-[#F8FAFC] font-bold">[*]</span>;
    case 'PAUSED':
      return <span className="text-[#64748B] font-bold">[||]</span>;
    case 'ERROR':
      return <span className="text-[#F43F5E] font-bold">[!]</span>;
  }
}

function getProgressColor(status: TorrentItem['status']): string {
  switch (status) {
    case 'DOWNLOADING':
      return 'text-[#38BDF8]';
    case 'SEEDING':
      return 'text-[#FFB000]';
    case 'ROUTED':
      return 'text-[#F8FAFC]';
    case 'PAUSED':
      return 'text-[#64748B]';
    case 'ERROR':
      return 'text-[#F43F5E]';
  }
}

export const TransferMatrixZoneC: React.FC<TransferMatrixZoneCProps> = ({
  torrents,
  totalCount,
  selectedTorrentId,
  onSelectTorrent,
  searchQuery,
  onSearchChange,
  searchInputRef,
  activeCategory,
  onCategoryChange,
  sortBy,
  sortAsc,
  onSortChange,
  onTogglePause,
  onShiftPriority,
  onForceRecheck,
  onTriggerRoute,
  onResetFilters,
}) => {
  return (
    <section
      aria-label="Primary Transfer Matrix and Filter Deck"
      className="col-span-12 lg:col-span-7 flex flex-col bg-[#070709] border-b lg:border-b-0 lg:border-r border-[#1E2230] min-w-0"
    >
      {/* Section Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#0B0D14] border-b border-[#1E2230] text-[10px] sm:text-[11px]">
        <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC] truncate">
          PRIMARY TRANSFER MATRIX // SWARM_PIPE_DECK
        </span>
        <div className="text-[#64748B] whitespace-nowrap shrink-0 ml-2">
          SHOWING <span className="text-[#F8FAFC] font-semibold">{torrents.length}</span> OF{' '}
          <span className="text-[#F8FAFC] font-semibold">{totalCount}</span> STREAMS
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 p-2 bg-[#0B0D14] border-b border-[#1E2230] text-[11px]">
        {/* Search Input */}
        <div className="flex items-center flex-1 min-w-0 bg-[#070709] border border-[#1E2230] focus-within:border-[#38BDF8] px-2 py-1">
          <span className="text-[#38BDF8] mr-1.5 font-bold">/</span>
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="filter stream (regex or substring)..."
            aria-label="Filter stream by regex or substring"
            className="w-full bg-transparent text-[#F8FAFC] placeholder-[#64748B] focus:outline-none text-[11px]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear filter query"
              className="text-[#64748B] hover:text-[#F8FAFC] ml-1 cursor-pointer"
            >
              [CLR]
            </button>
          )}
        </div>

        {/* Category Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Filter by status category">
          {CATEGORIES.map((cat) => {
            const active = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onCategoryChange(cat.id)}
                className={`px-1.5 py-0.5 text-[10px] tracking-wider uppercase border cursor-pointer whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#121521] text-[#38BDF8] border-[#38BDF8] font-bold'
                    : 'bg-[#070709] text-[#64748B] border-[#1E2230] hover:text-[#F8FAFC]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Sort Toggles */}
        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Sort transfer streams">
          <span className="text-[#64748B] text-[10px] mr-0.5 uppercase">SORT:</span>
          {SORT_FIELDS.map((field) => {
            const isCurrent = sortBy === field;
            return (
              <button
                key={field}
                type="button"
                onClick={() => onSortChange(field)}
                className={`px-1.5 py-0.5 text-[10px] tracking-wider uppercase border cursor-pointer whitespace-nowrap transition-colors ${
                  isCurrent
                    ? 'bg-[#121521] text-[#F8FAFC] border-[#F8FAFC] font-bold'
                    : 'bg-[#070709] text-[#64748B] border-[#1E2230] hover:text-[#F8FAFC]'
                }`}
              >
                {field}
                {isCurrent ? (sortAsc ? ' ↑' : ' ↓') : ''}
              </button>
            );
          })}
        </div>
      </div>

      {/* High-Density Transfer Table */}
      <div className="flex-1 overflow-x-auto">
        {torrents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <p className="text-xs text-[#64748B] uppercase tracking-widest mb-3">
              [ZERO MATCHING BITSTREAMS IN CURRENT FILTER SCOPE]
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="px-3 py-1.5 text-xs bg-[#0B0D14] text-[#38BDF8] border border-[#38BDF8] hover:bg-[#121521] cursor-pointer uppercase tracking-wider"
            >
              [RESET FILTER & SCOPE]
            </button>
          </div>
        ) : (
          <table className="w-full table-fixed border-collapse text-left text-[10px] xl:text-[11px]">
            <thead>
              <tr className="bg-[#0B0D14] border-b border-[#1E2230] text-[#64748B] uppercase text-[10px] tracking-wider select-none">
                <th className="py-2 pl-2 pr-1 font-semibold w-[34px]">ST</th>
                <th className="py-2 px-1.5 font-semibold w-[31%] sm:w-[24%]">PAYLOAD // TAG</th>
                <th className="py-2 px-1.5 font-semibold w-[33%] sm:w-[19%]">PROGRESS</th>
                <th className="py-2 px-1.5 font-semibold text-right hidden md:table-cell w-[11%]">
                  SIZE
                </th>
                <th className="py-2 px-1.5 font-semibold text-right w-[17%] sm:w-[11%]">
                  SPEED
                </th>
                <th className="py-2 px-1.5 font-semibold text-right hidden xl:table-cell w-[9%]">
                  PEERS
                </th>
                <th className="py-2 px-1 font-semibold text-right hidden sm:table-cell w-[6%]">
                  RATIO
                </th>
                <th className="py-2 px-1.5 font-semibold text-right hidden sm:table-cell w-[8%]">
                  ETA
                </th>
                <th className="py-2 pl-1 pr-2.5 font-semibold text-right w-[19%] sm:w-[16%]">
                  OPS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E2230]">
              {torrents.map((t) => {
                const isSelected = t.id === selectedTorrentId;
                const progressColor = getProgressColor(t.status);
                const etaStr = formatEta(t.etaSeconds, t.status);

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTorrent(t.id)}
                    aria-selected={isSelected}
                    className={`group transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#121521]'
                        : 'bg-[#070709] hover:bg-[#0B0D14]'
                    }`}
                  >
                    {/* Status Glyph */}
                    <td
                      className={`py-2 pl-2 pr-1 whitespace-nowrap ${
                        isSelected ? 'border-l-2 border-l-[#38BDF8]' : ''
                      }`}
                    >
                      {renderStatusGlyph(t.status)}
                    </td>

                    {/* Payload Name + Tag Badge */}
                    <td className="py-2 px-1.5 truncate">
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span
                          className={`font-semibold truncate ${
                            t.status === 'ERROR'
                              ? 'text-[#F43F5E]'
                              : isSelected
                              ? 'text-[#F8FAFC]'
                              : 'text-[#F8FAFC]/90'
                          }`}
                          title={t.name}
                        >
                          {t.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] text-[#64748B] truncate">
                          <span className="text-[#64748B]">[{t.tag}]</span>
                          <span>#{t.priorityRank}</span>
                          <span className="hidden sm:inline">{t.nodeId}</span>
                          {t.routedPath && (
                            <span className="text-[#FFB000] truncate" title={t.routedPath}>
                              -&gt; {t.routedPath}
                            </span>
                          )}
                          {t.errorDetail && (
                            <span className="text-[#F43F5E] truncate" title={t.errorDetail}>
                              {t.errorDetail}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* ASCII Progress Bar + % */}
                    <td className="py-2 px-1.5 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <span className={`${progressColor} tracking-tighter text-[10px]`}>
                          {formatAsciiBlocksOnly(t.progress, 8)}
                        </span>
                        <span className="text-[#F8FAFC] font-medium text-[10px]">
                          {t.progress.toFixed(1)}%
                        </span>
                      </div>
                    </td>

                    {/* Size */}
                    <td className="py-2 px-1.5 text-right whitespace-nowrap text-[#F8FAFC] hidden md:table-cell text-[10px]">
                      <span className="text-[#64748B]">{t.downloadedGb.toFixed(1)}/</span>
                      {t.totalSizeGb.toFixed(1)}G
                    </td>

                    {/* Down / Up Velocity */}
                    <td className="py-2 px-1.5 text-right whitespace-nowrap text-[10px]">
                      {t.downSpeedMb > 0 ? (
                        <span className="text-[#38BDF8] font-semibold">
                          {t.downSpeedMb.toFixed(1)}M/s
                        </span>
                      ) : t.upSpeedMb > 0 ? (
                        <span className="text-[#FFB000] font-semibold">
                          ↑{t.upSpeedMb.toFixed(1)}M/s
                        </span>
                      ) : (
                        <span className="text-[#64748B]">0.0M/s</span>
                      )}
                    </td>

                    {/* Peers / Seeds */}
                    <td className="py-2 px-1.5 text-right whitespace-nowrap text-[#F8FAFC] hidden xl:table-cell text-[10px]">
                      {t.connectedPeers}
                      <span className="text-[#64748B]">({t.swarmSeeds})</span>
                    </td>

                    {/* Ratio */}
                    <td className="py-2 px-1 text-right whitespace-nowrap hidden sm:table-cell text-[10px]">
                      <span
                        className={
                          t.ratio >= 2.0
                            ? 'text-[#FFB000] font-semibold'
                            : t.ratio >= 1.0
                            ? 'text-[#38BDF8]'
                            : 'text-[#F8FAFC]'
                        }
                      >
                        {t.ratio.toFixed(2)}
                      </span>
                    </td>

                    {/* ETA */}
                    <td
                      className={`py-2 px-1.5 text-right whitespace-nowrap font-medium hidden sm:table-cell text-[10px] ${
                        t.status === 'ERROR'
                          ? 'text-[#F43F5E]'
                          : t.status === 'DOWNLOADING'
                          ? 'text-[#38BDF8]'
                          : 'text-[#64748B]'
                      }`}
                    >
                      {etaStr}
                    </td>

                    {/* Row Controls */}
                    <td
                      className="py-2 pl-1 pr-2 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onTogglePause(t.id)}
                          aria-label={`${t.status === 'PAUSED' ? 'Resume' : 'Pause'} ${t.name}`}
                          title={t.status === 'PAUSED' ? 'Resume stream' : 'Pause stream'}
                          className="px-1 py-0.5 text-[9px] border border-[#1E2230] bg-[#0B0D14] text-[#F8FAFC] hover:border-[#38BDF8] hover:text-[#38BDF8] cursor-pointer"
                        >
                          {t.status === 'PAUSED' ? 'RUN' : 'HLT'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onShiftPriority(t.id)}
                          aria-label={`Shift priority for ${t.name}`}
                          title="Boost queue priority"
                          className="px-1 py-0.5 text-[9px] border border-[#1E2230] bg-[#0B0D14] text-[#64748B] hover:border-[#F8FAFC] hover:text-[#F8FAFC] cursor-pointer hidden sm:inline-block"
                        >
                          PRI
                        </button>
                        <button
                          type="button"
                          onClick={() => onForceRecheck(t.id)}
                          aria-label={`Force hash recheck for ${t.name}`}
                          title="Force piece hash verification"
                          className="px-1 py-0.5 text-[9px] border border-[#1E2230] bg-[#0B0D14] text-[#64748B] hover:border-[#FFB000] hover:text-[#FFB000] cursor-pointer hidden md:inline-block"
                        >
                          CHK
                        </button>
                        <button
                          type="button"
                          onClick={() => onTriggerRoute(t.id)}
                          aria-label={`Trigger manual route for ${t.name}`}
                          title="Execute immediate file organization route"
                          className="px-1 py-0.5 text-[9px] border border-[#1E2230] bg-[#0B0D14] text-[#FFB000] hover:border-[#FFB000] hover:bg-[#121521] cursor-pointer"
                        >
                          RTE
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
};
