import api from './api';
import { User, AuthResponse } from '../types';

export const authService = {
  async register(data: { email: string; username: string; password: string; full_name?: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/register', data);
    localStorage.setItem('cloudcode_token', res.data.access_token);
    localStorage.setItem('cloudcode_user', JSON.stringify(res.data.user));
    return res.data;
  },

  async login(data: { username_or_email: string; password: string }): Promise<AuthResponse> {
    const res = await api.post<AuthResponse>('/auth/login', data);
    localStorage.setItem('cloudcode_token', res.data.access_token);
    localStorage.setItem('cloudcode_user', JSON.stringify(res.data.user));
    return res.data;
  },

  async getMe(): Promise<User> {
    const res = await api.get<User>('/auth/me');
    localStorage.setItem('cloudcode_user', JSON.stringify(res.data));
    return res.data;
  },

  async updateMe(data: { full_name?: string; avatar_url?: string; password?: string }): Promise<User> {
    const res = await api.patch<User>('/auth/me', data);
    localStorage.setItem('cloudcode_user', JSON.stringify(res.data));
    return res.data;
  },

  logout(): void {
    localStorage.removeItem('cloudcode_token');
    localStorage.removeItem('cloudcode_user');
  },

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('cloudcode_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  },

  getToken(): string | null {
    return localStorage.getItem('cloudcode_token');
  }
};
