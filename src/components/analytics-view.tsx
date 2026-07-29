'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  Area,
  AreaChart,
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
  School,
  Download,
  Printer,
  FileSpreadsheet,
  Image as ImageIcon,
  BookOpen,
  UserCheck,
  GraduationCap,
  Target,
  Brain,
  Radar as RadarIcon,
  Grid3x3,
  BarChartHorizontal,
  ArrowUpRight,
  Heart,
  Search,
  ChevronDown,
  Keyboard,
  Accessibility,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
  1: '#ef4444',
  2: '#f59e0b',
  3: '#10b981',
  4: '#14b8a6',
};

const CHART_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

const RADAR_COLORS = ['#10b981', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899'];

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

type AnalyticsTab = 'school' | 'performance' | 'class' | 'teacher' | 'predictive' | 'export';

const TAB_META: { key: AnalyticsTab; icon: React.ReactNode; labelKey: string }[] = [
  { key: 'school', icon: <School className="w-4 h-4" />, labelKey: 'analytics.section_school' },
  { key: 'performance', icon: <TrendingUp className="w-4 h-4" />, labelKey: 'analytics.section_performance' },
  { key: 'class', icon: <BarChart3 className="w-4 h-4" />, labelKey: 'analytics.section_class' },
  { key: 'teacher', icon: <GraduationCap className="w-4 h-4" />, labelKey: 'analytics.section_teacher' },
  { key: 'predictive', icon: <Brain className="w-4 h-4" />, labelKey: 'analytics.section_predictive' },
  { key: 'export', icon: <Download className="w-4 h-4" />, labelKey: 'analytics.section_export' },
];

// ── Count-up hook ──
function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const prefersReduced = useReducedMotion();
  useEffect(() => {
    if (prefersReduced || target === 0) {
      setValue(target);
      return;
    }
    let start = 0;
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target * 100) / 100);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }, [target, duration, prefersReduced]);
  return value;
}

// ── Stat Card Component ──
function StatCard({ icon, label, value, suffix, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: 'emerald' | 'teal' | 'amber' | 'violet' | 'rose';
}) {
  const displayValue = useCountUp(value);
  const colorMap = {
    emerald: 'from-emerald-50/80 to-emerald-100/40 dark:from-emerald-900/15 dark:to-emerald-800/10 border-emerald-200/30 dark:border-emerald-900/20 text-emerald-700 dark:text-emerald-300',
    teal: 'from-teal-50/80 to-teal-100/40 dark:from-teal-900/15 dark:to-teal-800/10 border-teal-200/30 dark:border-teal-900/20 text-teal-700 dark:text-teal-300',
    amber: 'from-amber-50/80 to-amber-100/40 dark:from-amber-900/15 dark:to-amber-800/10 border-amber-200/30 dark:border-amber-900/20 text-amber-700 dark:text-amber-300',
    violet: 'from-violet-50/80 to-violet-100/40 dark:from-violet-900/15 dark:to-violet-800/10 border-violet-200/30 dark:border-violet-900/20 text-violet-700 dark:text-violet-300',
    rose: 'from-rose-50/80 to-rose-100/40 dark:from-rose-900/15 dark:to-rose-800/10 border-rose-200/30 dark:border-rose-900/20 text-rose-700 dark:text-rose-300',
  };
  const iconColorMap = {
    emerald: 'text-emerald-500',
    teal: 'text-teal-500',
    amber: 'text-amber-500',
    violet: 'text-violet-500',
    rose: 'text-rose-500',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`stat-card p-4 rounded-xl bg-gradient-to-br ${colorMap[color]} border text-center`}
      role="figure"
      aria-label={`${label}: ${value}${suffix ?? ''}`}
    >
      <div className={`mx-auto mb-1 ${iconColorMap[color]}`}>{icon}</div>
      <p className="text-lg font-bold animate-count-up" key={`${label}-${value}`}>
        {Number.isInteger(value) ? displayValue : displayValue.toFixed(2)}
        {suffix && <span className="text-sm font-normal ml-0.5">{suffix}</span>}
      </p>
      <p className="text-[10px] uppercase tracking-wider opacity-60">{label}</p>
    </motion.div>
  );
}

// ── Empty State Component ──
function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="py-12 text-center" role="status">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-4 shadow-md">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">{description}</p>
    </div>
  );
}

