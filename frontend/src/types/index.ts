export interface User {
  id: string;
  email: string;
  username: string;
  full_name?: string;
  role: 'admin' | 'user';
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  language: string;
  visibility: 'private' | 'public' | 'shared';
  status: 'active' | 'archived';
  storage_usage: number;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  owner?: User;
  member_count?: number;
  my_role?: 'owner' | 'editor' | 'runner' | 'viewer';
}

export interface FileTreeItem {
  id: string;
  name: string;
  path: string;
  is_folder: boolean;
  language: string;
  size: number;
  parent_id?: string | null;
  children?: FileTreeItem[];
}

export interface ProjectFile {
  id: string;
  project_id: string;
  parent_id?: string | null;
  name: string;
  path: string;
  is_folder: boolean;
  content: string;
  language: string;
  size: number;
  created_at: string;
  updated_at: string;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version_num: number;
  content: string;
  commit_message: string;
  created_by_id?: string;
  created_at: string;
}

export interface ExecutionJob {
  id: string;
  project_id: string;
  file_id?: string;
  user_id?: string;
  language: string;
  status: 'queued' | 'preparing' | 'running' | 'completed' | 'failed' | 'timed_out' | 'cancelled';
  stdin_content: string;
  stdout: string;
  stderr: string;
  exit_code?: number | null;
  duration_ms: number;
  created_at: string;
  completed_at?: string;
}

export interface Collaborator {
  userId: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  color: string;
  cursor?: {
    line: number;
    ch: number;
    selection?: any;
  };
  lastActive: string;
}

export interface Comment {
  id: string;
  project_id: string;
  file_id?: string;
  user_id: string;
  parent_id?: string;
  content: string;
  created_at: string;
  updated_at: string;
  user?: User;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface ActivityEvent {
  id: string;
  project_id: string;
  user_id?: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface ProjectMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user?: User;
}

export interface Invitation {
  id: string;
  project_id: string;
  inviter_id: string;
  invitee_email: string;
  role: string;
  token: string;
  status: string;
  created_at: string;
  expires_at?: string;
}
