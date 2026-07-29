'use client';

import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Plus, Search, BookOpen, UserPlus, Grid3X3, School,
  Download, Upload, FileText, CheckCircle2, AlertTriangle, FileUp,
  HeartPulse, CalendarClock, Filter, PenLine, BarChart3,
  GripVertical, Armchair, ArrowRight,
  GraduationCap, Library, Backpack,
  Sprout, Leaf, TreePine, Trees,
  QrCode, FileDown,
  Shuffle, Printer, Eraser, Columns3, Rows3, Move,
  Camera,
  UserCheck, Shield, Eye, MessageSquare, CalendarDays, AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import StudentAvatar from '@/components/student-avatar';
import {
  fetchClasses, fetchClassStudents, fetchStudents, createStudent, enrollStudent,
  fetchSubjects, fetchCompetencyTemplates, createClassCompetencyAssignment,
  fetchClassCompetencyAssignments, downloadCsvExport, bulkCreateStudents,
  fetchLearningProgress, reorderStudents,
  apiGet, apiPut,
  type LearningProgressEntry,
  type ClassGroup, type Student, type Subject, type CompetencyTemplate, type ClassCompetencyAssignment,
} from '@/lib/api';
import { generateQRCodeSync, downloadQRCode, type QRCodeData } from '@/lib/qrcode';
import { toast } from 'sonner';

const schoolTypeAccent: Record<string, string> = {
  ELEMENTARY: 'border-l-emerald-500',
  MIDDLE: 'border-l-teal-500',
  GYMNASIUM: 'border-l-violet-500',
  OTHER: 'border-l-amber-500',
};

const schoolTypeAccentBg: Record<string, string> = {
  ELEMENTARY: 'bg-emerald-500',
  MIDDLE: 'bg-teal-500',
  GYMNASIUM: 'bg-violet-500',
  OTHER: 'bg-amber-500',
};

const schoolTypeBadgeBg: Record<string, string> = {
  ELEMENTARY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  MIDDLE: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  GYMNASIUM: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  OTHER: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
};

const schoolTypeGradient: Record<string, string> = {
  ELEMENTARY: 'from-emerald-50/60 to-emerald-100/30 dark:from-emerald-900/15 dark:to-emerald-800/10',
  MIDDLE: 'from-teal-50/60 to-teal-100/30 dark:from-teal-900/15 dark:to-teal-800/10',
  GYMNASIUM: 'from-violet-50/60 to-violet-100/30 dark:from-violet-900/15 dark:to-violet-800/10',
  OTHER: 'from-amber-50/60 to-amber-100/30 dark:from-amber-900/15 dark:to-amber-800/10',
};

const schoolTypeIcon: Record<string, React.ReactNode> = {
  ELEMENTARY: <School className="w-4 h-4" />,
  MIDDLE: <GraduationCap className="w-4 h-4" />,
  GYMNASIUM: <Library className="w-4 h-4" />,
  OTHER: <Backpack className="w-4 h-4" />,
};

const schoolTypeText: Record<string, string> = {
  ELEMENTARY: 'text-emerald-700 dark:text-emerald-300',
  MIDDLE: 'text-teal-700 dark:text-teal-300',
  GYMNASIUM: 'text-violet-700 dark:text-violet-300',
  OTHER: 'text-amber-700 dark:text-amber-300',
};

