'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi, Download, CloudOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { t } from '@/lib/i18n';

// ─── Offline Indicator Bar ────────────────────────────────────────────────
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    // Set initial state
    setIsOffline(!navigator.onLine);

    const handleOnline = () => {
      setIsOffline(false);
      if (wasOffline) {
        toast.success(t('pwa.back_online'), {
          description: t('pwa.back_online_desc'),
          duration: 4000,
          icon: <Wifi className="h-4 w-4 text-emerald-500" />,
        });
        // Trigger sync of pending requests
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({ type: 'SYNC_PENDING' });
        }
      }
    };

    const handleOffline = () => {
      setIsOffline(true);
      setWasOffline(true);
      toast.error(t('pwa.offline'), {
        description: t('pwa.offline_desc'),
        duration: 6000,
        icon: <WifiOff className="h-4 w-4" />,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  // Reset wasOffline after a short delay when back online
  useEffect(() => {
    if (!isOffline && wasOffline) {
      const timer = setTimeout(() => setWasOffline(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isOffline, wasOffline]);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="offline-indicator-bar fixed top-0 left-0 right-0 z-[100] flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 text-white text-sm font-medium shadow-lg shadow-amber-500/20"
        >
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>{t('pwa.offline')}</span>
          <span className="hidden sm:inline text-amber-100">— {t('pwa.offline_desc')}</span>
          <Badge variant="outline" className="ml-2 text-[10px] border-amber-200/50 text-amber-100 bg-amber-600/40">
            <CloudOff className="h-3 w-3 mr-1" />
            {t('pwa.cached_data')}
          </Badge>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── PWA Install Prompt ───────────────────────────────────────────────────
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstall(true);
    };

    const handleAppInstalled = () => {
      setShowInstall(false);
      setDeferredPrompt(null);
      toast.success(t('pwa.installed'), {
        description: t('pwa.installed_desc'),
        duration: 5000,
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    try {
      await (deferredPrompt as BeforeInstallPromptEvent).prompt();
      const result = await (deferredPrompt as BeforeInstallPromptEvent).userChoice;
      if (result.outcome === 'accepted') {
        toast.success(t('pwa.install_accepted'));
      }
    } catch {
      // Ignore errors
    }
    setDeferredPrompt(null);
    setShowInstall(false);
  }, [deferredPrompt]);

  if (!showInstall) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 shadow-xl shadow-emerald-900/10">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shrink-0">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('pwa.install_app')}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('pwa.install_app_desc')}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowInstall(false)}
              className="h-8 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              {t('action.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleInstall}
              className="h-8 text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              {t('pwa.install')}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─── Service Worker Registration Hook ──────────────────────────────────────
export function useServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    async function registerSW() {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        // Check for updates every 30 minutes
        setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);

        // Handle updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                toast.info(t('pwa.update_available'), {
                  description: t('pwa.update_available_desc'),
                  action: {
                    label: t('pwa.reload'),
                    onClick: () => window.location.reload(),
                  },
                  duration: 10000,
                });
              }
            });
          }
        });

        console.log('[PWA] Service Worker registered successfully');
      } catch (error) {
        console.warn('[PWA] Service Worker registration failed:', error);
      }
    }

    registerSW();
  }, []);
}

// ─── Offline Badge for Notebooks ──────────────────────────────────────────
export function OfflineBadge() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <Badge variant="outline" className="text-[10px] border-amber-300/60 dark:border-amber-700/40 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 gap-1">
      <CloudOff className="h-3 w-3" />
      {t('pwa.offline_mode')}
    </Badge>
  );
}

// ─── BeforeInstallPromptEvent type ────────────────────────────────────────
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// ─── Offline Form Submission Queue ────────────────────────────────────────
const OFFLINE_QUEUE_KEY = 'ct_offline_queue';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: string;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
}

