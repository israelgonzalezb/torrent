import type {
  ChunkState,
  FilePriority,
  FilterCategory,
  PayloadTag,
  RoutingRule,
  SortField,
  TorrentItem,
} from '../types/bitstream';

const BLOCK_CHARS = ['░', '█'] as const;
const SPARK_BLOCKS = ['░', '░', '▒', '▒', '▓', '▓', '█', '█'] as const;
const BRAILLE_SPARK = ['░', '▒', '▒', '▓', '▓', '█', '▓', '▒'] as const;

/**
 * Generates an ASCII block progress bar like `[████████░░░░░░] 64.2%`
 */
export function formatBlockProgressBar(progress: number, width = 14): string {
  const clamped = Math.max(0, Math.min(100, progress));
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = Math.max(0, width - filledCount);
  const bar = BLOCK_CHARS[1].repeat(filledCount) + BLOCK_CHARS[0].repeat(emptyCount);
  return `[${bar}] ${clamped.toFixed(1)}%`;
}

/**
 * Generates only the `[████████░░░░░░]` portion for flexible layout
 */
export function formatAsciiBlocksOnly(progress: number, width = 14): string {
  const clamped = Math.max(0, Math.min(100, progress));
  const filledCount = Math.round((clamped / 100) * width);
  const emptyCount = Math.max(0, width - filledCount);
  return `[${BLOCK_CHARS[1].repeat(filledCount)}${BLOCK_CHARS[0].repeat(emptyCount)}]`;
}

/**
 * Formats an array of numeric values into a shaded block sparkline `[░▒▓██▓▒░]`
 */
export function formatUnicodeSparkline(values: number[], mode: 'block' | 'braille' = 'block'): string {
  if (!values || values.length === 0) return '[░░░░░░░░]';
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(1, max - min);
  const glyphs = values.map((v) => {
    const normalized = Math.max(0, Math.min(1, (v - min) / range));
    const idx = Math.min(7, Math.floor(normalized * 7.99));
    return mode === 'block' ? SPARK_BLOCKS[idx] : BRAILLE_SPARK[idx];
  });
  return `[${glyphs.join('')}]`;
}

/**
 * Formats ETA seconds into compact countdown string e.g. `-02m 14s`, `SEEDING`, or `STALLED`
 */
