import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FolderGit2, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { sharingService } from '../services/extraServices';

export const InviteAcceptPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [projectId, setProjectId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (token) {
      handleAccept();
    }
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    try {
      const res = await sharingService.acceptInvite(token);
      setProjectId(res.projectId);
      setStatus('success');
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.response?.data?.detail || "Invalid, already processed, or expired invitation.");
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#0f172a] border border-slate-700/80 rounded-2xl p-7 text-center space-y-4 shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto">
          <FolderGit2 className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-lg font-bold text-white">Project Collaboration Invitation</h2>

        {status === 'loading' && (
          <p className="text-xs text-slate-400">Verifying and accepting invitation token...</p>
        )}

        {status === 'success' && (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>You have successfully joined the project collaboration session!</span>
            </div>
            <button
              onClick={() => navigate(projectId ? `/workspace/${projectId}` : '/dashboard')}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
            >
              <span>Open Project Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-4">
            <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl flex items-center space-x-2 text-xs text-rose-300">
              <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
