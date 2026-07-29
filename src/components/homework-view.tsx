'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookCheck,
  FileText,
  BookOpen,
  Lightbulb,
  FlaskConical,
  Search as SearchIcon,
  Plus,
  Calendar,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  Send,
  GraduationCap,
  Filter,
  Trash2,
  Edit3,
  Eye,
  MessageSquare,
  Star,
  ArrowRight,
  MoreHorizontal,
  CalendarDays,
  List,
  LayoutGrid,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Circle,
  XCircle,
  Trophy,
  User,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { useAppStore, type CurrentUser } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

/* ── Types ─────────────────────────────────────────────────────── */

interface ClassGroupSimple { id: string; name: string; gradeLevel: number; }
interface SubjectSimple { id: string; name: string; }
interface TeacherSimple { id: string; firstName: string; lastName: string; }
interface StudentSimple { id: string; firstName: string; lastName: string; }

interface HomeworkItem {
  id: string;
  schoolId: string;
  classGroupId: string;
  subjectId: string | null;
  teacherId: string;
  title: string;
  description: string | null;
  dueDate: string;
  homeworkType: string;
  maxPoints: number | null;
  attachments: string | null;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  classGroup: ClassGroupSimple;
  subject: SubjectSimple | null;
  teacher: TeacherSimple;
  _count?: { submissions: number };
}

interface SubmissionItem {
  id: string;
  homeworkId: string;
  studentId: string;
  content: string | null;
  attachments: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  submittedAt: string | null;
  gradedAt: string | null;
  student: StudentSimple;
  homework?: { id: string; title: string; maxPoints: number | null };
}

/* ── Helpers ───────────────────────────────────────────────────── */

