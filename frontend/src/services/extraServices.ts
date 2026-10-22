import api from './api';
import { ProjectMember, Invitation, FileVersion, Comment, NotificationItem, ActivityEvent } from '../types';

export const sharingService = {
  async invite(projectId: string, data: { invitee_email: string; role: string }): Promise<Invitation> {
    const res = await api.post<Invitation>(`/projects/${projectId}/invitations`, data);
    return res.data;
  },

  async getMembers(projectId: string): Promise<ProjectMember[]> {
    const res = await api.get<ProjectMember[]>(`/projects/${projectId}/members`);
    return res.data;
  },

  async updateMemberRole(projectId: string, memberId: string, role: string): Promise<ProjectMember> {
    const res = await api.patch<ProjectMember>(`/projects/${projectId}/members/${memberId}`, { role });
    return res.data;
  },

  async removeMember(projectId: string, memberId: string): Promise<void> {
    await api.delete(`/projects/${projectId}/members/${memberId}`);
  },

  async acceptInvite(token: string): Promise<{ message: string; projectId: string }> {
    const res = await api.post<{ message: string; projectId: string }>(`/invitations/${token}/accept`);
    return res.data;
  },

  async declineInvite(token: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/invitations/${token}/decline`);
    return res.data;
  },

  async getPendingInvites(): Promise<Invitation[]> {
    const res = await api.get<Invitation[]>('/invitations/pending');
    return res.data;
  }
};

export const versionService = {
  async getVersions(fileId: string): Promise<FileVersion[]> {
    const res = await api.get<FileVersion[]>(`/files/${fileId}/versions`);
    return res.data;
  },

  async createCheckpoint(fileId: string, commitMessage?: string): Promise<FileVersion> {
    const res = await api.post<FileVersion>(`/files/${fileId}/versions`, { commit_message: commitMessage });
    return res.data;
  },

  async restoreVersion(fileId: string, versionId: string): Promise<any> {
    const res = await api.post(`/files/${fileId}/versions/${versionId}/restore`);
    return res.data;
  }
};

export const commentService = {
  async getComments(projectId: string): Promise<Comment[]> {
    const res = await api.get<Comment[]>(`/projects/${projectId}/comments`);
    return res.data;
  },

  async addComment(projectId: string, data: { file_id?: string; parent_id?: string; content: string }): Promise<Comment> {
    const res = await api.post<Comment>(`/projects/${projectId}/comments`, data);
    return res.data;
  },

  async deleteComment(commentId: string): Promise<void> {
    await api.delete(`/comments/${commentId}`);
  },

  async getActivity(projectId: string): Promise<ActivityEvent[]> {
    const res = await api.get<ActivityEvent[]>(`/projects/${projectId}/activity`);
    return res.data;
  }
};

export const notificationService = {
  async getNotifications(): Promise<NotificationItem[]> {
    const res = await api.get<NotificationItem[]>('/notifications');
    return res.data;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await api.patch<NotificationItem>(`/notifications/${id}`);
    return res.data;
  },

  async markAllAsRead(): Promise<void> {
    await api.post('/notifications/read-all');
  }
};
