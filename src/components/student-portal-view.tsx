'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  Trophy,
  BookOpen,
  Calendar,
  Clock,
  Star,
  Award,
  CheckCircle2,
  Plus,
  Flame,
  Zap,
  CircleDot,
  Trash2,
  Edit3,
  Save,
  AlertCircle,
  ClipboardCheck,
  MessageSquare,
  Flower2,
  Calculator,
  Globe,
  BookMarked,
  CalendarDays,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Lock,
  Unlock,
  PartyPopper,
  Sunrise,
  Sun,
  Moon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────

interface StudentGoal {
  id: string;
  studentId: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  progress: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface CompetencyData {
  subject: string;
  level: number;
  progress: number;
}

interface BadgeData {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string | null;
}

interface SchedulePeriod {
  period: number;
  subject: string;
  room: string;
  startTime: string;
  endTime: string;
  isCurrent: boolean;
  isNext: boolean;
}

interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: string;
}

interface FeedbackItem {
  id: string;
  teacherName: string;
  subject: string;
  comment: string;
  date: string;
  competencyLevel?: number;
}

// ── Animation Variants ──────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

const tabContentVariants = {
  hidden: { opacity: 0, x: 12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
  exit: { opacity: 0, x: -12, transition: { duration: 0.2, ease: 'easeIn' } },
};

// ── Mastery Level Colors ────────────────────────────────────────────────

const masteryColors: Record<number, { bg: string; text: string; border: string; gradient: string; ring: string }> = {
  1: { bg: 'bg-rose-100 dark:bg-rose-900/30', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', gradient: 'from-rose-400 to-rose-500', ring: 'stroke-rose-400' },
  2: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', gradient: 'from-amber-400 to-amber-500', ring: 'stroke-amber-400' },
  3: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', gradient: 'from-emerald-400 to-emerald-500', ring: 'stroke-emerald-400' },
  4: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', gradient: 'from-teal-400 to-teal-500', ring: 'stroke-teal-400' },
};

const subjectIcons: Record<string, React.ElementType> = {
  Mathematik: Calculator,
  Deutsch: BookOpen,
  Englisch: Globe,
  Naturwissenschaften: Flower2,
  Mathematics: Calculator,
  German: BookOpen,
  English: Globe,
  Sciences: Flower2,
};

// ── Animated Number Component ────────────────────────────────────────────

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
    prevValue.current = value;
  }, [value, duration]);

  return <span>{displayValue}</span>;
}

// ── Circular Progress Component ─────────────────────────────────────────

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  colorClass = 'stroke-emerald-400',
  children,
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  colorClass?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

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
          className="text-gray-200 dark:text-gray-700"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colorClass}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

// ── Celebration Particles ────────────────────────────────────────────────

function CelebrationParticles({ active }: { active: boolean }) {
  if (!active) return null;

  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    angle: (i * 30) * (Math.PI / 180),
    distance: 30 + Math.random() * 20,
    color: ['bg-amber-400', 'bg-emerald-400', 'bg-rose-400', 'bg-violet-400', 'bg-teal-400'][i % 5],
    size: 4 + Math.random() * 4,
    delay: Math.random() * 0.3,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className={`absolute rounded-full ${p.color}`}
          style={{ width: p.size, height: p.size }}
          initial={{ opacity: 0, x: 0, y: 0 }}
          animate={{
            opacity: [0, 1, 0],
            x: [0, Math.cos(p.angle) * p.distance],
            y: [0, Math.sin(p.angle) * p.distance],
            scale: [0, 1.5, 0],
          }}
          transition={{ duration: 0.8, delay: p.delay, ease: 'easeOut' }}
        />
      ))}
    </div>
  );
}

