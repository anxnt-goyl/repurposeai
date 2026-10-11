import { Router, Response } from 'express';
import { db } from '../db/store';
import { DBChatConversation, DBChatMessage } from '../db/types';
import { requireAuth, AuthenticatedRequest } from '../auth/authMiddleware';
import { aiService } from '../services/aiService';

const router = Router();

// GET /api/chat/conversations or /api/chat/history - user's conversations
const getConversationsHandler = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const rawConversations = await db.chats.find({ userId });
    const conversations = rawConversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const enriched = await Promise.all(conversations.map(async (c) => {
      const rawMessages = await db.messages.find({ conversationId: c.id });
      const messages = rawMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      return {
        ...c,
        messages,
      };
    }));

    res.json({ success: true, data: enriched });
  } catch (err: any) {
    console.error('[CHAT] Conversations fetch error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to load chat history.' } });
  }
};

router.get('/conversations', requireAuth, getConversationsHandler);
router.get('/history', requireAuth, getConversationsHandler);

// GET /api/chat/conversations/:id - single conversation
router.get('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chat = await db.chats.findById(req.params.id);

    if (!chat || chat.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Conversation not found.' } });
      return;
    }

    const rawMessages = await db.messages.find({ conversationId: chat.id });
    const messages = rawMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    res.json({ success: true, data: { ...chat, messages } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: 'Failed to retrieve conversation.' } });
  }
});

// POST /api/chat/conversations - start new chat thread
router.post('/conversations', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { title = 'New Conversation', episodeId } = req.body;

    const newChat: DBChatConversation = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId,
      episodeId: episodeId || undefined,
      title: title.trim(),
      category: 'today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await db.chats.create(newChat);
    res.status(201).json({ success: true, data: { ...newChat, messages: [] } });
  } catch (err: any) {
    console.error('[CHAT] Create conversation error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to create conversation.' } });
  }
});

// PATCH /api/chat/conversations/:id - rename conversation
router.patch('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chat = await db.chats.findById(req.params.id);

    if (!chat || chat.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Conversation not found.' } });
      return;
    }

    const { title } = req.body;
    if (!title || !title.trim()) {
      res.status(400).json({ success: false, error: { message: 'Title is required.' } });
      return;
    }

    const updated = await db.chats.update(chat.id, {
      title: title.trim(),
      updatedAt: new Date().toISOString(),
    });

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[CHAT] Rename error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to rename conversation.' } });
  }
});

// DELETE /api/chat/conversations/:id - delete conversation
router.delete('/conversations/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const chat = await db.chats.findById(req.params.id);

    if (!chat || chat.userId !== userId) {
      res.status(404).json({ success: false, error: { message: 'Conversation not found.' } });
      return;
    }

    await db.chats.delete(chat.id);
    await db.messages.deleteMany({ conversationId: chat.id });

    res.json({ success: true, data: { deletedId: chat.id } });
  } catch (err: any) {
    console.error('[CHAT] Delete error:', err);
    res.status(500).json({ success: false, error: { message: 'Failed to delete conversation.' } });
  }
});

// Handle message sending logic
async function processChatMessage(
  userId: string,
  userEmail: string,
  message: string,
  conversationId?: string,
  episodeId?: string
) {
  let activeChatId: string = conversationId || '';
  let chat = activeChatId ? await db.chats.findById(activeChatId) : null;

  if (!chat || chat.userId !== userId) {
    const autoTitle = message.trim().slice(0, 35) + (message.length > 35 ? '...' : '');
    const newChatRecord: DBChatConversation = {
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      userId,
      episodeId: episodeId || undefined,
      title: autoTitle,
      category: 'today',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.chats.create(newChatRecord);
    chat = newChatRecord;
    activeChatId = newChatRecord.id;
  }

  const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userMsgRecord: DBChatMessage = {
    id: `msg-${Date.now()}-u`,
    conversationId: activeChatId,
    userId,
    sender: 'user',
    timestamp: nowTimeStr,
    text: message.trim(),
    createdAt: new Date().toISOString(),
  };
  await db.messages.create(userMsgRecord);

  const rawPreviousMessages = await db.messages.find({ conversationId: activeChatId });
  const previousMessages = rawPreviousMessages
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => ({ sender: m.sender, text: m.text }));

  let episodeContext;
  const targetEpId = episodeId || chat?.episodeId;
  if (targetEpId) {
    const ep = await db.episodes.findById(targetEpId);
    if (ep && ep.userId === userId) {
      const moments = await db.moments.find({ episodeId: ep.id });
      episodeContext = {
        title: ep.title,
        summary: ep.summary,
        keyTakeaways: ep.keyTakeaways,
        moments,
      };
    }
  }

  let assistantText = '';
  let structuredData = null;

  if (aiService.isConfigured()) {
    try {
      console.log(`[CHAT] Calling Gemini AI assistant for user: ${userEmail}...`);
      const aiResponse = await aiService.streamChatResponse(previousMessages, message.trim(), episodeContext);
      assistantText = aiResponse.text;
      structuredData = aiResponse.structuredData;
    } catch (aiErr: any) {
      console.error('[CHAT] Gemini error:', aiErr);
      assistantText = `AI assistant service error: ${aiErr.message}. Please verify API key.`;
    }
  } else {
    assistantText = `RepurposeAI assistant is ready. To enable live AI generation, configure GEMINI_API_KEY in the server environment (Settings > Secrets panel).\n\nIn the meantime, your inquiry "${message.trim()}" has been recorded.`;
  }

  const assistantMsgRecord: DBChatMessage = {
    id: `msg-${Date.now()}-a`,
    conversationId: activeChatId,
    userId,
    sender: 'assistant',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    text: assistantText,
    structuredData,
    createdAt: new Date().toISOString(),
  };
  await db.messages.create(assistantMsgRecord);

  await db.chats.update(activeChatId, { updatedAt: new Date().toISOString() });

  return {
    conversationId: activeChatId,
    userMessage: userMsgRecord,
    assistantMessage: assistantMsgRecord,
  };
}

// POST /api/chat - submit message
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { message, conversationId, episodeId } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: { message: 'Message content is required.' } });
      return;
    }

    const result = await processChatMessage(userId, req.user!.email, message, conversationId, episodeId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    console.error('[CHAT] Send message error:', err);
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to process chat message.' } });
  }
});

// POST /api/chat/conversations/:id/messages - submit message into conversation
router.post('/conversations/:id/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const conversationId = req.params.id;
    const { message, episodeId } = req.body;

    if (!message || !message.trim()) {
      res.status(400).json({ success: false, error: { message: 'Message content is required.' } });
      return;
    }

    const result = await processChatMessage(userId, req.user!.email, message, conversationId, episodeId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: { message: err.message || 'Failed to process chat message.' } });
  }
});

export default router;
