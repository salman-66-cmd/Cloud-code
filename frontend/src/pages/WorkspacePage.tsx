import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import { 
  FileCode, X, Plus, FolderPlus, RefreshCw, Terminal, 
  Settings, History, Globe, Share2, Search
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { FileTree } from '../components/FileTree';
import { TerminalPanel } from '../components/TerminalPanel';
import { RightSidebar } from '../components/RightSidebar';
import { ShareModal } from '../components/ShareModal';
import { VersionHistoryModal } from '../components/VersionHistoryModal';
import { WebPreviewModal } from '../components/WebPreviewModal';

import { projectService } from '../services/projectService';
import { fileService } from '../services/fileService';
import { executionService } from '../services/executionService';
import { commentService } from '../services/extraServices';
import { useCollaboration } from '../collaboration/useCollaboration';
import { Project, FileTreeItem, ProjectFile, ExecutionJob, Comment, ActivityEvent } from '../types';

export const WorkspacePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  // Project state
  const [project, setProject] = useState<Project | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [openTabs, setOpenTabs] = useState<ProjectFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFileContent, setActiveFileContent] = useState<string>('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [unsavedFiles, setUnsavedFiles] = useState<Set<string>>(new Set());

  // Execution state
  const [lastExecution, setLastExecution] = useState<ExecutionJob | null>(null);
  const [executionHistory, setExecutionHistory] = useState<ExecutionJob[]>([]);
  const [stdinContent, setStdinContent] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(true);

  // Social & activity
  const [comments, setComments] = useState<Comment[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);

  // Modals
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isVersionsModalOpen, setIsVersionsModalOpen] = useState<boolean>(false);
  const [isWebPreviewOpen, setIsWebPreviewOpen] = useState<boolean>(false);

  // Monaco editor ref
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const decorationsRef = useRef<string[]>([]);
  const autosaveTimeoutRef = useRef<any>(null);

  // Real-time Collaboration Hook
  const {
    collaborators,
    isConnected,
    sendCursor,
    sendDocChange
  } = useCollaboration({
    projectId: projectId || '',
    fileId: activeFileId,
    onRemoteContentUpdate: (newContent: string) => {
      setActiveFileContent(newContent);
      setOpenTabs(prev => prev.map(t => t.id === activeFileId ? { ...t, content: newContent } : t));
    }
  });

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      loadProjectData(projectId);
    }
  }, [projectId]);

  const loadProjectData = async (id: string) => {
    try {
      const proj = await projectService.getProject(id);
      setProject(proj);

      const tree = await fileService.getProjectFiles(id);
      setFileTree(tree);

      const hist = await executionService.getExecutionHistory(id);
      setExecutionHistory(hist);
      if (hist.length > 0) setLastExecution(hist[0]);

      const cmts = await commentService.getComments(id);
      setComments(cmts);

      const acts = await commentService.getActivity(id);
      setActivity(acts);

      // Open first code file by default
      const firstFile = findFirstCodeFile(tree);
      if (firstFile) {
        handleOpenFile(firstFile);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403 || err.response?.status === 404) {
        navigate('/dashboard');
      }
    }
  };

  const findFirstCodeFile = (items: FileTreeItem[]): FileTreeItem | null => {
    for (const item of items) {
      if (!item.is_folder) return item;
      if (item.children) {
        const nested = findFirstCodeFile(item.children);
        if (nested) return nested;
      }
    }
    return null;
  };

  const handleOpenFile = async (item: FileTreeItem) => {
    if (item.is_folder) return;
    try {
      const existingTab = openTabs.find(t => t.id === item.id);
      if (!existingTab) {
        const fullFile = await fileService.getFile(item.id);
        setOpenTabs(prev => [...prev, fullFile]);
        setActiveFileId(fullFile.id);
        setActiveFileContent(fullFile.content);
      } else {
        setActiveFileId(existingTab.id);
        setActiveFileContent(existingTab.content);
      }
      setSaveStatus('saved');
    } catch (err) {
      console.error("Failed to open file", err);
    }
  };

  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const remaining = openTabs.filter(t => t.id !== id);
    setOpenTabs(remaining);
    if (activeFileId === id) {
      if (remaining.length > 0) {
        setActiveFileId(remaining[remaining.length - 1].id);
        setActiveFileContent(remaining[remaining.length - 1].content);
      } else {
        setActiveFileId(null);
        setActiveFileContent('');
      }
    }
  };

  // Editor content change handler with debounced autosave
  const handleEditorChange = (value: string | undefined) => {
    const val = value || '';
    setActiveFileContent(val);
    setSaveStatus('unsaved');

    if (activeFileId) {
      setUnsavedFiles(prev => new Set(prev).add(activeFileId));
      setOpenTabs(prev => prev.map(t => t.id === activeFileId ? { ...t, content: val } : t));

      // Broadcast changes to real-time peers
      sendDocChange(val);

      // Debounced autosave after 1.5 seconds of inactivity
      clearTimeout(autosaveTimeoutRef.current);
      autosaveTimeoutRef.current = setTimeout(() => {
        handleSave(val);
      }, 1500);
    }
  };

  const handleSave = async (contentToSave?: string) => {
    if (!activeFileId) return;
    const content = contentToSave !== undefined ? contentToSave : activeFileContent;
    setSaveStatus('saving');

    try {
      await fileService.updateFile(activeFileId, { content }, false);
      setSaveStatus('saved');
      setUnsavedFiles(prev => {
        const next = new Set(prev);
        next.delete(activeFileId);
        return next;
      });
    } catch (err) {
      console.error("Save error", err);
      setSaveStatus('error');
    }
  };

  // Run code execution
  const handleRunCode = async () => {
    if (!projectId) return;
    setIsRunning(true);
    setIsTerminalOpen(true);

    try {
      // Auto-save before running
      if (activeFileId && unsavedFiles.has(activeFileId)) {
        await handleSave();
      }

      const activeFile = openTabs.find(t => t.id === activeFileId);
      const res = await executionService.runCode(projectId, {
        file_id: activeFileId || undefined,
        language: activeFile?.language || project?.language,
        code: activeFileContent,
        stdin_content: stdinContent
      });

      setLastExecution(res);
      setExecutionHistory(prev => [res, ...prev]);

      // Refresh activity
      const acts = await commentService.getActivity(projectId);
      setActivity(acts);
    } catch (err: any) {
      setLastExecution({
        id: 'err-' + Date.now(),
        project_id: projectId,
        language: project?.language || 'python',
        status: 'failed',
        stdin_content: '',
        stdout: '',
        stderr: err.response?.data?.detail || err.message || "Failed to execute code.",
        exit_code: 1,
        duration_ms: 0,
        created_at: new Date().toISOString()
      });
    } finally {
      setIsRunning(false);
    }
  };

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      // Ctrl+Enter or Cmd+Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFileId, activeFileContent, stdinContent]);

  // Editor onMount setup: track cursor position & remote decorations
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Listen to cursor position
    editor.onDidChangeCursorPosition((e) => {
      sendCursor(e.position.lineNumber, e.position.column);
    });
  };

  // Render peer cursors in Monaco
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations = collaborators
      .filter(c => c.cursor && c.cursor.line)
      .map(c => ({
        range: new monaco.Range(c.cursor!.line, c.cursor!.ch, c.cursor!.line, c.cursor!.ch + 1),
        options: {
          className: 'remote-cursor',
          before: {
            content: ` ${c.username} `,
            inlineClassName: 'remote-cursor-label',
            backgroundColor: c.color
          }
        }
      }));

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [collaborators]);

  // File tree operations
  const handleCreateFile = async (parentId: string | null) => {
    const name = prompt("Enter new file name (e.g. script.py, index.html):");
    if (!name || !projectId) return;
    try {
      const newFile = await fileService.createFile(projectId, { name, parent_id: parentId });
      const tree = await fileService.getProjectFiles(projectId);
      setFileTree(tree);
      handleOpenFile({
        id: newFile.id,
        name: newFile.name,
        path: newFile.path,
        is_folder: false,
        language: newFile.language,
        size: newFile.size
      });
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create file");
    }
  };

  const handleCreateFolder = async (parentId: string | null) => {
    const name = prompt("Enter new folder name:");
    if (!name || !projectId) return;
    try {
      await fileService.createFolder(projectId, { name, parent_id: parentId });
      const tree = await fileService.getProjectFiles(projectId);
      setFileTree(tree);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create folder");
    }
  };

  const handleRenameItem = async (item: FileTreeItem, newName: string) => {
    try {
      await fileService.updateFile(item.id, { name: newName });
      if (projectId) {
        const tree = await fileService.getProjectFiles(projectId);
        setFileTree(tree);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to rename item");
    }
  };

  const handleDeleteItem = async (item: FileTreeItem) => {
    if (!confirm(`Delete ${item.name}? This action cannot be undone.`)) return;
    try {
      await fileService.deleteFile(item.id);
      if (projectId) {
        const tree = await fileService.getProjectFiles(projectId);
        setFileTree(tree);
      }
      handleCloseTab(item.id, { stopPropagation: () => {} } as any);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete item");
    }
  };

  const handleAddComment = async (content: string) => {
    if (!projectId) return;
    try {
      const c = await commentService.addComment(projectId, {
        file_id: activeFileId || undefined,
        content
      });
      setComments(prev => [...prev, c]);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to add comment");
    }
  };

  const handleDeleteComment = async (id: string) => {
    try {
      await commentService.deleteComment(id);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete comment");
    }
  };

  const activeTabFile = openTabs.find(t => t.id === activeFileId);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#090d16] text-[#f8fafc] overflow-hidden select-none">
      {/* Top Navigation */}
      <Navbar
        project={project}
        activeLanguage={activeTabFile?.language || project?.language}
        saveStatus={saveStatus}
        collaborators={collaborators}
        isRunning={isRunning}
        onRun={handleRunCode}
        onShare={() => setIsShareModalOpen(true)}
        onToggleTerminal={() => setIsTerminalOpen(!isTerminalOpen)}
        isTerminalOpen={isTerminalOpen}
        onToggleWebPreview={() => setIsWebPreviewOpen(true)}
        onOpenSettings={() => alert(`Project ID: ${project?.id}\nStorage: ${project?.storage_usage} bytes`)}
        onOpenVersions={() => setIsVersionsModalOpen(true)}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: File Tree */}
        <div className="w-60 bg-[#0b0f19] border-r border-[#1e293b] flex flex-col">
          {/* Explorer Header */}
          <div className="h-9 px-3 border-b border-[#1e293b] flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider bg-[#090d16]">
            <span>Explorer</span>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handleCreateFile(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="New File"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleCreateFolder(null)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="New Folder"
              >
                <FolderPlus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => projectId && loadProjectData(projectId)}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                title="Refresh Tree"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Files List */}
          <div className="flex-1 overflow-y-auto">
            <FileTree
              items={fileTree}
              activeFileId={activeFileId}
              unsavedFiles={unsavedFiles}
              onSelectFile={handleOpenFile}
              onCreateFile={handleCreateFile}
              onCreateFolder={handleCreateFolder}
              onRenameItem={handleRenameItem}
              onDeleteItem={handleDeleteItem}
            />
          </div>
        </div>

        {/* Center: Monaco Editor + Terminal */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#0f172a]">
          {/* Editor Tabs Bar */}
          <div className="h-9 bg-[#090d16] border-b border-[#1e293b] flex items-center overflow-x-auto select-none">
            {openTabs.map((tab) => {
              const isActive = tab.id === activeFileId;
              const isUnsaved = unsavedFiles.has(tab.id);
              return (
                <div
                  key={tab.id}
                  onClick={() => {
                    setActiveFileId(tab.id);
                    setActiveFileContent(tab.content);
                  }}
                  className={`h-full px-3.5 flex items-center space-x-2 text-xs border-r border-[#1e293b] cursor-pointer group transition-colors ${
                    isActive
                      ? 'bg-[#0f172a] text-blue-400 border-t-2 border-t-blue-500 font-medium'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#0b0f19]'
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{tab.name}</span>
                  {isUnsaved ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  ) : (
                    <button
                      onClick={(e) => handleCloseTab(tab.id, e)}
                      className="p-0.5 rounded-full hover:bg-slate-700 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Code Editor */}
          <div className="flex-1 relative overflow-hidden bg-[#090d16]">
            {activeTabFile ? (
              <Editor
                height="100%"
                language={activeTabFile.language || 'plaintext'}
                theme="vs-dark"
                value={activeFileContent}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                options={{
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
                  fontLigatures: true,
                  minimap: { enabled: true },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  bracketPairColorization: { enabled: true },
                  automaticLayout: true,
                  renderLineHighlight: 'all',
                  smoothScrolling: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on'
                }}
              />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                <FileCode className="w-12 h-12 text-slate-600" />
                <p className="text-xs">No file selected. Select a file from the explorer to begin editing.</p>
              </div>
            )}
          </div>

          {/* Bottom Terminal Panel */}
          {isTerminalOpen && (
            <TerminalPanel
              lastExecution={lastExecution}
              history={executionHistory}
              activity={activity}
              stdinContent={stdinContent}
              onStdinChange={setStdinContent}
              onRun={handleRunCode}
              isRunning={isRunning}
              onClose={() => setIsTerminalOpen(false)}
            />
          )}
        </div>

        {/* Right Sidebar: Collaborators & Comments */}
        <RightSidebar
          project={project}
          collaborators={collaborators}
          comments={comments}
          onAddComment={handleAddComment}
          onDeleteComment={handleDeleteComment}
        />
      </div>

      {/* Modals */}
      {project && (
        <ShareModal
          project={project}
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}

      {activeTabFile && (
        <VersionHistoryModal
          file={activeTabFile}
          isOpen={isVersionsModalOpen}
          onClose={() => setIsVersionsModalOpen(false)}
          onRestored={(newContent) => {
            setActiveFileContent(newContent);
            setOpenTabs(prev => prev.map(t => t.id === activeTabFile.id ? { ...t, content: newContent } : t));
          }}
        />
      )}

      <WebPreviewModal
        htmlContent={activeFileContent}
        isOpen={isWebPreviewOpen}
        onClose={() => setIsWebPreviewOpen(false)}
      />
    </div>
  );
};
