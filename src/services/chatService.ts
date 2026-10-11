import { apiClient } from './apiClient';
import { ChatConversation, ChatMessage } from '../types';

export interface SendMessageResponse {
  conversationId: string;
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export const chatService = {
  async getConversations(): Promise<ChatConversation[]> {
    return apiClient.get<ChatConversation[]>('/api/chat/conversations');
  },

  async createConversation(title?: string, episodeId?: string): Promise<ChatConversation> {
    return apiClient.post<ChatConversation>('/api/chat/conversations', { title, episodeId });
  },

  async renameConversation(id: string, title: string): Promise<ChatConversation> {
    return apiClient.patch<ChatConversation>(`/api/chat/conversations/${id}`, { title });
  },

  async deleteConversation(id: string): Promise<{ deletedId: string }> {
    return apiClient.delete(`/api/chat/conversations/${id}`);
  },

  async sendMessage(
    message: string,
    conversationId?: string,
    episodeId?: string
  ): Promise<SendMessageResponse> {
    return apiClient.post<SendMessageResponse>('/api/chat', {
      message,
      conversationId,
      episodeId,
    });
  },
};
