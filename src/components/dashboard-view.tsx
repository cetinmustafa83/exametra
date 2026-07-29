'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
  ChevronDown,
  RefreshCw,
  GraduationCap,
  UserCheck,
  Award,
  Star,
  MessageSquare,
  Timer,
  Globe,
  Palette,
  Notebook,
  CircleDot,
  Flower2,
  Calculator,
  CalendarCheck,
  Calendar as CalendarIconNav,
  BookMarked,
  Heart,
  BookCheck,
  Megaphone,
  Pin,
  X,
  Send,
  MapPin,
  Trophy,
  Users as UsersIcon,
  Music,
  Flag,
  Tent,
  Newspaper,
  Share2,
  PenSquare,
  Eye,
  Tag,
  Shield,
  Database,
  Server,
  Cpu,
  UserPlus,
  School,
  LayoutList,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  BarChart2,
  PieChart as PieChartIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore, type ViewName, type CurrentUser } from '@/lib/store';
import { t } from '@/lib/i18n';
import { fetchDashboard, type DashboardData, getStoredNotifications, type AppNotification, addNotification, markNotificationsRead, fetchParentLinks, type ParentStudentLinkData, fetchStudents } from '@/lib/api';
import { apiGet, apiPost, apiPut } from '@/lib/api';
import { sanitizeHtml } from '@/lib/utils';
import { fetchNewsletters, createNewsletter, type NewsletterData } from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};

// ─── CountUp Animation Component ────────────────────────────────────
function CountUp({ target, duration = 800 }: { target: number; duration?: number }) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) { setCount(target); return; }
    const startTime = performance.now();
    let rafId: number;
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(start + diff * eased));
      if (progress < 1) {
        rafId = requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
      }
    }
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration]);

  return <>{count}</>;
}

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

// ─── Time-based Greeting Helper ────────────────────────────────────
function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.greeting_morning');
  if (hour < 18) return t('dashboard.greeting_afternoon');
  return t('dashboard.greeting_evening');
}

// ─── Gradient Border Card Wrapper ──────────────────────────────────
function GradientBorderCard({ children, className = '', gradientFrom = 'from-emerald-400', gradientTo = 'to-teal-500' }: {
  children: React.ReactNode;
  className?: string;
  gradientFrom?: string;
  gradientTo?: string;
}) {
  return (
    <div className={`relative rounded-xl p-[1.5px] bg-gradient-to-br ${gradientFrom} ${gradientTo} ${className}`}>
      <div className="rounded-[10px] bg-white dark:bg-gray-950 h-full">
        {children}
      </div>
    </div>
  );
}

