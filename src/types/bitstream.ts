export type NodeId = 'NODE_01' | 'NODE_02' | 'NODE_03';

export interface DaemonNode {
  id: NodeId;
  label: string;
  shortName: string;
  pingMs: number;
  tunnelIp: string;
  tunnelVerified: boolean;
  nvmeUsedTb: number;
  nvmeTotalTb: number;
  nasUsedTb: number;
  nasTotalTb: number;
  dhtNodes: number;
  globalRatio: number;
}

export type TorrentStatus = 'DOWNLOADING' | 'SEEDING' | 'ROUTED' | 'PAUSED' | 'ERROR';

export type PayloadTag = 'ARCHIVE' | 'MEDIA_4K' | 'AUDIO_FLAC' | 'DEV_ISO' | 'NEURAL_WEIGHTS';

export type FilterCategory = 'ALL' | 'DOWNLOADING' | 'SEEDING' | 'ROUTING' | 'ERROR';

export type SortField = 'VELOCITY' | 'ETA' | 'SIZE' | 'RATIO';

export type ChunkState = 0 | 1 | 2 | 3; // 0 = Missing (#0B0D14), 1 = Downloading (#38BDF8), 2 = Verifying Hash (#FFB000), 3 = Completed (#F8FAFC)

export type FilePriority = 'SKIP' | 'NORMAL' | 'HIGH' | 'FIRST_LAST_PEEK';

export interface TorrentFileItem {
  id: string;
  rawPath: string;
  sizeGb: number;
  progress: number; // 0 to 100
  priority: FilePriority;
  included: boolean;
}

export interface SwarmPeer {
  id: string;
  ip: string;
  countryFlag: string;
  client: string;
  downRateMb: number;
  upRateMb: number;
  progress: number;
}

export interface TrackerStatus {
  url: string;
  status: 'ANNOUNCE_OK' | 'SCRAPE_OK' | 'TIMEOUT_ERR' | 'VERIFYING';
  seeds: number;
  peers: number;
  nextAnnounceSec: number;
}

export interface TorrentItem {
  id: string;
  nodeId: NodeId;
  name: string;
  infoHash: string;
  tag: PayloadTag;
  status: TorrentStatus;
  progress: number; // 0 to 100
  downloadedGb: number;
  totalSizeGb: number;
  downSpeedMb: number;
  upSpeedMb: number;
  connectedPeers: number;
  swarmSeeds: number;
  ratio: number;
  etaSeconds: number; // -1 for infinite/seeding, 0 for done
  priorityRank: number;
  errorDetail?: string;
  bitfield: ChunkState[]; // 128 cells
  files: TorrentFileItem[];
  peers: SwarmPeer[];
  trackers: TrackerStatus[];
  routedPath?: string;
  lastRoutedAt?: string;
}

export type RuleMatchType = 'EXTENSION' | 'REGEX' | 'TAG';

export interface RoutingRule {
  id: string;
  name: string;
  enabled: boolean;
  matchType: RuleMatchType;
  pattern: string;
  categoryFolder: string;
  template: string; // e.g., "{vault}/{category}/{clean_name}.{ext}"
  vaultRoot: string; // e.g., "/vault/media" or "/vault/archive"
}

export type OrganizationProfileId = 'CINE-VAULT' | 'AUDIO-FLAC' | 'NEURALNET-DOCS' | 'RAW-SANDBOX';

export interface OrganizationProfile {
  id: OrganizationProfileId;
  label: string;
  defaultTag: PayloadTag;
  vaultRoot: string;
  categoryFolder: string;
  template: string;
  description: string;
}
