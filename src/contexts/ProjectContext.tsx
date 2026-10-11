import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Episode,
  ContentAsset,
  AssetStatus,
  ChatConversation,
  UserPreferences,
} from '../types';
import { episodeService } from '../services/episodeService';
import { contentService } from '../services/contentService';
import { chatService } from '../services/chatService';
import { settingsService } from '../services/settingsService';
import { useAuth } from './AuthContext';

interface ProjectContextType {
  episodes: Episode[];
  currentEpisode: Episode | null;
  isLoadingEpisodes: boolean;
  setCurrentEpisodeById: (id: string) => void;
  refreshEpisodes: () => Promise<void>;
  updateAssetStatus: (assetId: string, status: AssetStatus) => Promise<void>;
  updateAssetContent: (assetId: string, content: string) => Promise<void>;
  regenerateAsset: (
    assetId: string,
    toneModifier?: 'standard' | 'concise' | 'punchy'
  ) => Promise<void>;
  addNewEpisode: (newEp: Episode) => void;
  deleteEpisode: (id: string) => Promise<void>;
  addAsset: (asset: ContentAsset) => Promise<void>;
  deleteAsset: (assetId: string) => Promise<void>;
  seedSampleProject: () => Promise<void>;

  // Chat History & Conversations
  chatConversations: ChatConversation[];
  activeConversation: ChatConversation | undefined;
  activeConversationId: string;
  isLoadingChats: boolean;
  setActiveConversationId: (id: string) => void;
  createConversation: (title?: string) => Promise<string>;
  renameConversation: (id: string, newTitle: string) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  sendChatMessage: (text: string) => Promise<void>;

  // User Preferences
  preferences: UserPreferences;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
}

