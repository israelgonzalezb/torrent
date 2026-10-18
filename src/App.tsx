import React, { useEffect, useMemo, useRef, useState } from 'react';
import type {
  FilterCategory,
  NodeId,
  PayloadTag,
  RoutingRule,
  SortField,
  TorrentItem,
} from './types/bitstream';
import {
  DAEMON_NODES,
  INITIAL_ROUTING_RULES,
  INITIAL_TORRENTS,
} from './data/seedData';
import {
  cycleFilePriority,
  filterAndSortTorrents,
  matchRoutingRule,
  resolveRoutingPath,
  stepTorrentSimulation,
} from './utils/telemetryLogic';
import { HeaderZoneA } from './components/HeaderZoneA';
import { VitalsBarZoneB } from './components/VitalsBarZoneB';
import { TransferMatrixZoneC } from './components/TransferMatrixZoneC';
import { InspectorZoneD, type InspectorTabId } from './components/InspectorZoneD';
import { FooterZoneE } from './components/FooterZoneE';
import { IngestModal } from './components/IngestModal';

export default function App() {
  const [nodes] = useState(DAEMON_NODES);
  const [activeNodeId, setActiveNodeId] = useState<NodeId>('NODE_01');
  const [filterByNode, setFilterByNode] = useState<boolean>(false);

  const [torrents, setTorrents] = useState<TorrentItem[]>(INITIAL_TORRENTS);
  const [selectedTorrentId, setSelectedTorrentId] = useState<string>(INITIAL_TORRENTS[0].id);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<FilterCategory>('ALL');
  const [sortBy, setSortBy] = useState<SortField>('VELOCITY');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const [inspectorTab, setInspectorTab] = useState<InspectorTabId>('BITFIELD');
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>(INITIAL_ROUTING_RULES);
  const [autoOrganizerArmed, setAutoOrganizerArmed] = useState<boolean>(true);
  const [simulationRunning, setSimulationRunning] = useState<boolean>(true);
  const [isIngestModalOpen, setIsIngestModalOpen] = useState<boolean>(false);

  const [ingressHistory, setIngressHistory] = useState<number[]>([
    68.2, 72.4, 79.1, 88.0, 91.5, 86.2, 81.9, 84.6,
  ]);
  const [egressHistory, setEgressHistory] = useState<number[]>([
    24.1, 26.8, 29.0, 34.2, 33.8, 30.5, 29.9, 31.2,
  ]);

  const [routingLogs, setRoutingLogs] = useState<string[]>([
    '[17:42:11] INIT // AUTO_ORGANIZER DAEMON ARMED (ATOMIC HARDLINK MODE)',
    '[17:42:11] OK // ROUTED Linux_Kernel_6.12_LTS_Source.tar.zst ==> /vault/archive/cold_storage_2026/',
    '[17:58:04] WATCH // MONITORING 8 ACTIVE SWARM PIPES ACROSS 3 RPC NODES',
  ]);
  const [lastActionNotice, setLastActionNotice] = useState<string>(
    'READY // RPC_DAEMON_01 SYNCHRONIZED'
  );

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Scope torrents by node if filterByNode is toggled
  const scopedTorrents = useMemo(() => {
    if (!filterByNode) return torrents;
    return torrents.filter((t) => t.nodeId === activeNodeId);
  }, [torrents, filterByNode, activeNodeId]);

  // Apply search, category filter, and sort
  const visibleTorrents = useMemo(() => {
    return filterAndSortTorrents(
      scopedTorrents,
      searchQuery,
      activeCategory,
      sortBy,
      sortAsc
    );
  }, [scopedTorrents, searchQuery, activeCategory, sortBy, sortAsc]);

  // Currently selected torrent (fallback to first visible or first overall)
  const selectedTorrent = useMemo(() => {
    return (
      torrents.find((t) => t.id === selectedTorrentId) ||
      visibleTorrents[0] ||
      torrents[0]
    );
  }, [torrents, selectedTorrentId, visibleTorrents]);

  // Global ingress / egress velocities
  const totalIngressMb = useMemo(() => {
    const sum = torrents.reduce((acc, t) => acc + t.downSpeedMb, 0);
    return sum > 0 ? sum : 0;
  }, [torrents]);

  const totalEgressMb = useMemo(() => {
    const sum = torrents.reduce((acc, t) => acc + t.upSpeedMb, 0);
    return sum > 0 ? sum : 0;
  }, [torrents]);

  // 1000ms Real-time Telemetry Simulation Loop
  useEffect(() => {
    if (!simulationRunning) return;

    const timer = window.setInterval(() => {
      setTorrents((prev) => {
        const next = prev.map((item) => stepTorrentSimulation(item));
        const downSum = Number(
          next.reduce((acc, t) => acc + t.downSpeedMb, 0).toFixed(1)
        );
        const upSum = Number(
          next.reduce((acc, t) => acc + t.upSpeedMb, 0).toFixed(1)
        );

        setIngressHistory((h) => [...h.slice(1), downSum]);
        setEgressHistory((h) => [...h.slice(1), upSum]);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [simulationRunning]);

  // Handlers
  const handleTogglePause = (id: string) => {
    setTorrents((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const resuming = t.status === 'PAUSED' || t.status === 'ERROR';
        const nextStatus: TorrentItem['status'] = resuming
          ? t.progress >= 100
            ? 'SEEDING'
            : 'DOWNLOADING'
          : 'PAUSED';
        setLastActionNotice(
          `${nextStatus === 'PAUSED' ? 'PAUSED' : 'RESUMED'} // ${t.name}`
        );
        return {
          ...t,
          status: nextStatus,
          downSpeedMb:
            nextStatus === 'DOWNLOADING' ? Math.max(16.4, t.downSpeedMb) : 0,
          upSpeedMb: nextStatus === 'PAUSED' ? 0 : Math.max(4.2, t.upSpeedMb),
          errorDetail: nextStatus === 'PAUSED' ? t.errorDetail : undefined,
        };
      })
    );
  };

  const handleShiftPriority = (id: string) => {
    setTorrents((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextRank = t.priorityRank <= 1 ? prev.length : t.priorityRank - 1;
        setLastActionNotice(`PRIORITY_SHIFT // ${t.name} ==> #${nextRank}`);
        return { ...t, priorityRank: nextRank };
      })
    );
  };

  const handleForceRecheck = (id: string) => {
    setTorrents((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const updatedBitfield = t.bitfield.map((c, idx) =>
          idx % 9 === 0 && c !== 3 ? 2 : c
        );
        setLastActionNotice(`HASH_VERIFY // RE-CHECKING 128 PIECES FOR ${t.name}`);
        return {
          ...t,
          status: t.progress >= 100 ? 'SEEDING' : 'DOWNLOADING',
          errorDetail: undefined,
          bitfield: updatedBitfield,
        };
      })
    );
  };

  const handleExecuteRouteNow = (
    torrentId: string,
    resolvedPaths: string[],
    ruleName: string
  ) => {
    const target = torrents.find((t) => t.id === torrentId);
    if (!target) return;

    const primaryDest =
      resolvedPaths[0] || `/vault/archive/2026/${target.name}`;
    const timestamp = new Date().toISOString().slice(11, 19);

    setTorrents((prev) =>
      prev.map((t) =>
        t.id === torrentId
          ? {
              ...t,
              status: 'ROUTED',
              routedPath: primaryDest,
              lastRoutedAt: `${timestamp} UTC`,
            }
          : t
      )
    );

    setRoutingLogs((prev) => [
      `[${timestamp}] EXEC // RULE [${ruleName}] MATCHED ${target.files.length} FILES`,
      `[${timestamp}] OK // HARDLINKED ==> ${primaryDest}`,
      ...prev,
    ]);
    setLastActionNotice(`ROUTED // ${target.name} ==> ${primaryDest}`);
  };

  const handleTriggerInlineRoute = (torrentId: string) => {
    const target = torrents.find((t) => t.id === torrentId);
    if (!target) return;
    const firstFile = target.files[0]?.rawPath || target.name;
    const matched =
      matchRoutingRule(target, firstFile, routingRules) || routingRules[0];
    const dest = resolveRoutingPath(firstFile, target.name, matched, 1);

    setSelectedTorrentId(torrentId);
    setInspectorTab('ORGANIZER');
    handleExecuteRouteNow(torrentId, [dest], matched.name);
  };

  const handleToggleRule = (ruleId: string) => {
    setRoutingRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleAddRule = (newRule: Omit<RoutingRule, 'id'>) => {
    const created: RoutingRule = {
      ...newRule,
      id: `rule-${Date.now()}`,
    };
    setRoutingRules((prev) => [created, ...prev]);
    setLastActionNotice(`RULE_ADDED // ${created.name}`);
  };

  const handleToggleFileIncluded = (torrentId: string, fileId: string) => {
    setTorrents((prev) =>
      prev.map((t) => {
        if (t.id !== torrentId) return t;
        return {
          ...t,
          files: t.files.map((f) =>
            f.id === fileId
              ? {
                  ...f,
                  included: !f.included,
                  priority: !f.included ? 'NORMAL' : 'SKIP',
                }
              : f
          ),
        };
      })
    );
  };

  const handleCycleFilePriority = (torrentId: string, fileId: string) => {
    setTorrents((prev) =>
      prev.map((t) => {
        if (t.id !== torrentId) return t;
        return {
          ...t,
          files: t.files.map((f) => {
            if (f.id !== fileId) return f;
            const nextPrio = cycleFilePriority(f.priority);
            return {
              ...f,
              priority: nextPrio,
              included: nextPrio !== 'SKIP',
            };
          }),
        };
      })
    );
  };

  const handleIngestSubmit = (payload: {
    name: string;
    infoHash: string;
    totalSizeGb: number;
    tag: PayloadTag;
    routedPath: string;
    rawFileSample: string;
  }) => {
    const newId = `tor-${Date.now()}`;
    const initialBitfield = new Array(128)
      .fill(0)
      .map((_, i) => (i < 4 ? 1 : 0)) as TorrentItem['bitfield'];

    const newTorrent: TorrentItem = {
      id: newId,
      nodeId: activeNodeId,
      name: payload.name,
      infoHash: payload.infoHash,
      tag: payload.tag,
      status: 'DOWNLOADING',
      progress: 3.1,
      downloadedGb: 0.57,
      totalSizeGb: payload.totalSizeGb,
      downSpeedMb: 36.4,
      upSpeedMb: 3.2,
      connectedPeers: 19,
      swarmSeeds: 284,
      ratio: 0.12,
      etaSeconds: 495,
      priorityRank: 1,
      routedPath: payload.routedPath,
      bitfield: initialBitfield,
      files: [
        {
          id: `f-${Date.now()}-1`,
          rawPath: payload.rawFileSample,
          sizeGb: Number((payload.totalSizeGb * 0.75).toFixed(2)),
          progress: 3.1,
          priority: 'HIGH',
          included: true,
        },
        {
          id: `f-${Date.now()}-2`,
          rawPath: 'raw_dump_2026/manifest_checksums.sha256',
          sizeGb: Number((payload.totalSizeGb * 0.25).toFixed(2)),
          progress: 100,
          priority: 'FIRST_LAST_PEEK',
          included: true,
        },
      ],
      peers: [
        {
          id: `p-${Date.now()}`,
          ip: '185.220.101.92:51413',
          countryFlag: 'CH',
          client: 'libtorrent/2.0.10',
          downRateMb: 36.4,
          upRateMb: 3.2,
          progress: 100,
        },
      ],
      trackers: [
        {
          url: 'udp://tracker.nullvector.io:6969/announce',
          status: 'ANNOUNCE_OK',
          seeds: 284,
          peers: 19,
          nextAnnounceSec: 300,
        },
      ],
    };

    setTorrents((prev) => [newTorrent, ...prev]);
    setSelectedTorrentId(newId);
    setActiveCategory('ALL');
    setSearchQuery('');
    setLastActionNotice(`INGESTED // ${newTorrent.name} BOUND TO ${activeNodeId}`);
  };

  // Global Keyboard Shortcuts (j, k, ArrowDown, ArrowUp, Space, /, Ctrl+K, r)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K always toggles Ingest Modal
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsIngestModalOpen((open) => !open);
        return;
      }

      if (e.key === 'Escape' && isIngestModalOpen) {
        setIsIngestModalOpen(false);
        return;
      }

      // Ignore single-key shortcuts when typing inside an input/select/textarea
      const targetEl = e.target as HTMLElement | null;
      const isTyping =
        targetEl &&
        (targetEl.tagName === 'INPUT' ||
          targetEl.tagName === 'TEXTAREA' ||
          targetEl.tagName === 'SELECT' ||
          targetEl.isContentEditable);

      if (isTyping || isIngestModalOpen) return;

      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        if (visibleTorrents.length === 0) return;
        const idx = visibleTorrents.findIndex((t) => t.id === selectedTorrent.id);
        const nextIdx = (idx + 1) % visibleTorrents.length;
        setSelectedTorrentId(visibleTorrents[nextIdx].id);
        return;
      }

      if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (visibleTorrents.length === 0) return;
        const idx = visibleTorrents.findIndex((t) => t.id === selectedTorrent.id);
        const prevIdx =
          (idx - 1 + visibleTorrents.length) % visibleTorrents.length;
        setSelectedTorrentId(visibleTorrents[prevIdx].id);
        return;
      }

      if (e.key === ' ') {
        e.preventDefault();
        if (selectedTorrent) {
          handleTogglePause(selectedTorrent.id);
        }
        return;
      }

      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (selectedTorrent) {
          handleTriggerInlineRoute(selectedTorrent.id);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const activeNode =
    nodes.find((n) => n.id === activeNodeId) || nodes[0];

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortAsc((asc) => !asc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070709] text-[#F8FAFC] font-mono selection:bg-[#38BDF8] selection:text-[#070709]">
      {/* ZONE A: TOP TELEMETRY & RPC DAEMON HEADER */}
      <HeaderZoneA
        nodes={nodes}
        activeNodeId={activeNodeId}
        onSelectNode={(id) => {
          setActiveNodeId(id);
          setLastActionNotice(`NODE_SWITCH // BOUND TO ${id}`);
        }}
        filterByNode={filterByNode}
        onToggleFilterByNode={() => setFilterByNode((v) => !v)}
        ingressMb={totalIngressMb}
        egressMb={totalEgressMb}
        ingressHistory={ingressHistory}
        egressHistory={egressHistory}
        simulationRunning={simulationRunning}
        onToggleSimulation={() => setSimulationRunning((s) => !s)}
        onOpenIngestModal={() => setIsIngestModalOpen(true)}
      />

      {/* ZONE B: SUBSTRATE & STORAGE VITALS BAR */}
      <VitalsBarZoneB
        activeNode={activeNode}
        torrents={torrents}
        autoOrganizerArmed={autoOrganizerArmed}
        onToggleAutoOrganizer={() =>
          setAutoOrganizerArmed((armed) => !armed)
        }
      />

      {/* MAIN 12-COLUMN ZERO-WASTE WORKSPACE GRID (ZONES C + D) */}
      <main className="flex-1 grid grid-cols-12">
        {/* ZONE C: PRIMARY TRANSFER MATRIX & FILTER DECK (LEFT 7 COLUMNS) */}
        <TransferMatrixZoneC
          torrents={visibleTorrents}
          totalCount={torrents.length}
          selectedTorrentId={selectedTorrent.id}
          onSelectTorrent={(id) => setSelectedTorrentId(id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchInputRef={searchInputRef}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          sortBy={sortBy}
          sortAsc={sortAsc}
          onSortChange={handleSortChange}
          onTogglePause={handleTogglePause}
          onShiftPriority={handleShiftPriority}
          onForceRecheck={handleForceRecheck}
          onTriggerRoute={handleTriggerInlineRoute}
          onResetFilters={() => {
            setSearchQuery('');
            setActiveCategory('ALL');
            setFilterByNode(false);
          }}
        />

        {/* ZONE D: INSPECTOR & AUTONOMOUS FILE ORGANIZER (RIGHT 5 COLUMNS) */}
        <InspectorZoneD
          torrent={selectedTorrent}
          activeTab={inspectorTab}
          onTabChange={setInspectorTab}
          routingRules={routingRules}
          onToggleRule={handleToggleRule}
          onAddRule={handleAddRule}
          onExecuteRouteNow={handleExecuteRouteNow}
          routingLogs={routingLogs}
          onToggleFileIncluded={handleToggleFileIncluded}
          onCycleFilePriority={handleCycleFilePriority}
        />
      </main>

      {/* ZONE E: PERSISTENT TELEMETRY FOOTER & KEYBOARD HUD */}
      <FooterZoneE
        simulationRunning={simulationRunning}
        selectedTorrentName={selectedTorrent.name}
        lastActionNotice={lastActionNotice}
        onOpenIngest={() => setIsIngestModalOpen(true)}
        onManualRouteSelected={() =>
          handleTriggerInlineRoute(selectedTorrent.id)
        }
        onTogglePauseSelected={() => handleTogglePause(selectedTorrent.id)}
      />

      {/* MAGNET / TORRENT INGEST MODAL (Ctrl+K) */}
      <IngestModal
        isOpen={isIngestModalOpen}
        activeNodeId={activeNodeId}
        onClose={() => setIsIngestModalOpen(false)}
        onIngestSubmit={handleIngestSubmit}
      />
    </div>
  );
}
