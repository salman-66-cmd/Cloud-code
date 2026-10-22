import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FolderGit2, Plus, Search, Filter, HardDrive, Users, 
  Code2, Clock, MoreVertical, Copy, Archive, Trash2, 
  ExternalLink, Sparkles, Terminal, Bell, Globe, Lock
} from 'lucide-react';
import { projectService } from '../services/projectService';
import { authService } from '../services/authService';
import { Project } from '../types';
import { NewProjectModal } from '../components/NewProjectModal';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = authService.getCurrentUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'owned' | 'shared' | 'archived'>('all');
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    loadProjects();
  }, [filterTab, selectedLanguage]);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const data = await projectService.listProjects({
        filter_by: filterTab === 'all' ? undefined : filterTab,
        language: selectedLanguage || undefined
      });
      setProjects(data);
    } catch (err) {
      console.error("Failed to load projects", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDuplicate = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const duplicated = await projectService.duplicateProject(project.id);
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to duplicate project");
    }
  };

  const handleArchive = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    try {
      const newStatus = project.status === 'active' ? 'archived' : 'active';
      await projectService.updateProject(project.id, { status: newStatus });
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update project status");
    }
  };

  const handleDelete = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenId(null);
    if (!confirm(`Are you sure you want to permanently delete "${project.name}"?`)) return;
    try {
      await projectService.deleteProject(project.id);
      loadProjects();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to delete project");
    }
  };

  // Metrics
  const totalProjects = projects.length;
  const ownedCount = projects.filter(p => p.owner_id === currentUser?.id).length;
  const sharedCount = projects.filter(p => p.owner_id !== currentUser?.id).length;
  const totalStorage = projects.reduce((acc, p) => acc + (p.storage_usage || 0), 0);

  const filteredProjects = projects.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#090d16] text-[#f8fafc] flex flex-col select-none">
      {/* Top Bar */}
      <header className="h-16 border-b border-[#1e293b] bg-[#0b0f19] px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <FolderGit2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">
              Cloud<span className="text-blue-500">Code</span> Workspace
            </h1>
            <p className="text-[11px] text-slate-400">Cloud Computing Collaborative Platform</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>

          <div className="pl-3 border-l border-slate-800 flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-xs text-white">
              {currentUser?.username.slice(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold text-slate-200">{currentUser?.full_name || currentUser?.username}</p>
              <p className="text-[10px] text-slate-400 capitalize">{currentUser?.role}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <FolderGit2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Total Workspaces</p>
              <h3 className="text-xl font-bold text-white">{totalProjects}</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Shared With Me</p>
              <h3 className="text-xl font-bold text-white">{sharedCount}</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Execution Workers</p>
              <h3 className="text-xl font-bold text-white">Active</h3>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-sm flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-400">Cloud Storage</p>
              <h3 className="text-xl font-bold text-white">{(totalStorage / 1024).toFixed(1)} KB</h3>
            </div>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div className="flex items-center space-x-1 bg-[#0f172a] p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            {(['all', 'owned', 'shared', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                  filterTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab === 'all' ? 'All Projects' : tab === 'owned' ? 'Owned by Me' : tab === 'shared' ? 'Shared with Me' : 'Archived'}
              </button>
            ))}
          </div>

          {/* Search & Language Dropdown */}
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#0f172a] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-[#0f172a] border border-slate-800 text-slate-300 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-blue-500"
            >
              <option value="">All Languages</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="html">HTML</option>
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
          </div>
        </div>

        {/* Project Grid */}
        {isLoading ? (
          <div className="text-center py-20 text-slate-500 text-sm">
            Loading cloud projects...
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[#0f172a]/60 border border-slate-800/80 space-y-3">
            <FolderGit2 className="w-12 h-12 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-slate-300">No projects found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Create a new workspace or launch one of our starter templates to start coding collaboratively.
            </p>
            <button
              onClick={() => setIsNewProjectModalOpen(true)}
              className="mt-2 inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.map((proj) => (
              <div
                key={proj.id}
                onClick={() => navigate(`/workspace/${proj.id}`)}
                className="group p-5 rounded-2xl bg-[#0f172a] border border-slate-800 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-950/20 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center font-bold text-xs uppercase text-blue-400 group-hover:scale-105 transition-transform">
                        {proj.language.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm text-slate-100 group-hover:text-blue-400 transition-colors">
                          {proj.name}
                        </h3>
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="capitalize">{proj.language}</span>
                          <span>•</span>
                          <span className="flex items-center space-x-1">
                            {proj.visibility === 'public' ? (
                              <Globe className="w-3 h-3 text-cyan-400" />
                            ) : (
                              <Lock className="w-3 h-3 text-slate-500" />
                            )}
                            <span className="capitalize">{proj.visibility}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setMenuOpenId(menuOpenId === proj.id ? null : proj.id)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {menuOpenId === proj.id && (
                        <div className="absolute right-0 top-6 w-36 bg-[#090d16] border border-slate-700 rounded-xl shadow-xl py-1 z-40 text-xs">
                          <button
                            onClick={(e) => handleDuplicate(proj, e)}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center space-x-2"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>Duplicate</span>
                          </button>
                          <button
                            onClick={(e) => handleArchive(proj, e)}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-800 text-slate-300 flex items-center space-x-2"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>{proj.status === 'active' ? 'Archive' : 'Unarchive'}</span>
                          </button>
                          {proj.owner_id === currentUser?.id && (
                            <button
                              onClick={(e) => handleDelete(proj, e)}
                              className="w-full text-left px-3 py-1.5 hover:bg-rose-950/40 text-rose-400 flex items-center space-x-2"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {proj.description && (
                    <p className="text-xs text-slate-400 mt-3 line-clamp-2 leading-relaxed">
                      {proj.description}
                    </p>
                  )}
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{new Date(proj.updated_at).toLocaleDateString()}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">{(proj.storage_usage / 1024).toFixed(1)} KB</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 uppercase">
                      {proj.my_role || 'Owner'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        onProjectCreated={(p) => {
          navigate(`/workspace/${p.id}`);
        }}
      />
    </div>
  );
};
