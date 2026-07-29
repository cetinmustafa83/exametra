'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  PenLine,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  TrendingUp,
  Plus,
  BookOpen,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Target,
  Bell,
  Settings,
  CalendarDays,
  Clock,
  Activity,
  Info,
  Zap,
  Sprout,
  Leaf,
  TreePine,
  Trees,
  PartyPopper,
  Lightbulb,
  ChevronRight,
  RefreshCw,
  GraduationCap,
  UserCheck,
  Award,
  Star,
  MessageSquare,
  Timer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { fetchDashboard, type DashboardData, getStoredNotifications, type AppNotification, addNotification, markNotificationsRead } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

const statCardColors: Record<string, { bg: string; gradient: string; iconBg: string; iconText: string; borderAccent: string; glowColor: string; hoverShadow: string }> = {
  emerald: {
    bg: 'bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10',
    gradient: 'from-emerald-400 to-emerald-500',
    iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
    iconText: 'text-white',
    borderAccent: 'border-l-emerald-500',
    glowColor: 'hover:shadow-emerald-200/60 dark:hover:shadow-emerald-800/30',
    hoverShadow: 'hover:shadow-lg',
  },
  teal: {
    bg: 'bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/10',
    gradient: 'from-teal-400 to-teal-500',
    iconBg: 'bg-gradient-to-br from-teal-400 to-teal-500',
    iconText: 'text-white',
    borderAccent: 'border-l-teal-500',
    glowColor: 'hover:shadow-teal-200/60 dark:hover:shadow-teal-800/30',
    hoverShadow: 'hover:shadow-lg',
  },
  amber: {
    bg: 'bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10',
    gradient: 'from-amber-400 to-amber-500',
    iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
    iconText: 'text-white',
    borderAccent: 'border-l-amber-500',
    glowColor: 'hover:shadow-amber-200/60 dark:hover:shadow-amber-800/30',
    hoverShadow: 'hover:shadow-lg',
  },
  rose: {
    bg: 'bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10',
    gradient: 'from-rose-400 to-rose-500',
    iconBg: 'bg-gradient-to-br from-rose-400 to-rose-500',
    iconText: 'text-white',
    borderAccent: 'border-l-rose-500',
    glowColor: 'hover:shadow-rose-200/60 dark:hover:shadow-rose-800/30',
    hoverShadow: 'hover:shadow-lg',
  },
  violet: {
    bg: 'bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10',
    gradient: 'from-violet-400 to-violet-500',
    iconBg: 'bg-gradient-to-br from-violet-400 to-violet-500',
    iconText: 'text-white',
    borderAccent: 'border-l-violet-500',
    glowColor: 'hover:shadow-violet-200/60 dark:hover:shadow-violet-800/30',
    hoverShadow: 'hover:shadow-lg',
  },
};

const motivationalTips = [
  { text: 'Consistent tracking leads to better student outcomes.', icon: Target },
  { text: 'Regular progress entries help identify patterns early.', icon: TrendingUp },
  { text: 'Small observations can reveal big insights about learning.', icon: Lightbulb },
  { text: 'Every data point tells a story about student growth.', icon: BookOpen },
  { text: 'Timely feedback empowers students to take ownership.', icon: Star },
  { text: 'Detailed records make parent conversations productive.', icon: MessageSquare },
];

