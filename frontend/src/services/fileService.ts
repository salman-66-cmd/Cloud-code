import api from './api';
import { FileTreeItem, ProjectFile } from '../types';

export const fileService = {
  async getProjectFiles(projectId: string): Promise<FileTreeItem[]> {
    const res = await api.get<FileTreeItem[]>(`/projects/${projectId}/files`);
    return res.data;
  },

  async getFile(fileId: string): Promise<ProjectFile> {
    const res = await api.get<ProjectFile>(`/files/${fileId}`);
    return res.data;
  },

  async createFile(projectId: string, data: { name: string; parent_id?: string | null; content?: string; language?: string }): Promise<ProjectFile> {
    const res = await api.post<ProjectFile>(`/projects/${projectId}/files`, data);
    return res.data;
  },

  async createFolder(projectId: string, data: { name: string; parent_id?: string | null }): Promise<ProjectFile> {
    const res = await api.post<ProjectFile>(`/projects/${projectId}/folders`, data);
    return res.data;
  },

  async updateFile(fileId: string, data: { name?: string; content?: string; language?: string }, createSnapshot = false, commitMessage = 'Saved via editor'): Promise<ProjectFile> {
    const res = await api.patch<ProjectFile>(`/files/${fileId}`, data, {
      params: { create_snapshot: createSnapshot, commit_message: commitMessage }
    });
    return res.data;
  },

  async deleteFile(fileId: string): Promise<void> {
    await api.delete(`/files/${fileId}`);
  },

  async moveFile(fileId: string, targetParentId?: string | null): Promise<ProjectFile> {
    const res = await api.post<ProjectFile>(`/files/${fileId}/move`, { target_parent_id: targetParentId });
    return res.data;
  }
};
