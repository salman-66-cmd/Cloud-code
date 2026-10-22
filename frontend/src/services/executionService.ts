import api from './api';
import { ExecutionJob } from '../types';

export const executionService = {
  async runCode(projectId: string, data: { file_id?: string; language?: string; code?: string; stdin_content?: string }): Promise<ExecutionJob> {
    const res = await api.post<ExecutionJob>(`/projects/${projectId}/executions`, data);
    return res.data;
  },

  async getExecutionHistory(projectId: string): Promise<ExecutionJob[]> {
    const res = await api.get<ExecutionJob[]>(`/projects/${projectId}/executions`);
    return res.data;
  },

  async getExecution(executionId: string): Promise<ExecutionJob> {
    const res = await api.get<ExecutionJob>(`/executions/${executionId}`);
    return res.data;
  },

  async cancelExecution(executionId: string): Promise<ExecutionJob> {
    const res = await api.post<ExecutionJob>(`/executions/${executionId}/cancel`);
    return res.data;
  }
};