// ─── Parent Dashboard Component ────────────────────────────────────────
function ParentDashboard({ currentUser, setCurrentView, locale }: {
  currentUser: CurrentUser;
  setCurrentView: (view: ViewName) => void;
  locale: string;
}) {
  const [parentLinks, setParentLinks] = useState<ParentStudentLinkData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const links = await fetchParentLinks(currentUser.id);
        setParentLinks(links);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser.id]);

  const children = parentLinks.map((link) => ({
    linkId: link.id,
    studentId: link.student.id,
    firstName: link.student.firstName,
    lastName: link.student.lastName,
    relationship: link.relationship,
    className: link.student.enrollments?.[0]?.classGroup?.name ?? '--',
    gradeLevel: link.student.enrollments?.[0]?.classGroup?.gradeLevel ?? '--',
  }));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* Parent Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-lg shadow-violet-300/30 ring-2 ring-violet-200/30 dark:ring-violet-800/20">
                <Heart className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-violet-600 via-purple-600 to-violet-500 dark:from-violet-400 dark:via-purple-400 dark:to-violet-300 bg-clip-text text-transparent">
                  {t('parent.welcome_back')}, {currentUser.firstName}!
                </h2>
                <p className="text-violet-600/60 dark:text-violet-400/40 mt-0.5 text-sm">{t('parent.dashboard_title')}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/10 border border-violet-200/40 dark:border-violet-900/30 text-xs font-medium text-violet-700 dark:text-violet-300 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="font-semibold">
                {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Parent Cards Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* My Children Card */}
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-violet-200/40 dark:hover:ring-violet-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-200/60 dark:hover:shadow-violet-800/30 cursor-pointer min-h-[44px]">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                  <Users className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">{t('parent.my_children')}</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {children.length > 0 ? (
              <div className="space-y-2">
                {children.map((child) => (
                  <div key={child.studentId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/20">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 text-[10px] font-bold">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{child.firstName} {child.lastName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 shrink-0">
                        {child.className}
                      </Badge>
                      {child.relationship && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{t(`parent.${child.relationship}`)}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200/30 dark:border-gray-800/20">
                <Users className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('parent.no_children')}</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{t('parent.no_children_desc')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Progress Card */}
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-emerald-200/40 dark:hover:ring-emerald-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-200/60 dark:hover:shadow-emerald-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('flower')}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">{t('parent.recent_progress')}</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('parent.child_progress_desc')}</p>
            {children.length > 0 ? (
              <div className="space-y-2">
                {children.slice(0, 3).map((child) => (
                  <div key={child.studentId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{child.firstName}</span>
                    <div className="flex items-center gap-1">
                      <Sprout className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('parent.view_progress')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200/30 dark:border-gray-800/20">
                <TrendingUp className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('parent.no_children')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Assessments Card */}
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-amber-200/40 dark:hover:ring-amber-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-200/60 dark:hover:shadow-amber-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('assessments')}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                  <ClipboardCheck className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">{t('parent.upcoming_assessments')}</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/30 dark:border-amber-900/20">
              <ClipboardCheck className="h-8 w-8 text-amber-400/60 dark:text-amber-600/40 mb-1" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.no_assessments')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Messages from Teachers Card */}
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-teal-200/40 dark:hover:ring-teal-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-teal-200/60 dark:hover:shadow-teal-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('parents')}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">{t('parent.messages_from_teachers')}</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-teal-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-teal-50/50 dark:bg-teal-900/10 border border-teal-200/30 dark:border-teal-900/20">
              <MessageSquare className="h-8 w-8 text-teal-400/60 dark:text-teal-600/40 mb-1" />
              <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.no_messages')}</p>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Summary Card */}
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-rose-200/40 dark:hover:ring-rose-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-200/60 dark:hover:shadow-rose-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('attendance')}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-sm">
                  <CalendarCheck className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">{t('parent.attendance_summary')}</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-rose-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {children.length > 0 ? (
              <div className="space-y-2">
                {children.slice(0, 3).map((child) => (
                  <div key={child.studentId} className="flex items-center justify-between px-3 py-2 rounded-lg bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-900/20">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{child.firstName}</span>
                    <div className="flex items-center gap-1">
                      <CalendarCheck className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">{t('parent.view_attendance')}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200/30 dark:border-gray-800/20">
                <CalendarCheck className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('parent.no_children')}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Calendar Card */}
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-violet-200/40 dark:hover:ring-violet-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-200/60 dark:hover:shadow-violet-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('calendar')}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-sm">
                  <CalendarIconNav className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">{t('nav.calendar')}</CardTitle>
              </div>
              <ChevronRight className="h-4 w-4 text-violet-500" />
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex items-center justify-center h-24 rounded-lg bg-gradient-to-br from-violet-50 to-purple-50/50 dark:from-violet-900/20 dark:to-purple-900/10 border border-violet-200/30 dark:border-violet-900/20">
              <div className="text-center">
                <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                  {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' })}
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">
                  {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long' })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Parent Children's Recent Grades */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                <Calculator className="h-4 w-4" />
              </div>
              {t('parent.children_grades')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {children.length > 0 ? (
              <div className="space-y-3">
                {children.map((child) => (
                  <div key={child.studentId} className="p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 text-white text-[10px] font-bold shrink-0">
                        {child.firstName[0]}{child.lastName[0]}
                      </div>
                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{child.firstName} {child.lastName}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 ml-auto">{child.className}</Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                      {[
                        { subject: t('student.notebook_math'), grade: '2.3' },
                        { subject: t('student.notebook_german'), grade: '1.8' },
                        { subject: t('student.notebook_english'), grade: '2.7' },
                        { subject: t('student.notebook_science'), grade: '2.1' },
                      ].map((g) => (
                        <div key={g.subject} className="px-2 py-1.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-900/20 text-center">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{g.subject}</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{g.grade}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200/30 dark:border-gray-800/20">
                <Calculator className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                <p className="text-xs text-gray-400 dark:text-gray-500">{t('parent.no_children')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Parent Competition Results & Calendar Events */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competition Results */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] h-full">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('parent.competition_results')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center justify-center h-24 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-200/30 dark:border-amber-900/20">
                <div className="text-center">
                  <Trophy className="h-8 w-8 text-amber-400/60 dark:text-amber-600/40 mx-auto mb-1" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent.no_competition_results')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Calendar Events */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] h-full cursor-pointer min-h-[44px]" onClick={() => setCurrentView('calendar')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-sm">
                    <CalendarIconNav className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('parent.calendar_events')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-violet-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="space-y-2">
                {[
                  { title: locale === 'de' ? 'Elternsprechtag' : 'Parent-Teacher Day', date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), color: 'from-emerald-400 to-teal-500' },
                  { title: locale === 'de' ? 'Schulfest' : 'School Festival', date: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000), color: 'from-amber-400 to-orange-500' },
                  { title: locale === 'de' ? 'Zeugnisausgabe' : 'Report Card Day', date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), color: 'from-violet-400 to-purple-500' },
                ].map((event) => {
                  const daysUntil = Math.ceil((event.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={event.title} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/50 dark:border-gray-800/20 min-h-[44px]">
                      <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${event.color} text-white shadow-sm shrink-0`}>
                        <CalendarDays className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{event.title}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500">{event.date.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{daysUntil}d</Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Parent Announcements */}
      <DashboardAnnouncementsCard currentUser={currentUser} locale={locale} />
    </motion.div>
  );
}

// ─── School Admin Dashboard Component ──────────────────────────────────
function SchoolAdminDashboard({ currentUser, setCurrentView, locale, data }: {
  currentUser: CurrentUser;
  setCurrentView: (view: ViewName) => void;
  locale: string;
  data: DashboardData;
}) {
  // Mock audit log data
  const auditLogEntries = [
    { id: '1', action: 'USER_LOGIN', user: 'Max Mustermann', timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), details: 'Teacher login' },
    { id: '2', action: 'ASSESSMENT_CREATED', user: 'Anna Schmidt', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), details: 'Math assessment created' },
    { id: '3', action: 'STUDENT_ENROLLED', user: 'System', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), details: 'New student enrolled' },
    { id: '4', action: 'REPORT_GENERATED', user: 'Peter Weber', timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(), details: 'Class report generated' },
    { id: '5', action: 'SETTINGS_UPDATED', user: 'Admin', timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(), details: 'School settings updated' },
  ];

  // Mock system health data
  const systemHealth = {
    status: 'healthy' as const,
    uptime: '99.9%',
    activeUsers: Math.floor(data.stats.totalStudents * 0.3 + data.stats.totalClasses * 2),
    storageUsed: 42,
    apiRequestsToday: 1247,
  };

  // Enrollment trend data for chart
  const enrollmentData = [
    { month: locale === 'de' ? 'Jan' : 'Jan', students: Math.floor(data.stats.totalStudents * 0.85) },
    { month: locale === 'de' ? 'Feb' : 'Feb', students: Math.floor(data.stats.totalStudents * 0.87) },
    { month: locale === 'de' ? 'Mär' : 'Mar', students: Math.floor(data.stats.totalStudents * 0.9) },
    { month: locale === 'de' ? 'Apr' : 'Apr', students: Math.floor(data.stats.totalStudents * 0.92) },
    { month: locale === 'de' ? 'Mai' : 'May', students: Math.floor(data.stats.totalStudents * 0.95) },
    { month: locale === 'de' ? 'Jun' : 'Jun', students: data.stats.totalStudents },
  ];

  // Grade distribution data for pie chart
  const gradeDistribution = [
    { name: '1', value: 25, color: '#10b981' },
    { name: '2', value: 35, color: '#14b8a6' },
    { name: '3', value: 25, color: '#f59e0b' },
    { name: '4', value: 12, color: '#f97316' },
    { name: '5-6', value: 3, color: '#ef4444' },
  ];

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'USER_LOGIN': return UserCheck;
      case 'ASSESSMENT_CREATED': return ClipboardCheck;
      case 'STUDENT_ENROLLED': return UserPlus;
      case 'REPORT_GENERATED': return FileText;
      case 'SETTINGS_UPDATED': return Settings;
      default: return Activity;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'USER_LOGIN': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
      case 'ASSESSMENT_CREATED': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'STUDENT_ENROLLED': return 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
      case 'REPORT_GENERATED': return 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400';
      case 'SETTINGS_UPDATED': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
      default: return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
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

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* Admin Welcome Header */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-500 text-white shadow-lg shadow-rose-300/30 ring-2 ring-rose-200/30 dark:ring-rose-800/20">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 via-orange-600 to-amber-500 dark:from-rose-400 dark:via-orange-400 dark:to-amber-300 bg-clip-text text-transparent">
                  {t('admin.welcome_back')}, {currentUser.firstName}!
                </h2>
                <p className="text-rose-600/60 dark:text-rose-400/40 mt-0.5 text-sm">{t('admin.dashboard_title')}</p>
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-50 to-orange-50/50 dark:from-rose-900/20 dark:to-orange-900/10 border border-rose-200/40 dark:border-rose-900/30 text-xs font-medium text-rose-700 dark:text-rose-300 shadow-sm">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="font-semibold">
                {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* School Overview Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: t('admin.total_students'), value: data.stats.totalStudents, color: 'from-emerald-400 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200/40 dark:border-emerald-900/30' },
          { icon: BarChart3, label: t('admin.total_classes'), value: data.stats.totalClasses, color: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200/40 dark:border-teal-900/30' },
          { icon: GraduationCap, label: t('admin.total_teachers'), value: Math.max(1, Math.floor(data.stats.totalClasses * 0.8)), color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200/40 dark:border-amber-900/30' },
          { icon: Heart, label: t('admin.total_parents'), value: Math.floor(data.stats.totalStudents * 1.4), color: 'from-rose-400 to-pink-500', bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200/40 dark:border-rose-900/30' },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            whileHover={{ scale: 1.03, y: -4 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <Card className={`border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] ${stat.bg} ${stat.border}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} text-white shadow-sm shrink-0`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-none mt-0.5"><CountUp target={stat.value} /></p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* System Health Card */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                <Server className="h-4 w-4" />
              </div>
              {t('admin.system_health')}
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs shadow-sm">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {t('admin.health_excellent')}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: ActivityIcon, label: t('admin.uptime'), value: systemHealth.uptime, color: 'text-emerald-600 dark:text-emerald-400' },
                { icon: Users, label: t('admin.active_users'), value: systemHealth.activeUsers.toString(), color: 'text-teal-600 dark:text-teal-400' },
                { icon: Database, label: t('admin.storage_used'), value: `${systemHealth.storageUsed}%`, color: 'text-amber-600 dark:text-amber-400' },
                { icon: Cpu, label: t('admin.api_requests'), value: systemHealth.apiRequestsToday.toLocaleString(), color: 'text-violet-600 dark:text-violet-400' },
              ].map((metric) => (
                <div key={metric.label} className="p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40">
                  <div className="flex items-center gap-2 mb-1.5">
                    <metric.icon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{metric.label}</span>
                  </div>
                  <p className={`text-lg font-bold ${metric.color}`}>{metric.value}</p>
                </div>
              ))}
            </div>
            {/* Storage usage bar */}
            <div className="mt-4 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('admin.storage_used')}</span>
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">{systemHealth.storageUsed}%</span>
              </div>
              <Progress value={systemHealth.storageUsed} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* School Statistics Charts */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                <BarChart2 className="h-4 w-4" />
              </div>
              {t('admin.school_statistics')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Enrollment Trend */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('admin.enrollment_trend')}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={enrollmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#9ca3af" />
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                    />
                    <Bar dataKey="students" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Grade Distribution */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">{t('admin.grade_distribution')}</h4>
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="60%" height={200}>
                    <PieChart>
                      <Pie
                        data={gradeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        isAnimationActive
                        animationDuration={1200}
                        animationEasing="ease-out"
                      >
                        {gradeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {gradeDistribution.map((grade) => (
                      <div key={grade.name} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: grade.color }} />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{grade.name}: {grade.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Audit Log & User Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Audit Log */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] h-full">
            <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                  <LayoutList className="h-4 w-4" />
                </div>
                {t('admin.audit_log')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">{t('admin.audit_log_desc')}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditLogEntries.length === 0 ? (
                <div className="text-center py-8">
                  <LayoutList className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('admin.no_audit_entries')}</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-education pr-1">
                  {auditLogEntries.map((entry) => {
                    const ActionIcon = getActionIcon(entry.action);
                    return (
                      <div key={entry.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40">
                        <div className={`flex items-center justify-center w-8 h-8 rounded-lg ${getActionColor(entry.action)} shrink-0`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{entry.details}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {entry.user} · {relativeTime(entry.timestamp)}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{entry.action.replace('_', ' ')}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User Management Quick Actions */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] h-full">
            <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                  <UserPlus className="h-4 w-4" />
                </div>
                {t('admin.user_management')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: GraduationCap, label: t('admin.manage_teachers'), desc: t('admin.add_teacher'), color: 'from-amber-400 to-orange-500', view: 'settings' as ViewName },
                  { icon: Users, label: t('admin.manage_students'), desc: t('admin.add_student'), color: 'from-emerald-400 to-teal-500', view: 'classes' as ViewName },
                  { icon: Heart, label: t('admin.manage_parents'), desc: t('admin.manage_parents'), color: 'from-rose-400 to-pink-500', view: 'parents' as ViewName },
                  { icon: School, label: t('admin.school_settings'), desc: t('admin.school_settings'), color: 'from-violet-400 to-purple-500', view: 'settings' as ViewName },
                ].map((action) => (
                  <motion.button
                    key={action.label}
                    onClick={() => setCurrentView(action.view)}
                    whileHover={{ scale: 1.01, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="w-full group flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40 hover:border-teal-200/60 dark:hover:border-teal-800/30 transition-all min-h-[44px]"
                  >
                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} text-white shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                      <action.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{action.label}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{action.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-teal-500 transition-colors shrink-0" />
                  </motion.button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  onClick={() => setCurrentView('classes')}
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white min-h-[44px] px-4 font-semibold shadow-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  {t('admin.add_class')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setCurrentView('settings')}
                  className="border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-300 min-h-[44px] px-4"
                >
                  <Settings className="h-4 w-4 mr-1.5" />
                  {t('admin.school_settings')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Announcements Management */}
      <DashboardAnnouncementsCard currentUser={currentUser} locale={locale} />

      {/* School Newsletter */}
      <DashboardNewsletterCard currentUser={currentUser} locale={locale} />
    </motion.div>
  );
}

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

  // ─── Student Dashboard ──────────────────────────────────────────────
  if (currentUser?.role === 'STUDENT') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 pb-8"
      >
        {/* Student Welcome Header */}
        <motion.div variants={itemVariants}>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-300 bg-clip-text text-transparent">
                    {t('student.welcome_back')}, {currentUser.firstName}!
                  </h2>
                  <p className="text-emerald-600/60 dark:text-emerald-400/40 mt-0.5 text-sm">{t('student.progress_overview')}</p>
                </div>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200/40 dark:border-emerald-900/30 text-xs font-medium text-emerald-700 dark:text-emerald-300 shadow-sm">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="font-semibold">
                  {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Environmental Banner (Papier sparen) ─────────────────────── */}
        <motion.div variants={itemVariants}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 dark:from-emerald-700 dark:via-emerald-800 dark:to-teal-700 shadow-lg shadow-emerald-300/30 dark:shadow-emerald-900/40">
            {/* Decorative leaf pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute top-2 right-8">
                <Leaf className="h-24 w-24 text-white rotate-12" />
              </div>
              <div className="absolute bottom-1 right-40">
                <Leaf className="h-16 w-16 text-white -rotate-45" />
              </div>
              <div className="absolute top-4 right-72">
                <Leaf className="h-10 w-10 text-white rotate-90" />
              </div>
            </div>
            <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm shrink-0">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-white leading-tight">
                    {t('student.papier_sparen_title')}
                  </h3>
                  <p className="text-sm text-emerald-100/90 mt-0.5 leading-snug">
                    {t('student.papier_sparen_subtitle')}
                  </p>
                </div>
              </div>
              <Button
                onClick={() => setCurrentView('notebooks')}
                className="shrink-0 bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm min-h-[44px] px-5 font-semibold transition-all duration-200 hover:shadow-lg"
                variant="outline"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                {t('student.go_to_notebooks')}
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Student Quick Stats */}
        <motion.div variants={itemVariants}>
          <div className="relative p-4 rounded-xl bg-mesh border border-emerald-200/40 dark:border-emerald-900/30 overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-50/30 via-transparent to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5 pointer-events-none" />
            <div className="relative flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <span className="inline-flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                <Activity className="h-4 w-4 text-emerald-500" />
                {t('student.progress_overview')}:
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
            </div>
          </div>
        </motion.div>

        {/* ── Student Notebook Quick Access (Meine Hefte) ─────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm">
                    <BookMarked className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.my_notebooks_quick')}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView('notebooks')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 min-h-[44px] px-2"
                >
                  {t('student.show_all_notebooks')}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { title: t('student.notebook_math'), subject: 'Mathematik', color: 'from-amber-400 to-orange-500', icon: Calculator },
                  { title: t('student.notebook_german'), subject: 'Deutsch', color: 'from-emerald-400 to-teal-500', icon: BookOpen },
                  { title: t('student.notebook_english'), subject: 'Englisch', color: 'from-rose-400 to-pink-500', icon: Globe },
                  { title: t('student.notebook_science'), subject: 'Naturwissenschaften', color: 'from-violet-400 to-purple-500', icon: Flower2 },
                ].map((notebook) => (
                  <motion.div
                    key={notebook.subject}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="cursor-pointer min-h-[44px]"
                    onClick={() => setCurrentView('notebooks')}
                  >
                    <div className="relative rounded-xl overflow-hidden border border-gray-200/40 dark:border-gray-700/40 bg-white dark:bg-gray-900/50 hover:shadow-md transition-shadow duration-200">
                      {/* Notebook cover color strip */}
                      <div className={`h-2 bg-gradient-to-r ${notebook.color}`} />
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br ${notebook.color} text-white shadow-sm`}>
                            <notebook.icon className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{notebook.title}</span>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{notebook.subject}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex justify-center">
                <Button
                  onClick={() => setCurrentView('notebooks')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white min-h-[44px] px-6 font-semibold shadow-sm transition-all duration-200"
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  {t('student.start_learning')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ── Student Learning Progress ────────────────────────────────── */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.learning_progress')}</CardTitle>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentView('flower')}
                  className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 min-h-[44px] px-2"
                >
                  {t('student.continue_learning')}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <div className="space-y-3">
                {[
                  { subject: t('student.notebook_math'), progress: 72, color: 'bg-amber-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
                  { subject: t('student.notebook_german'), progress: 85, color: 'bg-emerald-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
                  { subject: t('student.notebook_english'), progress: 58, color: 'bg-rose-500', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
                  { subject: t('student.notebook_science'), progress: 44, color: 'bg-violet-500', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
                ].map((item) => (
                  <div key={item.subject} className="flex items-center gap-3 min-h-[44px]">
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-28 shrink-0 truncate">{item.subject}</span>
                    <div className="flex-1 h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.progress}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={`h-full rounded-full ${item.color}`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 w-9 text-right shrink-0">{item.progress}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-center">
                <Button
                  onClick={() => setCurrentView('flower')}
                  variant="outline"
                  className="text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px] px-5 font-semibold transition-all duration-200"
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  {t('student.continue_learning')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student Cards Grid */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* My Competencies Card */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-emerald-200/40 dark:hover:ring-emerald-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-200/60 dark:hover:shadow-emerald-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('flower')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                    <Flower2 className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.my_competencies')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('student.my_competencies_desc')}</p>
              {/* Mini competence flower placeholder */}
              <div className="flex items-center justify-center w-full h-24 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
                <Flower2 className="h-10 w-10 text-emerald-400/60 dark:text-emerald-600/40" />
              </div>
            </CardContent>
          </Card>

          {/* My Recent Grades Card */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-amber-200/40 dark:hover:ring-amber-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-amber-200/60 dark:hover:shadow-amber-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('grading')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                    <Calculator className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.my_grades')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('student.my_grades_desc')}</p>
              {data.recentAssessments && data.recentAssessments.length > 0 ? (
                <div className="space-y-2">
                  {data.recentAssessments.slice(0, 3).map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/20">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{a.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-50/50 dark:bg-amber-900/10 border-amber-200/50 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 shrink-0">
                        {t('student.grade_in')} {a.title}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200/30 dark:border-gray-800/20">
                  <Award className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('student.no_grades')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* My Notebooks Card */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-teal-200/40 dark:hover:ring-teal-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-teal-200/60 dark:hover:shadow-teal-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('notebooks')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                    <BookOpen className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.my_notebooks')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-teal-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('student.my_notebooks_desc')}</p>
              <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gradient-to-br from-teal-50 to-emerald-50/50 dark:from-teal-900/20 dark:to-emerald-900/10 border border-teal-200/30 dark:border-teal-900/20">
                <BookMarked className="h-8 w-8 text-teal-400/60 dark:text-teal-600/40 mb-1" />
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('student.view_all')}</p>
              </div>
            </CardContent>
          </Card>

          {/* My Attendance Card */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-rose-200/40 dark:hover:ring-rose-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-rose-200/60 dark:hover:shadow-rose-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('attendance')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-sm">
                    <CalendarCheck className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.my_attendance')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-rose-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('student.my_attendance_desc')}</p>
              <div className="flex items-center justify-center h-24 rounded-lg bg-gradient-to-br from-rose-50 to-amber-50/50 dark:from-rose-900/20 dark:to-amber-900/10 border border-rose-200/30 dark:border-rose-900/20">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">--</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('student.attendance_rate')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Assessments Card */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-violet-200/40 dark:hover:ring-violet-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-violet-200/60 dark:hover:shadow-violet-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('assessments')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                    <ClipboardCheck className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.upcoming_assessments')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-violet-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{t('student.upcoming_assessments_desc')}</p>
              {data.recentAssessments && data.recentAssessments.length > 0 ? (
                <div className="space-y-2">
                  {data.recentAssessments.slice(0, 3).map((a) => {
                    const daysUntil = Math.max(0, Math.ceil((new Date(a.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
                    return (
                      <div key={a.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100/50 dark:border-violet-900/20">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">{a.title}</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-violet-50/50 dark:bg-violet-900/10 border-violet-200/50 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 shrink-0">
                          {daysUntil} {t('student.days_until')}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-24 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200/30 dark:border-gray-800/20">
                  <ClipboardCheck className="h-8 w-8 text-gray-300 dark:text-gray-600 mb-1" />
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t('student.no_assessments')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar Card */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-emerald-200/40 dark:hover:ring-emerald-700/30 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-200/60 dark:hover:shadow-emerald-800/30 cursor-pointer min-h-[44px]" onClick={() => setCurrentView('calendar')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                    <CalendarIconNav className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('nav.calendar')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-emerald-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center justify-center h-24 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 border border-emerald-200/30 dark:border-emerald-900/20">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long' })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student Grades Trend Chart */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-sm">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.my_grades_trend')}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t('student.grade_trend_up')}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-1">
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { subject: t('student.notebook_math').substring(0, 3), grade: 2.3 },
                  { subject: t('student.notebook_german').substring(0, 3), grade: 1.8 },
                  { subject: t('student.notebook_english').substring(0, 3), grade: 2.7 },
                  { subject: t('student.notebook_science').substring(0, 3), grade: 2.1 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="subject" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis domain={[1, 6]} reversed tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                  <Bar dataKey="grade" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={1000} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student Competition Standings */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]" onClick={() => setCurrentView('competitions')}>
            <CardHeader className="p-4 pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm">
                    <Trophy className="h-4 w-4" />
                  </div>
                  <CardTitle className="text-sm font-semibold">{t('student.competition_standings')}</CardTitle>
                </div>
                <ChevronRight className="h-4 w-4 text-amber-500" />
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex items-center justify-center h-20 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 border border-amber-200/30 dark:border-amber-900/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-sm">
                    <Trophy className="h-5 w-5" />
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-amber-600 dark:text-amber-400">#12</p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('student.my_rank')} · 245 {t('student.points')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Student School Announcements */}
        <DashboardAnnouncementsCard currentUser={currentUser} locale={locale} />
      </motion.div>
    );
  }

  // ─── Parent Dashboard ──────────────────────────────────────────────
  if (currentUser?.role === 'PARENT') {
    return (
      <ParentDashboard
        currentUser={currentUser}
        setCurrentView={setCurrentView}
        locale={locale}
      />
    );
  }

  // ─── School Admin Dashboard ─────────────────────────────────────────
  if (currentUser?.role === 'SCHOOL_ADMIN') {
    return (
      <SchoolAdminDashboard
        currentUser={currentUser}
        setCurrentView={setCurrentView}
        locale={locale}
        data={data}
      />
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
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 150, damping: 12 }}
                className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/30 ring-2 ring-emerald-200/30 dark:ring-emerald-800/20"
              >
                <Sparkles className="w-6 h-6" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 dark:from-emerald-400 dark:via-teal-400 dark:to-emerald-300 bg-clip-text text-transparent">
                  {getTimeGreeting()}, {currentUser?.firstName}!
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

          {/* Tip of the day — enhanced with gradient border */}
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-amber-400/20 via-emerald-400/20 to-teal-400/20 dark:from-amber-400/10 dark:via-emerald-400/10 dark:to-teal-400/10 blur-sm" />
            <div className="relative flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-50/80 via-teal-50/40 to-transparent dark:from-emerald-900/15 dark:via-teal-900/10 dark:to-transparent border border-emerald-200/30 dark:border-emerald-800/20">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm shrink-0"
              >
                <dailyTip.icon className="h-4 w-4" />
              </motion.div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-snug">
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">{t('dashboard.daily_tip')}:</span>{' '}
                {dailyTip.text}
              </p>
            </div>
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
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                    <Card className={`card-shadow-transition border-0 shadow-sm rounded-xl overflow-hidden transition-all duration-300 ${colors.hoverShadow} ${colors.glowColor} cursor-default ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:ring-2 hover:ring-emerald-200/60 dark:hover:ring-emerald-700/40`}>
                      {/* Gradient top border */}
                      <div className={`h-1 bg-gradient-to-r ${colors.gradient}`} />
                      <CardContent className={`p-5 ${colors.bg}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 leading-tight line-clamp-2 min-h-[28px] break-words min-w-0">
                            {stat.label}
                          </p>
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ duration: 0.15 }}
                            className={`flex items-center justify-center w-9 h-9 rounded-lg ${colors.iconBg} ${colors.iconText} shadow-md shadow-emerald-200/30 shrink-0`}
                          >
                            <stat.icon className="h-4 w-4" />
                          </motion.div>
                        </div>
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 leading-none">
                            <CountUp target={stat.value} />
                          </p>
                          {stat.value > 0 && stat.trend === 'up' && (
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-100/80 dark:bg-emerald-900/30"
                            >
                              <ArrowUpRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">{trendPct > 0 ? `+${trendPct}%` : ''}</span>
                            </motion.div>
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
                          <span>{t('dashboard.updated_at')} {currentTime}</span>
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

      {/* ===== TEACHER COMPETENCE PROGRESS RADAR ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm">
                <Flower2 className="h-4 w-4" />
              </div>
              {t('dashboard.competency_progress')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">{t('dashboard.competency_progress_desc')}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={[
                { subject: t('student.notebook_math'), current: 3.5, target: 4 },
                { subject: t('student.notebook_german'), current: 3.8, target: 4 },
                { subject: t('student.notebook_english'), current: 2.9, target: 4 },
                { subject: t('student.notebook_science'), current: 3.2, target: 4 },
                { subject: locale === 'de' ? 'Musik' : 'Music', current: 3.6, target: 4 },
                { subject: locale === 'de' ? 'Sport' : 'PE', current: 4.0, target: 4 },
              ]}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} tick={{ fontSize: 10 }} />
                <Radar name={locale === 'de' ? 'Aktuell' : 'Current'} dataKey="current" stroke="#10b981" fill="#10b981" fillOpacity={0.3} isAnimationActive animationDuration={1200} animationEasing="ease-out" />
                <Radar name={locale === 'de' ? 'Ziel' : 'Target'} dataKey="target" stroke="#14b8a6" fill="#14b8a6" fillOpacity={0.1} strokeDasharray="5 5" isAnimationActive animationDuration={1500} animationEasing="ease-out" />
                <RechartsTooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </RadarChart>
            </ResponsiveContainer>

            {/* Animated progress bars for each subject */}
            <div className="mt-4 space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.competency_progress')}</h4>
              {[
                { subject: t('student.notebook_math'), current: 3.5, target: 4, color: 'from-amber-400 to-orange-500' },
                { subject: t('student.notebook_german'), current: 3.8, target: 4, color: 'from-emerald-400 to-teal-500' },
                { subject: t('student.notebook_english'), current: 2.9, target: 4, color: 'from-rose-400 to-pink-500' },
                { subject: t('student.notebook_science'), current: 3.2, target: 4, color: 'from-violet-400 to-purple-500' },
              ].map((item) => {
                const pct = Math.round((item.current / item.target) * 100);
                return (
                  <div key={item.subject} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{item.subject}</span>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{item.current}/{item.target}</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                        className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== UPCOMING LESSONS ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                <Clock className="h-4 w-4" />
              </div>
              {t('teacher.upcoming_lessons')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1">
                · {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.classesOverview.length === 0 ? (
              <div className="text-center py-6">
                <Clock className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('teacher.no_lessons')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {data.classesOverview.slice(0, 4).map((cls, idx) => {
                  const times = ['08:00 – 08:45', '09:00 – 09:45', '10:00 – 10:45', '11:00 – 11:45'];
                  const subjects = [t('student.notebook_math'), t('student.notebook_german'), t('student.notebook_english'), t('student.notebook_science')];
                  const colors = ['from-amber-400 to-orange-500', 'from-emerald-400 to-teal-500', 'from-rose-400 to-pink-500', 'from-violet-400 to-purple-500'];
                  return (
                    <motion.div
                      key={cls.id}
                      whileHover={{ scale: 1.01, x: 2 }}
                      transition={{ duration: 0.15 }}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40 hover:border-violet-200/60 dark:hover:border-violet-800/30 transition-colors min-h-[44px]"
                    >
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${colors[idx % colors.length]} text-white shadow-sm shrink-0`}>
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{subjects[idx % subjects.length]} — {cls.name}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{times[idx % times.length]} · {t('teacher.student_count')}: {cls.studentCount}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{times[idx % times.length].split(' – ')[0]}</Badge>
                        <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-violet-500 transition-colors" />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== TODAY'S SCHEDULE ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] card-hover-lift">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-amber-50/50 via-emerald-50/20 to-transparent dark:from-amber-900/10 dark:via-emerald-900/5 dark:to-transparent">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-emerald-500 text-white shadow-sm">
                <CalendarDays className="h-4 w-4" />
              </div>
              {t('dashboard.class_overview_grid')}
              <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                · {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[
                { icon: PenLine, label: t('action.log_entry'), desc: t('dashboard.quick_action_assessment_desc'), view: 'progress', color: 'from-emerald-400 to-teal-500' },
                { icon: ClipboardCheck, label: t('action.create_assessment'), desc: t('dashboard.quick_action_assessment_desc'), view: 'assessments', color: 'from-amber-400 to-rose-500' },
                { icon: BookOpen, label: locale === 'de' ? 'Kompetenzblume ansehen' : 'View competence flower', desc: locale === 'de' ? 'Radar-Chart pruefen' : 'Check radar chart', view: 'flower', color: 'from-violet-400 to-emerald-500' },
                { icon: Notebook, label: locale === 'de' ? 'Notizbuch aktualisieren' : 'Update notebook', desc: locale === 'de' ? 'Hefte bearbeiten' : 'Edit notebooks', view: 'notebooks', color: 'from-teal-400 to-emerald-500' },
              ].map((item, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.01, x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setCurrentView(item.view as ViewName)}
                  className="w-full group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-gray-50/80 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border border-gray-100/60 dark:border-gray-800/40 hover:border-emerald-200/60 dark:hover:border-emerald-800/30 transition-all relative overflow-hidden"
                >
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-sm shrink-0 transition-transform duration-200 group-hover:scale-110`}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{item.label}</p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-emerald-500 transition-colors shrink-0" />
                </motion.button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== QUICK ACTION BUTTONS ===== */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row flex-wrap gap-3">
        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
          <Button
            onClick={() => setCurrentView('progress')}
            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-300/30 rounded-xl px-6 h-12 min-h-[44px] transition-shadow hover:shadow-xl hover:shadow-emerald-300/40"
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
            className="border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 rounded-xl px-6 h-12 min-h-[44px] transition-shadow hover:shadow-md hover:shadow-emerald-100/40"
          >
            <ClipboardCheck className="h-5 w-5 mr-2" />
            {t('action.create_assessment')}
          </Button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.02, y: -1 }} whileTap={{ scale: 0.98 }} transition={{ duration: 0.15 }}>
          <Button
            onClick={() => setCurrentView('reports')}
            variant="outline"
            className="border-teal-300 dark:border-teal-700 hover:bg-teal-50 dark:hover:bg-teal-900/20 text-teal-700 dark:text-teal-300 rounded-xl px-6 h-12 min-h-[44px] transition-shadow hover:shadow-md hover:shadow-teal-100/40"
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  className={`group text-left p-4 min-h-[80px] rounded-xl bg-gradient-to-br ${action.tile} border ${action.border} hover:shadow-lg ${action.hoverGlow} transition-shadow duration-300 relative overflow-hidden`}
                >
                  {/* Subtle glass overlay on hover */}
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/20 dark:group-hover:bg-white/5 transition-colors duration-300 pointer-events-none rounded-xl" />
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-xl ${action.iconBg} ${action.iconText} shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:rotate-3`}>
                        <action.icon className="h-6 w-6" />
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

      {/* ===== CLASS OVERVIEW MINI CARD GRID ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-5 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                  <School className="h-4 w-4" />
                </div>
                {t('dashboard.class_overview_grid')}
                {data.classesOverview.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-[10px] bg-emerald-100/80 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">
                    {data.classesOverview.length}
                  </Badge>
                )}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView('classes')}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 min-h-[44px] px-2"
              >
                {t('dashboard.view_all')}
                <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
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
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.classesOverview.map((cls, idx) => {
                  const gradientIdx = idx % avatarGradients.length;
                  const totalStudents = cls.studentCount;
                  const maxStudents = Math.max(...data.classesOverview.map(c => c.studentCount), 1);
                  const fillPct = Math.round((totalStudents / maxStudents) * 100);

                  return (
                    <motion.div
                      key={cls.id}
                      whileHover={{ scale: 1.03, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="cursor-pointer"
                      onClick={() => {
                        useAppStore.getState().setCurrentClass(cls.id);
                        setCurrentView('classes');
                      }}
                    >
                      <div className="relative rounded-xl overflow-hidden border border-gray-200/40 dark:border-gray-700/40 bg-white dark:bg-gray-900/50 hover:shadow-md transition-shadow duration-200">
                        {/* Gradient top strip */}
                        <div className={`h-1.5 bg-gradient-to-r ${avatarGradients[gradientIdx]}`} />
                        <div className="p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${avatarGradients[gradientIdx]} text-white text-[10px] font-bold shadow-sm shrink-0`}>
                              {cls.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{cls.name}</p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('label.grade')} {cls.gradeLevel}</p>
                            </div>
                          </div>
                          {/* Mini student count bar */}
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('dashboard.total_students')}</span>
                            <span className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{cls.studentCount}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${fillPct}%` }}
                              transition={{ duration: 0.8, ease: 'easeOut', delay: idx * 0.05 }}
                              className={`h-full rounded-full bg-gradient-to-r ${avatarGradients[gradientIdx]}`}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
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

      {/* ===== RECENT ACTIVITY TIMELINE ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                  <TrendingUp className="h-4 w-4" />
                </div>
                {t('dashboard.activity_timeline')}
              </CardTitle>
              <span className="text-xs text-gray-500 dark:text-gray-400">{t('dashboard.activity_timeline_desc')}</span>
            </div>
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
              <div className="relative activity-timeline max-h-96 overflow-y-auto scrollbar-education pr-1">
                {/* Timeline connector line */}
                <div className="absolute left-[22px] top-4 bottom-4 w-px bg-gradient-to-b from-teal-200 via-emerald-200 to-transparent dark:from-teal-800 dark:via-emerald-800" />
                {data.recentEntries.slice(0, typeof window !== 'undefined' && window.innerWidth < 640 ? 5 : 10).map((entry, idx) => {
                  const catColor = entry.competency.category.color ?? '#10b981';
                  const studentName = `${entry.student.firstName} ${entry.student.lastName}`;
                  const gradient = getAvatarGradient(studentName);
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.05 }}
                      whileHover={{ scale: 1.01, x: 2 }}
                      className="activity-timeline-item group flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-gray-50/80 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border border-gray-100/60 dark:border-gray-800/40 hover:border-emerald-200/60 dark:hover:border-emerald-800/30 transition-colors relative overflow-hidden mb-2 ml-6"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-sm" style={{ backgroundColor: catColor }} />
                      </div>

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

      {/* ===== ANNOUNCEMENTS & HOMEWORK DUE ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Announcements Card */}
        <DashboardAnnouncementsCard currentUser={currentUser} locale={locale} />

        {/* Homework Due Soon Card */}
        <DashboardHomeworkCard currentUser={currentUser} locale={locale} />
      </div>

      {/* ===== UPCOMING SCHOOL EVENTS ===== */}
      <DashboardSchoolEventsCard currentUser={currentUser} locale={locale} />

      {/* ===== PAPER SAVED & ENVIRONMENTAL SECTION ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Paper Saved Counter — enhanced with CountUp */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden bg-white dark:bg-gray-950 ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            {/* Gradient top border */}
            <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.4, type: 'spring', stiffness: 150 }}
                  className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/30 shrink-0"
                >
                  <Leaf className="h-8 w-8 animate-leaf-sway" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    {t('dashboard.paper_saved')}
                  </h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                      <CountUp target={data.stats.totalProgressEntries * 50} />
                    </span>
                    <span className="text-sm text-emerald-600/70 dark:text-emerald-400/60 font-medium">
                      {t('dashboard.paper_saved_pages')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mt-2">
                    {t('dashboard.env_tip_text')}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.5, duration: 0.3 }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100/60 dark:bg-emerald-900/30 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"
                    >
                      <TreePine className="h-3 w-3" />
                      ~{(data.stats.totalProgressEntries * 50 / 8000).toFixed(1)} {t('dashboard.paper_saved_trees')}
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.7, duration: 0.3 }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-teal-100/60 dark:bg-teal-900/30 text-[11px] font-semibold text-teal-600 dark:text-teal-400"
                    >
                      <Sprout className="h-3 w-3" />
                      {(data.stats.totalProgressEntries * 50 * 0.005).toFixed(1)} {t('dashboard.paper_saved_co2')}
                    </motion.div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Environmental Tips — visually enhanced */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden bg-white dark:bg-gray-950 ring-1 ring-black/[0.03] dark:ring-white/[0.05] card-hover-lift">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-md shrink-0">
                  <TreePine className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                    {t('dashboard.env_tip_title')}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {t('dashboard.env_tip_text')}
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    {[
                      { icon: Leaf, text: locale === 'de' ? 'Digital statt Papier' : 'Digital instead of paper' },
                      { icon: Sprout, text: locale === 'de' ? 'Nachhaltig dokumentieren' : 'Sustainable documentation' },
                      { icon: TreePine, text: locale === 'de' ? 'Baeume schuetzen' : 'Protect trees' },
                      { icon: Trees, text: locale === 'de' ? 'CO2 einsparen' : 'Reduce CO2' },
                    ].map((tip, i) => (
                      <div key={i} className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/30 dark:border-emerald-800/20">
                        <tip.icon className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-medium">{tip.text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== SCHOOL BRANDING SECTION ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          {/* Gradient top border */}
          <div className="h-1.5 bg-gradient-to-r from-emerald-400 via-teal-400 to-violet-400" />
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
                className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/30 shrink-0"
              >
                <School className="h-7 w-7" />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-300 mb-1">
                  {t('dashboard.school_branding')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {t('dashboard.school_branding_desc')}
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <div className="flex items-center gap-1">
                    <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-sm" />
                    <div className="w-4 h-4 rounded-full bg-teal-500 shadow-sm" />
                    <div className="w-4 h-4 rounded-full bg-violet-500 shadow-sm" />
                    <div className="w-4 h-4 rounded-full bg-amber-500 shadow-sm" />
                    <div className="w-4 h-4 rounded-full bg-rose-500 shadow-sm" />
                  </div>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500">{t('app.name')}</span>
                </div>
              </div>
              <div className="hidden sm:flex flex-col items-end gap-1 shrink-0">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {currentUser?.schoolId ? t('nav.classes') : 'CompetenceTrack'}
                </Badge>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  {t('dashboard.total_students')}: {data.stats.totalStudents} · {t('dashboard.total_classes')}: {data.stats.totalClasses}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== UPCOMING EXAMS & AI TIPS ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams with Countdown */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                  <CalendarDays className="h-4 w-4" />
                </div>
                {t('dashboard.upcoming_exams')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('dashboard.upcoming_exams_desc')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {data.classesOverview.length === 0 ? (
                <div className="text-center py-6">
                  <CalendarDays className="h-8 w-8 text-amber-400 dark:text-amber-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400">{locale === 'de' ? 'Keine Pruefungen geplant' : 'No exams planned'}</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-education">
                  {data.classesOverview.slice(0, 4).map((cls, idx) => {
                    const daysLeft = Math.max(0, Math.floor(Math.random() * 30) + 1);
                    const isUrgent = daysLeft <= 3;
                    const isTomorrow = daysLeft === 1;
                    const isToday = daysLeft === 0;
                    return (
                      <motion.div
                        key={cls.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-50/60 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0 border border-amber-100/60 dark:border-amber-900/30 hover:shadow-md transition-shadow"
                      >
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${isUrgent ? 'bg-gradient-to-br from-red-400 to-red-500' : isTomorrow ? 'bg-gradient-to-br from-amber-400 to-amber-500' : 'bg-gradient-to-br from-amber-300 to-amber-400'} text-white shadow-sm`}>
                          <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{cls.name} - {locale === 'de' ? 'Klassenarbeit' : 'Class Test'}</p>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400">
                            {locale === 'de' ? 'Mathematik' : 'Mathematics'} · {cls.studentCount} {locale === 'de' ? 'Schueler' : 'students'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <Badge className={`${isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' : isTomorrow ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'} text-xs font-bold`}>
                            {isToday ? t('dashboard.today') : isTomorrow ? t('dashboard.tomorrow') : `${daysLeft} ${t('dashboard.days_left')}`}
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

        {/* AI Tips Section */}
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                {t('dashboard.ai_tips')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('dashboard.ai_tips_desc')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { icon: Lightbulb, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-100/60 dark:border-amber-900/30', tip: locale === 'de' ? 'Nutzen Sie die KI-Benotungspruefung, um Fairness in der Notenvergabe zu gewaehrleisten.' : 'Use AI grading review to ensure fairness in grade assignment.' },
                  { icon: Target, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100/60 dark:border-emerald-900/30', tip: locale === 'de' ? 'Erstellen Sie personalisierte Uebungen mit dem KI-Testgenerator.' : 'Create personalized exercises with the AI test generator.' },
                  { icon: Zap, color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-100/60 dark:border-violet-900/30', tip: locale === 'de' ? 'Verwenden Sie die Sammelbenotung fuer effizientere Notenvergabe.' : 'Use bulk grading for more efficient grade assignment.' },
                  { icon: BookOpen, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-100/60 dark:border-teal-900/30', tip: locale === 'de' ? 'Stift-Anmerkungen helfen bei der individuellen Rueckmeldung.' : 'Stylus annotations help with individual feedback.' },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={`flex items-start gap-3 p-3 rounded-xl ${item.bg} border ${item.border}`}
                  >
                    <item.icon className={`h-5 w-5 ${item.color} shrink-0 mt-0.5`} />
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{item.tip}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ===== SCHOOL NEWS / NEWSLETTER SECTION ===== */}
      <DashboardNewsletterCard currentUser={currentUser} locale={locale} />

    </motion.div>
  );
}

/* ── Dashboard Announcements Card ──────────────────────────────── */

interface DashboardAnnouncement {
  id: string;
  title: string;
  content: string;
  priority: string;
  isPinned: boolean;
  targetAudience: string;
  author: { id: string; firstName: string; lastName: string };
  classGroup: { id: string; name: string } | null;
  createdAt: string;
}

function DashboardAnnouncementsCard({ currentUser, locale }: { currentUser: CurrentUser | null; locale: string }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [announcements, setAnnouncements] = useState<DashboardAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', priority: 'normal', targetAudience: 'all' });
  const [creating, setCreating] = useState(false);

  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!currentUser?.schoolId) return;
    apiGet<DashboardAnnouncement[]>(`/api/announcements?schoolId=${currentUser.schoolId}&limit=5`)
      .then((data) => { setAnnouncements(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser?.schoolId]);

  const handleCreate = async () => {
    if (!currentUser?.schoolId || !createForm.title || !createForm.content) return;
    setCreating(true);
    try {
      await apiPost('/api/announcements', {
        schoolId: currentUser.schoolId,
        title: createForm.title,
        content: createForm.content,
        priority: createForm.priority,
        targetAudience: createForm.targetAudience,
      });
      toast.success(t('announcement.create_success'));
      setCreateOpen(false);
      setCreateForm({ title: '', content: '', priority: 'normal', targetAudience: 'all' });
      // Reload
      const data = await apiGet<DashboardAnnouncement[]>(`/api/announcements?schoolId=${currentUser.schoolId}&limit=5`);
      setAnnouncements(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('announcement.create_error'));
    } finally {
      setCreating(false);
    }
  };

  const getPriorityBorder = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-rose-500';
      case 'high': return 'border-l-amber-500';
      case 'normal': return 'border-l-emerald-500';
      case 'low': return 'border-l-teal-500';
      default: return 'border-l-emerald-500';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      case 'high': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'normal': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
      case 'low': return 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300';
      default: return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    }
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

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-rose-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-rose-50/50 to-transparent dark:from-rose-900/10 dark:to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                <Megaphone className="h-4 w-4" />
              </div>
              {t('announcement.title')}
            </CardTitle>
            {isTeacherOrAdmin && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="min-h-[44px] text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30 hover:bg-rose-50 dark:hover:bg-rose-900/20">
                    <Plus className="h-3 w-3 mr-1" /> {t('announcement.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('announcement.create_title')}</DialogTitle>
                    <DialogDescription>{t('announcement.create_description')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>{t('announcement.field_title')}</Label>
                      <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder={t('announcement.field_title_placeholder')} />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('announcement.field_content')}</Label>
                      <Textarea value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} placeholder={t('announcement.field_content_placeholder')} rows={4} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('announcement.field_priority')}</Label>
                        <Select value={createForm.priority} onValueChange={(v) => setCreateForm({ ...createForm, priority: v })}>
                          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">{t('announcement.priority_low')}</SelectItem>
                            <SelectItem value="normal">{t('announcement.priority_normal')}</SelectItem>
                            <SelectItem value="high">{t('announcement.priority_high')}</SelectItem>
                            <SelectItem value="urgent">{t('announcement.priority_urgent')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>{t('announcement.field_target')}</Label>
                        <Select value={createForm.targetAudience} onValueChange={(v) => setCreateForm({ ...createForm, targetAudience: v })}>
                          <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t('announcement.target_all')}</SelectItem>
                            <SelectItem value="teachers">{t('announcement.target_teachers')}</SelectItem>
                            <SelectItem value="students">{t('announcement.target_students')}</SelectItem>
                            <SelectItem value="parents">{t('announcement.target_parents')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
                    <Button onClick={handleCreate} disabled={creating} className="min-h-[44px]">{creating ? t('announcement.creating') : t('action.create')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/20 mx-auto mb-4">
                <Megaphone className="h-8 w-8 text-rose-400 dark:text-rose-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('announcement.no_announcements')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education pr-1">
              {announcements.map((ann) => (
                <motion.div
                  key={ann.id}
                  className={`rounded-xl border-l-3 ${getPriorityBorder(ann.priority)} p-3 bg-gray-50/50 dark:bg-gray-800/30 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer`}
                  onClick={() => setExpanded(expanded === ann.id ? null : ann.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {ann.isPinned && <Pin className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{ann.title}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className={`text-[10px] ${getPriorityBadge(ann.priority)}`}>{t(`announcement.priority_${ann.priority}`)}</Badge>
                      {expanded === ann.id ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded === ann.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 whitespace-pre-wrap">{ann.content}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{ann.author.firstName} {ann.author.lastName}</span>
                          <span className="text-border">|</span>
                          <span>{relativeTime(ann.createdAt)}</span>
                          {ann.classGroup && (
                            <>
                              <span className="text-border">|</span>
                              <span>{ann.classGroup.name}</span>
                            </>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {expanded !== ann.id && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ann.content}</p>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Dashboard Homework Due Card ───────────────────────────────── */

interface DashboardHomework {
  id: string;
  title: string;
  dueDate: string;
  homeworkType: string;
  maxPoints: number | null;
  classGroup: { id: string; name: string; gradeLevel: number };
  subject: { id: string; name: string } | null;
  teacher: { id: string; firstName: string; lastName: string };
  _count?: { submissions: number };
}

function DashboardHomeworkCard({ currentUser, locale }: { currentUser: CurrentUser | null; locale: string }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [homeworks, setHomeworks] = useState<DashboardHomework[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.schoolId) return;
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    apiGet<DashboardHomework[]>(`/api/homework?schoolId=${currentUser.schoolId}&dueDateFrom=${now.toISOString()}&dueDateTo=${weekFromNow.toISOString()}&isPublished=true`)
      .then((data) => { setHomeworks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser?.schoolId]);

  const getDueDateStatus = (dueDate: string): 'overdue' | 'today' | 'upcoming' => {
    const now = new Date();
    const due = new Date(dueDate);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    if (dueDay < today) return 'overdue';
    if (dueDay.getTime() === today.getTime()) return 'today';
    return 'upcoming';
  };

  const getDueDateColor = (status: 'overdue' | 'today' | 'upcoming') => {
    switch (status) {
      case 'overdue': return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
      case 'today': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
      case 'upcoming': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    }
  };

  const getDueDateLabel = (dueDate: string) => {
    const status = getDueDateStatus(dueDate);
    const due = new Date(dueDate);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (status === 'overdue') return t('homework.overdue_days', { days: Math.abs(diffDays) });
    if (status === 'today') return t('homework.due_today');
    if (diffDays === 1) return t('homework.due_tomorrow');
    return t('homework.due_in_days', { days: diffDays });
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                <BookCheck className="h-4 w-4" />
              </div>
              {t('homework.due_soon')}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentView('homework')}
              className="min-h-[44px] text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            >
              {t('homework.view_all')} <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : homeworks.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/20 mx-auto mb-4">
                <BookCheck className="h-8 w-8 text-amber-400 dark:text-amber-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('homework.no_due_soon')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education pr-1">
              {homeworks.slice(0, 6).map((hw) => {
                const dueStatus = getDueDateStatus(hw.dueDate);
                return (
                  <motion.div
                    key={hw.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40 hover:border-amber-200/60 dark:hover:border-amber-800/30 transition-colors cursor-pointer"
                    onClick={() => setCurrentView('homework')}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white text-xs font-bold shadow-sm shrink-0">
                        <BookCheck className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{hw.title}</p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                          {hw.classGroup.name}{hw.subject ? ` | ${hw.subject.name}` : ''}
                        </p>
                      </div>
                    </div>
                    <Badge className={`text-xs shrink-0 ${getDueDateColor(dueStatus)}`}>
                      <Clock className="h-3 w-3 mr-1" />
                      {getDueDateLabel(hw.dueDate)}
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── School Event Types ──────────────────────────────────────────────
interface SchoolEventData {
  id: string;
  schoolId: string;
  title: string;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  organizerId: string | null;
  classGroupId: string | null;
  isAllSchool: boolean;
  isPublic: boolean;
  requiresRegistration: boolean;
  maxParticipants: number | null;
  notes: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  organizer: { id: string; firstName: string; lastName: string } | null;
  classGroup: { id: string; name: string } | null;
  registrations: { id: string; userId: string; status: string; user: { id: string; firstName: string; lastName: string } }[];
}

const eventTypeIcon: Record<string, React.ElementType> = {
  assembly: UsersIcon,
  field_trip: MapPin,
  sports_day: Trophy,
  concert: Music,
  fair: Tent,
  parent_meeting: UsersIcon,
  graduation: GraduationCap,
  holiday: CalendarDays,
};

const eventTypeColor: Record<string, string> = {
  assembly: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  field_trip: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  sports_day: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
  concert: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  fair: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
  parent_meeting: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  graduation: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  holiday: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
};

function DashboardSchoolEventsCard({ currentUser, locale }: { currentUser: CurrentUser | null; locale: string }) {
  const setCurrentView = useAppStore((s) => s.setCurrentView);
  const [events, setEvents] = useState<SchoolEventData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    apiGet<SchoolEventData[]>(`/api/school-events?schoolId=${currentUser.schoolId}&upcoming=true`)
      .then((data) => {
        setEvents(data.slice(0, 6));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentUser?.schoolId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <CalendarDays className="h-4 w-4" />
              </div>
              {t('events.upcoming')}
            </CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="min-h-[44px] text-teal-600 dark:text-teal-400 border-teal-200/50 dark:border-teal-900/30 hover:bg-teal-50 dark:hover:bg-teal-900/20"
              onClick={() => setCurrentView('calendar')}
            >
              {t('events.view_all')} <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 mx-auto mb-4">
                <CalendarDays className="h-8 w-8 text-teal-400 dark:text-teal-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('events.no_events')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-education pr-1">
              {events.map((event) => {
                const Icon = eventTypeIcon[event.eventType] ?? CalendarDays;
                const iconColor = eventTypeColor[event.eventType] ?? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400';
                const isRegistered = event.registrations.some((r) => r.userId === currentUser?.id && r.status === 'registered');
                return (
                  <motion.div
                    key={event.id}
                    whileHover={{ scale: 1.01, x: 2 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100/60 dark:border-gray-800/40 hover:border-teal-200/60 dark:hover:border-teal-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${iconColor} shrink-0`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{event.title}</p>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
                          <span>{formatDate(event.startDate)}</span>
                          {event.location && (
                            <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{event.location}</span>
                          )}
                          {event.isAllSchool && (
                            <Badge className="bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-300 text-[9px] px-1 py-0">{t('events.all_school')}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {event.requiresRegistration && (
                        isRegistered ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">
                            {t('events.registered')}
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[36px] text-xs rounded-lg border-teal-300 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                            onClick={async () => {
                              try {
                                await apiPost(`/api/school-events/${event.id}/register`, { userId: currentUser?.id });
                                setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, registrations: [...e.registrations, { id: 'new', userId: currentUser?.id ?? '', status: 'registered', user: { id: currentUser?.id ?? '', firstName: currentUser?.firstName ?? '', lastName: currentUser?.lastName ?? '' } }] } : e));
                                toast.success(t('events.register'));
                              } catch { toast.error(t('error.generic')); }
                            }}
                          >
                            {t('events.register')}
                          </Button>
                        )
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ── Dashboard Newsletter Card ──────────────────────────────────── */

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  general: { icon: Newspaper, color: 'text-gray-600 dark:text-gray-300', bg: 'category-badge-general' },
  academic: { icon: BookOpen, color: 'text-blue-600 dark:text-blue-400', bg: 'category-badge-academic' },
  sports: { icon: Trophy, color: 'text-green-600 dark:text-green-400', bg: 'category-badge-sports' },
  arts: { icon: Palette, color: 'text-purple-600 dark:text-purple-400', bg: 'category-badge-arts' },
  events: { icon: CalendarDays, color: 'text-amber-600 dark:text-amber-400', bg: 'category-badge-events' },
  community: { icon: UsersIcon, color: 'text-rose-600 dark:text-rose-400', bg: 'category-badge-community' },
};

function DashboardNewsletterCard({ currentUser, locale }: { currentUser: CurrentUser | null; locale: string }) {
  const [newsletters, setNewsletters] = useState<NewsletterData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingNewsletter, setViewingNewsletter] = useState<NewsletterData | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', content: '', summary: '', category: 'general', imageUrl: '' });
  const [creating, setCreating] = useState(false);

  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    fetchNewsletters(currentUser.schoolId, true, undefined, 3)
      .then((data) => { setNewsletters(data.newsletters); setLoading(false); })
      .catch(() => setLoading(false));
  }, [currentUser?.schoolId]);

  const handleCreate = async () => {
    if (!currentUser?.schoolId || !createForm.title || !createForm.content) return;
    setCreating(true);
    try {
      const nl = await createNewsletter({
        schoolId: currentUser.schoolId,
        authorId: currentUser.id,
        title: createForm.title,
        content: createForm.content,
        summary: createForm.summary || undefined,
        category: createForm.category,
        imageUrl: createForm.imageUrl || undefined,
      });
      await apiPost(`/api/newsletters/${nl.id}`, { action: 'publish' });
      toast.success(t('newsletter.published'));
      setCreateOpen(false);
      setCreateForm({ title: '', content: '', summary: '', category: 'general', imageUrl: '' });
      const data = await fetchNewsletters(currentUser.schoolId, true, undefined, 3);
      setNewsletters(data.newsletters);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error');
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const handleShare = (nl: NewsletterData) => {
    if (navigator.share) {
      navigator.share({ title: nl.title, text: nl.summary || '', url: window.location.href });
    } else {
      navigator.clipboard.writeText(`${nl.title} - ${nl.summary || ''}`);
      toast.success(locale === 'de' ? 'Link kopiert!' : 'Link copied!');
    }
  };

  return (
    <motion.div variants={itemVariants}>
      <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden transition-shadow duration-200 hover:shadow-md ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                <Newspaper className="h-4 w-4" />
              </div>
              <span className="animated-underline">{t('newsletter.school_news')}</span>
            </CardTitle>
            {isTeacherOrAdmin && (
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="min-h-[44px] text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-900/30 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                    <Plus className="h-3 w-3 mr-1" /> {t('newsletter.create')}
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{t('newsletter.create')}</DialogTitle>
                    <DialogDescription>{locale === 'de' ? 'Erstellen Sie einen neuen Schulnachrichten-Eintrag.' : 'Create a new school newsletter entry.'}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium">{locale === 'de' ? 'Titel' : 'Title'}</Label>
                      <Input value={createForm.title} onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })} placeholder={locale === 'de' ? 'Nachrichtentitel...' : 'Newsletter title...'} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('newsletter.summary')}</Label>
                      <Input value={createForm.summary} onChange={(e) => setCreateForm({ ...createForm, summary: e.target.value })} placeholder={locale === 'de' ? 'Kurze Zusammenfassung...' : 'Short summary...'} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">{t('newsletter.content')}</Label>
                      <Textarea value={createForm.content} onChange={(e) => setCreateForm({ ...createForm, content: e.target.value })} placeholder={locale === 'de' ? 'Inhalt der Nachricht...' : 'Newsletter content...'} className="mt-1 min-h-[120px]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium">{t('newsletter.category')}</Label>
                        <Select value={createForm.category} onValueChange={(v) => setCreateForm({ ...createForm, category: v })}>
                          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(categoryConfig).map(([key, cfg]) => (
                              <SelectItem key={key} value={key}>
                                <span className="flex items-center gap-2"><cfg.icon className="h-3.5 w-3.5" /> {t(`newsletter.${key}`)}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">{t('newsletter.cover_image')}</Label>
                        <Input value={createForm.imageUrl} onChange={(e) => setCreateForm({ ...createForm, imageUrl: e.target.value })} placeholder="URL..." className="mt-1" />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
                    <Button onClick={handleCreate} disabled={creating || !createForm.title || !createForm.content} className="min-h-[44px] bg-gradient-to-r from-emerald-500 to-teal-500 text-white">
                      {creating ? '...' : t('newsletter.publish')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          ) : newsletters.length === 0 ? (
            <div className="text-center py-10">
              <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 mx-auto mb-4">
                <Newspaper className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('newsletter.no_news')}</p>
              {isTeacherOrAdmin && (
                <Button size="sm" variant="outline" className="mt-3 min-h-[44px] text-emerald-600 border-emerald-200/50" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-3 w-3 mr-1" /> {t('newsletter.create')}
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {newsletters.map((nl) => {
                const cfg = categoryConfig[nl.category] || categoryConfig.general;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={nl.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                    className="newsletter-card"
                  >
                    {nl.imageUrl && (
                      <div className="h-28 overflow-hidden bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20">
                        <img src={nl.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!nl.imageUrl && (
                      <div className="h-16 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20 flex items-center justify-center">
                        <Icon className="h-6 w-6 text-emerald-400 dark:text-emerald-500" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`category-badge ${cfg.bg}`}>
                          <Icon className="h-3 w-3" />
                          {t(`newsletter.${nl.category}`)}
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{formatDate(nl.publishedAt || nl.createdAt)}</span>
                      </div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 line-clamp-2 mb-1">{nl.title}</h4>
                      {nl.summary && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">{nl.summary}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <Button size="sm" variant="ghost" className="min-h-[36px] text-emerald-600 dark:text-emerald-400 text-xs p-0 h-auto hover:bg-transparent" onClick={() => setViewingNewsletter(nl)}>
                          <Eye className="h-3 w-3 mr-1" /> {t('newsletter.read_more')}
                        </Button>
                        <Button size="sm" variant="ghost" className="min-h-[36px] text-gray-400 h-auto p-0 hover:bg-transparent" onClick={() => handleShare(nl)}>
                          <Share2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Newsletter View Dialog */}
      <Dialog open={!!viewingNewsletter} onOpenChange={() => setViewingNewsletter(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewingNewsletter && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{viewingNewsletter.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-3 mt-2">
                  <span className={`category-badge ${categoryConfig[viewingNewsletter.category]?.bg || 'category-badge-general'}`}>
                    {(() => { const Cfg = categoryConfig[viewingNewsletter.category] || categoryConfig.general; return <Cfg.icon className="h-3 w-3" />; })()}
                    {t(`newsletter.${viewingNewsletter.category}`)}
                  </span>
                  <span className="text-xs text-gray-500">{formatDate(viewingNewsletter.publishedAt || viewingNewsletter.createdAt)}</span>
                  <span className="text-xs text-gray-500">{viewingNewsletter.author.firstName} {viewingNewsletter.author.lastName}</span>
                </DialogDescription>
              </DialogHeader>
              {viewingNewsletter.imageUrl && (
                <div className="rounded-xl overflow-hidden mb-4">
                  <img src={viewingNewsletter.imageUrl} alt="" className="w-full h-48 object-cover" />
                </div>
              )}
              <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewingNewsletter.content) }} />
              {viewingNewsletter.tags && (() => {
                try {
                  const parsed = JSON.parse(viewingNewsletter.tags);
                  if (Array.isArray(parsed) && parsed.length > 0) {
                    return (
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <Tag className="h-3.5 w-3.5 text-gray-400" />
                        {parsed.map((tag: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{tag}</Badge>
                        ))}
                      </div>
                    );
                  }
                } catch { /* ignore */ }
                return null;
              })()}
              <div className="flex justify-end mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <Button size="sm" variant="outline" className="min-h-[44px]" onClick={() => handleShare(viewingNewsletter)}>
                  <Share2 className="h-3.5 w-3.5 mr-1.5" /> {t('newsletter.share')}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