function getDueDateStatus(dueDate: string): 'overdue' | 'today' | 'upcoming' {
  const now = new Date();
  const due = new Date(dueDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  if (dueDay < today) return 'overdue';
  if (dueDay.getTime() === today.getTime()) return 'today';
  return 'upcoming';
}

function getDueDateLabel(dueDate: string): string {
  const status = getDueDateStatus(dueDate);
  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (status === 'overdue') {
    return t('homework.overdue_days', { days: Math.abs(diffDays) });
  }
  if (status === 'today') return t('homework.due_today');
  if (diffDays === 1) return t('homework.due_tomorrow');
  return t('homework.due_in_days', { days: diffDays });
}

function getDueDateColor(status: 'overdue' | 'today' | 'upcoming'): string {
  switch (status) {
    case 'overdue': return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    case 'today': return 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300';
    case 'upcoming': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
  }
}

function getStatusBadge(status: string): string {
  switch (status) {
    case 'pending': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'submitted': return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
    case 'graded': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300';
    case 'late': return 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'pending': return t('homework.status_pending');
    case 'submitted': return t('homework.status_submitted');
    case 'graded': return t('homework.status_graded');
    case 'late': return t('homework.status_late');
    default: return status;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'pending': return Circle;
    case 'submitted': return CheckCircle2;
    case 'graded': return Trophy;
    case 'late': return XCircle;
    default: return Circle;
  }
}

function getHomeworkTypeIcon(type: string) {
  switch (type) {
    case 'assignment': return FileText;
    case 'reading': return BookOpen;
    case 'project': return Lightbulb;
    case 'practice': return FlaskConical;
    case 'research': return SearchIcon;
    default: return FileText;
  }
}

function getHomeworkTypeLabel(type: string): string {
  switch (type) {
    case 'assignment': return t('homework.type_assignment');
    case 'reading': return t('homework.type_reading');
    case 'project': return t('homework.type_project');
    case 'practice': return t('homework.type_practice');
    case 'research': return t('homework.type_research');
    default: return type;
  }
}

function getHomeworkTypeColor(type: string): string {
  switch (type) {
    case 'assignment': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
    case 'reading': return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
    case 'project': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
    case 'practice': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'research': return 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300';
    default: return 'bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300';
  }
}

// ── Calendar Helpers ────────────────────────────────────────────────
function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Mon-based
  const days: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) days.push(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

const MONTH_NAMES_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const MONTH_NAMES_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthName(month: number, locale: string): string {
  return locale === 'de' ? MONTH_NAMES_DE[month] : MONTH_NAMES_EN[month];
}

// ── Loading Skeleton ────────────────────────────────────────────────
function HomeworkSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-3">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {[...Array(35)].map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-md" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Calendar View Component ─────────────────────────────────────────
function HomeworkCalendarView({
  homeworks,
  onHomeworkClick,
  locale,
}: {
  homeworks: HomeworkItem[];
  onHomeworkClick: (hw: HomeworkItem) => void;
  locale: string;
}) {
  const now = new Date();
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());

  const calendarDays = useMemo(() => getCalendarDays(currentYear, currentMonth), [currentYear, currentMonth]);

  // Map homework to dates
  const homeworkByDate = useMemo(() => {
    const map: Record<string, HomeworkItem[]> = {};
    for (const hw of homeworks) {
      const due = new Date(hw.dueDate);
      const key = `${due.getFullYear()}-${due.getMonth()}-${due.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(hw);
    }
    return map;
  }, [homeworks]);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };

  const goToToday = () => {
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  };

  const isToday = (day: number) => {
    return day === now.getDate() && currentMonth === now.getMonth() && currentYear === now.getFullYear();
  };

  return (
    <Card>
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary" />
            {getMonthName(currentMonth, locale)} {currentYear}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px]" onClick={goToToday}>
              <CalendarDays className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px]" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 min-h-[44px] min-w-[44px]" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {[t('timetable.mon_short'), t('timetable.tue_short'), t('timetable.wed_short'), t('timetable.thu_short'), t('timetable.fri_short'), t('homework.sat_short'), t('homework.sun_short')].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-muted-foreground py-1">
              {day}
            </div>
          ))}
        </div>
        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            if (day === null) {
              return <div key={`empty-${i}`} className="h-16 rounded-md" />;
            }
            const key = `${currentYear}-${currentMonth}-${day}`;
            const dayHomeworks = homeworkByDate[key] ?? [];
            const today = isToday(day);

            return (
              <div
                key={`${currentYear}-${currentMonth}-${day}`}
                className={`h-16 rounded-md p-1 text-xs border transition-colors ${
                  today
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/30'
                }`}
              >
                <div className={`font-medium ${today ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                  {day}
                </div>
                <div className="space-y-0.5 mt-0.5 overflow-hidden max-h-[32px]">
                  {dayHomeworks.slice(0, 2).map((hw) => {
                    const dueStatus = getDueDateStatus(hw.dueDate);
                    return (
                      <button
                        key={hw.id}
                        className={`w-full text-left px-1 py-0.5 rounded text-[10px] font-medium truncate cursor-pointer ${
                          dueStatus === 'overdue'
                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                            : dueStatus === 'today'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                        }`}
                        onClick={() => onHomeworkClick(hw)}
                        title={hw.title}
                      >
                        {hw.title}
                      </button>
                    );
                  })}
                  {dayHomeworks.length > 2 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{dayHomeworks.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Main Component ─────────────────────────────────────────────── */

export default function HomeworkView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const currentClassId = useAppStore((s) => s.currentClassId);

  const [homeworks, setHomeworks] = useState<HomeworkItem[]>([]);
  const [classes, setClasses] = useState<ClassGroupSimple[]>([]);
  const [subjects, setSubjects] = useState<SubjectSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterSubject, setFilterSubject] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'calendar'>('grid');

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    classGroupId: '',
    subjectId: '',
    dueDate: '',
    homeworkType: 'assignment',
    maxPoints: '',
    isPublished: true,
  });
  const [creating, setCreating] = useState(false);

  // Detail dialog
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  // Grading dialog
  const [gradingSubmission, setGradingSubmission] = useState<SubmissionItem | null>(null);
  const [gradingOpen, setGradingOpen] = useState(false);
  const [gradeScore, setGradeScore] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradingSaving, setGradingSaving] = useState(false);

  // Submit dialog (for students)
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitContent, setSubmitContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<HomeworkItem>>({});
  const [editing, setEditing] = useState(false);

  const isStudent = currentUser?.role === 'STUDENT';
  const isTeacherOrAdmin = currentUser?.role === 'TEACHER' || currentUser?.role === 'SCHOOL_ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // Load classes
  useEffect(() => {
    if (!currentUser?.schoolId) return;
    apiGet<ClassGroupSimple[]>(`/api/classes?schoolId=${currentUser.schoolId}`)
      .then(setClasses)
      .catch(() => {});
    apiGet<SubjectSimple[]>(`/api/subjects?schoolId=${currentUser.schoolId}`)
      .then(setSubjects)
      .catch(() => {});
  }, [currentUser?.schoolId]);

  // Load homework
  const loadHomework = useCallback(() => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ schoolId: currentUser.schoolId });
    if (filterClass !== 'all') params.set('classGroupId', filterClass);
    if (filterSubject !== 'all') params.set('subjectId', filterSubject);
    if (filterType !== 'all') params.set('homeworkType', filterType);
    if (isStudent) params.set('isPublished', 'true');
    apiGet<HomeworkItem[]>(`/api/homework?${params.toString()}`)
      .then((data) => {
        setHomeworks(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('homework.load_error'));
        setLoading(false);
      });
  }, [currentUser?.schoolId, filterClass, filterSubject, filterType, isStudent]);

  useEffect(() => {
    loadHomework();
  }, [loadHomework]);

  // Auto-set class filter
  useEffect(() => {
    if (currentClassId && filterClass === 'all') {
      setFilterClass(currentClassId);
    }
  }, [currentClassId, filterClass]);

  // Filtered homework
  const filteredHomeworks = useMemo(() => {
    let result = homeworks;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          h.description?.toLowerCase().includes(q) ||
          h.classGroup.name.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      result = result.filter((h) => {
        const dueStatus = getDueDateStatus(h.dueDate);
        if (filterStatus === 'overdue') return dueStatus === 'overdue';
        if (filterStatus === 'upcoming') return dueStatus !== 'overdue';
        return true;
      });
    }
    return result;
  }, [homeworks, searchQuery, filterStatus]);

  // Create homework
  const handleCreate = async () => {
    if (!currentUser?.schoolId || !createForm.classGroupId || !createForm.title || !createForm.dueDate) return;
    setCreating(true);
    try {
      await apiPost('/api/homework', {
        schoolId: currentUser.schoolId,
        classGroupId: createForm.classGroupId,
        subjectId: createForm.subjectId || null,
        title: createForm.title,
        description: createForm.description || null,
        dueDate: createForm.dueDate,
        homeworkType: createForm.homeworkType,
        maxPoints: createForm.maxPoints ? parseFloat(createForm.maxPoints) : null,
        isPublished: createForm.isPublished,
      });
      toast.success(t('homework.create_success'));
      setCreateOpen(false);
      setCreateForm({ title: '', description: '', classGroupId: '', subjectId: '', dueDate: '', homeworkType: 'assignment', maxPoints: '', isPublished: true });
      loadHomework();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.create_error'));
    } finally {
      setCreating(false);
    }
  };

  // Delete homework
  const handleDelete = async (id: string) => {
    if (!confirm(t('homework.confirm_delete'))) return;
    try {
      await apiDelete(`/api/homework/${id}`);
      toast.success(t('homework.delete_success'));
      loadHomework();
      setDetailOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.delete_error'));
    }
  };

  // Load submissions for a homework
  const loadSubmissions = async (homeworkId: string) => {
    setSubmissionsLoading(true);
    try {
      const data = await apiGet<SubmissionItem[]>(`/api/homework/${homeworkId}/submissions`);
      setSubmissions(data);
    } catch {
      setSubmissions([]);
    } finally {
      setSubmissionsLoading(false);
    }
  };

  // Open homework detail
  const openDetail = async (hw: HomeworkItem) => {
    setSelectedHomework(hw);
    setDetailOpen(true);
    if (isTeacherOrAdmin) {
      await loadSubmissions(hw.id);
    }
  };

  // Grade submission
  const openGrading = (sub: SubmissionItem) => {
    setGradingSubmission(sub);
    setGradeScore(sub.score ?? 0);
    setGradeFeedback(sub.feedback ?? '');
    setGradingOpen(true);
  };

  const handleGrade = async () => {
    if (!gradingSubmission || !selectedHomework) return;
    setGradingSaving(true);
    try {
      await apiPut(`/api/homework/${selectedHomework.id}/submissions/${gradingSubmission.id}`, {
        score: gradeScore,
        feedback: gradeFeedback || null,
        status: 'graded',
      });
      toast.success(t('homework.grade_success'));
      setGradingOpen(false);
      loadSubmissions(selectedHomework.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.grade_error'));
    } finally {
      setGradingSaving(false);
    }
  };

  // Submit homework (student)
  const handleSubmit = async () => {
    if (!selectedHomework) return;
    setSubmitting(true);
    try {
      await apiPost(`/api/homework/${selectedHomework.id}/submissions`, {
        content: submitContent || null,
      });
      toast.success(t('homework.submit_success'));
      setSubmitOpen(false);
      setSubmitContent('');
      loadHomework();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.submit_error'));
    } finally {
      setSubmitting(false);
    }
  };

  // Edit homework
  const openEdit = (hw: HomeworkItem) => {
    setEditForm({
      id: hw.id,
      title: hw.title,
      description: hw.description ?? '',
      dueDate: hw.dueDate,
      homeworkType: hw.homeworkType,
      maxPoints: hw.maxPoints,
      isPublished: hw.isPublished,
      subjectId: hw.subjectId,
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!editForm.id) return;
    setEditing(true);
    try {
      await apiPut(`/api/homework/${editForm.id}`, {
        title: editForm.title,
        description: editForm.description || null,
        dueDate: editForm.dueDate,
        homeworkType: editForm.homeworkType,
        maxPoints: editForm.maxPoints,
        isPublished: editForm.isPublished,
        subjectId: editForm.subjectId || null,
      });
      toast.success(t('homework.update_success'));
      setEditOpen(false);
      loadHomework();
      if (selectedHomework?.id === editForm.id) {
        setSelectedHomework({ ...selectedHomework, ...editForm } as HomeworkItem);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('homework.update_error'));
    } finally {
      setEditing(false);
    }
  };

  // Stats
  const overdueCount = homeworks.filter((h) => getDueDateStatus(h.dueDate) === 'overdue').length;
  const todayCount = homeworks.filter((h) => getDueDateStatus(h.dueDate) === 'today').length;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookCheck className="h-7 w-7 text-primary" />
            {isStudent ? t('homework.my_homework') : t('homework.title')}
          </h1>
          <p className="text-muted-foreground mt-1">{t('homework.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('grid')}
              title={t('homework.view_grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('list')}
              title={t('homework.view_list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              className="min-h-[44px] rounded-none"
              onClick={() => setViewMode('calendar')}
              title={t('homework.view_calendar')}
            >
              <CalendarDays className="h-4 w-4" />
            </Button>
          </div>

          {isTeacherOrAdmin && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="min-h-[44px]">
                  <Plus className="h-4 w-4 mr-2" />
                  {t('homework.create')}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{t('homework.create_title')}</DialogTitle>
                  <DialogDescription>{t('homework.create_description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>{t('homework.field_title')}</Label>
                    <Input
                      value={createForm.title}
                      onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                      placeholder={t('homework.field_title_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('homework.field_class')}</Label>
                    <Select value={createForm.classGroupId} onValueChange={(v) => setCreateForm({ ...createForm, classGroupId: v })}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder={t('homework.field_class_placeholder')} /></SelectTrigger>
                      <SelectContent>
                        {classes.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('homework.field_subject')}</Label>
                    <Select value={createForm.subjectId || 'none'} onValueChange={(v) => setCreateForm({ ...createForm, subjectId: v === 'none' ? '' : v })}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue placeholder={t('homework.field_subject_placeholder')} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{t('homework.no_subject')}</SelectItem>
                        {subjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('homework.field_type')}</Label>
                    <Select value={createForm.homeworkType} onValueChange={(v) => setCreateForm({ ...createForm, homeworkType: v })}>
                      <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['assignment', 'reading', 'project', 'practice', 'research'].map((type) => (
                          <SelectItem key={type} value={type}>{getHomeworkTypeLabel(type)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('homework.field_due_date')}</Label>
                    <Input
                      type="datetime-local"
                      value={createForm.dueDate}
                      onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('homework.field_max_points')}</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={createForm.maxPoints}
                      onChange={(e) => setCreateForm({ ...createForm, maxPoints: e.target.value })}
                      placeholder={t('homework.field_max_points_placeholder')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('homework.field_description')}</Label>
                    <Textarea
                      value={createForm.description}
                      onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                      placeholder={t('homework.field_description_placeholder')}
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="create-published"
                      checked={createForm.isPublished}
                      onChange={(e) => setCreateForm({ ...createForm, isPublished: e.target.checked })}
                      className="rounded"
                    />
                    <Label htmlFor="create-published">{t('homework.field_published')}</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
                  <Button onClick={handleCreate} disabled={creating} className="min-h-[44px]">
                    {creating ? t('homework.creating') : t('action.create')}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="homework-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BookCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{homeworks.length}</p>
                <p className="text-xs text-muted-foreground">{t('homework.total')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="due-overdue">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              <div>
                <p className="text-2xl font-bold text-rose-600">{overdueCount}</p>
                <p className="text-xs text-muted-foreground">{t('homework.overdue')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="due-today">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              <div>
                <p className="text-2xl font-bold text-amber-600">{todayCount}</p>
                <p className="text-xs text-muted-foreground">{t('homework.due_today')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="due-upcoming">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-500" />
              <div>
                <p className="text-2xl font-bold text-emerald-600">{homeworks.length - overdueCount - todayCount}</p>
                <p className="text-xs text-muted-foreground">{t('homework.upcoming')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9 min-h-[44px]"
                placeholder={t('homework.search_placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]"><SelectValue placeholder={t('homework.filter_class')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('homework.all_classes')}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]"><SelectValue placeholder={t('homework.filter_subject')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('homework.all_subjects')}</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-full sm:w-[160px] min-h-[44px]"><SelectValue placeholder={t('homework.filter_type')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('homework.all_types')}</SelectItem>
                {['assignment', 'reading', 'project', 'practice', 'research'].map((type) => (
                  <SelectItem key={type} value={type}>{getHomeworkTypeLabel(type)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[140px] min-h-[44px]"><SelectValue placeholder={t('homework.filter_status')} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('homework.all_status')}</SelectItem>
                <SelectItem value="overdue">{t('homework.overdue')}</SelectItem>
                <SelectItem value="upcoming">{t('homework.upcoming')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="border-rose-200 dark:border-rose-800">
          <CardContent className="py-6 text-center">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-rose-500" />
            <p className="text-rose-600 dark:text-rose-400 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={loadHomework} className="min-h-[44px]">
              <RefreshCw className="h-4 w-4 mr-1" />
              {t('action.refresh')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content based on view mode */}
      {!error && (viewMode === 'calendar' ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {loading ? (
            <CalendarSkeleton />
          ) : (
            <HomeworkCalendarView
              homeworks={filteredHomeworks}
              onHomeworkClick={openDetail}
              locale={locale}
            />
          )}
        </motion.div>
      ) : loading ? (
        <HomeworkSkeleton />
      ) : filteredHomeworks.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <BookCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium text-muted-foreground mb-1">{t('homework.no_homework')}</p>
            <p className="text-sm text-muted-foreground">{t('homework.no_homework_hint')}</p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredHomeworks.map((hw) => {
              const dueStatus = getDueDateStatus(hw.dueDate);
              const TypeIcon = getHomeworkTypeIcon(hw.homeworkType);
              return (
                <motion.div
                  key={hw.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`homework-card cursor-pointer hover:shadow-md transition-shadow border-l-4 ${dueStatus === 'overdue' ? 'border-l-rose-500' : dueStatus === 'today' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}
                    onClick={() => openDetail(hw)}
                  >
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <TypeIcon className="h-5 w-5 text-primary shrink-0" />
                          <CardTitle className="text-base truncate">{hw.title}</CardTitle>
                        </div>
                        <Badge className={`text-xs shrink-0 ${getHomeworkTypeColor(hw.homeworkType)}`}>
                          {getHomeworkTypeLabel(hw.homeworkType)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 space-y-2">
                      {hw.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{hw.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="font-medium">{hw.classGroup.name}</span>
                        {hw.subject && (
                          <>
                            <span className="text-border">|</span>
                            <span>{hw.subject.name}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <Badge className={`text-xs ${getDueDateColor(dueStatus)}`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {getDueDateLabel(hw.dueDate)}
                        </Badge>
                        {hw.maxPoints && (
                          <span className="text-xs text-muted-foreground">
                            {hw.maxPoints} {t('homework.points')}
                          </span>
                        )}
                      </div>
                      {/* Submission status indicators for teacher */}
                      {isTeacherOrAdmin && hw._count && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            {hw._count.submissions} {t('homework.submissions_count')}
                          </div>
                        </div>
                      )}
                      {/* Grade display for student */}
                      {isStudent && hw._count && hw._count.submissions > 0 && (
                        <div className="flex items-center gap-1">
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <Trophy className="h-3 w-3 mr-1" />
                            {t('homework.status_graded')}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        /* ── List View ── */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="space-y-2"
        >
          <AnimatePresence>
            {filteredHomeworks.map((hw) => {
              const dueStatus = getDueDateStatus(hw.dueDate);
              const TypeIcon = getHomeworkTypeIcon(hw.homeworkType);
              const StatusIcon = dueStatus === 'overdue' ? XCircle : dueStatus === 'today' ? Clock : CheckCircle2;
              return (
                <motion.div
                  key={hw.id}
                  layout
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card
                    className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${dueStatus === 'overdue' ? 'border-l-rose-500' : dueStatus === 'today' ? 'border-l-amber-500' : 'border-l-emerald-500'}`}
                    onClick={() => openDetail(hw)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getHomeworkTypeColor(hw.homeworkType)} shrink-0`}>
                          <TypeIcon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{hw.title}</span>
                            <Badge className={`text-xs shrink-0 ${getDueDateColor(dueStatus)}`}>
                              <Clock className="h-3 w-3 mr-1" />
                              {getDueDateLabel(hw.dueDate)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                            <span className="font-medium">{hw.classGroup.name}</span>
                            {hw.subject && (
                              <>
                                <span>|</span>
                                <span>{hw.subject.name}</span>
                              </>
                            )}
                            {hw.maxPoints && (
                              <>
                                <span>|</span>
                                <span>{hw.maxPoints} {t('homework.points')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isTeacherOrAdmin && hw._count && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Send className="h-3 w-3" />
                              {hw._count.submissions}
                            </div>
                          )}
                          <StatusIcon className={`h-4 w-4 ${
                            dueStatus === 'overdue' ? 'text-rose-500' : dueStatus === 'today' ? 'text-amber-500' : 'text-emerald-500'
                          }`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ))}

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedHomework && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {React.createElement(getHomeworkTypeIcon(selectedHomework.homeworkType), { className: 'h-5 w-5 text-primary' })}
                  <DialogTitle>{selectedHomework.title}</DialogTitle>
                </div>
                <DialogDescription>
                  {selectedHomework.classGroup.name}
                  {selectedHomework.subject && ` | ${selectedHomework.subject.name}`}
                  {' | '}{selectedHomework.teacher.firstName} {selectedHomework.teacher.lastName}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={getDueDateColor(getDueDateStatus(selectedHomework.dueDate))}>
                    <Clock className="h-3 w-3 mr-1" />
                    {getDueDateLabel(selectedHomework.dueDate)}
                  </Badge>
                  <Badge variant="outline">{getHomeworkTypeLabel(selectedHomework.homeworkType)}</Badge>
                  {selectedHomework.maxPoints && (
                    <Badge variant="outline">{selectedHomework.maxPoints} {t('homework.points')}</Badge>
                  )}
                  {!selectedHomework.isPublished && (
                    <Badge variant="secondary">{t('homework.draft')}</Badge>
                  )}
                </div>
                {selectedHomework.description && (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="text-sm whitespace-pre-wrap">{selectedHomework.description}</p>
                  </div>
                )}
                <Separator />

                {/* Teacher view: submissions */}
                {isTeacherOrAdmin && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-sm">{t('homework.submissions')} ({submissions.length})</h3>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => openEdit(selectedHomework)} className="min-h-[44px]">
                          <Edit3 className="h-3 w-3 mr-1" /> {t('action.edit')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(selectedHomework.id)} className="min-h-[44px]">
                          <Trash2 className="h-3 w-3 mr-1" /> {t('action.delete')}
                        </Button>
                      </div>
                    </div>
                    {submissionsLoading ? (
                      <div className="space-y-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton key={i} className="h-16 w-full" />
                        ))}
                      </div>
                    ) : submissions.length === 0 ? (
                      <Card>
                        <CardContent className="py-6 text-center">
                          <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-30" />
                          <p className="text-sm text-muted-foreground">{t('homework.no_submissions')}</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {submissions.map((sub) => {
                          const SubStatusIcon = getStatusIcon(sub.status);
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-medium shrink-0">
                                  {sub.student.firstName[0]}{sub.student.lastName[0]}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate">{sub.student.firstName} {sub.student.lastName}</p>
                                  <div className="flex items-center gap-2">
                                    <SubStatusIcon className={`h-3 w-3 ${
                                      sub.status === 'graded' ? 'text-emerald-500' : sub.status === 'late' ? 'text-rose-500' : sub.status === 'submitted' ? 'text-blue-500' : 'text-gray-400'
                                    }`} />
                                    <Badge className={`text-xs ${getStatusBadge(sub.status)}`}>{getStatusLabel(sub.status)}</Badge>
                                    {sub.score !== null && (
                                      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                                        <Trophy className="h-3 w-3" />
                                        {sub.score}/{selectedHomework.maxPoints ?? '?'}
                                      </span>
                                    )}
                                  </div>
                                  {sub.feedback && (
                                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{sub.feedback}</p>
                                  )}
                                </div>
                              </div>
                              <Button size="sm" variant="outline" onClick={() => openGrading(sub)} className="min-h-[44px] shrink-0">
                                <GraduationCap className="h-3 w-3 mr-1" />
                                {sub.status === 'graded' ? t('homework.regrade') : t('homework.grade')}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Student view: submit */}
                {isStudent && (
                  <div className="space-y-3">
                    <Button onClick={() => setSubmitOpen(true)} className="min-h-[44px] w-full">
                      <Send className="h-4 w-4 mr-2" />
                      {t('homework.submit_work')}
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Grading Dialog */}
      <Dialog open={gradingOpen} onOpenChange={setGradingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('homework.grade_title')}</DialogTitle>
            <DialogDescription>
              {gradingSubmission?.student.firstName} {gradingSubmission?.student.lastName}
              {selectedHomework?.maxPoints ? ` (${t('homework.max_points')}: ${selectedHomework.maxPoints})` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('homework.score')}</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[gradeScore]}
                  onValueChange={(v) => setGradeScore(v[0])}
                  max={selectedHomework?.maxPoints ?? 100}
                  step={0.5}
                  className="flex-1"
                />
                <span className="text-lg font-bold w-16 text-right">{gradeScore}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('homework.feedback')}</Label>
              <Textarea
                value={gradeFeedback}
                onChange={(e) => setGradeFeedback(e.target.value)}
                placeholder={t('homework.feedback_placeholder')}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGradingOpen(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button onClick={handleGrade} disabled={gradingSaving} className="min-h-[44px]">
              {gradingSaving ? t('homework.saving') : t('homework.save_grade')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Dialog (Student) */}
      <Dialog open={submitOpen} onOpenChange={setSubmitOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('homework.submit_title')}</DialogTitle>
            <DialogDescription>{selectedHomework?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('homework.your_answer')}</Label>
              <Textarea
                value={submitContent}
                onChange={(e) => setSubmitContent(e.target.value)}
                placeholder={t('homework.your_answer_placeholder')}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubmitOpen(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="min-h-[44px]">
              {submitting ? t('homework.submitting') : t('homework.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('homework.edit_title')}</DialogTitle>
            <DialogDescription>{t('homework.edit_description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('homework.field_title')}</Label>
              <Input
                value={editForm.title ?? ''}
                onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('homework.field_due_date')}</Label>
              <Input
                type="datetime-local"
                value={editForm.dueDate ? new Date(editForm.dueDate).toISOString().slice(0, 16) : ''}
                onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('homework.field_subject')}</Label>
              <Select value={editForm.subjectId || 'none'} onValueChange={(v) => setEditForm({ ...editForm, subjectId: v === 'none' ? '' : v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('homework.no_subject')}</SelectItem>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('homework.field_type')}</Label>
              <Select value={editForm.homeworkType ?? 'assignment'} onValueChange={(v) => setEditForm({ ...editForm, homeworkType: v })}>
                <SelectTrigger className="min-h-[44px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['assignment', 'reading', 'project', 'practice', 'research'].map((type) => (
                    <SelectItem key={type} value={type}>{getHomeworkTypeLabel(type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('homework.field_max_points')}</Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                value={editForm.maxPoints ?? ''}
                onChange={(e) => setEditForm({ ...editForm, maxPoints: e.target.value ? parseFloat(e.target.value) : null })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('homework.field_description')}</Label>
              <Textarea
                value={editForm.description ?? ''}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-published"
                checked={editForm.isPublished ?? true}
                onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-published">{t('homework.field_published')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button onClick={handleEdit} disabled={editing} className="min-h-[44px]">
              {editing ? t('homework.saving') : t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
