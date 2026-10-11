import { apiClient } from './apiClient';
import { UserPreferences, UserProfile } from '../types';

export interface DashboardStats {
  totalEpisodes: number;
  totalAssets: number;
  totalApproved: number;
  totalPending: number;
  totalRejected: number;
  hoursSaved: number;
  approvalRate: number;
}

export const settingsService = {
  async getProfile(): Promise<UserProfile> {
    return apiClient.get<UserProfile>('/api/profile');
  },

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return apiClient.patch<UserProfile>('/api/profile', updates);
  },

  async getPreferences(): Promise<UserPreferences> {
    return apiClient.get<UserPreferences>('/api/preferences');
  },

  async updatePreferences(updates: Partial<UserPreferences>): Promise<UserPreferences> {
    return apiClient.patch<UserPreferences>('/api/preferences', updates);
  },

  async getStats(): Promise<DashboardStats> {
    return apiClient.get<DashboardStats>('/api/stats');
  },
};
