'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  Frown,
  Moon,
  Activity,
  Brain,
  Users,
  GraduationCap,
  Droplets,
  Utensils,
  Footprints,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  Download,
  Sparkles,
  ChevronRight,
  Clock,
  Shield,
  Phone,
  Stethoscope,
  Syringe,
  FileText,
  RefreshCw,
  BarChart3,
  Zap,
  Bed,
  Coffee,
  Dumbbell,
  Bike,
  Waves,
  PersonStanding,
  Music,
  Eye,
  Star,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
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
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

/* ─── Types ──────────────────────────────────────────────────────── */

interface WellnessCheckin {
  id: string;
  date: string;
  mood: number;
  sleepHours: number | null;
  sleepQuality: number | null;
  stressLevel: number | null;
  activityType: string | null;
  activityMinutes: number | null;
  mealsCount: number | null;
  waterGlasses: number | null;
  gratitudeEntry: string | null;
  notes: string | null;
}

interface WellnessScoreData {
  id: string;
  date: string;
  overallScore: number;
  physicalScore: number | null;
  mentalScore: number | null;
  socialScore: number | null;
  academicScore: number | null;
}

interface WellnessSummary {
  checkinCount: number;
  avgMood: number;
  avgSleepHours: number;
  avgSleepQuality: number;
  avgStressLevel: number;
  totalActivityMinutes: number;
  avgMealsCount: number;
  avgWaterGlasses: number;
  avgOverallScore: number;
  avgPhysicalScore: number;
  avgMentalScore: number;
  avgSocialScore: number;
  avgAcademicScore: number;
  moodDistribution: Record<number, number>;
  stressDistribution: Record<number, number>;
  gratitudeEntries: Array<{ date: string; entry: string }>;
  recommendations: string[];
}

interface TrendDataPoint {
  date: string;
  mood: number | null;
  overallScore: number | null;
  physicalScore: number | null;
  mentalScore: number | null;
  socialScore: number | null;
  academicScore: number | null;
  sleepHours: number | null;
  stressLevel: number | null;
}

interface ClassAvgPoint {
  date: string;
  avgOverall: number;
  avgMood: number;
  avgStress: number;
}

interface HealthRecordData {
  student: { id: string; firstName: string; lastName: string; dateOfBirth: string | null };
  healthRecord: {
    bloodType: string | null;
    allergies: string[];
    medications: Array<{ name: string; dosage: string; frequency: string }>;
    conditions: string[];
    doctorName: string | null;
    doctorPhone: string | null;
    insuranceNumber: string | null;
    insuranceProvider: string | null;
    lastCheckup: string | null;
    notes: string | null;
  } | null;
  emergencyContacts: Array<{ id: string; name: string; phone: string; relationship: string }>;
  healthAlerts: Array<{ type: string; label: string; severity: 'warning' | 'info' }>;
}

interface SchoolOverviewData {
  totalCheckins: number;
  totalStudents: number;
  recentCheckins: Array<{ id: string; mood: number; date: string; student: { id: string; firstName: string; lastName: string } }>;
  avgScores: { overall: number; physical: number; mental: number; social: number; academic: number };
  lowWellnessAlerts: number;
}

/* ─── Helper Functions ───────────────────────────────────────────── */

function getMoodIcon(mood: number, size = 20) {
  switch (mood) {
    case 5: return <Sun className="text-amber-500" style={{ width: size, height: size }} />;
    case 4: return <Cloud className="text-sky-400" style={{ width: size, height: size }} />;
    case 3: return <Minus className="text-gray-400" style={{ width: size, height: size }} />;
    case 2: return <CloudRain className="text-blue-400" style={{ width: size, height: size }} />;
    case 1: return <Frown className="text-rose-400" style={{ width: size, height: size }} />;
    default: return <Minus className="text-gray-400" style={{ width: size, height: size }} />;
  }
}

