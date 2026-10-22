import React, { useState } from 'react';
import { 
  Terminal, Play, Trash2, Copy, Download, Clock, 
  CheckCircle2, XCircle, AlertTriangle, History, Activity, 
  Maximize2, Minimize2, X
} from 'lucide-react';
import { ExecutionJob, ActivityEvent } from '../types';

interface TerminalPanelProps {
  lastExecution: ExecutionJob | null;
  history: ExecutionJob[];
  activity: ActivityEvent[];
  stdinContent: string;
  onStdinChange: (val: string) => void;
  onRun: () => void;
  isRunning: boolean;
  onClose?: () => void;
}

export const TerminalPanel: React.FC<TerminalPanelProps> = ({
  lastExecution,
  history,
  activity,
  stdinContent,
  onStdinChange,
  onRun,
  isRunning,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'output' | 'stdin' | 'history' | 'activity'>('output');
  const [isMaximized, setIsMaximized] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!lastExecution) return;
    const fullText = (lastExecution.stdout ? `=== STDOUT ===\n${lastExecution.stdout}\n` : '') +
                     (lastExecution.stderr ? `=== STDERR ===\n${lastExecution.stderr}\n` : '');
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!lastExecution) return;
    const text = `Execution Result ID: ${lastExecution.id}
Language: ${lastExecution.language}
Status: ${lastExecution.status}
Exit Code: ${lastExecution.exit_code}
Duration: ${lastExecution.duration_ms}ms
Timestamp: ${lastExecution.created_at}

=== STDOUT ===
${lastExecution.stdout}

=== STDERR ===
${lastExecution.stderr}
`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cloudcode-output-${lastExecution.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-[#0b0f19] border-t border-[#1e293b] flex flex-col transition-all duration-200 z-20 ${
      isMaximized ? 'h-[80vh]' : 'h-64'
    }`}>
      {/* Tab Navigation Header */}
      <div className="h-9 px-3 bg-[#090d16] border-b border-[#1e293b] flex items-center justify-between select-none">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1 text-xs font-medium rounded-t flex items-center space-x-1.5 transition ${
              activeTab === 'output'
                ? 'bg-[#0b0f19] text-blue-400 border-t-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Output</span>
            {lastExecution && (
              <span className={`w-2 h-2 rounded-full ${
                lastExecution.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-400'
              }`}></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('stdin')}
            className={`px-3 py-1 text-xs font-medium rounded-t flex items-center space-x-1.5 transition ${
              activeTab === 'stdin'
                ? 'bg-[#0b0f19] text-blue-400 border-t-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Standard Input (Stdin)</span>
            {stdinContent.trim() && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1 text-xs font-medium rounded-t flex items-center space-x-1.5 transition ${
              activeTab === 'history'
                ? 'bg-[#0b0f19] text-blue-400 border-t-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({history.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`px-3 py-1 text-xs font-medium rounded-t flex items-center space-x-1.5 transition ${
              activeTab === 'activity'
                ? 'bg-[#0b0f19] text-blue-400 border-t-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Activity</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {activeTab === 'output' && lastExecution && (
            <>
              <button
                onClick={handleCopy}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                title="Copy output"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleDownload}
                className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                title="Download output log"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={() => setIsMaximized(!isMaximized)}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
            title={isMaximized ? "Restore panel size" : "Maximize panel"}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
              title="Close panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-auto p-3 font-mono text-xs">
        {/* Output Tab */}
        {activeTab === 'output' && (
          <div className="h-full">
            {isRunning ? (
              <div className="flex items-center space-x-2 text-slate-400 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Executing program in isolated sandbox worker...</span>
              </div>
            ) : !lastExecution ? (
              <div className="text-slate-500 italic select-none">
                No execution output yet. Click 'Run' or press Ctrl+Enter to run code.
              </div>
            ) : (
              <div className="space-y-2">
                {/* Meta details bar */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/80 text-[11px] text-slate-400">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center space-x-1">
                      {lastExecution.status === 'completed' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      )}
                      <span className="uppercase font-semibold text-slate-300">{lastExecution.status}</span>
                    </span>
                    <span>Exit code: <strong className="text-slate-200">{lastExecution.exit_code ?? 'N/A'}</strong></span>
                    <span>Language: <strong className="text-slate-200 uppercase">{lastExecution.language}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <span>{lastExecution.duration_ms.toFixed(1)} ms</span>
                  </div>
                </div>

                {/* Stdout */}
                {lastExecution.stdout && (
                  <pre className="text-slate-200 whitespace-pre-wrap leading-relaxed select-text font-mono">
                    {lastExecution.stdout}
                  </pre>
                )}

                {/* Stderr */}
                {lastExecution.stderr && (
                  <div className="pt-2 border-t border-rose-900/30">
                    <span className="text-rose-400 font-bold block mb-1">Standard Error:</span>
                    <pre className="text-rose-300 whitespace-pre-wrap leading-relaxed select-text bg-rose-950/20 p-2 rounded border border-rose-900/30 font-mono">
                      {lastExecution.stderr}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Stdin Tab */}
        {activeTab === 'stdin' && (
          <div className="h-full flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs">Standard Input (passed to program during execution via stdin pipe):</span>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onStdinChange('')}
                  className="px-2 py-0.5 text-[11px] text-slate-400 hover:text-slate-200 rounded border border-slate-700 hover:bg-slate-800"
                >
                  Clear
                </button>
                <button
                  onClick={onRun}
                  disabled={isRunning}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Run with Stdin</span>
                </button>
              </div>
            </div>
            <textarea
              value={stdinContent}
              onChange={(e) => onStdinChange(e.target.value)}
              placeholder="Enter program input here (e.g. text or numbers separated by lines)..."
              className="flex-1 bg-[#090d16] border border-slate-800 rounded p-2 text-slate-200 focus:outline-none focus:border-blue-500 font-mono text-xs resize-none"
            />
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-1.5">
            {history.length === 0 ? (
              <div className="text-slate-500 italic">No execution history recorded for this project yet.</div>
            ) : (
              history.map((job) => (
                <div 
                  key={job.id} 
                  className="p-2 rounded bg-slate-900/60 border border-slate-800 hover:border-slate-700 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    {job.status === 'completed' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="uppercase font-bold text-slate-300">{job.language}</span>
                    <span className="text-slate-400">Exit: {job.exit_code ?? '-'}</span>
                    <span className="text-slate-500">{new Date(job.created_at).toLocaleTimeString()}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-400">{job.duration_ms.toFixed(1)} ms</span>
                    <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {job.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Activity Tab */}
        {activeTab === 'activity' && (
          <div className="space-y-2">
            {activity.length === 0 ? (
              <div className="text-slate-500 italic">No activity logs recorded yet.</div>
            ) : (
              activity.map((event) => (
                <div key={event.id} className="flex items-start space-x-2 text-xs">
                  <span className="text-blue-400 font-semibold">•</span>
                  <div className="flex-1">
                    <span className="text-slate-300 font-medium">{event.action.replace('_', ' ').toUpperCase()}: </span>
                    <span className="text-slate-400">{event.details}</span>
                  </div>
                  <span className="text-slate-500 text-[10px]">{new Date(event.created_at).toLocaleTimeString()}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
