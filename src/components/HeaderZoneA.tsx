import React from 'react';
import type { DaemonNode, NodeId } from '../types/bitstream';
import { formatUnicodeSparkline } from '../utils/telemetryLogic';

interface HeaderZoneAProps {
  nodes: DaemonNode[];
  activeNodeId: NodeId;
  onSelectNode: (id: NodeId) => void;
  filterByNode: boolean;
  onToggleFilterByNode: () => void;
  ingressMb: number;
  egressMb: number;
  ingressHistory: number[];
  egressHistory: number[];
  simulationRunning: boolean;
  onToggleSimulation: () => void;
  onOpenIngestModal: () => void;
}

const MiniBarSparkline: React.FC<{ values: number[]; color: string }> = ({ values, color }) => {
  const max = Math.max(...values, 1);
  return (
    <span className="inline-flex items-end gap-[1px] h-3 px-1 bg-[#0B0D14] border border-[#1E2230] align-middle">
      {values.map((v, i) => {
        const pct = Math.max(15, Math.min(100, Math.round((v / max) * 100)));
        return (
          <span
            key={i}
            style={{ height: `${pct}%`, backgroundColor: color }}
            className="w-[3px] inline-block"
          />
        );
      })}
    </span>
  );
};

export const HeaderZoneA: React.FC<HeaderZoneAProps> = ({
  nodes,
  activeNodeId,
  onSelectNode,
  filterByNode,
  onToggleFilterByNode,
  ingressMb,
  egressMb,
  ingressHistory,
  egressHistory,
  simulationRunning,
  onToggleSimulation,
  onOpenIngestModal,
}) => {
  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];
  const ingressSpark = formatUnicodeSparkline(ingressHistory, 'block');
  const egressSpark = formatUnicodeSparkline(egressHistory, 'braille');

  return (
    <header className="w-full max-w-full overflow-x-hidden bg-[#0B0D14] border-b border-[#1E2230] px-3 py-2 text-xs select-none">
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-2">
        {/* Left: System Title + Remote Node Switcher + Tunnel Badge */}
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-2 pr-2 border-r border-[#1E2230]">
            <span className="inline-block w-2 h-2 bg-[#38BDF8] shrink-0" aria-hidden="true" />
            <h1 className="font-bold tracking-[0.08em] text-[#F8FAFC] text-[11px] sm:text-xs whitespace-nowrap">
              NULL VECTOR // BITSTREAM_HUD // v4.0
            </h1>
          </div>

          {/* Node Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Remote RPC Daemon Nodes">
            {nodes.map((node) => {
              const isSelected = node.id === activeNodeId;
              return (
                <button
                  key={node.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => onSelectNode(node.id)}
                  className={`px-1.5 py-0.5 text-[10px] sm:text-[11px] tracking-wider uppercase transition-colors border whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? 'bg-[#121521] text-[#38BDF8] border-[#38BDF8] font-semibold'
                      : 'bg-[#070709] text-[#64748B] border-[#1E2230] hover:text-[#F8FAFC] hover:border-[#64748B]'
                  }`}
                >
                  [{node.label}]
                </button>
              );
            })}
          </div>

          {/* Node Scope Toggle + Ping + WireGuard Tunnel Lock */}
          <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
            <button
              type="button"
              onClick={onToggleFilterByNode}
              title="Toggle between showing all cluster payloads vs only selected node payloads"
              className={`px-1.5 py-0.5 border uppercase cursor-pointer whitespace-nowrap ${
                filterByNode
                  ? 'border-[#FFB000] text-[#FFB000] bg-[#070709]'
                  : 'border-[#1E2230] text-[#64748B] hover:text-[#F8FAFC]'
              }`}
            >
              {filterByNode ? `[SCOPE: ${activeNode.id}]` : '[SCOPE: CLUSTER_ALL]'}
            </button>
            <span className="text-[#38BDF8] font-medium whitespace-nowrap">
              {activeNode.pingMs}ms
            </span>
            <span className="text-[#F8FAFC] bg-[#070709] border border-[#1E2230] px-1.5 py-0.5 whitespace-nowrap">
              [TUNNEL: VERIFIED // {activeNode.tunnelIp}]
            </span>
          </div>
        </div>

        {/* Center/Right: Global Bandwidth Telemetry + Action Triggers */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-[11px] bg-[#070709] border border-[#1E2230] px-2 py-1">
            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[#64748B]">INGRESS:</span>
              <span className="text-[#38BDF8] font-semibold">
                {ingressMb.toFixed(1)} MB/s
              </span>
              <MiniBarSparkline values={ingressHistory} color="#38BDF8" />
              <span className="text-[#38BDF8] tracking-tighter hidden sm:inline" aria-label="Ingress velocity sparkline">
                {ingressSpark}
              </span>
            </div>

            <span className="text-[#1E2230]">|</span>

            <div className="flex items-center gap-1 whitespace-nowrap">
              <span className="text-[#64748B]">EGRESS:</span>
              <span className="text-[#FFB000] font-semibold">
                {egressMb.toFixed(1)} MB/s
              </span>
              <MiniBarSparkline values={egressHistory} color="#FFB000" />
              <span className="text-[#FFB000] tracking-tighter hidden sm:inline" aria-label="Egress velocity sparkline">
                {egressSpark}
              </span>
            </div>

            <span className="text-[#1E2230] hidden md:inline">|</span>

            <div className="hidden md:flex items-center gap-2 whitespace-nowrap text-[#F8FAFC]">
              <span>
                <span className="text-[#64748B]">DHT NODES:</span>{' '}
                {activeNode.dhtNodes.toLocaleString()}
              </span>
              <span className="text-[#64748B]">|</span>
              <span>
                <span className="text-[#64748B]">GLOBAL RATIO:</span>{' '}
                <span className="text-[#38BDF8] font-semibold">
                  {activeNode.globalRatio.toFixed(2)}
                </span>
              </span>
            </div>
          </div>

          {/* Simulation Toggle + Primary Ingest CTA */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleSimulation}
              aria-pressed={simulationRunning}
              className={`px-2 py-1 text-[10px] sm:text-[11px] font-semibold tracking-wider uppercase border cursor-pointer whitespace-nowrap transition-colors ${
                simulationRunning
                  ? 'bg-[#070709] text-[#38BDF8] border-[#38BDF8] hover:bg-[#121521]'
                  : 'bg-[#070709] text-[#64748B] border-[#1E2230] hover:text-[#F8FAFC]'
              }`}
            >
              {simulationRunning ? '[LIVE TELEMETRY: ON]' : '[LIVE TELEMETRY: PAUSED]'}
            </button>

            <button
              type="button"
              onClick={onOpenIngestModal}
              className="px-2.5 py-1 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase bg-[#F8FAFC] text-[#070709] border border-[#F8FAFC] hover:bg-[#38BDF8] hover:border-[#38BDF8] hover:text-[#070709] transition-colors cursor-pointer whitespace-nowrap"
            >
              [+ INGEST MAGNET / .TORRENT (Ctrl+K)]
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
