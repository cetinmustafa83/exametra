'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Check,
  CheckCircle2,
  Trash2,
  Archive,
  Filter,
  BookOpen,
  Shield,
  Building2,
  Calendar,
  MessageSquare,
  Settings,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Clock,
  Eye,
  BarChart3,
  Volume2,
  VolumeX,
  Mail,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPut, apiPost, apiDelete } from '@/lib/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

/* ── Types ─────────────────────────────────────────────────────── */

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  isRead: boolean;
  isArchived: boolean;
  actionUrl: string | null;
  relatedId: string | null;
  createdAt: string;
}

interface NotificationStats {
  byCategory: { category: string; count: number }[];
}

interface NotificationData {
  notifications: NotificationItem[];
  unreadCount: number;
  stats: NotificationStats;
}

interface PreferencesData {
  id: string;
  userId: string;
  schoolId: string;
  academicEnabled: boolean;
  behavioralEnabled: boolean;
  administrativeEnabled: boolean;
  calendarEnabled: boolean;
  communicationEnabled: boolean;
  systemEnabled: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
  quietHoursEnabled: boolean;
  emailDigestEnabled: boolean;
  emailDigestFrequency: string;
}

/* ── Category Config ───────────────────────────────────────────── */

const CATEGORIES = [
  { key: 'academic', labelKey: 'notif_center.category_academic', icon: BookOpen, color: 'bg-emerald-500', lightColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-600 dark:text-emerald-400' },
  { key: 'behavioral', labelKey: 'notif_center.category_behavioral', icon: Shield, color: 'bg-rose-500', lightColor: 'bg-rose-100 dark:bg-rose-900/30', textColor: 'text-rose-600 dark:text-rose-400' },
  { key: 'administrative', labelKey: 'notif_center.category_administrative', icon: Building2, color: 'bg-amber-500', lightColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-600 dark:text-amber-400' },
  { key: 'calendar', labelKey: 'notif_center.category_calendar', icon: Calendar, color: 'bg-teal-500', lightColor: 'bg-teal-100 dark:bg-teal-900/30', textColor: 'text-teal-600 dark:text-teal-400' },
  { key: 'communication', labelKey: 'notif_center.category_communication', icon: MessageSquare, color: 'bg-violet-500', lightColor: 'bg-violet-100 dark:bg-violet-900/30', textColor: 'text-violet-600 dark:text-violet-400' },
  { key: 'system', labelKey: 'notif_center.category_system', icon: Settings, color: 'bg-gray-500', lightColor: 'bg-gray-100 dark:bg-gray-900/30', textColor: 'text-gray-600 dark:text-gray-400' },
] as const;

const PRIORITIES = [
  { key: 'urgent', labelKey: 'notif_center.priority_urgent', color: 'from-rose-500 to-red-600', badgeColor: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 border-rose-200 dark:border-rose-800' },
  { key: 'high', labelKey: 'notif_center.priority_high', color: 'from-amber-500 to-orange-500', badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { key: 'normal', labelKey: 'notif_center.priority_normal', color: 'from-emerald-500 to-teal-500', badgeColor: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { key: 'low', labelKey: 'notif_center.priority_low', color: 'from-gray-400 to-gray-500', badgeColor: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700' },
] as const;

/* ── Helpers ───────────────────────────────────────────────────── */

function getCategoryConfig(category: string) {
  return CATEGORIES.find((c) => c.key === category) || CATEGORIES[5];
}

function getPriorityConfig(priority: string) {
  return PRIORITIES.find((p) => p.key === priority) || PRIORITIES[2];
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return t('notif_center.just_now');
  if (diffMin < 60) return t('notif_center.minutes_ago').replace('{n}', String(diffMin));
  if (diffHour < 24) return t('notif_center.hours_ago').replace('{n}', String(diffHour));
  if (diffDay < 7) return t('notif_center.days_ago').replace('{n}', String(diffDay));
  return date.toLocaleDateString();
}

const CHART_COLORS = ['#10b981', '#f43f5e', '#f59e0b', '#14b8a6', '#8b5cf6', '#6b7280'];

/* ── Component ─────────────────────────────────────────────────── */

export default function NotificationCenterView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [data, setData] = useState<NotificationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterRead, setFilterRead] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Preferences
  const [prefs, setPrefs] = useState<PreferencesData | null>(null);
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('all');

  const role = currentUser?.role || 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';

  /* ── Load Data ──────────────────────────────────────────────── */

  const loadData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== 'all') params.set('category', filterCategory);
      if (filterPriority !== 'all') params.set('priority', filterPriority);
      if (filterRead !== 'all') params.set('isRead', filterRead);
      if (showArchived) params.set('isArchived', 'true');
      else params.set('isArchived', 'false');

      const result = await apiGet<NotificationData>(`/api/notifications?${params.toString()}`);
      setData(result);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterCategory, filterPriority, filterRead, showArchived]);

  const loadPrefs = useCallback(async () => {
    try {
      const result = await apiGet<PreferencesData>('/api/notifications/preferences');
      setPrefs(result);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    loadData();
    loadPrefs();
  }, [loadData, loadPrefs]);

  // Polling every 10 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  /* ── Actions ────────────────────────────────────────────────── */

  const handleMarkRead = useCallback(async (id: string) => {
    try {
      await apiPut(`/api/notifications/${id}`, { action: 'read' });
      setData((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1),
      } : prev);
    } catch {
      // ignore
    }
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    try {
      await apiPut('/api/notifications', { markAll: true });
      setData((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      } : prev);
    } catch {
      // ignore
    }
  }, []);

  const handleArchive = useCallback(async (id: string) => {
    try {
      await apiPut(`/api/notifications/${id}`, { action: 'archive' });
      setData((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.map((n) =>
          n.id === id ? { ...n, isArchived: true } : n
        ),
      } : prev);
    } catch {
      // ignore
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await apiDelete(`/api/notifications/${id}`);
      setData((prev) => prev ? {
        ...prev,
        notifications: prev.notifications.filter((n) => n.id !== id),
      } : prev);
    } catch {
      // ignore
    }
  }, []);

  const handleBulkAction = useCallback(async (action: 'read' | 'archive' | 'delete') => {
    if (selectedIds.size === 0) return;
    try {
      const ids = Array.from(selectedIds);
      if (action === 'delete') {
        await apiPut('/api/notifications', { deleteIds: ids });
      } else {
        await apiPut('/api/notifications', { ids, action });
      }
      setSelectedIds(new Set());
      loadData();
    } catch {
      // ignore
    }
  }, [selectedIds, loadData]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleNavigate = useCallback((actionUrl: string | null) => {
    if (actionUrl) {
      setCurrentView(actionUrl as 'dashboard');
    }
  }, [setCurrentView]);

  const handleSavePrefs = useCallback(async () => {
    if (!prefs) return;
    try {
      await apiPut('/api/notifications/preferences', prefs);
      setPrefsOpen(false);
    } catch {
      // ignore
    }
  }, [prefs]);

  /* ── Filtered Data ──────────────────────────────────────────── */

  const filteredNotifications = useMemo(() => {
    if (!data?.notifications) return [];
    let items = data.notifications;

    // Tab-based filter
    if (activeTab === 'unread') {
      items = items.filter((n) => !n.isRead);
    } else if (activeTab === 'archived') {
      items = items.filter((n) => n.isArchived);
    }

    return items;
  }, [data?.notifications, activeTab]);

  /* ── Chart Data ─────────────────────────────────────────────── */

  const chartData = useMemo(() => {
    if (!data?.stats?.byCategory) return [];
    return data.stats.byCategory.map((item) => ({
      name: t(`notif_center.category_${item.category}`),
      value: item.count,
      category: item.category,
    }));
  }, [data?.stats]);

  /* ── Render ─────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-gray-500">{t('notif_center.loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with gradient banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-500 p-6 shadow-lg"
      >
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
          <div className="absolute bottom-0 left-1/3 w-16 h-16 rounded-full bg-white/5" />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell className="h-6 w-6" />
              {t('notif_center.title')}
              {data && data.unreadCount > 0 && (
                <motion.span
                  className="ml-1 inline-flex items-center justify-center h-6 min-w-[24px] rounded-full bg-white/20 text-white text-xs font-semibold px-2"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {data.unreadCount}
                </motion.span>
              )}
            </h1>
            <p className="text-sm text-emerald-100 mt-1">
              {t('notif_center.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('action.refresh')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={!data || data.unreadCount === 0}
              className="bg-white/10 hover:bg-white/20 text-white border-white/30"
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              {t('notif_center.mark_all_read')}
            </Button>
          <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                <Settings className="h-4 w-4 mr-1" />
                {t('notif_center.preferences')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-emerald-600" />
                  {t('notif_center.preferences_title')}
                </DialogTitle>
              </DialogHeader>
              {prefs && (
                <div className="space-y-6">
                  {/* Category Toggles */}
                  <div>
                    <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
                      {t('notif_center.category_toggles')}
                    </h4>
                    <div className="space-y-3">
                      {CATEGORIES.map((cat) => {
                        const key = `${cat.key}Enabled` as keyof PreferencesData;
                        const enabled = prefs[key] as boolean;
                        const Icon = cat.icon;
                        return (
                          <div key={cat.key} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cat.lightColor}`}>
                                <Icon className={`h-4 w-4 ${cat.textColor}`} />
                              </div>
                              <Label className="text-sm">{t(cat.labelKey)}</Label>
                            </div>
                            <Switch
                              checked={enabled}
                              onCheckedChange={(checked) =>
                                setPrefs((prev) => prev ? { ...prev, [key]: checked } : prev)
                              }
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Quiet Hours */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('notif_center.quiet_hours')}
                      </h4>
                      <Switch
                        checked={prefs.quietHoursEnabled}
                        onCheckedChange={(checked) =>
                          setPrefs((prev) => prev ? { ...prev, quietHoursEnabled: checked } : prev)
                        }
                      />
                    </div>
                    {prefs.quietHoursEnabled && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={prefs.quietHoursStart || '22:00'}
                          onChange={(e) =>
                            setPrefs((prev) => prev ? { ...prev, quietHoursStart: e.target.value } : prev)
                          }
                          className="w-32"
                        />
                        <span className="text-gray-400">—</span>
                        <Input
                          type="time"
                          value={prefs.quietHoursEnd || '07:00'}
                          onChange={(e) =>
                            setPrefs((prev) => prev ? { ...prev, quietHoursEnd: e.target.value } : prev)
                          }
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>

                  <Separator />

                  {/* Email Digest */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        {t('notif_center.email_digest')}
                      </h4>
                      <Switch
                        checked={prefs.emailDigestEnabled}
                        onCheckedChange={(checked) =>
                          setPrefs((prev) => prev ? { ...prev, emailDigestEnabled: checked } : prev)
                        }
                      />
                    </div>
                    {prefs.emailDigestEnabled && (
                      <Select
                        value={prefs.emailDigestFrequency}
                        onValueChange={(value) =>
                          setPrefs((prev) => prev ? { ...prev, emailDigestFrequency: value } : prev)
                        }
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">{t('notif_center.digest_daily')}</SelectItem>
                          <SelectItem value="weekly">{t('notif_center.digest_weekly')}</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <Button onClick={handleSavePrefs} className="w-full bg-emerald-600 hover:bg-emerald-700">
                    {t('action.save')}
                  </Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
        </div>
      </motion.div>

      {/* Stats Cards with glassmorphism */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="border-emerald-200/50 dark:border-emerald-900/30 backdrop-blur-sm bg-card/80 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {data?.notifications.length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('notif_center.total')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-rose-200/50 dark:border-rose-900/30 backdrop-blur-sm bg-card/80 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                  <Eye className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {data?.unreadCount ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('notif_center.unread')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-amber-200/50 dark:border-amber-900/30 backdrop-blur-sm bg-card/80 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {data?.notifications.filter((n) => n.priority === 'urgent' || n.priority === 'high').length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('notif_center.urgent_high')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card className="border-teal-200/50 dark:border-teal-900/30 backdrop-blur-sm bg-card/80 hover:shadow-md transition-all">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center">
                  <Archive className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    {data?.notifications.filter((n) => n.isArchived).length ?? 0}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('notif_center.archived')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Tabs + Filters */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <TabsList className="bg-emerald-50 dark:bg-emerald-950/30">
            <TabsTrigger value="all" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              {t('notif_center.tab_all')}
            </TabsTrigger>
            <TabsTrigger value="unread" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              {t('notif_center.tab_unread')}
              {data && data.unreadCount > 0 && (
                <Badge className="ml-1 h-5 min-w-[20px] text-[10px] bg-emerald-600 text-white">{data.unreadCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="archived" className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              {t('notif_center.tab_archived')}
            </TabsTrigger>
          </TabsList>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
          >
            <Filter className="h-4 w-4 mr-1" />
            {t('action.filter')}
            {showFilters ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card className="mt-4 border-emerald-200/50 dark:border-emerald-900/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">{t('notif_center.filter_category')}</Label>
                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('notif_center.all_categories')}</SelectItem>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat.key} value={cat.key}>{t(cat.labelKey)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">{t('notif_center.filter_priority')}</Label>
                      <Select value={filterPriority} onValueChange={setFilterPriority}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('notif_center.all_priorities')}</SelectItem>
                          {PRIORITIES.map((p) => (
                            <SelectItem key={p.key} value={p.key}>{t(p.labelKey)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1">{t('notif_center.filter_read')}</Label>
                      <Select value={filterRead} onValueChange={setFilterRead}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('notif_center.all_status')}</SelectItem>
                          <SelectItem value="false">{t('notif_center.unread_only')}</SelectItem>
                          <SelectItem value="true">{t('notif_center.read_only')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800"
          >
            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
              {selectedIds.size} {t('notif_center.selected')}
            </span>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('read')} className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
              <Check className="h-3 w-3 mr-1" /> {t('notif_center.mark_read')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('archive')} className="text-emerald-600 border-emerald-200 dark:border-emerald-800">
              <Archive className="h-3 w-3 mr-1" /> {t('notif_center.archive')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleBulkAction('delete')} className="text-rose-600 border-rose-200 dark:border-rose-800">
              <Trash2 className="h-3 w-3 mr-1" /> {t('action.delete')}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
              <X className="h-3 w-3" />
            </Button>
          </motion.div>
        )}

        {/* Notification List */}
        <TabsContent value={activeTab} className="mt-4">
          {filteredNotifications.length === 0 ? (
            <Card className="border-emerald-200/50 dark:border-emerald-900/30">
              <CardContent className="p-12 text-center">
                <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                <p className="text-gray-500 dark:text-gray-400">{t('notif_center.no_notifications')}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {filteredNotifications.map((notification, index) => {
                  const catConfig = getCategoryConfig(notification.category);
                  const priConfig = getPriorityConfig(notification.priority);
                  const CatIcon = catConfig.icon;
                  const isExpanded = expandedId === notification.id;
                  const isSelected = selectedIds.has(notification.id);

                  return (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ delay: index * 0.02, type: 'spring', stiffness: 200, damping: 20 }}
                      layout
                    >
                      <Card
                        className={`overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
                          !notification.isRead
                            ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/20'
                            : 'border-gray-200 dark:border-gray-800'
                        } ${isSelected ? 'ring-2 ring-emerald-400' : ''}`}
                      >
                        {/* Gradient left border based on priority */}
                        <div className="flex">
                          <div className={`w-1.5 shrink-0 bg-gradient-to-b ${priConfig.color}`} />
                          <div className="flex-1">
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                {/* Select checkbox */}
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleToggleSelect(notification.id); }}
                                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                                    isSelected
                                      ? 'bg-emerald-600 border-emerald-600 text-white'
                                      : 'border-gray-300 dark:border-gray-600 hover:border-emerald-400'
                                  }`}
                                >
                                  {isSelected && <Check className="h-3 w-3" />}
                                </button>

                                {/* Category icon */}
                                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${catConfig.lightColor}`}>
                                  <CatIcon className={`h-4 w-4 ${catConfig.textColor}`} />
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0" onClick={() => setExpandedId(isExpanded ? null : notification.id)}>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                      {notification.title}
                                    </p>
                                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${priConfig.badgeColor}`}>
                                      {t(priConfig.labelKey)}
                                    </Badge>
                                    {!notification.isRead && (
                                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="h-3 w-3 text-gray-400" />
                                    <span className="text-[11px] text-gray-400">{formatRelativeTime(notification.createdAt)}</span>
                                    <Badge variant="outline" className="text-[10px] px-1 py-0 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                                      {t(catConfig.labelKey)}
                                    </Badge>
                                  </div>

                                  {/* Expanded detail */}
                                  <AnimatePresence>
                                    {isExpanded && (
                                      <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                      >
                                        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                            {notification.message}
                                          </p>
                                          {notification.actionUrl && (
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={(e) => { e.stopPropagation(); handleNavigate(notification.actionUrl); }}
                                              className="mt-2 text-emerald-600 border-emerald-200 dark:border-emerald-800"
                                            >
                                              <ChevronRight className="h-3 w-3 mr-1" />
                                              {t('notif_center.go_to')}
                                            </Button>
                                          )}
                                        </div>
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>

                                {/* Action buttons */}
                                <div className="flex flex-col items-end gap-1 shrink-0">
                                  {!notification.isRead && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => { e.stopPropagation(); handleMarkRead(notification.id); }}
                                      className="h-7 w-7 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/20"
                                      title={t('notif_center.mark_read')}
                                    >
                                      <Check className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleArchive(notification.id); }}
                                    className="h-7 w-7 p-0 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                    title={t('notif_center.archive')}
                                  >
                                    <Archive className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                                    className="h-7 w-7 p-0 text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/20"
                                    title={t('action.delete')}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Statistics Section */}
      {chartData.length > 0 && !isStudent && !isParent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <Card className="border-emerald-200/50 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                {t('notif_center.by_category')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-emerald-200/50 dark:border-emerald-900/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                {t('notif_center.distribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
