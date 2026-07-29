'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon,
  Plus,
  Edit3,
  Trash2,
  Clock,
  MapPin,
  BookOpen,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Filter,
  List,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  BarChart3,
  Brain,
  Sparkles,
  Search,
  MoreVertical,
  FileText,
  Users,
  CalendarDays,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────

interface ExamPlan {
  id: string;
  schoolId: string;
  teacherId: string;
  subjectId: string;
  classGroupId: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  room: string | null;
  topics: string | null;
  weight: number;
  status: string;
  notes: string | null;
  calendarEventId: string | null;
  assessmentId: string | null;
  createdAt: string;
  updatedAt: string;
  subject: { id: string; name: string };
  classGroup: { id: string; name: string; gradeLevel: number };
  teacher: { id: string; firstName: string; lastName: string };
  calendarEvent?: { id: string } | null;
  assessment?: { id: string; title: string } | null;
  daysUntil: number;
  isWithinTwoWeeks: boolean;
  countdownLabel: string;
  hasAITest: boolean;
}

interface ExamStats {
  totalExams: number;
  upcomingExams: number;
  byStatus: Record<string, number>;
  bySubject: Array<{ subjectId: string; subjectName: string; count: number }>;
  byClass: Array<{ classGroupId: string; className: string; count: number }>;
}

interface SubjectOption {
  id: string;
  name: string;
}

interface ClassOption {
  id: string;
  name: string;
  gradeLevel: number;
}

// ── Color palette for subjects ─────────────────────────────────────────