export default function DashboardView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const notificationPrefs = useAppStore((s) => s.notificationPrefs);
  const locale = useAppStore((s) => s.locale);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Pick a daily tip based on the day of the year
  const dailyTip = useMemo(() => {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return motivationalTips[dayOfYear % motivationalTips.length];
  }, []);

  // Current time for "last updated" timestamps
  const currentTime = useMemo(() => {
    const now = new Date();
    return now.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [locale]);

  useEffect(() => {
    async function load() {
      try {
        const d = await fetchDashboard(currentUser?.schoolId ?? undefined);
        setData(d);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
    // Load notifications from localStorage
    setNotifications(getStoredNotifications());
  }, [currentUser?.schoolId]);

  const masteryIcon = (level: number) => {
    const cls = 'w-3.5 h-3.5 inline-block';
    if (level <= 1.5) return <Sprout className={`${cls} text-red-500`} />;
    if (level <= 2.5) return <Leaf className={`${cls} text-amber-500`} />;
    if (level <= 3.5) return <TreePine className={`${cls} text-emerald-500`} />;
    return <Trees className={`${cls} text-teal-500`} />;
  };

  const masteryColor = (level: number) => {
    if (level <= 1.5) return 'text-red-500';
    if (level <= 2.5) return 'text-amber-500';
    if (level <= 3.5) return 'text-emerald-500';
    return 'text-teal-500';
  };

  const masteryBadge = (level: number) => {
    if (level <= 1.5) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
    if (level <= 2.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    if (level <= 3.5) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
    return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
  };

  const masteryDot = (level: number) => {
    if (level <= 1.5) return 'bg-red-500';
    if (level <= 2.5) return 'bg-amber-500';
    if (level <= 3.5) return 'bg-emerald-500';
    return 'bg-teal-500';
  };

  const relativeDate = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return t('date.today');
    if (diffDays === 1) return t('date.yesterday');
    if (diffDays < 7) return t('date.days_ago', { count: diffDays });
    if (diffDays < 30) return t('date.weeks_ago', { count: Math.floor(diffDays / 7) });
    return date.toLocaleDateString();
  };

  const relativeTime = (dateStr: string) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffMins < 1) return locale === 'de' ? 'Gerade eben' : 'Just now';
    if (diffMins < 60) return locale === 'de' ? `Vor ${diffMins} Min.` : `${diffMins}m ago`;
    if (diffHours < 24) return locale === 'de' ? `Vor ${diffHours} Std.` : `${diffHours}h ago`;
    if (diffDays === 1) return t('date.yesterday');
    if (diffDays < 7) return t('date.days_ago', { count: diffDays });
    return date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: '2-digit', month: 'short' });
  };

  // Gradient initials for avatar backgrounds
  const avatarGradients = [
    'from-emerald-400 to-teal-500',
    'from-teal-400 to-cyan-500',
    'from-amber-400 to-orange-500',
    'from-rose-400 to-pink-500',
    'from-violet-400 to-purple-500',
    'from-emerald-500 to-cyan-500',
  ];

  const getAvatarGradient = (name: string) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return avatarGradients[Math.abs(hash) % avatarGradients.length];
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-16">
        <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/30 dark:to-amber-900/20 mx-auto mb-5 shadow-md shadow-rose-200/40 dark:shadow-rose-900/20">
          <AlertTriangle className="h-10 w-10 text-rose-500 dark:text-rose-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('error.generic')}</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-7 pb-8"
    >
      {/* ===== WELCOME HEADER ===== */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-4">
          {/* Top row: welcome + date */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-300 bg-clip-text text-transparent">
                  {t('dashboard.welcome')}, {currentUser?.firstName}!
                </h2>
                <p className="text-emerald-600/60 dark:text-emerald-400/40 mt-0.5 text-sm">{t('dashboard.overview')}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200/40 dark:border-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">{t('polish.today_date')}: </span>
                <span className="font-semibold">
                  {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/60 dark:bg-gray-800/40 border border-emerald-100/50 dark:border-emerald-900/20 text-[11px] text-gray-500 dark:text-gray-400">
                <Clock className="h-3 w-3 text-emerald-500/70" />
                <span>{t('polish.last_login')}: </span>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
                    day: '2-digit',
                    month: 'short',
                  })}{' '}
                  {new Date().toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-GB', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Tip of the day */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-transparent dark:from-emerald-900/15 dark:via-teal-900/10 dark:to-transparent border border-emerald-200/30 dark:border-emerald-800/20"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shrink-0">
              <dailyTip.icon className="h-4 w-4" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
              <span className="font-semibold text-emerald-700 dark:text-emerald-300">{locale === 'de' ? 'Tipp des Tages' : 'Tip of the day'}:</span>{' '}
              {dailyTip.text}
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* ===== QUICK STATS SUMMARY ===== */}
      <motion.div variants={itemVariants}>
        <div className="relative p-4 rounded-xl bg-mesh border border-emerald-200/40 dark:border-emerald-900/30 overflow-hidden backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 via-transparent to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5 pointer-events-none" />
          <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
              <Activity className="h-4 w-4 text-emerald-500" />
              {t('polish.quick_stats')}:
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{data.stats.totalStudents}</span>
              <span className="text-gray-500 dark:text-gray-400">{t('dashboard.total_students').toLowerCase()}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-teal-500" />
              <span className="text-teal-600 dark:text-teal-400 font-semibold">{data.stats.totalClasses}</span>
              <span className="text-gray-500 dark:text-gray-400">{t('dashboard.total_classes').toLowerCase()}</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <PenLine className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-amber-600 dark:text-amber-400 font-semibold">{data.stats.totalProgressEntries}</span>
              <span className="text-gray-500 dark:text-gray-400">{t('dashboard.total_entries').toLowerCase()}</span>
            </span>
            {data.stats.totalAssessments > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <ClipboardCheck className="h-3.5 w-3.5 text-rose-500" />
                <span className="text-rose-600 dark:text-rose-400 font-semibold">{data.stats.totalAssessments}</span>
                <span className="text-gray-500 dark:text-gray-400">{t('dashboard.total_assessments').toLowerCase()}</span>
              </span>
            )}
            {data.stats.totalReports > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-violet-500" />
                <span className="text-violet-600 dark:text-violet-400 font-semibold">{data.stats.totalReports}</span>
                <span className="text-gray-500 dark:text-gray-400">{t('dashboard.total_reports').toLowerCase()}</span>
              </span>
            )}
          </div>
        </div>
      </motion.div>

      {/* ===== SECTION HEADER: KEY METRICS ===== */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <BarChart3 className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {locale === 'de' ? 'Kennzahlen' : 'Key Metrics'}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-emerald-200/60 dark:from-emerald-800/30 to-transparent" />
      </motion.div>

      {/* ===== STATS CARDS ===== */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { icon: Users, label: t('dashboard.total_students'), value: data.stats.totalStudents, color: 'emerald', trend: 'up', tip: t('dashboard.total_students'), spark: [3, 5, 4, 6, 7, 8, data.stats.totalStudents] },
          { icon: BarChart3, label: t('dashboard.total_classes'), value: data.stats.totalClasses, color: 'teal', trend: 'up', tip: t('dashboard.total_classes'), spark: [1, 2, 2, 3, 3, 4, data.stats.totalClasses] },
          { icon: PenLine, label: t('dashboard.total_entries'), value: data.stats.totalProgressEntries, color: 'amber', trend: data.stats.totalProgressEntries > 0 ? 'up' : 'flat', tip: t('dashboard.total_entries'), spark: [2, 4, 3, 6, 5, 8, data.stats.totalProgressEntries] },
          { icon: ClipboardCheck, label: t('dashboard.total_assessments'), value: data.stats.totalAssessments, color: 'rose', trend: 'up', tip: t('dashboard.total_assessments'), spark: [0, 1, 1, 2, 2, 3, data.stats.totalAssessments] },
          { icon: FileText, label: t('dashboard.total_reports'), value: data.stats.totalReports, color: 'violet', trend: data.stats.totalReports > 0 ? 'up' : 'flat', tip: t('dashboard.total_reports'), spark: [0, 0, 1, 1, 2, 2, data.stats.totalReports] },
        ].map((stat) => {
          const colors = statCardColors[stat.color];
          // Build sparkline path
          const sparkPath = (() => {
            const max = Math.max(...stat.spark, 1);
            const min = Math.min(...stat.spark, 0);
            const range = Math.max(max - min, 1);
            const w = 60;
            const h = 18;
            const step = w / Math.max(stat.spark.length - 1, 1);
            return stat.spark
              .map((v, i) => {
                const x = i * step;
                const y = h - ((v - min) / range) * h;
                return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              })
              .join(' ');
          })();
          const sparkColor = stat.color === 'emerald' ? '#10b981'
            : stat.color === 'teal' ? '#14b8a6'
            : stat.color === 'amber' ? '#f59e0b'
            : stat.color === 'rose' ? '#ef4444'
            : '#8b5cf6';

          // Trend percentage for the indicator
          const lastVal = stat.spark[stat.spark.length - 1];
          const prevVal = stat.spark[stat.spark.length - 2] ?? 0;
          const trendPct = prevVal > 0 ? Math.round(((lastVal - prevVal) / prevVal) * 100) : (lastVal > 0 ? 100 : 0);

          return (
            <motion.div
              key={stat.label}
              whileHover={{ scale: 1.03, y: -4 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Card className={`border-0 shadow-sm rounded-xl border-l-3 ${colors.borderAccent} overflow-hidden transition-all duration-300 ${colors.hoverShadow} ${colors.glowColor} cursor-default ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-emerald-200/40 dark:hover:ring-emerald-700/30`}>
                      <CardContent className={`p-5 ${colors.bg}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 leading-tight line-clamp-2 min-h-[28px] break-words min-w-0">
                            {stat.label}
                          </p>
                          <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${colors.iconBg} ${colors.iconText} shadow-md shadow-emerald-200/30 shrink-0`}>
                            <stat.icon className="h-4 w-4" />
                          </div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none">{stat.value}</p>
                          {stat.value > 0 && stat.trend === 'up' && (
                            <div className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-900/30">
                              <ArrowUpRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{trendPct > 0 ? `+${trendPct}%` : ''}</span>
                            </div>
                          )}
                          {stat.value === 0 && (
                            <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">{t('dashboard.start_here')}</span>
                          )}
                        </div>
                        {/* Sparkline */}
                        <div className="mt-2 flex items-end justify-between gap-2">
                          <svg width="72" height="22" viewBox="0 0 72 22" className="overflow-visible" aria-hidden="true">
                            <defs>
                              <linearGradient id={`spark-grad-${stat.color}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={sparkColor} stopOpacity="0.35" />
                                <stop offset="100%" stopColor={sparkColor} stopOpacity="0" />
                              </linearGradient>
                            </defs>
                            <path
                              d={`${sparkPath} L 60 18 L 0 18 Z`}
                              fill={`url(#spark-grad-${stat.color})`}
                              stroke="none"
                            />
                            <path
                              d={sparkPath}
                              className="sparkline-path"
                              stroke={sparkColor}
                              strokeWidth="2.5"
                              fill="none"
                            />
                          </svg>
                          {stat.value === 0 && stat.label === t('dashboard.total_reports') && (
                            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium truncate">{t('dashboard.start_here')}</p>
                          )}
                        </div>
                      </CardContent>
                      {/* Card footer with last updated */}
                      <CardFooter className="px-5 pb-3 pt-0">
                        <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                          <RefreshCw className="h-2.5 w-2.5" />
                          <span>{locale === 'de' ? 'Aktualisiert' : 'Updated'} {currentTime}</span>
                        </div>
                      </CardFooter>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs">
                    <Info className="h-3 w-3 mr-1 inline" />
                    {stat.tip}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ===== WEEKLY SUMMARY CARD ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 via-emerald-50/30 to-transparent dark:from-violet-900/10 dark:via-emerald-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-sm">
                <CalendarDays className="h-4 w-4" />
              </div>
              {t('polish.weekly_summary')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">· {t('polish.this_week_vs_last')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              // Derive weekly stats from recentEntries (this week vs last week)
              const now = new Date();
              const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
              const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
              const thisWeekEntries = data.recentEntries.filter((e) => new Date(e.date) >= weekAgo).length;
              const lastWeekEntries = data.recentEntries.filter((e) => {
                const d = new Date(e.date);
                return d >= twoWeeksAgo && d < weekAgo;
              }).length;
              const delta = thisWeekEntries - lastWeekEntries;
              const deltaPct = lastWeekEntries > 0 ? Math.round((delta / lastWeekEntries) * 100) : (thisWeekEntries > 0 ? 100 : 0);

              const stats = [
                {
                  label: t('polish.this_week'),
                  value: thisWeekEntries,
                  color: 'text-emerald-700 dark:text-emerald-300',
                  bg: 'bg-emerald-50/60 dark:bg-emerald-900/15',
                  border: 'border-emerald-200/40 dark:border-emerald-900/30',
                  iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500',
                  icon: PenLine,
                },
                {
                  label: t('polish.last_week'),
                  value: lastWeekEntries,
                  color: 'text-gray-700 dark:text-gray-300',
                  bg: 'bg-gray-50/60 dark:bg-gray-800/30',
                  border: 'border-gray-200/40 dark:border-gray-700/30',
                  iconBg: 'bg-gradient-to-br from-gray-400 to-gray-500',
                  icon: Clock,
                },
                {
                  label: t('polish.change'),
                  value: `${delta >= 0 ? '+' : ''}${delta}`,
                  pct: deltaPct,
                  color: delta >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300',
                  bg: delta >= 0 ? 'bg-emerald-50/60 dark:bg-emerald-900/15' : 'bg-rose-50/60 dark:bg-rose-900/15',
                  border: delta >= 0 ? 'border-emerald-200/40 dark:border-emerald-900/30' : 'border-rose-200/40 dark:border-rose-900/30',
                  iconBg: delta >= 0 ? 'bg-gradient-to-br from-emerald-400 to-teal-500' : 'bg-gradient-to-br from-rose-400 to-amber-500',
                  icon: delta >= 0 ? ArrowUpRight : ArrowDownRight,
                },
              ];

              return (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {stats.map((s) => {
                      const isUp = s.pct !== undefined && s.pct > 0;
                      const isDown = s.pct !== undefined && s.pct < 0;
                      return (
                        <motion.div
                          key={s.label}
                          whileHover={{ scale: 1.02, y: -2 }}
                          transition={{ duration: 0.18 }}
                          className={`p-4 rounded-xl border ${s.bg} ${s.border} transition-shadow duration-200 hover:shadow-md`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[10px] uppercase tracking-wider font-semibold text-gray-500 dark:text-gray-400">{s.label}</p>
                            <div className={`flex items-center justify-center w-7 h-7 rounded-md ${s.iconBg} text-white shadow-sm`}>
                              <s.icon className="h-3.5 w-3.5" />
                            </div>
                          </div>
                          <div className="flex items-baseline gap-2">
                            <p className={`text-4xl font-bold ${s.color} leading-none`}>{s.value}</p>
                            {s.pct !== undefined && (
                              <span
                                className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                  isUp
                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                                    : isDown
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300'
                                }`}
                                title={isUp ? t('polish.trend_up') : isDown ? t('polish.trend_down') : t('polish.trend_flat')}
                              >
                                {isUp && <ArrowUpRight className="h-3 w-3" />}
                                {isDown && <ArrowDownRight className="h-3 w-3" />}
                                {!isUp && !isDown && <span aria-hidden>→</span>}
                                {s.pct >= 0 ? '+' : ''}{s.pct}%
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                  {/* Mini bar chart comparing this week vs last week */}
                  <div className="p-4 rounded-xl border border-emerald-200/40 dark:border-emerald-900/30 bg-white/40 dark:bg-gray-900/30">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60">
                        {t('polish.this_week_bars')}
                      </p>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-sm bg-emerald-400 dark:bg-emerald-500" />
                          {t('polish.this_week')}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block w-2 h-2 rounded-sm bg-gray-300 dark:bg-gray-600" />
                          {t('polish.last_week')}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-end gap-4 h-20">
                      {[t('date.today'), t('polish.last_week')].map((label, idx) => {
                        const val = idx === 0 ? thisWeekEntries : lastWeekEntries;
                        const max = Math.max(thisWeekEntries, lastWeekEntries, 1);
                        const heightPct = (val / max) * 100;
                        return (
                          <div key={label} className="flex-1 flex flex-col items-center justify-end gap-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{val}</span>
                            <div className="w-full flex justify-center">
                              <div
                                className={`w-full max-w-[60px] rounded-t-md transition-all duration-300 ${
                                  idx === 0
                                    ? 'bg-gradient-to-t from-emerald-400 to-teal-400 dark:from-emerald-600 dark:to-teal-500'
                                    : 'bg-gradient-to-t from-gray-300 to-gray-200 dark:from-gray-700 dark:to-gray-600'
                                }`}
                                style={{ height: `${Math.max(heightPct, 4)}%`, minHeight: '6px' }}
                              />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400 truncate max-w-[80px]">{label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== QUICK ACTION BUTTONS ===== */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap gap-3">
        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
          <Button
            onClick={() => setCurrentView('progress')}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-300/30 rounded-xl px-6 h-11 transition-shadow hover:shadow-xl hover:shadow-emerald-300/40"
          >
            <motion.div
              className="flex items-center gap-2"
              whileHover={{ x: 2 }}
              transition={{ duration: 0.15 }}
            >
              <PenLine className="h-5 w-5" />
              {t('action.log_entry')}
              <ChevronRight className="h-4 w-4 opacity-60" />
            </motion.div>
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
          <Button
            onClick={() => setCurrentView('assessments')}
            variant="outline"
            className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl px-6 h-11 transition-shadow hover:shadow-md hover:shadow-emerald-100/40"
          >
            <ClipboardCheck className="h-5 w-5 mr-2" />
            {t('action.create_assessment')}
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
          <Button
            onClick={() => setCurrentView('reports')}
            variant="outline"
            className="border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-xl px-6 h-11 transition-shadow hover:shadow-md hover:shadow-teal-100/40"
          >
            <FileText className="h-5 w-5 mr-2" />
            {t('action.generate_report')}
          </Button>
        </motion.div>
      </motion.div>

      {/* ===== SECTION HEADER: QUICK ACTIONS ===== */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <Zap className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('dashboard.quick_actions')}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-emerald-200/60 dark:from-emerald-800/30 to-transparent" />
      </motion.div>

      {/* ===== QUICK ACTIONS WIDGET ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 dark:from-emerald-900/10 dark:via-teal-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                <Zap className="h-4 w-4" />
              </div>
              {t('dashboard.quick_actions')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                · {t('dashboard.quick_actions_subtitle')}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                {
                  icon: ClipboardCheck,
                  label: t('action.create_assessment'),
                  desc: t('dashboard.quick_action_assessment_desc'),
                  onClick: () => setCurrentView('assessments'),
                  tile: 'from-emerald-50 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0',
                  border: 'border-emerald-100/60 dark:border-emerald-900/30',
                  iconBg: 'bg-gradient-to-br from-emerald-400 to-emerald-500',
                  iconText: 'text-white',
                  labelColor: 'text-emerald-700 dark:text-emerald-300',
                  hoverGlow: 'hover:shadow-emerald-200/50 dark:hover:shadow-emerald-800/20',
                  recentlyUsed: data.stats.totalAssessments > 0,
                },
                {
                  icon: UserCheck,
                  label: t('dashboard.quick_action_attendance'),
                  desc: t('dashboard.quick_action_attendance_desc'),
                  onClick: () => setCurrentView('attendance'),
                  tile: 'from-teal-50 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0',
                  border: 'border-teal-100/60 dark:border-teal-900/30',
                  iconBg: 'bg-gradient-to-br from-teal-400 to-teal-500',
                  iconText: 'text-white',
                  labelColor: 'text-teal-700 dark:text-teal-300',
                  hoverGlow: 'hover:shadow-teal-200/50 dark:hover:shadow-teal-800/20',
                  recentlyUsed: false,
                },
                {
                  icon: FileText,
                  label: t('action.generate_report'),
                  desc: t('dashboard.quick_action_report_desc'),
                  onClick: () => setCurrentView('reports'),
                  tile: 'from-violet-50 to-violet-50/0 dark:from-violet-900/15 dark:to-violet-900/0',
                  border: 'border-violet-100/60 dark:border-violet-900/30',
                  iconBg: 'bg-gradient-to-br from-violet-400 to-violet-500',
                  iconText: 'text-white',
                  labelColor: 'text-violet-700 dark:text-violet-300',
                  hoverGlow: 'hover:shadow-violet-200/50 dark:hover:shadow-violet-800/20',
                  recentlyUsed: data.stats.totalReports > 0,
                },
                {
                  icon: Bell,
                  label: t('dashboard.quick_action_parent'),
                  desc: t('dashboard.quick_action_parent_desc'),
                  onClick: () => setCurrentView('parents'),
                  tile: 'from-amber-50 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0',
                  border: 'border-amber-100/60 dark:border-amber-900/30',
                  iconBg: 'bg-gradient-to-br from-amber-400 to-amber-500',
                  iconText: 'text-white',
                  labelColor: 'text-amber-700 dark:text-amber-300',
                  hoverGlow: 'hover:shadow-amber-200/50 dark:hover:shadow-amber-800/20',
                  recentlyUsed: false,
                },
              ].map((action) => (
                <motion.button
                  key={action.label}
                  onClick={action.onClick}
                  whileHover={{ scale: 1.03, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className={`group text-left p-4 rounded-xl bg-gradient-to-br ${action.tile} border ${action.border} hover:shadow-lg ${action.hoverGlow} transition-shadow duration-300 relative overflow-hidden`}
                >
                  {/* Subtle glass overlay on hover */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 dark:group-hover:bg-white/5 transition-colors duration-300 pointer-events-none rounded-xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${action.iconBg} ${action.iconText} shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}>
                        <action.icon className="h-5 w-5" />
                      </div>
                      {action.recentlyUsed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-100/60 dark:bg-emerald-900/30 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <Timer className="h-2.5 w-2.5" />
                          {locale === 'de' ? 'Kürzlich' : 'Recent'}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold ${action.labelColor} mb-0.5 line-clamp-2 break-words`}>{action.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-snug line-clamp-2 break-words">{action.desc}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== SECTION HEADER: OVERVIEW ===== */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <GraduationCap className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {locale === 'de' ? 'Uebersicht' : 'Overview'}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-emerald-200/60 dark:from-emerald-800/30 to-transparent" />
      </motion.div>

      {/* ===== MAIN CONTENT GRID ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes overview */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <BookOpen className="h-4 w-4" />
                </div>
                {t('dashboard.classes')}
                {data.classesOverview.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                    {data.classesOverview.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.classesOverview.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 mx-auto mb-4">
                    <Target className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.no_classes')}</p>
                  <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-1">{t('dashboard.start_here')}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-80 overflow-y-auto scrollbar-education pr-1">
                  {data.classesOverview.map((cls, idx) => {
                    // Calculate a pseudo-progress based on student count and entries
                    const totalStudents = cls.studentCount;
                    const maxStudents = Math.max(...data.classesOverview.map(c => c.studentCount), 1);
                    const progressPct = Math.round((totalStudents / maxStudents) * 100);
                    const gradientIdx = idx % avatarGradients.length;

                    return (
                      <motion.div
                        key={cls.id}
                        whileHover={{ scale: 1.01, x: 2 }}
                        transition={{ duration: 0.15 }}
                        className="group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-gray-50/80 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 hover:from-emerald-50/80 hover:to-emerald-50/0 dark:hover:from-emerald-900/20 dark:hover:to-emerald-900/10 transition-colors cursor-pointer border border-gray-100/60 dark:border-gray-800/40 hover:border-emerald-200/60 dark:hover:border-emerald-800/30 relative overflow-hidden"
                        onClick={() => {
                          useAppStore.getState().setCurrentClass(cls.id);
                          setCurrentView('classes');
                        }}
                      >
                        {/* Subtle progress bar at bottom */}
                        <div className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-emerald-400 to-teal-400 dark:from-emerald-600 dark:to-teal-500 transition-all duration-500 group-hover:h-1" style={{ width: `${progressPct}%` }} />

                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${avatarGradients[gradientIdx]} text-white text-xs font-bold shadow-sm shrink-0`}>
                            {cls.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{cls.name}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                              {t('label.grade')} {cls.gradeLevel} · {cls.schoolYear?.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className="bg-emerald-100/80 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium shadow-sm">
                            <Users className="h-3 w-3 mr-1" />
                            {cls.studentCount}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Students needing attention */}
        <motion.div variants={itemVariants}>
          <Card className="h-full border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                </div>
                {t('dashboard.students_attention')}
                {data.studentsNeedingAttention.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                    {data.studentsNeedingAttention.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.studentsNeedingAttention.length === 0 ? (
                <div className="text-center py-8">
                  <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 mx-auto mb-4">
                    <TrendingUp className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.no_students_attention')}</p>
                  <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-1 flex items-center justify-center gap-1"><Award className="w-3.5 h-3.5" /></p>
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-education pr-1">
                  {data.studentsNeedingAttention.map((s) => {
                    const gradient = getAvatarGradient(`${s.firstName}${s.lastName}`);
                    return (
                      <motion.div
                        key={s.id}
                        whileHover={{ scale: 1.01, x: 2 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent border border-amber-100/40 dark:border-amber-900/20 hover:border-amber-200/60 dark:hover:border-amber-800/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} text-white text-xs font-bold shadow-sm shrink-0`}>
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                              {s.firstName} {s.lastName}
                            </p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                              {s.enrollments[0]?.classGroup?.name ?? ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`${masteryBadge(s.averageMastery)} shadow-sm`}>
                            {masteryIcon(s.averageMastery)} Ø {s.averageMastery.toFixed(1)}
                          </Badge>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== SECTION HEADER: RECENT ACTIVITY ===== */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-emerald-400 to-teal-500 text-white">
          <Activity className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('dashboard.recent_activity')}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-emerald-200/60 dark:from-emerald-800/30 to-transparent" />
      </motion.div>

      {/* ===== RECENT ACTIVITY ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <TrendingUp className="h-4 w-4" />
              </div>
              {t('dashboard.recent_activity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.recentEntries.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 mx-auto mb-4">
                  <PenLine className="h-8 w-8 text-teal-400 dark:text-teal-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('dashboard.no_recent_activity')}</p>
                <p className="text-xs text-emerald-600/60 dark:text-emerald-400/40 mt-1">{t('dashboard.start_here')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education pr-1">
                {data.recentEntries.slice(0, typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10).map((entry) => {
                  const catColor = entry.competency.category.color ?? '#10b981';
                  const studentName = `${entry.student.firstName} ${entry.student.lastName}`;
                  const gradient = getAvatarGradient(studentName);
                  return (
                    <motion.div
                      key={entry.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      transition={{ duration: 0.15 }}
                      className="group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-gray-50/80 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border border-gray-100/60 dark:border-gray-800/40 hover:border-emerald-200/60 dark:hover:border-emerald-800/30 transition-colors relative overflow-hidden"
                    >
                      {/* Left border color indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-all duration-200 group-hover:w-1.5" style={{ backgroundColor: catColor }} />

                      <div className="flex items-center gap-3 min-w-0 ml-1.5">
                        {/* Avatar initials with gradient */}
                        <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${gradient} text-white text-xs font-bold shadow-sm`}>
                          {entry.student.firstName[0]}{entry.student.lastName[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {studentName}
                          </p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                            {entry.competency.category.name} → {entry.competency.title}
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <Badge className={`${masteryBadge(entry.masteryLevelValue)} shadow-sm`}>
                          {masteryIcon(entry.masteryLevelValue)} {entry.masteryLevelValue}
                        </Badge>
                        <p className="text-[11px] text-emerald-600/60 dark:text-emerald-400/40 mt-1 flex items-center justify-end gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {relativeTime(entry.date)}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{entry.classGroup.name}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== SECTION HEADER: NOTIFICATIONS ===== */}
      <motion.div variants={itemVariants} className="flex items-center gap-2">
        <div className="flex items-center justify-center w-6 h-6 rounded-md bg-gradient-to-br from-amber-400 to-amber-500 text-white">
          <Bell className="h-3.5 w-3.5" />
        </div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          {t('notification.title')}
        </h3>
        <div className="flex-1 h-px bg-gradient-to-r from-amber-200/60 dark:from-amber-800/30 to-transparent" />
      </motion.div>

      {/* ===== RECENT NOTIFICATIONS ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-400 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Bell className="h-4 w-4" />
                </div>
                {t('notification.title')}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  markNotificationsRead();
                  setNotifications(getStoredNotifications());
                }}
                className="text-amber-600/70 dark:text-amber-400/50 hover:bg-amber-100 dark:hover:bg-amber-900/20 rounded-lg"
              >
                {t('notification.mark_read')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {notifications.filter((n) => {
              const prefs = useAppStore.getState().notificationPrefs;
              if (n.type === 'progress' && !prefs.showProgress) return false;
              if (n.type === 'assessment' && !prefs.showAssessments) return false;
              if (n.type === 'grade' && !prefs.showGrades) return false;
              if (n.type === 'report' && !prefs.showReports) return false;
              return true;
            }).length === 0 ? (
              <div className="text-center py-8">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 mx-auto mb-4">
                  <Bell className="h-8 w-8 text-amber-400 dark:text-amber-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('notification.no_recent')}</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-education pr-1">
                {notifications.filter((n) => {
                  const prefs = useAppStore.getState().notificationPrefs;
                  if (n.type === 'progress' && !prefs.showProgress) return false;
                  if (n.type === 'assessment' && !prefs.showAssessments) return false;
                  if (n.type === 'grade' && !prefs.showGrades) return false;
                  if (n.type === 'report' && !prefs.showReports) return false;
                  return true;
                }).slice(0, 5).map((n) => {
                  const notifColor = n.type === 'progress' ? '#10b981'
                    : n.type === 'assessment' ? '#ef4444'
                    : n.type === 'grade' ? '#f59e0b'
                    : '#14b8a6';
                  return (
                    <motion.div
                      key={n.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-center gap-3 p-3 rounded-xl ${n.read ? 'bg-gray-50/50 dark:bg-gray-800/30' : 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20'} transition-colors relative overflow-hidden`}
                    >
                      {/* Left border color indicator */}
                      <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl" style={{ backgroundColor: notifColor }} />

                      <div className={`shrink-0 flex items-center justify-center w-9 h-9 rounded-lg ml-1 ${
                        n.type === 'progress' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                        n.type === 'assessment' ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600' :
                        n.type === 'grade' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' :
                        'bg-teal-100 dark:bg-teal-900/30 text-teal-600'
                      }`}>
                        {n.type === 'progress' && <PenLine className="h-4 w-4" />}
                        {n.type === 'assessment' && <ClipboardCheck className="h-4 w-4" />}
                        {n.type === 'grade' && <BarChart3 className="h-4 w-4" />}
                        {n.type === 'report' && <FileText className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.message}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {relativeTime(n.timestamp)}
                        </p>
                      </div>
                      {!n.read && (
                        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs shrink-0 shadow-sm">
                          {locale === 'de' ? 'Neu' : 'New'}
                        </Badge>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