export function formatEta(etaSeconds: number, status: TorrentItem['status']): string {
  if (status === 'ERROR') return 'ERR_HASH';
  if (status === 'PAUSED') return 'PAUSED';
  if (status === 'ROUTED' || status === 'SEEDING' || etaSeconds <= 0) return '00m 00s';
  const hrs = Math.floor(etaSeconds / 3600);
  const mins = Math.floor((etaSeconds % 3600) / 60);
  const secs = Math.floor(etaSeconds % 60);
  if (hrs > 0) {
    return `-${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m`;
  }
  return `-${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

/**
 * Cycles file priority in order: SKIP -> NORMAL -> HIGH -> FIRST_LAST_PEEK -> SKIP
 */
export function cycleFilePriority(current: FilePriority): FilePriority {
  const order: FilePriority[] = ['SKIP', 'NORMAL', 'HIGH', 'FIRST_LAST_PEEK'];
  const idx = order.indexOf(current);
  return order[(idx + 1) % order.length];
}

/**
 * Filters and sorts torrents based on search query (supports regex or substring), category, and sort toggle
 */
export function filterAndSortTorrents(
  torrents: TorrentItem[],
  searchQuery: string,
  category: FilterCategory,
  sortBy: SortField,
  sortAsc = false
): TorrentItem[] {
  const trimmed = searchQuery.trim();

  const filtered = torrents.filter((t) => {
    // Category check
    if (category === 'DOWNLOADING' && t.status !== 'DOWNLOADING') return false;
    if (category === 'SEEDING' && t.status !== 'SEEDING') return false;
    if (category === 'ROUTING' && t.status !== 'ROUTED') return false;
    if (category === 'ERROR' && t.status !== 'ERROR') return false;

    if (!trimmed) return true;

    // Regex or substring check
    try {
      const regex = new RegExp(trimmed, 'i');
      return regex.test(t.name) || regex.test(t.tag) || regex.test(t.infoHash);
    } catch {
      const lower = trimmed.toLowerCase();
      return (
        t.name.toLowerCase().includes(lower) ||
        t.tag.toLowerCase().includes(lower) ||
        t.infoHash.toLowerCase().includes(lower)
      );
    }
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case 'VELOCITY':
        cmp = b.downSpeedMb + b.upSpeedMb - (a.downSpeedMb + a.upSpeedMb);
        break;
      case 'ETA': {
        const etaA = a.etaSeconds > 0 ? a.etaSeconds : 999999;
        const etaB = b.etaSeconds > 0 ? b.etaSeconds : 999999;
        cmp = etaA - etaB;
        break;
      }
      case 'SIZE':
        cmp = b.totalSizeGb - a.totalSizeGb;
        break;
      case 'RATIO':
        cmp = b.ratio - a.ratio;
        break;
    }
    return sortAsc ? -cmp : cmp;
  });

  return sorted;
}

/**
 * Standardizes raw messy filenames into clean archival identifiers
 */
export function sanitizeCleanName(rawFilename: string): { cleanName: string; ext: string } {
  const baseName = rawFilename.split('/').pop() || rawFilename;
  const lastDot = baseName.lastIndexOf('.');
  const rawStem = lastDot > 0 ? baseName.slice(0, lastDot) : baseName;
  const ext = lastDot > 0 ? baseName.slice(lastDot + 1).toLowerCase() : 'bin';

  // Replace scene clutter and normalize underscores
  const cleaned = rawStem
    .replace(/\b(raw_dump|v\d+|repack|proper|scene|untagged)\b/gi, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return {
    cleanName: cleaned || 'Payload_Item',
    ext,
  };
}

/**
 * Matches a torrent + file against enabled routing rules
 */
export function matchRoutingRule(
  torrent: Pick<TorrentItem, 'name' | 'tag'>,
  rawFilePath: string,
  rules: RoutingRule[]
): RoutingRule | null {
  const enabledRules = rules.filter((r) => r.enabled);
  const { ext } = sanitizeCleanName(rawFilePath);

  for (const rule of enabledRules) {
    if (rule.matchType === 'TAG') {
      if (torrent.tag.toUpperCase() === rule.pattern.toUpperCase().replace(/^\[|\]$/g, '')) {
        return rule;
      }
    } else if (rule.matchType === 'EXTENSION') {
      const targetExts = rule.pattern
        .toLowerCase()
        .split(',')
        .map((s) => s.trim().replace(/^\./, ''));
      if (targetExts.includes(ext)) {
        return rule;
      }
    } else if (rule.matchType === 'REGEX') {
      try {
        const re = new RegExp(rule.pattern, 'i');
        if (re.test(rawFilePath) || re.test(torrent.name)) {
          return rule;
        }
      } catch {
        if (rawFilePath.toLowerCase().includes(rule.pattern.toLowerCase())) {
          return rule;
        }
      }
    }
  }

  return enabledRules[0] || null;
}

/**
 * Resolves the destination path using a template e.g. `{vault}/{category}/{clean_name}.{ext}`
 */
export function resolveRoutingPath(
  rawFilePath: string,
  torrentName: string,
  rule: Pick<RoutingRule, 'vaultRoot' | 'categoryFolder' | 'template'>,
  index = 1
): string {
  const { cleanName, ext } = sanitizeCleanName(rawFilePath);
  const { cleanName: cleanTorrent } = sanitizeCleanName(torrentName);
  const paddedIndex = String(index).padStart(2, '0');

  const resolved = rule.template
    .replace(/\{vault\}/g, rule.vaultRoot.replace(/\/+$/, ''))
    .replace(/\{category\}/g, rule.categoryFolder.replace(/^\/+|\/+$/g, ''))
    .replace(/\{torrent\}/g, cleanTorrent)
    .replace(/\{clean_name\}/g, `${paddedIndex}_${cleanName}`)
    .replace(/\{ext\}/g, ext);

  return resolved.replace(/\/+/g, '/');
}

/**
 * Parses a magnet URI or filename into clean torrent metadata for ingestion
 */
export function parseIngestPayload(
  rawInput: string,
  tag: PayloadTag,
  routedPreviewPath: string
): {
  name: string;
  infoHash: string;
  totalSizeGb: number;
  tag: PayloadTag;
  routedPath: string;
} {
  const trimmed = rawInput.trim();
  let extractedName = trimmed;
  let infoHash = '8f4e2b9c71a04d3e9a11c6b8027f3a5d90e1c4b2';

  if (trimmed.startsWith('magnet:?')) {
    const dnMatch = trimmed.match(/[?&]dn=([^&]+)/i);
    if (dnMatch && dnMatch[1]) {
      try {
        extractedName = decodeURIComponent(dnMatch[1].replace(/\+/g, ' '));
      } catch {
        extractedName = dnMatch[1];
      }
    } else {
      extractedName = 'Magnet_Stream_Payload_2026.tar.zst';
    }
    const xtMatch = trimmed.match(/urn:btih:([a-fA-F0-9]{16,40})/i);
    if (xtMatch && xtMatch[1]) {
      infoHash = xtMatch[1].toLowerCase().padEnd(40, '0');
    }
  } else {
    // Generate deterministic-looking hex hash from string
    let hashAcc = '';
    for (let i = 0; i < 40; i++) {
      const code = (trimmed.charCodeAt(i % Math.max(1, trimmed.length)) * (i + 7)) % 16;
      hashAcc += code.toString(16);
    }
    infoHash = hashAcc;
  }

  return {
    name: extractedName.replace(/\s+/g, '_'),
    infoHash,
    totalSizeGb: 18.4,
    tag,
    routedPath: routedPreviewPath,
  };
}

/**
 * Steps a torrent item forward by 1 second in the telemetry simulation loop
 */
export function stepTorrentSimulation(torrent: TorrentItem): TorrentItem {
  if (torrent.status === 'PAUSED' || torrent.status === 'ERROR') {
    return {
      ...torrent,
      downSpeedMb: 0,
      upSpeedMb: 0,
    };
  }

  if (torrent.status === 'SEEDING' || torrent.status === 'ROUTED') {
    const jitter = (Math.sin(Date.now() / 1000 + torrent.priorityRank) * 2.4);
    const nextUp = Math.max(1.2, Number((torrent.upSpeedMb + jitter * 0.35).toFixed(1)));
    const nextRatio = Number((torrent.ratio + 0.01).toFixed(2));
    return {
      ...torrent,
      downSpeedMb: 0,
      upSpeedMb: nextUp,
      ratio: nextRatio,
    };
  }

  // Status is DOWNLOADING
  const speedDelta = ((torrent.priorityRank % 3) - 1) * 0.8;
  const nextDown = Math.max(4.5, Number((torrent.downSpeedMb + speedDelta).toFixed(1)));
  const nextUp = Math.max(0.8, Number((torrent.upSpeedMb + 0.2).toFixed(1)));

  // Convert MB/s to GB/s progress increment (amplified slightly for visible live TUI feedback)
  const addedGb = Math.min(
    torrent.totalSizeGb - torrent.downloadedGb,
    Number(((nextDown / 1024) * 3.5).toFixed(2))
  );
  const nextDownloadedGb = Number(
    Math.min(torrent.totalSizeGb, torrent.downloadedGb + addedGb).toFixed(2)
  );
  const nextProgress = Number(
    Math.min(100, (nextDownloadedGb / Math.max(0.1, torrent.totalSizeGb)) * 100).toFixed(1)
  );

  // Update bitfield cells to reflect progress
  const nextBitfield: ChunkState[] = [...torrent.bitfield];
  const targetCompletedCells = Math.floor((nextProgress / 100) * nextBitfield.length);
  for (let i = 0; i < nextBitfield.length; i++) {
    if (i < targetCompletedCells) {
      nextBitfield[i] = 3; // Completed
    } else if (i === targetCompletedCells && nextProgress < 100) {
      nextBitfield[i] = 2; // Verifying Hash
    } else if (i <= targetCompletedCells + 3 && nextProgress < 100) {
      nextBitfield[i] = 1; // Downloading
    }
  }

  const isNowComplete = nextProgress >= 100;
  const remainingGb = Math.max(0, torrent.totalSizeGb - nextDownloadedGb);
  const nextEta = isNowComplete
    ? 0
    : Math.max(1, Math.round((remainingGb * 1024) / Math.max(1, nextDown)));

  return {
    ...torrent,
    status: isNowComplete ? 'SEEDING' : 'DOWNLOADING',
    progress: nextProgress,
    downloadedGb: nextDownloadedGb,
    downSpeedMb: isNowComplete ? 0 : nextDown,
    upSpeedMb: nextUp,
    etaSeconds: nextEta,
    bitfield: nextBitfield,
  };
}
