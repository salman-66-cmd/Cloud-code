import api from './api';
import { Project } from '../types';

export const projectService = {
  async listProjects(params?: { filter_by?: string; search?: string; language?: string }): Promise<Project[]> {
    const res = await api.get<Project[]>('/projects', { params });
    return res.data;
  },

  async getProject(id: string): Promise<Project> {
    const res = await api.get<Project>(`/projects/${id}`);
    return res.data;
  },

  async createProject(data: { name: string; description?: string; language: string; visibility?: string; template?: string }): Promise<Project> {
    const res = await api.post<Project>('/projects', data);
    return res.data;
  },

  async updateProject(id: string, data: { name?: string; description?: string; visibility?: string; status?: string }): Promise<Project> {
    const res = await api.patch<Project>(`/projects/${id}`, data);
    return res.data;
  },

  async deleteProject(id: string): Promise<void> {
    await api.delete(`/projects/${id}`);
  },

  async duplicateProject(id: string, new_name?: string): Promise<Project> {
    const res = await api.post<Project>(`/projects/${id}/duplicate`, null, { params: { new_name } });
    return res.data;
  }
};