function getMoodLabel(mood: number): string {
  switch (mood) {
    case 5: return t('wellness.mood_excellent');
    case 4: return t('wellness.mood_good');
    case 3: return t('wellness.mood_okay');
    case 2: return t('wellness.mood_low');
    case 1: return t('wellness.mood_very_low');
    default: return '';
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-teal-500';
  if (score >= 40) return 'text-amber-500';
  if (score >= 20) return 'text-orange-500';
  return 'text-rose-500';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return t('wellness.score_excellent');
  if (score >= 60) return t('wellness.score_good');
  if (score >= 40) return t('wellness.score_fair');
  if (score >= 20) return t('wellness.score_poor');
  return t('wellness.score_critical');
}

function getStressColor(level: number): string {
  if (level <= 3) return 'bg-emerald-500';
  if (level <= 5) return 'bg-teal-500';
  if (level <= 7) return 'bg-amber-500';
  if (level <= 9) return 'bg-orange-500';
  return 'bg-rose-500';
}

function getStressLabel(level: number): string {
  if (level <= 3) return t('wellness.stress_low');
  if (level <= 5) return t('wellness.stress_moderate');
  if (level <= 7) return t('wellness.stress_high');
  return t('wellness.stress_very_high');
}

function getSleepQualityLabel(quality: number): string {
  if (quality >= 4) return t('wellness.sleep_excellent');
  if (quality >= 3) return t('wellness.sleep_good');
  if (quality >= 2) return t('wellness.sleep_fair');
  return t('wellness.sleep_poor');
}

function getActivityIcon(type: string | null) {
  switch (type) {
    case 'running': return <Footprints className="h-4 w-4" />;
    case 'walking': return <PersonStanding className="h-4 w-4" />;
    case 'cycling': return <Bike className="h-4 w-4" />;
    case 'swimming': return <Waves className="h-4 w-4" />;
    case 'sports': return <Dumbbell className="h-4 w-4" />;
    case 'dance': return <Music className="h-4 w-4" />;
    case 'yoga': return <Star className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
}

/* ─── Animated Counter Component ─────────────────────────────────── */

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const start = display;
    const end = value;
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);
  return <>{display}</>;
}

/* ─── Circular Wellness Gauge ────────────────────────────────────── */

