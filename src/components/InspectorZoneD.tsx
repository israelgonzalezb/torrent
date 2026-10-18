import React, { useState } from 'react';
import type {
  ChunkState,
  RuleMatchType,
  RoutingRule,
  TorrentItem,
} from '../types/bitstream';
import {
  formatAsciiBlocksOnly,
  matchRoutingRule,
  resolveRoutingPath,
} from '../utils/telemetryLogic';

export type InspectorTabId = 'BITFIELD' | 'ORGANIZER' | 'FILES';

interface InspectorZoneDProps {
  torrent: TorrentItem;
  activeTab: InspectorTabId;
  onTabChange: (tab: InspectorTabId) => void;
  routingRules: RoutingRule[];
  onToggleRule: (ruleId: string) => void;
  onAddRule: (rule: Omit<RoutingRule, 'id'>) => void;
  onExecuteRouteNow: (torrentId: string, resolvedPaths: string[], ruleName: string) => void;
  routingLogs: string[];
  onToggleFileIncluded: (torrentId: string, fileId: string) => void;
  onCycleFilePriority: (torrentId: string, fileId: string) => void;
}

function getChunkBgClass(state: ChunkState): string {
  switch (state) {
    case 0:
      return 'bg-[#0B0D14] border-[#1E2230]'; // Missing
    case 1:
      return 'bg-[#38BDF8] border-[#38BDF8]'; // Downloading
    case 2:
      return 'bg-[#FFB000] border-[#FFB000]'; // Verifying Hash
    case 3:
      return 'bg-[#F8FAFC] border-[#F8FAFC]'; // Completed
  }
}

function getChunkLabel(state: ChunkState): string {
  switch (state) {
    case 0:
      return 'MISSING';
    case 1:
      return 'DOWNLOADING';
    case 2:
      return 'VERIFYING_HASH';
    case 3:
      return 'COMPLETED';
  }
}

