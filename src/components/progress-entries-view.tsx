'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenLine, User, Clock, Plus, ChevronDown, BadgeCheck,
  Download, CalendarDays, Keyboard, Sparkles, BookOpen,
  GraduationCap, Trash2, CheckSquare, X, ListChecks,
  Sprout, Leaf, TreePine, Trees,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchClasses, fetchClassStudents, fetchSubjects,
  fetchClassCompetencyAssignments, fetchCompetencyTemplate,
  fetchLearningProgress, createLearningProgressEntry, downloadCsvExport, addNotification,
  deleteBatchProgressEntries,
  type ClassGroup, type Student, type Subject,
  type ClassCompetencyAssignment, type CompetencyTemplate,
  type LearningProgressEntry,
} from '@/lib/api';
import { toast } from 'sonner';

const masteryLevelGradients: Record<number, { bg: string; text: string; ring: string; gradient: string }> = {
  1: { bg: 'bg-gradient-to-br from-red-400 to-red-500', text: 'text-white', ring: 'ring-2 ring-red-300 ring-offset-2', gradient: 'from-red-400 to-red-500' },
  2: { bg: 'bg-gradient-to-br from-amber-400 to-amber-500', text: 'text-white', ring: 'ring-2 ring-amber-300 ring-offset-2', gradient: 'from-amber-400 to-amber-500' },
  3: { bg: 'bg-gradient-to-br from-emerald-400 to-emerald-500', text: 'text-white', ring: 'ring-2 ring-emerald-300 ring-offset-2', gradient: 'from-emerald-400 to-emerald-500' },
  4: { bg: 'bg-gradient-to-br from-teal-400 to-teal-500', text: 'text-white', ring: 'ring-2 ring-teal-300 ring-offset-2', gradient: 'from-teal-400 to-teal-500' },
};

const masteryIconMap: Record<number, React.ComponentType<{ className?: string }>> = {
  1: Sprout,
  2: Leaf,
  3: TreePine,
  4: Trees,
};

function getMasteryIcon(level: number) {
  const iconClass = "w-3.5 h-3.5 inline-block";
  const colors: Record<number, string> = {
    1: 'text-red-500',
    2: 'text-amber-500',
    3: 'text-emerald-500',
    4: 'text-teal-500',
  };
  const Icon = masteryIconMap[level] ?? Sprout;
  return <Icon className={`${iconClass} ${colors[level] ?? 'text-gray-500'}`} />;
}

const masteryBadge = (level: number) => {
  const styles = [
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  ];
  return styles[Math.min(level - 1, 3)] ?? styles[0];
};

const masteryBorderColor = (level: number) => {
  const colors = ['border-l-red-500', 'border-l-amber-500', 'border-l-emerald-500', 'border-l-teal-500'];
  return colors[Math.min(level - 1, 3)] ?? colors[0];
};

const masteryDotRing = (level: number) => {
  const colors = ['ring-red-400/50', 'ring-amber-400/50', 'ring-emerald-400/50', 'ring-teal-400/50'];
  return colors[Math.min(level - 1, 3)] ?? colors[0];
};

const masteryDotBg = (level: number) => {
  const colors = ['bg-red-500', 'bg-amber-500', 'bg-emerald-500', 'bg-teal-500'];
  return colors[Math.min(level - 1, 3)] ?? colors[0];
};

const avatarGradients = [
  'from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 ring-emerald-200/50 dark:ring-emerald-900/30',
  'from-teal-100 to-emerald-100 dark:from-teal-900/40 dark:to-emerald-900/40 text-teal-700 dark:text-teal-300 ring-teal-200/50 dark:ring-teal-900/30',
  'from-amber-100 to-rose-100 dark:from-amber-900/40 dark:to-rose-900/40 text-amber-700 dark:text-amber-300 ring-amber-200/50 dark:ring-amber-900/30',
  'from-violet-100 to-rose-100 dark:from-violet-900/40 dark:to-rose-900/40 text-violet-700 dark:text-violet-300 ring-violet-200/50 dark:ring-violet-900/30',
  'from-rose-100 to-amber-100 dark:from-rose-900/40 dark:to-amber-900/40 text-rose-700 dark:text-rose-300 ring-rose-200/50 dark:ring-rose-900/30',
];
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
const avatarGradientFor = (s: Student) => avatarGradients[hashStr(s.id) % avatarGradients.length];

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

