import { apiClient } from './apiClient';
import { Episode, Moment, TranscriptSegment, ContentAsset } from '../types';

export interface CreateEpisodeInput {
  title?: string;
  sourceType: 'video' | 'audio' | 'youtube';
  youtubeUrl?: string;
  mediaFile?: File;
  customTranscript?: string;
  customSpeakers?: string;
  duration?: string;
}

export const episodeService = {
  async getEpisodes(): Promise<Episode[]> {
    return apiClient.get<Episode[]>('/api/episodes');
  },

  async getEpisodeById(id: string): Promise<Episode> {
    return apiClient.get<Episode>(`/api/episodes/${id}`);
  },

  async createEpisode(input: CreateEpisodeInput): Promise<Episode> {
    if (input.mediaFile) {
      const formData = new FormData();
      formData.append('mediaFile', input.mediaFile);
      if (input.title) formData.append('title', input.title);
      formData.append('sourceType', input.sourceType);
      if (input.youtubeUrl) formData.append('youtubeUrl', input.youtubeUrl);
      if (input.customTranscript) formData.append('customTranscript', input.customTranscript);
      if (input.customSpeakers) formData.append('customSpeakers', input.customSpeakers);
      if (input.duration) formData.append('duration', input.duration);

      return apiClient.post<Episode>('/api/episodes', formData);
    }

    return apiClient.post<Episode>('/api/episodes', {
      title: input.title,
      sourceType: input.sourceType,
      youtubeUrl: input.youtubeUrl,
      customTranscript: input.customTranscript,
      customSpeakers: input.customSpeakers,
      duration: input.duration,
    });
  },

  async deleteEpisode(id: string): Promise<{ deletedId: string }> {
    return apiClient.delete(`/api/episodes/${id}`);
  },

  async getMoments(episodeId: string): Promise<Moment[]> {
    return apiClient.get<Moment[]>(`/api/episodes/${episodeId}/moments`);
  },

  async getTranscript(episodeId: string): Promise<TranscriptSegment[]> {
    return apiClient.get<TranscriptSegment[]>(`/api/episodes/${episodeId}/transcript`);
  },

  async getAssets(episodeId: string): Promise<ContentAsset[]> {
    return apiClient.get<ContentAsset[]>(`/api/episodes/${episodeId}/assets`);
  },

  async updateEpisodeTitle(id: string, title: string): Promise<Episode> {
    return apiClient.patch<Episode>(`/api/episodes/${id}`, { title });
  },

  async exportPdf(
    id: string,
    category: string = 'all',
    options?: { approvedOnly?: boolean; includeTranscript?: boolean }
  ): Promise<Blob> {
    const token = localStorage.getItem('repurposeai_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const params = new URLSearchParams({ category });
    if (options?.approvedOnly) params.append('approvedOnly', 'true');
    if (options?.includeTranscript === false) params.append('includeTranscript', 'false');

    const res = await fetch(`${baseUrl}/api/episodes/${id}/export/pdf?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Failed to generate PDF (HTTP ${res.status})`);
    }
    return res.blob();
  },

  async exportZip(
    id: string,
    category: string = 'all',
    options?: { approvedOnly?: boolean; includeTranscript?: boolean }
  ): Promise<Blob> {
    const token = localStorage.getItem('repurposeai_token');
    const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
    const params = new URLSearchParams({ category });
    if (options?.approvedOnly) params.append('approvedOnly', 'true');
    if (options?.includeTranscript === false) params.append('includeTranscript', 'false');

    const res = await fetch(`${baseUrl}/api/episodes/${id}/export/zip?${params.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(errJson?.error?.message || `Failed to generate ZIP (HTTP ${res.status})`);
    }
    return res.blob();
  },

  async seedSampleEpisode(): Promise<{ message: string; episodeId: string }> {
    return apiClient.post('/api/seed');
  },

  async clearUserData(): Promise<{ message: string }> {
    return apiClient.post('/api/seed/clear');
  },
};
