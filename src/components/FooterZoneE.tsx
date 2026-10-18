import React from 'react';

interface FooterZoneEProps {
  simulationRunning: boolean;
  selectedTorrentName: string;
  lastActionNotice: string;
  onOpenIngest: () => void;
  onManualRouteSelected: () => void;
  onTogglePauseSelected: () => void;
}

export const FooterZoneE: React.FC<FooterZoneEProps> = ({
  simulationRunning,
  selectedTorrentName,
  lastActionNotice,
  onOpenIngest,
  onManualRouteSelected,
  onTogglePauseSelected,
}) => {
  return (
    <footer className="w-full bg-[#0B0D14] border-t border-[#1E2230] px-3 py-2 text-[11px] select-none">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-[#F8FAFC]">
          <span className="text-[#FFB000] font-bold">[WATCH ACTIVE]</span>
          <span className="text-[#64748B]">//</span>
          <span>
            RPC_SYNC: <span className="text-[#38BDF8]">{simulationRunning ? '1000ms' : 'HALTED'}</span>
          </span>
          <span className="text-[#64748B]">//</span>
          <span className="text-[#64748B]">[j/k: NAVIGATE]</span>
          <button
            type="button"
            onClick={onTogglePauseSelected}
            className="text-[#F8FAFC] hover:text-[#38BDF8] cursor-pointer"
          >
            [SPACE: TOGGLE]
          </button>
          <button
            type="button"
            onClick={onOpenIngest}
            className="text-[#F8FAFC] hover:text-[#38BDF8] cursor-pointer"
          >
            [Ctrl+K: INGEST]
          </button>
          <button
            type="button"
            onClick={onManualRouteSelected}
            className="text-[#FFB000] hover:text-[#F8FAFC] cursor-pointer"
          >
            [r: RE-ROUTE]
          </button>
          <span className="text-[#64748B]">//</span>
          <span>
            DAEMON: <span className="text-[#38BDF8] font-bold">ONLINE</span>
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] truncate">
          <span className="text-[#64748B] truncate max-w-[260px]">
            TARGET: <span className="text-[#F8FAFC]">{selectedTorrentName}</span>
          </span>
          <span className="text-[#1E2230]">|</span>
          <span className="text-[#38BDF8] font-medium truncate" aria-live="polite">
            {lastActionNotice}
          </span>
        </div>
      </div>
    </footer>
  );
};
