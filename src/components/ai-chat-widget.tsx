'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageCircle,
  X,
  Send,
  Sparkles,
  HelpCircle,
  Lightbulb,
  Brain,
  Loader2,
  Trash2,
  Plus,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { t } from '@/lib/i18n';
import { apiPost, apiGet } from '@/lib/api';

interface ChatMessage {
  id: string;
  content: string;
  senderType: 'user' | 'ai' | 'system';
  createdAt: string;
}

interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function AIChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestsToday, setRequestsToday] = useState(0);
  const [maxRequests, setMaxRequests] = useState(50);
  const [chatEnabled, setChatEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load chat history on mount
  useEffect(() => {
    if (isOpen) {
      loadChatHistory();
    }
  }, [isOpen]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const loadChatHistory = useCallback(async () => {
    try {
      const data = await apiGet<{
        messages: ChatMessage[];
        requestsToday: number;
        maxRequests: number;
        chatEnabled: boolean;
      }>('/api/ai/chat');
      setMessages(data.messages || []);
      setRequestsToday(data.requestsToday);
      setMaxRequests(data.maxRequests);
      setChatEnabled(data.chatEnabled);
    } catch {
      // Chat might not be available yet
      setChatEnabled(false);
    }
  }, []);

  const handleSendMessage = useCallback(
    async (messageText?: string) => {
      const text = (messageText || inputValue).trim();
      if (!text || isLoading || !chatEnabled) return;

      // Check rate limit
      if (requestsToday >= maxRequests) {
        setError(t('ai.error_rate_limit'));
        return;
      }

      setInputValue('');
      setError(null);

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        content: text,
        senderType: 'user',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Build conversation history for context
        const history: ChatHistoryMessage[] = messages
          .filter((m) => m.senderType === 'user' || m.senderType === 'ai')
          .slice(-10)
          .map((m) => ({
            role: m.senderType === 'user' ? ('user' as const) : ('assistant' as const),
            content: m.content,
          }));

        const data = await apiPost<{
          response: string;
          requestsToday: number;
          maxRequests: number;
        }>('/api/ai/chat', {
          message: text,
          conversationHistory: history,
        });

        // Add AI response
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          content: data.response,
          senderType: 'ai',
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, aiMessage]);
        setRequestsToday(data.requestsToday);
      } catch (err: unknown) {
        const error = err as { isRateLimit?: boolean; message?: string };
        if (error?.isRateLimit) {
          setError(t('ai.error_rate_limit'));
        } else {
          setError(t('ai.error_generic'));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading, chatEnabled, requestsToday, maxRequests, messages]
  );

  const handleQuickAction = useCallback(
    (action: 'explain' | 'hint' | 'quiz') => {
      const prefixes: Record<string, string> = {
        explain: t('ai.topic_explain') + ': ',
        hint: t('ai.topic_hint') + ': ',
        quiz: t('ai.topic_quiz') + ': ',
      };
      setInputValue(prefixes[action]);
      setTimeout(() => inputRef.current?.focus(), 50);
    },
    []
  );

  const handleClearChat = useCallback(async () => {
    setMessages([]);
    setError(null);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const remainingRequests = maxRequests - requestsToday;

  return (
    <TooltipProvider>
      {/* Floating Chat Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="fixed bottom-20 right-4 z-50 sm:bottom-6 sm:right-6"
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsOpen(true)}
                  className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all duration-300 group"
                  size="icon"
                >
                  <MessageCircle className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
                  {remainingRequests < 10 && remainingRequests > 0 && (
                    <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-amber-500 text-white text-[10px] border-0">
                      {remainingRequests}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{t('ai.chat_title')}</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-4 right-4 z-50 w-[360px] max-w-[calc(100vw-2rem)] sm:w-[400px] sm:bottom-6 sm:right-6"
          >
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl shadow-emerald-500/10 border border-emerald-200/60 dark:border-emerald-800/40 overflow-hidden flex flex-col max-h-[70vh] sm:max-h-[80vh]">
              {/* Header */}
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 flex items-center justify-between shrink-0 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4xKSIvPjwvc3ZnPg==')] opacity-50" />
                <div className="relative z-10 flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-sm">
                      {t('ai.chat_title')}
                    </h3>
                    <p className="text-emerald-100 text-[10px]">
                      {t('ai.daily_limit', { used: String(requestsToday), max: String(maxRequests) })}
                    </p>
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={handleClearChat}
                    title={t('ai.clear_chat')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-white/80 hover:text-white hover:bg-white/10"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages Area */}
              <ScrollArea className="flex-1 p-4 min-h-[300px] max-h-[400px]">
                {messages.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-4">
                      <Sparkles className="h-8 w-8 text-emerald-500" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {t('ai.welcome_message')}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('ai.no_homework')}
                    </p>
                  </div>
                )}

                {messages.map((msg, idx) => (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25, type: 'spring', stiffness: 400, damping: 30 }}
                    className={`flex mb-3 ${
                      msg.senderType === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        msg.senderType === 'user'
                          ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-br-md'
                          : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md border border-gray-100 dark:border-gray-700'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}

                {/* Typing Indicator */}
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start mb-3"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-bl-md px-4 py-3 border border-gray-100 dark:border-gray-700 shadow-sm">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                          <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.15 }} />
                          <motion.div className="h-2 w-2 rounded-full bg-emerald-500" animate={{ y: [0, -4, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.3 }} />
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {t('ai.thinking')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-center mb-3"
                  >
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl px-4 py-2.5 text-xs text-red-600 dark:text-red-400 flex items-center gap-2 border border-red-100 dark:border-red-800/30">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      {error}
                    </div>
                  </motion.div>
                )}

                <div ref={scrollRef} />
              </ScrollArea>

              {/* Quick Actions */}
              <div className="px-4 py-2 border-t border-emerald-100 dark:border-emerald-800/30 shrink-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">
                    {t('ai.quick_actions')}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] border-emerald-200/50 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2"
                      onClick={() => handleQuickAction('explain')}
                      disabled={isLoading || !chatEnabled}
                    >
                      <HelpCircle className="h-3 w-3 mr-1" />
                      {t('ai.explain_topic')}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] border-emerald-200/50 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2"
                      onClick={() => handleQuickAction('hint')}
                      disabled={isLoading || !chatEnabled}
                    >
                      <Lightbulb className="h-3 w-3 mr-1" />
                      {t('ai.give_hint')}
                    </Button>
                  </motion.div>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-[11px] border-emerald-200/50 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 px-2"
                      onClick={() => handleQuickAction('quiz')}
                      disabled={isLoading || !chatEnabled}
                    >
                      <Brain className="h-3 w-3 mr-1" />
                      {t('ai.quiz_me')}
                    </Button>
                  </motion.div>
                </div>
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-emerald-100 dark:border-emerald-800/30 shrink-0">
                <div className="flex items-center gap-2">
                  <Input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('ai.chat_placeholder')}
                    disabled={isLoading || !chatEnabled || requestsToday >= maxRequests}
                    className="flex-1 h-9 text-sm border-emerald-200/50 dark:border-emerald-800/30 focus:ring-emerald-500/30 bg-white dark:bg-gray-800"
                  />
                  <Button
                    onClick={() => handleSendMessage()}
                    disabled={
                      !inputValue.trim() ||
                      isLoading ||
                      !chatEnabled ||
                      requestsToday >= maxRequests
                    }
                    className="h-9 w-9 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shrink-0"
                    size="icon"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {requestsToday >= maxRequests && (
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 text-center">
                    {t('ai.rate_limit')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  );
}
