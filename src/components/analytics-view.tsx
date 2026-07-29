'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Flame,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Users,
  PenLine,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  TrendingDown,
  CalendarClock,
  Eye,
  ChevronRight,
  TrendingDown as TrendingDownIcon,
  Hourglass,
  CalendarDays,
  ArrowDownRight,
  ArrowRight,
  Trophy,
  TreePine,
  Flame as FlameIcon,
  AlertCircle,
  PartyPopper,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip as ShadTooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchAnalytics,
  fetchClasses,
  fetchSubjects,
  type AnalyticsData,
  type AnalyticsAtRiskStudent,
  type AnalyticsRiskLevel,
  type AnalyticsRiskSignal,
  type ClassGroup,
  type Subject,
} from '@/lib/api';
import { toast } from 'sonner';

const MASTERY_COLORS: Record<number, string> = {
  1: '#ef4444', // rose
  2: '#f59e0b', // amber
  3: '#10b981', // emerald
  4: '#14b8a6', // teal
};

const HEATMAP_LEVELS = [
  { max: 0, bg: 'bg-gray-100 dark:bg-gray-800/60', label: '0' },
  { max: 1, bg: 'bg-emerald-200/60 dark:bg-emerald-900/30', label: '1' },
  { max: 3, bg: 'bg-emerald-300/70 dark:bg-emerald-700/40', label: '1-3' },
  { max: 6, bg: 'bg-emerald-400/80 dark:bg-emerald-600/60', label: '4-6' },
  { max: 12, bg: 'bg-emerald-500 dark:bg-emerald-500/80', label: '7-12' },
  { max: Infinity, bg: 'bg-teal-600 dark:bg-teal-500/90', label: '13+' },
];

function heatmapClass(count: number): string {
  return HEATMAP_LEVELS.find((l) => count <= l.max)?.bg ?? 'bg-gray-100 dark:bg-gray-800';
}