// ── Student Exam Section Sub-Component ──────────────────────────────────
function StudentExamSection({ schoolId }: { schoolId: string }) {
  const [exams, setExams] = useState<Array<{
    id: string;
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    subject: { id: string; name: string } | null;
    classGroup: { id: string; name: string } | null;
    teacher: { id: string; firstName: string; lastName: string } | null;
    daysUntil: number;
    countdownLabel: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const locale = useAppStore((s) => s.locale);

  useEffect(() => {
    if (!schoolId) return;
    setLoading(true);
    fetch(`/api/calendar-events/exams?schoolId=${schoolId}&limit=10`)
      .then((res) => res.json())
      .then((data) => {
        setExams(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        // ignore
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolId]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50/60 dark:bg-gray-800/40">
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-1/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
              <div className="h-2.5 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (exams.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-red-100 dark:bg-red-900/30 mx-auto mb-3">
          <CalendarDays className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('portal.no_exams_scheduled')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {exams.map((exam, idx) => {
        const daysUntil = exam.daysUntil;
        const countdownText = daysUntil === 0
          ? t('calendar.exam_today')
          : daysUntil === 1
            ? t('calendar.exam_tomorrow')
            : daysUntil < 7
              ? t('calendar.exam_in_days', { days: daysUntil })
              : t('calendar.exam_in_weeks', { weeks: Math.floor(daysUntil / 7) });
        const urgencyClass = daysUntil <= 1
          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30'
          : daysUntil <= 3
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30'
            : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30';

        return (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-red-50/30 to-transparent dark:from-red-900/5 dark:to-transparent border border-red-100/30 dark:border-red-900/10"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-red-400 to-red-500 text-white shadow-sm text-sm font-bold">
                {exam.subject?.name?.substring(0, 2)?.toUpperCase() ?? 'EX'}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{exam.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {exam.subject?.name ?? ''} {exam.classGroup?.name ? `· ${exam.classGroup.name}` : ''}
                </p>
              </div>
            </div>
            <Badge className={`${urgencyClass} text-[10px] font-semibold rounded-md px-2 py-0.5 flex items-center gap-1 shrink-0`}>
              <Clock className="h-3 w-3" />
              {countdownText}
            </Badge>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────

export default function StudentPortalView() {
  const { currentUser, locale } = useAppStore();
  const [goals, setGoals] = useState<StudentGoal[]>([]);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [editingGoal, setEditingGoal] = useState<StudentGoal | null>(null);
  const [goalForm, setGoalForm] = useState({ title: '', description: '', targetDate: '' });
  const [activeTab, setActiveTab] = useState('competencies');
  const [celebratingGoals, setCelebratingGoals] = useState<Set<string>>(new Set());

  // ── Mock data for demo ─────────────────────────────────────────────

  const competencies: CompetencyData[] = [
    { subject: t('student.notebook_math'), level: 2, progress: 72 },
    { subject: t('student.notebook_german'), level: 3, progress: 85 },
    { subject: t('student.notebook_english'), level: 2, progress: 58 },
    { subject: t('student.notebook_science'), level: 1, progress: 44 },
    { subject: 'Musik', level: 3, progress: 90 },
    { subject: 'Sport', level: 4, progress: 95 },
  ];

  const achievements: BadgeData[] = [
    { id: '1', name: 'First Steps', description: 'Complete your first competency', icon: 'star', earnedAt: new Date(Date.now() - 86400000 * 14).toISOString() },
    { id: '2', name: 'Bookworm', description: 'Complete 10 notebook pages', icon: 'book', earnedAt: new Date(Date.now() - 86400000 * 7).toISOString() },
    { id: '3', name: 'Streak Master', description: '7-day learning streak', icon: 'flame', earnedAt: new Date(Date.now() - 86400000 * 2).toISOString() },
    { id: '4', name: 'Competency King', description: 'Reach level 3 in any subject', icon: 'crown', earnedAt: null },
    { id: '5', name: 'Perfect Score', description: 'Score 100% on an assessment', icon: 'trophy', earnedAt: null },
  ];

  const now = new Date();
  const currentHour = now.getHours();
  const dayOfWeek = now.getDay();

  const schedule: SchedulePeriod[] = dayOfWeek >= 1 && dayOfWeek <= 5 ? [
    { period: 1, subject: t('student.notebook_math'), room: 'R101', startTime: '08:00', endTime: '08:45', isCurrent: currentHour === 8, isNext: currentHour === 7 },
    { period: 2, subject: t('student.notebook_german'), room: 'R205', startTime: '08:50', endTime: '09:35', isCurrent: currentHour === 8 || (currentHour === 9 && now.getMinutes() < 35), isNext: currentHour === 8 && now.getMinutes() > 45 },
    { period: 3, subject: t('student.notebook_english'), room: 'R103', startTime: '09:55', endTime: '10:40', isCurrent: false, isNext: false },
    { period: 4, subject: t('student_portal.break'), room: '', startTime: '10:40', endTime: '11:00', isCurrent: false, isNext: false },
    { period: 5, subject: t('student.notebook_science'), room: 'Lab1', startTime: '11:00', endTime: '11:45', isCurrent: false, isNext: false },
    { period: 6, subject: 'Musik', room: 'M101', startTime: '11:50', endTime: '12:35', isCurrent: false, isNext: false },
  ] : [];

  // Mark current and next properly
  const currentPeriodIndex = schedule.findIndex(p => {
    const [sh, sm] = p.startTime.split(':').map(Number);
    const [eh, em] = p.endTime.split(':').map(Number);
    const startMin = sh * 60 + sm;
    const endMin = eh * 60 + em;
    const nowMin = currentHour * 60 + now.getMinutes();
    return nowMin >= startMin && nowMin < endMin;
  });

  const homework: HomeworkItem[] = [
    { id: '1', title: 'Math Worksheet Ch.5', subject: t('student.notebook_math'), dueDate: new Date(Date.now() + 86400000).toISOString(), status: 'pending' },
    { id: '2', title: 'Essay: Mein Lieblingstag', subject: t('student.notebook_german'), dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), status: 'pending' },
    { id: '3', title: 'Vocabulary Quiz Prep', subject: t('student.notebook_english'), dueDate: new Date(Date.now() - 86400000).toISOString(), status: 'overdue' },
    { id: '4', title: 'Lab Report: Photosynthesis', subject: t('student.notebook_science'), dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), status: 'pending' },
  ];

  const feedback: FeedbackItem[] = [
    { id: '1', teacherName: 'Herr Mueller', subject: t('student.notebook_math'), comment: 'Great improvement in algebra! Keep up the good work.', date: new Date(Date.now() - 86400000 * 1).toISOString(), competencyLevel: 3 },
    { id: '2', teacherName: 'Frau Schmidt', subject: t('student.notebook_german'), comment: 'Excellent essay structure. Your argumentation is getting stronger.', date: new Date(Date.now() - 86400000 * 3).toISOString(), competencyLevel: 3 },
    { id: '3', teacherName: 'Mr. Brown', subject: t('student.notebook_english'), comment: 'Good vocabulary usage. Focus on pronunciation next.', date: new Date(Date.now() - 86400000 * 5).toISOString(), competencyLevel: 2 },
  ];

  // ── Goals API ──────────────────────────────────────────────────────

  const fetchGoals = useCallback(async () => {
    if (!currentUser) return;
    try {
      setIsLoadingGoals(true);
      const studentData = await apiGet<{ id: string }[]>(`/api/students?schoolId=${currentUser.schoolId}&userId=${currentUser.id}`);
      if (studentData && studentData.length > 0) {
        const studentId = studentData[0].id;
        const data = await apiGet<StudentGoal[]>(`/api/student-goals?studentId=${studentId}`);
        setGoals(data);
      }
    } catch {
      // Silently fail for demo
    } finally {
      setIsLoadingGoals(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleCreateGoal = async () => {
    if (!goalForm.title.trim()) {
      toast.error(t('student_portal.goal_title'));
      return;
    }
    try {
      const studentData = await apiGet<{ id: string }[]>(`/api/students?schoolId=${currentUser?.schoolId}&userId=${currentUser?.id}`);
      if (studentData && studentData.length > 0) {
        const studentId = studentData[0].id;
        if (editingGoal) {
          await apiPut(`/api/student-goals/${editingGoal.id}`, {
            title: goalForm.title,
            description: goalForm.description,
            targetDate: goalForm.targetDate || null,
          });
          toast.success(t('student_portal.goal_progress'));
        } else {
          await apiPost('/api/student-goals', {
            studentId,
            title: goalForm.title,
            description: goalForm.description,
            targetDate: goalForm.targetDate || null,
          });
          toast.success(t('student_portal.goal_set'));
        }
        setShowGoalDialog(false);
        setEditingGoal(null);
        setGoalForm({ title: '', description: '', targetDate: '' });
        fetchGoals();
      }
    } catch {
      toast.error('Error saving goal');
    }
  };

  const handleUpdateGoalProgress = async (goalId: string, progress: number) => {
    try {
      await apiPut(`/api/student-goals/${goalId}`, { progress });
      if (progress >= 100) {
        toast.success(t('student_portal.goal_complete'));
        setCelebratingGoals(prev => new Set(prev).add(goalId));
        setTimeout(() => {
          setCelebratingGoals(prev => {
            const next = new Set(prev);
            next.delete(goalId);
            return next;
          });
        }, 2000);
      }
      fetchGoals();
    } catch {
      toast.error('Error updating progress');
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await apiDelete(`/api/student-goals/${goalId}`);
      toast.success(t('action.delete'));
      fetchGoals();
    } catch {
      toast.error('Error deleting goal');
    }
  };

  const openEditGoal = (goal: StudentGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      description: goal.description || '',
      targetDate: goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '',
    });
    setShowGoalDialog(true);
  };

  const openNewGoal = () => {
    setEditingGoal(null);
    setGoalForm({ title: '', description: '', targetDate: '' });
    setShowGoalDialog(true);
  };

  // ── Derived Data ───────────────────────────────────────────────────

  const activeGoals = goals.filter(g => g.status === 'active');
  const completedGoals = goals.filter(g => g.status === 'completed');
  const earnedBadges = achievements.filter(a => a.earnedAt);
  const totalPoints = earnedBadges.length * 50 + Math.floor(competencies.reduce((sum, c) => sum + c.progress, 0) / 10);
  const overdueHomework = homework.filter(h => h.status === 'overdue');
  const upcomingHomework = homework.filter(h => h.status !== 'overdue');
  const daysUntil = (dateStr: string) => {
    const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  // Greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('student_portal.good_morning');
    if (hour < 17) return t('student_portal.good_afternoon');
    return t('student_portal.good_evening');
  };

  const getGreetingIcon = () => {
    const hour = new Date().getHours();
    if (hour < 12) return Sunrise;
    if (hour < 17) return Sun;
    return Moon;
  };

  // Streak calculation (mock)
  const streakDays = 7;
  const maxLevel = 4;
  const averageProgress = competencies.length > 0
    ? Math.round(competencies.reduce((sum, c) => sum + c.progress, 0) / competencies.length)
    : 0;
  const overallLevel = competencies.length > 0
    ? Math.round(competencies.reduce((sum, c) => sum + c.level, 0) / competencies.length * 10) / 10
    : 0;
  const levelUpProgress = Math.round((overallLevel / maxLevel) * 100);

  // ── Render ─────────────────────────────────────────────────────────

  const greetingHour = new Date().getHours();

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 pb-8"
    >
      {/* ── Hero Section ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 dark:from-emerald-700 dark:via-teal-700 dark:to-cyan-700 p-6 sm:p-8 text-white shadow-xl shadow-emerald-200/30 dark:shadow-emerald-900/30">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/4" />
          <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Sparkles className="h-8 w-8 text-white/30" />
            </motion.div>
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm ring-2 ring-white/20 shadow-lg">
                {greetingHour < 12 ? <Sunrise className="w-7 h-7" /> : greetingHour < 17 ? <Sun className="w-7 h-7" /> : <Moon className="w-7 h-7" />}
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold">
                  {getGreeting()}, {currentUser?.firstName || t('student_portal.title')}!
                </h2>
                <p className="text-emerald-100/80 mt-1 text-sm sm:text-base">
                  {t('student_portal.hero_message')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm border border-white/20 text-sm font-medium">
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

          {/* Quick Stats Bar inside hero */}
          <div className="relative z-10 mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('student_portal.points_earned'), value: totalPoints, icon: Zap, color: 'bg-white/15' },
              { label: t('student_portal.streak_days'), value: streakDays, icon: Flame, color: 'bg-white/15' },
              { label: t('student_portal.badges_earned'), value: earnedBadges.length, icon: Award, color: 'bg-white/15' },
              { label: t('student_portal.active_goals'), value: activeGoals.length, icon: Target, color: 'bg-white/15' },
            ].map((stat) => (
              <motion.div
                key={stat.label}
                whileHover={{ scale: 1.04, backgroundColor: 'rgba(255,255,255,0.25)' }}
                className={`flex items-center gap-3 ${stat.color} backdrop-blur-sm rounded-xl px-3 py-2.5 border border-white/10 transition-colors cursor-default`}
              >
                <stat.icon className="h-5 w-5 text-white/80 shrink-0" />
                <div className="min-w-0">
                  <p className="text-lg font-bold text-white">
                    <AnimatedNumber value={stat.value} />
                  </p>
                  <p className="text-[10px] text-white/70 truncate">{stat.label}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Level Up Progress Bar ──────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-purple-500 text-white shadow-sm">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('student_portal.level_up_progress')}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('student_portal.level_up_detail', { level: overallLevel, max: maxLevel })}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{levelUpProgress}%</span>
                <ChevronRight className="h-4 w-4 text-violet-400" />
              </div>
            </div>
            <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 via-purple-500 to-fuchsia-500"
                initial={{ width: 0 }}
                animate={{ width: `${levelUpProgress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut', delay: 0.3 }}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Streak Counter ──────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-200/30 dark:shadow-orange-900/30"
                >
                  <Flame className="h-7 w-7" />
                </motion.div>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{t('student_portal.learning_streak')}</p>
                  <Badge className="text-[10px] bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 border">
                    {streakDays} {t('student_portal.days')}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('student_portal.streak_message')}</p>
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.5 + i * 0.08, type: 'spring', stiffness: 300 }}
                      className="flex items-center justify-center w-7 h-7 rounded-md bg-gradient-to-br from-orange-400 to-red-500 text-white text-[10px] font-bold shadow-sm"
                    >
                      {i + 1}
                    </motion.div>
                  ))}
                  <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold">
                    8
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Main Tabs ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto gap-1 bg-gray-100/50 dark:bg-gray-800/50 p-1 rounded-xl">
            <TabsTrigger value="competencies" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <BookOpen className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('student_portal.my_competencies')}</span>
              <span className="sm:hidden">{t('student_portal.my_competencies').split(' ')[0]}</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <Target className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('student_portal.my_goals')}</span>
              <span className="sm:hidden">{t('student_portal.my_goals').split(' ')[0]}</span>
            </TabsTrigger>
            <TabsTrigger value="achievements" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <Trophy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('student_portal.my_achievements')}</span>
              <span className="sm:hidden">{t('student_portal.my_achievements').split(' ')[0]}</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <Calendar className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('student_portal.my_schedule')}</span>
              <span className="sm:hidden">{t('student_portal.my_schedule').split(' ')[0]}</span>
            </TabsTrigger>
            <TabsTrigger value="homework" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <ClipboardCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('student_portal.my_homework')}</span>
              <span className="sm:hidden">{t('student_portal.my_homework').split(' ')[0]}</span>
            </TabsTrigger>
            <TabsTrigger value="feedback" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <MessageSquare className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('student_portal.my_feedback')}</span>
              <span className="sm:hidden">{t('student_portal.my_feedback').split(' ')[0]}</span>
            </TabsTrigger>
            <TabsTrigger value="exams" className="text-xs sm:text-sm gap-1.5 min-h-[40px] data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm rounded-lg">
              <CalendarDays className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('portal.upcoming_exams')}</span>
              <span className="sm:hidden">{t('portal.upcoming_exams').split(' ')[0]}</span>
            </TabsTrigger>
          </TabsList>

          {/* ── My Competencies Tab ──────────────────────────────────── */}
          <TabsContent value="competencies">
            <AnimatePresence mode="wait">
              <motion.div
                key="competencies"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {competencies.map((comp) => {
                  const colors = masteryColors[comp.level] || masteryColors[1];
                  const levelLabel = t(`student_portal.level_${comp.level}`);
                  const SubjectIcon = subjectIcons[comp.subject] || BookOpen;
                  return (
                    <motion.div
                      key={comp.subject}
                      whileHover={{ scale: 1.02, y: -2 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="cursor-pointer"
                    >
                      <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:shadow-lg transition-all duration-300">
                        <div className={`h-2 bg-gradient-to-r ${colors.gradient}`} />
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${colors.gradient} text-white shadow-sm`}>
                                <SubjectIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <CardTitle className="text-sm font-semibold">{comp.subject}</CardTitle>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('student_portal.mastery_level')}</p>
                              </div>
                            </div>
                            <Badge className={`${colors.bg} ${colors.text} ${colors.border} border text-[10px] font-semibold`}>
                              {t('student_portal.level')} {comp.level} — {levelLabel}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-4 pt-1">
                          <div className="space-y-3">
                            {/* Circular progress */}
                            <div className="flex items-center gap-3">
                              <CircularProgress
                                value={comp.progress}
                                size={56}
                                strokeWidth={5}
                                colorClass={colors.ring}
                              >
                                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{comp.progress}%</span>
                              </CircularProgress>
                              <div className="flex-1">
                                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                                  <span>{t('student_portal.progress_bar')}</span>
                                  <span className="font-semibold text-gray-700 dark:text-gray-300">{comp.progress}%</span>
                                </div>
                                <Progress value={comp.progress} className="h-2" />
                              </div>
                            </div>
                            {/* Level dots */}
                            <div className="flex items-center gap-1.5 pt-1">
                              {[1, 2, 3, 4].map((lvl) => (
                                <motion.div
                                  key={lvl}
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  transition={{ delay: 0.3 + lvl * 0.1, type: 'spring', stiffness: 300 }}
                                  className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-all ${
                                    lvl <= comp.level
                                      ? `${masteryColors[lvl].bg} ${masteryColors[lvl].text} ${masteryColors[lvl].border} border`
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700'
                                  }`}
                                >
                                  {lvl}
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            </AnimatePresence>
            {competencies.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                  <BookOpen className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_portal.no_competencies')}</p>
              </div>
            )}
          </TabsContent>

          {/* ── My Goals Tab ─────────────────────────────────────────── */}
          <TabsContent value="goals">
            <AnimatePresence mode="wait">
              <motion.div
                key="goals"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {/* Add Goal Button */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300">
                      {activeGoals.length} {t('student_portal.active_goals')}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-1 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400">
                      {completedGoals.length} {t('student_portal.completed_goals')}
                    </Badge>
                  </div>
                  <Button
                    onClick={openNewGoal}
                    className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white min-h-[44px] px-4 font-semibold shadow-sm"
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t('student_portal.add_goal')}
                  </Button>
                </div>

                {/* Active Goals */}
                {isLoadingGoals ? (
                  <div className="space-y-3">
                    {[1, 2].map(i => (
                      <div key={i} className="h-28 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    ))}
                  </div>
                ) : activeGoals.length > 0 ? (
                  <div className="space-y-3">
                    <AnimatePresence>
                      {activeGoals.map((goal) => {
                        const isCompleted = goal.progress >= 100;
                        const isCelebrating = celebratingGoals.has(goal.id);
                        const progressColor = isCompleted
                          ? 'from-emerald-400 to-teal-500'
                          : goal.progress >= 75
                          ? 'from-amber-400 to-orange-500'
                          : 'from-rose-400 to-pink-500';
                        return (
                          <motion.div
                            key={goal.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -12 }}
                            transition={{ duration: 0.25 }}
                            layout
                          >
                            <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:shadow-md transition-all duration-300">
                              <CardContent className="p-4 relative">
                                <CelebrationParticles active={isCelebrating} />
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-start gap-3 min-w-0">
                                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${progressColor} text-white shadow-sm shrink-0 mt-0.5`}>
                                      {isCompleted ? <PartyPopper className="h-4 w-4" /> : <Target className="h-4 w-4" />}
                                    </div>
                                    <div className="min-w-0">
                                      <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{goal.title}</h4>
                                      {goal.description && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{goal.description}</p>
                                      )}
                                      {goal.targetDate && (
                                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                                          <Clock className="h-3 w-3 inline mr-1" />
                                          {new Date(goal.targetDate).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => openEditGoal(goal)}
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-emerald-600"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteGoal(goal.id)}
                                      className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-500 dark:text-gray-400">{t('student_portal.goal_progress')}</span>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{goal.progress}%</span>
                                  </div>
                                  <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                    <motion.div
                                      className={`absolute inset-y-0 left-0 rounded-full bg-gradient-to-r ${progressColor}`}
                                      initial={{ width: 0 }}
                                      animate={{ width: `${goal.progress}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut' }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2 pt-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateGoalProgress(goal.id, Math.min(100, goal.progress + 10))}
                                      className="text-[10px] h-7 px-2 font-semibold"
                                    >
                                      +10%
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateGoalProgress(goal.id, Math.min(100, goal.progress + 25))}
                                      className="text-[10px] h-7 px-2 font-semibold"
                                    >
                                      +25%
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleUpdateGoalProgress(goal.id, 100)}
                                      className="text-[10px] h-7 px-2 font-semibold text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      {t('student_portal.goal_complete')}
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                      <Target className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('student_portal.no_goals')}</p>
                    <Button
                      onClick={openNewGoal}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white min-h-[44px] px-5 font-semibold shadow-sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('student_portal.add_goal')}
                    </Button>
                  </div>
                )}

                {/* Completed Goals */}
                {completedGoals.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      {t('student_portal.completed_goals')}
                    </h3>
                    {completedGoals.map((goal) => (
                      <Card key={goal.id} className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] opacity-70">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 shrink-0">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 line-through">{goal.title}</h4>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('student_portal.goal_complete')}</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="h-8 w-8 p-0 text-gray-400 hover:text-rose-600 shrink-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── My Achievements Tab ──────────────────────────────────── */}
          <TabsContent value="achievements">
            <AnimatePresence mode="wait">
              <motion.div
                key="achievements"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {/* Points Summary */}
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] bg-gradient-to-br from-amber-50/50 to-yellow-50/30 dark:from-amber-900/10 dark:to-yellow-900/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-200/30 dark:shadow-amber-900/30">
                          <Star className="h-7 w-7" />
                        </div>
                        <div>
                          <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">
                            <AnimatedNumber value={totalPoints} />
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('student_portal.total_points')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{earnedBadges.length}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('student_portal.badges_earned')}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-violet-600 dark:text-violet-400">3</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('student_portal.rewards_available')}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Badge Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {achievements.map((badge, idx) => {
                    const isEarned = !!badge.earnedAt;
                    const badgeIcon = (() => {
                      switch (badge.icon) {
                        case 'star': return Star;
                        case 'book': return BookOpen;
                        case 'flame': return Flame;
                        case 'crown': return Award;
                        case 'trophy': return Trophy;
                        default: return CircleDot;
                      }
                    })();
                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 + idx * 0.08, type: 'spring', stiffness: 200 }}
                        whileHover={{ scale: isEarned ? 1.08 : 1.02, y: isEarned ? -4 : 0 }}
                        className={`relative rounded-xl border p-4 text-center transition-all duration-300 ${
                          isEarned
                            ? 'border-amber-200/50 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-yellow-50/50 dark:from-amber-900/20 dark:to-yellow-900/10 shadow-sm hover:shadow-lg'
                            : 'border-gray-200/40 dark:border-gray-700/40 bg-gray-50/50 dark:bg-gray-900/20 opacity-50'
                        }`}
                      >
                        <div className={`flex items-center justify-center w-12 h-12 rounded-xl mx-auto mb-2 ${
                          isEarned
                            ? 'bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-md'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                        }`}>
                          <badgeIcon className="h-6 w-6" />
                        </div>
                        <p className={`text-xs font-semibold ${isEarned ? 'text-gray-800 dark:text-gray-200' : 'text-gray-400 dark:text-gray-500'}`}>
                          {badge.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{badge.description}</p>
                        {isEarned && (
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + idx * 0.08 }}
                            className="mt-2"
                          >
                            <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-medium">
                              <Unlock className="h-3 w-3" />
                              {new Date(badge.earnedAt!).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          </motion.div>
                        )}
                        {!isEarned && (
                          <div className="absolute top-2 right-2">
                            <Lock className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {achievements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                      <Trophy className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_portal.no_achievements')}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── My Schedule Tab ──────────────────────────────────────── */}
          <TabsContent value="schedule">
            <AnimatePresence mode="wait">
              <motion.div
                key="schedule"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                          <Calendar className="h-4 w-4" />
                        </div>
                        <CardTitle className="text-sm font-semibold">{t('student_portal.today_schedule')}</CardTitle>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date().toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    {schedule.length > 0 ? (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

                        <div className="space-y-2">
                          {schedule.map((period, idx) => {
                            const isCurrent = idx === currentPeriodIndex;
                            const isNext = idx === currentPeriodIndex + 1;
                            const isBreak = period.subject === t('student_portal.break');
                            const SubjectIcon = subjectIcons[period.subject] || BookOpen;

                            return (
                              <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -12 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-300 ${
                                  isCurrent
                                    ? 'border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50/80 to-teal-50/50 dark:from-emerald-900/20 dark:to-teal-900/10 shadow-sm ring-2 ring-emerald-300/30 dark:ring-emerald-700/30'
                                    : isNext
                                    ? 'border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10'
                                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900/30 hover:shadow-sm'
                                }`}
                              >
                                {/* Timeline dot */}
                                <div className={`relative z-10 w-2.5 h-2.5 rounded-full shrink-0 ml-0.5 ${
                                  isCurrent
                                    ? 'bg-emerald-500 ring-4 ring-emerald-200 dark:ring-emerald-800'
                                    : isNext
                                    ? 'bg-amber-500 ring-4 ring-amber-200 dark:ring-amber-800'
                                    : 'bg-gray-300 dark:bg-gray-600'
                                }`} />

                                <div className={`flex items-center justify-center w-10 h-10 rounded-lg shrink-0 ${
                                  isCurrent
                                    ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm'
                                    : isNext
                                    ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm'
                                    : isBreak
                                    ? 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {isBreak ? <CoffeeIcon className="h-4 w-4" /> : <SubjectIcon className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className={`text-sm font-semibold ${isCurrent ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-800 dark:text-gray-200'}`}>
                                      {period.subject}
                                    </p>
                                    {isCurrent && (
                                      <motion.div
                                        animate={{ scale: [1, 1.15, 1] }}
                                        transition={{ duration: 1.5, repeat: Infinity }}
                                      >
                                        <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 border">
                                          {t('student_portal.current_period')}
                                        </Badge>
                                      </motion.div>
                                    )}
                                    {isNext && (
                                      <Badge className="text-[9px] px-1.5 py-0 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 border">
                                        {t('student_portal.next_period')}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                    {period.startTime} - {period.endTime}
                                    {period.room && ` · ${period.room}`}
                                  </p>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">{t('student_portal.period')} {period.period}</p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12">
                        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
                          <Calendar className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_portal.no_schedule')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── My Homework Tab ──────────────────────────────────────── */}
          <TabsContent value="homework">
            <AnimatePresence mode="wait">
              <motion.div
                key="homework"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-4"
              >
                {/* Overdue */}
                {overdueHomework.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {t('student_portal.overdue')} ({overdueHomework.length})
                    </h3>
                    {overdueHomework.map((hw) => (
                      <motion.div
                        key={hw.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ x: 4 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-rose-200/50 dark:ring-rose-800/50 bg-gradient-to-r from-rose-50/50 to-red-50/30 dark:from-rose-900/10 dark:to-red-900/5 hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-rose-400 to-rose-500 text-white shadow-sm shrink-0">
                                <AlertCircle className="h-4 w-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{hw.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{hw.subject}</p>
                              </div>
                              <Badge className="text-[10px] bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 border shrink-0">
                                {t('student_portal.overdue')}
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Upcoming */}
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-emerald-500" />
                    {t('student_portal.upcoming')} ({upcomingHomework.length})
                  </h3>
                  {upcomingHomework.length > 0 ? (
                    upcomingHomework.map((hw) => {
                      const days = daysUntil(hw.dueDate);
                      const isToday = days === 0;
                      const isSoon = days === 1;
                      const urgencyColor = isToday
                        ? 'from-amber-400 to-orange-500'
                        : isSoon
                        ? 'from-amber-400 to-yellow-500'
                        : 'from-emerald-400 to-teal-500';
                      const urgencyRing = isToday
                        ? 'ring-amber-200/50 dark:ring-amber-800/50'
                        : isSoon
                        ? 'ring-amber-200/30 dark:ring-amber-800/30'
                        : 'ring-black/[0.03] dark:ring-white/[0.05]';

                      return (
                        <motion.div
                          key={hw.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          whileHover={{ x: 4 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <Card className={`border-0 shadow-sm rounded-xl overflow-hidden ring-1 ${urgencyRing} hover:shadow-md transition-all duration-300`}>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br ${urgencyColor} text-white shadow-sm shrink-0`}>
                                  <BookMarked className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{hw.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{hw.subject}</p>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] shrink-0 ${
                                    isToday
                                      ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                                      : isSoon
                                      ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300'
                                      : 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                                  }`}
                                >
                                  {isToday ? t('student_portal.due_today') : `${days}d`}
                                </Badge>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 mb-3">
                        <CheckCircle2 className="h-6 w-6 text-emerald-400 dark:text-emerald-500" />
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_portal.no_homework_due')}</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── My Feedback Tab ──────────────────────────────────────── */}
          <TabsContent value="feedback">
            <AnimatePresence mode="wait">
              <motion.div
                key="feedback"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-3"
              >
                {feedback.length > 0 ? (
                  feedback.map((fb, idx) => {
                    const colors = fb.competencyLevel ? (masteryColors[fb.competencyLevel] || masteryColors[1]) : null;
                    const initials = fb.teacherName.split(' ').map(n => n[0]).join('').slice(0, 2);
                    return (
                      <motion.div
                        key={fb.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        whileHover={{ scale: 1.01 }}
                      >
                        <Card className="border-0 shadow-sm rounded-xl overflow-hidden ring-1 ring-black/[0.03] dark:ring-white/[0.05] hover:shadow-md transition-all duration-300">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <Avatar className={`h-9 w-9 shrink-0 ${colors ? `ring-2 ring-offset-1` : ''}`}
                                style={colors ? { borderColor: 'var(--ring-color, transparent)' } : undefined}
                              >
                                <AvatarFallback className={`text-xs font-semibold ${
                                  colors
                                    ? `bg-gradient-to-br ${colors.gradient} text-white`
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                }`}>
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{fb.teacherName}</p>
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      {fb.subject}
                                    </Badge>
                                  </div>
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 shrink-0">
                                    {new Date(fb.date).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-GB', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{fb.comment}</p>
                                {fb.competencyLevel && (
                                  <div className="flex items-center gap-1.5 mt-2">
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400">{t('student_portal.mastery_level')}:</span>
                                    <Badge className={`text-[10px] px-1.5 py-0 ${colors?.bg} ${colors?.text} ${colors?.border} border`}>
                                      {t('student_portal.level')} {fb.competencyLevel}
                                    </Badge>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-16">
                    <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                      <MessageSquare className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('student_portal.no_feedback')}</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </TabsContent>

          {/* ── Exams & Study Tips Tab ─────────────────────────────────── */}
          <TabsContent value="exams">
            <AnimatePresence mode="wait">
              <motion.div
                key="exams"
                variants={tabContentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                {/* Upcoming Exams with Countdown */}
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-red-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-red-50/50 to-transparent dark:from-red-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-red-400 to-red-500 text-white shadow-sm">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      {t('portal.upcoming_exams')}
                      <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-red-400 to-transparent" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <StudentExamSection schoolId={currentUser?.schoolId ?? ''} />
                  </CardContent>
                </Card>

                {/* AI Study Tips */}
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      {t('portal.study_tips')}
                      <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-emerald-400 to-transparent" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {[
                        { title: t('portal.focus_areas'), desc: t('portal.motivation_message'), icon: Target, color: 'from-emerald-400 to-teal-500' },
                        { title: t('portal.practice_recommendations'), desc: t('portal.start_practice'), icon: BookOpen, color: 'from-teal-400 to-emerald-500' },
                        { title: t('portal.ai_study_tip'), desc: t('portal.motivation_message'), icon: Sparkles, color: 'from-amber-400 to-amber-500' },
                      ].map((tip, idx) => {
                        const Icon = tip.icon;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className="flex items-start gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-900/5 dark:to-transparent border border-emerald-100/30 dark:border-emerald-900/10"
                          >
                            <div className={`flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br ${tip.color} text-white shadow-sm shrink-0 mt-0.5`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{tip.title}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tip.desc}</p>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Virtual Character / AI Assistant */}
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      {t('portal.ai_assistant')}
                      <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-violet-400 to-transparent" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50/50 to-teal-50/30 dark:from-violet-900/10 dark:to-teal-900/5 border border-violet-100/40 dark:border-violet-900/20">
                      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-400 to-teal-500 text-white shadow-lg">
                        <Sparkles className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('portal.virtual_character')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{t('portal.motivation_message')}</p>
                      </div>
                      <Button size="sm" className="rounded-xl bg-gradient-to-r from-violet-500 to-teal-500 text-white shadow-md" onClick={() => {
                        const store = useAppStore.getState();
                        store.setCurrentView('subjects');
                      }}>
                        {t('portal.ask_ai')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </AnimatePresence>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* ── Goal Dialog ──────────────────────────────────────────────── */}
      <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-emerald-500" />
              {editingGoal ? t('action.edit') : t('student_portal.add_goal')}
            </DialogTitle>
            <DialogDescription>
              {editingGoal ? t('student_portal.update_progress') : t('student_portal.goal_set')}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="goal-title" className="text-sm font-medium">{t('student_portal.goal_title')}</Label>
              <Input
                id="goal-title"
                value={goalForm.title}
                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                placeholder={t('student_portal.goal_title')}
                className="min-h-[44px]"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-desc" className="text-sm font-medium">{t('student_portal.goal_description')}</Label>
              <Textarea
                id="goal-desc"
                value={goalForm.description}
                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                placeholder={t('student_portal.goal_description')}
                className="min-h-[80px] resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-date" className="text-sm font-medium">{t('student_portal.target_date')}</Label>
              <Input
                id="goal-date"
                type="date"
                value={goalForm.targetDate}
                onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                className="min-h-[44px]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowGoalDialog(false)}
              className="min-h-[44px]"
            >
              {t('action.cancel')}
            </Button>
            <Button
              onClick={handleCreateGoal}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white min-h-[44px] font-semibold"
            >
              <Save className="h-4 w-4 mr-2" />
              {editingGoal ? t('action.save') : t('student_portal.goal_set')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ── Small helper components ─────────────────────────────────────────────

function CoffeeIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" x2="6" y1="2" y2="4" />
      <line x1="10" x2="10" y1="2" y2="4" />
      <line x1="14" x2="14" y1="2" y2="4" />
    </svg>
  );
}
