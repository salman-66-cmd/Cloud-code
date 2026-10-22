import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FolderGit2, Lock, User, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { authService } from '../services/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameOrEmail || !password) return;
    setIsLoading(true);
    setError(null);

    try {
      await authService.login({
        username_or_email: usernameOrEmail.trim(),
        password
      });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || "Invalid login credentials. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsernameOrEmail(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col justify-center items-center px-4 relative overflow-hidden select-none">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header */}
      <div className="text-center mb-8 z-10">
        <div className="inline-flex items-center space-x-3 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-500/20">
            <FolderGit2 className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold tracking-tight text-white">
            Cloud<span className="text-blue-500">Code</span>
          </span>
        </div>
        <p className="text-sm text-slate-400 max-w-sm">
          Cloud-Based Collaborative Code Workspace & Isolated Execution Sandbox
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-[#0f172a]/90 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl p-7 z-10">
        <h2 className="text-lg font-bold text-white mb-1">Sign in to your account</h2>
        <p className="text-xs text-slate-400 mb-6">Enter your username or registered email address</p>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="developer or email@example.com"
                value={usernameOrEmail}
                onChange={(e) => setUsernameOrEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Demo Accounts Helper */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-semibold text-slate-300">Quick Fill Demo Accounts:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickFill('alice', 'Password123!')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-left transition"
            >
              <div className="font-semibold text-blue-400">Alice (Admin)</div>
              <div className="text-[10px] text-slate-400">Password123!</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('bob', 'Password123!')}
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700 text-left transition"
            >
              <div className="font-semibold text-indigo-400">Bob (Collaborator)</div>
              <div className="text-[10px] text-slate-400">Password123!</div>
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
};