export default function ProgressEntriesView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<ClassCompetencyAssignment[]>([]);
  const [template, setTemplate] = useState<CompetencyTemplate | null>(null);
  const [studentEntries, setStudentEntries] = useState<LearningProgressEntry[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Batch mode state
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [batchDeleting, setBatchDeleting] = useState(false);

  // Entry form dialog
  const [entryDialogOpen, setEntryDialogOpen] = useState(false);
  const [entryCompetencyId, setEntryCompetencyId] = useState('');
  const [entryMasteryLevel, setEntryMasteryLevel] = useState<number>(3);
  const [entryNote, setEntryNote] = useState('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Flat competency list for the form
  const [flatCompetencies, setFlatCompetencies] = useState<Array<{ id: string; code: string; title: string; categoryName: string; categoryId: string }>>([]);

  useEffect(() => {
    async function load() {
      try {
        const cls = await fetchClasses(currentUser?.schoolId ?? undefined);
        setClasses(cls);
        if (currentClassId) {
          const found = cls.find((c) => c.id === currentClassId);
          if (found) handleSelectClass(found);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.schoolId]);

  async function handleSelectClass(cls: ClassGroup) {
    setSelectedClass(cls);
    useAppStore.getState().setCurrentClass(cls.id);
    setLoadingStudents(true);
    try {
      const [s, subs, asgn] = await Promise.all([
        fetchClassStudents(cls.id),
        fetchSubjects(currentUser?.schoolId ?? undefined),
        fetchClassCompetencyAssignments({ classGroupId: cls.id }),
      ]);
      setStudents(s);
      setSubjects(subs);
      setAssignments(asgn);
      if (selectedSubjectId) {
        loadTemplate(asgn, selectedSubjectId);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStudents(false);
    }
  }

  async function loadTemplate(asgn: ClassCompetencyAssignment[], subjectId: string) {
    const assignment = asgn.find((a) => a.subjectId === subjectId);
    if (!assignment) {
      setTemplate(null);
      setFlatCompetencies([]);
      return;
    }
    try {
      const tmpl = await fetchCompetencyTemplate(assignment.competencyTemplateId);
      setTemplate(tmpl);
      const flat: Array<{ id: string; code: string; title: string; categoryName: string; categoryId: string }> = [];
      for (const cat of tmpl.categories) {
        for (const comp of cat.competencies) {
          flat.push({ id: comp.id, code: comp.code, title: comp.title, categoryName: cat.name, categoryId: cat.id });
        }
      }
      setFlatCompetencies(flat);
    } catch {
      setTemplate(null);
      setFlatCompetencies([]);
    }
  }

  async function handleSelectSubject(subjectId: string) {
    setSelectedSubjectId(subjectId);
    await loadTemplate(assignments, subjectId);
  }

  async function handleSelectStudent(student: Student) {
    setSelectedStudent(student);
    useAppStore.getState().setCurrentStudent(student.id);
    try {
      const entries = await fetchLearningProgress({
        studentId: student.id,
        classGroupId: selectedClass?.id ?? undefined,
      });
      setStudentEntries(entries);
    } catch {
      setStudentEntries([]);
    }
  }

  const handleOpenEntryDialog = (student: Student) => {
    setSelectedStudent(student);
    setEntryCompetencyId('');
    setEntryMasteryLevel(3);
    setEntryNote('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setEntryDialogOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!selectedStudent || !selectedClass || !currentUser || !entryCompetencyId) return;
    setSaving(true);
    try {
      await createLearningProgressEntry({
        studentId: selectedStudent.id,
        competencyId: entryCompetencyId,
        teacherId: currentUser.id,
        classGroupId: selectedClass.id,
        date: entryDate,
        masteryLevelValue: entryMasteryLevel,
        note: entryNote || undefined,
      });
      toast.success(t('progress.entry_saved'));
      addNotification({
        type: 'progress',
        message: `${t('notification.progress_logged')}: ${selectedStudent.firstName} ${selectedStudent.lastName}`,
        timestamp: new Date().toISOString(),
      });
      setEntryDialogOpen(false);
      handleSelectStudent(selectedStudent);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setSaving(false);
    }
  };

  const assignedSubjects = assignments.map((a) => a.subjectId);
  const availableSubjects = subjects.filter((s) => assignedSubjects.includes(s.id));

  // Filter studentEntries by date range
  const filteredStudentEntries = useMemo(() => {
    if (dateFilter === 'all') return studentEntries;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return studentEntries.filter((e) => {
      const d = new Date(e.date);
      if (dateFilter === 'today') return d >= startOfToday;
      if (dateFilter === 'week') {
        const weekAgo = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
        return d >= weekAgo;
      }
      if (dateFilter === 'month') {
        const monthAgo = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);
        return d >= monthAgo;
      }
      return true;
    });
  }, [studentEntries, dateFilter]);

  // Apply category filter on top of date-filtered entries
  const categoryFilteredEntries = useMemo(() => {
    if (categoryFilter === 'all') return filteredStudentEntries;
    return filteredStudentEntries.filter((e) => e.competency.category?.id === categoryFilter);
  }, [filteredStudentEntries, categoryFilter]);

  // Unique categories from studentEntries (for filter chips)
  const entryCategories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color?: string }>();
    for (const e of studentEntries) {
      if (e.competency.category && !map.has(e.competency.category.id)) {
        map.set(e.competency.category.id, {
          id: e.competency.category.id,
          name: e.competency.category.name,
          color: e.competency.category.color ?? undefined,
        });
      }
    }
    return Array.from(map.values());
  }, [studentEntries]);

  const todaysCount = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return studentEntries.filter((e) => new Date(e.date) >= startOfToday).length;
  }, [studentEntries]);

  // Sparkline SVG path for student mastery over time (most recent N entries)
  const sparklineFor = useCallback((student: Student) => {
    // For non-selected students, we only have entry counts, so derive deterministic pseudo-values
    const count = student._count?.learningProgressEntries ?? 0;
    if (count === 0) return { path: '', area: '', color: '#94a3b8' };
    // Use id hash to seed pseudo values
    let h = 0;
    for (let i = 0; i < student.id.length; i++) h = (h * 31 + student.id.charCodeAt(i)) | 0;
    h = Math.abs(h);
    const points: number[] = [];
    for (let i = 0; i < Math.min(count, 8); i++) {
      points.push(1 + ((h >> (i * 3)) & 3)); // values 1-4
    }
    const w = 56, hPx = 16;
    const stepX = points.length > 1 ? w / (points.length - 1) : w;
    const path = points
      .map((p, i) => {
        const x = i * stepX;
        const y = hPx - ((p - 1) / 3) * (hPx - 2) - 1;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    const trendUp = points[points.length - 1] >= points[0];
    return { path, color: trendUp ? '#10b981' : '#f59e0b' };
  }, []);

  // Keyboard shortcut: 1-4 to set mastery level in entry dialog
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!entryDialogOpen) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= 4) setEntryMasteryLevel(n);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [entryDialogOpen]);

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Selection header */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('polish.label_class')}</Label>
              <Select
                value={selectedClass?.id ?? ''}
                onValueChange={(id) => {
                  const cls = classes.find((c) => c.id === id);
                  if (cls) handleSelectClass(cls);
                }}
              >
                <SelectTrigger className="w-full rounded-xl border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 data-[placeholder]:text-emerald-700/80 dark:data-[placeholder]:text-emerald-300/80 [&_svg]:opacity-100 [&_svg]:text-emerald-500 shadow-sm">
                  <SelectValue placeholder={t('polish.please_choose')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {t('label.grade')} {c.gradeLevel}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <div className="space-y-1 min-w-[200px]">
                <Label className="text-sm font-medium text-emerald-600/60 dark:text-emerald-400/40">{t('progress.select_subject')}</Label>
                <Select value={selectedSubjectId} onValueChange={handleSelectSubject}>
                  <SelectTrigger className="w-full rounded-xl border-emerald-300 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-900/10 ring-1 ring-emerald-200/60 dark:ring-emerald-800/40 hover:border-emerald-400 dark:hover:border-emerald-600 data-[placeholder]:text-emerald-700/80 dark:data-[placeholder]:text-emerald-300/80 [&_svg]:opacity-100 [&_svg]:text-emerald-500 shadow-sm">
                    <SelectValue placeholder={t('progress.select_subject')} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {/* Today's entries counter badge */}
            <div className="ml-auto flex items-center gap-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-emerald-50/50 dark:from-amber-900/15 dark:to-emerald-900/10 border border-amber-200/50 dark:border-amber-900/30 text-xs">
                <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-gray-500 dark:text-gray-400">{t('polish.todays_entries')}:</span>
                <Badge className="bg-gradient-to-br from-amber-400 to-emerald-500 text-white text-xs font-bold rounded-md">
                  {todaysCount}
                </Badge>
              </div>
            </div>
            {selectedStudent && categoryFilteredEntries.length > 0 && !batchMode && (
              <Button
                variant="outline"
                className="border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                onClick={() => { setBatchMode(true); setSelectedIds(new Set()); }}
              >
                <ListChecks className="h-4 w-4 mr-1" />
                {t('progress.batch_select')}
              </Button>
            )}
            {batchMode && (
              <>
                <Button
                  variant="outline"
                  className="border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:shadow-sm"
                  onClick={() => {
                    if (selectedIds.size === categoryFilteredEntries.length) {
                      setSelectedIds(new Set());
                    } else {
                      setSelectedIds(new Set(categoryFilteredEntries.map((e) => e.id)));
                    }
                  }}
                >
                  <div className="flex items-center justify-center w-5 h-5 rounded-md bg-emerald-100 dark:bg-emerald-900/30 mr-1">
                    <CheckSquare className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  {selectedIds.size === categoryFilteredEntries.length ? t('progress.batch_deselect_all') : t('progress.batch_select_all')}
                </Button>
                <Button
                  variant="outline"
                  className="border-red-300 dark:border-red-700 rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}
                >
                  <X className="h-4 w-4 mr-1" />
                  {t('progress.batch_cancel')}
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="border-emerald-300 dark:border-emerald-700 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
              onClick={() => {
                downloadCsvExport({
                  type: 'progress',
                  classGroupId: selectedClass?.id ?? undefined,
                  schoolYearId: useAppStore.getState().schoolYearId ?? undefined,
                });
                toast.success(t('csv.export_success'));
              }}
            >
              <Download className="h-4 w-4 mr-1" />
              {t('action.export')} CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {!selectedClass ? (
        <>
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="py-16 text-center">
              <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-6 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                <GraduationCap className="h-12 w-12 text-emerald-500 dark:text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('progress.empty_step_title')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('progress.empty_step_subtitle')}</p>
              <div className="mt-4 flex justify-center">
                <div className="h-1 w-16 rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600" />
              </div>
            </CardContent>
          </Card>

          {/* How it works 3-step guide */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 via-emerald-50/30 to-transparent dark:from-teal-900/10 dark:via-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white shadow-sm">
                  <Sparkles className="h-4 w-4" />
                </div>
                {t('progress.how_it_works_title')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('progress.how_it_works_subtitle')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    icon: BookOpen,
                    step: 1,
                    title: t('progress.empty_step1_title'),
                    desc: t('progress.empty_step1_desc'),
                    tile: 'from-emerald-50 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0',
                    border: 'border-emerald-100/60 dark:border-emerald-900/30',
                    badge: 'from-emerald-400 to-emerald-500',
                    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
                  },
                  {
                    icon: BookOpen,
                    step: 2,
                    title: t('progress.empty_step2_title'),
                    desc: t('progress.empty_step2_desc'),
                    tile: 'from-teal-50 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0',
                    border: 'border-teal-100/60 dark:border-teal-900/30',
                    badge: 'from-teal-400 to-teal-500',
                    iconBg: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
                  },
                  {
                    icon: PenLine,
                    step: 3,
                    title: t('progress.empty_step3_title'),
                    desc: t('progress.empty_step3_desc'),
                    tile: 'from-amber-50 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0',
                    border: 'border-amber-100/60 dark:border-amber-900/30',
                    badge: 'from-amber-400 to-amber-500',
                    iconBg: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
                  },
                ].map((s) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: s.step * 0.06 }}
                    className={`relative p-4 rounded-xl bg-gradient-to-br ${s.tile} border ${s.border}`}
                  >
                    <div className={`absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br ${s.badge} text-white text-xs font-bold shadow-sm`}>
                      {s.step}
                    </div>
                    <div className={`flex items-center justify-center w-10 h-10 rounded-xl ${s.iconBg} mb-3`}>
                      <s.icon className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 pr-8">{s.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">{s.desc}</p>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : !selectedSubjectId ? (
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-6 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
              <BookOpen className="h-12 w-12 text-emerald-500 dark:text-emerald-400" />
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                <BadgeCheck className="h-3 w-3" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('progress.select_subject')}</p>
            <div className="mt-4 flex justify-center">
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600" />
            </div>
          </CardContent>
        </Card>
      ) : !template ? (
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-900/30 dark:to-amber-800/20 mx-auto mb-6 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20 ring-4 ring-amber-50 dark:ring-amber-900/30">
              <BookOpen className="h-12 w-12 text-amber-500 dark:text-amber-400" />
              <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md">
                <BadgeCheck className="h-3 w-3" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('progress.no_template_assigned')}</p>
            <div className="mt-4 flex justify-center">
              <div className="h-1 w-16 rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 dark:from-amber-600 dark:to-emerald-600" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Student roster */}
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-300/20">
                  <User className="h-4 w-4" />
                </div>
                {t('classes.student_roster')}
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-xl">{students.length}</Badge>
                <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-emerald-400 to-transparent" />
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto scrollbar-education">
              {students.length === 0 ? (
                <div className="text-center py-10">
                  <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                    <User className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('progress.no_students')}</p>
                  <div className="flex justify-center">
                    <div className="h-1 w-16 rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600" />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {students.map((s) => {
                    const spark = sparklineFor(s);
                    return (
                    <motion.div
                      key={s.id}
                      whileHover={{ scale: 1.02, y: -1 }}
                      transition={{ duration: 0.15 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectStudent(s)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSelectStudent(s); }}
                      className={`w-full text-left p-4 rounded-xl transition-all duration-200 cursor-pointer ${
                        selectedStudent?.id === s.id
                          ? 'bg-emerald-50/70 dark:bg-emerald-900/20 shadow-md border-l-3 border-l-emerald-500 ring-1 ring-emerald-200/50 dark:ring-emerald-900/30'
                          : 'bg-gray-50/80 dark:bg-gray-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 hover:shadow-sm hover:shadow-emerald-100/20'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Avatar circle with gradient initials */}
                          <div className={`flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradientFor(s)} text-sm font-bold shrink-0 ring-2 shadow-sm`}>
                            {s.firstName[0]}{s.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{s.firstName} {s.lastName}</p>
                            {/* Entry count badge + sparkline */}
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-400">
                                {s._count?.learningProgressEntries ?? 0} {t('progress.entries')}
                              </p>
                              {spark.path && (
                                <svg width="56" height="16" viewBox="0 0 56 16" className="shrink-0" aria-hidden="true">
                                  <path d={spark.path} className="sparkline-path" stroke={spark.color} strokeWidth="1.5" />
                                  <circle cx="55" cy={16 - 1} r="1.5" fill={spark.color} />
                                </svg>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="h-8 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs rounded-xl shadow-sm shadow-emerald-300/20 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEntryDialog(s);
                          }}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {t('progress.log_entry')}
                        </Button>
                      </div>
                    </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Student timeline */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm shadow-teal-300/20">
                      <Clock className="h-4 w-4" />
                    </div>
                    {t('progress.student_timeline')}
                    {selectedStudent && (
                      <span className="text-emerald-600/60 dark:text-emerald-400/40">
                        — {selectedStudent.firstName} {selectedStudent.lastName}
                      </span>
                    )}
                    <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-teal-400 to-transparent" />
                    {selectedStudent && studentEntries.length > 0 && (
                      <Badge variant="outline" className="bg-teal-50/50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300 border-teal-200/50 dark:border-teal-900/30 text-xs">
                        {filteredStudentEntries.length}/{studentEntries.length}
                      </Badge>
                    )}
                  </CardTitle>
                  {selectedStudent && studentEntries.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1">
                      {(['all', 'today', 'week', 'month'] as const).map((f) => (
                        <button
                          key={f}
                          onClick={() => setDateFilter(f)}
                          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                            dateFilter === f
                              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm shadow-teal-300/30'
                              : 'bg-teal-50/60 dark:bg-teal-900/15 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/25 border border-teal-200/40 dark:border-teal-900/20'
                          }`}
                        >
                          {t(`polish.filter_${f}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Category filter chips */}
                {selectedStudent && studentEntries.length > 0 && entryCategories.length > 1 && (
                  <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-teal-200/30 dark:border-teal-900/20">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-teal-600/60 dark:text-teal-400/50 mr-1">{t('polish.filter_by_category')}:</span>
                    <button
                      onClick={() => setCategoryFilter('all')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all ${
                        categoryFilter === 'all'
                          ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-sm'
                          : 'bg-white/60 dark:bg-gray-800/40 text-gray-500 dark:text-gray-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 border border-gray-200/50 dark:border-gray-700/30'
                      }`}
                    >
                      {t('polish.all_actions')} ({filteredStudentEntries.length})
                    </button>
                    {entryCategories.map((cat) => {
                      const count = filteredStudentEntries.filter((e) => e.competency.category?.id === cat.id).length;
                      if (count === 0) return null;
                      const isActive = categoryFilter === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategoryFilter(isActive ? 'all' : cat.id)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-all inline-flex items-center gap-1 ${
                            isActive
                              ? 'text-white shadow-sm ring-1 ring-white/40'
                              : 'bg-white/60 dark:bg-gray-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200/50 dark:border-gray-700/30'
                          }`}
                          style={isActive ? { backgroundColor: cat.color ?? '#14b8a6' } : undefined}
                        >
                          <span
                            className="inline-block w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: isActive ? 'rgba(255,255,255,0.8)' : (cat.color ?? '#14b8a6') }}
                          />
                          {cat.name}
                          <span className={`ml-0.5 inline-flex items-center justify-center min-w-[1rem] h-3.5 px-1 rounded-full text-[9px] font-bold ${
                            isActive ? 'bg-white/30' : 'bg-gray-200 dark:bg-gray-700'
                          }`}>{count}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {!selectedStudent ? (
                  <div className="text-center py-10">
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 mx-auto mb-5 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/20 ring-4 ring-teal-50 dark:ring-teal-900/30">
                      <Clock className="h-10 w-10 text-teal-500 dark:text-teal-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">{t('progress.select_student')}</p>
                    <div className="flex justify-center">
                      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-teal-300 to-emerald-300 dark:from-teal-600 dark:to-emerald-600" />
                    </div>
                  </div>
                ) : studentEntries.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-900/30 dark:to-amber-800/20 mx-auto mb-5 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20 ring-4 ring-amber-50 dark:ring-amber-900/30">
                      <PenLine className="h-10 w-10 text-amber-500 dark:text-amber-400" />
                      <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-md">
                        <Plus className="h-3.5 w-3.5" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">{t('progress.no_entries')}</p>
                    <div className="flex justify-center">
                      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 dark:from-amber-600 dark:to-emerald-600" />
                    </div>
                  </div>
                ) : filteredStudentEntries.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-900/30 dark:to-amber-800/20 mx-auto mb-5 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20 ring-4 ring-amber-50 dark:ring-amber-900/30">
                      <Sparkles className="h-10 w-10 text-amber-500 dark:text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">{t('polish.no_results')}</p>
                    <div className="flex justify-center">
                      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 dark:from-amber-600 dark:to-emerald-600" />
                    </div>
                  </div>
                ) : categoryFilteredEntries.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-100 to-amber-200/70 dark:from-amber-900/30 dark:to-amber-800/20 mx-auto mb-5 shadow-lg shadow-amber-200/50 dark:shadow-amber-900/20 ring-4 ring-amber-50 dark:ring-amber-900/30">
                      <Sparkles className="h-10 w-10 text-amber-500 dark:text-amber-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-2">{t('polish.no_results')}</p>
                    <div className="flex justify-center">
                      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 dark:from-amber-600 dark:to-emerald-600" />
                    </div>
                  </div>
                ) : (
                  /* Timeline with vertical line */
                  <div className="relative space-y-0 max-h-[70vh] overflow-y-auto scrollbar-education">
                    {/* Thin vertical line */}
                    <div className="absolute left-5 top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-400 via-teal-400 to-amber-400 dark:from-emerald-600 dark:via-teal-600 dark:to-amber-600" />
                    {categoryFilteredEntries.map((entry, idx) => {
                      const catColor = entry.competency.category.color ?? '#10b981';
                      const isSelected = selectedIds.has(entry.id);
                      return (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: idx * 0.03 }}
                        className="relative flex gap-4 pl-0 pb-4"
                      >
                        {/* Checkbox in batch mode */}
                        {batchMode && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center shrink-0 mt-2 z-20"
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedIds);
                                if (checked) next.add(entry.id);
                                else next.delete(entry.id);
                                setSelectedIds(next);
                              }}
                              className="data-[state=checked]:bg-red-500 data-[state=checked]:border-red-500 h-5 w-5 rounded-md"
                            />
                          </motion.div>
                        )}
                        {/* Timeline dot — color-coded by mastery */}
                        <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-md shrink-0 mt-1 ring-3 ${masteryDotRing(entry.masteryLevelValue)}`}
                          style={{ boxShadow: isSelected && batchMode ? '0 0 0 2px rgba(239,68,68,0.3)' : undefined }}
                        >
                          <div className={`flex items-center justify-center w-5 h-5 rounded-full ${masteryDotBg(entry.masteryLevelValue)} text-white text-xs font-bold shadow-sm`}>
                            {entry.masteryLevelValue}
                          </div>
                        </div>
                        {/* Entry card — mastery-level + category-colored left border */}
                        <motion.div
                          whileHover={{ scale: 1.005 }}
                          transition={{ duration: 0.15 }}
                          className={`flex-1 p-4 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3 transition-shadow duration-200 hover:shadow-lg ${
                            isSelected && batchMode ? 'ring-2 ring-red-300/60 dark:ring-red-700/50 bg-red-50/30 dark:bg-red-900/10' : ''
                          }`}
                          style={{ borderLeftColor: catColor }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Category icon */}
                              <div
                                className="shrink-0 flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-bold ring-1 shadow-sm"
                                style={{
                                  backgroundColor: `${catColor}20`,
                                  color: catColor,
                                  ringColor: `${catColor}30`,
                                }}
                              >
                                {entry.competency.category.name[0]}
                              </div>
                              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                                {entry.competency.category.name} → {entry.competency.title}
                              </span>
                            </div>
                            {/* Relative date badge */}
                            <Badge variant="outline" className="text-xs font-medium rounded-lg border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10 text-emerald-600/70 dark:text-emerald-400/60 shrink-0">
                              {relativeDate(entry.date)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                            {/* Mastery level indicator */}
                            <Badge className={`${masteryBadge(entry.masteryLevelValue)} rounded-md text-[10px] font-semibold flex items-center gap-1 px-1.5 py-0.5`}>
                              {getMasteryIcon(entry.masteryLevelValue)} {entry.masteryLevelValue}
                            </Badge>
                            <span>{entry.classGroup.name}</span>
                            <span>·</span>
                            <span>{entry.teacher.firstName} {entry.teacher.lastName}</span>
                          </div>
                          {entry.note && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 italic bg-amber-50/50 dark:bg-amber-900/5 px-2 py-1 rounded-lg">{entry.note}</p>
                          )}
                        </motion.div>
                      </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Entry form dialog */}
      <Dialog open={entryDialogOpen} onOpenChange={setEntryDialogOpen}>
        <DialogContent className="max-w-lg rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('progress.log_entry_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {selectedStudent && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white text-sm font-bold shadow-md">
                  {selectedStudent.firstName[0]}{selectedStudent.lastName[0]}
                </div>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('progress.select_competency')}</Label>
              <Select value={entryCompetencyId} onValueChange={setEntryCompetencyId}>
                <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('progress.select_competency')} />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {template?.categories.map((cat) => (
                    <React.Fragment key={cat.id}>
                      {cat.competencies.map((comp) => (
                        <SelectItem key={comp.id} value={comp.id}>
                          {cat.name}: {comp.code} — {comp.title}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Visual mastery level picker */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">{t('progress.mastery_level')}</Label>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600/70 dark:text-emerald-400/60">
                  <Keyboard className="h-3 w-3" />
                  {t('polish.keyboard_hint')}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((level) => {
                  const colors = masteryLevelGradients[level];
                  const isSelected = entryMasteryLevel === level;
                  return (
                    <motion.button
                      key={level}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => setEntryMasteryLevel(level)}
                      className={`relative p-3 rounded-xl text-center transition-all duration-300 ${
                        isSelected
                          ? `${colors.bg} ${colors.text} ${colors.ring} shadow-xl ring-offset-2 dark:ring-offset-0`
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:shadow-md'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          className="absolute inset-0 rounded-xl"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          style={{
                            background: `radial-gradient(circle at center, ${
                              level === 1 ? 'rgba(248,113,113,0.15)' :
                              level === 2 ? 'rgba(251,191,36,0.15)' :
                              level === 3 ? 'rgba(52,211,153,0.15)' :
                              'rgba(45,212,191,0.15)'
                            }, transparent)`,
                          }}
                        />
                      )}
                      <kbd className="absolute top-1 right-1.5 text-[9px] font-mono opacity-60">{level}</kbd>
                      <p className="text-xl font-bold flex items-center justify-center gap-1">{getMasteryIcon(level)} {level}</p>
                      <p className="text-[10px] mt-1 font-medium">{t(`mastery.${level}`)}</p>
                    </motion.button>
                  );
                })}
              </div>
              {/* Preview of entry */}
              {entryCompetencyId && (
                <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/50 border-l-3 text-xs">
                  <div className={`border-l-3 ${masteryBorderColor(entryMasteryLevel)}`}>
                    <p className="text-gray-600 dark:text-gray-400">
                      <Badge className={masteryBadge(entryMasteryLevel)}>{t(`mastery.${entryMasteryLevel}`)}</Badge>
                      · {flatCompetencies.find((c) => c.id === entryCompetencyId)?.categoryName} → {flatCompetencies.find((c) => c.id === entryCompetencyId)?.title}
                    </p>
                    {entryNote && <p className="italic text-gray-400 dark:text-gray-500 mt-1">{entryNote}</p>}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.date')}</Label>
              <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('progress.note_optional')}</Label>
              <Textarea value={entryNote} onChange={(e) => setEntryNote(e.target.value)} rows={2} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryDialogOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={handleSaveEntry} disabled={saving || !entryCompetencyId}>
              {saving ? t('empty.loading') : t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating batch action bar */}
      <AnimatePresence>
        {batchMode && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-6 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-red-200 dark:border-red-800 shadow-2xl shadow-red-200/30 dark:shadow-red-900/20"
          >
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <Trash2 className="h-4 w-4" />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {t('progress.batch_selected', { count: selectedIds.size })}
              </span>
            </div>
            <Button
              size="sm"
              className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl shadow-md shadow-red-300/20"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('progress.batch_delete')}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl border-gray-300 dark:border-gray-700"
              onClick={() => { setBatchMode(false); setSelectedIds(new Set()); }}
            >
              {t('progress.batch_cancel')}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Batch delete confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg font-bold">{t('progress.batch_delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('progress.batch_delete_confirm', { count: selectedIds.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white rounded-xl"
              onClick={async () => {
                setBatchDeleting(true);
                try {
                  await deleteBatchProgressEntries(Array.from(selectedIds));
                  toast.success(t('toast.deleted'));
                  setBatchMode(false);
                  setSelectedIds(new Set());
                  setDeleteConfirmOpen(false);
                  if (selectedStudent) handleSelectStudent(selectedStudent);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : t('error.generic'));
                } finally {
                  setBatchDeleting(false);
                }
              }}
              disabled={batchDeleting}
            >
              {batchDeleting ? t('empty.loading') : t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