function formatRelativeDate(iso: string, locale: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatRelativeTime(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diffMs = now - d.getTime();
  const dayMs = 86400000;
  const days = Math.floor(diffMs / dayMs);
  if (locale === 'de') {
    if (days < 1) return 'heute';
    if (days < 2) return 'gestern';
    if (days < 7) return `vor ${days} Tagen`;
    if (days < 30) return `vor ${Math.floor(days / 7)} Wochen`;
    if (days < 365) return `vor ${Math.floor(days / 30)} Monaten`;
    return `vor ${Math.floor(days / 365)} Jahren`;
  }
  if (days < 1) return 'today';
  if (days < 2) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  if (days < 365) return `${Math.floor(days / 30)} months ago`;
  return `${Math.floor(days / 365)} years ago`;
}

function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const RISK_LEVEL_STYLES: Record<
  AnalyticsRiskLevel,
  { badge: string; bar: string; dot: string; pulse?: boolean }
> = {
  low: {
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    bar: 'bg-emerald-500',
    dot: 'bg-emerald-500',
  },
  medium: {
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  high: {
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    bar: 'bg-rose-500',
    dot: 'bg-rose-500',
  },
  critical: {
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    bar: 'bg-red-600',
    dot: 'bg-red-600',
    pulse: true,
  },
};

const SIGNAL_META: Record<
  AnalyticsRiskSignal,
  { icon: React.ReactNode; key: string; chip: string }
> = {
  low_mastery: {
    icon: <TrendingDownIcon className="w-3.5 h-3.5" />,
    key: 'analytics.signal_low_mastery',
    chip: 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300',
  },
  no_recent_progress: {
    icon: <Hourglass className="w-3.5 h-3.5" />,
    key: 'analytics.signal_no_progress',
    chip: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  },
  low_attendance: {
    icon: <CalendarDays className="w-3.5 h-3.5" />,
    key: 'analytics.signal_low_attendance',
    chip: 'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-300',
  },
  declining: {
    icon: <ArrowDownRight className="w-3.5 h-3.5" />,
    key: 'analytics.signal_declining',
    chip: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300',
  },
  };

export default function AnalyticsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const schoolYearId = useAppStore((s) => s.schoolYearId);
  const locale = useAppStore((s) => s.locale);
  const navigateToStudentDetail = useAppStore((s) => s.navigateToStudentDetail);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('365');
  const [gradeTrendRange, setGradeTrendRange] = useState<'12' | '24' | 'all'>('12');
  const [riskFilter, setRiskFilter] = useState<'all' | AnalyticsRiskLevel>('all');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load classes + subjects for filters
  useEffect(() => {
    async function load() {
      try {
        const [cls, subs] = await Promise.all([
          fetchClasses(currentUser?.schoolId ?? undefined, schoolYearId ?? undefined).catch(() => []),
          fetchSubjects(currentUser?.schoolId ?? undefined).catch(() => []),
        ]);
        setClasses(cls);
        setSubjects(subs);
      } catch {
        // ignore
      }
    }
    load();
  }, [currentUser?.schoolId, schoolYearId]);

  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    if (dateRange === 'all') {
      return { startDate: undefined, endDate: undefined };
    }
    const days = parseInt(dateRange, 10);
    start.setDate(start.getDate() - days);
    return {
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
    };
  }, [dateRange]);

  const loadAnalytics = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const d = await fetchAnalytics({
        classGroupId: selectedClassId === 'all' ? undefined : selectedClassId,
        subjectId: selectedSubjectId === 'all' ? undefined : selectedSubjectId,
        schoolYearId: schoolYearId ?? undefined,
        schoolId: currentUser?.schoolId ?? undefined,
        startDate,
        endDate,
      });
      setData(d);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('error.generic');
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSubjectId, schoolYearId, currentUser?.schoolId, startDate, endDate]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const trendData = useMemo(() => {
    if (!data) return [];
    return data.masteryTrend.map((p) => ({
      ...p,
      label: formatRelativeDate(p.date, locale),
    }));
  }, [data, locale]);

  const distData = useMemo(() => {
    if (!data) return [];
    return data.masteryDistribution.map((d) => ({
      ...d,
      name: `${t('analytics.level')} ${d.level}`,
      fill: MASTERY_COLORS[d.level],
    }));
  }, [data]);

  const heatmapWeeks = useMemo(() => {
    if (!data) return [];
    // Group by week (7-day columns) for calendar layout
    type HeatDay = { date: string; count: number; dow: number };
    type HeatWeek = { days: HeatDay[]; weekStart: string };
    const weeks: HeatWeek[] = [];
    let currentWeek: HeatWeek | null = null;
    for (const p of data.activityHeatmap) {
      const d = new Date(p.date);
      const dow = d.getUTCDay(); // 0=Sun
      if (currentWeek === null || dow === 0) {
        if (currentWeek) weeks.push(currentWeek);
        currentWeek = { days: [], weekStart: p.date };
      }
      currentWeek.days.push({ date: p.date, count: p.count, dow });
    }
    if (currentWeek) weeks.push(currentWeek);
    return weeks;
  }, [data]);

  const maxHeatCount = useMemo(() => {
    if (!data) return 0;
    return Math.max(1, ...data.activityHeatmap.map((p) => p.count));
  }, [data]);

  // Grade Trend (sliced by selected range)
  const gradeTrendData = useMemo(() => {
    if (!data) return [];
    const all = data.gradeTrend ?? [];
    if (gradeTrendRange === 'all') return all;
    const n = gradeTrendRange === '12' ? 12 : 24;
    return all.slice(-n);
  }, [data, gradeTrendRange]);

  // At-risk students (filtered by risk level)
  const filteredAtRisk = useMemo<AnalyticsAtRiskStudent[]>(() => {
    if (!data) return [];
    const all = data.atRiskStudents ?? [];
    if (riskFilter === 'all') return all;
    return all.filter((s) => s.riskLevel === riskFilter);
  }, [data, riskFilter]);

  const riskSummary = useMemo(() => {
    const all = data?.atRiskStudents ?? [];
    const critical = all.filter((s) => s.riskLevel === 'critical').length;
    const high = all.filter((s) => s.riskLevel === 'high').length;
    const avg = all.length > 0
      ? Math.round((all.reduce((s, x) => s + x.riskScore, 0) / all.length) * 10) / 10
      : 0;
    return { total: all.length, critical, high, avg };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden relative">
          {/* Decorative gradient banner background */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-violet-500/10 dark:from-emerald-500/15 dark:via-teal-500/10 dark:to-violet-500/15 pointer-events-none" />
          <div className="absolute inset-0 bg-pattern-dots opacity-60 pointer-events-none" />
          <CardContent className="p-5 relative">
            <div className="flex items-start gap-4 flex-wrap">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white ring-2 ring-emerald-200/60 dark:ring-emerald-800/40 shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/40">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-bold gradient-text">{t('analytics.title')}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">{t('analytics.subtitle')}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 backdrop-blur-sm bg-white/60 dark:bg-gray-900/40"
                onClick={loadAnalytics}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                {t('analytics.refresh')}
              </Button>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50 font-semibold">
                  {t('analytics.select_class')}
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="h-8 w-44 rounded-lg text-xs border-emerald-200 dark:border-emerald-900/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('analytics.all_classes')}</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50 font-semibold">
                  {t('analytics.select_subject')}
                </label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="h-8 w-44 rounded-lg text-xs border-emerald-200 dark:border-emerald-900/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('analytics.all_subjects')}</SelectItem>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50 font-semibold">
                  {t('analytics.date_range')}
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="h-8 w-36 rounded-lg text-xs border-emerald-200 dark:border-emerald-900/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">{t('analytics.range_30')}</SelectItem>
                    <SelectItem value="90">{t('analytics.range_90')}</SelectItem>
                    <SelectItem value="180">{t('analytics.range_180')}</SelectItem>
                    <SelectItem value="365">{t('analytics.range_365')}</SelectItem>
                    <SelectItem value="all">{t('analytics.range_all')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Quick stats */}
            {data && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/80 to-emerald-100/40 dark:from-emerald-900/15 dark:to-emerald-800/10 border border-emerald-200/30 dark:border-emerald-900/20 text-center hover:shadow-lg hover:shadow-emerald-100/40 dark:hover:shadow-emerald-900/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <PenLine className="h-4 w-4 text-emerald-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300 animate-count-up" key={`entries-${data.totalEntries}`}>{data.totalEntries}</p>
                  <p className="text-[10px] uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('analytics.entry_count')}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-teal-50/80 to-teal-100/40 dark:from-teal-900/15 dark:to-teal-800/10 border border-teal-200/30 dark:border-teal-900/20 text-center hover:shadow-lg hover:shadow-teal-100/40 dark:hover:shadow-teal-900/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Activity className="h-4 w-4 text-teal-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-teal-700 dark:text-teal-300 animate-count-up" key={`avg-${data.overallAvgMastery}`}>{data.overallAvgMastery.toFixed(2)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-teal-600/60 dark:text-teal-400/40">{t('analytics.avg_mastery')} <span className="text-[8px] normal-case tracking-normal opacity-70">{t('analytics.level_range')}</span></p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.19 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-amber-50/80 to-amber-100/40 dark:from-amber-900/15 dark:to-amber-800/10 border border-amber-200/30 dark:border-amber-900/20 text-center hover:shadow-lg hover:shadow-amber-100/40 dark:hover:shadow-amber-900/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Users className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-lg font-bold text-amber-700 dark:text-amber-300 animate-count-up" key={`students-${data.totalStudents}`}>{data.totalStudents}</p>
                  <p className="text-[10px] uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">{t('analytics.student_count')}</p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.26 }}
                  className="p-4 rounded-xl bg-gradient-to-br from-violet-50/80 to-violet-100/40 dark:from-violet-900/15 dark:to-violet-800/10 border border-violet-200/30 dark:border-violet-900/20 text-center hover:shadow-lg hover:shadow-violet-100/40 dark:hover:shadow-violet-900/20 hover:-translate-y-0.5 transition-all duration-200"
                >
                  <Layers className="h-4 w-4 text-violet-500 mx-auto mb-1" />
                  <TooltipProvider>
                    <ShadTooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <p className="text-lg font-bold text-violet-700 dark:text-violet-300 animate-count-up" key={`weeks-${data.masteryTrend.length}`}>{data.masteryTrend.length}</p>
                          <p className="text-[10px] uppercase tracking-wider text-violet-600/60 dark:text-violet-400/40">{t('analytics.week')}</p>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {t('analytics.calendar_week_full')}
                      </TooltipContent>
                    </ShadTooltip>
                  </TooltipProvider>
                </motion.div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {loading && !data ? (
        <div className="space-y-4">
          <div className="h-28 rounded-xl shimmer" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl shimmer" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      ) : error ? (
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="py-12 text-center">
            <p className="text-rose-600 dark:text-rose-400">{error}</p>
            <Button variant="outline" className="mt-4 rounded-xl" onClick={loadAnalytics}>
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('analytics.refresh')}
            </Button>
          </CardContent>
        </Card>
      ) : data && data.totalEntries === 0 ? (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-0 shadow-sm rounded-xl">
          <CardContent className="py-16 text-center">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.3 }}
              className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20"
            >
              <BarChart3 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </motion.div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('analytics.no_data_hint')}</p>
          </CardContent>
        </Card>
        </motion.div>
      ) : data ? (
        <>
          {/* Insights */}
          {(() => {
            const insights: Array<{ icon: string; text: string; tone: 'emerald' | 'amber' | 'violet' | 'rose' | 'teal' }> = [];
            // Trend insight: compare first vs last mastery data point
            if (data.masteryTrend.length >= 2) {
              const first = data.masteryTrend[0].avgMastery;
              const last = data.masteryTrend[data.masteryTrend.length - 1].avgMastery;
              const delta = last - first;
              const deltaPct = first > 0 ? Math.round((delta / first) * 100) : 0;
              if (delta > 0.05) {
                insights.push({
                  icon: <TrendingUp className="w-3.5 h-3.5" />,
                  text: t('polish.insight_mastery_up', { pct: deltaPct }),
                  tone: 'emerald',
                });
              } else if (delta < -0.05) {
                insights.push({
                  icon: <TrendingDownIcon className="w-3.5 h-3.5" />,
                  text: t('polish.insight_mastery_down', { pct: Math.abs(deltaPct) }),
                  tone: 'amber',
                });
              } else {
                insights.push({
                  icon: <ArrowRight className="w-3.5 h-3.5" />,
                  text: t('polish.insight_mastery_stable'),
                  tone: 'teal',
                });
              }
            }
            // Top class insight
            if (data.classComparison.length > 0) {
              const top = [...data.classComparison].sort((a, b) => b.avgMastery - a.avgMastery)[0];
              insights.push({
                icon: <Trophy className="w-3.5 h-3.5" />,
                text: t('polish.insight_top_class', { class: top.className, avg: top.avgMastery.toFixed(2) }),
                tone: 'violet',
              });
            }
            // Distribution insight: highest level
            if (data.masteryDistribution.length > 0) {
              const total = data.masteryDistribution.reduce((s, d) => s + d.count, 0);
              if (total > 0) {
                const mastered = data.masteryDistribution.filter((d) => d.level >= 3).reduce((s, d) => s + d.count, 0);
                const pct = Math.round((mastered / total) * 100);
                insights.push({
                  icon: <TreePine className="w-3.5 h-3.5" />,
                  text: t('polish.insight_mastered_pct', { pct }),
                  tone: 'emerald',
                });
              }
            }
            // Activity insight: most active day from heatmap
            if (data.activityHeatmap.length > 0) {
              const mostActive = [...data.activityHeatmap].sort((a, b) => b.count - a.count)[0];
              if (mostActive.count > 0) {
                const date = new Date(mostActive.date).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' });
                insights.push({
                  icon: <FlameIcon className="w-3.5 h-3.5" />,
                  text: t('polish.insight_peak_day', { date, count: mostActive.count }),
                  tone: 'rose',
                });
              }
            }
            // Needs-attention insight: lowest competency
            if (data.bottomCompetencies.length > 0) {
              const lowest = data.bottomCompetencies[0];
              insights.push({
                icon: <AlertCircle className="w-3.5 h-3.5" />,
                text: t('polish.insight_focus', { comp: lowest.code, avg: lowest.avgMastery.toFixed(2) }),
                tone: 'amber',
              });
            }

            const toneClasses: Record<string, { card: string; border: string; iconBg: string }> = {
              emerald: { card: 'bg-emerald-50/60 dark:bg-emerald-900/15 border-emerald-200/50 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300', border: 'border-l-emerald-500', iconBg: 'bg-gradient-to-br from-emerald-400 to-teal-500' },
              amber: { card: 'bg-amber-50/60 dark:bg-amber-900/15 border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-300', border: 'border-l-amber-500', iconBg: 'bg-gradient-to-br from-amber-400 to-orange-500' },
              violet: { card: 'bg-violet-50/60 dark:bg-violet-900/15 border-violet-200/50 dark:border-violet-900/30 text-violet-700 dark:text-violet-300', border: 'border-l-violet-500', iconBg: 'bg-gradient-to-br from-violet-400 to-purple-500' },
              rose: { card: 'bg-rose-50/60 dark:bg-rose-900/15 border-rose-200/50 dark:border-rose-900/30 text-rose-700 dark:text-rose-300', border: 'border-l-rose-500', iconBg: 'bg-gradient-to-br from-rose-400 to-pink-500' },
              teal: { card: 'bg-teal-50/60 dark:bg-teal-900/15 border-teal-200/50 dark:border-teal-900/30 text-teal-700 dark:text-teal-300', border: 'border-l-teal-500', iconBg: 'bg-gradient-to-br from-teal-400 to-cyan-500' },
            };

            if (insights.length === 0) return null;

            return (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 via-emerald-50/30 to-transparent dark:from-violet-900/10 dark:via-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-500 text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      {t('polish.insights_title')}
                      <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium">
                        {insights.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="max-h-[400px] pr-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pr-1">
                        {insights.map((insight, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: Math.min(0.15 + i * 0.06, 0.6) }}
                            whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            className={`p-3 rounded-lg border-l-3 ${toneClasses[insight.tone].border} ${toneClasses[insight.tone].card} flex items-start gap-3 transition-shadow duration-200`}
                          >
                            <span className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-white ${toneClasses[insight.tone].iconBg}`}>{insight.icon}</span>
                            <p className="text-xs font-medium leading-snug">{insight.text}</p>
                          </motion.div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })()}

          {/* Mastery trend */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                {t('analytics.mastery_trend')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                  · {t('analytics.mastery_trend_desc')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trendData.length === 0 ? (
                <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('analytics.no_data')}</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="masteryTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
                    <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={5} />
                    <RTooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      formatter={(value: number, _name, item) => {
                        const p = (item?.payload ?? {}) as { avgMastery?: number };
                        return [
                          `${(p.avgMastery ?? value).toFixed(2)}`,
                          t('analytics.avg_mastery'),
                        ];
                      }}
                      labelFormatter={(label, payload) => {
                        const p = (payload?.[0]?.payload ?? {}) as { count?: number };
                        return `${label} · ${p.count ?? 0} ${t('analytics.entry_count')}`;
                      }}
                    />
                    {/* Area fill under the line */}
                    <Line
                      type="monotone"
                      dataKey="avgMastery"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fill="url(#masteryTrendGradient)"
                      dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Grade Trend Over Time (ComposedChart) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 accent-top-teal overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 via-emerald-50/30 to-transparent dark:from-teal-900/10 dark:via-emerald-900/10 dark:to-transparent">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                    {t('analytics.grade_trend')}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                      · {t('analytics.grade_trend_desc')}
                    </span>
                  </CardTitle>
                  {/* Time range selector */}
                  <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800/60">
                    {(['12', '24', 'all'] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setGradeTrendRange(opt)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          gradeTrendRange === opt
                            ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                        }`}
                      >
                        {opt === '12'
                          ? t('analytics.range_12_weeks')
                          : opt === '24'
                          ? t('analytics.range_24_weeks')
                          : t('analytics.range_all')}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {gradeTrendData.length === 0 ? (
                  <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('analytics.no_data')}</p>
                ) : (
                  <>
                    <div className="h-[300px] lg:h-[400px] w-full pr-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={gradeTrendData}
                          margin={{ top: 10, right: 24, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="gradeTrendBar" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="weekLabel"
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            interval="preserveStartEnd"
                            minTickGap={8}
                          />
                          <YAxis
                            yAxisId="mastery"
                            domain={[0, 4]}
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            tickCount={5}
                            stroke="#9ca3af"
                          />
                          <YAxis
                            yAxisId="count"
                            orientation="right"
                            tick={{ fontSize: 10, fill: '#9ca3af' }}
                            stroke="#9ca3af"
                            allowDecimals={false}
                          />
                          <RTooltip
                            cursor={{ fill: 'rgba(16, 185, 129, 0.08)' }}
                            contentStyle={{
                              borderRadius: '12px',
                              border: '1px solid #a7f3d0',
                              background: '#ffffff',
                              fontSize: '12px',
                              padding: '12px',
                              boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.18)',
                            }}
                            itemStyle={{ color: '#0f172a', padding: '2px 0' }}
                            labelStyle={{ color: '#047857', fontWeight: 600, marginBottom: '4px' }}
                            formatter={(value: number, name: string, item) => {
                              const p = (item?.payload ?? {}) as {
                                avgMastery?: number;
                                classAvg?: number;
                                entryCount?: number;
                                uniqueStudents?: number;
                                week?: string;
                              };
                              if (name === t('analytics.entry_count')) {
                                return [
                                  `${p.entryCount ?? 0} · ${p.uniqueStudents ?? 0} ${t('analytics.unique_students')}`,
                                  t('analytics.entry_count'),
                                ];
                              }
                              if (name === t('analytics.school_avg')) {
                                return [`${(p.avgMastery ?? value).toFixed(2)}`, t('analytics.school_avg')];
                              }
                              if (name === t('analytics.class_avg')) {
                                return [`${(p.classAvg ?? value).toFixed(2)}`, t('analytics.class_avg')];
                              }
                              return [String(value), name];
                            }}
                            labelFormatter={(_label, payload) => {
                              const p = (payload?.[0]?.payload ?? {}) as { week?: string };
                              return p.week ?? '';
                            }}
                          />
                          <Legend
                            wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                            iconType="circle"
                          />
                          <ReferenceLine
                            y={2.0}
                            yAxisId="mastery"
                            stroke="#ef4444"
                            strokeDasharray="4 4"
                            strokeWidth={1.5}
                            label={{
                              value: t('analytics.min_standard'),
                              position: 'insideTopRight',
                              fill: '#ef4444',
                              fontSize: 10,
                            }}
                          />
                          <Bar
                            yAxisId="count"
                            dataKey="entryCount"
                            name={t('analytics.entry_count')}
                            fill="url(#gradeTrendBar)"
                            radius={[3, 3, 0, 0]}
                            barSize={14}
                          />
                          <Line
                            yAxisId="mastery"
                            type="monotone"
                            dataKey="avgMastery"
                            name={t('analytics.school_avg')}
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 3, fill: '#10b981', stroke: '#fff', strokeWidth: 1.5 }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            yAxisId="mastery"
                            type="monotone"
                            dataKey="classAvg"
                            name={t('analytics.class_avg')}
                            stroke="#6b7280"
                            strokeWidth={2}
                            strokeDasharray="6 4"
                            dot={false}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                    {/* Legend extras */}
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-gradient-to-b from-emerald-400/60 to-emerald-400/20" />
                        {t('analytics.entry_count')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded-sm bg-emerald-500" />
                        {t('analytics.school_avg')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded-sm border-t-2 border-dashed border-gray-400" />
                        {t('analytics.class_avg')}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-3 h-0.5 rounded-sm border-t-2 border-dashed border-rose-500" />
                        {t('analytics.min_standard')} (2.0)
                      </span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Risk Level Distribution mini-widget (below grade-trend chart) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
          >
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-sm">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  {t('analytics.risk_distribution_title')}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                    · {t('analytics.risk_distribution_desc')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const all = data.atRiskStudents ?? [];
                  const total = all.length;
                  const counts: Record<AnalyticsRiskLevel, number> = {
                    low: all.filter((s) => s.riskLevel === 'low').length,
                    medium: all.filter((s) => s.riskLevel === 'medium').length,
                    high: all.filter((s) => s.riskLevel === 'high').length,
                    critical: all.filter((s) => s.riskLevel === 'critical').length,
                  };
                  const max = Math.max(1, ...Object.values(counts));
                  const rows: { level: AnalyticsRiskLevel; key: string; bar: string; text: string }[] = [
                    { level: 'low', key: 'analytics.risk_low', bar: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
                    { level: 'medium', key: 'analytics.risk_medium', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
                    { level: 'high', key: 'analytics.risk_high', bar: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-300' },
                    { level: 'critical', key: 'analytics.risk_critical', bar: 'bg-red-600', text: 'text-red-700 dark:text-red-300' },
                  ];
                  if (total === 0) {
                    return (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-3 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
                          <Sparkles className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                        </div>
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                          {t('analytics.all_good')}
                        </p>
                      </motion.div>
                    );
                  }
                  return (
                    <div className="space-y-2.5">
                      {rows.map((row) => {
                        const count = counts[row.level];
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        const width = Math.round((count / max) * 100);
                        return (
                          <div key={row.level} className="flex items-center gap-3">
                            <div className="w-24 shrink-0 flex items-center gap-1.5">
                              <span className={`inline-block w-2.5 h-2.5 rounded-full ${row.bar} ${row.level === 'critical' ? 'animate-pulse' : ''}`} />
                              <span className={`text-[11px] font-semibold ${row.text}`}>{t(row.key)}</span>
                            </div>
                            <div className="flex-1 h-3.5 rounded-full bg-gray-100 dark:bg-gray-800/60 overflow-hidden min-w-0 shadow-inner">
                              <div
                                className={`h-full rounded-full ${row.bar} transition-all duration-500`}
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <div className="w-16 shrink-0 text-right">
                              <span className={`text-xs font-bold ${row.text}`}>{count}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                      <div className="pt-2 mt-2 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">
                          {t('analytics.total_at_risk')}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{total}</span>
                      </div>
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Class comparison */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 accent-top-teal overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  {t('analytics.class_comparison')}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                    · {t('analytics.class_comparison_desc')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.classComparison.length === 0 ? (
                  <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('analytics.no_classes')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data.classComparison} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="className" tick={{ fontSize: 10, fill: '#6b7280' }} />
                      <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={5} />
                      <RTooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        formatter={(value: number, _name, item) => {
                          const p = (item?.payload ?? {}) as { avgMastery?: number };
                          return [
                            `${(p.avgMastery ?? value).toFixed(2)}`,
                            t('analytics.avg_mastery'),
                          ];
                        }}
                        labelFormatter={(label, payload) => {
                          const p = (payload?.[0]?.payload ?? {}) as { studentCount?: number };
                          return `${label} · ${p.studentCount ?? 0} ${t('analytics.student_count')}`;
                        }}
                      />
                      <Bar dataKey="avgMastery" radius={[6, 6, 0, 0]}>
                        {data.classComparison.map((entry, idx) => (
                          <Cell
                            key={`cell-${idx}`}
                            fill={entry.avgMastery >= 3 ? '#10b981' : entry.avgMastery >= 2 ? '#f59e0b' : '#ef4444'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Mastery distribution (donut) */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 accent-top-amber overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                    <PieChartIcon className="h-4 w-4" />
                  </div>
                  {t('analytics.mastery_distribution')}
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                    · {t('analytics.mastery_distribution_desc')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {distData.length === 0 ? (
                  <p className="text-center py-10 text-sm text-gray-500 dark:text-gray-400">{t('analytics.no_data')}</p>
                ) : (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={distData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="count"
                        nameKey="name"
                      >
                        {distData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <RTooltip
                        contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                        formatter={(value: number, _name, item) => {
                          const p = item?.payload as { percentage?: number; level?: number } | undefined;
                          return [`${value} (${p?.percentage ?? 0}%)`, `${t('analytics.level')} ${p?.level ?? ''}`];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top / Bottom competencies */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <ArrowUp className="h-4 w-4" />
                  </div>
                  {t('analytics.top_competencies')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.topCompetencies.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-3 shadow-md">
                      <ArrowUp className="h-7 w-7 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.no_competencies')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.topCompetencies.map((c, i) => (
                      <div
                        key={c.competencyId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/15 dark:to-transparent border border-emerald-200/30 dark:border-emerald-900/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-bold">
                          #{i + 1}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {c.code} — {c.title}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {c.entryCount} {t('analytics.entry_count')}
                          </p>
                        </div>
                        <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-xs">
                          {c.avgMastery.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 accent-top-rose overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                    <ArrowDown className="h-4 w-4" />
                  </div>
                  {t('analytics.bottom_competencies')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.bottomCompetencies.length === 0 ? (
                  <div className="py-8 text-center">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-100 to-pink-100 dark:from-rose-900/30 dark:to-pink-900/30 mx-auto mb-3 shadow-md">
                      <ArrowDown className="h-7 w-7 text-rose-500 dark:text-rose-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('analytics.no_competencies')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {data.bottomCompetencies.map((c, i) => (
                      <div
                        key={c.competencyId}
                        className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/15 dark:to-transparent border border-rose-200/30 dark:border-rose-900/20 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                      >
                        <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 text-xs font-bold">
                          #{i + 1}
                        </Badge>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {c.code} — {c.title}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">
                            {c.entryCount} {t('analytics.entry_count')}
                          </p>
                        </div>
                        <Badge
                          className={`text-xs ${
                            c.avgMastery < 2
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                              : c.avgMastery < 3
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                          }`}
                        >
                          {c.avgMastery.toFixed(2)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Activity heatmap */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 accent-top-violet overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                  <Flame className="h-4 w-4" />
                </div>
                {t('analytics.activity_heatmap')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                  · {t('analytics.activity_heatmap_desc')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto scrollbar-education pb-2">
                <div className="inline-flex flex-col gap-1 min-w-min">
                  {/* Month labels */}
                  <div className="flex gap-1 pl-1">
                    <div className="w-3" />
                    {heatmapWeeks.map((wk, idx) => {
                      const firstDay = wk.days[0];
                      if (!firstDay) {
                        return <div key={`wk-${idx}`} className="w-3.5" />;
                      }
                      const date = new Date(firstDay.date);
                      const showMonthLabel = idx === 0 || (idx > 0 && new Date(heatmapWeeks[idx - 1].days[0]?.date ?? firstDay.date).getUTCMonth() !== date.getUTCMonth());
                      return (
                        <div key={`wk-${idx}`} className="w-3.5 text-[8px] text-gray-400 dark:text-gray-500 text-center font-medium">
                          {showMonthLabel ? date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'short' }) : ''}
                        </div>
                      );
                    })}
                  </div>
                  {/* Heatmap grid */}
                  {Array.from({ length: 7 }).map((_, dowIdx) => (
                    <div key={`dow-${dowIdx}`} className="flex items-center gap-1">
                      <div className="w-3 text-[8px] text-gray-400 dark:text-gray-500 text-right pr-1">
                        {['', 'M', '', 'W', '', 'F', ''][dowIdx]}
                      </div>
                      {heatmapWeeks.map((wk, widx) => {
                        const day = wk.days.find((d) => d.dow === dowIdx);
                        if (!day) {
                          return <div key={`empty-${widx}-${dowIdx}`} className="w-3.5 h-3.5 rounded-sm" />;
                        }
                        return (
                          <div
                            key={`d-${widx}-${dowIdx}`}
                            className={`w-3.5 h-3.5 rounded-sm transition-all hover:scale-125 hover:ring-1 hover:ring-emerald-300 cursor-default ${heatmapClass(day.count)}`}
                            title={`${day.date}: ${day.count} ${t('analytics.entry_count')}`}
                          />
                        );
                      })}
                    </div>
                  ))}
                  {/* Legend */}
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 dark:text-gray-400 mt-3 pl-4 flex-wrap">
                    <span>{t('analytics.less')}</span>
                    <div className={`w-3 h-3 rounded-sm ${HEATMAP_LEVELS[0].bg}`} />
                    <div className={`w-3 h-3 rounded-sm ${HEATMAP_LEVELS[1].bg}`} />
                    <div className={`w-3 h-3 rounded-sm ${HEATMAP_LEVELS[2].bg}`} />
                    <div className={`w-3 h-3 rounded-sm ${HEATMAP_LEVELS[3].bg}`} />
                    <div className={`w-3 h-3 rounded-sm ${HEATMAP_LEVELS[4].bg}`} />
                    <div className={`w-3 h-3 rounded-sm ${HEATMAP_LEVELS[5].bg}`} />
                    <span>{t('analytics.more')}</span>
                    <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50/60 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300">
                      <Calendar className="h-3 w-3" />
                      max {maxHeatCount} / Tag
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Risk Analysis: Students Needing Support */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 accent-top-rose overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 via-amber-50/30 to-transparent dark:from-rose-900/10 dark:via-amber-900/10 dark:to-transparent">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-amber-500 text-white shadow-sm">
                      <ShieldAlert className="h-4 w-4" />
                    </div>
                    {t('analytics.risk_analysis')}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                      · {t('analytics.risk_analysis_desc')}
                    </span>
                  </CardTitle>
                  {/* Risk level filter */}
                  <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as typeof riskFilter)}>
                    <SelectTrigger className="h-8 w-44 rounded-lg text-xs border-rose-200 dark:border-rose-900/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('analytics.filter_all')}</SelectItem>
                      <SelectItem value="critical">{t('analytics.risk_critical')}</SelectItem>
                      <SelectItem value="high">{t('analytics.risk_high')}</SelectItem>
                      <SelectItem value="medium">{t('analytics.risk_medium')}</SelectItem>
                      <SelectItem value="low">{t('analytics.risk_low')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {/* Summary stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                  <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20 text-center">
                    <AlertTriangle className="h-4 w-4 text-rose-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{riskSummary.total}</p>
                    <p className="text-[10px] uppercase tracking-wider text-rose-600/60 dark:text-rose-400/40">
                      {t('analytics.total_at_risk')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/30 dark:border-red-900/20 text-center">
                    <span className="block h-4 w-4 mx-auto mb-1 relative">
                      <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-60" />
                      <span className="absolute inset-0 rounded-full bg-red-600" />
                    </span>
                    <p className="text-lg font-bold text-red-700 dark:text-red-300">{riskSummary.critical}</p>
                    <p className="text-[10px] uppercase tracking-wider text-red-600/60 dark:text-red-400/40">
                      {t('analytics.critical_count')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20 text-center">
                    <span className="block h-4 w-4 mx-auto mb-1 rounded-full bg-rose-500" />
                    <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{riskSummary.high}</p>
                    <p className="text-[10px] uppercase tracking-wider text-rose-600/60 dark:text-rose-400/40">
                      {t('analytics.high_count')}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20 text-center">
                    <TrendingDown className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                    <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{riskSummary.avg}</p>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">
                      {t('analytics.avg_risk_score')}
                    </p>
                  </div>
                </div>

                {/* Table or empty state */}
                {filteredAtRisk.length === 0 ? (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="py-12 text-center">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-4 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
                      <Sparkles className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                      {t('analytics.all_good')}
                    </p>
                  </motion.div>
                ) : (
                  <div className="rounded-xl border border-rose-200/40 dark:border-rose-900/30 overflow-hidden max-h-[28rem] overflow-y-auto scrollbar-education">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                        <TableRow className="border-rose-200/40 dark:border-rose-900/30">
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t('analytics.student_count')}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t('analytics.class_comparison')}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t('analytics.risk_level')}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            {t('analytics.risk_score')}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden md:table-cell">
                            {t('analytics.signals')}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden sm:table-cell">
                            {t('analytics.latest_mastery')}
                          </TableHead>
                          <TableHead className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                            {t('analytics.last_activity')}
                          </TableHead>
                          <TableHead className="w-10" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAtRisk.map((s, i) => {
                          const style = RISK_LEVEL_STYLES[s.riskLevel];
                          return (
                            <motion.tr
                              key={s.studentId}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.05 + i * 0.04 }}
                              className="border-b border-rose-100/60 dark:border-rose-900/20 hover:bg-rose-50/30 dark:hover:bg-rose-900/10 transition-colors"
                            >
                              <TableCell>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <Avatar className="h-8 w-8 ring-2 ring-white dark:ring-gray-900 shadow-sm shrink-0">
                                    <AvatarFallback className={`text-[11px] font-bold ${style.badge}`}>
                                      {initials(s.studentName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0">
                                    <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[12rem]">
                                      {s.studentName}
                                    </p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 md:hidden">
                                      {s.className || '—'}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {s.className ? (
                                  <Badge variant="outline" className="text-[10px] font-medium border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                                    {s.className}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${style.badge} ${style.pulse ? 'ring-2 ring-red-400/40 animate-pulse' : ''}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                  {t(`analytics.risk_${s.riskLevel}`)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-[5rem]">
                                  <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden min-w-[2.5rem]">
                                    <div
                                      className={`h-full rounded-full ${style.bar} transition-all`}
                                      style={{ width: `${Math.min(100, s.riskScore)}%` }}
                                    />
                                  </div>
                                  <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">
                                    {s.riskScore}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell">
                                <div className="flex flex-wrap gap-1 max-w-[14rem]">
                                  {s.signals.map((sig) => {
                                    const meta = SIGNAL_META[sig];
                                    return (
                                      <span
                                        key={sig}
                                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${meta.chip}`}
                                        title={t(meta.key)}
                                      >
                                        <span className="flex items-center">{meta.icon}</span>
                                        <span className="hidden xl:inline">{t(meta.key)}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                {s.latestMastery > 0 ? (
                                  <Badge
                                    className={`text-[10px] font-semibold ${
                                      s.latestMastery < 2
                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                        : s.latestMastery < 3
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                    }`}
                                  >
                                    {s.latestMastery.toFixed(2)}
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-gray-400">{t('analytics.no_recent_activity')}</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400">
                                  <CalendarClock className="h-3 w-3" />
                                  {formatRelativeTime(s.latestEntryDate, locale)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 rounded-lg text-[11px] text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30"
                                  onClick={() => navigateToStudentDetail(s.studentId, 'analytics')}
                                >
                                  <Eye className="h-3 w-3 mr-0.5" />
                                  <span className="hidden sm:inline">{t('analytics.details')}</span>
                                  <ChevronRight className="h-3 w-3 sm:hidden" />
                                </Button>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      ) : null}
    </div>
  );
}