const entryCountBadge = (count: number) => {
  if (count === 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (count < 5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
};

// Deterministic gradient for student avatars (no gender assumption)
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

// Pseudo last-activity derived deterministically from id (so it stays stable per student)
function pseudoRelativeDays(studentId: string, entryCount: number): number | null {
  if (entryCount <= 0) return null;
  return hashStr(studentId) % 30;
}
function formatRelativeDays(days: number | null, locale: 'de' | 'en' | string): string {
  if (days === null) return t('polish.never');
  if (days === 0) return t('date.today');
  if (days === 1) return t('date.yesterday');
  if (days < 7) return t('date.days_ago', { count: days });
  if (days < 30) return t('date.weeks_ago', { count: Math.floor(days / 7) });
  return `${days}d`;
}

// ─── Recent activity helpers (empty-state widget) ──────────────────
function relativeDate(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays <= 0) return t('date.today');
  if (diffDays === 1) return t('date.yesterday');
  if (diffDays < 7) return t('date.days_ago', { count: diffDays });
  if (diffDays < 30) return t('date.weeks_ago', { count: Math.floor(diffDays / 7) });
  return date.toLocaleDateString();
}
const masteryIcon = (level: number) => {
  const cls = 'w-3.5 h-3.5 inline-block';
  if (level <= 1.5) return <Sprout className={`${cls} text-red-500`} />;
  if (level <= 2.5) return <Leaf className={`${cls} text-amber-500`} />;
  if (level <= 3.5) return <TreePine className={`${cls} text-emerald-500`} />;
  return <Trees className={`${cls} text-teal-500`} />;
};
const masteryBadgeClass = (level: number) => {
  if (level <= 1.5) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (level <= 2.5) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  if (level <= 3.5) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300';
};

export default function ClassesView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);
  const setCurrentClass = useAppStore((s) => s.setCurrentClass);
  const locale = useAppStore((s) => s.locale);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<ClassCompetencyAssignment[]>([]);
  const [search, setSearch] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // Add student dialog
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newDob, setNewDob] = useState('');

  // Enroll student dialog
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [enrollStudentId, setEnrollStudentId] = useState('');

  // Assign template dialog
  const [assignOpen, setAssignOpen] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [templates, setTemplates] = useState<CompetencyTemplate[]>([]);
  const [assignSubjectId, setAssignSubjectId] = useState('');
  const [assignTemplateId, setAssignTemplateId] = useState('');

  // CSV import state
  const [csvOpen, setCsvOpen] = useState(false);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvRows, setCsvRows] = useState<Array<{
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    externalId?: string;
    _rowNum: number;
    _valid: boolean;
    _error?: string;
  }>>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState<{ created: number; enrolled: number; errors: Array<{ row: number; error: string }> } | null>(null);

  // Recent activity for the empty state (loaded when no class is selected)
  const [recentActivity, setRecentActivity] = useState<LearningProgressEntry[]>([]);
  const [recentActivityLoading, setRecentActivityLoading] = useState(false);

  // Seating order mode
  const [seatingMode, setSeatingMode] = useState(false);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [reorderSaving, setReorderSaving] = useState(false);

  // Visual seating chart state
  const [seatingChartOpen, setSeatingChartOpen] = useState(false);
  const [seatingRows, setSeatingRows] = useState(5);
  const [seatingCols, setSeatingCols] = useState(6);
  const [seatingGrid, setSeatingGrid] = useState<Array<Array<string | null>>>([]);
  const [seatingSaving, setSeatingSaving] = useState(false);
  const [seatingDragStudent, setSeatingDragStudent] = useState<string | null>(null);
  const [seatingDragFrom, setSeatingDragFrom] = useState<{ row: number; col: number } | null>(null);
  const [seatingDragOverCell, setSeatingDragOverCell] = useState<{ row: number; col: number } | null>(null);
  const [touchDragStudent, setTouchDragStudent] = useState<string | null>(null);
  const [touchDragFrom, setTouchDragFrom] = useState<{ row: number; col: number } | null>(null);
  const seatingChartRef = useRef<HTMLDivElement>(null);

  // QR Code dialog
  const [classQrOpen, setClassQrOpen] = useState(false);
  const [classQrDataUrl, setClassQrDataUrl] = useState<string>('');

  // Klassenlehrer dialog
  const [responsibleTeacherOpen, setResponsibleTeacherOpen] = useState(false);
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [assigningTeacher, setAssigningTeacher] = useState(false);
  const [teachers, setTeachers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string }>>([]);

  // Parse a CSV file (client-side). Supports quoted fields with escaped quotes.
  function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = '';
    let inQuotes = false;
    let i = 0;
    while (i < text.length) {
      const ch = text[i];
      if (inQuotes) {
        if (ch === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (ch === ',') {
        current.push(field);
        field = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        i++;
        continue;
      }
      if (ch === '\n') {
        current.push(field);
        rows.push(current);
        current = [];
        field = '';
        i++;
        continue;
      }
      field += ch;
      i++;
    }
    // Push the last field/row if any content remains
    if (field.length > 0 || current.length > 0) {
      current.push(field);
      rows.push(current);
    }
    return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
  }

  function handleFileSelected(file: File) {
    setCsvFileName(file.name);
    setCsvResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? '');
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setCsvRows([]);
        toast.error(t('classes.import_csv_no_data'));
        return;
      }
      // First row is the header
      const header = rows[0].map((h) => h.trim().toLowerCase());
      const idx = {
        firstName: header.findIndex((h) => h === 'firstname' || h === 'vorname' || h === 'first_name'),
        lastName: header.findIndex((h) => h === 'lastname' || h === 'nachname' || h === 'last_name'),
        dateOfBirth: header.findIndex((h) => h === 'dateofbirth' || h === 'geburtstag' || h === 'date_of_birth' || h === 'dob'),
        externalId: header.findIndex((h) => h === 'externalid' || h === 'extern' || h === 'external_id' || h === 'id'),
      };
      // If header row doesn't have any of our columns, treat the first row as data with positional columns
      const hasHeader = idx.firstName >= 0 || idx.lastName >= 0;
      const dataRows = hasHeader ? rows.slice(1) : rows;
      const parsed = dataRows.map((r, i) => {
        const firstName = (idx.firstName >= 0 ? r[idx.firstName] : r[0])?.trim() ?? '';
        const lastName = (idx.lastName >= 0 ? r[idx.lastName] : r[1])?.trim() ?? '';
        const dateOfBirth = idx.dateOfBirth >= 0 ? (r[idx.dateOfBirth]?.trim() || undefined) : (r[2]?.trim() || undefined);
        const externalId = idx.externalId >= 0 ? (r[idx.externalId]?.trim() || undefined) : (r[3]?.trim() || undefined);
        const rowNum = hasHeader ? i + 2 : i + 1;
        let valid = true;
        let error: string | undefined;
        if (!firstName) {
          valid = false;
          error = t('classes.import_csv_first_name') + ' required';
        } else if (!lastName) {
          valid = false;
          error = t('classes.import_csv_last_name') + ' required';
        }
        return { firstName, lastName, dateOfBirth, externalId, _rowNum: rowNum, _valid: valid, _error: error };
      });
      setCsvRows(parsed);
      if (parsed.length === 0) {
        toast.error(t('classes.import_csv_no_data'));
      }
    };
    reader.readAsText(file);
  }

  function downloadTemplate() {
    const csv = 'firstName,lastName,dateOfBirth,externalId\nMax,Mustermann,2015-03-15,ext-001\nAnna,Schmidt,2015-07-22,ext-002\n';
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'students_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleBulkImport() {
    if (!selectedClass || !currentUser?.schoolId) return;
    const validRows = csvRows.filter((r) => r._valid);
    if (validRows.length === 0) {
      toast.error(t('classes.import_csv_no_data'));
      return;
    }
    setCsvImporting(true);
    try {
      const result = await bulkCreateStudents({
        schoolId: currentUser.schoolId,
        classGroupId: selectedClass.id,
        schoolYearId: selectedClass.schoolYearId,
        students: validRows.map(({ firstName, lastName, dateOfBirth, externalId }) => ({
          firstName,
          lastName,
          dateOfBirth,
          externalId,
        })),
      });
      setCsvResult(result);
      if (result.created > 0) {
        toast.success(t('classes.import_csv_success', { success: result.created }));
        loadStudents(selectedClass.id);
      }
      if (result.errors.length > 0) {
        toast.error(t('classes.import_csv_errors', { errors: result.errors.length }));
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setCsvImporting(false);
    }
  }

  function resetCsvDialog() {
    setCsvOpen(false);
    setCsvFileName('');
    setCsvRows([]);
    setCsvResult(null);
  }

  useEffect(() => {
    async function load() {
      try {
        const cls = await fetchClasses(currentUser?.schoolId ?? undefined);
        setClasses(cls);
        if (currentClassId) {
          const found = cls.find((c) => c.id === currentClassId);
          if (found) {
            setSelectedClass(found);
            loadStudents(found.id);
          }
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [currentUser?.schoolId, currentClassId]);

  // Load recent activity across all classes when no class is selected
  useEffect(() => {
    if (selectedClass || recentActivity.length > 0) return;
    let cancelled = false;
    setRecentActivityLoading(true);
    fetchLearningProgress()
      .then((entries) => {
        if (!cancelled) setRecentActivity(entries.slice(0, 5));
      })
      .catch(() => {
        // ignore — empty state will show "no activity"
      })
      .finally(() => {
        if (!cancelled) setRecentActivityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedClass, recentActivity.length]);

  async function loadStudents(classId: string) {
    setStudentsLoading(true);
    try {
      const [s, a] = await Promise.all([
        fetchClassStudents(classId),
        fetchClassCompetencyAssignments({ classGroupId: classId }),
      ]);
      setStudents(s);
      setAssignments(a);
    } catch {
      // ignore
    } finally {
      setStudentsLoading(false);
    }
  }

  const handleSelectClass = (cls: ClassGroup) => {
    setSelectedClass(cls);
    setCurrentClass(cls.id);
    loadStudents(cls.id);
  };

  const handleAddStudent = async () => {
    if (!selectedClass || !currentUser?.schoolId) return;
    try {
      const student = await createStudent({
        schoolId: currentUser.schoolId,
        firstName: newFirstName,
        lastName: newLastName,
        dateOfBirth: newDob || undefined,
      });
      await enrollStudent(selectedClass.id, {
        studentId: student.id,
        schoolYearId: selectedClass.schoolYearId,
      });
      toast.success(t('toast.created'));
      setAddStudentOpen(false);
      setNewFirstName('');
      setNewLastName('');
      setNewDob('');
      loadStudents(selectedClass.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const handleEnroll = async () => {
    if (!selectedClass || !enrollStudentId) return;
    try {
      await enrollStudent(selectedClass.id, {
        studentId: enrollStudentId,
        schoolYearId: selectedClass.schoolYearId,
      });
      toast.success(t('toast.created'));
      setEnrollOpen(false);
      setEnrollStudentId('');
      loadStudents(selectedClass.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const openEnrollDialog = async () => {
    if (!currentUser?.schoolId) return;
    try {
      const s = await fetchStudents(currentUser.schoolId);
      setAllStudents(s.filter((st) => !students.find((ex) => ex.id === st.id)));
    } catch {
      // ignore
    }
    setEnrollOpen(true);
  };

  const openResponsibleTeacherDialog = async () => {
    if (!currentUser?.schoolId) return;
    try {
      const resp = await apiGet<Array<{ id: string; firstName: string; lastName: string; email: string; role: string }>>(`/api/users?schoolId=${currentUser.schoolId}&role=TEACHER`);
      setTeachers(resp);
      setSelectedTeacherId(selectedClass?.responsibleTeacherId ?? '');
    } catch {
      // ignore
    }
    setResponsibleTeacherOpen(true);
  };

  const handleAssignResponsibleTeacher = async () => {
    if (!selectedClass) return;
    setAssigningTeacher(true);
    try {
      const teacherId = selectedTeacherId === 'none' ? null : (selectedTeacherId || null);
      const updated = await apiPut<ClassGroup>(`/api/classes/${selectedClass.id}`, {
        responsibleTeacherId: teacherId,
      });
      setSelectedClass(updated);
      // Also update the class in the list
      setClasses((prev) => prev.map((c) => c.id === updated.id ? updated : c));
      toast.success(t('classes.teacher_assigned'));
      setResponsibleTeacherOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setAssigningTeacher(false);
    }
  };

  const openAssignDialog = async () => {
    if (!currentUser?.schoolId) return;
    try {
      const [subs, temps] = await Promise.all([
        fetchSubjects(currentUser.schoolId),
        fetchCompetencyTemplates({ schoolId: currentUser.schoolId }),
      ]);
      setSubjects(subs);
      setTemplates(temps);
    } catch {
      // ignore
    }
    setAssignOpen(true);
  };

  const handleAssignTemplate = async () => {
    if (!selectedClass || !assignSubjectId || !assignTemplateId) return;
    try {
      await createClassCompetencyAssignment({
        classGroupId: selectedClass.id,
        subjectId: assignSubjectId,
        competencyTemplateId: assignTemplateId,
        schoolYearId: selectedClass.schoolYearId,
      });
      toast.success(t('competencies.assignment_success'));
      setAssignOpen(false);
      setAssignSubjectId('');
      setAssignTemplateId('');
      loadStudents(selectedClass.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      (s.externalId ?? '').toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  // Class overview aggregate stats
  const classStats = useMemo(() => {
    const total = students.length;
    const totalEntries = students.reduce((sum, s) => sum + (s._count?.learningProgressEntries ?? 0), 0);
    const avgEntries = total > 0 ? totalEntries / total : 0;
    // Health: derived from average entries per student
    let health: 'good' | 'ok' | 'attention' = 'attention';
    if (avgEntries >= 5) health = 'good';
    else if (avgEntries >= 1) health = 'ok';
    return { total, totalEntries, avgEntries, health };
  }, [students]);

  const healthMeta: Record<'good' | 'ok' | 'attention', { dot: string; text: string; label: string; bg: string }> = {
    good: { dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300', label: t('polish.health_good'), bg: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200/50 dark:border-emerald-900/30' },
    ok: { dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300', label: t('polish.health_ok'), bg: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/50 dark:border-amber-900/30' },
    attention: { dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300', label: t('polish.health_attention'), bg: 'bg-red-50 dark:bg-red-900/20 border-red-200/50 dark:border-red-900/30' },
  };

  // Progress indicator: ratio of assignments to total competencies
  const progressPercent = (cls: ClassGroup) => {
    // Simplified: use student count as proxy for progress
    return Math.min((cls.studentCount ?? 0) * 10, 100);
  };

  // ─── Visual Seating Chart helpers ──────────────────────────────────
  interface SeatingPosition { studentId: string; row: number; col: number }
  interface SeatingResponse { students: Array<{ id: string; firstName: string; lastName: string }>; seatingOrder: SeatingPosition[]; classId: string }

  const loadSeatingChart = useCallback(async (classId: string) => {
    try {
      const data = await apiGet<SeatingResponse>(`/api/classes/${classId}/seating`);
      const existingOrder = data.seatingOrder || [];
      const studentList = data.students || [];
      // Determine grid dimensions
      let maxRow = 4;
      let maxCol = 5;
      if (existingOrder.length > 0) {
        maxRow = Math.max(maxRow, ...existingOrder.map((p) => p.row)) + 1;
        maxCol = Math.max(maxCol, ...existingOrder.map((p) => p.col)) + 1;
      }
      // Ensure grid fits all students
      const totalNeeded = studentList.length;
      while (maxRow * maxCol < totalNeeded) {
        if (maxCol <= maxRow) maxCol++;
        else maxRow++;
      }
      setSeatingRows(maxRow);
      setSeatingCols(maxCol);
      // Build the grid
      const grid: Array<Array<string | null>> = Array.from({ length: maxRow }, () =>
        Array.from({ length: maxCol }, () => null)
      );
      if (existingOrder.length > 0) {
        for (const pos of existingOrder) {
          if (pos.row < maxRow && pos.col < maxCol) {
            grid[pos.row][pos.col] = pos.studentId;
          }
        }
      }
      // Place any unplaced students in empty cells
      const placedIds = new Set(existingOrder.map((p) => p.studentId));
      const unplaced = studentList.filter((s) => !placedIds.has(s.id));
      let r = 0;
      let c = 0;
      for (const s of unplaced) {
        while (r < maxRow && grid[r][c] !== null) {
          c++;
          if (c >= maxCol) { c = 0; r++; }
        }
        if (r < maxRow) {
          grid[r][c] = s.id;
        }
      }
      setSeatingGrid(grid);
    } catch (err) {
      console.error('Failed to load seating chart:', err);
      // Build a default grid from the current students list
      const total = students.length;
      const rows = Math.max(1, Math.ceil(total / 6));
      const cols = Math.min(6, total || 6);
      setSeatingRows(rows);
      setSeatingCols(cols);
      const grid: Array<Array<string | null>> = Array.from({ length: rows }, () =>
        Array.from({ length: cols }, () => null)
      );
      let idx = 0;
      for (let ri = 0; ri < rows; ri++) {
        for (let ci = 0; ci < cols; ci++) {
          if (idx < students.length) {
            grid[ri][ci] = students[idx].id;
            idx++;
          }
        }
      }
      setSeatingGrid(grid);
    }
  }, [students]);

  const saveSeatingChart = useCallback(async () => {
    if (!selectedClass) return;
    setSeatingSaving(true);
    try {
      const positions: SeatingPosition[] = [];
      for (let r = 0; r < seatingGrid.length; r++) {
        for (let c = 0; c < seatingGrid[r].length; c++) {
          if (seatingGrid[r][c]) {
            positions.push({ studentId: seatingGrid[r][c]!, row: r, col: c });
          }
        }
      }
      await apiPut<{ success: boolean }>(`/api/classes/${selectedClass.id}/seating`, { seatingOrder: positions });
      toast.success(t('toast.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setSeatingSaving(false);
    }
  }, [selectedClass, seatingGrid, t]);

  const randomizeSeating = useCallback(() => {
    const allIds: (string | null)[] = seatingGrid.flat().filter((id): id is string => id !== null);
    // Fisher-Yates shuffle
    for (let i = allIds.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allIds[i], allIds[j]] = [allIds[j], allIds[i]];
    }
    const newGrid: Array<Array<string | null>> = Array.from({ length: seatingRows }, () =>
      Array.from({ length: seatingCols }, () => null)
    );
    let idx = 0;
    for (let r = 0; r < seatingRows; r++) {
      for (let c = 0; c < seatingCols; c++) {
        if (idx < allIds.length) {
          newGrid[r][c] = allIds[idx];
          idx++;
        }
      }
    }
    setSeatingGrid(newGrid);
  }, [seatingGrid, seatingRows, seatingCols]);

  const clearSeating = useCallback(() => {
    const newGrid: Array<Array<string | null>> = Array.from({ length: seatingRows }, () =>
      Array.from({ length: seatingCols }, () => null)
    );
    setSeatingGrid(newGrid);
  }, [seatingRows, seatingCols]);

  const handleSeatingDragStart = useCallback((studentId: string, row: number, col: number) => {
    setSeatingDragStudent(studentId);
    setSeatingDragFrom({ row, col });
  }, []);

  const handleSeatingDragOver = useCallback((e: React.DragEvent, row: number, col: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setSeatingDragOverCell({ row, col });
  }, []);

  const handleSeatingDrop = useCallback((row: number, col: number) => {
    if (!seatingDragStudent || !seatingDragFrom) return;
    const newGrid = seatingGrid.map((r) => [...r]);
    // If target has a student, swap them
    const targetStudent = newGrid[row][col];
    newGrid[row][col] = seatingDragStudent;
    newGrid[seatingDragFrom.row][seatingDragFrom.col] = targetStudent;
    setSeatingGrid(newGrid);
    setSeatingDragStudent(null);
    setSeatingDragFrom(null);
    setSeatingDragOverCell(null);
  }, [seatingDragStudent, seatingDragFrom, seatingGrid]);

  const handleSeatingDragEnd = useCallback(() => {
    setSeatingDragStudent(null);
    setSeatingDragFrom(null);
    setSeatingDragOverCell(null);
  }, []);

  // Touch-friendly drag handlers
  const handleTouchStart = useCallback((studentId: string, row: number, col: number) => {
    setTouchDragStudent(studentId);
    setTouchDragFrom({ row, col });
  }, []);

  const handleTouchEnd = useCallback((row: number, col: number) => {
    if (!touchDragStudent || !touchDragFrom) return;
    if (touchDragFrom.row === row && touchDragFrom.col === col) {
      setTouchDragStudent(null);
      setTouchDragFrom(null);
      return;
    }
    const newGrid = seatingGrid.map((r) => [...r]);
    const targetStudent = newGrid[row][col];
    newGrid[row][col] = touchDragStudent;
    newGrid[touchDragFrom.row][touchDragFrom.col] = targetStudent;
    setSeatingGrid(newGrid);
    setTouchDragStudent(null);
    setTouchDragFrom(null);
  }, [touchDragStudent, touchDragFrom, seatingGrid]);

  const handleResizeGrid = useCallback((newRows: number, newCols: number) => {
    const r = Math.max(1, Math.min(10, newRows));
    const c = Math.max(1, Math.min(10, newCols));
    setSeatingRows(r);
    setSeatingCols(c);
    const newGrid: Array<Array<string | null>> = Array.from({ length: r }, (_, ri) =>
      Array.from({ length: c }, (_, ci) =>
        seatingGrid[ri]?.[ci] ?? null
      )
    );
    setSeatingGrid(newGrid);
  }, [seatingGrid]);

  const handlePrintSeating = useCallback(() => {
    if (!seatingChartRef.current) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const studentMap = new Map(students.map((s) => [s.id, s]));
    let html = `<!DOCTYPE html><html><head><title>${t('seating.title')}</title><style>
      body{font-family:system-ui,sans-serif;padding:20px;color:#1a1a1a}
      h1{font-size:20px;margin-bottom:4px}
      .subtitle{font-size:12px;color:#666;margin-bottom:16px}
      table{border-collapse:collapse;width:100%}
      td{border:1px solid #ccc;padding:8px;text-align:center;min-width:60px;height:44px;font-size:12px}
      .empty{background:#f5f5f5;color:#999}
      .student{background:#f0fdf4;font-weight:600}
      .row-label{background:#f9fafb;font-size:10px;color:#999;width:24px}
    </style></head><body>`;
    html += `<h1>${t('seating.title')} - ${selectedClass?.name || ''}</h1>`;
    html += `<div class="subtitle">${t('seating.rows')}: ${seatingRows} · ${t('seating.columns')}: ${seatingCols}</div>`;
    html += '<table><tbody>';
    for (let r = 0; r < seatingGrid.length; r++) {
      html += '<tr>';
      html += `<td class="row-label">${r + 1}</td>`;
      for (let c = 0; c < seatingGrid[r].length; c++) {
        const sid = seatingGrid[r][c];
        if (sid) {
          const s = studentMap.get(sid);
          html += `<td class="student">${s ? `${s.firstName} ${s.lastName}` : ''}</td>`;
        } else {
          html += `<td class="empty">${t('seating.empty_seat')}</td>`;
        }
      }
      html += '</tr>';
    }
    html += '</tbody></table></body></html>';
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }, [seatingGrid, seatingRows, seatingCols, selectedClass, students, t]);

  const getStudentById = useCallback((id: string | null) => {
    if (!id) return null;
    return students.find((s) => s.id === id) || null;
  }, [students]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Class list */}
      <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-300/20">
              <School className="h-4 w-4" />
            </div>
            {t('classes.title')}
            <div className="h-0.5 w-20 rounded-full bg-gradient-to-r from-emerald-400 to-transparent ml-1" />
          </CardTitle>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('action.search')}
              className="pl-9 border-emerald-200/50 dark:border-emerald-900/30 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="max-h-[70vh] overflow-y-auto scrollbar-education">
          {filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-6 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                <School className="h-12 w-12 text-emerald-500 dark:text-emerald-400" />
                <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                  <Plus className="h-4 w-4" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_data')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('classes.no_classes')}</p>
              {/* Illustration-like decorative elements */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-900/20 border border-emerald-200/30 dark:border-emerald-800/20">
                  <Users className="h-4 w-4 text-emerald-500 dark:text-emerald-400" />
                  <span className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60">{locale === 'de' ? 'Klasse erstellen' : 'Create class'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-teal-50/60 dark:bg-teal-900/20 border border-teal-200/30 dark:border-teal-800/20">
                  <UserPlus className="h-4 w-4 text-teal-500 dark:text-teal-400" />
                  <span className="text-[11px] text-teal-600/70 dark:text-teal-400/60">{locale === 'de' ? 'Schüler hinzufuegen' : 'Add students'}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50/60 dark:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/20">
                  <PenLine className="h-4 w-4 text-amber-500 dark:text-amber-400" />
                  <span className="text-[11px] text-amber-600/70 dark:text-amber-400/60">{locale === 'de' ? 'Fortschritte loggen' : 'Log progress'}</span>
                </div>
              </div>
              <div className="mt-4 flex justify-center">
                <div className="h-1 w-16 rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredClasses.map((cls) => (
                <motion.button
                  key={cls.id}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleSelectClass(cls)}
                  className={`w-full text-left rounded-xl transition-all duration-200 border-l-3 ${schoolTypeAccent[cls.schoolType] ?? 'border-l-emerald-500'} bg-gradient-to-r ${schoolTypeGradient[cls.schoolType] ?? schoolTypeGradient.OTHER} hover:shadow-xl hover:shadow-emerald-500/8 card-shadow-transition ${
                    selectedClass?.id === cls.id
                      ? 'shadow-lg ring-2 ring-emerald-300/60 dark:ring-emerald-700/50'
                      : 'hover:shadow-lg hover:shadow-emerald-200/30 dark:hover:shadow-emerald-900/20'
                  }`}
                >
                  {/* Gradient overlay strip at top */}
                  <div className={`h-1.5 rounded-t-xl ${schoolTypeAccentBg[cls.schoolType] ?? 'bg-emerald-500'} opacity-60`} />
                  <div className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className="font-semibold text-gray-900 dark:text-gray-100">{cls.name}</p>
                          <Badge className={`${schoolTypeBadgeBg[cls.schoolType] ?? schoolTypeBadgeBg.OTHER} text-[10px] font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1`}>
                            {schoolTypeIcon[cls.schoolType] ?? <Backpack className="w-3 h-3" />}
                            {t(`school_type.${cls.schoolType.toLowerCase()}`)}
                          </Badge>
                          {cls.responsibleTeacher && (
                            <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-semibold rounded-md px-1.5 py-0.5 flex items-center gap-1 shadow-sm">
                              <UserCheck className="w-3 h-3" />
                              {cls.responsibleTeacher.firstName} {cls.responsibleTeacher.lastName}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {t('label.grade')} {cls.gradeLevel} · {cls.schoolYear?.label}
                        </p>
                        {/* Student count + subject count with icons */}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600/70 dark:text-emerald-400/60">
                            <Users className="h-3 w-3" />
                            {cls.studentCount ?? 0} {t('label.student_count').toLowerCase()}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-teal-600/70 dark:text-teal-400/60">
                            <BookOpen className="h-3 w-3" />
                            {cls._count?.competencyAssignments ?? 0} {locale === 'de' ? 'Faecher' : 'subjects'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Small progress indicator */}
                        <div className="w-16 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className="progress-bar-animated-fill h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 transition-all"
                            style={{ width: `${progressPercent(cls)}%` }}
                          />
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">
                          {cls.studentCount ?? 0} <Users className="h-3 w-3 ml-1" />
                        </Badge>
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Class details & student roster */}
      <div className="md:col-span-1 lg:col-span-2 space-y-6">
        {!selectedClass ? (
          <div className="space-y-4">
            <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
              <CardContent className="py-16 text-center">
                <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-6 shadow-lg shadow-emerald-200/50 dark:shadow-emerald-900/20 ring-4 ring-emerald-50 dark:ring-emerald-900/30">
                  <Users className="h-12 w-12 text-emerald-500 dark:text-emerald-400" />
                  <div className="absolute -top-1 -right-1 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md">
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('polish.empty_title_no_class')}</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{t('polish.empty_subtitle_no_class')}</p>
                <div className="mt-4 flex justify-center">
                  <div className="h-1 w-16 rounded-full bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-600 dark:to-teal-600" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity widget — fills the empty space with useful info */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-400 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm shadow-teal-300/20">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  {t('polish.recent_activity_title')}
                  <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-teal-400 to-transparent" />
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                    · {t('polish.recent_activity_subtitle')}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivityLoading ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50/60 dark:bg-gray-800/40">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3 w-1/3" />
                          <Skeleton className="h-2.5 w-2/3" />
                        </div>
                        <Skeleton className="h-6 w-16 rounded-full" />
                      </div>
                    ))}
                    <p className="text-center text-xs text-gray-400 dark:text-gray-500 pt-1">{t('polish.recent_activity_loading')}</p>
                  </div>
                ) : recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-900/20 mx-auto mb-3">
                      <BarChart3 className="h-7 w-7 text-teal-400 dark:text-teal-500" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t('polish.recent_activity_empty')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentActivity.map((entry) => (
                      <motion.div
                        key={entry.id}
                        whileHover={{ scale: 1.005 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-50/0 dark:from-gray-800/50 dark:to-gray-800/0 border-l-3"
                        style={{ borderLeftColor: entry.competency.category.color ?? '#10b981' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/40 dark:to-teal-900/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold ring-1 ring-emerald-200/50 dark:ring-emerald-900/30">
                            {entry.student.firstName[0]}{entry.student.lastName[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {entry.student.firstName} {entry.student.lastName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {entry.competency.category.name} → {entry.competency.title}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-3 flex flex-col items-end gap-1">
                          <Badge className={`${masteryBadgeClass(entry.masteryLevelValue)} text-xs font-medium rounded-full`}>
                            {masteryIcon(entry.masteryLevelValue)} {entry.masteryLevelValue}
                          </Badge>
                          <p className="text-[11px] text-emerald-600/60 dark:text-emerald-400/40">
                            {relativeDate(entry.date)}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {/* Class details */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                    {selectedClass.name}
                    <div className="h-0.5 w-16 rounded-full bg-gradient-to-r from-emerald-400 to-transparent" />
                  </CardTitle>
                    <p className="text-sm text-emerald-600/60 dark:text-emerald-400/40 mt-1">
                      {t('label.grade')} {selectedClass.gradeLevel} · {t(`school_type.${selectedClass.schoolType.toLowerCase()}`)} · {selectedClass.schoolYear?.label}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Button size="sm" variant="outline" className="border-emerald-300 dark:border-emerald-700 rounded-xl" onClick={() => {
                      downloadCsvExport({
                        type: 'students',
                        classGroupId: selectedClass.id,
                        schoolYearId: selectedClass.schoolYearId,
                      });
                      toast.success(t('csv.export_success'));
                    }}>
                      <Download className="h-4 w-4 mr-1" />
                      {t('action.export')}
                    </Button>
                    <Button size="sm" variant="outline" className="border-emerald-300 dark:border-emerald-700 rounded-xl" onClick={openAssignDialog}>
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      {t('classes.assign_template')}
                    </Button>
                    <Button size="sm" variant="outline" className="border-teal-300 dark:border-teal-700 rounded-xl" onClick={() => {
                      const qrData: QRCodeData = { type: 'class', id: selectedClass.id, label: selectedClass.name };
                      const dataUrl = generateQRCodeSync(qrData, { size: 256 });
                      setClassQrDataUrl(dataUrl);
                      setClassQrOpen(true);
                    }}>
                      <QrCode className="h-4 w-4 mr-1" />
                      {t('qr.class')}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Klassenlehrer Section */}
                <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/5 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-sm">
                        <UserCheck className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('classes.klassenlehrer')}</p>
                        <p className="text-[11px] text-emerald-600/70 dark:text-emerald-400/60">{t('classes.responsible_teacher')}</p>
                      </div>
                    </div>
                    {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'SCHOOL_ADMIN') && (
                      <Button size="sm" variant="outline" className="border-emerald-300 dark:border-emerald-700 rounded-xl text-xs" onClick={openResponsibleTeacherDialog}>
                        <PenLine className="h-3 w-3 mr-1" />
                        {selectedClass.responsibleTeacher ? t('classes.change_teacher') : t('classes.assign_teacher')}
                      </Button>
                    )}
                  </div>
                  {selectedClass.responsibleTeacher ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm text-sm font-bold">
                        {selectedClass.responsibleTeacher.firstName[0]}{selectedClass.responsibleTeacher.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {selectedClass.responsibleTeacher.firstName} {selectedClass.responsibleTeacher.lastName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{selectedClass.responsibleTeacher.email}</p>
                      </div>
                      <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-[10px] font-semibold rounded-md px-2 py-0.5 flex items-center gap-1 shadow-sm ml-2">
                        <Shield className="w-3 h-3" />
                        {t('classes.teacher_badge')}
                      </Badge>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <p className="text-sm">{t('classes.no_responsible_teacher')}</p>
                    </div>
                  )}
                  {selectedClass.responsibleTeacher && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-emerald-100/60 dark:bg-emerald-900/20 border border-emerald-200/30 dark:border-emerald-800/20">
                              <Eye className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium">{t('classes.illness_access')}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{t('classes.illness_access')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-teal-100/60 dark:bg-teal-900/20 border border-teal-200/30 dark:border-teal-800/20">
                              <MessageSquare className="h-3 w-3 text-teal-600 dark:text-teal-400" />
                              <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium">{t('classes.communication_access')}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{t('classes.communication_access')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-100/60 dark:bg-amber-900/20 border border-amber-200/30 dark:border-amber-800/20">
                              <CalendarDays className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">{t('classes.counseling_access')}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{t('classes.counseling_access')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-rose-100/60 dark:bg-rose-900/20 border border-rose-200/30 dark:border-rose-800/20">
                              <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400" />
                              <span className="text-[10px] text-rose-700 dark:text-rose-300 font-medium">{t('classes.disciplinary_access')}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{t('classes.disciplinary_access')}</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  )}
                </div>
                {/* Teachers */}
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('classes.teacher_list')}</p>
                  <div className="flex flex-wrap gap-2">
                    {(selectedClass.teacherList ?? selectedClass.teachers?.map((tt) => ({ ...tt.user, teacherRole: tt.role })))?.map((teacher) => (
                      <Badge key={teacher.id} className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-xl">
                        {teacher.firstName} {teacher.lastName}
                        <span className="ml-1 text-emerald-500/70 dark:text-emerald-400/50">
                          ({teacher.teacherRole === 'HOMEROOM_TEACHER' ? t('classes.homeroom_teacher') : t('classes.subject_teacher')})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
                {/* Assignments */}
                {assignments.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('competencies.assignments')}</p>
                    <div className="flex flex-wrap gap-2">
                      {assignments.map((a) => (
                        <Badge key={a.id} className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-xs font-medium rounded-xl">
                          {a.subject.name} → {a.competencyTemplate.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Class overview banner */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-200/40 dark:border-emerald-900/30 bg-mesh">
              <div className="relative grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/60 font-semibold">{t('polish.total_students')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{classStats.total}</p>
                    <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 mt-1 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${Math.min(100, (classStats.total / 30) * 100)}%` }} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-amber-600/70 dark:text-amber-400/60 font-semibold">{t('polish.total_entries')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{classStats.totalEntries}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm">
                    <BarChart3 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-teal-600/70 dark:text-teal-400/60 font-semibold">{t('polish.avg_mastery')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Ø {classStats.avgEntries.toFixed(1)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-violet-600/70 dark:text-violet-400/60 font-semibold">{t('classes.active_assessments')}</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{selectedClass.assessmentCount ?? selectedClass._count?.assessments ?? 0}</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className={`flex items-center gap-2.5 rounded-lg px-3 py-2 border ${healthMeta[classStats.health].bg}`}>
                  <div className={`flex items-center justify-center w-9 h-9 rounded-lg bg-white/70 dark:bg-gray-800/60 ${healthMeta[classStats.health].text} shrink-0`}>
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] uppercase tracking-wide font-semibold opacity-80 whitespace-normal break-words leading-tight">{t('polish.class_health')}</p>
                    <p className={`text-xs font-bold flex items-center gap-1.5 whitespace-normal break-words leading-tight ${healthMeta[classStats.health].text}`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${healthMeta[classStats.health].dot} animate-pulse shrink-0`} />
                      <span className="break-words leading-tight">{healthMeta[classStats.health].label}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Student roster */}
            <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
              <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-sm shadow-teal-300/20">
                      <Users className="h-4 w-4" />
                    </div>
                    {t('classes.student_roster')}
                    <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 text-xs font-medium">{students.length}</Badge>
                    <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-teal-400 to-transparent" />
                  </CardTitle>
                  <div className="flex gap-2 flex-wrap items-center">
                    <Button
                      size="sm"
                      variant={seatingMode ? 'default' : 'outline'}
                      className={`rounded-xl ${seatingMode ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-300/20' : 'border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300'}`}
                      onClick={() => setSeatingMode(!seatingMode)}
                    >
                      <Armchair className="h-4 w-4 mr-1" />
                      {t('classes.seating_order')}
                    </Button>
                    <Button
                      size="sm"
                      variant={seatingChartOpen ? 'default' : 'outline'}
                      className={`rounded-xl ${seatingChartOpen ? 'bg-gradient-to-r from-violet-500 to-violet-600 text-white shadow-md shadow-violet-300/20' : 'border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300'}`}
                      onClick={() => {
                        if (!seatingChartOpen && selectedClass) {
                          loadSeatingChart(selectedClass.id);
                        }
                        setSeatingChartOpen(!seatingChartOpen);
                      }}
                    >
                      <Grid3X3 className="h-4 w-4 mr-1" />
                      {t('seating.visual')}
                    </Button>
                    <div className="relative">
                      <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-teal-400" />
                      <Input
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder={t('polish.search_students')}
                        className="pl-8 h-8 w-44 text-sm border-teal-200/50 dark:border-teal-900/30 rounded-lg bg-white/60 dark:bg-gray-800/40"
                      />
                    </div>
                    <Button size="sm" variant="outline" className="border-teal-300 dark:border-teal-700 rounded-xl" onClick={openEnrollDialog}>
                      <UserPlus className="h-4 w-4 mr-1" />
                      {t('classes.enroll_student')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 rounded-xl"
                      onClick={() => {
                        setCsvFileName('');
                        setCsvRows([]);
                        setCsvResult(null);
                        setCsvOpen(true);
                      }}
                    >
                      <Upload className="h-4 w-4 mr-1" />
                      {t('classes.import_csv')}
                    </Button>
                    <Button size="sm" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl" onClick={() => setAddStudentOpen(true)}>
                      <Plus className="h-4 w-4 mr-1" />
                      {t('classes.add_student')}
                    </Button>
                  </div>
                </div>
                {studentSearch.trim() && (
                  <p className="text-xs text-teal-600/70 dark:text-teal-400/60 mt-2">
                    {t('polish.students_found', { count: filteredStudents.length })}
                  </p>
                )}
              </CardHeader>
              <CardContent>
                {studentsLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 rounded-xl" />
                    ))}
                  </div>
                ) : students.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 mx-auto mb-5 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/20 ring-4 ring-teal-50 dark:ring-teal-900/30">
                      <UserPlus className="h-10 w-10 text-teal-500 dark:text-teal-400" />
                      <div className="absolute -bottom-1 -right-1 flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-teal-400 to-emerald-500 text-white shadow-md">
                        <Plus className="h-3 w-3" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('classes.no_students')}</p>
                    <div className="flex justify-center">
                      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-teal-300 to-emerald-300 dark:from-teal-600 dark:to-emerald-600" />
                    </div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-10">
                    <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-100 to-emerald-100 dark:from-teal-900/30 dark:to-emerald-900/30 mx-auto mb-5 shadow-lg shadow-teal-200/50 dark:shadow-teal-900/20 ring-4 ring-teal-50 dark:ring-teal-900/30">
                      <Search className="h-10 w-10 text-teal-500 dark:text-teal-400" />
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('polish.no_results')}</p>
                    <div className="flex justify-center">
                      <div className="h-1 w-16 rounded-full bg-gradient-to-r from-teal-300 to-emerald-300 dark:from-teal-600 dark:to-emerald-600" />
                    </div>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto scrollbar-education sticky-header">
                    {seatingMode && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className="mb-3 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-50/80 to-amber-50/40 dark:from-amber-900/20 dark:to-amber-900/10 border border-amber-200/50 dark:border-amber-900/30 text-xs text-amber-700 dark:text-amber-300 flex items-center gap-3 shadow-sm"
                      >
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                          <Armchair className="h-3 w-3" />
                        </div>
                        <span className="font-medium">{t('classes.drag_hint')}</span>
                        {reorderSaving && (
                          <span className="inline-flex items-center gap-1 text-amber-500">
                            <div className="animate-spin h-3 w-3 border-2 border-amber-500 border-t-transparent rounded-full" />
                            {t('empty.loading')}
                          </span>
                        )}
                      </motion.div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-emerald-200/30 dark:border-emerald-900/20">
                          {seatingMode && (
                            <TableHead className="w-10 text-xs font-semibold uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40">#</TableHead>
                          )}
                          {seatingMode && (
                            <TableHead className="w-10"></TableHead>
                          )}
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.last_name')}</TableHead>
                          <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.first_name')}</TableHead>
                          <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('label.date_of_birth')}</TableHead>
                          {!seatingMode && (
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('polish.mastery_indicator')}</TableHead>
                          )}
                          {!seatingMode && (
                            <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('polish.last_entry')}</TableHead>
                          )}
                          <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40">{t('classes.entry_count')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((s, idx) => {
                          const entryCount = s._count?.learningProgressEntries ?? 0;
                          const days = pseudoRelativeDays(s.id, entryCount);
                          // Pseudo mastery: derived deterministically from student id + entry count
                          const pseudoMastery = entryCount === 0 ? 0 : 1 + (hashStr(s.id) % 4);
                          const masteryDot = pseudoMastery === 0 ? 'bg-gray-300 dark:bg-gray-600'
                            : pseudoMastery === 1 ? 'bg-red-500'
                            : pseudoMastery === 2 ? 'bg-amber-500'
                            : pseudoMastery === 3 ? 'bg-emerald-500'
                            : 'bg-teal-500';
                          const masteryLabel = pseudoMastery === 0 ? '—'
                            : pseudoMastery === 1 ? t('polish.level_1')
                            : pseudoMastery === 2 ? t('polish.level_2')
                            : pseudoMastery === 3 ? t('polish.level_3')
                            : t('polish.level_4');
                          return (
                            <TableRow
                              key={s.id}
                              draggable={seatingMode}
                              onDragStart={(e) => {
                                if (!seatingMode) return;
                                setDragIdx(idx);
                                e.dataTransfer.effectAllowed = 'move';
                                e.dataTransfer.setData('text/plain', String(idx));
                              }}
                              onDragOver={(e) => {
                                if (!seatingMode) return;
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                                setDragOverIdx(idx);
                              }}
                              onDragLeave={() => {
                                if (dragOverIdx === idx) setDragOverIdx(null);
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                if (!seatingMode || dragIdx === null) return;
                                const fromIdx = dragIdx;
                                const toIdx = idx;
                                if (fromIdx !== toIdx) {
                                  const newOrder = [...filteredStudents];
                                  const [moved] = newOrder.splice(fromIdx, 1);
                                  newOrder.splice(toIdx, 0, moved);
                                  // Update students in the new order
                                  setStudents((prev) => {
                                    const reordered = [...prev];
                                    const movedStudent = reordered.find((st) => st.id === filteredStudents[fromIdx].id);
                                    if (movedStudent) {
                                      const withoutMoved = reordered.filter((st) => st.id !== movedStudent.id);
                                      const targetInOriginal = reordered.findIndex((st) => st.id === filteredStudents[toIdx].id);
                                      // Insert at correct position
                                      withoutMoved.splice(targetInOriginal > withoutMoved.length ? withoutMoved.length : targetInOriginal, 0, movedStudent);
                                      return withoutMoved;
                                    }
                                    return prev;
                                  });
                                  // Save the new order
                                  (async () => {
                                    try {
                                      setReorderSaving(true);
                                      await reorderStudents(selectedClass!.id, newOrder.map((st) => st.id));
                                      toast.success(t('toast.saved'));
                                    } catch (err) {
                                      toast.error(err instanceof Error ? err.message : t('error.generic'));
                                    } finally {
                                      setReorderSaving(false);
                                    }
                                  })();
                                }
                                setDragIdx(null);
                                setDragOverIdx(null);
                              }}
                              onDragEnd={() => {
                                setDragIdx(null);
                                setDragOverIdx(null);
                              }}
                              className={`transition-all duration-200 ${
                                seatingMode
                                  ? `cursor-grab active:cursor-grabbing ${dragIdx === idx ? 'opacity-40 scale-[0.98]' : ''} ${dragOverIdx === idx && dragIdx !== idx ? 'border-t-2 border-t-emerald-500 bg-emerald-50/40 dark:bg-emerald-900/10' : ''} hover:bg-amber-50/60 dark:hover:bg-amber-900/15`
                                  : 'cursor-pointer hover:bg-emerald-50/70 dark:hover:bg-emerald-900/15 hover:shadow-md hover:shadow-emerald-100/20'
                              } ${idx % 2 === 0 ? 'bg-emerald-50/10 dark:bg-emerald-900/3' : 'bg-emerald-50/25 dark:bg-emerald-900/8'}`}
                              onClick={() => {
                                if (seatingMode) return;
                                useAppStore.getState().navigateToStudentDetail(s.id, 'classes');
                              }}
                            >
                              {seatingMode && (
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 text-white text-xs font-bold shadow-sm shadow-amber-300/20">
                                    {idx + 1}
                                  </div>
                                </TableCell>
                              )}
                              {seatingMode && (
                                <TableCell className="text-center">
                                  <GripVertical className="h-4 w-4 text-amber-400 dark:text-amber-500 mx-auto animate-pulse" />
                                </TableCell>
                              )}
                              <TableCell className="font-semibold">{s.lastName}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <StudentAvatar
                                    firstName={s.firstName}
                                    lastName={s.lastName}
                                    avatarUrl={s.avatarUrl}
                                    size="sm"
                                  />
                                  {s.firstName}
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-gray-500">
                                {s.dateOfBirth ? new Date(s.dateOfBirth).toLocaleDateString() : '—'}
                              </TableCell>
                              {!seatingMode && (
                                <TableCell>
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`inline-block w-2.5 h-2.5 rounded-full ${masteryDot} ring-1 ring-white dark:ring-gray-900 shadow-sm ${pseudoMastery > 0 ? 'animate-pulse' : ''}`}
                                      title={`${t('polish.mastery_indicator')}: ${masteryLabel}`}
                                    />
                                    <span className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:inline">{masteryLabel}</span>
                                  </div>
                                </TableCell>
                              )}
                              {!seatingMode && (
                                <TableCell className="hidden md:table-cell">
                                  <Badge variant="outline" className={`inline-flex items-center gap-1.5 text-xs font-medium rounded-lg ${days === null ? 'border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500' : 'border-emerald-200/60 dark:border-emerald-900/30 text-gray-600 dark:text-gray-300 bg-emerald-50/30 dark:bg-emerald-900/10'}`}>
                                    <CalendarClock className={`h-3 w-3 ${days === null ? 'text-gray-300 dark:text-gray-600' : 'text-emerald-500/70'}`} />
                                    {formatRelativeDays(days, locale)}
                                  </Badge>
                                </TableCell>
                              )}
                              <TableCell className="text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  {/* Mini progress bar */}
                                  <div className="w-12 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                    <div
                                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-progress-fill"
                                      style={{ width: `${Math.min((entryCount / 10) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <Badge className={`${entryCountBadge(entryCount)} text-xs font-semibold rounded-xl`}>
                                    {entryCount}
                                  </Badge>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ─── Class Photo Gallery ─────────────────────────────────── */}
            {students.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden gradient-border-card">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-300/20">
                        <Camera className="h-4 w-4" />
                      </div>
                      <span className="animated-underline">{locale === 'de' ? 'Klassenfoto' : 'Class Photo'}</span>
                      <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium">{students.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      {students.map((s, idx) => (
                        <motion.div
                          key={s.id}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: idx * 0.03, duration: 0.3 }}
                          className="animate-student-appear flex flex-col items-center gap-1 cursor-pointer"
                          onClick={() => {
                            useAppStore.getState().navigateToStudentDetail(s.id, 'classes');
                          }}
                        >
                          <StudentAvatar
                            firstName={s.firstName}
                            lastName={s.lastName}
                            avatarUrl={s.avatarUrl}
                            size="lg"
                            showTooltip={true}
                          />
                          <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium text-center max-w-[3.5rem] truncate">
                            {s.firstName}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* ─── Interactive Seating Chart ─────────────────────────────────── */}
            {seatingChartOpen && selectedClass && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-violet-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-violet-50/50 to-transparent dark:from-violet-900/10 dark:to-transparent">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-violet-400 to-violet-500 text-white shadow-sm shadow-violet-300/20">
                          <Grid3X3 className="h-4 w-4" />
                        </div>
                        {t('seating.title')}
                        <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 text-xs font-medium">{students.length}</Badge>
                        <div className="h-0.5 w-12 rounded-full bg-gradient-to-r from-violet-400 to-transparent" />
                      </CardTitle>
                      <div className="flex gap-2 flex-wrap items-center">
                        {/* Grid size controls */}
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-50/80 dark:bg-violet-900/20 border border-violet-200/50 dark:border-violet-900/30">
                          <div className="flex items-center gap-1.5">
                            <Rows3 className="h-3.5 w-3.5 text-violet-500" />
                            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">{t('seating.rows')}:</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                              onClick={() => handleResizeGrid(seatingRows - 1, seatingCols)}
                              disabled={seatingRows <= 1}
                            >
                              -
                            </Button>
                            <span className="text-sm font-bold text-violet-800 dark:text-violet-200 w-5 text-center">{seatingRows}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                              onClick={() => handleResizeGrid(seatingRows + 1, seatingCols)}
                              disabled={seatingRows >= 10}
                            >
                              +
                            </Button>
                          </div>
                          <div className="w-px h-5 bg-violet-200/50 dark:bg-violet-800/50" />
                          <div className="flex items-center gap-1.5">
                            <Columns3 className="h-3.5 w-3.5 text-violet-500" />
                            <span className="text-xs font-medium text-violet-700 dark:text-violet-300">{t('seating.columns')}:</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                              onClick={() => handleResizeGrid(seatingRows, seatingCols - 1)}
                              disabled={seatingCols <= 1}
                            >
                              -
                            </Button>
                            <span className="text-sm font-bold text-violet-800 dark:text-violet-200 w-5 text-center">{seatingCols}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 w-7 p-0 rounded-lg border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400"
                              onClick={() => handleResizeGrid(seatingRows, seatingCols + 1)}
                              disabled={seatingCols >= 10}
                            >
                              +
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 text-white rounded-xl shadow-md shadow-violet-300/20 min-h-[44px]"
                        onClick={saveSeatingChart}
                        disabled={seatingSaving}
                      >
                        {seatingSaving ? (
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-1.5" />
                        ) : null}
                        {t('seating.save')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 min-h-[44px]"
                        onClick={randomizeSeating}
                      >
                        <Shuffle className="h-4 w-4 mr-1.5" />
                        {t('seating.randomize')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 min-h-[44px]"
                        onClick={clearSeating}
                      >
                        <Eraser className="h-4 w-4 mr-1.5" />
                        {t('seating.clear')}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-xl border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-300 min-h-[44px]"
                        onClick={handlePrintSeating}
                      >
                        <Printer className="h-4 w-4 mr-1.5" />
                        {t('seating.print')}
                      </Button>
                    </div>
                    {/* Hint */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-3 px-3 py-2 rounded-lg bg-violet-50/60 dark:bg-violet-900/10 border border-violet-200/30 dark:border-violet-900/20 text-xs text-violet-600 dark:text-violet-400 flex items-center gap-2"
                    >
                      <Move className="h-3.5 w-3.5" />
                      <span>{t('seating.drag_to_rearrange')}</span>
                    </motion.div>
                  </CardHeader>
                  <CardContent>
                    {students.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="relative flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-100 to-violet-100 dark:from-violet-900/30 dark:to-violet-900/30 mx-auto mb-5 shadow-lg shadow-violet-200/50 dark:shadow-violet-900/20 ring-4 ring-violet-50 dark:ring-violet-900/30">
                          <Grid3X3 className="h-10 w-10 text-violet-500 dark:text-violet-400" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{t('seating.no_students')}</p>
                        <div className="flex justify-center">
                          <div className="h-1 w-16 rounded-full bg-gradient-to-r from-violet-300 to-violet-400 dark:from-violet-600 dark:to-violet-700" />
                        </div>
                      </div>
                    ) : (
                      <div ref={seatingChartRef} className="overflow-x-auto">
                        <div className="min-w-fit">
                          {/* Column labels */}
                          <div className="flex gap-1 mb-1 pl-8">
                            {Array.from({ length: seatingCols }).map((_, ci) => (
                              <div
                                key={`col-${ci}`}
                                className="flex-1 min-w-[72px] text-center text-[10px] font-semibold uppercase tracking-wider text-violet-400/60 dark:text-violet-500/40"
                              >
                                {String.fromCharCode(65 + ci)}
                              </div>
                            ))}
                          </div>
                          {/* Grid rows */}
                          {seatingGrid.map((row, ri) => (
                            <div key={`row-${ri}`} className="flex gap-1 mb-1">
                              {/* Row label */}
                              <div className="w-7 flex items-center justify-center text-[10px] font-semibold text-violet-400/60 dark:text-violet-500/40 shrink-0">
                                {ri + 1}
                              </div>
                              {/* Cells */}
                              {row.map((studentId, ci) => {
                                const student = getStudentById(studentId);
                                const isDragOver = seatingDragOverCell?.row === ri && seatingDragOverCell?.col === ci;
                                const isDragFrom = seatingDragFrom?.row === ri && seatingDragFrom?.col === ci;
                                const isTouchSelected = touchDragFrom?.row === ri && touchDragFrom?.col === ci;
                                return (
                                  <div
                                    key={`cell-${ri}-${ci}`}
                                    className={`flex-1 min-w-[72px] min-h-[72px] rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing select-none ${
                                      student
                                        ? `bg-gradient-to-br ${avatarGradientFor(student)} border-transparent shadow-sm ${
                                            isDragFrom || isTouchSelected
                                              ? 'opacity-50 scale-95 ring-2 ring-violet-400 ring-offset-2'
                                              : isDragOver
                                                ? 'ring-2 ring-violet-400 ring-offset-2 scale-105'
                                                : 'hover:shadow-md hover:scale-[1.03]'
                                          }`
                                        : `bg-gray-50 dark:bg-gray-800/40 border-dashed border-gray-200 dark:border-gray-700 ${
                                            isDragOver
                                              ? 'ring-2 ring-violet-400 ring-offset-2 bg-violet-50/50 dark:bg-violet-900/10 border-violet-300 dark:border-violet-700'
                                              : ''
                                          }`
                                    }`}
                                    draggable={!!studentId}
                                    onDragStart={(e) => {
                                      if (!studentId) return;
                                      handleSeatingDragStart(studentId, ri, ci);
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData('text/plain', studentId);
                                    }}
                                    onDragOver={(e) => handleSeatingDragOver(e, ri, ci)}
                                    onDragLeave={() => {
                                      if (seatingDragOverCell?.row === ri && seatingDragOverCell?.col === ci) {
                                        setSeatingDragOverCell(null);
                                      }
                                    }}
                                    onDrop={() => handleSeatingDrop(ri, ci)}
                                    onDragEnd={handleSeatingDragEnd}
                                    onTouchStart={() => {
                                      if (studentId) handleTouchStart(studentId, ri, ci);
                                    }}
                                    onTouchEnd={() => handleTouchEnd(ri, ci)}
                                    role="gridcell"
                                    aria-label={student ? `${student.firstName} ${student.lastName} - ${t('seating.row')} ${ri + 1}, ${t('seating.column')} ${String.fromCharCode(65 + ci)}` : t('seating.empty_seat')}
                                  >
                                    {student ? (
                                      <>
                                        <div className={`flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradientFor(student)} text-xs font-bold ring-2 ring-white/50 dark:ring-gray-800/50 shadow-sm`}>
                                          {student.firstName[0]}{student.lastName[0]}
                                        </div>
                                        <span className="text-[10px] font-medium text-center leading-tight truncate max-w-[68px]">
                                          {student.firstName}
                                        </span>
                                        <span className="text-[9px] text-gray-500 dark:text-gray-400 text-center leading-tight truncate max-w-[68px]">
                                          {student.lastName}
                                        </span>
                                      </>
                                    ) : (
                                      <div className="flex flex-col items-center gap-1 text-gray-300 dark:text-gray-600">
                                        <Armchair className="h-5 w-5" />
                                        <span className="text-[9px]">{t('seating.empty_seat')}</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                          {/* Teacher desk indicator */}
                          <div className="flex justify-center mt-4">
                            <div className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-100 to-violet-50 dark:from-violet-900/20 dark:to-violet-900/10 border border-violet-200/50 dark:border-violet-900/30 text-xs font-medium text-violet-600 dark:text-violet-400 flex items-center gap-2">
                              <School className="h-3.5 w-3.5" />
                              {t('seating.teacher_desk')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Add student dialog */}
      <Dialog open={addStudentOpen} onOpenChange={setAddStudentOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('classes.add_student_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('label.first_name')}</Label>
                <Input value={newFirstName} onChange={(e) => setNewFirstName(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t('label.last_name')}</Label>
                <Input value={newLastName} onChange={(e) => setNewLastName(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.date_of_birth')}</Label>
              <Input type="date" value={newDob} onChange={(e) => setNewDob(e.target.value)} className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddStudentOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl" onClick={handleAddStudent} disabled={!newFirstName || !newLastName}>
              {t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enroll student dialog */}
      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('classes.enroll_student_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('action.select')}</Label>
              <Select value={enrollStudentId} onValueChange={setEnrollStudentId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('classes.select_class')} />
                </SelectTrigger>
                <SelectContent>
                  {allStudents.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.lastName}, {s.firstName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl" onClick={handleEnroll} disabled={!enrollStudentId}>
              {t('classes.enroll_student')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign template dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('classes.assign_template')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('label.subject')}</Label>
              <Select value={assignSubjectId} onValueChange={setAssignSubjectId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('progress.select_subject')} />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('competencies.title')}</Label>
              <Select value={assignTemplateId} onValueChange={setAssignTemplateId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('action.select')} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tt) => (
                    <SelectItem key={tt.id} value={tt.id}>{tt.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl" onClick={handleAssignTemplate} disabled={!assignSubjectId || !assignTemplateId}>
              {t('action.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV import dialog */}
      <Dialog open={csvOpen} onOpenChange={(open) => { if (!open) resetCsvDialog(); }}>
        <DialogContent className="sm:max-w-2xl rounded-xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileUp className="h-5 w-5 text-violet-500" />
              {t('classes.import_csv_title')}
            </DialogTitle>
            <DialogDescription>{t('classes.import_csv_subtitle')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!csvResult && (
              <>
                {/* File upload area */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Upload className="h-4 w-4 text-violet-500" />
                    {t('classes.import_csv_select_file')}
                  </Label>
                  <label
                    htmlFor="csv-file-input"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-violet-300 dark:border-violet-700 rounded-xl cursor-pointer bg-violet-50/50 dark:bg-violet-900/10 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <FileText className="w-8 h-8 text-violet-400 dark:text-violet-500 mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {csvFileName
                          ? t('classes.import_csv_file_selected', { name: csvFileName, rows: csvRows.length })
                          : t('classes.import_csv_drag')}
                      </p>
                    </div>
                    <input
                      id="csv-file-input"
                      type="file"
                      accept=".csv,text/csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelected(file);
                        // Reset input value so the same file can be re-selected
                        e.target.value = '';
                      }}
                    />
                  </label>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={downloadTemplate}
                    className="text-violet-600 dark:text-violet-300 p-0 h-auto"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    {t('classes.import_csv_template')}
                  </Button>
                </div>

                {/* Preview table */}
                {csvRows.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">{t('classes.import_csv_preview')} ({csvRows.length})</Label>
                    <div className="max-h-64 overflow-y-auto scrollbar-education border border-violet-200/50 dark:border-violet-900/30 rounded-xl">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-b border-violet-200/30 dark:border-violet-900/20 bg-violet-50/50 dark:bg-violet-900/10">
                            <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50 w-12">#</TableHead>
                            <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('classes.import_csv_first_name')}</TableHead>
                            <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('classes.import_csv_last_name')}</TableHead>
                            <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('classes.import_csv_dob')}</TableHead>
                            <TableHead className="text-xs uppercase text-violet-600/70 dark:text-violet-400/50">{t('classes.import_csv_external_id')}</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {csvRows.map((r) => (
                            <TableRow
                              key={r._rowNum}
                              className={r._valid ? '' : 'bg-red-50/50 dark:bg-red-900/10'}
                            >
                              <TableCell className="text-xs text-gray-500 dark:text-gray-400 font-mono">{r._rowNum}</TableCell>
                              <TableCell className="text-sm">{r.firstName || <span className="text-red-500">—</span>}</TableCell>
                              <TableCell className="text-sm">{r.lastName || <span className="text-red-500">—</span>}</TableCell>
                              <TableCell className="text-sm text-gray-500">{r.dateOfBirth || '—'}</TableCell>
                              <TableCell className="text-sm text-gray-500">{r.externalId || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {csvRows.some((r) => !r._valid) && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {csvRows.filter((r) => !r._valid).length} {t('classes.import_csv_errors', { errors: csvRows.filter((r) => !r._valid).length })}
                      </p>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Import results */}
            {csvResult && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-900/30 flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('classes.import_csv_success', { success: csvResult.created })}
                    </p>
                    {csvResult.enrolled > 0 && (
                      <p className="text-xs text-emerald-600/70 dark:text-emerald-400/50">
                        {csvResult.enrolled} {t('classes.enroll_student').toLowerCase()}
                      </p>
                    )}
                  </div>
                </div>
                {csvResult.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200/50 dark:border-red-900/30">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" />
                      {t('classes.import_csv_errors', { errors: csvResult.errors.length })}
                    </p>
                    <div className="max-h-32 overflow-y-auto scrollbar-education space-y-1">
                      {csvResult.errors.map((e, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400">
                          {t('classes.import_csv_row', { n: e.row })}: {e.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            {csvResult ? (
              <Button onClick={resetCsvDialog} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl">
                {t('classes.import_csv_done')}
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={resetCsvDialog} className="rounded-xl">{t('action.cancel')}</Button>
                <Button
                  onClick={handleBulkImport}
                  disabled={csvImporting || csvRows.filter((r) => r._valid).length === 0}
                  className="bg-gradient-to-r from-violet-500 to-emerald-500 text-white rounded-xl"
                >
                  {csvImporting ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      {t('classes.import_csv_processing')}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      {t('classes.import_csv_import')}
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Class QR Code Dialog */}
      <Dialog open={classQrOpen} onOpenChange={setClassQrOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-600" />
              {t('qr.class')}
            </DialogTitle>
            <DialogDescription>{selectedClass?.name}</DialogDescription>
          </DialogHeader>
          <div className="qr-card mx-auto">
            {classQrDataUrl ? (
              <img src={classQrDataUrl} alt={t('qr.title')} className="mx-auto" width={200} height={200} />
            ) : (
              <div className="w-[200px] h-[200px] mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                <QrCode className="h-12 w-12 text-gray-400" />
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">{selectedClass?.name}</p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('label.grade')} {selectedClass?.gradeLevel} · {selectedClass?.schoolYear?.label}</p>
          </div>
          <div className="flex justify-center gap-2 mt-4">
            <Button
              variant="outline"
              className="rounded-xl min-h-[44px]"
              onClick={() => { if (classQrDataUrl) downloadQRCode(classQrDataUrl, `${selectedClass?.name || 'class'}-qr.png`); }}
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              {t('qr.download')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Klassenlehrer Assign/Change Dialog */}
      <Dialog open={responsibleTeacherOpen} onOpenChange={setResponsibleTeacherOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-600" />
              {selectedClass?.responsibleTeacher ? t('classes.change_teacher') : t('classes.assign_teacher')}
            </DialogTitle>
            <DialogDescription>{t('classes.privileges_info')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">{t('classes.select_teacher')}</Label>
              <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('classes.select_teacher')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('classes.no_responsible_teacher')}</SelectItem>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName} ({teacher.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedTeacherId && selectedTeacherId !== 'none' && (
              <div className="rounded-xl border border-emerald-200/40 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 mb-2">{t('classes.teacher_privileges')}</p>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('classes.illness_access')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-teal-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('classes.communication_access')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('classes.counseling_access')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('classes.disciplinary_access')}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResponsibleTeacherOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button
              onClick={handleAssignResponsibleTeacher}
              disabled={assigningTeacher}
              className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl"
            >
              {assigningTeacher ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <UserCheck className="h-4 w-4 mr-2" />
              )}
              {t('action.assign')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
