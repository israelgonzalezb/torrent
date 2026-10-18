import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBlockProgressBar,
  formatUnicodeSparkline,
  formatEta,
  cycleFilePriority,
  filterAndSortTorrents,
  sanitizeCleanName,
  matchRoutingRule,
  resolveRoutingPath,
  parseIngestPayload,
  stepTorrentSimulation,
} from './telemetryLogic.ts';
import type { RoutingRule, TorrentItem } from '../types/bitstream.ts';

test('formatBlockProgressBar renders exact block fill and percentage', () => {
  const bar50 = formatBlockProgressBar(50, 10);
  assert.equal(bar50, '[█████░░░░░] 50.0%');

  const bar100 = formatBlockProgressBar(100, 8);
  assert.equal(bar100, '[████████] 100.0%');
});

test('formatUnicodeSparkline encodes numeric arrays into block and braille sparklines', () => {
  const blockSpark = formatUnicodeSparkline([10, 20, 40, 80], 'block');
  assert.equal(blockSpark.startsWith('['), true);
  assert.equal(blockSpark.endsWith(']'), true);
  assert.equal(blockSpark.length, 6);

  const brailleSpark = formatUnicodeSparkline([5, 15, 25, 35], 'braille');
  assert.equal(brailleSpark.length, 6);
});

test('formatEta formats active countdowns and special statuses accurately', () => {
  assert.equal(formatEta(134, 'DOWNLOADING'), '-02m 14s');
  assert.equal(formatEta(3720, 'DOWNLOADING'), '-01h 02m');
  assert.equal(formatEta(0, 'SEEDING'), '00m 00s');
  assert.equal(formatEta(120, 'PAUSED'), 'PAUSED');
  assert.equal(formatEta(120, 'ERROR'), 'ERR_HASH');
});

test('cycleFilePriority cycles through all 4 chunk priority states', () => {
  assert.equal(cycleFilePriority('SKIP'), 'NORMAL');
  assert.equal(cycleFilePriority('NORMAL'), 'HIGH');
  assert.equal(cycleFilePriority('HIGH'), 'FIRST_LAST_PEEK');
  assert.equal(cycleFilePriority('FIRST_LAST_PEEK'), 'SKIP');
});

test('sanitizeCleanName strips scene noise and preserves extension', () => {
  const res = sanitizeCleanName('raw_dump_2026_v2/track01.flac');
  assert.equal(res.cleanName, 'track01');
  assert.equal(res.ext, 'flac');
});

test('matchRoutingRule and resolveRoutingPath transform chaotic paths into structured vault paths', () => {
  const rules: RoutingRule[] = [
    {
      id: 'r1',
      name: 'Lossless Audio Archive',
      enabled: true,
      matchType: 'EXTENSION',
      pattern: 'flac,wav',
      vaultRoot: '/vault/audio',
      categoryFolder: '2026_Archive',
      template: '{vault}/{category}/{clean_name}.{ext}',
    },
  ];

  const matched = matchRoutingRule(
    { name: 'Dark_Electro_Modular_Stems', tag: 'AUDIO_FLAC' },
    'raw_dump_2026_v2/track01.flac',
    rules
  );
  assert.ok(matched);
  assert.equal(matched.id, 'r1');

  const dest = resolveRoutingPath(
    'raw_dump_2026_v2/track01.flac',
    'Dark_Electro_Modular_Stems',
    matched,
    1
  );
  assert.equal(dest, '/vault/audio/2026_Archive/01_track01.flac');
});

test('filterAndSortTorrents filters by regex/category and sorts by velocity/size', () => {
  const mockTorrents: TorrentItem[] = [
    {
      id: 't1',
      nodeId: 'NODE_01',
      name: 'Linux_Kernel_6.12_LTS_Source.tar.zst',
      infoHash: 'aaaa',
      tag: 'DEV_ISO',
      status: 'DOWNLOADING',
      progress: 50,
      downloadedGb: 1,
      totalSizeGb: 2,
      downSpeedMb: 45,
      upSpeedMb: 5,
      connectedPeers: 20,
      swarmSeeds: 100,
      ratio: 1.2,
      etaSeconds: 40,
      priorityRank: 1,
      bitfield: new Array(128).fill(1),
      files: [],
      peers: [],
      trackers: [],
    },
    {
      id: 't2',
      nodeId: 'NODE_01',
      name: 'Dark_Electro_Modular_Stems.flac',
      infoHash: 'bbbb',
      tag: 'AUDIO_FLAC',
      status: 'SEEDING',
      progress: 100,
      downloadedGb: 20,
      totalSizeGb: 20,
      downSpeedMb: 0,
      upSpeedMb: 12,
      connectedPeers: 8,
      swarmSeeds: 40,
      ratio: 3.5,
      etaSeconds: 0,
      priorityRank: 2,
      bitfield: new Array(128).fill(3),
      files: [],
      peers: [],
      trackers: [],
    },
  ];

  const onlySeed = filterAndSortTorrents(mockTorrents, '', 'SEEDING', 'VELOCITY');
  assert.equal(onlySeed.length, 1);
  assert.equal(onlySeed[0].id, 't2');

  const regexFilter = filterAndSortTorrents(mockTorrents, 'kernel.*zst', 'ALL', 'VELOCITY');
  assert.equal(regexFilter.length, 1);
  assert.equal(regexFilter[0].id, 't1');

  const sortedBySize = filterAndSortTorrents(mockTorrents, '', 'ALL', 'SIZE');
  assert.equal(sortedBySize[0].id, 't2');
});

test('parseIngestPayload extracts magnet dn and btih hash accurately', () => {
  const parsed = parseIngestPayload(
    'magnet:?xt=urn:btih:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2&dn=Cybernetic+Synth+Archive+2026',
    'AUDIO_FLAC',
    '/vault/audio/2026/Cybernetic_Synth_Archive_2026'
  );
  assert.equal(parsed.name, 'Cybernetic_Synth_Archive_2026');
  assert.equal(parsed.infoHash, 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2');
  assert.equal(parsed.tag, 'AUDIO_FLAC');
});

test('stepTorrentSimulation advances downloading torrent progress and updates bitfield', () => {
  const sample: TorrentItem = {
    id: 't1',
    nodeId: 'NODE_01',
    name: 'Test.tar',
    infoHash: '1234',
    tag: 'ARCHIVE',
    status: 'DOWNLOADING',
    progress: 50,
    downloadedGb: 5.0,
    totalSizeGb: 10.0,
    downSpeedMb: 50.0,
    upSpeedMb: 4.0,
    connectedPeers: 12,
    swarmSeeds: 80,
    ratio: 0.8,
    etaSeconds: 100,
    priorityRank: 1,
    bitfield: new Array(128).fill(0),
    files: [],
    peers: [],
    trackers: [],
  };

  const stepped = stepTorrentSimulation(sample);
  assert.equal(stepped.downloadedGb > sample.downloadedGb, true);
  assert.equal(stepped.progress >= sample.progress, true);
  assert.equal(stepped.bitfield.some((c) => c === 3), true);
});
