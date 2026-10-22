import React, { useState } from 'react';
import { 
  Folder, FolderOpen, FileCode, FileText, FileJson, 
  ChevronRight, ChevronDown, MoreVertical, Plus, Trash2, 
  Edit2, FileSpreadsheet, File
} from 'lucide-react';
import { FileTreeItem } from '../types';

interface FileTreeProps {
  items: FileTreeItem[];
  activeFileId: string | null;
  unsavedFiles?: Set<string>;
  onSelectFile: (file: FileTreeItem) => void;
  onCreateFile: (parentId: string | null) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameItem: (item: FileTreeItem, newName: string) => void;
  onDeleteItem: (item: FileTreeItem) => void;
}

export const FileTree: React.FC<FileTreeProps> = ({
  items,
  activeFileId,
  unsavedFiles = new Set(),
  onSelectFile,
  onCreateFile,
  onCreateFolder,
  onRenameItem,
  onDeleteItem
}) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startRename = (item: FileTreeItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setEditName(item.name);
    setMenuOpenId(null);
  };

  const submitRename = (item: FileTreeItem) => {
    if (editName.trim() && editName !== item.name) {
      onRenameItem(item, editName.trim());
    }
    setEditingItemId(null);
  };

  const getFileIcon = (name: string, language: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (['py'].includes(ext || '')) return <span className="text-yellow-400 font-bold text-xs">🐍</span>;
    if (['js', 'jsx'].includes(ext || '')) return <span className="text-amber-400 font-bold text-xs">JS</span>;
    if (['ts', 'tsx'].includes(ext || '')) return <span className="text-blue-400 font-bold text-xs">TS</span>;
    if (['html'].includes(ext || '')) return <span className="text-orange-400 font-bold text-xs">&lt;&gt;</span>;
    if (['css'].includes(ext || '')) return <span className="text-sky-400 font-bold text-xs">#</span>;
    if (['json'].includes(ext || '')) return <FileJson className="w-4 h-4 text-emerald-400" />;
    if (['md'].includes(ext || '')) return <FileText className="w-4 h-4 text-purple-400" />;
    if (['c', 'cpp', 'h', 'hpp'].includes(ext || '')) return <span className="text-indigo-400 font-bold text-xs">C++</span>;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const renderItem = (item: FileTreeItem, depth: number = 0) => {
    const isExpanded = expandedFolders.has(item.id);
    const isActive = activeFileId === item.id;
    const isUnsaved = unsavedFiles.has(item.id);
    const isEditing = editingItemId === item.id;
    const isMenuOpen = menuOpenId === item.id;

    return (
      <div key={item.id} className="select-none">
        <div
          onClick={(e) => {
            if (item.is_folder) {
              toggleFolder(item.id, e);
            } else {
              onSelectFile(item);
            }
          }}
          className={`group flex items-center justify-between py-1 px-2 cursor-pointer text-xs transition-colors rounded-md mx-1 ${
            isActive
              ? 'bg-blue-600/20 text-blue-300 font-medium border border-blue-500/30'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            {item.is_folder ? (
              <>
                <button 
                  onClick={(e) => toggleFolder(item.id, e)} 
                  className="p-0.5 hover:bg-slate-700 rounded text-slate-400 focus:outline-none"
                >
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-blue-400 flex-shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-blue-400/80 flex-shrink-0" />
                )}
              </>
            ) : (
              <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                {getFileIcon(item.name, item.language)}
              </span>
            )}

            {isEditing ? (
              <input
                type="text"
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onBlur={() => submitRename(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submitRename(item);
                  if (e.key === 'Escape') setEditingItemId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 text-white border border-blue-500 rounded px-1 py-0.5 text-xs w-full focus:outline-none"
              />
            ) : (
              <span className="truncate flex-1">{item.name}</span>
            )}

            {isUnsaved && (
              <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Unsaved changes"></span>
            )}
          </div>

          {/* Quick Actions / Context Menu Trigger */}
          <div className="relative opacity-0 group-hover:opacity-100 flex items-center space-x-1">
            {item.is_folder && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onCreateFile(item.id); }}
                  className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
                  title="New File in Folder"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenId(isMenuOpen ? null : item.id);
              }}
              className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"
            >
              <MoreVertical className="w-3 h-3" />
            </button>

            {isMenuOpen && (
              <div 
                className="absolute right-0 top-6 w-32 bg-[#0f172a] border border-slate-700 rounded-lg shadow-xl py-1 z-50 text-[11px]"
                onClick={(e) => e.stopPropagation()}
              >
                {item.is_folder && (
                  <>
                    <button
                      onClick={() => { setMenuOpenId(null); onCreateFile(item.id); }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center space-x-1.5"
                    >
                      <Plus className="w-3 h-3" />
                      <span>New File</span>
                    </button>
                    <button
                      onClick={() => { setMenuOpenId(null); onCreateFolder(item.id); }}
                      className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center space-x-1.5"
                    >
                      <Folder className="w-3 h-3" />
                      <span>New Folder</span>
                    </button>
                  </>
                )}
                <button
                  onClick={(e) => startRename(item, e)}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center space-x-1.5"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Rename</span>
                </button>
                <button
                  onClick={() => { setMenuOpenId(null); onDeleteItem(item); }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-rose-950/40 text-rose-400 flex items-center space-x-1.5"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Delete</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Children if expanded folder */}
        {item.is_folder && isExpanded && item.children && (
          <div>
            {item.children.map(child => renderItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="py-2 space-y-0.5 overflow-y-auto max-h-full">
      {items.length === 0 ? (
        <div className="text-center py-6 px-4 text-xs text-slate-500">
          No files yet. Click (+) above to create your first file.
        </div>
      ) : (
        items.map(item => renderItem(item, 0))
      )}
    </div>
  );
};