function WellnessGauge({ score, size = 180 }: { score: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getGaugeColor = (s: number) => {
    if (s >= 80) return '#10b981';
    if (s >= 60) return '#14b8a6';
    if (s >= 40) return '#f59e0b';
    if (s >= 20) return '#f97316';
    return '#ef4444';
  };

  const color = getGaugeColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted-foreground/20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`text-3xl font-bold ${getScoreColor(score)}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: 'spring' }}
        >
          <AnimatedCounter value={Math.round(score)} />
        </motion.span>
        <span className="text-xs text-muted-foreground mt-1">{getScoreLabel(score)}</span>
      </div>
    </div>
  );
}

/* ─── Metric Card ────────────────────────────────────────────────── */

function MetricCard({
  icon,
  label,
  value,
  unit,
  color,
  trend,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit?: string;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="relative overflow-hidden hover:shadow-lg transition-shadow">
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${color}`} />
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${color.replace('from-', 'bg-').replace('to-', '/20').split(' ')[0].replace('bg-', 'bg-')}/10`}>
              {icon}
            </div>
            {trend && (
              <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-rose-500' : 'text-gray-400'}`}>
                {trend === 'up' ? <ArrowUpRight className="h-3 w-3" /> : trend === 'down' ? <ArrowDownRight className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
              </div>
            )}
          </div>
          <div className="text-2xl font-bold">
            <AnimatedCounter value={Math.round(value * 10) / 10} />
            {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Mood Selector ──────────────────────────────────────────────── */

function MoodSelector({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const moods = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-2">
      {moods.map((m) => (
        <motion.button
          key={m}
          whileHover={{ scale: 1.15 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onChange(m)}
          className={`p-3 rounded-xl border-2 transition-all ${
            value === m
              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md'
              : 'border-transparent bg-muted/50 hover:border-muted-foreground/30'
          }`}
        >
          {getMoodIcon(m, 28)}
          <p className="text-[10px] text-center mt-1 text-muted-foreground">{getMoodLabel(m)}</p>
        </motion.button>
      ))}
    </div>
  );
}

/* ─── Stress Level Indicator ─────────────────────────────────────── */

function StressLevelIndicator({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const levels = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{t('wellness.stress_label')}</span>
        <Badge variant={value > 7 ? 'destructive' : value > 4 ? 'secondary' : 'outline'}>
          {value}/10 - {getStressLabel(value)}
        </Badge>
      </div>
      <div className="flex gap-1">
        {levels.map((l) => (
          <motion.button
            key={l}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(l)}
            className={`flex-1 h-8 rounded-md transition-all text-xs font-medium ${
              l <= value
                ? `${getStressColor(l)} text-white`
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {l}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */

export default function StudentWellnessView() {
  const { theme } = useTheme();
  const currentUser = useAppStore((s) => s.currentUser);
  const currentStudentId = useAppStore((s) => s.currentStudentId);
  const currentClassId = useAppStore((s) => s.currentClassId);

  const role = currentUser?.role || 'STUDENT';
  const schoolId = currentUser?.schoolId || '';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';
  const isTeacher = role === 'TEACHER';

  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [checkins, setCheckins] = useState<WellnessCheckin[]>([]);
  const [scores, setScores] = useState<WellnessScoreData[]>([]);
  const [latestScore, setLatestScore] = useState<WellnessScoreData | null>(null);
  const [summary, setSummary] = useState<WellnessSummary | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [classAvgData, setClassAvgData] = useState<ClassAvgPoint[]>([]);
  const [healthRecord, setHealthRecord] = useState<HealthRecordData | null>(null);
  const [schoolOverview, setSchoolOverview] = useState<SchoolOverviewData | null>(null);
  const [summaryPeriod, setSummaryPeriod] = useState<'week' | 'month'>('week');

  // Check-in form state
  const [checkinMood, setCheckinMood] = useState(3);
  const [checkinSleepHours, setCheckinSleepHours] = useState(7);
  const [checkinSleepQuality, setCheckinSleepQuality] = useState(3);
  const [checkinStressLevel, setCheckinStressLevel] = useState(5);
  const [checkinActivityType, setCheckinActivityType] = useState('');
  const [checkinActivityMinutes, setCheckinActivityMinutes] = useState(0);
  const [checkinMealsCount, setCheckinMealsCount] = useState(3);
  const [checkinWaterGlasses, setCheckinWaterGlasses] = useState(6);
  const [checkinGratitude, setCheckinGratitude] = useState('');
  const [checkinNotes, setCheckinNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Determine student ID based on role
  const studentId = useMemo(() => {
    if (isStudent) {
      // For students, find their student record
      return currentStudentId || '';
    }
    return currentStudentId || '';
  }, [isStudent, currentStudentId]);

  // Fetch wellness data
  const fetchWellnessData = useCallback(async () => {
    setLoading(true);
    try {
      if (isAdmin && !studentId) {
        // Admin: school-wide overview
        const data = await apiGet<SchoolOverviewData>(`/api/wellness?schoolId=${schoolId}&role=${role}`);
        setSchoolOverview(data);
        // Also fetch school trends
        const trends = await apiGet<{ trendData: TrendDataPoint[] }>(`/api/wellness/trends?schoolId=${schoolId}&days=30`);
        setTrendData(trends.trendData);
      } else if (isTeacher && currentClassId && !studentId) {
        // Teacher: class overview
        const data = await apiGet<{ checkins: WellnessCheckin[]; scores: WellnessScoreData[]; studentCount: number }>(
          `/api/wellness?schoolId=${schoolId}&role=${role}&classGroupId=${currentClassId}`
        );
        setCheckins(data.checkins);
        setScores(data.scores);
      } else if (studentId) {
        // Individual student data
        const data = await apiGet<{ checkins: WellnessCheckin[]; scores: WellnessScoreData[]; latestScore: WellnessScoreData | null }>(
          `/api/wellness?schoolId=${schoolId}&studentId=${studentId}`
        );
        setCheckins(data.checkins);
        setScores(data.scores);
        setLatestScore(data.latestScore);

        // Fetch trends
        const trends = await apiGet<{ trendData: TrendDataPoint[]; classAvgData: ClassAvgPoint[] }>(
          `/api/wellness/trends?schoolId=${schoolId}&studentId=${studentId}&days=30&includeClassAvg=${isStudent || isParent ? 'true' : 'false'}${currentClassId ? `&classGroupId=${currentClassId}` : ''}`
        );
        setTrendData(trends.trendData);
        setClassAvgData(trends.classAvgData || []);

        // Fetch summary
        const sum = await apiGet<WellnessSummary>(
          `/api/wellness/summary?schoolId=${schoolId}&studentId=${studentId}&period=${summaryPeriod}`
        );
        setSummary(sum);

        // Fetch health records
        const hr = await apiGet<HealthRecordData>(`/api/health-records/${studentId}?schoolId=${schoolId}`);
        setHealthRecord(hr);
      }
    } catch (error) {
      console.error('Error fetching wellness data:', error);
    } finally {
      setLoading(false);
    }
  }, [schoolId, studentId, role, currentClassId, isStudent, isParent, isAdmin, summaryPeriod]);

  useEffect(() => {
    fetchWellnessData();
  }, [fetchWellnessData]);

  // Submit check-in
  const handleSubmitCheckin = async () => {
    if (!studentId) {
      toast.error(t('wellness.checkin_error'));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          schoolId,
          studentId,
          mood: checkinMood,
          sleepHours: checkinSleepHours,
          sleepQuality: checkinSleepQuality,
          stressLevel: checkinStressLevel,
          activityType: checkinActivityType || null,
          activityMinutes: checkinActivityMinutes || null,
          mealsCount: checkinMealsCount,
          waterGlasses: checkinWaterGlasses,
          gratitudeEntry: checkinGratitude || null,
          notes: checkinNotes || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t('wellness.checkin_success'));
        fetchWellnessData();
      } else {
        toast.error(t('wellness.checkin_error'));
      }
    } catch {
      toast.error(t('wellness.checkin_error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Export report
  const handleExportReport = () => {
    if (!summary || !trendData.length) return;
    const lines = [
      `${t('wellness.title')} - ${t('wellness.reports')}`,
      `${'='.repeat(50)}`,
      `${t('wellness.summary_period')}: ${summaryPeriod === 'week' ? t('wellness.summary_week') : t('wellness.summary_month')}`,
      '',
      `${t('wellness.overall_score')}: ${Math.round(summary.avgOverallScore)}`,
      `${t('wellness.average_mood')}: ${summary.avgMood}/5`,
      `${t('wellness.sleep_quality')}: ${summary.avgSleepQuality}/5`,
      `${t('wellness.stress_level')}: ${summary.avgStressLevel}/10`,
      `${t('wellness.physical_activity')}: ${summary.totalActivityMinutes} ${t('wellness.minutes')}`,
      `${t('wellness.sleep_hours')}: ${summary.avgSleepHours}${t('wellness.hours')}`,
      `${t('wellness.meals_count')}: ${summary.avgMealsCount}`,
      `${t('wellness.water_glasses')}: ${summary.avgWaterGlasses}`,
      '',
      `${t('wellness.recommendations')}:`,
      ...summary.recommendations.map((r, i) => `  ${i + 1}. ${r}`),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wellness-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('wellness.export_success'));
  };

  // Prepare radar chart data
  const radarData = useMemo(() => {
    if (!latestScore) return [];
    return [
      { subject: t('wellness.physical'), score: latestScore.physicalScore ?? 0, fullMark: 100 },
      { subject: t('wellness.mental'), score: latestScore.mentalScore ?? 0, fullMark: 100 },
      { subject: t('wellness.social'), score: latestScore.socialScore ?? 0, fullMark: 100 },
      { subject: t('wellness.academic'), score: latestScore.academicScore ?? 0, fullMark: 100 },
    ];
  }, [latestScore]);

  // Prepare trend chart data (filter out nulls for cleaner display)
  const trendChartData = useMemo(() => {
    return trendData.filter(d => d.overallScore !== null);
  }, [trendData]);

  // Merge class avg into trend data
  const mergedTrendData = useMemo(() => {
    if (classAvgData.length === 0) return trendChartData.map(d => ({ ...d, classAvg: null as number | null }));
    return trendChartData.map(d => {
      const classPt = classAvgData.find(c => c.date === d.date);
      return { ...d, classAvg: classPt?.avgOverall ?? null };
    });
  }, [trendChartData, classAvgData]);

  /* ─── Loading State ───────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          >
            <Heart className="h-8 w-8 text-emerald-500" />
          </motion.div>
          <span className="text-muted-foreground">{t('wellness.loading')}</span>
        </div>
      </div>
    );
  }

  /* ─── Admin / School Overview ─────────────────────────────────── */

  if (isAdmin && !studentId && schoolOverview) {
    return (
      <div className="space-y-6">
        {/* Header Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white"
        >
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Heart className="h-8 w-8" />
              <h1 className="text-2xl font-bold">{t('wellness.school_overview')}</h1>
            </div>
            <p className="text-white/80">{t('wellness.subtitle')}</p>
          </div>
          <motion.div
            className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Activity className="h-24 w-24" />
          </motion.div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<Users className="h-5 w-5 text-emerald-500" />}
            label={t('wellness.students_checked_in')}
            value={schoolOverview.totalCheckins}
            color="from-emerald-500 to-teal-500"
            delay={0}
          />
          <MetricCard
            icon={<Heart className="h-5 w-5 text-teal-500" />}
            label={t('wellness.avg_wellness_score')}
            value={schoolOverview.avgScores.overall}
            color="from-teal-500 to-cyan-500"
            delay={0.1}
          />
          <MetricCard
            icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
            label={t('wellness.low_wellness_alerts')}
            value={schoolOverview.lowWellnessAlerts}
            color="from-amber-500 to-orange-500"
            delay={0.2}
          />
          <MetricCard
            icon={<BarChart3 className="h-5 w-5 text-cyan-500" />}
            label={t('wellness.physical_activity')}
            value={schoolOverview.avgScores.physical}
            color="from-cyan-500 to-blue-500"
            delay={0.3}
          />
        </div>

        {/* School Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              {t('wellness.trend_chart')}
            </CardTitle>
            <CardDescription>{t('wellness.trend_chart_desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                  <YAxis domain={[0, 100]} fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Line type="monotone" dataKey="avgOverall" stroke="#10b981" strokeWidth={2} name="Overall" dot={false} />
                  <Line type="monotone" dataKey="avgPhysical" stroke="#14b8a6" strokeWidth={1.5} name="Physical" dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="avgMental" stroke="#f59e0b" strokeWidth={1.5} name="Mental" dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="avgSocial" stroke="#8b5cf6" strokeWidth={1.5} name="Social" dot={false} strokeDasharray="5 5" />
                  <Line type="monotone" dataKey="avgAcademic" stroke="#06b6d4" strokeWidth={1.5} name="Academic" dot={false} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-teal-500" />
              {t('wellness.recent_checkins')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-2">
              {schoolOverview.recentCheckins.slice(0, 20).map((c, idx) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  {getMoodIcon(c.mood, 20)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.student.firstName} {c.student.lastName}</p>
                    <p className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString('de-DE')}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getMoodLabel(c.mood)}
                  </Badge>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ─── Student / Parent / Teacher-Individual View ──────────────── */

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-6 text-white"
      >
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="h-8 w-8" />
            <h1 className="text-2xl font-bold">{t('wellness.title')}</h1>
          </div>
          <p className="text-white/80">{t('wellness.subtitle')}</p>
        </div>
        <motion.div
          className="absolute right-6 top-1/2 -translate-y-1/2 opacity-20"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <Heart className="h-24 w-24" />
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t('wellness.dashboard')}</span>
          </TabsTrigger>
          <TabsTrigger value="checkin" className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{t('wellness.checkin')}</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-1.5">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('wellness.health_records')}</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-1.5">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('wellness.reports')}</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── Dashboard Tab ──────────────────────────────────────── */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* Score + Radar */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Overall Score */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-emerald-500" />
                  {t('wellness.overall_score')}
                </CardTitle>
                <CardDescription>{t('wellness.overall_score_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                <WellnessGauge score={latestScore?.overallScore ?? 0} />
                <div className="grid grid-cols-4 gap-4 mt-4 w-full">
                  {[
                    { label: t('wellness.physical'), score: latestScore?.physicalScore ?? 0, color: 'text-teal-500' },
                    { label: t('wellness.mental'), score: latestScore?.mentalScore ?? 0, color: 'text-amber-500' },
                    { label: t('wellness.social'), score: latestScore?.socialScore ?? 0, color: 'text-violet-500' },
                    { label: t('wellness.academic'), score: latestScore?.academicScore ?? 0, color: 'text-cyan-500' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <p className={`text-lg font-bold ${item.color}`}>{Math.round(item.score)}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                      <Progress value={item.score} className="h-1.5 mt-1" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-teal-500" />
                  {t('wellness.wellness_radar')}
                </CardTitle>
                <CardDescription>{t('wellness.wellness_radar_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" fontSize={12} />
                      <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                      <Radar
                        name={t('wellness.overall_score')}
                        dataKey="score"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        isAnimationActive
                        animationDuration={1000}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Sun className="h-5 w-5 text-amber-500" />}
              label={t('wellness.average_mood')}
              value={summary?.avgMood ?? 0}
              unit="/5"
              color="from-amber-500 to-yellow-500"
              trend={summary && summary.avgMood >= 3 ? 'up' : 'down'}
              delay={0}
            />
            <MetricCard
              icon={<Moon className="h-5 w-5 text-indigo-500" />}
              label={t('wellness.sleep_quality')}
              value={summary?.avgSleepQuality ?? 0}
              unit="/5"
              color="from-indigo-500 to-purple-500"
              trend={summary && summary.avgSleepQuality >= 3 ? 'up' : 'down'}
              delay={0.1}
            />
            <MetricCard
              icon={<Brain className="h-5 w-5 text-rose-500" />}
              label={t('wellness.stress_level')}
              value={summary?.avgStressLevel ?? 0}
              unit="/10"
              color="from-rose-500 to-pink-500"
              trend={summary && summary.avgStressLevel <= 5 ? 'up' : 'down'}
              delay={0.2}
            />
            <MetricCard
              icon={<Activity className="h-5 w-5 text-emerald-500" />}
              label={t('wellness.physical_activity')}
              value={summary?.totalActivityMinutes ?? 0}
              unit={t('wellness.minutes')}
              color="from-emerald-500 to-teal-500"
              delay={0.3}
            />
          </div>

          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
                {t('wellness.trend_chart')}
              </CardTitle>
              <CardDescription>{t('wellness.trend_chart_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={mergedTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                    <YAxis domain={[0, 100]} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="overallScore" stroke="#10b981" strokeWidth={2} name={t('wellness.overall_score')} dot={false} isAnimationActive animationDuration={1000} />
                    <Line type="monotone" dataKey="physicalScore" stroke="#14b8a6" strokeWidth={1.5} name={t('wellness.physical')} dot={false} strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="mentalScore" stroke="#f59e0b" strokeWidth={1.5} name={t('wellness.mental')} dot={false} strokeDasharray="5 5" />
                    {classAvgData.length > 0 && (
                      <Line type="monotone" dataKey="classAvg" stroke="#8b5cf6" strokeWidth={2} name={t('wellness.class_comparison')} dot={false} strokeDasharray="3 3" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Check-ins */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-500" />
                {t('wellness.recent_checkins')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checkins.length === 0 ? (
                <div className="text-center py-8">
                  <Heart className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">{t('wellness.no_checkins')}</p>
                  <p className="text-sm text-muted-foreground/70 mt-1">{t('wellness.no_checkins_desc')}</p>
                  <Button className="mt-4" onClick={() => setActiveTab('checkin')}>
                    <Calendar className="h-4 w-4 mr-2" />
                    {t('wellness.checkin')}
                  </Button>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {checkins.slice(0, 10).map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                    >
                      {getMoodIcon(c.mood, 24)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{getMoodLabel(c.mood)}</p>
                          {c.stressLevel && (
                            <Badge variant={c.stressLevel > 7 ? 'destructive' : 'secondary'} className="text-xs">
                              {t('wellness.stress_level')}: {c.stressLevel}/10
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(c.date).toLocaleDateString('de-DE')}</span>
                          {c.sleepHours && <span className="flex items-center gap-1"><Moon className="h-3 w-3" />{c.sleepHours}h</span>}
                          {c.activityMinutes && <span className="flex items-center gap-1">{getActivityIcon(c.activityType)}{c.activityMinutes}min</span>}
                          {c.waterGlasses && <span className="flex items-center gap-1"><Droplets className="h-3 w-3" />{c.waterGlasses}</span>}
                        </div>
                        {c.gratitudeEntry && (
                          <p className="text-xs text-muted-foreground mt-1 italic">&quot;{c.gratitudeEntry}&quot;</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Daily Check-in Tab ──────────────────────────────────── */}
        <TabsContent value="checkin" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-emerald-500" />
                {t('wellness.checkin')}
              </CardTitle>
              <CardDescription>{new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mood Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('wellness.mood_label')}</label>
                <MoodSelector value={checkinMood} onChange={setCheckinMood} />
              </div>

              <Separator />

              {/* Sleep Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Moon className="h-4 w-4 text-indigo-500" />
                    {t('wellness.sleep_hours_label')}
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      step={0.5}
                      value={checkinSleepHours}
                      onChange={(e) => setCheckinSleepHours(parseFloat(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">{t('wellness.hours')}</span>
                    <div className="flex-1">
                      <Progress value={(checkinSleepHours / 9) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {checkinSleepHours >= 7 && checkinSleepHours <= 9
                          ? t('wellness.sleep_excellent')
                          : checkinSleepHours >= 6
                            ? t('wellness.sleep_fair')
                            : t('wellness.sleep_poor')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Bed className="h-4 w-4 text-violet-500" />
                    {t('wellness.sleep_quality_label')}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((q) => (
                      <motion.button
                        key={q}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCheckinSleepQuality(q)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all text-sm font-medium ${
                          checkinSleepQuality === q
                            ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-600'
                            : 'border-transparent bg-muted/50 text-muted-foreground hover:border-muted-foreground/30'
                        }`}
                      >
                        {q}
                      </motion.button>
                    ))}
                    <span className="text-xs text-muted-foreground ml-2">{getSleepQualityLabel(checkinSleepQuality)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Stress Level */}
              <StressLevelIndicator value={checkinStressLevel} onChange={setCheckinStressLevel} />

              <Separator />

              {/* Physical Activity */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-emerald-500" />
                    {t('wellness.activity_type')}
                  </label>
                  <Select value={checkinActivityType} onValueChange={setCheckinActivityType}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('wellness.activity_type')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="running">{t('wellness.activity_running')}</SelectItem>
                      <SelectItem value="walking">{t('wellness.activity_walking')}</SelectItem>
                      <SelectItem value="cycling">{t('wellness.activity_cycling')}</SelectItem>
                      <SelectItem value="swimming">{t('wellness.activity_swimming')}</SelectItem>
                      <SelectItem value="sports">{t('wellness.activity_sports')}</SelectItem>
                      <SelectItem value="dance">{t('wellness.activity_dance')}</SelectItem>
                      <SelectItem value="yoga">{t('wellness.activity_yoga')}</SelectItem>
                      <SelectItem value="other">{t('wellness.activity_other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4 text-teal-500" />
                    {t('wellness.activity_duration')}
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={480}
                      value={checkinActivityMinutes}
                      onChange={(e) => setCheckinActivityMinutes(parseInt(e.target.value) || 0)}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">{t('wellness.minutes')}</span>
                    <div className="flex-1">
                      <Progress value={Math.min((checkinActivityMinutes / 60) * 100, 100)} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Nutrition & Hydration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-orange-500" />
                    {t('wellness.meals_count')}
                  </label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((m) => (
                      <motion.button
                        key={m}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setCheckinMealsCount(m)}
                        className={`w-10 h-10 rounded-lg border-2 transition-all text-sm ${
                          checkinMealsCount === m
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600'
                            : 'border-transparent bg-muted/50 text-muted-foreground hover:border-muted-foreground/30'
                        }`}
                      >
                        {m}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Droplets className="h-4 w-4 text-cyan-500" />
                    {t('wellness.water_glasses')}
                  </label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="number"
                      min={0}
                      max={20}
                      value={checkinWaterGlasses}
                      onChange={(e) => setCheckinWaterGlasses(parseInt(e.target.value) || 0)}
                      className="w-20"
                    />
                    <div className="flex-1">
                      <Progress value={(checkinWaterGlasses / 8) * 100} className="h-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {checkinWaterGlasses >= 8 ? t('wellness.score_excellent') : checkinWaterGlasses >= 6 ? t('wellness.score_good') : t('wellness.score_fair')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Gratitude & Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    {t('wellness.gratitude')}
                  </label>
                  <Textarea
                    value={checkinGratitude}
                    onChange={(e) => setCheckinGratitude(e.target.value)}
                    placeholder={t('wellness.gratitude_placeholder')}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    {t('wellness.notes')}
                  </label>
                  <Textarea
                    value={checkinNotes}
                    onChange={(e) => setCheckinNotes(e.target.value)}
                    placeholder={t('wellness.notes_placeholder')}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitCheckin}
                  disabled={submitting}
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  {submitting ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  {t('wellness.submit_checkin')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Check-in History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-teal-500" />
                {t('wellness.checkin_history')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checkins.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="text-muted-foreground">{t('wellness.no_checkins')}</p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {checkins.map((c, idx) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03 }}
                      className="p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getMoodIcon(c.mood, 20)}
                          <span className="text-sm font-medium">{getMoodLabel(c.mood)}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{new Date(c.date).toLocaleDateString('de-DE')}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground">
                        {c.sleepHours !== null && (
                          <div className="flex items-center gap-1">
                            <Moon className="h-3 w-3" />
                            {c.sleepHours}h
                          </div>
                        )}
                        {c.stressLevel !== null && (
                          <div className="flex items-center gap-1">
                            <Brain className="h-3 w-3" />
                            {c.stressLevel}/10
                          </div>
                        )}
                        {c.activityMinutes !== null && (
                          <div className="flex items-center gap-1">
                            {getActivityIcon(c.activityType)}
                            {c.activityMinutes}min
                          </div>
                        )}
                        {c.waterGlasses !== null && (
                          <div className="flex items-center gap-1">
                            <Droplets className="h-3 w-3" />
                            {c.waterGlasses}
                          </div>
                        )}
                      </div>
                      {c.gratitudeEntry && (
                        <p className="text-xs text-muted-foreground mt-1 italic">&quot;{c.gratitudeEntry}&quot;</p>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Health Records Tab ──────────────────────────────────── */}
        <TabsContent value="health" className="space-y-6">
          {/* Health Alerts */}
          {healthRecord?.healthAlerts && healthRecord.healthAlerts.length > 0 && (
            <Card className="border-amber-300 dark:border-amber-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="h-5 w-5" />
                  {t('wellness.health_alert')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {healthRecord.healthAlerts.map((alert, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <Badge
                        variant={alert.severity === 'warning' ? 'destructive' : 'secondary'}
                        className="text-sm py-1 px-3"
                      >
                        {alert.type === 'allergy' ? <AlertTriangle className="h-3 w-3 mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
                        {alert.label}
                      </Badge>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Health Records */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Allergies & Conditions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-rose-500" />
                  {t('wellness.health_allergies')} & {t('wellness.health_conditions')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">{t('wellness.health_allergies')}</p>
                  {healthRecord?.healthRecord?.allergies?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {healthRecord.healthRecord.allergies.map((a, i) => (
                        <Badge key={i} variant="destructive" className="text-xs">{a}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('wellness.no_data')}</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium mb-2">{t('wellness.health_conditions')}</p>
                  {healthRecord?.healthRecord?.conditions?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {healthRecord.healthRecord.conditions.map((c, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">{t('wellness.no_data')}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Medications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Coffee className="h-5 w-5 text-blue-500" />
                  {t('wellness.health_medications')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthRecord?.healthRecord?.medications?.length ? (
                  <div className="space-y-2">
                    {healthRecord.healthRecord.medications.map((med, i) => (
                      <div key={i} className="p-3 rounded-lg bg-muted/50">
                        <p className="text-sm font-medium">{med.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {med.dosage} &middot; {med.frequency}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('wellness.no_data')}</p>
                )}
              </CardContent>
            </Card>

            {/* Medical Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-teal-500" />
                  {t('wellness.health_doctor')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t('wellness.health_blood_type')}</p>
                    <p className="font-medium">{healthRecord?.healthRecord?.bloodType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('wellness.health_insurance')}</p>
                    <p className="font-medium">{healthRecord?.healthRecord?.insuranceProvider || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('wellness.health_doctor')}</p>
                    <p className="font-medium">{healthRecord?.healthRecord?.doctorName || '—'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('wellness.health_doctor_phone')}</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {healthRecord?.healthRecord?.doctorPhone || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('wellness.health_last_checkup')}</p>
                    <p className="font-medium">
                      {healthRecord?.healthRecord?.lastCheckup
                        ? new Date(healthRecord.healthRecord.lastCheckup).toLocaleDateString('de-DE')
                        : '—'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contacts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-rose-500" />
                  {t('wellness.health_emergency')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {healthRecord?.emergencyContacts?.length ? (
                  <div className="space-y-2">
                    {healthRecord.emergencyContacts.map((ec) => (
                      <div key={ec.id} className="p-3 rounded-lg bg-muted/50 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{ec.name}</p>
                          <p className="text-xs text-muted-foreground">{ec.relationship}</p>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          <Phone className="h-3 w-3 mr-1" />
                          {ec.phone}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('wellness.no_data')}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── Reports Tab ─────────────────────────────────────────── */}
        <TabsContent value="reports" className="space-y-6">
          {/* Period Selector */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={summaryPeriod} onValueChange={(v) => setSummaryPeriod(v as 'week' | 'month')}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">{t('wellness.summary_week')}</SelectItem>
                  <SelectItem value="month">{t('wellness.summary_month')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={handleExportReport} className="gap-2">
              <Download className="h-4 w-4" />
              {t('wellness.export_report')}
            </Button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              icon={<Heart className="h-5 w-5 text-emerald-500" />}
              label={t('wellness.overall_score')}
              value={summary?.avgOverallScore ?? 0}
              color="from-emerald-500 to-teal-500"
              delay={0}
            />
            <MetricCard
              icon={<Sun className="h-5 w-5 text-amber-500" />}
              label={t('wellness.average_mood')}
              value={summary?.avgMood ?? 0}
              unit="/5"
              color="from-amber-500 to-yellow-500"
              delay={0.1}
            />
            <MetricCard
              icon={<Moon className="h-5 w-5 text-indigo-500" />}
              label={t('wellness.sleep_hours')}
              value={summary?.avgSleepHours ?? 0}
              unit={t('wellness.hours')}
              color="from-indigo-500 to-violet-500"
              delay={0.2}
            />
            <MetricCard
              icon={<Brain className="h-5 w-5 text-rose-500" />}
              label={t('wellness.stress_level')}
              value={summary?.avgStressLevel ?? 0}
              unit="/10"
              color="from-rose-500 to-pink-500"
              delay={0.3}
            />
          </div>

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Mood Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-500" />
                  {t('wellness.average_mood')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={
                      [1, 2, 3, 4, 5].map(m => ({
                        mood: getMoodLabel(m),
                        count: summary?.moodDistribution[m] ?? 0,
                      }))
                    }>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="mood" fontSize={11} />
                      <YAxis fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} isAnimationActive animationDuration={800} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Wellness Radar for Period */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-teal-500" />
                  {t('wellness.wellness_radar')}
                </CardTitle>
                <CardDescription>
                  {summaryPeriod === 'week' ? t('wellness.weekly_summary') : t('wellness.monthly_summary')}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      cx="50%"
                      cy="50%"
                      outerRadius="70%"
                      data={[
                        { subject: t('wellness.physical'), score: summary?.avgPhysicalScore ?? 0, fullMark: 100 },
                        { subject: t('wellness.mental'), score: summary?.avgMentalScore ?? 0, fullMark: 100 },
                        { subject: t('wellness.social'), score: summary?.avgSocialScore ?? 0, fullMark: 100 },
                        { subject: t('wellness.academic'), score: summary?.avgAcademicScore ?? 0, fullMark: 100 },
                      ]}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" fontSize={12} />
                      <PolarRadiusAxis domain={[0, 100]} fontSize={10} />
                      <Radar
                        name={t('wellness.overall_score')}
                        dataKey="score"
                        stroke="#10b981"
                        fill="#10b981"
                        fillOpacity={0.3}
                        isAnimationActive
                        animationDuration={1000}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Class Comparison */}
          {classAvgData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-violet-500" />
                  {t('wellness.class_comparison')}
                </CardTitle>
                <CardDescription>{t('wellness.class_comparison_desc')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mergedTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="date" tickFormatter={formatDate} fontSize={12} />
                      <YAxis domain={[0, 100]} fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: theme === 'dark' ? '#1f2937' : '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="overallScore" stroke="#10b981" strokeWidth={2} name={t('wellness.student_wellness')} dot={false} />
                      <Line type="monotone" dataKey="classAvg" stroke="#8b5cf6" strokeWidth={2} name={t('wellness.class_comparison')} dot={false} strokeDasharray="5 5" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gratitude Journal */}
          {summary?.gratitudeEntries && summary.gratitudeEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-amber-500" />
                  {t('wellness.gratitude')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {summary.gratitudeEntries.map((entry, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800"
                    >
                      <p className="text-sm italic">&quot;{entry.entry}&quot;</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(entry.date).toLocaleDateString('de-DE')}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* AI Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                {t('wellness.recommendations')}
              </CardTitle>
              <CardDescription>{t('wellness.recommendations_desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {summary?.recommendations.map((rec, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800"
                  >
                    <Zap className="h-5 w-5 text-emerald-500 mt-0.5 shrink-0" />
                    <p className="text-sm">{rec}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Additional Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Droplets className="h-6 w-6 text-cyan-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{summary?.avgWaterGlasses ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t('wellness.water_glasses')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Utensils className="h-6 w-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{summary?.avgMealsCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t('wellness.meals_count')}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Activity className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                <p className="text-2xl font-bold">{summary?.totalActivityMinutes ?? 0}</p>
                <p className="text-xs text-muted-foreground">{t('wellness.physical_activity')} ({t('wellness.minutes')})</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
