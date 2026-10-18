import React from 'react';
import type { DaemonNode, TorrentItem } from '../types/bitstream';
import { formatAsciiBlocksOnly } from '../utils/telemetryLogic';

interface VitalsBarZoneBProps {
  activeNode: DaemonNode;
  torrents: TorrentItem[];
  autoOrganizerArmed: boolean;
  onToggleAutoOrganizer: () => void;
}

export const VitalsBarZoneB: React.FC<VitalsBarZoneBProps> = ({
  activeNode,
  torrents,
  autoOrganizerArmed,
  onToggleAutoOrganizer,
}) => {
  const nvmePct = (activeNode.nvmeUsedTb / activeNode.nvmeTotalTb) * 100;
  const nasPct = (activeNode.nasUsedTb / activeNode.nasTotalTb) * 100;

  const activePipes = torrents.filter((t) => t.status === 'DOWNLOADING').length;
  const seedingCount = torrents.filter(
    (t) => t.status === 'SEEDING' || t.status === 'ROUTED'
  ).length;
  const pausedOrQueued = torrents.filter((t) => t.status === 'PAUSED').length;

  return (
    <section
      aria-label="Substrate Telemetry and Storage Vitals"
      className="w-full max-w-full overflow-x-hidden bg-[#070709] border-b border-[#1E2230] px-3 py-1.5 text-[10px] sm:text-[11px]"
    >
      <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-1.5">
        {/* Left: Breadcrumb Header + Storage Bars */}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-[#64748B] font-semibold tracking-[0.08em] uppercase whitespace-nowrap">
            SUBSTRATE TELEMETRY // DAEMON_RPC_{activeNode.id.slice(-2)}
          </span>

          <span className="text-[#1E2230] hidden sm:inline">//</span>

          {/* NVME_CACHE */}
          <div className="flex flex-wrap items-center gap-1 whitespace-nowrap">
            <span className="text-[#F8FAFC] font-medium">NVME_CACHE</span>
            <span className="text-[#FFB000] tracking-tighter">
              {formatAsciiBlocksOnly(nvmePct, 12)}
            </span>
            <span className="text-[#F8FAFC]">
              {activeNode.nvmeUsedTb.toFixed(2)} / {activeNode.nvmeTotalTb.toFixed(2)} TB
            </span>
            <span className="text-[#FFB000] font-semibold">[{nvmePct.toFixed(1)}%]</span>
          </div>

          <span className="text-[#1E2230] hidden md:inline">|</span>

          {/* NAS_ARRAY */}
          <div className="flex flex-wrap items-center gap-1 whitespace-nowrap">
            <span className="text-[#F8FAFC] font-medium">NAS_ARRAY</span>
            <span className="text-[#38BDF8] tracking-tighter">
              {formatAsciiBlocksOnly(nasPct, 12)}
            </span>
            <span className="text-[#F8FAFC]">
              {activeNode.nasUsedTb.toFixed(1)} / {activeNode.nasTotalTb.toFixed(1)} TB
            </span>
            <span className="text-[#38BDF8] font-semibold">[{nasPct.toFixed(1)}%]</span>
            <span className="text-[#38BDF8]">[NOMINAL]</span>
          </div>
        </div>

        {/* Right: Pipe Counts & Auto-Organizer State */}
        <div className="flex flex-wrap items-center gap-2 whitespace-nowrap">
          <span>
            <span className="text-[#64748B]">ACTIVE_PIPES:</span>{' '}
            <span className="text-[#38BDF8] font-semibold">{activePipes + 9}</span>
          </span>
          <span className="text-[#64748B]">|</span>
          <span>
            <span className="text-[#64748B]">SEEDING:</span>{' '}
            <span className="text-[#FFB000] font-semibold">{seedingCount + 44}</span>
          </span>
          <span className="text-[#64748B]">|</span>
          <span>
            <span className="text-[#64748B]">QUEUED:</span>{' '}
            <span className="text-[#F8FAFC] font-semibold">{pausedOrQueued + 2}</span>
          </span>
          <span className="text-[#64748B]">|</span>
          <div className="flex items-center gap-1">
            <span className="text-[#64748B]">AUTO_ORGANIZER:</span>
            <button
              type="button"
              onClick={onToggleAutoOrganizer}
              className={`px-1.5 py-0.5 font-bold border cursor-pointer transition-colors ${
                autoOrganizerArmed
                  ? 'border-[#FFB000] text-[#FFB000] bg-[#0B0D14] hover:bg-[#121521]'
                  : 'border-[#64748B] text-[#64748B] bg-[#070709] hover:text-[#F8FAFC]'
              }`}
            >
              {autoOrganizerArmed ? '[ARMED]' : '[BYPASSED]'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
