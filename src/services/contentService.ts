import { apiClient } from './apiClient';
import { ContentAsset, AssetStatus } from '../types';

export const contentService = {
  async createAsset(data: {
    episodeId: string;
    platform: string;
    title: string;
    content: string;
    momentId?: string;
  }): Promise<ContentAsset> {
    return apiClient.post<ContentAsset>('/api/content', data);
  },

  async updateContent(id: string, content: string, title?: string): Promise<ContentAsset> {
    return apiClient.patch<ContentAsset>(`/api/content/${id}`, { content, title });
  },

  async updateStatus(id: string, status: AssetStatus): Promise<ContentAsset> {
    return apiClient.patch<ContentAsset>(`/api/content/${id}/status`, { status });
  },

  async regenerate(
    id: string,
    toneModifier: 'standard' | 'concise' | 'punchy' = 'standard'
  ): Promise<ContentAsset> {
    return apiClient.post<ContentAsset>(`/api/content/${id}/regenerate`, { toneModifier });
  },

  async deleteAsset(id: string): Promise<{ deletedId: string }> {
    return apiClient.delete(`/api/content/${id}`);
  },
};
