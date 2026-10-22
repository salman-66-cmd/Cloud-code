import React, { useState, useEffect } from 'react';
import { X, History, RotateCcw, Plus, Check, Clock } from 'lucide-react';
import { FileVersion, ProjectFile } from '../types';
import { versionService } from '../services/extraServices';

interface VersionHistoryModalProps {
  file: ProjectFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRestored: (newContent: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  file,
  isOpen,
  onClose,
  onRestored
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<FileVersion | null>(null);
  const [checkpointMessage, setCheckpointMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      loadVersions();
    }
  }, [isOpen, file?.id]);

  const loadVersions = async () => {
    if (!file) return;
    setIsLoading(true);
    try {
      const data = await versionService.getVersions(file.id);
      setVersions(data);
      if (data.length > 0) {
        setSelectedVersion(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !checkpointMessage.trim()) return;
    try {
      await versionService.createCheckpoint(file.id, checkpointMessage.trim());
      setCheckpointMessage('');
      loadVersions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestore = async () => {
    if (!file || !selectedVersion) return;
    if (!confirm(`Restore ${file.name} to Version #${selectedVersion.version_num}?`)) return;
    setIsRestoring(true);
    try {
      const updatedFile = await versionService.restoreVersion(file.id, selectedVersion.id);
      onRestored(updatedFile.content);
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to restore version");
    } finally {
      setIsRestoring(false);
    }
  };

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100 text-sm">
              Version History — <span className="text-blue-400">{file.name}</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Layout */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Versions list */}
          <div className="w-80 border-r border-slate-800 p-4 flex flex-col space-y-3 bg-[#090d16]">
            {/* Create manual checkpoint */}
            <form onSubmit={handleCreateCheckpoint} className="space-y-1.5 pb-3 border-b border-slate-800">
              <label className="text-[11px] font-semibold text-slate-400">Save Snapshot Checkpoint</label>
              <div className="flex space-x-1.5">
                <input
                  type="text"
                  placeholder="Checkpoint note..."
                  value={checkpointMessage}
                  onChange={(e) => setCheckpointMessage(e.target.value)}
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!checkpointMessage.trim()}
                  className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold disabled:bg-slate-800"
                  title="Create Checkpoint"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <span className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Snapshots ({versions.length})
            </span>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {isLoading ? (
                <div className="text-slate-500 text-xs py-4 text-center">Loading versions...</div>
              ) : versions.length === 0 ? (
                <div className="text-slate-500 text-xs py-4 text-center">No snapshot history found.</div>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedVersion(ver)}
                    className={`p-2.5 rounded-xl border cursor-pointer text-xs transition ${
                      selectedVersion?.id === ver.id
                        ? 'bg-blue-600/20 border-blue-500 text-white'
                        : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span>Version #{ver.version_num}</span>
                      <span className="text-[10px] text-slate-500 flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(ver.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 truncate">{ver.commit_message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Version content preview */}
          <div className="flex-1 flex flex-col bg-[#0b0f19]">
            {selectedVersion ? (
              <>
                <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900/40">
                  <div>
                    <h4 className="text-xs font-semibold text-slate-200">
                      Version #{selectedVersion.version_num} Content Snapshot
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Created on {new Date(selectedVersion.created_at).toLocaleString()}
                    </p>
                  </div>

                  <button
                    onClick={handleRestore}
                    disabled={isRestoring}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition disabled:bg-slate-700"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{isRestoring ? 'Restoring...' : 'Restore This Version'}</span>
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  <pre className="text-xs font-mono text-slate-200 whitespace-pre leading-relaxed select-text bg-[#090d16] p-4 rounded-xl border border-slate-800 min-h-full">
                    {selectedVersion.content}
                  </pre>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a version snapshot to preview.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
