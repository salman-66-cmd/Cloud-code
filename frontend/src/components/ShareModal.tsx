import React, { useState, useEffect } from 'react';
import { X, UserPlus, Copy, Check, Shield, Trash2, Mail } from 'lucide-react';
import { Project, ProjectMember, Invitation } from '../types';
import { sharingService } from '../services/extraServices';

interface ShareModalProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ project, isOpen, onClose }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadMembers();
    }
  }, [isOpen, project.id]);

  const loadMembers = async () => {
    try {
      const data = await sharingService.getMembers(project.id);
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      const inv = await sharingService.invite(project.id, { invitee_email: email.trim(), role });
      const inviteUrl = `${window.location.origin}/invite/${inv.token}`;
      setLastInviteLink(inviteUrl);
      setEmail('');
      loadMembers();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to send invitation.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await sharingService.updateMemberRole(project.id, memberId, newRole);
      loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update role");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this member?")) return;
    try {
      await sharingService.removeMember(project.id, memberId);
      loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to remove member");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <UserPlus className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Share "{project.name}"</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Invite Form */}
          <form onSubmit={handleInvite} className="space-y-3">
            <label className="block text-xs font-medium text-slate-300">Invite Collaborator</label>
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="collaborator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-300 rounded-lg px-2.5 py-2 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="editor">Editor</option>
                <option value="runner">Runner</option>
                <option value="viewer">Viewer</option>
              </select>

              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:bg-slate-700"
              >
                {isLoading ? "Inviting..." : "Invite"}
              </button>
            </div>
            {error && <p className="text-rose-400 text-xs">{error}</p>}
          </form>

          {/* Generated Shareable Link */}
          {lastInviteLink && (
            <div className="p-3 bg-blue-950/30 border border-blue-900/50 rounded-xl space-y-1.5">
              <span className="text-[11px] font-semibold text-blue-300">Shareable Invitation Link Created:</span>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  readOnly
                  value={lastInviteLink}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-300 select-all"
                />
                <button
                  onClick={() => copyToClipboard(lastInviteLink)}
                  className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded"
                >
                  {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-400">Project Members ({members.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {members.map((m) => (
                <div key={m.id} className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center font-bold text-xs text-slate-200">
                      {m.user?.username.slice(0, 2).toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-200 truncate">{m.user?.username}</p>
                      <p className="text-[10px] text-slate-400 truncate">{m.user?.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {m.role === 'owner' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Owner
                      </span>
                    ) : (
                      <>
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.id, e.target.value)}
                          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none"
                        >
                          <option value="editor">Editor</option>
                          <option value="runner">Runner</option>
                          <option value="viewer">Viewer</option>
                        </select>
                        <button
                          onClick={() => handleRemoveMember(m.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                          title="Remove member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#090d16] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
