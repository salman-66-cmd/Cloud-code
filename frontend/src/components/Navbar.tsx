import React, { useState } from 'react';
import { 
  Play, Share2, Bell, CheckCircle2, AlertCircle, RefreshCw, 
  Terminal, Globe, ChevronDown, LogOut, Settings as SettingsIcon,
  Shield, User, FolderGit2
} from 'lucide-react';
import { Project, Collaborator } from '../types';
import { authService } from '../services/authService';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  project?: Project | null;
  activeLanguage?: string;
  saveStatus?: 'saved' | 'saving' | 'unsaved' | 'error';
  collaborators?: Collaborator[];
  isRunning?: boolean;
  onRun?: () => void;
  onShare?: () => void;
  onToggleTerminal?: () => void;
  isTerminalOpen?: boolean;
  onToggleWebPreview?: () => void;
  onOpenSettings?: () => void;
  onOpenVersions?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  project,
  activeLanguage,
  saveStatus = 'saved',
  collaborators = [],
  isRunning = false,
  onRun,
  onShare,
  onToggleTerminal,
  isTerminalOpen = true,
  onToggleWebPreview,
  onOpenSettings,
  onOpenVersions
}) => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  return (
    <header className="h-14 bg-[#0b0f19] border-b border-[#1e293b] px-4 flex items-center justify-between select-none z-30">
      {/* Left: Brand & Project Info */}
      <div className="flex items-center space-x-4">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center space-x-2.5 group focus:outline-none"
          title="Back to Dashboard"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <FolderGit2 className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-base tracking-tight text-white group-hover:text-blue-400 transition-colors">
            Cloud<span className="text-blue-500">Code</span>
          </span>
        </button>

        {project && (
          <div className="flex items-center space-x-3 pl-3 border-l border-slate-800">
            <span className="text-slate-400 text-sm">/</span>
            <span className="text-sm font-semibold text-slate-200 max-w-[200px] truncate">
              {project.name}
            </span>

            {/* Language Badge */}
            <span className="text-xs uppercase font-mono px-2 py-0.5 rounded bg-slate-800/80 text-blue-400 border border-slate-700">
              {activeLanguage || project.language}
            </span>

            {/* Save Status */}
            <div className="flex items-center space-x-1.5 text-xs">
              {saveStatus === 'saved' && (
                <span className="flex items-center space-x-1 text-slate-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Saved</span>
                </span>
              )}
              {saveStatus === 'saving' && (
                <span className="flex items-center space-x-1 text-blue-400 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </span>
              )}
              {saveStatus === 'unsaved' && (
                <span className="flex items-center space-x-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span className="hidden sm:inline">Unsaved</span>
                </span>
              )}
              {saveStatus === 'error' && (
                <span className="flex items-center space-x-1 text-rose-400">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save Failed</span>
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Center/Right: Actions & Collaborators */}
      <div className="flex items-center space-x-3">
        {/* Collaborator Avatars */}
        {collaborators.length > 0 && (
          <div className="hidden md:flex items-center -space-x-2 mr-2" title={`${collaborators.length} active collaborator(s)`}>
            {collaborators.slice(0, 4).map((c, i) => (
              <div 
                key={c.userId + i}
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-[#0b0f19] shadow-sm relative"
                style={{ backgroundColor: c.color }}
                title={`${c.username} (active)`}
              >
                {c.username.slice(0, 2).toUpperCase()}
                <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 border border-[#0b0f19]"></span>
              </div>
            ))}
            {collaborators.length > 4 && (
              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300 border-2 border-[#0b0f19]">
                +{collaborators.length - 4}
              </div>
            )}
          </div>
        )}

        {/* Web Preview button for HTML/JS */}
        {onToggleWebPreview && (
          <button
            onClick={onToggleWebPreview}
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-lg border border-slate-700 transition"
            title="Open Sandbox Web Preview"
          >
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Preview</span>
          </button>
        )}

        {/* Terminal Toggle */}
        {onToggleTerminal && (
          <button
            onClick={onToggleTerminal}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition ${
              isTerminalOpen 
                ? 'bg-slate-800 text-blue-400 border-blue-500/30' 
                : 'text-slate-400 hover:text-slate-200 border-slate-750 bg-slate-850'
            }`}
            title="Toggle Output Terminal"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Output</span>
          </button>
        )}

        {/* Share Button */}
        {onShare && (
          <button
            onClick={onShare}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Share</span>
          </button>
        )}

        {/* Run Button */}
        {onRun && (
          <button
            onClick={onRun}
            disabled={isRunning}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg shadow-md transition-all ${
              isRunning
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 active:scale-95'
            }`}
            title="Execute Code (Ctrl + Enter)"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </>
            )}
          </button>
        )}

        {/* User Menu */}
        <div className="relative pl-2 border-l border-slate-800">
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center space-x-2 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xs font-bold text-white shadow">
              {currentUser?.username?.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 bg-[#0f172a] border border-slate-700 rounded-xl shadow-2xl py-1.5 z-50 text-xs">
              <div className="px-3.5 py-2 border-b border-slate-800">
                <p className="font-semibold text-slate-200 truncate">{currentUser?.full_name || currentUser?.username}</p>
                <p className="text-slate-400 text-[11px] truncate">{currentUser?.email}</p>
                <div className="mt-1 flex items-center space-x-1">
                  <Shield className="w-3 h-3 text-blue-400" />
                  <span className="text-[10px] uppercase font-bold text-blue-400">{currentUser?.role || 'user'}</span>
                </div>
              </div>

              <button
                onClick={() => { setIsUserMenuOpen(false); navigate('/dashboard'); }}
                className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-slate-800/80 flex items-center space-x-2"
              >
                <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Dashboard</span>
              </button>

              {onOpenVersions && (
                <button
                  onClick={() => { setIsUserMenuOpen(false); onOpenVersions(); }}
                  className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-slate-800/80 flex items-center space-x-2"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  <span>Version History</span>
                </button>
              )}

              {onOpenSettings && (
                <button
                  onClick={() => { setIsUserMenuOpen(false); onOpenSettings(); }}
                  className="w-full text-left px-3.5 py-2 text-slate-300 hover:bg-slate-800/80 flex items-center space-x-2"
                >
                  <SettingsIcon className="w-3.5 h-3.5 text-slate-400" />
                  <span>Project Settings</span>
                </button>
              )}

              <div className="border-t border-slate-800 my-1"></div>

              <button
                onClick={handleLogout}
                className="w-full text-left px-3.5 py-2 text-rose-400 hover:bg-rose-950/30 flex items-center space-x-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