const SUBJECT_COLORS = [
  { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-300 dark:border-emerald-700', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', dot: 'bg-amber-500' },
  { bg: 'bg-rose-100 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-300 dark:border-rose-700', dot: 'bg-rose-500' },
  { bg: 'bg-teal-100 dark:bg-teal-950/50', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-300 dark:border-teal-700', dot: 'bg-teal-500' },
  { bg: 'bg-orange-100 dark:bg-orange-950/50', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', dot: 'bg-orange-500' },
  { bg: 'bg-cyan-100 dark:bg-cyan-950/50', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-300 dark:border-cyan-700', dot: 'bg-cyan-500' },
  { bg: 'bg-pink-100 dark:bg-pink-950/50', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700', dot: 'bg-pink-500' },
  { bg: 'bg-lime-100 dark:bg-lime-950/50', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-300 dark:border-lime-700', dot: 'bg-lime-500' },
];

function getSubjectColor(subjectId: string) {
  let hash = 0;
  for (let i = 0; i < subjectId.length; i++) {
    hash = (hash * 31 + subjectId.charCodeAt(i)) | 0;
  }
  return SUBJECT_COLORS[Math.abs(hash) % SUBJECT_COLORS.length];
}

function getStatusColor(status: string) {
  switch (status) {
    case 'planned':
      return { bg: 'bg-amber-100 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' };
    case 'confirmed':
      return { bg: 'bg-emerald-100 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' };
    case 'completed':
      return { bg: 'bg-slate-100 dark:bg-slate-950/50', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' };
    case 'cancelled':
      return { bg: 'bg-rose-100 dark:bg-rose-950/50', text: 'text-rose-700 dark:text-rose-300', dot: 'bg-rose-500' };
    default:
      return { bg: 'bg-slate-100 dark:bg-slate-950/50', text: 'text-slate-700 dark:text-slate-300', dot: 'bg-slate-500' };
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'planned': return Clock;
    case 'confirmed': return CheckCircle2;
    case 'completed': return CheckCircle2;
    case 'cancelled': return XCircle;
    default: return Clock;
  }
}

// ── Animated Counter ───────────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = value / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(start));
      }
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration]);

  return <span>{display}</span>;
}

// ── Main Component ─────────────────────────────────────────────────────

export default function ExamCalendarView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);
  const [exams, setExams] = useState<ExamPlan[]>([]);
  const [stats, setStats] = useState<ExamStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterSubjectId, setFilterSubjectId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);

  // Dialog states
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedExam, setSelectedExam] = useState<ExamPlan | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('');
  const [formEndTime, setFormEndTime] = useState('');
  const [formSubjectId, setFormSubjectId] = useState('');
  const [formClassGroupId, setFormClassGroupId] = useState('');
  const [formRoom, setFormRoom] = useState('');
  const [formTopics, setFormTopics] = useState('');
  const [formWeight, setFormWeight] = useState('1.0');
  const [formStatus, setFormStatus] = useState('planned');
  const [formNotes, setFormNotes] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  const role = currentUser?.role ?? '';
  const schoolId = currentUser?.schoolId ?? '';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';
  const isTeacher = role === 'TEACHER';
  const isAdmin = role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL' || role === 'SUPER_ADMIN';

  // ── Data fetching ──────────────────────────────────────────────────

  const fetchExams = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ schoolId, viewMode: 'all' });
      if (filterClassId && filterClassId !== 'all') params.set('classId', filterClassId);
      if (filterSubjectId && filterSubjectId !== 'all') params.set('subjectId', filterSubjectId);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (isTeacher) params.set('teacherId', currentUser?.id ?? '');

      const data = await apiGet<{ exams: ExamPlan[]; stats: ExamStats | null }>(
        `/api/exam-plans?${params.toString()}`
      );
      setExams(data.exams || []);
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Failed to fetch exams:', err);
      toast.error(t('exam_calendar.error_fetch'));
    } finally {
      setLoading(false);
    }
  }, [schoolId, filterClassId, filterSubjectId, filterStatus, isTeacher, currentUser?.id]);

  const fetchSubjectsAndClasses = useCallback(async () => {
    if (!schoolId) return;
    try {
      const subjectData = await apiGet<SubjectOption[]>(`/api/subjects?schoolId=${schoolId}`);
      setSubjects(subjectData || []);
      const classData = await apiGet<ClassOption[]>(`/api/classes?schoolId=${schoolId}`);
      setClasses(classData || []);
    } catch {
      // ignore
    }
  }, [schoolId]);

  useEffect(() => {
    fetchExams();
  }, [fetchExams]);

  useEffect(() => {
    fetchSubjectsAndClasses();
  }, [fetchSubjectsAndClasses]);

  // ── Form handlers ──────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormDate('');
    setFormStartTime('');
    setFormEndTime('');
    setFormSubjectId('');
    setFormClassGroupId('');
    setFormRoom('');
    setFormTopics('');
    setFormWeight('1.0');
    setFormStatus('planned');
    setFormNotes('');
  }, []);

  const handleCreate = useCallback(async () => {
    if (!formTitle || !formDate || !formSubjectId || !formClassGroupId) {
      toast.error(t('exam_calendar.error_required_fields'));
      return;
    }
    setFormSubmitting(true);
    try {
      await apiPost('/api/exam-plans', {
        title: formTitle,
        date: formDate,
        startTime: formStartTime || null,
        endTime: formEndTime || null,
        subjectId: formSubjectId,
        classGroupId: formClassGroupId,
        schoolId,
        room: formRoom || null,
        topics: formTopics ? formTopics.split(',').map((s) => s.trim()) : null,
        weight: parseFloat(formWeight) || 1.0,
        status: formStatus,
        notes: formNotes || null,
      });
      toast.success(t('exam_calendar.exam_created'));
      setCreateOpen(false);
      resetForm();
      fetchExams();
    } catch (err) {
      console.error('Failed to create exam:', err);
      toast.error(t('exam_calendar.error_create'));
    } finally {
      setFormSubmitting(false);
    }
  }, [formTitle, formDate, formStartTime, formEndTime, formSubjectId, formClassGroupId, formRoom, formTopics, formWeight, formStatus, formNotes, schoolId, resetForm, fetchExams]);

  const handleEdit = useCallback(async () => {
    if (!selectedExam || !formTitle || !formDate || !formSubjectId || !formClassGroupId) {
      toast.error(t('exam_calendar.error_required_fields'));
      return;
    }
    setFormSubmitting(true);
    try {
      await apiPut(`/api/exam-plans/${selectedExam.id}`, {
        title: formTitle,
        date: formDate,
        startTime: formStartTime || null,
        endTime: formEndTime || null,
        subjectId: formSubjectId,
        classGroupId: formClassGroupId,
        room: formRoom || null,
        topics: formTopics ? formTopics.split(',').map((s) => s.trim()) : null,
        weight: parseFloat(formWeight) || 1.0,
        status: formStatus,
        notes: formNotes || null,
      });
      toast.success(t('exam_calendar.exam_updated'));
      setEditOpen(false);
      setSelectedExam(null);
      resetForm();
      fetchExams();
    } catch (err) {
      console.error('Failed to update exam:', err);
      toast.error(t('exam_calendar.error_update'));
    } finally {
      setFormSubmitting(false);
    }
  }, [selectedExam, formTitle, formDate, formStartTime, formEndTime, formSubjectId, formClassGroupId, formRoom, formTopics, formWeight, formStatus, formNotes, resetForm, fetchExams]);

  const handleDelete = useCallback(async () => {
    if (!selectedExam) return;
    try {
      await apiDelete(`/api/exam-plans/${selectedExam.id}`);
      toast.success(t('exam_calendar.exam_deleted'));
      setDeleteOpen(false);
      setSelectedExam(null);
      fetchExams();
    } catch (err) {
      console.error('Failed to delete exam:', err);
      toast.error(t('exam_calendar.error_delete'));
    }
  }, [selectedExam, fetchExams]);

  const openEditDialog = useCallback((exam: ExamPlan) => {
    setSelectedExam(exam);
    setFormTitle(exam.title);
    setFormDate(exam.date.split('T')[0]);
    setFormStartTime(exam.startTime || '');
    setFormEndTime(exam.endTime || '');
    setFormSubjectId(exam.subjectId);
    setFormClassGroupId(exam.classGroupId);
    setFormRoom(exam.room || '');
    const topics = exam.topics ? JSON.parse(exam.topics) : [];
    setFormTopics(Array.isArray(topics) ? topics.join(', ') : '');
    setFormWeight(String(exam.weight));
    setFormStatus(exam.status);
    setFormNotes(exam.notes || '');
    setEditOpen(true);
  }, []);

  const openDetailDialog = useCallback((exam: ExamPlan) => {
    setSelectedExam(exam);
    setDetailOpen(true);
  }, []);

  // ── Calendar helpers ───────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPad = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Monday start
    const days: Array<{ date: Date; isCurrentMonth: boolean; exams: ExamPlan[] }> = [];

    // Previous month padding
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      days.push({ date: d, isCurrentMonth: false, exams: [] });
    }

    // Current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split('T')[0];
      const dayExams = exams.filter((e) => e.date.split('T')[0] === dateStr);
      days.push({ date: d, isCurrentMonth: true, exams: dayExams });
    }

    // Next month padding
    const remaining = 42 - days.length; // 6 rows
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, isCurrentMonth: false, exams: [] });
    }

    return days;
  }, [currentMonth, exams]);

  const filteredExams = useMemo(() => {
    let result = exams;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subject.name.toLowerCase().includes(q) ||
          e.classGroup.name.toLowerCase().includes(q) ||
          (e.room && e.room.toLowerCase().includes(q))
      );
    }
    return result;
  }, [exams, searchQuery]);

  const upcomingExams = useMemo(() => {
    const now = new Date();
    return filteredExams
      .filter((e) => new Date(e.date) >= now && e.status !== 'cancelled')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredExams]);

  const twoWeekWarningExams = useMemo(() => {
    return upcomingExams.filter((e) => e.isWithinTwoWeeks);
  }, [upcomingExams]);

  // ── Render ─────────────────────────────────────────────────────────

  const monthLabel = currentMonth.toLocaleDateString(
    currentUser?.locale === 'en' ? 'en-US' : 'de-DE',
    { month: 'long', year: 'numeric' }
  );

  const weekDays = currentUser?.locale === 'en'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header with gradient banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 p-6 shadow-lg"
      >
        {/* Decorative background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
          <div className="absolute top-1/2 -left-4 w-16 h-16 rounded-full bg-white/5" />
          <div className="absolute -bottom-2 right-1/3 w-20 h-20 rounded-full bg-white/5" />
        </div>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="h-7 w-7" />
              {t('exam_calendar.title')}
              <motion.span
                className="ml-2 inline-flex items-center justify-center h-7 min-w-[28px] rounded-full bg-white/20 text-white text-sm font-semibold px-2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
              >
                <AnimatedCounter value={upcomingExams.length} />
              </motion.span>
            </h1>
            <p className="text-sm text-emerald-100 mt-1">
              {t('exam_calendar.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {(isTeacher || isAdmin) && (
              <Button
                onClick={() => {
                  resetForm();
                  setCreateOpen(true);
                }}
                className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30 shadow-lg"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('exam_calendar.create_exam')}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      {isAdmin && stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    <AnimatedCounter value={stats.totalExams} />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('exam_calendar.total_exams')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    <AnimatedCounter value={stats.upcomingExams} />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('exam_calendar.upcoming_exams')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                    <AnimatedCounter value={stats.byStatus.confirmed || 0} />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('exam_calendar.confirmed_exams')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">
                    <AnimatedCounter value={twoWeekWarningExams.length} />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('exam_calendar.two_week_warning')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Teacher/Student Quick Stats */}
      {!isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
        >
          <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                  <CalendarDays className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                    <AnimatedCounter value={upcomingExams.length} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isStudent ? t('exam_calendar.student_upcoming') : t('exam_calendar.upcoming_exams')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">
                    <AnimatedCounter value={twoWeekWarningExams.length} />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('exam_calendar.two_week_warning')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
                  <Brain className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-teal-700 dark:text-teal-300">
                    <AnimatedCounter value={upcomingExams.filter((e) => e.hasAITest).length} />
                  </p>
                  <p className="text-xs text-muted-foreground">{t('exam_calendar.ai_tests_available')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* 2-Week Warning Banner with pulsing indicator */}
      {twoWeekWarningExams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 overflow-hidden"
        >
          {/* Pulsing warning glow */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-amber-200/20 to-orange-200/20 dark:from-amber-800/10 dark:to-orange-800/10"
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="relative flex items-center gap-2 mb-2">
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </motion.div>
            <span className="font-semibold text-amber-800 dark:text-amber-200">
              {t('exam_calendar.two_week_banner_title')}
            </span>
            <motion.div
              className="h-2 w-2 rounded-full bg-amber-500"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
          <div className="relative flex flex-wrap gap-2">
            {twoWeekWarningExams.slice(0, 5).map((exam) => {
              const color = getSubjectColor(exam.subjectId);
              return (
                <motion.div
                  key={exam.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Badge
                    variant="outline"
                    className={`${color.bg} ${color.text} ${color.border} cursor-pointer`}
                    onClick={() => openDetailDialog(exam)}
                  >
                    {exam.title} ({exam.countdownLabel})
                  </Badge>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filters & View Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between"
      >
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('exam_calendar.search_placeholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-48 h-9"
            />
          </div>
          <Select value={filterClassId} onValueChange={setFilterClassId}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder={t('exam_calendar.filter_class')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('exam_calendar.all_classes')}</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
            <SelectTrigger className="w-36 h-9">
              <SelectValue placeholder={t('exam_calendar.filter_subject')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('exam_calendar.all_subjects')}</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(isTeacher || isAdmin) && (
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder={t('exam_calendar.filter_status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('exam_calendar.all_statuses')}</SelectItem>
                <SelectItem value="planned">{t('exam_calendar.status_planned')}</SelectItem>
                <SelectItem value="confirmed">{t('exam_calendar.status_confirmed')}</SelectItem>
                <SelectItem value="completed">{t('exam_calendar.status_completed')}</SelectItem>
                <SelectItem value="cancelled">{t('exam_calendar.status_cancelled')}</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="h-8"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            {t('exam_calendar.view_calendar')}
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8"
          >
            <List className="h-4 w-4 mr-1" />
            {t('exam_calendar.view_list')}
          </Button>
        </div>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {viewMode === 'calendar' ? (
          <motion.div
            key="calendar"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {/* Calendar Navigation */}
            <div className="flex items-center justify-between mb-4">
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
              <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="border rounded-xl overflow-hidden bg-card">
              {/* Week day headers */}
              <div className="grid grid-cols-7 bg-muted/50">
                {weekDays.map((day) => (
                  <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground border-b">
                    {day}
                  </div>
                ))}
              </div>
              {/* Day cells */}
              <div className="grid grid-cols-7">
                {calendarDays.map((dayInfo, idx) => {
                  const isToday = dayInfo.date.toDateString() === new Date().toDateString();
                  const hasExams = dayInfo.exams.length > 0;
                  return (
                    <motion.div
                      key={idx}
                      className={`relative min-h-[80px] md:min-h-[100px] p-1 border-b border-r last:border-r-0 transition-colors duration-200 ${
                        dayInfo.isCurrentMonth ? 'bg-card hover:bg-emerald-50/50 dark:hover:bg-emerald-950/10' : 'bg-muted/20'
                      } ${isToday ? 'ring-2 ring-emerald-500 ring-inset' : ''}`}
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Shimmer effect on cells with exams */}
                      {hasExams && dayInfo.isCurrentMonth && (
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-emerald-200/0 via-emerald-200/20 to-emerald-200/0 dark:from-emerald-400/0 dark:via-emerald-400/10 dark:to-emerald-400/0 pointer-events-none"
                          animate={{ x: ['-100%', '100%'] }}
                          transition={{ duration: 3, repeat: Infinity, repeatDelay: 5, ease: 'easeInOut' }}
                        />
                      )}
                      <div className="relative flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-medium ${
                            isToday
                              ? 'bg-emerald-600 text-white rounded-full h-6 w-6 flex items-center justify-center'
                              : dayInfo.isCurrentMonth
                              ? 'text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {dayInfo.date.getDate()}
                        </span>
                        {(isTeacher || isAdmin) && dayInfo.isCurrentMonth && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 opacity-0 hover:opacity-100 transition-opacity"
                            onClick={() => {
                              resetForm();
                              setFormDate(dayInfo.date.toISOString().split('T')[0]);
                              setCreateOpen(true);
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <div className="relative space-y-0.5">
                        {dayInfo.exams.slice(0, 3).map((exam) => {
                          const color = getSubjectColor(exam.subjectId);
                          return (
                            <motion.div
                              key={exam.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.3 }}
                              whileHover={{ scale: 1.05, y: -1 }}
                              className={`text-xs p-1 rounded cursor-pointer truncate ${color.bg} ${color.text} ${color.border} border shadow-sm`}
                              onClick={() => openDetailDialog(exam)}
                              title={exam.title}
                            >
                              <span className="font-medium">{exam.title}</span>
                              {exam.startTime && (
                                <span className="ml-1 opacity-70">{exam.startTime}</span>
                              )}
                              {exam.isWithinTwoWeeks && (
                                <motion.span
                                  className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-amber-500"
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ duration: 1, repeat: Infinity }}
                                />
                              )}
                            </motion.div>
                          );
                        })}
                        {dayInfo.exams.length > 3 && (
                          <div className="text-xs text-muted-foreground text-center">
                            +{dayInfo.exams.length - 3} {t('exam_calendar.more')}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <ScrollArea className="max-h-[600px]">
              <div className="space-y-3">
                {filteredExams.length === 0 && !loading && (
                  <div className="text-center py-12">
                    <CalendarIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">{t('exam_calendar.no_exams')}</p>
                  </div>
                )}
                {filteredExams.map((exam, idx) => {
                  const color = getSubjectColor(exam.subjectId);
                  const statusColor = getStatusColor(exam.status);
                  const StatusIcon = getStatusIcon(exam.status);
                  return (
                    <motion.div
                      key={exam.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.04, duration: 0.3 }}
                      whileHover={{ scale: 1.005 }}
                    >
                      <Card
                        className={`hover:shadow-lg transition-all cursor-pointer ${color.border} border-l-4 backdrop-blur-sm bg-card/80`}
                        onClick={() => openDetailDialog(exam)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-sm truncate">{exam.title}</h3>
                                <Badge variant="outline" className={`${statusColor.bg} ${statusColor.text} text-xs`}>
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {t(`exam_calendar.status_${exam.status}`)}
                                </Badge>
                                {exam.isWithinTwoWeeks && exam.status !== 'cancelled' && (
                                  <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-xs">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    {exam.countdownLabel}
                                  </Badge>
                                )}
                                {exam.hasAITest && (
                                  <Badge variant="outline" className="bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700 text-xs">
                                    <Sparkles className="h-3 w-3 mr-1" />
                                    {t('exam_calendar.ai_test_available')}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <CalendarIcon className="h-3 w-3" />
                                  {new Date(exam.date).toLocaleDateString(currentUser?.locale === 'en' ? 'en-US' : 'de-DE', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                                {exam.startTime && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {exam.startTime}{exam.endTime ? ` - ${exam.endTime}` : ''}
                                  </span>
                                )}
                                <span className={`flex items-center gap-1 ${color.text}`}>
                                  <div className={`h-2 w-2 rounded-full ${color.dot}`} />
                                  {exam.subject.name}
                                </span>
                                <span className="flex items-center gap-1">
                                  <GraduationCap className="h-3 w-3" />
                                  {exam.classGroup.name}
                                </span>
                                {exam.room && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {exam.room}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {exam.daysUntil >= 0 && exam.status !== 'cancelled' && (
                                <Badge variant="secondary" className="text-xs shrink-0">
                                  {exam.countdownLabel}
                                </Badge>
                              )}
                              {(isTeacher || isAdmin) && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(exam); }}>
                                      <Edit3 className="h-4 w-4 mr-2" />
                                      {t('action.edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={(e) => { e.stopPropagation(); setSelectedExam(exam); setDeleteOpen(true); }}
                                      className="text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />
                                      {t('action.delete')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Stats Section */}
      {isAdmin && stats && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-emerald-600" />
                {t('exam_calendar.exams_by_subject')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.bySubject.map((item) => {
                  const max = Math.max(...stats.bySubject.map((s) => s.count), 1);
                  const pct = (item.count / max) * 100;
                  return (
                    <div key={item.subjectId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{item.subjectName}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-600" />
                {t('exam_calendar.exams_by_class')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.byClass.map((item) => {
                  const max = Math.max(...stats.byClass.map((c) => c.count), 1);
                  const pct = (item.count / max) * 100;
                  return (
                    <div key={item.classGroupId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{item.className}</span>
                        <span className="text-muted-foreground">{item.count}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.2 }}
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Create Exam Dialog ──────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-emerald-600" />
              {t('exam_calendar.create_exam')}
            </DialogTitle>
            <DialogDescription>{t('exam_calendar.create_exam_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('exam_calendar.exam_title')} *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder={t('exam_calendar.exam_title_placeholder')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('exam_calendar.exam_date')} *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>{t('exam_calendar.weight')}</Label>
                <Input type="number" step="0.1" min="0" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('exam_calendar.start_time')}</Label>
                <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
              </div>
              <div>
                <Label>{t('exam_calendar.end_time')}</Label>
                <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('exam_calendar.subject')} *</Label>
                <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                  <SelectTrigger><SelectValue placeholder={t('exam_calendar.select_subject')} /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('exam_calendar.class')} *</Label>
                <Select value={formClassGroupId} onValueChange={setFormClassGroupId}>
                  <SelectTrigger><SelectValue placeholder={t('exam_calendar.select_class')} /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('exam_calendar.room')}</Label>
              <Input value={formRoom} onChange={(e) => setFormRoom(e.target.value)} placeholder={t('exam_calendar.room_placeholder')} />
            </div>
            <div>
              <Label>{t('exam_calendar.topics')}</Label>
              <Input value={formTopics} onChange={(e) => setFormTopics(e.target.value)} placeholder={t('exam_calendar.topics_placeholder')} />
            </div>
            <div>
              <Label>{t('exam_calendar.status')}</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">{t('exam_calendar.status_planned')}</SelectItem>
                  <SelectItem value="confirmed">{t('exam_calendar.status_confirmed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('exam_calendar.notes')}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder={t('exam_calendar.notes_placeholder')} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleCreate} disabled={formSubmitting} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                {formSubmitting ? t('exam_calendar.creating') : t('action.create')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Exam Dialog ────────────────────────────────────────── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="h-5 w-5 text-amber-600" />
              {t('exam_calendar.edit_exam')}
            </DialogTitle>
            <DialogDescription>{t('exam_calendar.edit_exam_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('exam_calendar.exam_title')} *</Label>
              <Input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('exam_calendar.exam_date')} *</Label>
                <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} />
              </div>
              <div>
                <Label>{t('exam_calendar.weight')}</Label>
                <Input type="number" step="0.1" min="0" value={formWeight} onChange={(e) => setFormWeight(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('exam_calendar.start_time')}</Label>
                <Input type="time" value={formStartTime} onChange={(e) => setFormStartTime(e.target.value)} />
              </div>
              <div>
                <Label>{t('exam_calendar.end_time')}</Label>
                <Input type="time" value={formEndTime} onChange={(e) => setFormEndTime(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t('exam_calendar.subject')} *</Label>
                <Select value={formSubjectId} onValueChange={setFormSubjectId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('exam_calendar.class')} *</Label>
                <Select value={formClassGroupId} onValueChange={setFormClassGroupId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('exam_calendar.room')}</Label>
              <Input value={formRoom} onChange={(e) => setFormRoom(e.target.value)} />
            </div>
            <div>
              <Label>{t('exam_calendar.topics')}</Label>
              <Input value={formTopics} onChange={(e) => setFormTopics(e.target.value)} />
            </div>
            <div>
              <Label>{t('exam_calendar.status')}</Label>
              <Select value={formStatus} onValueChange={setFormStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">{t('exam_calendar.status_planned')}</SelectItem>
                  <SelectItem value="confirmed">{t('exam_calendar.status_confirmed')}</SelectItem>
                  <SelectItem value="completed">{t('exam_calendar.status_completed')}</SelectItem>
                  <SelectItem value="cancelled">{t('exam_calendar.status_cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('exam_calendar.notes')}</Label>
              <Textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setEditOpen(false); setSelectedExam(null); }}>
                {t('action.cancel')}
              </Button>
              <Button onClick={handleEdit} disabled={formSubmitting} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white">
                {formSubmitting ? t('exam_calendar.saving') : t('action.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ──────────────────────────────── */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('exam_calendar.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('exam_calendar.delete_confirm_desc', { title: selectedExam?.title ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDeleteOpen(false); setSelectedExam(null); }}>
              {t('action.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Exam Detail Dialog ──────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          {selectedExam && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-emerald-600" />
                  {selectedExam.title}
                </DialogTitle>
                <DialogDescription>
                  {selectedExam.subject.name} - {selectedExam.classGroup.name}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className={getStatusColor(selectedExam.status).bg + ' ' + getStatusColor(selectedExam.status).text}>
                    {(() => { const SI = getStatusIcon(selectedExam.status); return <SI className="h-3 w-3 mr-1" />; })()}
                    {t(`exam_calendar.status_${selectedExam.status}`)}
                  </Badge>
                  {selectedExam.daysUntil >= 0 && selectedExam.status !== 'cancelled' && (
                    <Badge variant="secondary">
                      <Clock className="h-3 w-3 mr-1" />
                      {selectedExam.countdownLabel}
                    </Badge>
                  )}
                  {selectedExam.hasAITest && (
                    <Badge variant="outline" className="bg-teal-100 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border-teal-300 dark:border-teal-700">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {t('exam_calendar.ai_test_available')}
                    </Badge>
                  )}
                  {selectedExam.isWithinTwoWeeks && selectedExam.status !== 'cancelled' && (
                    <Badge variant="outline" className="bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {t('exam_calendar.two_week_warning')}
                    </Badge>
                  )}
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">{t('exam_calendar.exam_date')}:</span>
                    <p className="font-medium">
                      {new Date(selectedExam.date).toLocaleDateString(currentUser?.locale === 'en' ? 'en-US' : 'de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('exam_calendar.time')}:</span>
                    <p className="font-medium">
                      {selectedExam.startTime
                        ? `${selectedExam.startTime}${selectedExam.endTime ? ` - ${selectedExam.endTime}` : ''}`
                        : t('exam_calendar.all_day')}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('exam_calendar.subject')}:</span>
                    <p className="font-medium flex items-center gap-1">
                      <span className={`h-2 w-2 rounded-full ${getSubjectColor(selectedExam.subjectId).dot}`} />
                      {selectedExam.subject.name}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('exam_calendar.class')}:</span>
                    <p className="font-medium">{selectedExam.classGroup.name}</p>
                  </div>
                  {selectedExam.room && (
                    <div>
                      <span className="text-muted-foreground">{t('exam_calendar.room')}:</span>
                      <p className="font-medium flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {selectedExam.room}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">{t('exam_calendar.weight')}:</span>
                    <p className="font-medium">{selectedExam.weight}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('exam_calendar.teacher')}:</span>
                    <p className="font-medium">{selectedExam.teacher.firstName} {selectedExam.teacher.lastName}</p>
                  </div>
                </div>
                {selectedExam.topics && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('exam_calendar.topics')}:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {JSON.parse(selectedExam.topics).map((topic: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs">{topic}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedExam.notes && (
                  <div>
                    <span className="text-sm text-muted-foreground">{t('exam_calendar.notes')}:</span>
                    <p className="text-sm mt-1 bg-muted/50 rounded-lg p-3">{selectedExam.notes}</p>
                  </div>
                )}
                {(isTeacher || isAdmin) && (
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setDetailOpen(false); openEditDialog(selectedExam); }}>
                      <Edit3 className="h-4 w-4 mr-1" />
                      {t('action.edit')}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => { setDetailOpen(false); setSelectedExam(selectedExam); setDeleteOpen(true); }}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('action.delete')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