const defaultPreferences: UserPreferences = {
  tone: 'conversational',
  contentLength: 'medium',
  creativity: 65,
  notifications: {
    processingComplete: true,
    contentGenerationComplete: true,
    exportComplete: true,
  },
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { isAuthenticated, user } = useAuth();

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeId, setCurrentEpisodeId] = useState<string>('');
  const [isLoadingEpisodes, setIsLoadingEpisodes] = useState<boolean>(true);

  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [isLoadingChats, setIsLoadingChats] = useState<boolean>(true);

  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load episodes from Backend API
  const refreshEpisodes = useCallback(async () => {
    if (!isAuthenticated) {
      setEpisodes([]);
      setCurrentEpisodeId('');
      setIsLoadingEpisodes(false);
      return;
    }

    try {
      setIsLoadingEpisodes(true);
      const data = await episodeService.getEpisodes();
      setEpisodes(data);
      if (data.length > 0) {
        // If current episode is not valid or empty, point to first
        setCurrentEpisodeId((prev) => (data.some((e) => e.id === prev) ? prev : data[0].id));
      } else {
        setCurrentEpisodeId('');
      }
    } catch (err) {
      console.error('[PROJECT] Failed to fetch episodes:', err);
    } finally {
      setIsLoadingEpisodes(false);
    }
  }, [isAuthenticated]);

  // Load chat conversations from Backend API
  const refreshChats = useCallback(async () => {
    if (!isAuthenticated) {
      setChatConversations([]);
      setActiveConversationId('');
      setIsLoadingChats(false);
      return;
    }

    try {
      setIsLoadingChats(true);
      const data = await chatService.getConversations();
      setChatConversations(data);
      if (data.length > 0) {
        setActiveConversationId((prev) => (data.some((c) => c.id === prev) ? prev : data[0].id));
      } else {
        setActiveConversationId('');
      }
    } catch (err) {
      console.error('[PROJECT] Failed to fetch chat conversations:', err);
    } finally {
      setIsLoadingChats(false);
    }
  }, [isAuthenticated]);

  // Load user preferences from Backend API
  const refreshPreferences = useCallback(async () => {
    if (!isAuthenticated) {
      setPreferences(defaultPreferences);
      return;
    }

    try {
      const data = await settingsService.getPreferences();
      if (data) {
        setPreferences(data);
      }
    } catch (err) {
      console.error('[PROJECT] Failed to fetch preferences:', err);
    }
  }, [isAuthenticated]);

  // Trigger loads when user state changes
  useEffect(() => {
    if (isAuthenticated) {
      refreshEpisodes();
      refreshChats();
      refreshPreferences();
    } else {
      setEpisodes([]);
      setChatConversations([]);
      setCurrentEpisodeId('');
      setActiveConversationId('');
      setIsLoadingEpisodes(false);
      setIsLoadingChats(false);
    }
  }, [isAuthenticated, user?.email, refreshEpisodes, refreshChats, refreshPreferences]);

  const currentEpisode = episodes.find((e) => e.id === currentEpisodeId) || (episodes.length > 0 ? episodes[0] : null);

  const setCurrentEpisodeById = (id: string) => {
    setCurrentEpisodeId(id);
  };

  const addNewEpisode = (newEp: Episode) => {
    setEpisodes((prev) => [newEp, ...prev]);
    setCurrentEpisodeId(newEp.id);
  };

  const deleteEpisode = async (id: string) => {
    try {
      await episodeService.deleteEpisode(id);
      setEpisodes((prev) => {
        const filtered = prev.filter((e) => e.id !== id);
        if (currentEpisodeId === id) {
          setCurrentEpisodeId(filtered[0]?.id || '');
        }
        return filtered;
      });
    } catch (err) {
      console.error('[PROJECT] Delete episode error:', err);
      throw err;
    }
  };

  const seedSampleProject = async () => {
    try {
      const res = await episodeService.seedSampleEpisode();
      await refreshEpisodes();
      if (res.episodeId) {
        setCurrentEpisodeId(res.episodeId);
      }
    } catch (err) {
      console.error('[PROJECT] Seed error:', err);
      throw err;
    }
  };

  const updateAssetStatus = async (assetId: string, status: AssetStatus) => {
    try {
      const updated = await contentService.updateStatus(assetId, status);
      setEpisodes((prev) =>
        prev.map((ep) => {
          if (!ep.assets.some((a) => a.id === assetId)) return ep;
          return {
            ...ep,
            assets: ep.assets.map((a) => (a.id === assetId ? { ...a, status: updated.status } : a)),
          };
        })
      );
    } catch (err) {
      console.error('[PROJECT] Update asset status error:', err);
      throw err;
    }
  };

  const updateAssetContent = async (assetId: string, content: string) => {
    try {
      const updated = await contentService.updateContent(assetId, content);
      setEpisodes((prev) =>
        prev.map((ep) => {
          if (!ep.assets.some((a) => a.id === assetId)) return ep;
          return {
            ...ep,
            assets: ep.assets.map((a) =>
              a.id === assetId
                ? {
                    ...a,
                    content: updated.content,
                    wordCount: updated.wordCount,
                    readingTimeMinutes: updated.readingTimeMinutes,
                    lastEdited: 'Just now',
                  }
                : a
            ),
          };
        })
      );
    } catch (err) {
      console.error('[PROJECT] Update asset content error:', err);
      throw err;
    }
  };

  const regenerateAsset = async (
    assetId: string,
    toneModifier: 'standard' | 'concise' | 'punchy' = 'standard'
  ) => {
    try {
      const regenerated = await contentService.regenerate(assetId, toneModifier);
      setEpisodes((prev) =>
        prev.map((ep) => {
          if (!ep.assets.some((a) => a.id === assetId)) return ep;
          return {
            ...ep,
            assets: ep.assets.map((a) =>
              a.id === assetId
                ? {
                    ...a,
                    title: regenerated.title,
                    content: regenerated.content,
                    wordCount: regenerated.wordCount,
                    readingTimeMinutes: regenerated.readingTimeMinutes,
                    status: regenerated.status,
                    lastEdited: 'Regenerated just now',
                  }
                : a
            ),
          };
        })
      );
    } catch (err) {
      console.error('[PROJECT] Regenerate asset error:', err);
      throw err;
    }
  };

  const addAsset = async (asset: ContentAsset) => {
    try {
      const created = await contentService.createAsset({
        episodeId: asset.episodeId,
        platform: asset.platform,
        title: asset.title,
        content: asset.content,
        momentId: asset.momentId,
      });

      setEpisodes((prev) =>
        prev.map((ep) => {
          if (ep.id !== asset.episodeId) return ep;
          return { ...ep, assets: [created, ...ep.assets] };
        })
      );
    } catch (err) {
      console.error('[PROJECT] Add asset error:', err);
      throw err;
    }
  };

  const deleteAsset = async (assetId: string) => {
    try {
      await contentService.deleteAsset(assetId);
      setEpisodes((prev) =>
        prev.map((ep) => ({
          ...ep,
          assets: ep.assets.filter((a) => a.id !== assetId),
        }))
      );
    } catch (err) {
      console.error('[PROJECT] Delete asset error:', err);
      throw err;
    }
  };

  // Chat conversation actions
  const activeConversation = chatConversations.find(
    (c) => c.id === activeConversationId
  );

  const createConversation = async (title = 'New conversation') => {
    try {
      const newConv = await chatService.createConversation(title, currentEpisode?.id);
      setChatConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      return newConv.id;
    } catch (err) {
      console.error('[PROJECT] Create conversation error:', err);
      throw err;
    }
  };

  const renameConversation = async (id: string, newTitle: string) => {
    try {
      const updated = await chatService.renameConversation(id, newTitle);
      setChatConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: updated.title } : c))
      );
    } catch (err) {
      console.error('[PROJECT] Rename conversation error:', err);
      throw err;
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      await chatService.deleteConversation(id);
      setChatConversations((prev) => {
        const filtered = prev.filter((c) => c.id !== id);
        if (activeConversationId === id) {
          setActiveConversationId(filtered[0]?.id || '');
        }
        return filtered;
      });
    } catch (err) {
      console.error('[PROJECT] Delete conversation error:', err);
      throw err;
    }
  };

  const sendChatMessage = async (text: string) => {
    if (!text.trim()) return;

    try {
      const response = await chatService.sendMessage(
        text.trim(),
        activeConversationId || undefined,
        currentEpisode?.id || undefined
      );

      setChatConversations((prev) => {
        const targetId = response.conversationId;
        const exists = prev.some((c) => c.id === targetId);

        if (!exists) {
          const freshConv: ChatConversation = {
            id: targetId,
            title: text.length > 30 ? text.substring(0, 30) + '...' : text,
            episodeId: currentEpisode?.id,
            category: 'today',
            createdAt: 'Just now',
            updatedAt: 'Just now',
            messages: [response.userMessage, response.assistantMessage],
          };
          return [freshConv, ...prev];
        }

        return prev.map((c) => {
          if (c.id !== targetId) return c;
          return {
            ...c,
            updatedAt: 'Just now',
            messages: [...c.messages, response.userMessage, response.assistantMessage],
          };
        });
      });

      if (!activeConversationId) {
        setActiveConversationId(response.conversationId);
      }
    } catch (err) {
      console.error('[PROJECT] Send chat message error:', err);
      throw err;
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>) => {
    try {
      const updated = await settingsService.updatePreferences(updates);
      setPreferences(updated);
    } catch (err) {
      console.error('[PROJECT] Update preferences error:', err);
      throw err;
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        episodes,
        currentEpisode,
        isLoadingEpisodes,
        setCurrentEpisodeById,
        refreshEpisodes,
        updateAssetStatus,
        updateAssetContent,
        regenerateAsset,
        addNewEpisode,
        deleteEpisode,
        addAsset,
        deleteAsset,
        seedSampleProject,

        chatConversations,
        activeConversation,
        activeConversationId,
        isLoadingChats,
        setActiveConversationId,
        createConversation,
        renameConversation,
        deleteConversation,
        sendChatMessage,

        preferences,
        updatePreferences,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
