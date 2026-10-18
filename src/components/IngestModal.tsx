import React, { useState } from 'react';
import type {
  NodeId,
  OrganizationProfileId,
  PayloadTag,
} from '../types/bitstream';
import { ORGANIZATION_PROFILES } from '../data/seedData';
import { parseIngestPayload, resolveRoutingPath } from '../utils/telemetryLogic';

interface IngestModalProps {
  isOpen: boolean;
  activeNodeId: NodeId;
  onClose: () => void;
  onIngestSubmit: (payload: {
    name: string;
    infoHash: string;
    totalSizeGb: number;
    tag: PayloadTag;
    routedPath: string;
    rawFileSample: string;
  }) => void;
}

const PRESET_MAGNETS = [
  {
    label: 'PRESET_01 // neural_speech_codec_v4.safetensors',
    uri: 'magnet:?xt=urn:btih:3f9a81c44e2b09117a65c8d9e1029384756abcde&dn=Neural_Speech_Codec_24kHz_Weights.safetensors',
    sampleFile: 'raw_dump_v4/neural_codec_fp16.safetensors',
    profile: 'NEURALNET-DOCS' as OrganizationProfileId,
  },
  {
    label: 'PRESET_02 // analog_buchla_200e_archive.flac',
    uri: 'magnet:?xt=urn:btih:7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d&dn=Buchla_200e_West_Coast_Synthesis_Sessions_24bit.flac',
    sampleFile: 'raw_dump_2026/session_01_complex_osc.flac',
    profile: 'AUDIO-FLAC' as OrganizationProfileId,
  },
  {
    label: 'PRESET_03 // openexr_acess_cg_color_pipeline.tar.zst',
    uri: 'magnet:?xt=urn:btih:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b&dn=ACEScg_4K_OpenEXR_Reference_Plates.mkv',
    sampleFile: 'scene_repack/acescg_plate_01_4k.mkv',
    profile: 'CINE-VAULT' as OrganizationProfileId,
  },
];

export const IngestModal: React.FC<IngestModalProps> = ({
  isOpen,
  activeNodeId,
  onClose,
  onIngestSubmit,
}) => {
  const [magnetInput, setMagnetInput] = useState(PRESET_MAGNETS[0].uri);
  const [sampleRawFile, setSampleRawFile] = useState(PRESET_MAGNETS[0].sampleFile);
  const [selectedProfileId, setSelectedProfileId] =
    useState<OrganizationProfileId>('NEURALNET-DOCS');
  const [validationError, setValidationError] = useState('');

  if (!isOpen) return null;

  const activeProfile =
    ORGANIZATION_PROFILES.find((p) => p.id === selectedProfileId) || ORGANIZATION_PROFILES[0];

  const previewTorrentName =
    magnetInput.trim() || 'Untitled_Stream_2026.bin';

  const resolvedDestinationPreview = resolveRoutingPath(
    sampleRawFile || 'payload_01.bin',
    previewTorrentName,
    {
      vaultRoot: activeProfile.vaultRoot,
      categoryFolder: activeProfile.categoryFolder,
      template: activeProfile.template,
    },
    1
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!magnetInput.trim()) {
      setValidationError('ERR_EMPTY_URI: MAGNET URI OR .TORRENT IDENTIFIER REQUIRED');
      return;
    }
    setValidationError('');
    const parsed = parseIngestPayload(
      magnetInput,
      activeProfile.defaultTag,
      resolvedDestinationPreview
    );
    onIngestSubmit({
      ...parsed,
      rawFileSample: sampleRawFile || `${parsed.name}`,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070709]/85 p-4 font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ingest-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#0B0D14] border border-[#38BDF8] text-[#F8FAFC] text-xs">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#121521] border-b border-[#1E2230]">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 bg-[#38BDF8]" />
            <h2
              id="ingest-modal-title"
              className="font-bold tracking-[0.1em] uppercase text-[#F8FAFC]"
            >
              INGEST MAGNET / .TORRENT STREAM // TARGET: {activeNodeId}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Ingest Modal"
            className="px-2 py-0.5 text-[11px] text-[#64748B] hover:text-[#F8FAFC] border border-[#1E2230] cursor-pointer"
          >
            [ESC // CLOSE]
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">
              QUICK TEST VECTORS (LOAD SAMPLE MAGNET STREAM):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_MAGNETS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setMagnetInput(preset.uri);
                    setSampleRawFile(preset.sampleFile);
                    setSelectedProfileId(preset.profile);
                    setValidationError('');
                  }}
                  className="px-2 py-1 text-[10px] bg-[#070709] border border-[#1E2230] text-[#38BDF8] hover:border-[#38BDF8] cursor-pointer"
                >
                  [{preset.label}]
                </button>
              ))}
            </div>
          </div>

          {/* Magnet URI Input */}
          <div className="space-y-1.5">
            <label htmlFor="magnet-uri-input" className="block text-[10px] text-[#64748B] uppercase tracking-wider">
              MAGNET URI / INFOHASH / .TORRENT DESCRIPTOR:
            </label>
            <input
              id="magnet-uri-input"
              type="text"
              value={magnetInput}
              onChange={(e) => {
                setMagnetInput(e.target.value);
                if (validationError) setValidationError('');
              }}
              placeholder="magnet:?xt=urn:btih:..."
              className="w-full bg-[#070709] border border-[#1E2230] focus:border-[#38BDF8] px-3 py-2 text-[#F8FAFC] text-xs focus:outline-none"
            />
            {validationError && (
              <p className="text-[11px] text-[#F43F5E] font-semibold">{validationError}</p>
            )}
          </div>

          {/* Auto-Organization Profile Selector */}
          <div className="space-y-1.5">
            <div className="text-[10px] text-[#64748B] uppercase tracking-wider">
              SELECT AUTO-ORGANIZATION PROFILE:
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ORGANIZATION_PROFILES.map((prof) => {
                const isSelected = prof.id === selectedProfileId;
                return (
                  <button
                    key={prof.id}
                    type="button"
                    onClick={() => setSelectedProfileId(prof.id)}
                    className={`p-2 text-left border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#121521] border-[#FFB000] text-[#FFB000]'
                        : 'bg-[#070709] border-[#1E2230] text-[#64748B] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <div className="font-bold text-[11px]">{prof.label}</div>
                    <div className="text-[10px] text-[#F8FAFC] mt-0.5">[{prof.defaultTag}]</div>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-[#64748B] pt-1">{activeProfile.description}</p>
          </div>

          {/* Live Resolved Destination Path Preview */}
          <div className="bg-[#070709] border border-[#1E2230] p-3 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-[10px] text-[#64748B]">
              <span>REAL-TIME DESTINATION PATH RESOLVER</span>
              <span className="text-[#FFB000]">[HARDLINK_MODE: ATOMIC]</span>
            </div>
            <div className="text-[#64748B] text-[10px] truncate">
              SOURCE PAYLOAD: <span className="text-[#F8FAFC]">{sampleRawFile}</span>
            </div>
            <div className="text-[#38BDF8] font-bold truncate">
              RESOLVED TARGET: {resolvedDestinationPreview}
            </div>
          </div>

          {/* Submit & Cancel Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E2230]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[11px] bg-[#070709] text-[#64748B] border border-[#1E2230] hover:text-[#F8FAFC] cursor-pointer uppercase"
            >
              [CANCEL]
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-[11px] font-bold bg-[#F8FAFC] text-[#070709] border border-[#F8FAFC] hover:bg-[#38BDF8] hover:border-[#38BDF8] cursor-pointer uppercase"
            >
              [APPEND STREAM TO MATRIX]
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