export function queueOfflineRequest(
  url: string,
  method: string,
  body: string,
  headers: Record<string, string> = {}
): void {
  try {
    const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    queue.push({
      id: `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retries: 0,
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // localStorage not available
  }
}

export function getOfflineQueue(): QueuedRequest[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function clearOfflineQueue(): void {
  try {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  } catch {
    // ignore
  }
}

export function removeOfflineRequest(id: string): void {
  try {
    const queue: QueuedRequest[] = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    const filtered = queue.filter((r) => r.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

// ─── Offline Sync Manager ─────────────────────────────────────────────────
export function OfflineSyncManager() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      setPendingCount(getOfflineQueue().length);
    };
    updateCount();

    // Check every 10 seconds
    const interval = setInterval(updateCount, 10000);

    // When back online, try to replay queued requests
    const handleOnline = async () => {
      const queue = getOfflineQueue();
      if (queue.length === 0) return;

      let successCount = 0;
      let failCount = 0;

      for (const req of queue) {
        try {
          const res = await fetch(req.url, {
            method: req.method,
            headers: { 'Content-Type': 'application/json', ...req.headers },
            body: req.method !== 'GET' ? req.body : undefined,
          });
          if (res.ok) {
            removeOfflineRequest(req.id);
            successCount++;
          } else {
            failCount++;
          }
        } catch {
          failCount++;
        }
      }

      if (successCount > 0) {
        toast.success(t('pwa.sync_complete'), {
          description: t('pwa.sync_complete_desc').replace('{count}', String(successCount)),
          duration: 5000,
        });
      }
      updateCount();
    };

    window.addEventListener('online', handleOnline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex items-center gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800/40 rounded-lg shadow-md"
      >
        <RefreshCw className="h-4 w-4 text-amber-500 animate-spin" />
        <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          {t('pwa.pending_sync').replace('{count}', String(pendingCount))}
        </span>
      </motion.div>
    </div>
  );
}

// ─── Rate Limit Toast Handler ───────────────────────────────────────
// This component provides a utility to show rate limit error toasts
// Call showRateLimitToast from any catch block when a 429 is received

export function showRateLimitToast(retryAfterSeconds: number, limit?: number): void {
  const retryAfterFormatted = retryAfterSeconds > 60
    ? `${Math.ceil(retryAfterSeconds / 60)} min`
    : `${retryAfterSeconds}s`;

  toast.error(t('rate_limit.title'), {
    description: t('rate_limit.description')
      .replace('{retryAfter}', retryAfterFormatted)
      .replace('{limit}', limit ? String(limit) : ''),
    duration: retryAfterSeconds * 1000 + 2000,
    icon: <Clock className="h-4 w-4" />,
  });
}

// ─── Rate Limit Status Card (for admin settings) ────────────────────
export function RateLimitStatus() {
  const [stats, setStats] = useState<{
    totalEntries: number;
    topConsumers: Array<{ key: string; count: number; resetTime: number }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/rate-limit-stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
          <Shield className="h-4 w-4" />
          {t('rate_limit.status_title')}
        </h4>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadStats}
          className="h-8 text-xs text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
          {t('action.refresh')}
        </Button>
      </div>

      {stats && (
        <div className="grid gap-3">
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
            <span className="text-xs text-gray-600 dark:text-gray-400">{t('rate_limit.active_entries')}</span>
            <Badge variant="outline" className="text-xs border-emerald-200/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300">
              {stats.totalEntries}
            </Badge>
          </div>

          {stats.topConsumers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60">
                {t('rate_limit.top_consumers')}
              </p>
              <ScrollArea className="max-h-48">
                {stats.topConsumers.map((consumer) => (
                  <div key={consumer.key} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-emerald-50/30 dark:hover:bg-emerald-900/10">
                    <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[200px]">
                      {consumer.key}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-[10px] border-emerald-200/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                        {consumer.count}/{t('rate_limit.requests')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </div>
          )}

          {stats.topConsumers.length === 0 && (
            <div className="px-3 py-4 text-center">
              <Shield className="h-6 w-6 mx-auto mb-1 text-gray-300 dark:text-gray-600" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('rate_limit.no_active')}</p>
            </div>
          )}
        </div>
      )}

      {!stats && !loading && (
        <div className="px-3 py-4 text-center">
          <Shield className="h-6 w-6 mx-auto mb-1 text-gray-300 dark:text-gray-600" />
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('rate_limit.unavailable')}</p>
        </div>
      )}
    </div>
  );
}

// ─── Additional icons import ────────────────────────────────────────
import { Clock, Shield } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
