import React, { useState } from 'react';
import { Users, MessageSquare, Info, Send, Trash2, Shield, HardDrive, CheckCircle } from 'lucide-react';
import { Collaborator, Comment, Project } from '../types';
import { authService } from '../services/authService';

interface RightSidebarProps {
  project: Project | null;
  collaborators: Collaborator[];
  comments: Comment[];
  onAddComment: (content: string) => void;
  onDeleteComment: (id: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  project,
  collaborators,
  comments,
  onAddComment,
  onDeleteComment
}) => {
  const [activeTab, setActiveTab] = useState<'collab' | 'comments' | 'info'>('collab');
  const [commentInput, setCommentInput] = useState('');
  const currentUser = authService.getCurrentUser();

  const handleSendComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim()) return;
    onAddComment(commentInput.trim());
    setCommentInput('');
  };

  return (
    <div className="w-72 bg-[#0b0f19] border-l border-[#1e293b] flex flex-col h-full select-none z-20">
      {/* Tab Header */}
      <div className="h-10 border-b border-[#1e293b] flex items-center justify-around px-2 bg-[#090d16]">
        <button
          onClick={() => setActiveTab('collab')}
          className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs font-medium transition ${
            activeTab === 'collab'
              ? 'text-blue-400 bg-slate-850 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Active Collaborators"
        >
          <Users className="w-3.5 h-3.5" />
          <span>Peers ({collaborators.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('comments')}
          className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs font-medium transition ${
            activeTab === 'comments'
              ? 'text-blue-400 bg-slate-850 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Project Discussion"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Comments ({comments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('info')}
          className={`flex items-center space-x-1.5 py-1 px-2.5 rounded text-xs font-medium transition ${
            activeTab === 'info'
              ? 'text-blue-400 bg-slate-850 border border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
          title="Project Info & Metrics"
        >
          <Info className="w-3.5 h-3.5" />
          <span>Details</span>
        </button>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Collaborators Tab */}
        {activeTab === 'collab' && (
          <div className="space-y-3">
            <div className="text-[11px] font-semibold uppercase text-slate-500 tracking-wider">
              Connected in Session
            </div>

            {collaborators.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
                You are currently the only active editor. Invite collaborators via the Share button.
              </div>
            ) : (
              <div className="space-y-2">
                {collaborators.map((c) => (
                  <div 
                    key={c.userId}
                    className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white relative flex-shrink-0"
                        style={{ backgroundColor: c.color }}
                      >
                        {c.username.slice(0, 2).toUpperCase()}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#0f172a]"></span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{c.username}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {c.cursor ? `Line ${c.cursor.line}, Col ${c.cursor.ch}` : 'Viewing'}
                        </p>
                      </div>
                    </div>
                    <span 
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: c.color }}
                      title="Cursor Highlight Color"
                    ></span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Comments Tab */}
        {activeTab === 'comments' && (
          <div className="h-full flex flex-col">
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1">
              {comments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-500">
                  No comments yet. Start a discussion with your team below.
                </div>
              ) : (
                comments.map((cm) => (
                  <div key={cm.id} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-blue-400">{cm.user?.username || 'User'}</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-slate-500">
                          {new Date(cm.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {(cm.user_id === currentUser?.id || project?.my_role === 'owner') && (
                          <button
                            onClick={() => onDeleteComment(cm.id)}
                            className="text-slate-500 hover:text-rose-400"
                            title="Delete comment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs break-words">{cm.content}</p>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input */}
            <form onSubmit={handleSendComment} className="pt-2 mt-auto border-t border-slate-800">
              <div className="flex items-center space-x-1.5">
                <input
                  type="text"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder="Leave a comment..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={!commentInput.trim()}
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-lg transition"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Project Details Tab */}
        {activeTab === 'info' && project && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                <span>Access & Role</span>
              </h4>
              <div className="flex justify-between text-slate-400">
                <span>My Permission:</span>
                <span className="uppercase font-bold text-blue-400">{project.my_role || 'Owner'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Visibility:</span>
                <span className="capitalize text-slate-300">{project.visibility}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="font-semibold text-slate-200 flex items-center space-x-1.5">
                <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                <span>Cloud Storage</span>
              </h4>
              <div className="flex justify-between text-slate-400">
                <span>Current Usage:</span>
                <span className="text-slate-300">{(project.storage_usage / 1024).toFixed(1)} KB</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-blue-500 h-full rounded-full" 
                  style={{ width: `${Math.min(100, Math.max(5, (project.storage_usage / (10 * 1024 * 1024)) * 100))}%` }}
                ></div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2 text-slate-400">
              <h4 className="font-semibold text-slate-200">Execution Runtime</h4>
              <div className="flex items-center space-x-2 text-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Isolated Sandbox Worker Active</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Subprocess & container execution with 15s timeout, memory caps, and non-privileged boundary.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
