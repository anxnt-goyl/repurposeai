import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '../contexts/ProjectContext';
import { useToast } from '../contexts/ToastContext';
import {
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  FileText,
  Clock,
  ArrowUpRight,
  Bot,
  User,
  PanelLeft,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    currentEpisode,
    chatConversations,
    activeConversation,
    activeConversationId,
    setActiveConversationId,
    createConversation,
    renameConversation,
    deleteConversation,
    sendChatMessage,
  } = useProject();
  const { addToast } = useToast();

  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showMobileHistory, setShowMobileHistory] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || isSending) return;

    setInput('');
    setIsSending(true);
    await sendChatMessage(query);
    setIsSending(false);
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      renameConversation(id, editingTitle.trim());
      addToast('Conversation Renamed', 'Title updated', 'info');
    }
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteConversation(id);
    addToast('Conversation Deleted', 'Chat removed from history', 'info');
  };

  const suggestedPrompts = [
    'Find the strongest hooks',
    'Create a LinkedIn post',
    'Give me 5 key ideas',
    'Find controversial opinions',
    'Turn this into a newsletter',
    'Find quotable moments',
  ];

  // Group chat history into Today, Yesterday, Previous 7 days
  const todayChats = chatConversations.filter((c) => c.category === 'today');
  const yesterdayChats = chatConversations.filter((c) => c.category === 'yesterday');
  const previousChats = chatConversations.filter((c) => c.category === 'previous_7_days');

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col md:flex-row gap-4 max-w-6xl min-w-0">
      {/* Mobile History Drawer / Desktop Sidebar */}
      <div
        className={`w-full md:w-72 shrink-0 rounded-2xl border flex flex-col overflow-hidden transition-all ${
          showMobileHistory ? 'flex h-full' : 'hidden md:flex'
        }`}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* History Header & New Chat button */}
        <div className="p-3 border-b flex items-center justify-between shrink-0" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold">Recent Chats</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                createConversation('New conversation');
                setShowMobileHistory(false);
                addToast('New Chat Initialized', 'Ready for inquiries', 'info');
              }}
              className="p-1.5 rounded-lg border hover:bg-neutral-500/10 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
              style={{ borderColor: 'var(--border-subtle)' }}
              title="Start new conversation"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>

            {/* Mobile close history button */}
            <button
              onClick={() => setShowMobileHistory(false)}
              className="md:hidden p-1.5 rounded-lg hover:bg-neutral-500/10 text-neutral-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History Stream */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs">
          {chatConversations.length === 0 ? (
            <div className="p-6 text-center text-xs opacity-60">
              No conversations yet. Start a new chat below.
            </div>
          ) : (
            <>
              {/* Today Group */}
              {todayChats.length > 0 && (
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                    Today
                  </span>
                  {todayChats.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setShowMobileHistory(false);
                      }}
                      className={`group px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        activeConversationId === conv.id
                          ? 'bg-neutral-500/10 font-medium'
                          : 'hover:bg-neutral-500/5 opacity-80 hover:opacity-100'
                      }`}
                    >
                      {editingId === conv.id ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="w-full text-xs bg-transparent border-b border-amber-500 outline-none"
                            autoFocus
                          />
                          <button onClick={(e) => handleSaveRename(conv.id, e)} className="p-0.5 text-emerald-500">
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span className="truncate pr-2">{conv.title}</span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={(e) => handleStartRename(conv.id, conv.title, e)}
                              className="p-1 hover:text-amber-500 text-neutral-400"
                              title="Rename"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(conv.id, e)}
                              className="p-1 hover:text-red-500 text-neutral-400"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Yesterday Group */}
              {yesterdayChats.length > 0 && (
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                    Yesterday
                  </span>
                  {yesterdayChats.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setShowMobileHistory(false);
                      }}
                      className={`group px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        activeConversationId === conv.id
                          ? 'bg-neutral-500/10 font-medium'
                          : 'hover:bg-neutral-500/5 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span className="truncate pr-2">{conv.title}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1 hover:text-red-500 text-neutral-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Previous 7 Days Group */}
              {previousChats.length > 0 && (
                <div className="space-y-1">
                  <span className="px-2 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">
                    Previous 7 Days
                  </span>
                  {previousChats.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => {
                        setActiveConversationId(conv.id);
                        setShowMobileHistory(false);
                      }}
                      className={`group px-2.5 py-2 rounded-lg flex items-center justify-between transition-colors cursor-pointer ${
                        activeConversationId === conv.id
                          ? 'bg-neutral-500/10 font-medium'
                          : 'hover:bg-neutral-500/5 opacity-80 hover:opacity-100'
                      }`}
                    >
                      <span className="truncate pr-2">{conv.title}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleDelete(conv.id, e)}
                          className="p-1 hover:text-red-500 text-neutral-400"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Center: Active Conversation Workspace */}
      <div
        className={`flex-1 rounded-2xl border flex flex-col overflow-hidden min-w-0 ${
          showMobileHistory ? 'hidden md:flex' : 'flex'
        }`}
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Active Context Banner */}
        <div
          className="px-3 sm:px-4 py-2.5 border-b flex items-center justify-between text-xs min-w-0 shrink-0"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
            {/* Mobile history toggle button */}
            <button
              onClick={() => setShowMobileHistory(true)}
              className="md:hidden p-1 rounded-md border hover:bg-neutral-500/10 text-neutral-400 shrink-0"
              style={{ borderColor: 'var(--border-subtle)' }}
              title="View chat history"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>

            {currentEpisode ? (
              <div className="flex items-center gap-2 min-w-0 truncate">
                <span className="text-[11px] font-mono text-neutral-400 hidden sm:inline shrink-0">Context:</span>
                <span className="font-semibold truncate">{currentEpisode.title}</span>
                <span className="text-neutral-400 hidden sm:inline">·</span>
                <span className="font-mono text-[11px] opacity-75 hidden sm:inline shrink-0">{currentEpisode.duration}</span>
              </div>
            ) : (
              <span className="text-neutral-400 text-xs">General Repurposing Context</span>
            )}
          </div>

          {currentEpisode && (
            <button
              onClick={() => navigate(`/workspace/${currentEpisode.id}`)}
              className="text-[11px] text-amber-500 hover:underline flex items-center gap-1 cursor-pointer shrink-0"
            >
              <span className="hidden sm:inline">Open in Workspace</span>
              <span className="sm:hidden">Workspace</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5 text-xs min-w-0">
          {!activeConversation || activeConversation.messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto py-8 px-4">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold">What would you like to create?</h3>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {currentEpisode
                    ? `Ask anything about "${currentEpisode.title}" or draft targeted assets instantly.`
                    : 'Ask anything about content repurposing strategies, formats, or audience adaptation.'}
                </p>
              </div>

              {/* Suggested Prompts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full pt-2">
                {suggestedPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(prompt)}
                    className="p-2.5 rounded-lg border text-left text-xs font-medium hover:border-neutral-400 transition-colors cursor-pointer truncate"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    {prompt} →
                  </button>
                ))}
              </div>
            </div>
          ) : (
            activeConversation.messages.map((msg) => {
              const isAssistant = msg.sender === 'assistant';

              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 sm:gap-3 max-w-3xl min-w-0 ${
                    isAssistant ? '' : 'ml-auto flex-row-reverse'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold ${
                      isAssistant
                        ? 'bg-amber-500 text-white'
                        : 'bg-neutral-500/20 text-neutral-400'
                    }`}
                  >
                    {isAssistant ? 'AI' : 'U'}
                  </div>

                  <div className="space-y-2 flex-1 min-w-0">
                    <div
                      className={`p-3 sm:p-3.5 rounded-xl border text-xs leading-relaxed min-w-0 break-words ${
                        isAssistant
                          ? 'border-neutral-500/10'
                          : 'bg-neutral-500/10 border-transparent text-right'
                      }`}
                      style={{
                        backgroundColor: isAssistant
                          ? 'var(--bg-surface-subtle)'
                          : undefined,
                      }}
                    >
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>

                    {/* Structured Response Items */}
                    {msg.structuredData && (
                      <div
                        className="p-3 sm:p-4 rounded-xl border space-y-3 min-w-0"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        {msg.structuredData.title && (
                          <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-500 font-mono">
                            {msg.structuredData.title}
                          </h4>
                        )}

                        <div className="space-y-2.5">
                          {msg.structuredData.items?.map((item, idx) => (
                            <div
                              key={idx}
                              className="p-2.5 rounded-lg border flex items-start gap-2.5 bg-neutral-500/5 min-w-0"
                              style={{ borderColor: 'var(--border-subtle)' }}
                            >
                              <span className="font-mono text-[11px] font-bold text-neutral-400 shrink-0">
                                {item.number}
                              </span>
                              <div className="space-y-1 flex-1 min-w-0">
                                <p className="font-medium text-xs leading-snug">
                                  {item.title}
                                </p>
                                {item.description && (
                                  <p
                                    className="text-[11px] leading-relaxed break-words"
                                    style={{ color: 'var(--text-secondary)' }}
                                  >
                                    {item.description}
                                  </p>
                                )}
                                <div className="flex flex-wrap items-center gap-2 sm:gap-3 pt-1 text-[10px] font-mono opacity-70">
                                  {item.sourceTimestamp && (
                                    <span>Source: {item.sourceTimestamp}</span>
                                  )}
                                  {item.platforms && (
                                    <span>Best for: {item.platforms.join(' + ')}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {msg.structuredData.suggestedAction && currentEpisode && (
                          <div className="pt-2 flex justify-end">
                            <button
                              onClick={() => navigate(`/workspace/${currentEpisode.id}`)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs hover:opacity-90"
                              style={{
                                backgroundColor: 'var(--accent-primary)',
                                color: 'var(--accent-contrast)',
                              }}
                            >
                              <span>{msg.structuredData.suggestedAction.label}</span>
                              <ArrowUpRight className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    <span className="text-[10px] text-neutral-400 block px-1 font-mono">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          className="p-2.5 sm:p-3 border-t flex items-center gap-2 shrink-0 min-w-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Ask anything or request a specific platform draft..."
            className="flex-1 min-w-0 px-3 sm:px-4 py-2 text-xs rounded-xl border outline-none bg-transparent"
            style={{ borderColor: 'var(--border-subtle)' }}
          />

          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isSending}
            className="p-2.5 rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-40 shrink-0"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-contrast)',
            }}
            title="Send inquiry"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