// ── Chart Skeleton ──
function ChartSkeleton() {
  return (
    <div className="loading-skeleton-chart" aria-hidden="true">
      <div className="flex items-end gap-2 p-4 h-full">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-emerald-200/40 dark:bg-emerald-800/30 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('school');
  const mainContentRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

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
    type HeatDay = { date: string; count: number; dow: number };
    type HeatWeek = { days: HeatDay[]; weekStart: string };
    const weeks: HeatWeek[] = [];
    let currentWeek: HeatWeek | null = null;
    for (const p of data.activityHeatmap) {
      const d = new Date(p.date);
      const dow = d.getUTCDay();
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

  const gradeTrendData = useMemo(() => {
    if (!data) return [];
    const all = data.gradeTrend ?? [];
    if (gradeTrendRange === 'all') return all;
    const n = gradeTrendRange === '12' ? 12 : 24;
    return all.slice(-n);
  }, [data, gradeTrendRange]);

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

  // ── Export functions ──
  const exportChartAsPNG = useCallback((chartId: string, filename: string) => {
    const svgEl = document.querySelector(`#${chartId} .recharts-surface`) as SVGElement | null;
    if (!svgEl) {
      toast.error(t('analytics.no_export_data'));
      return;
    }
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width * 2;
      canvas.height = img.height * 2;
      ctx.scale(2, 2);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `${filename}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success(t('analytics.export_png'));
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, []);

  const exportDataAsCSV = useCallback(() => {
    if (!data) {
      toast.error(t('analytics.no_export_data'));
      return;
    }
    const rows: string[][] = [];
    // Header
    rows.push(['Type', 'Key', 'Value']);
    rows.push(['Summary', 'totalEntries', String(data.totalEntries)]);
    rows.push(['Summary', 'totalStudents', String(data.totalStudents)]);
    rows.push(['Summary', 'overallAvgMastery', String(data.overallAvgMastery)]);
    rows.push(['Summary', 'totalClasses', String(data.totalClasses)]);
    rows.push(['Summary', 'totalTeachers', String(data.totalTeachers)]);
    rows.push(['Summary', 'competencyCoverage', String(data.competencyCoveragePct + '%')]);
    // Class comparison
    rows.push([]);
    rows.push(['Class Comparison']);
    rows.push(['Class', 'Avg Mastery', 'Student Count']);
    data.classComparison.forEach((c) => rows.push([c.className, String(c.avgMastery), String(c.studentCount)]));
    // Subject mastery
    rows.push([]);
    rows.push(['Subject Mastery']);
    rows.push(['Subject', 'Avg Mastery', 'Entry Count']);
    data.subjectMasteryAvg.forEach((s) => rows.push([s.categoryName, String(s.avgMastery), String(s.entryCount)]));

    const csv = rows.map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-export-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    toast.success(t('analytics.export_csv'));
  }, [data]);

  const printReport = useCallback(() => {
    window.print();
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey && e.key === '1') { e.preventDefault(); setActiveTab('school'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setActiveTab('performance'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setActiveTab('class'); }
      if (e.altKey && e.key === '4') { e.preventDefault(); setActiveTab('teacher'); }
      if (e.altKey && e.key === '5') { e.preventDefault(); setActiveTab('predictive'); }
      if (e.altKey && e.key === '6') { e.preventDefault(); setActiveTab('export'); }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ── Skip to content ──
  const skipToContent = useCallback(() => {
    mainContentRef.current?.focus();
  }, []);

  const motionProps = prefersReduced ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

  return (
    <div className="space-y-6" role="region" aria-label={t('analytics.title')}>
      {/* Skip to content link */}
      <a
        href="#analytics-main-content"
        className="skip-to-content"
        onClick={(e) => { e.preventDefault(); skipToContent(); }}
      >
        {t('accessibility.skip_to_content')}
      </a>

      {/* Header */}
      <motion.div {...motionProps}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden relative">
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
              <div className="flex gap-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 min-h-[44px]"
                      aria-label={t('accessibility.keyboard_shortcuts')}
                    >
                      <Keyboard className="h-3.5 w-3.5 mr-1" />
                      <span className="hidden sm:inline">{t('accessibility.keyboard_shortcuts')}</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('accessibility.keyboard_shortcuts')}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 text-sm">
                      <p className="text-muted-foreground">{t('accessibility.shortcut_desc')}</p>
                      {TAB_META.map((tab, i) => (
                        <div key={tab.key} className="flex items-center justify-between py-1">
                          <span>{t(tab.labelKey)}</span>
                          <kbd className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-800 text-xs font-mono">Alt+{i + 1}</kbd>
                        </div>
                      ))}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 backdrop-blur-sm bg-white/60 dark:bg-gray-900/40 min-h-[44px]"
                  onClick={loadAnalytics}
                  disabled={loading}
                  aria-label={t('analytics.refresh')}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  {t('analytics.refresh')}
                </Button>
              </div>
            </div>

            {/* Filters */}
            <div className="mt-4 flex flex-wrap gap-3 items-end">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50 font-semibold" htmlFor="analytics-class-filter">
                  {t('analytics.select_class')}
                </label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger id="analytics-class-filter" className="h-8 w-44 rounded-lg text-xs border-emerald-200 dark:border-emerald-900/30">
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
                <label className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50 font-semibold" htmlFor="analytics-subject-filter">
                  {t('analytics.select_subject')}
                </label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger id="analytics-subject-filter" className="h-8 w-44 rounded-lg text-xs border-emerald-200 dark:border-emerald-900/30">
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
                <label className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/50 font-semibold" htmlFor="analytics-date-range">
                  {t('analytics.date_range')}
                </label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger id="analytics-date-range" className="h-8 w-36 rounded-lg text-xs border-emerald-200 dark:border-emerald-900/30">
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
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" role="region" aria-label="Summary statistics" live-region="polite">
                <StatCard icon={<PenLine className="h-4 w-4" />} label={t('analytics.entry_count')} value={data.totalEntries} color="emerald" />
                <StatCard icon={<Activity className="h-4 w-4" />} label={t('analytics.avg_mastery')} value={data.overallAvgMastery} suffix={t('analytics.level_range')} color="teal" />
                <StatCard icon={<Users className="h-4 w-4" />} label={t('analytics.student_count')} value={data.totalStudents} color="amber" />
                <StatCard icon={<School className="h-4 w-4" />} label={t('analytics.total_classes')} value={data.totalClasses} color="violet" />
                <StatCard icon={<GraduationCap className="h-4 w-4" />} label={t('analytics.total_teachers')} value={data.totalTeachers} color="rose" />
                <StatCard icon={<Target className="h-4 w-4" />} label={t('analytics.competency_coverage')} value={data.competencyCoveragePct} suffix="%" color="emerald" />
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-gray-50/80 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50" role="tablist" aria-label="Analytics sections">
        {TAB_META.map((tab, i) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            aria-controls={`analytics-panel-${tab.key}`}
            tabIndex={activeTab === tab.key ? 0 : -1}
            className={`analytics-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.icon}
            <span className="hidden sm:inline">{t(tab.labelKey)}</span>
            <kbd className="hidden lg:inline-flex items-center justify-center w-5 h-5 rounded text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-400 ml-1">Alt+{i + 1}</kbd>
          </button>
        ))}
      </div>

      {/* Main content area */}
      <div id="analytics-main-content" ref={mainContentRef} tabIndex={-1} className="outline-none">

        {loading && !data ? (
          <div className="space-y-4" role="status" aria-label="Loading analytics data">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-20 rounded-xl shimmer" />
              ))}
            </div>
            <ChartSkeleton />
            <div className="analytics-dashboard">
              <ChartSkeleton />
              <ChartSkeleton />
            </div>
          </div>
        ) : error ? (
          <Card className="border-0 shadow-sm rounded-xl">
            <CardContent className="py-12 text-center" role="alert">
              <p className="text-rose-600 dark:text-rose-400">{error}</p>
              <Button variant="outline" className="mt-4 rounded-xl min-h-[44px]" onClick={loadAnalytics}>
                <RefreshCw className="h-4 w-4 mr-1" />
                {t('analytics.refresh')}
              </Button>
            </CardContent>
          </Card>
        ) : data && data.totalEntries === 0 ? (
          <motion.div {...motionProps}>
            <Card className="border-0 shadow-sm rounded-xl">
              <CardContent className="py-16 text-center">
                <EmptyState
                  icon={<BarChart3 className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />}
                  title={t('analytics.no_data')}
                  description={t('analytics.no_data_hint')}
                />
              </CardContent>
            </Card>
          </motion.div>
        ) : data ? (
          <div className="space-y-6" role="tabpanel" id={`analytics-panel-${activeTab}`} aria-label={t(TAB_META.find((t2) => t2.key === activeTab)?.labelKey ?? '')}>

            {/* ═══════════════════════════════════════════════════════════════
                SCHOOL OVERVIEW TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'school' && (
              <motion.div {...motionProps} className="space-y-6">
                {/* School stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatCard icon={<Users className="h-4 w-4" />} label={t('analytics.student_count')} value={data.totalStudents} color="emerald" />
                  <StatCard icon={<School className="h-4 w-4" />} label={t('analytics.total_classes')} value={data.totalClasses} color="teal" />
                  <StatCard icon={<GraduationCap className="h-4 w-4" />} label={t('analytics.total_teachers')} value={data.totalTeachers} color="amber" />
                  <StatCard icon={<Layers className="h-4 w-4" />} label={t('analytics.total_competencies')} value={data.totalCompetencies} color="violet" />
                </div>

                {/* Student-Teacher Ratio + Competency Coverage */}
                <div className="analytics-dashboard">
                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <UserCheck className="h-4 w-4" />
                        </div>
                        {t('analytics.student_teacher_ratio')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center py-8">
                      <p className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 animate-count-up">
                        {data.totalTeachers > 0 ? Math.round(data.totalStudents / data.totalTeachers * 10) / 10 : 0}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">:1</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('analytics.student_teacher_ratio')}</p>
                    </CardContent>
                  </Card>

                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 accent-top-teal">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                          <Target className="h-4 w-4" />
                        </div>
                        {t('analytics.competency_coverage')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center gap-8 py-4">
                        <ResponsiveContainer width="50%" height={160}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: t('analytics.coverage_pct'), value: data.competencyCoveragePct, fill: '#10b981' },
                                { name: t('analytics.uncovered_pct'), value: 100 - data.competencyCoveragePct, fill: '#e5e7eb' },
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={2}
                              dataKey="value"
                              stroke="none"
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{data.competencyCoveragePct}%</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('analytics.competency_coverage')}</p>
                        </div>
                      </div>
                      <p className="chart-sr-desc">{t('analytics.competency_coverage')}: {data.competencyCoveragePct}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Subject mastery avg */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 accent-top-amber">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      {t('analytics.avg_mastery_subject')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="chart-subject-mastery">
                    {data.subjectMasteryAvg.length === 0 ? (
                      <EmptyState
                        icon={<BarChart3 className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.subjectMasteryAvg} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="categoryName" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                          <Bar dataKey="avgMastery" radius={[6, 6, 0, 0]} name={t('analytics.avg_mastery')}>
                            {data.subjectMasteryAvg.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <p className="chart-sr-desc">
                      {t('analytics.avg_mastery_subject')}: {data.subjectMasteryAvg.map((s) => `${s.categoryName}: ${s.avgMastery}`).join(', ')}
                    </p>
                  </CardContent>
                </Card>

                {/* Activity heatmap */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 accent-top-violet">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                        <Calendar className="h-4 w-4" />
                      </div>
                      {t('analytics.activity_heatmap')}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                        · {t('analytics.activity_heatmap_desc')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.activityHeatmap.length === 0 ? (
                      <EmptyState
                        icon={<Calendar className="h-8 w-8 text-violet-500 dark:text-violet-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="flex gap-1 items-start min-w-fit" role="img" aria-label={t('analytics.activity_heatmap')}>
                          {heatmapWeeks.map((w) => (
                            <div key={w.weekStart} className="flex flex-col gap-1">
                              {w.days.map((d) => (
                                <TooltipProvider key={d.date}>
                                  <ShadTooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={`heatmap-cell ${heatmapClass(d.count)}`}
                                        aria-label={`${d.date}: ${d.count} ${t('analytics.entries')}`}
                                      />
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">
                                      {d.date}: {d.count} {t('analytics.entries')}
                                    </TooltipContent>
                                  </ShadTooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                          <span>{t('analytics.less')}</span>
                          {HEATMAP_LEVELS.map((l) => (
                            <div key={l.label} className={`w-3 h-3 rounded-sm ${l.bg}`} />
                          ))}
                          <span>{t('analytics.more')}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                STUDENT PERFORMANCE TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'performance' && (
              <motion.div {...motionProps} className="space-y-6">
                {/* Mastery distribution histogram */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      {t('analytics.mastery_histogram')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="chart-mastery-histogram">
                    {distData.length === 0 ? (
                      <EmptyState
                        icon={<BarChart3 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={distData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                          <Bar dataKey="count" radius={[6, 6, 0, 0]} name={t('analytics.count')}>
                            {distData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.fill} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                    <p className="chart-sr-desc">
                      {t('analytics.mastery_distribution')}: {distData.map((d) => `${t('analytics.level')} ${d.level}: ${d.count} (${d.percentage}%)`).join(', ')}
                    </p>
                  </CardContent>
                </Card>

                {/* Progress over time */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 accent-top-teal">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        <TrendingUp className="h-4 w-4" />
                      </div>
                      {t('analytics.mastery_trend')}
                      <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                        · {t('analytics.mastery_trend_desc')}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="chart-mastery-trend">
                    {trendData.length === 0 ? (
                      <EmptyState
                        icon={<TrendingUp className="h-8 w-8 text-teal-500 dark:text-teal-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="masteryGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                          <Area type="monotone" dataKey="avgMastery" stroke="#14b8a6" fill="url(#masteryGradient)" strokeWidth={2} name={t('analytics.avg_mastery')} />
                          <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: t('analytics.min_standard'), position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                    <p className="chart-sr-desc">
                      {t('analytics.mastery_trend')}: {trendData.map((p) => `${p.label}: ${p.avgMastery}`).join(', ')}
                    </p>
                  </CardContent>
                </Card>

                {/* Subject comparison + Grade trend */}
                <div className="analytics-dashboard">
                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 accent-top-amber">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          <BarChart3 className="h-4 w-4" />
                        </div>
                        {t('analytics.subject_comparison')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent id="chart-subject-comparison">
                      {data.subjectMasteryAvg.length === 0 ? (
                        <EmptyState
                          icon={<BarChart3 className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
                          title={t('analytics.no_data')}
                          description={t('analytics.no_data_hint')}
                        />
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <BarChart data={data.subjectMasteryAvg.slice(0, 8)} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                            <XAxis type="number" domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <YAxis type="category" dataKey="categoryName" tick={{ fontSize: 10, fill: '#6b7280' }} width={55} />
                            <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                            <Bar dataKey="avgMastery" radius={[0, 6, 6, 0]} name={t('analytics.avg_mastery')}>
                              {data.subjectMasteryAvg.slice(0, 8).map((_, idx) => (
                                <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 accent-top-violet">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          <TrendingUp className="h-4 w-4" />
                        </div>
                        {t('analytics.grade_trend')}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                          · {t('analytics.grade_trend_desc')}
                        </span>
                      </CardTitle>
                      <div className="flex gap-1 mt-2">
                        {(['12', '24', 'all'] as const).map((r) => (
                          <Button
                            key={r}
                            variant={gradeTrendRange === r ? 'default' : 'outline'}
                            size="sm"
                            className="h-6 px-2 text-[10px] rounded-lg min-h-[32px]"
                            onClick={() => setGradeTrendRange(r)}
                            aria-pressed={gradeTrendRange === r}
                          >
                            {t(`analytics.range_${r === 'all' ? 'all' : r + '_weeks'}`)}
                          </Button>
                        ))}
                      </div>
                    </CardHeader>
                    <CardContent id="chart-grade-trend">
                      {gradeTrendData.length === 0 ? (
                        <EmptyState
                          icon={<TrendingUp className="h-8 w-8 text-violet-500 dark:text-violet-400" />}
                          title={t('analytics.no_data')}
                          description={t('analytics.no_data_hint')}
                        />
                      ) : (
                        <ResponsiveContainer width="100%" height={280}>
                          <ComposedChart data={gradeTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="weekLabel" tick={{ fontSize: 10, fill: '#6b7280' }} />
                            <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                            <Legend wrapperStyle={{ fontSize: '11px' }} />
                            <Line type="monotone" dataKey="avgMastery" stroke="#10b981" strokeWidth={2} dot={false} name={t('analytics.avg_mastery')} />
                            <Line type="monotone" dataKey="classAvg" stroke="#8b5cf6" strokeWidth={2} dot={false} strokeDasharray="4 4" name={t('analytics.class_avg')} />
                            <ReferenceLine y={2} stroke="#f59e0b" strokeDasharray="3 3" />
                          </ComposedChart>
                        </ResponsiveContainer>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Self-Assessment vs Teacher Assessment */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 accent-top-rose">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                        <BarChart3 className="h-4 w-4" />
                      </div>
                      {t('analytics.self_vs_teacher')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="chart-self-vs-teacher">
                    {!data.selfVsTeacherAgg ? (
                      <EmptyState
                        icon={<BarChart3 className="h-8 w-8 text-rose-500 dark:text-rose-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <div>
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/10">
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{data.selfVsTeacherAgg.avgSelfLevel}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('analytics.self_assessment')}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-900/10">
                            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">{data.selfVsTeacherAgg.avgTeacherLevel}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('analytics.teacher_assessment')}</p>
                          </div>
                          <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10">
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{data.selfVsTeacherAgg.avgGap > 0 ? '+' : ''}{data.selfVsTeacherAgg.avgGap}</p>
                            <p className="text-[10px] uppercase tracking-wider text-gray-500">{t('analytics.gap')}</p>
                          </div>
                        </div>
                        <ResponsiveContainer width="100%" height={250}>
                          <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" dataKey="selfLevel" name={t('analytics.self_level')} domain={[0, 6]} tick={{ fontSize: 10, fill: '#6b7280' }} />
                            <YAxis type="number" dataKey="teacherLevel" name={t('analytics.teacher_level')} domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
                            <ZAxis range={[40, 80]} />
                            <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                            <Scatter data={data.gapAnalysis} fill="#10b981" />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    <p className="chart-sr-desc">
                      {t('analytics.self_vs_teacher')}: {data.selfVsTeacherAgg ? `Self: ${data.selfVsTeacherAgg.avgSelfLevel}, Teacher: ${data.selfVsTeacherAgg.avgTeacherLevel}, Gap: ${data.selfVsTeacherAgg.avgGap}` : 'No data'}
                    </p>
                  </CardContent>
                </Card>

                {/* Mastery distribution donut */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 accent-top-amber">
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
                      <EmptyState
                        icon={<PieChartIcon className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
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
                            stroke="none"
                          >
                            {distData.map((entry, idx) => (
                              <Cell key={`cell-${idx}`} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Legend
                            wrapperStyle={{ fontSize: '11px' }}
                            formatter={(value: string) => <span className="text-gray-600 dark:text-gray-300">{value}</span>}
                          />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    <p className="chart-sr-desc">
                      {t('analytics.mastery_distribution')}: {distData.map((d) => `${t('analytics.level')} ${d.level}: ${d.count} (${d.percentage}%)`).join(', ')}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                CLASS COMPARISON TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'class' && (
              <motion.div {...motionProps} className="space-y-6">
                {/* Radar chart */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <RadarIcon className="h-4 w-4" />
                      </div>
                      {t('analytics.radar_comparison')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="chart-radar-comparison">
                    {data.classRadarData.length === 0 ? (
                      <EmptyState
                        icon={<RadarIcon className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={350}>
                        <RadarChart data={[
                          {
                            dimension: t('analytics.class_dim_mastery'),
                            ...Object.fromEntries(data.classRadarData.slice(0, 4).map((c) => [c.className, c.mastery])),
                          },
                          {
                            dimension: t('analytics.class_dim_attendance'),
                            ...Object.fromEntries(data.classRadarData.slice(0, 4).map((c) => [c.className, c.attendance])),
                          },
                          {
                            dimension: t('analytics.class_dim_engagement'),
                            ...Object.fromEntries(data.classRadarData.slice(0, 4).map((c) => [c.className, c.engagement])),
                          },
                          {
                            dimension: t('analytics.class_dim_progress'),
                            ...Object.fromEntries(data.classRadarData.slice(0, 4).map((c) => [c.className, c.progress])),
                          },
                          {
                            dimension: t('analytics.class_dim_behavior'),
                            ...Object.fromEntries(data.classRadarData.slice(0, 4).map((c) => [c.className, c.behavior])),
                          },
                        ]}>
                          <PolarGrid stroke="#e5e7eb" />
                          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <PolarRadiusAxis tick={{ fontSize: 9, fill: '#9ca3af' }} />
                          {data.classRadarData.slice(0, 4).map((c, idx) => (
                            <Radar
                              key={c.classId}
                              name={c.className}
                              dataKey={c.className}
                              stroke={RADAR_COLORS[idx % RADAR_COLORS.length]}
                              fill={RADAR_COLORS[idx % RADAR_COLORS.length]}
                              fillOpacity={0.15}
                              strokeWidth={2}
                            />
                          ))}
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                    <p className="chart-sr-desc">
                      {t('analytics.radar_comparison')}: {data.classRadarData.map((c) => `${c.className}: Mastery ${c.mastery}, Attendance ${c.attendance}, Engagement ${c.engagement}`).join('; ')}
                    </p>
                  </CardContent>
                </Card>

                {/* Class comparison bar chart */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 accent-top-teal">
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
                  <CardContent id="chart-class-comparison">
                    {data.classComparison.length === 0 ? (
                      <EmptyState
                        icon={<BarChart3 className="h-8 w-8 text-teal-500 dark:text-teal-400" />}
                        title={t('analytics.no_classes')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data.classComparison} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="className" tick={{ fontSize: 10, fill: '#6b7280' }} />
                          <YAxis domain={[0, 4]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickCount={5} />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                          <Bar dataKey="avgMastery" radius={[6, 6, 0, 0]} name={t('analytics.avg_mastery')}>
                            {data.classComparison.map((_, idx) => (
                              <Cell key={`cell-${idx}`} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Competency heatmap by class + ranking table */}
                <div className="analytics-dashboard">
                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 accent-top-amber">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          <Grid3x3 className="h-4 w-4" />
                        </div>
                        {t('analytics.heatmap_coverage')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.classRadarData.length === 0 ? (
                        <EmptyState
                          icon={<Grid3x3 className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
                          title={t('analytics.no_data')}
                          description={t('analytics.no_data_hint')}
                        />
                      ) : (
                        <div className="overflow-x-auto">
                          <div className="grid gap-2 min-w-fit">
                            {data.classRadarData.map((c) => (
                              <div key={c.classId} className="flex items-center gap-3">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-20 truncate">{c.className}</span>
                                <div className="flex-1 h-6 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                                    style={{ width: `${c.mastery}%` }}
                                    role="progressbar"
                                    aria-valuenow={c.mastery}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label={`${c.className}: ${c.mastery}%`}
                                  />
                                </div>
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-200 w-10 text-right">{c.mastery}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 accent-top-violet">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                          <Trophy className="h-4 w-4" />
                        </div>
                        {t('analytics.ranking_table')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.classComparison.length === 0 ? (
                        <EmptyState
                          icon={<Trophy className="h-8 w-8 text-violet-500 dark:text-violet-400" />}
                          title={t('analytics.no_data')}
                          description={t('analytics.no_data_hint')}
                        />
                      ) : (
                        <div className="rounded-xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden max-h-96 overflow-y-auto scrollbar-education">
                          <Table>
                            <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                              <TableRow>
                                <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.rank')}</TableHead>
                                <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.class_comparison')}</TableHead>
                                <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.avg_mastery')}</TableHead>
                                <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.student_count')}</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.classComparison.map((c, i) => (
                                <TableRow key={c.classId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                  <TableCell>
                                    <Badge variant="outline" className={`text-[10px] font-bold ${i < 3 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' : ''}`}>
                                      {i + 1}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-xs font-medium">{c.className}</TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden min-w-[2rem]">
                                        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(c.avgMastery / 4) * 100}%` }} />
                                      </div>
                                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">{c.avgMastery.toFixed(2)}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-500 dark:text-gray-400">{c.studentCount}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                TEACHER PERFORMANCE TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'teacher' && (
              <motion.div {...motionProps} className="space-y-6">
                {/* Assessments per teacher */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <PenLine className="h-4 w-4" />
                      </div>
                      {t('analytics.assessments_per_teacher')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent id="chart-teacher-assessments">
                    {data.teacherPerformance.length === 0 ? (
                      <EmptyState
                        icon={<PenLine className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data.teacherPerformance.slice(0, 10)} layout="vertical" margin={{ top: 10, right: 20, left: 80, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 10, fill: '#9ca3af' }} />
                          <YAxis type="category" dataKey="teacherName" tick={{ fontSize: 10, fill: '#6b7280' }} width={75} />
                          <RTooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '11px' }} />
                          <Bar dataKey="assessmentCount" fill="#10b981" radius={[0, 6, 6, 0]} name={t('analytics.assessments_per_teacher')} />
                          <Bar dataKey="progressCount" fill="#14b8a6" radius={[0, 6, 6, 0]} name={t('analytics.progress_per_teacher')} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Teacher stats table */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 accent-top-teal">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      {t('analytics.teacher_performance')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {data.teacherPerformance.length === 0 ? (
                      <EmptyState
                        icon={<GraduationCap className="h-8 w-8 text-teal-500 dark:text-teal-400" />}
                        title={t('analytics.no_data')}
                        description={t('analytics.no_data_hint')}
                      />
                    ) : (
                      <div className="rounded-xl border border-gray-200/50 dark:border-gray-800/50 overflow-hidden max-h-96 overflow-y-auto scrollbar-education">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <TableRow>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.teacher_performance')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.assessments_per_teacher')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.progress_per_teacher')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.improvement_rate')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.notebook_usage')}</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {data.teacherPerformance.map((tp) => (
                              <TableRow key={tp.teacherId} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar className="h-7 w-7">
                                      <AvatarFallback className="text-[10px] font-bold bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300">
                                        {initials(tp.teacherName)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="text-xs font-medium">{tp.teacherName}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-bold tabular-nums">{tp.assessmentCount}</TableCell>
                                <TableCell className="text-xs font-bold tabular-nums">{tp.progressCount}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span className={`text-xs font-bold ${tp.improvementRate >= 50 ? 'text-emerald-600 dark:text-emerald-400' : tp.improvementRate >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                      {tp.improvementRate}%
                                    </span>
                                    {tp.improvementRate >= 50 ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : tp.improvementRate < 30 ? <ArrowDownRight className="h-3 w-3 text-rose-500" /> : <ArrowRight className="h-3 w-3 text-amber-500" />}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">{tp.notebookCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                PREDICTIVE ANALYTICS TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'predictive' && (
              <motion.div {...motionProps} className="space-y-6">
                {/* Students at risk */}
                <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 accent-top-rose">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      {t('analytics.students_at_risk')}
                      <span className="predictive-badge predictive-badge-risk ml-auto">
                        <AlertCircle className="h-3 w-3" />
                        {t('analytics.at_risk')}
                      </span>
                    </CardTitle>
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20 text-center">
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{riskSummary.total}</p>
                        <p className="text-[10px] uppercase tracking-wider text-rose-600/60 dark:text-rose-400/40">{t('analytics.total_at_risk')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-red-50/60 dark:bg-red-900/10 border border-red-200/30 dark:border-red-900/20 text-center">
                        <p className="text-lg font-bold text-red-700 dark:text-red-300">{riskSummary.critical}</p>
                        <p className="text-[10px] uppercase tracking-wider text-red-600/60 dark:text-red-400/40">{t('analytics.critical_count')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-900/10 border border-rose-200/30 dark:border-rose-900/20 text-center">
                        <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{riskSummary.high}</p>
                        <p className="text-[10px] uppercase tracking-wider text-rose-600/60 dark:text-rose-400/40">{t('analytics.high_count')}</p>
                      </div>
                      <div className="p-3 rounded-xl bg-amber-50/60 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20 text-center">
                        <TrendingDown className="h-4 w-4 text-amber-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{riskSummary.avg}</p>
                        <p className="text-[10px] uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">{t('analytics.avg_risk_score')}</p>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-3">
                      <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as 'all' | AnalyticsRiskLevel)}>
                        <SelectTrigger className="h-8 w-40 rounded-lg text-xs border-rose-200 dark:border-rose-900/30" aria-label={t('analytics.filter_risk')}>
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
                    {filteredAtRisk.length === 0 ? (
                      <EmptyState
                        icon={<Sparkles className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />}
                        title={t('analytics.all_good')}
                        description=""
                      />
                    ) : (
                      <div className="rounded-xl border border-rose-200/40 dark:border-rose-900/30 overflow-hidden max-h-[28rem] overflow-y-auto scrollbar-education">
                        <Table>
                          <TableHeader className="sticky top-0 bg-white dark:bg-gray-900 z-10">
                            <TableRow className="border-rose-200/40 dark:border-rose-900/30">
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.student_count')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.class_comparison')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.risk_level')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('analytics.risk_score')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden md:table-cell">{t('analytics.signals')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden sm:table-cell">{t('analytics.latest_mastery')}</TableHead>
                              <TableHead scope="col" className="text-[11px] uppercase tracking-wider text-gray-500 dark:text-gray-400 hidden lg:table-cell">{t('analytics.last_activity')}</TableHead>
                              <TableHead scope="col" className="w-10" />
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAtRisk.map((s, i) => {
                              const style = RISK_LEVEL_STYLES[s.riskLevel];
                              return (
                                <motion.tr
                                  key={s.studentId}
                                  {...(prefersReduced ? {} : { initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 }, transition: { delay: 0.05 + i * 0.04 } })}
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
                                        <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[12rem]">{s.studentName}</p>
                                        <p className="text-[10px] text-gray-500 dark:text-gray-400 md:hidden">{s.className || '—'}</p>
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
                                        <div className={`h-full rounded-full ${style.bar} transition-all`} style={{ width: `${Math.min(100, s.riskScore)}%` }} />
                                      </div>
                                      <span className="text-[11px] font-bold text-gray-700 dark:text-gray-200 tabular-nums">{s.riskScore}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <div className="flex flex-wrap gap-1 max-w-[14rem]">
                                      {s.signals.map((sig) => {
                                        const meta = SIGNAL_META[sig];
                                        return (
                                          <span key={sig} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium ${meta.chip}`} title={t(meta.key)}>
                                            <span className="flex items-center">{meta.icon}</span>
                                            <span className="hidden xl:inline">{t(meta.key)}</span>
                                          </span>
                                        );
                                      })}
                                    </div>
                                  </TableCell>
                                  <TableCell className="hidden sm:table-cell">
                                    {s.latestMastery > 0 ? (
                                      <Badge className={`text-[10px] font-semibold ${s.latestMastery < 2 ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' : s.latestMastery < 3 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'}`}>
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
                                      className="h-7 px-2 rounded-lg text-[11px] text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/30 min-h-[44px]"
                                      onClick={() => navigateToStudentDetail(s.studentId, 'analytics')}
                                      aria-label={`${t('analytics.details')} ${s.studentName}`}
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

                {/* Students excelling + areas needing attention */}
                <div className="analytics-dashboard">
                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 accent-top-emerald">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                          <Trophy className="h-4 w-4" />
                        </div>
                        {t('analytics.students_excelling')}
                        <span className="predictive-badge predictive-badge-excel ml-auto">
                          <ArrowUpRight className="h-3 w-3" />
                          {t('analytics.excelling')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.excellingStudents.length === 0 ? (
                        <EmptyState
                          icon={<Trophy className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />}
                          title={t('analytics.no_data')}
                          description={t('analytics.no_data_hint')}
                        />
                      ) : (
                        <div className="space-y-2">
                          {data.excellingStudents.map((s) => (
                            <div key={s.studentId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 transition-colors">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-[11px] font-bold bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                                  {initials(s.studentName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{s.studentName}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{s.className}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">+{s.improvement.toFixed(2)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('analytics.improvement')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="chart-container border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 accent-top-amber">
                    <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                          <AlertCircle className="h-4 w-4" />
                        </div>
                        {t('analytics.areas_needing_attention')}
                        <span className="predictive-badge predictive-badge-attention ml-auto">
                          <AlertTriangle className="h-3 w-3" />
                          {t('analytics.needs_attention')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {data.bottomCompetencies.length === 0 ? (
                        <EmptyState
                          icon={<AlertCircle className="h-8 w-8 text-amber-500 dark:text-amber-400" />}
                          title={t('analytics.no_data')}
                          description={t('analytics.no_data_hint')}
                        />
                      ) : (
                        <div className="space-y-2">
                          {data.bottomCompetencies.map((c) => (
                            <div key={c.competencyId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50/50 dark:hover:bg-amber-900/10 transition-colors">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shrink-0">
                                <AlertTriangle className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{c.title || c.code}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{c.code}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-amber-600 dark:text-amber-400">{c.avgMastery.toFixed(2)}</p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('analytics.avg_mastery')}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                EXPORT TAB
            ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'export' && (
              <motion.div {...motionProps} className="space-y-6">
                <Card className="chart-container border-0 shadow-sm rounded-xl">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Download className="h-4 w-4" />
                      </div>
                      {t('analytics.section_export')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="export-btn-group">
                      <button
                        className="export-btn"
                        onClick={() => exportChartAsPNG('chart-mastery-histogram', 'mastery-distribution')}
                        aria-label={t('analytics.export_chart')}
                      >
                        <ImageIcon className="h-4 w-4" />
                        {t('analytics.export_chart')}
                      </button>
                      <button
                        className="export-btn"
                        onClick={exportDataAsCSV}
                        aria-label={t('analytics.export_csv')}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        {t('analytics.export_csv')}
                      </button>
                      <button
                        className="export-btn"
                        onClick={printReport}
                        aria-label={t('analytics.print_report')}
                      >
                        <Printer className="h-4 w-4" />
                        {t('analytics.print_report')}
                      </button>
                    </div>

                    <div className="mt-6 p-4 rounded-xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200/50 dark:border-gray-800/50">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('analytics.section_export')}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t('analytics.no_data_hint')}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
