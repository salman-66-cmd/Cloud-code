import React, { useState } from 'react';
import { X, FolderPlus, Globe, Lock, Code2 } from 'lucide-react';
import { projectService } from '../services/projectService';
import { Project } from '../types';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

const TEMPLATES = [
  { id: 'python', name: 'Python Starter', lang: 'python', desc: 'Fast numerical primes & CLI worker runner' },
  { id: 'javascript', name: 'Node.js Starter', lang: 'javascript', desc: 'Node.js backend script with OS metrics' },
  { id: 'typescript', name: 'TypeScript Starter', lang: 'typescript', desc: 'Typed interfaces & distributed cluster model' },
  { id: 'html', name: 'HTML / CSS / JS', lang: 'html', desc: 'Interactive webpage ready for sandbox live preview' },
  { id: 'c', name: 'C Language Starter', lang: 'c', desc: 'Compiled C program execution with stdio' },
  { id: 'cpp', name: 'C++ Starter', lang: 'cpp', desc: 'Modern C++ with STL vectors and algorithms' },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onProjectCreated
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('python');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsLoading(true);
    setError(null);

    const templateObj = TEMPLATES.find(t => t.id === selectedTemplate) || TEMPLATES[0];

    try {
      const project = await projectService.createProject({
        name: name.trim(),
        description: description.trim(),
        language: templateObj.lang,
        template: templateObj.id,
        visibility
      });
      onProjectCreated(project);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || "Failed to create project");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#0f172a] border border-slate-700 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FolderPlus className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-slate-100 text-sm">Create New Cloud Workspace</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Project Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. distributed-task-runner"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
            <input
              type="text"
              placeholder="Brief summary of your project purpose"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Starter Template */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-2">Select Template & Language</label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((tmpl) => (
                <div
                  key={tmpl.id}
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition text-xs ${
                    selectedTemplate === tmpl.id
                      ? 'bg-blue-600/15 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2 font-semibold">
                    <Code2 className="w-4 h-4 text-blue-400" />
                    <span>{tmpl.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{tmpl.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Visibility</label>
            <div className="flex space-x-3">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  className="text-blue-500 focus:ring-0"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Private (Only you & invited peers)</span>
              </label>

              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="radio"
                  name="visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  className="text-blue-500 focus:ring-0"
                />
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <span>Public (Discoverable by everyone)</span>
              </label>
            </div>
          </div>

          {error && <p className="text-rose-400 text-xs">{error}</p>}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:bg-slate-700"
            >
              {isLoading ? 'Creating Workspace...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
