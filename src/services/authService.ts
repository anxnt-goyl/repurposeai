import { apiClient, setAuthToken } from './apiClient';
import { UserProfile } from '../types';

export interface AuthResponse {
  token: string;
  user: UserProfile;
}

export const authService = {
  async signup(name: string, email: string, password?: string): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>('/api/auth/signup', {
      name,
      email,
      password: (password && password.trim()) || 'password123',
    });
    setAuthToken(data.token);
    return data;
  },

  async login(email: string, password?: string): Promise<AuthResponse> {
    const data = await apiClient.post<AuthResponse>('/api/auth/login', {
      email,
      password: (password && password.trim()) || 'password123',
    });
    setAuthToken(data.token);
    return data;
  },

  async getCurrentUser(): Promise<UserProfile> {
    const data = await apiClient.get<{ user: UserProfile }>('/api/auth/me');
    return data.user;
  },

  logout(): void {
    setAuthToken(null);
  },
};