export const InspectorZoneD: React.FC<InspectorZoneDProps> = ({
  torrent,
  activeTab,
  onTabChange,
  routingRules,
  onToggleRule,
  onAddRule,
  onExecuteRouteNow,
  routingLogs,
  onToggleFileIncluded,
  onCycleFilePriority,
}) => {
  // New rule builder form state
  const [newRuleName, setNewRuleName] = useState('');
  const [newMatchType, setNewMatchType] = useState<RuleMatchType>('EXTENSION');
  const [newPattern, setNewPattern] = useState('mkv,mp4,mov');
  const [newVaultRoot, setNewVaultRoot] = useState('/vault/media');
  const [newCategoryFolder, setNewCategoryFolder] = useState('2026_Ingest');
  const [newTemplate, setNewTemplate] = useState('{vault}/{category}/{clean_name}.{ext}');
  const [ruleError, setRuleError] = useState('');

  // Compute bitfield statistics
  const completedChunks = torrent.bitfield.filter((c) => c === 3).length;
  const activeChunks = torrent.bitfield.filter((c) => c === 1).length;
  const verifyingChunks = torrent.bitfield.filter((c) => c === 2).length;
  const missingChunks = torrent.bitfield.filter((c) => c === 0).length;

  // Compute live rule matching & before/after paths for this torrent
  const primaryFile = torrent.files[0]?.rawPath || torrent.name;
  const matchedRule = matchRoutingRule(torrent, primaryFile, routingRules) || {
    id: 'fallback-rule',
    name: 'DEFAULT_VAULT_FALLBACK',
    enabled: true,
    matchType: 'TAG' as RuleMatchType,
    pattern: torrent.tag,
    vaultRoot: '/vault/default',
    categoryFolder: torrent.tag.toLowerCase(),
    template: '{vault}/{category}/{clean_name}.{ext}',
  };

  const fileTransformPreviews = torrent.files.map((f, idx) => {
    const specificMatch = matchRoutingRule(torrent, f.rawPath, routingRules) || matchedRule;
    const afterPath = resolveRoutingPath(f.rawPath, torrent.name, specificMatch, idx + 1);
    return {
      fileId: f.id,
      beforePath: f.rawPath,
      afterPath,
      ruleName: specificMatch.name,
      included: f.included,
    };
  });

  const handleAddRuleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim() || !newPattern.trim() || !newVaultRoot.trim()) {
      setRuleError('ERR: RULE_NAME, PATTERN, AND VAULT_ROOT REQUIRED');
      return;
    }
    setRuleError('');
    onAddRule({
      name: newRuleName.trim().toUpperCase().replace(/\s+/g, '_'),
      enabled: true,
      matchType: newMatchType,
      pattern: newPattern.trim(),
      vaultRoot: newVaultRoot.trim(),
      categoryFolder: newCategoryFolder.trim() || 'archive',
      template: newTemplate.trim() || '{vault}/{category}/{clean_name}.{ext}',
    });
    setNewRuleName('');
  };

  return (
    <aside
      aria-label="Deep Inspection and Autonomous File Organizer Console"
      className="col-span-12 lg:col-span-5 flex flex-col bg-[#0B0D14] min-w-0"
    >
      {/* Inspector Header + Selected Payload Metadata */}
      <div className="px-3 py-2 bg-[#0B0D14] border-b border-[#1E2230] text-[11px]">
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC]">
            DEEP INSPECTOR // {torrent.nodeId}
          </span>
          <span className="text-[#38BDF8] font-mono text-[10px]">
            BTIH: {torrent.infoHash.slice(0, 16)}...
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 text-[#64748B]">
          <span className="text-[#F8FAFC] font-semibold truncate" title={torrent.name}>
            {torrent.name}
          </span>
          <span className="whitespace-nowrap text-[10px] text-[#FFB000]">[{torrent.tag}]</span>
        </div>
      </div>

      {/* 3 Sub-View Tabs */}
      <div
        className="grid grid-cols-3 border-b border-[#1E2230] bg-[#070709] text-[10px] select-none"
        role="tablist"
        aria-label="Inspector Console Views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'BITFIELD'}
          onClick={() => onTabChange('BITFIELD')}
          className={`py-2 px-1.5 font-bold tracking-wider uppercase border-r border-[#1E2230] cursor-pointer transition-colors truncate ${
            activeTab === 'BITFIELD'
              ? 'bg-[#121521] text-[#38BDF8] border-b-2 border-b-[#38BDF8]'
              : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          [01 // BITFIELD & SWARM]
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ORGANIZER'}
          onClick={() => onTabChange('ORGANIZER')}
          className={`py-2 px-1.5 font-bold tracking-wider uppercase border-r border-[#1E2230] cursor-pointer transition-colors truncate ${
            activeTab === 'ORGANIZER'
              ? 'bg-[#121521] text-[#FFB000] border-b-2 border-b-[#FFB000]'
              : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          [02 // AUTO-ORGANIZER & ROUTING]
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'FILES'}
          onClick={() => onTabChange('FILES')}
          className={`py-2 px-1.5 font-bold tracking-wider uppercase cursor-pointer transition-colors truncate ${
            activeTab === 'FILES'
              ? 'bg-[#121521] text-[#F8FAFC] border-b-2 border-b-[#F8FAFC]'
              : 'text-[#64748B] hover:text-[#F8FAFC]'
          }`}
        >
          [03 // FILES & PRIORITY]
        </button>
      </div>

      {/* Tab Content Panel */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-[11px]">
        {/* TAB 01: BITFIELD & SWARM */}
        {activeTab === 'BITFIELD' && (
          <div className="space-y-3">
            {/* 128-Cell 2D Piece-Completion Density Grid */}
            <div className="bg-[#070709] border border-[#1E2230] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC] text-[10px]">
                  2D PIECE-COMPLETION DENSITY MATRIX // 128_CHUNKS
                </span>
                <span className="text-[#38BDF8] text-[10px]">
                  {completedChunks}/128 VERIFIED ({torrent.progress.toFixed(1)}%)
                </span>
              </div>

              {/* 16x8 Grid of 128 Square Cells */}
              <div
                className="grid grid-cols-16 gap-1 py-1"
                data-testid="bitfield-density-grid"
                aria-label="128-cell piece completion bitfield grid"
              >
                {torrent.bitfield.map((cellState, idx) => (
                  <div
                    key={idx}
                    title={`CHUNK_0x${idx.toString(16).toUpperCase().padStart(2, '0')}: ${getChunkLabel(cellState)}`}
                    className={`h-3.5 w-full border ${getChunkBgClass(cellState)} transition-colors`}
                  />
                ))}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 pt-2 border-t border-[#1E2230] text-[10px] text-[#64748B]">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-[#0B0D14] border border-[#1E2230]" />
                  <span>VOID ({missingChunks})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-[#38BDF8]" />
                  <span className="text-[#38BDF8]">INGRESS ({activeChunks})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-[#FFB000]" />
                  <span className="text-[#FFB000]">HASH_CHK ({verifyingChunks})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="inline-block w-2.5 h-2.5 bg-[#F8FAFC]" />
                  <span className="text-[#F8FAFC]">COMPLETE ({completedChunks})</span>
                </div>
              </div>
            </div>

            {/* Connected Swarm Peers */}
            <div className="bg-[#070709] border border-[#1E2230]">
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0B0D14] border-b border-[#1E2230] text-[10px]">
                <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC]">
                  SWARM PEER TELEMETRY // CONNECTED ({torrent.peers.length})
                </span>
                <span className="text-[#64748B]">ENCRYPTION: RC4_MSE_FORCED</span>
              </div>
              {torrent.peers.length === 0 ? (
                <div className="p-4 text-center text-[#64748B] text-[10px]">
                  [NO ACTIVE PEER SOCKETS — STREAM PAUSED OR STANDBY]
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[10px]">
                    <thead>
                      <tr className="border-b border-[#1E2230] text-[#64748B]">
                        <th className="py-1.5 px-2">ENDPOINT_IP</th>
                        <th className="py-1.5 px-1.5">LOC</th>
                        <th className="py-1.5 px-2">CLIENT_ID</th>
                        <th className="py-1.5 px-2 text-right">DOWN</th>
                        <th className="py-1.5 px-2 text-right">UP</th>
                        <th className="py-1.5 px-2 text-right">HAVE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1E2230]">
                      {torrent.peers.map((peer) => (
                        <tr key={peer.id} className="hover:bg-[#0B0D14]">
                          <td className="py-1.5 px-2 text-[#F8FAFC] font-medium whitespace-nowrap">
                            {peer.ip}
                          </td>
                          <td className="py-1.5 px-1.5 text-[#38BDF8]">[{peer.countryFlag}]</td>
                          <td className="py-1.5 px-2 text-[#64748B] truncate max-w-[120px]">
                            {peer.client}
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#38BDF8] whitespace-nowrap">
                            {peer.downRateMb.toFixed(1)} MB/s
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#FFB000] whitespace-nowrap">
                            {peer.upRateMb.toFixed(1)} MB/s
                          </td>
                          <td className="py-1.5 px-2 text-right text-[#F8FAFC] whitespace-nowrap">
                            {peer.progress.toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Tracker Announce Statuses */}
            <div className="bg-[#070709] border border-[#1E2230]">
              <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#0B0D14] border-b border-[#1E2230] text-[10px]">
                <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC]">
                  TRACKER ANNOUNCE MATRIX
                </span>
                <span className="text-[#64748B]">DHT + PEX ENABLED</span>
              </div>
              <div className="divide-y divide-[#1E2230] text-[10px]">
                {torrent.trackers.map((tr, i) => (
                  <div
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-2"
                  >
                    <div className="flex items-center gap-2 truncate max-w-[260px]">
                      <span
                        className={
                          tr.status === 'TIMEOUT_ERR'
                            ? 'text-[#F43F5E] font-bold'
                            : 'text-[#38BDF8] font-bold'
                        }
                      >
                        [{tr.status}]
                      </span>
                      <span className="text-[#F8FAFC] truncate" title={tr.url}>
                        {tr.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[#64748B] whitespace-nowrap">
                      <span>
                        SEEDS: <strong className="text-[#F8FAFC]">{tr.seeds}</strong>
                      </span>
                      <span>
                        PEERS: <strong className="text-[#F8FAFC]">{tr.peers}</strong>
                      </span>
                      <span>NEXT: {tr.nextAnnounceSec}s</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 02: AUTO-ORGANIZER & ROUTING */}
        {activeTab === 'ORGANIZER' && (
          <div className="space-y-3">
            {/* Live Ingestion Rule Matcher */}
            <div className="bg-[#070709] border border-[#1E2230] p-2.5">
              <div className="flex items-center justify-between mb-1.5 text-[10px]">
                <span className="font-bold tracking-[0.08em] uppercase text-[#FFB000]">
                  LIVE INGESTION RULE MATCHER // ACTIVE_BINDING
                </span>
                <span className="text-[#38BDF8]">[MATCH: {matchedRule.matchType}]</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] border-t border-[#1E2230] pt-1.5">
                <div>
                  <span className="text-[#64748B]">BOUND RULE:</span>{' '}
                  <span className="text-[#F8FAFC] font-bold">{matchedRule.name}</span>
                </div>
                <div>
                  <span className="text-[#64748B]">PATTERN:</span>{' '}
                  <span className="text-[#38BDF8]">{matchedRule.pattern}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-[#64748B]">TEMPLATE:</span>{' '}
                  <span className="text-[#FFB000]">{matchedRule.template}</span>
                </div>
              </div>
            </div>

            {/* Before / After Path Preview + Execute Button */}
            <div className="bg-[#070709] border border-[#1E2230] p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC] text-[10px]">
                  BEFORE / AFTER PATH TRANSFORMATION DIFF
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onExecuteRouteNow(
                      torrent.id,
                      fileTransformPreviews.map((p) => p.afterPath),
                      matchedRule.name
                    )
                  }
                  className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-[#FFB000] text-[#070709] hover:bg-[#38BDF8] transition-colors cursor-pointer"
                >
                  [EXECUTE ROUTE NOW]
                </button>
              </div>

              <div className="space-y-1.5 border-t border-[#1E2230] pt-2 max-h-40 overflow-y-auto">
                {fileTransformPreviews.map((item) => (
                  <div
                    key={item.fileId}
                    className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1.5 text-[10px] space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[#64748B]">
                      <span className="line-through truncate max-w-[65%]" title={item.beforePath}>
                        {item.beforePath}
                      </span>
                      <span className="text-[9px] text-[#64748B]">[{item.ruleName}]</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[#38BDF8] font-semibold">
                      <span className="text-[#FFB000]">==&gt;</span>
                      <span className="truncate" title={item.afterPath}>
                        {item.afterPath}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Simulated Terminal Route Execution Log Output (Immediately Visible!) */}
            <div className="bg-[#070709] border border-[#1E2230] p-2.5">
              <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#64748B] mb-1.5">
                ROUTER DAEMON STDOUT // ATOMIC_HARDLINK_LOG
              </div>
              <div className="bg-[#0B0D14] border border-[#1E2230] p-2 font-mono text-[10px] space-y-1 max-h-24 overflow-y-auto">
                {routingLogs.map((line, i) => (
                  <div
                    key={i}
                    className={
                      line.includes('OK //')
                        ? 'text-[#38BDF8]'
                        : line.includes('EXEC')
                        ? 'text-[#FFB000]'
                        : 'text-[#64748B]'
                    }
                  >
                    {line.replace(/➔/g, '==>')}
                  </div>
                ))}
              </div>
            </div>

            {/* Rule Editor & Dry-Run Matrix */}
            <div className="bg-[#070709] border border-[#1E2230] p-2.5 space-y-2.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC]">
                  AUTONOMOUS ROUTING RULESET ({routingRules.length})
                </span>
                <span className="text-[#64748B]">CLICK TO TOGGLE RULE STATE</span>
              </div>

              <div className="divide-y divide-[#1E2230] border border-[#1E2230]">
                {routingRules.map((rule) => (
                  <div
                    key={rule.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 text-[10px] bg-[#0B0D14]"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[#F8FAFC] font-semibold truncate">{rule.name}</span>
                        <span className="text-[#64748B]">[{rule.matchType}: {rule.pattern}]</span>
                      </div>
                      <div className="text-[#64748B] truncate">
                        -&gt; {rule.vaultRoot}/{rule.categoryFolder}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleRule(rule.id)}
                      className={`px-2 py-0.5 border font-bold cursor-pointer whitespace-nowrap ${
                        rule.enabled
                          ? 'border-[#38BDF8] text-[#38BDF8] bg-[#070709]'
                          : 'border-[#1E2230] text-[#64748B] bg-[#070709]'
                      }`}
                    >
                      {rule.enabled ? '[ENABLED]' : '[MUTED]'}
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Routing Rule Form */}
              <form onSubmit={handleAddRuleSubmit} className="space-y-2 pt-2 border-t border-[#1E2230]">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#64748B]">
                  + APPEND NEW ROUTING DIRECTIVE
                </div>
                {ruleError && <div className="text-[10px] text-[#F43F5E]">{ruleError}</div>}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                  <label className="flex flex-col gap-1">
                    <span className="text-[#64748B]">RULE IDENTIFIER</span>
                    <input
                      type="text"
                      value={newRuleName}
                      onChange={(e) => setNewRuleName(e.target.value)}
                      placeholder="e.g. CINE_EXR_VAULT"
                      className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[#64748B]">MATCH MODE</span>
                    <select
                      value={newMatchType}
                      onChange={(e) => setNewMatchType(e.target.value as RuleMatchType)}
                      className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    >
                      <option value="EXTENSION">EXTENSION</option>
                      <option value="REGEX">REGEX</option>
                      <option value="TAG">TAG</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[#64748B]">PATTERN</span>
                    <input
                      type="text"
                      value={newPattern}
                      onChange={(e) => setNewPattern(e.target.value)}
                      placeholder="mkv,mp4 or regex"
                      className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  <label className="flex flex-col gap-1">
                    <span className="text-[#64748B]">VAULT ROOT</span>
                    <input
                      type="text"
                      value={newVaultRoot}
                      onChange={(e) => setNewVaultRoot(e.target.value)}
                      className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[#64748B]">CATEGORY SUBDIR</span>
                    <input
                      type="text"
                      value={newCategoryFolder}
                      onChange={(e) => setNewCategoryFolder(e.target.value)}
                      className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </label>
                </div>
                <div className="flex items-end gap-2 text-[10px]">
                  <label className="flex-1 flex flex-col gap-1">
                    <span className="text-[#64748B]">PATH TEMPLATE</span>
                    <input
                      type="text"
                      value={newTemplate}
                      onChange={(e) => setNewTemplate(e.target.value)}
                      className="bg-[#0B0D14] border border-[#1E2230] px-2 py-1 text-[#F8FAFC] focus:border-[#38BDF8] focus:outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-[#121521] text-[#38BDF8] border border-[#38BDF8] hover:bg-[#38BDF8] hover:text-[#070709] font-bold uppercase cursor-pointer whitespace-nowrap"
                  >
                    [+ ADD RULE]
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 03: FILES & PRIORITY */}
        {activeTab === 'FILES' && (
          <div className="space-y-3">
            <div className="bg-[#070709] border border-[#1E2230]">
              <div className="flex items-center justify-between px-2.5 py-2 bg-[#0B0D14] border-b border-[#1E2230] text-[10px]">
                <span className="font-bold tracking-[0.08em] uppercase text-[#F8FAFC]">
                  PAYLOAD FILE TREE & CHUNK PRIORITY ({torrent.files.length} FILES)
                </span>
                <span className="text-[#64748B]">CLICK PRIORITY TO CYCLE</span>
              </div>

              <div className="divide-y divide-[#1E2230]">
                {torrent.files.map((file) => {
                  const priorityColor =
                    file.priority === 'HIGH'
                      ? 'border-[#38BDF8] text-[#38BDF8]'
                      : file.priority === 'FIRST_LAST_PEEK'
                      ? 'border-[#FFB000] text-[#FFB000]'
                      : file.priority === 'SKIP'
                      ? 'border-[#F43F5E] text-[#F43F5E]'
                      : 'border-[#64748B] text-[#F8FAFC]';

                  return (
                    <div
                      key={file.id}
                      className={`p-2.5 flex flex-col gap-1.5 ${
                        file.included ? 'bg-[#070709]' : 'bg-[#070709]/50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer min-w-0">
                          <input
                            type="checkbox"
                            checked={file.included}
                            onChange={() => onToggleFileIncluded(torrent.id, file.id)}
                            aria-label={`Include ${file.rawPath}`}
                            className="accent-[#38BDF8] w-3.5 h-3.5 cursor-pointer"
                          />
                          <span
                            className={`text-[11px] font-medium truncate ${
                              file.included ? 'text-[#F8FAFC]' : 'line-through text-[#64748B]'
                            }`}
                            title={file.rawPath}
                          >
                            {file.rawPath}
                          </span>
                        </label>

                        <button
                          type="button"
                          onClick={() => onCycleFilePriority(torrent.id, file.id)}
                          aria-label={`Cycle chunk priority for ${file.rawPath}`}
                          className={`px-2 py-0.5 text-[10px] font-bold border bg-[#0B0D14] cursor-pointer whitespace-nowrap ${priorityColor}`}
                        >
                          [{file.priority}]
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10px] pl-5">
                        <div className="flex items-center gap-2">
                          <span className="text-[#38BDF8] tracking-tighter">
                            {formatAsciiBlocksOnly(file.progress, 14)}
                          </span>
                          <span className="text-[#F8FAFC]">{file.progress.toFixed(1)}%</span>
                        </div>
                        <span className="text-[#64748B]">{file.sizeGb.toFixed(2)} GB</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
