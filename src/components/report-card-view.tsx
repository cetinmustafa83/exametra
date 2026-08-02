// @ts-nocheck
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit3,
  Trash2,
  Send,
  Archive,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Printer,
  Star,
  BookOpen,
  Users,
  Calendar,
  X,
  Save,
  Copy,
  BarChart3,
  Award,
  MessageSquare,
  UserCheck,
  Shield,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  LayoutTemplate,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';

// ─── Types ──────────────────────────────────────────────────────────

interface StudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  dateOfBirth?: string;
}

interface ClassGroupInfo {
  id: string;
  name: string;
  gradeLevel: number;
  schoolType?: string;
  responsibleTeacher?: { id: string; firstName: string; lastName: string };
}

interface SchoolYearInfo {
  id: string;
  label: string;
}

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface CompetencyCategoryInfo {
  id: string;
  name: string;
  color?: string;
}

interface ReportSectionInfo {
  id: string;
  competencyCategoryId?: string | null;
  generatedText: string;
  order: number;
  competencyCategory?: CompetencyCategoryInfo | null;
}

interface ComputedGradeInfo {
  id: string;
  computedValue: number;
  overriddenValue?: number | null;
  isFinalized: boolean;
  subject: { id: string; name: string };
}

interface TemplateInfo {
  id: string;
  name: string;
  layout: string;
  gradingScale?: string;
}

interface ReportCard {
  id: string;
  studentId: string;
  classGroupId: string;
  schoolYearId: string;
  period: string;
  generatedByUserId: string;
  generatedAt: string;
  status: string;
  pdfFilePath?: string | null;
  includesGrades: boolean;
  teacherComments?: string | null;
  attendanceSummary?: string | null;
  overallAssessment?: string | null;
  templateId?: string | null;
  reviewedByUserId?: string | null;
  reviewedAt?: string | null;
  publishedAt?: string | null;
  student: StudentInfo;
  classGroup: ClassGroupInfo;
  schoolYear: SchoolYearInfo;
  generatedByUser: UserInfo;
  sections: ReportSectionInfo[];
  template?: TemplateInfo | null;
  computedGrades?: ComputedGradeInfo[];
}

interface TemplateItem {
  id: string;
  name: string;
  description?: string;
  sections: string;
  gradingScale: string;
  layout: string;
  isDefault: boolean;
}

// ─── German Grade Helpers ───────────────────────────────────────────

const GRADE_LABELS: Record<number, string> = {
  1: 'Sehr gut',
  2: 'Gut',
  3: 'Befriedigend',
  4: 'Ausreichend',
  5: 'Mangelhaft',
  6: 'Ungenügend',
};

function getGradeColor(grade: number): string {
  if (grade <= 1) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 dark:text-emerald-400';
  if (grade <= 2) return 'text-green-600 bg-green-50 dark:bg-green-950/50 dark:text-green-400';
  if (grade <= 3) return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/50 dark:text-yellow-400';
  if (grade <= 4) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400';
  if (grade <= 5) return 'text-orange-600 bg-orange-50 dark:bg-orange-950/50 dark:text-orange-400';
  return 'text-red-600 bg-red-50 dark:bg-red-950/50 dark:text-red-400';
}

function getGradeBorder(grade: number): string {
  if (grade <= 2) return 'border-emerald-300 dark:border-emerald-700';
  if (grade <= 3) return 'border-yellow-300 dark:border-yellow-700';
  if (grade <= 4) return 'border-amber-300 dark:border-amber-700';
  return 'border-red-300 dark:border-red-700';
}

function getStatusBadge(status: string) {
  const shimmerBase = 'relative overflow-hidden';
  const shimmerAfter = 'after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent after:animate-[shimmer_2s_infinite]';
  switch (status) {
    case 'DRAFT':
      return <Badge variant="outline" className={`bg-gray-50 text-gray-600 dark:bg-gray-900/50 dark:text-gray-400 border-gray-200 dark:border-gray-700 ${shimmerBase} ${shimmerAfter}`}><Clock className="h-3 w-3 mr-1" />{t('report_card.status_draft')}</Badge>;
    case 'REVIEW':
      return <Badge variant="outline" className={`bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400 border-amber-200 dark:border-amber-700 ${shimmerBase} ${shimmerAfter}`}><AlertCircle className="h-3 w-3 mr-1" />{t('report_card.status_review')}</Badge>;
    case 'PUBLISHED':
      return <Badge variant="outline" className={`bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 ${shimmerBase} ${shimmerAfter}`}><CheckCircle2 className="h-3 w-3 mr-1" />{t('report_card.status_published')}</Badge>;
    case 'ARCHIVED':
      return <Badge variant="outline" className={`bg-slate-50 text-slate-600 dark:bg-slate-950/50 dark:text-slate-400 border-slate-200 dark:border-slate-700 ${shimmerBase} ${shimmerAfter}`}><Archive className="h-3 w-3 mr-1" />{t('report_card.status_archived')}</Badge>;
    case 'FINAL':
      return <Badge variant="outline" className={`bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 border-teal-200 dark:border-teal-700 ${shimmerBase} ${shimmerAfter}`}><Star className="h-3 w-3 mr-1" />{t('report_card.status_final')}</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ─── Animated Counter ───────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.ceil(value / (duration / 30)));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{count}</span>;
}

// ─── Main Component ─────────────────────────────────────────────────

export default function ReportCardView() {
  const { currentUser, currentClassId, schoolYearId } = useAppStore();
  const role = currentUser?.role ?? 'TEACHER';

  const [reportCards, setReportCards] = useState<ReportCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState<string>(currentClassId ?? 'all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPeriod, setFilterPeriod] = useState<string>('all');
  const [selectedReport, setSelectedReport] = useState<ReportCard | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'editor' | 'preview'>('list');
  const [classes, setClasses] = useState<{ id: string; name: string; gradeLevel: number }[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [templates, setTemplates] = useState<TemplateItem[]>([]);

  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Editor state
  const [editTeacherComments, setEditTeacherComments] = useState('');
  const [editOverallAssessment, setEditOverallAssessment] = useState('');
  const [editSections, setEditSections] = useState<ReportSectionInfo[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Create form state
  const [createForm, setCreateForm] = useState({
    studentId: '',
    classGroupId: currentClassId ?? '',
    schoolYearId: schoolYearId ?? '',
    period: 'Semester 1',
    includesGrades: true,
    templateId: '',
    teacherComments: '',
    overallAssessment: '',
  });
  const [students, setStudents] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [schoolYears, setSchoolYears] = useState<{ id: string; label: string }[]>([]);

  // Batch form state
  const [batchForm, setBatchForm] = useState({
    classGroupId: currentClassId ?? '',
    schoolYearId: schoolYearId ?? '',
    period: 'Semester 1',
    templateId: '',
    includesGrades: true,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: '',
    description: '',
    layout: 'default' as 'default' | 'detailed' | 'compact',
    isDefault: false,
  });

  // ─── Data Fetching ──────────────────────────────────────────────

  const fetchReportCards = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterClass && filterClass !== 'all') params.set('classGroupId', filterClass);
      if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
      if (filterPeriod && filterPeriod !== 'all') params.set('period', filterPeriod);
      if (schoolYearId) params.set('schoolYearId', schoolYearId);

      const data = await apiGet<ReportCard[]>(`/api/report-cards?${params.toString()}`);
      setReportCards(data);
    } catch (error) {
      console.error('Failed to fetch report cards:', error);
      toast.error(t('report_card.load_error'));
    } finally {
      setIsLoading(false);
    }
  }, [filterClass, filterStatus, filterPeriod, schoolYearId]);

  const fetchClasses = useCallback(async () => {
    try {
      const data = await apiGet<{ id: string; name: string; gradeLevel: number }[]>('/api/classes');
      setClasses(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchStudents = useCallback(async (classGroupId: string) => {
    try {
      const data = await apiGet<{ id: string; firstName: string; lastName: string }[]>(
        `/api/classes/${classGroupId}/students`
      );
      setStudents(data);
    } catch {
      setStudents([]);
    }
  }, []);

  const fetchSchoolYears = useCallback(async () => {
    try {
      const data = await apiGet<{ id: string; label: string }[]>('/api/school-years');
      setSchoolYears(data);
      if (!schoolYearId && data.length > 0) {
        setCreateForm((f) => ({ ...f, schoolYearId: data[0].id }));
        setBatchForm((f) => ({ ...f, schoolYearId: data[0].id }));
      }
    } catch {
      // ignore
    }
  }, [schoolYearId]);

  const fetchTemplates = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    try {
      const data = await apiGet<TemplateItem[]>(`/api/report-cards/templates?schoolId=${currentUser.schoolId}`);
      setTemplates(data);
    } catch {
      // ignore
    }
  }, [currentUser?.schoolId]);

  useEffect(() => {
    fetchReportCards();
    fetchClasses();
    fetchSchoolYears();
    fetchTemplates();
  }, [fetchReportCards, fetchClasses, fetchSchoolYears, fetchTemplates]);

  useEffect(() => {
    if (createForm.classGroupId) {
      fetchStudents(createForm.classGroupId);
    }
  }, [createForm.classGroupId, fetchStudents]);

  // ─── Filtered Data ──────────────────────────────────────────────

  const filteredCards = useMemo(() => {
    let result = reportCards;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.student.firstName.toLowerCase().includes(q) ||
          r.student.lastName.toLowerCase().includes(q) ||
          r.classGroup.name.toLowerCase().includes(q) ||
          r.period.toLowerCase().includes(q)
      );
    }
    return result;
  }, [reportCards, searchQuery]);

  // ─── Stats ──────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = reportCards.length;
    const drafts = reportCards.filter((r) => r.status === 'DRAFT').length;
    const inReview = reportCards.filter((r) => r.status === 'REVIEW').length;
    const published = reportCards.filter((r) => r.status === 'PUBLISHED' || r.status === 'FINAL').length;
    return { total, drafts, inReview, published };
  }, [reportCards]);

  // ─── Actions ────────────────────────────────────────────────────

  const handleCreateReport = async () => {
    try {
      const report = await apiPost<ReportCard>('/api/report-cards', createForm);
      setReportCards((prev) => [report, ...prev]);
      setShowCreateDialog(false);
      toast.success(t('report_card.created'));
    } catch (error) {
      toast.error(t('report_card.create_error'));
    }
  };

  const handleBatchGenerate = async () => {
    try {
      const result = await apiPost<{ generated: number; skipped: number }>('/api/report-cards/generate', batchForm);
      toast.success(t('report_card.batch_generated').replace('{count}', String(result.generated)));
      setShowBatchDialog(false);
      fetchReportCards();
    } catch (error) {
      toast.error(t('report_card.batch_error'));
    }
  };

  const handleSaveReport = async () => {
    if (!selectedReport) return;
    setIsSaving(true);
    try {
      const updated = await apiPut<ReportCard>(`/api/report-cards/${selectedReport.id}`, {
        teacherComments: editTeacherComments,
        overallAssessment: editOverallAssessment,
        sections: editSections.map((s, i) => ({
          competencyCategoryId: s.competencyCategoryId,
          generatedText: s.generatedText,
          order: i,
        })),
      });
      setReportCards((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      setSelectedReport(updated);
      toast.success(t('report_card.saved'));
    } catch (error) {
      toast.error(t('report_card.save_error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (reportId: string, newStatus: string) => {
    try {
      const updated = await apiPut<ReportCard>(`/api/report-cards/${reportId}`, { status: newStatus });
      setReportCards((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      if (selectedReport?.id === reportId) setSelectedReport(updated);
      toast.success(t('report_card.status_updated'));
    } catch (error) {
      toast.error(t('report_card.status_error'));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/report-cards/${deleteTarget}`);
      setReportCards((prev) => prev.filter((r) => r.id !== deleteTarget));
      if (selectedReport?.id === deleteTarget) {
        setSelectedReport(null);
        setViewMode('list');
      }
      setShowDeleteDialog(false);
      setDeleteTarget(null);
      toast.success(t('report_card.deleted'));
    } catch (error) {
      toast.error(t('report_card.delete_error'));
    }
  };

  const handleBulkAction = async (action: 'publish' | 'archive' | 'delete') => {
    if (selectedIds.size === 0) return;
    try {
      for (const id of selectedIds) {
        if (action === 'publish') {
          await apiPut(`/api/report-cards/${id}`, { status: 'PUBLISHED' });
        } else if (action === 'archive') {
          await apiPut(`/api/report-cards/${id}`, { status: 'ARCHIVED' });
        } else if (action === 'delete') {
          await apiDelete(`/api/report-cards/${id}`);
        }
      }
      setSelectedIds(new Set());
      toast.success(t('report_card.bulk_action_success'));
      fetchReportCards();
    } catch (error) {
      toast.error(t('report_card.bulk_action_error'));
    }
  };

  const handleExportPDF = async (reportIds: string[]) => {
    try {
      const data = await apiPost<{
        reports: ReportCard[];
        school: { name: string; motto?: string; logoUrl?: string; address?: string; phone?: string; primaryColor?: string };
        exportDate: string;
      }>('/api/report-cards/export', { reportIds });

      // Store export data and open print dialog
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(generatePrintHTML(data.reports, data.school));
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 500);
      }
      toast.success(t('report_card.export_success'));
    } catch (error) {
      toast.error(t('report_card.export_error'));
    }
  };

  const handlePrintCurrent = () => {
    window.print();
  };

  const handleCreateTemplate = async () => {
    try {
      const template = await apiPost<TemplateItem>('/api/report-cards/templates', {
        ...templateForm,
        sections: JSON.stringify([
          { type: 'header', label: t('report_card.section_header') },
          { type: 'grades', label: t('report_card.section_grades') },
          { type: 'competencies', label: t('report_card.section_competencies') },
          { type: 'comments', label: t('report_card.section_comments') },
          { type: 'attendance', label: t('report_card.section_attendance') },
          { type: 'signature', label: t('report_card.section_signature') },
        ]),
        gradingScale: JSON.stringify({
          min: 1, max: 6,
          labels: { 1: 'Sehr gut', 2: 'Gut', 3: 'Befriedigend', 4: 'Ausreichend', 5: 'Mangelhaft', 6: 'Ungenügend' },
        }),
      });
      setTemplates((prev) => [...prev, template]);
      setShowTemplateDialog(false);
      toast.success(t('report_card.template_created'));
    } catch (error) {
      toast.error(t('report_card.template_error'));
    }
  };

  // ─── Editor Setup ───────────────────────────────────────────────

  const openEditor = (report: ReportCard) => {
    setSelectedReport(report);
    setEditTeacherComments(report.teacherComments ?? '');
    setEditOverallAssessment(report.overallAssessment ?? '');
    setEditSections(report.sections ?? []);
    setViewMode('editor');
  };

  const openPreview = (report: ReportCard) => {
    setSelectedReport(report);
    setViewMode('preview');
  };

  // ─── Radar Chart Data ──────────────────────────────────────────

  const radarData = useMemo(() => {
    if (!selectedReport?.computedGrades) return [];
    const grades = selectedReport.computedGrades;
    return grades.map((g) => ({
      subject: g.subject.name,
      grade: 7 - (g.overriddenValue ?? g.computedValue), // Invert for radar (higher = better)
      fullMark: 6,
    }));
  }, [selectedReport]);

  // ─── Attendance Parsed ─────────────────────────────────────────

  const attendanceParsed = useMemo(() => {
    if (!selectedReport?.attendanceSummary) return null;
    try {
      return JSON.parse(selectedReport.attendanceSummary);
    } catch {
      return null;
    }
  }, [selectedReport?.attendanceSummary]);

  // ─── Permission Checks ─────────────────────────────────────────

  const isAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL';
  const isTeacher = role === 'TEACHER';
  const isStudent = role === 'STUDENT';
  const isParent = role === 'PARENT';
  const canCreate = isAdmin || isTeacher;
  const canEdit = isAdmin || isTeacher;
  const canPublish = isAdmin;
  const canDelete = isAdmin;
  const canBatch = isAdmin;

  // ─── Periods ────────────────────────────────────────────────────

  const periods = ['Semester 1', 'Semester 2', 'Halbjahr 1', 'Halbjahr 2', 'Ganzjahr', '1. Halbjahr', '2. Halbjahr'];

  // ─── Render ─────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Gradient Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/30"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t('report_card.title')}</h1>
              <p className="text-emerald-100 text-sm">{t('report_card.subtitle')}</p>
            </div>
          </div>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring' }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm font-semibold"><AnimatedCounter value={stats.total} /> {t('report_card.total_reports')}</span>
          </motion.div>
        </div>
      </motion.div>

      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-emerald-100 text-xs font-medium">{t('report_card.total_reports')}</p>
                  <p className="text-2xl font-bold mt-1"><AnimatedCounter value={stats.total} /></p>
                </div>
                <FileText className="h-8 w-8 text-emerald-200 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="bg-gradient-to-br from-gray-500 to-gray-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-200 text-xs font-medium">{t('report_card.drafts')}</p>
                  <p className="text-2xl font-bold mt-1"><AnimatedCounter value={stats.drafts} /></p>
                </div>
                <Clock className="h-8 w-8 text-gray-300 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="bg-gradient-to-br from-amber-500 to-orange-500 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-amber-100 text-xs font-medium">{t('report_card.in_review')}</p>
                  <p className="text-2xl font-bold mt-1"><AnimatedCounter value={stats.inReview} /></p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-200 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <Card className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-teal-100 text-xs font-medium">{t('report_card.published')}</p>
                  <p className="text-2xl font-bold mt-1"><AnimatedCounter value={stats.published} /></p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-teal-200 opacity-50" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          {/* Toolbar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3 items-start md:items-center justify-between">
                <div className="flex flex-1 flex-col sm:flex-row gap-2 w-full">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={t('report_card.search_placeholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <Select value={filterClass} onValueChange={setFilterClass}>
                    <SelectTrigger className="w-full sm:w-40">
                      <SelectValue placeholder={t('report_card.filter_class')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('report_card.all_classes')}</SelectItem>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder={t('report_card.filter_status')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('report_card.all_statuses')}</SelectItem>
                      <SelectItem value="DRAFT">{t('report_card.status_draft')}</SelectItem>
                      <SelectItem value="REVIEW">{t('report_card.status_review')}</SelectItem>
                      <SelectItem value="PUBLISHED">{t('report_card.status_published')}</SelectItem>
                      <SelectItem value="ARCHIVED">{t('report_card.status_archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                    <SelectTrigger className="w-full sm:w-36">
                      <SelectValue placeholder={t('report_card.filter_period')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('report_card.all_periods')}</SelectItem>
                      {periods.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {canCreate && (
                    <Button onClick={() => setShowCreateDialog(true)} size="sm">
                      <Plus className="h-4 w-4 mr-1" />{t('report_card.create')}
                    </Button>
                  )}
                  {canBatch && (
                    <Button onClick={() => setShowBatchDialog(true)} variant="outline" size="sm">
                      <Users className="h-4 w-4 mr-1" />{t('report_card.batch_generate')}
                    </Button>
                  )}
                  {isAdmin && (
                    <Button onClick={() => setShowTemplateDialog(true)} variant="outline" size="sm">
                      <LayoutTemplate className="h-4 w-4 mr-1" />{t('report_card.manage_templates')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Bulk Actions */}
              {selectedIds.size > 0 && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">{selectedIds.size} {t('report_card.selected')}</span>
                  {canPublish && (
                    <Button size="sm" variant="outline" onClick={() => handleBulkAction('publish')}>
                      <Send className="h-3 w-3 mr-1" />{t('report_card.publish')}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleBulkAction('archive')}>
                    <Archive className="h-3 w-3 mr-1" />{t('report_card.archive')}
                  </Button>
                  {canDelete && (
                    <Button size="sm" variant="destructive" onClick={() => handleBulkAction('delete')}>
                      <Trash2 className="h-3 w-3 mr-1" />{t('action.delete')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report Cards List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
            </div>
          ) : filteredCards.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">{t('report_card.no_reports')}</p>
                {canCreate && (
                  <Button onClick={() => setShowCreateDialog(true)} className="mt-4" variant="outline">
                    <Plus className="h-4 w-4 mr-1" />{t('report_card.create_first')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3 mt-4">
              <AnimatePresence>
                {filteredCards.map((report, idx) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: idx * 0.03 }}
                  >
                    <Card className="hover:shadow-lg hover:shadow-emerald-500/5 hover:border-emerald-200/60 dark:hover:border-emerald-800/60 transition-all duration-300 hover:-translate-y-0.5 group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {(isAdmin || isTeacher) && (
                            <Checkbox
                              checked={selectedIds.has(report.id)}
                              onCheckedChange={(checked) => {
                                const next = new Set(selectedIds);
                                if (checked) next.add(report.id);
                                else next.delete(report.id);
                                setSelectedIds(next);
                              }}
                              className="mt-1"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-sm">
                                {report.student.firstName} {report.student.lastName}
                              </h3>
                              {getStatusBadge(report.status)}
                              <Badge variant="secondary" className="text-xs">
                                {report.classGroup.name}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {report.period}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(report.generatedAt).toLocaleDateString('de-DE')}
                              </span>
                              <span className="flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                {report.generatedByUser.firstName} {report.generatedByUser.lastName}
                              </span>
                              {report.template && (
                                <span className="flex items-center gap-1">
                                  <LayoutTemplate className="h-3 w-3" />
                                  {report.template.name}
                                </span>
                              )}
                              {report.includesGrades && (
                                <span className="flex items-center gap-1">
                                  <Award className="h-3 w-3" />
                                  {t('report_card.with_grades')}
                                </span>
                              )}
                            </div>
                            {report.sections.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {report.sections.slice(0, 3).map((s) => (
                                  <span
                                    key={s.id}
                                    className="text-xs px-2 py-0.5 rounded-full bg-muted"
                                    style={s.competencyCategory?.color ? { borderLeft: `3px solid ${s.competencyCategory.color}` } : undefined}
                                  >
                                    {s.competencyCategory?.name ?? s.generatedText.slice(0, 30)}
                                  </span>
                                ))}
                                {report.sections.length > 3 && (
                                  <span className="text-xs text-muted-foreground">
                                    +{report.sections.length - 3} {t('report_card.more')}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openPreview(report)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEdit && (
                              <Button size="sm" variant="ghost" onClick={() => openEditor(report)}>
                                <Edit3 className="h-4 w-4" />
                              </Button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {canEdit && report.status === 'DRAFT' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(report.id, 'REVIEW')}>
                                    <Send className="h-4 w-4 mr-2" />{t('report_card.submit_review')}
                                  </DropdownMenuItem>
                                )}
                                {canPublish && report.status === 'REVIEW' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(report.id, 'PUBLISHED')}>
                                    <CheckCircle2 className="h-4 w-4 mr-2" />{t('report_card.publish')}
                                  </DropdownMenuItem>
                                )}
                                {canPublish && report.status === 'PUBLISHED' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(report.id, 'FINAL')}>
                                    <Star className="h-4 w-4 mr-2" />{t('report_card.finalize')}
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleExportPDF([report.id])}>
                                  <Download className="h-4 w-4 mr-2" />{t('report_card.export_pdf')}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handlePrintCurrent()}>
                                  <Printer className="h-4 w-4 mr-2" />{t('action.print')}
                                </DropdownMenuItem>
                                {report.status !== 'ARCHIVED' && (
                                  <DropdownMenuItem onClick={() => handleStatusChange(report.id, 'ARCHIVED')}>
                                    <Archive className="h-4 w-4 mr-2" />{t('report_card.archive')}
                                  </DropdownMenuItem>
                                )}
                                {canDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => { setDeleteTarget(report.id); setShowDeleteDialog(true); }}
                                    >
                                      <Trash2 className="h-4 w-4 mr-2" />{t('action.delete')}
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      )}

      {/* Editor View */}
      {viewMode === 'editor' && selectedReport && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />{t('action.back')}
            </Button>
            <h2 className="text-lg font-semibold flex-1">
              {t('report_card.edit_title')} - {selectedReport.student.firstName} {selectedReport.student.lastName}
            </h2>
            <div className="flex items-center gap-2">
              {getStatusBadge(selectedReport.status)}
              <Button size="sm" variant="outline" onClick={() => openPreview(selectedReport)}>
                <Eye className="h-4 w-4 mr-1" />{t('action.preview')}
              </Button>
              <Button size="sm" onClick={handleSaveReport} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                {t('action.save')}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Main Editor */}
            <div className="lg:col-span-2 space-y-4">
              {/* Student Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />{t('report_card.student_info')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('report_card.student_name')}</Label>
                      <p className="font-medium text-sm">{selectedReport.student.firstName} {selectedReport.student.lastName}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('report_card.class_name')}</Label>
                      <p className="font-medium text-sm">{selectedReport.classGroup.name}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('report_card.school_year')}</Label>
                      <p className="font-medium text-sm">{selectedReport.schoolYear.label}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">{t('report_card.period')}</Label>
                      <p className="font-medium text-sm">{selectedReport.period}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subject Grades Table */}
              {selectedReport.computedGrades && selectedReport.computedGrades.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Award className="h-4 w-4" />{t('report_card.subject_grades')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 pr-4 font-medium">{t('report_card.subject')}</th>
                            <th className="text-center py-2 px-2 font-medium">{t('report_card.grade')}</th>
                            <th className="text-center py-2 px-2 font-medium">{t('report_card.label')}</th>
                            <th className="text-center py-2 pl-2 font-medium">{t('report_card.status_col')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedReport.computedGrades.map((g) => {
                            const grade = g.overriddenValue ?? g.computedValue;
                            const rounded = Math.round(grade * 10) / 10;
                            const gradeLabel = GRADE_LABELS[Math.round(grade)] ?? '';
                            return (
                              <motion.tr key={g.id} className="border-b last:border-0 group/row"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <td className="py-2 pr-4">{g.subject.name}</td>
                                <td className="py-2 px-2 text-center">
                                  <motion.span
                                    className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-colors duration-500 ${getGradeColor(Math.round(grade))}`}
                                    whileHover={{ scale: 1.15 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    {rounded}
                                  </motion.span>
                                </td>
                                <td className="py-2 px-2 text-center text-xs">{gradeLabel}</td>
                                <td className="py-2 pl-2 text-center">
                                  {g.isFinalized ? (
                                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
                                  ) : (
                                    <Clock className="h-4 w-4 text-amber-500 mx-auto" />
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Competency Sections */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />{t('report_card.competency_sections')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {editSections.map((section, idx) => (
                    <div key={section.id ?? idx} className="space-y-1">
                      <div className="flex items-center gap-2">
                        {section.competencyCategory?.color && (
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: section.competencyCategory.color }} />
                        )}
                        <Label className="text-xs font-medium">
                          {section.competencyCategory?.name ?? `${t('report_card.section')} ${idx + 1}`}
                        </Label>
                      </div>
                      <Textarea
                        value={section.generatedText}
                        onChange={(e) => {
                          const updated = [...editSections];
                          updated[idx] = { ...updated[idx], generatedText: e.target.value };
                          setEditSections(updated);
                        }}
                        rows={3}
                        className="text-sm"
                      />
                    </div>
                  ))}
                  {editSections.length === 0 && (
                    <p className="text-sm text-muted-foreground py-4 text-center">{t('report_card.no_sections')}</p>
                  )}
                </CardContent>
              </Card>

              {/* Teacher Comments */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />{t('report_card.teacher_comments')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editTeacherComments}
                    onChange={(e) => setEditTeacherComments(e.target.value)}
                    placeholder={t('report_card.comments_placeholder')}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Overall Assessment */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />{t('report_card.overall_assessment')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editOverallAssessment}
                    onChange={(e) => setEditOverallAssessment(e.target.value)}
                    placeholder={t('report_card.assessment_placeholder')}
                    rows={4}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right: Sidebar */}
            <div className="space-y-4">
              {/* Competency Radar Chart */}
              {radarData.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />{t('report_card.competency_radar')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <RadarChart data={radarData}>
                        <PolarGrid strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 6]} tick={{ fontSize: 8 }} />
                        <Radar
                          name={t('report_card.competency_level')}
                          dataKey="grade"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Attendance Summary */}
              {attendanceParsed && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Calendar className="h-4 w-4" />{t('report_card.attendance_summary')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {[
                        { label: t('report_card.present'), value: attendanceParsed.present, total: attendanceParsed.total, color: 'bg-emerald-500' },
                        { label: t('report_card.absent'), value: attendanceParsed.absent, total: attendanceParsed.total, color: 'bg-red-500' },
                        { label: t('report_card.excused'), value: attendanceParsed.excused, total: attendanceParsed.total, color: 'bg-amber-500' },
                        { label: t('report_card.late'), value: attendanceParsed.late, total: attendanceParsed.total, color: 'bg-orange-500' },
                      ].map((item) => (
                        <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value} / {item.total}</span>
                          </div>
                          <Progress
                            value={item.total > 0 ? (item.value / item.total) * 100 : 0}
                            className="h-2"
                          />
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Status Actions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">{t('report_card.actions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {selectedReport.status === 'DRAFT' && canEdit && (
                    <Button className="w-full" variant="outline" size="sm" onClick={() => handleStatusChange(selectedReport.id, 'REVIEW')}>
                      <Send className="h-4 w-4 mr-1" />{t('report_card.submit_review')}
                    </Button>
                  )}
                  {selectedReport.status === 'REVIEW' && canPublish && (
                    <Button className="w-full" size="sm" onClick={() => handleStatusChange(selectedReport.id, 'PUBLISHED')}>
                      <CheckCircle2 className="h-4 w-4 mr-1" />{t('report_card.publish')}
                    </Button>
                  )}
                  {selectedReport.status === 'PUBLISHED' && canPublish && (
                    <Button className="w-full" size="sm" variant="outline" onClick={() => handleStatusChange(selectedReport.id, 'FINAL')}>
                      <Star className="h-4 w-4 mr-1" />{t('report_card.finalize')}
                    </Button>
                  )}
                  <Button className="w-full" variant="outline" size="sm" onClick={() => handleExportPDF([selectedReport.id])}>
                    <Download className="h-4 w-4 mr-1" />{t('report_card.export_pdf')}
                  </Button>
                  <Button className="w-full" variant="outline" size="sm" onClick={handlePrintCurrent}>
                    <Printer className="h-4 w-4 mr-1" />{t('action.print')}
                  </Button>
                  {canDelete && (
                    <Button
                      className="w-full"
                      variant="destructive"
                      size="sm"
                      onClick={() => { setDeleteTarget(selectedReport.id); setShowDeleteDialog(true); }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />{t('action.delete')}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </motion.div>
      )}

      {/* Preview View */}
      {viewMode === 'preview' && selectedReport && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-4 print:hidden">
            <Button variant="ghost" size="sm" onClick={() => setViewMode('list')}>
              <ChevronRight className="h-4 w-4 rotate-180 mr-1" />{t('action.back')}
            </Button>
            <h2 className="text-lg font-semibold flex-1">
              {t('report_card.preview_title')} - {selectedReport.student.firstName} {selectedReport.student.lastName}
            </h2>
            <div className="flex items-center gap-2">
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => openEditor(selectedReport)}>
                  <Edit3 className="h-4 w-4 mr-1" />{t('action.edit')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={() => handleExportPDF([selectedReport.id])}>
                <Download className="h-4 w-4 mr-1" />{t('report_card.export_pdf')}
              </Button>
              <Button size="sm" onClick={handlePrintCurrent}>
                <Printer className="h-4 w-4 mr-1" />{t('action.print')}
              </Button>
            </div>
          </div>

          {/* Print-Ready Report Card */}
          <Card className="print:shadow-none print:border-0 relative overflow-hidden">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />
            <CardContent className="p-6 md:p-8 max-w-4xl mx-auto relative">
              {/* School Header */}
              <div className="text-center mb-6 border-b pb-4">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <GraduationCap className="h-8 w-8 text-emerald-600" />
                  <h1 className="text-2xl font-bold">{t('report_card.report_card_title')}</h1>
                </div>
                <p className="text-sm text-muted-foreground">{t('report_card.school_year')}: {selectedReport.schoolYear.label}</p>
              </div>

              {/* Student Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">{t('report_card.student_name')}</p>
                  <p className="font-semibold">{selectedReport.student.firstName} {selectedReport.student.lastName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('report_card.class_name')}</p>
                  <p className="font-semibold">{selectedReport.classGroup.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('report_card.period')}</p>
                  <p className="font-semibold">{selectedReport.period}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t('report_card.date')}</p>
                  <p className="font-semibold">{new Date(selectedReport.generatedAt).toLocaleDateString('de-DE')}</p>
                </div>
              </div>

              {/* Subject Grades */}
              {selectedReport.computedGrades && selectedReport.computedGrades.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-2">{t('report_card.subject_grades')}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 pr-4 font-medium">{t('report_card.subject')}</th>
                          <th className="text-center py-2 px-4 font-medium">{t('report_card.grade')}</th>
                          <th className="text-left py-2 pl-4 font-medium">{t('report_card.evaluation')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedReport.computedGrades.map((g) => {
                          const grade = g.overriddenValue ?? g.computedValue;
                          const rounded = Math.round(grade * 10) / 10;
                          const gradeLabel = GRADE_LABELS[Math.round(grade)] ?? '';
                          return (
                            <tr key={g.id} className="border-b last:border-0">
                              <td className="py-2 pr-4">{g.subject.name}</td>
                              <td className="py-2 px-4 text-center">
                                <span className={`inline-flex items-center justify-center min-w-[2rem] h-8 rounded-lg text-sm font-bold border ${getGradeColor(Math.round(grade))} ${getGradeBorder(Math.round(grade))}`}>
                                  {rounded}
                                </span>
                              </td>
                              <td className="py-2 pl-4 text-sm">{gradeLabel}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Competency Radar Chart */}
              {radarData.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-2">{t('report_card.competency_overview')}</h3>
                  <div className="flex justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <RadarChart data={radarData}>
                        <PolarGrid strokeDasharray="3 3" />
                        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 6]} tick={{ fontSize: 9 }} />
                        <Radar
                          name={t('report_card.competency_level')}
                          dataKey="grade"
                          stroke="#10b981"
                          fill="#10b981"
                          fillOpacity={0.3}
                        />
                        <RechartsTooltip />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Competency Sections */}
              {selectedReport.sections.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-2">{t('report_card.competency_details')}</h3>
                  <div className="space-y-3">
                    {selectedReport.sections.map((section) => (
                      <div key={section.id} className="flex gap-3">
                        {section.competencyCategory?.color && (
                          <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: section.competencyCategory.color }} />
                        )}
                        <div>
                          {section.competencyCategory?.name && (
                            <p className="text-xs font-semibold text-muted-foreground">{section.competencyCategory.name}</p>
                          )}
                          <p className="text-sm">{section.generatedText}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Attendance */}
              {attendanceParsed && (
                <div className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-2">{t('report_card.attendance_summary')}</h3>
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-emerald-600">{attendanceParsed.present}</p>
                      <p className="text-xs text-muted-foreground">{t('report_card.present')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{attendanceParsed.absent}</p>
                      <p className="text-xs text-muted-foreground">{t('report_card.absent')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{attendanceParsed.excused}</p>
                      <p className="text-xs text-muted-foreground">{t('report_card.excused')}</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-orange-600">{attendanceParsed.late}</p>
                      <p className="text-xs text-muted-foreground">{t('report_card.late')}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Teacher Comments */}
              {selectedReport.teacherComments && (
                <div className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-2">{t('report_card.teacher_comments')}</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.teacherComments}</p>
                </div>
              )}

              {/* Overall Assessment */}
              {selectedReport.overallAssessment && (
                <div className="mb-6">
                  <h3 className="font-semibold text-sm mb-3 border-b pb-2">{t('report_card.overall_assessment')}</h3>
                  <p className="text-sm whitespace-pre-wrap">{selectedReport.overallAssessment}</p>
                </div>
              )}

              {/* Signature Area */}
              <div className="mt-8 pt-6 border-t">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-xs text-muted-foreground mb-8">{t('report_card.teacher_signature')}</p>
                    <div className="border-b border-gray-400" />
                    <p className="text-xs text-muted-foreground mt-1">
                      {selectedReport.generatedByUser.firstName} {selectedReport.generatedByUser.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-8">{t('report_card.parent_signature')}</p>
                    <div className="border-b border-gray-400" />
                    <p className="text-xs text-muted-foreground mt-1">{t('report_card.date')}</p>
                  </div>
                </div>
              </div>

              {/* Grading Scale Legend */}
              <div className="mt-6 p-3 bg-muted/30 rounded-lg text-xs">
                <p className="font-semibold mb-1">{t('report_card.grading_scale')}</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GRADE_LABELS).map(([num, label]) => (
                    <span key={num} className={`px-2 py-0.5 rounded ${getGradeColor(Number(num))}`}>
                      {num} - {label}
                    </span>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Create Report Card Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('report_card.create_title')}</DialogTitle>
            <DialogDescription>{t('report_card.create_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('report_card.class_name')}</Label>
              <Select value={createForm.classGroupId} onValueChange={(v) => setCreateForm((f) => ({ ...f, classGroupId: v, studentId: '' }))}>
                <SelectTrigger><SelectValue placeholder={t('report_card.select_class')} /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('report_card.student_name')}</Label>
              <Select value={createForm.studentId} onValueChange={(v) => setCreateForm((f) => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('report_card.select_student')} /></SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('report_card.school_year')}</Label>
              <Select value={createForm.schoolYearId} onValueChange={(v) => setCreateForm((f) => ({ ...f, schoolYearId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('report_card.select_year')} /></SelectTrigger>
                <SelectContent>
                  {schoolYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('report_card.period')}</Label>
              <Select value={createForm.period} onValueChange={(v) => setCreateForm((f) => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {templates.length > 0 && (
              <div>
                <Label>{t('report_card.template')}</Label>
                <Select value={createForm.templateId} onValueChange={(v) => setCreateForm((f) => ({ ...f, templateId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('report_card.select_template')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('report_card.no_template')}</SelectItem>
                    {templates.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="includes-grades"
                checked={createForm.includesGrades}
                onCheckedChange={(checked) => setCreateForm((f) => ({ ...f, includesGrades: !!checked }))}
              />
              <Label htmlFor="includes-grades">{t('report_card.include_grades')}</Label>
            </div>
            <div>
              <Label>{t('report_card.teacher_comments')}</Label>
              <Textarea
                value={createForm.teacherComments}
                onChange={(e) => setCreateForm((f) => ({ ...f, teacherComments: e.target.value }))}
                placeholder={t('report_card.comments_placeholder')}
                rows={3}
              />
            </div>
            <div>
              <Label>{t('report_card.overall_assessment')}</Label>
              <Textarea
                value={createForm.overallAssessment}
                onChange={(e) => setCreateForm((f) => ({ ...f, overallAssessment: e.target.value }))}
                placeholder={t('report_card.assessment_placeholder')}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleCreateReport} disabled={!createForm.studentId || !createForm.classGroupId}>
              <Plus className="h-4 w-4 mr-1" />{t('action.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Generate Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('report_card.batch_generate_title')}</DialogTitle>
            <DialogDescription>{t('report_card.batch_generate_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t('report_card.class_name')}</Label>
              <Select value={batchForm.classGroupId} onValueChange={(v) => setBatchForm((f) => ({ ...f, classGroupId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('report_card.select_class')} /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('report_card.school_year')}</Label>
              <Select value={batchForm.schoolYearId} onValueChange={(v) => setBatchForm((f) => ({ ...f, schoolYearId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('report_card.select_year')} /></SelectTrigger>
                <SelectContent>
                  {schoolYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('report_card.period')}</Label>
              <Select value={batchForm.period} onValueChange={(v) => setBatchForm((f) => ({ ...f, period: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {periods.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {templates.length > 0 && (
              <div>
                <Label>{t('report_card.template')}</Label>
                <Select value={batchForm.templateId} onValueChange={(v) => setBatchForm((f) => ({ ...f, templateId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t('report_card.select_template')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('report_card.no_template')}</SelectItem>
                    {templates.map((tp) => (
                      <SelectItem key={tp.id} value={tp.id}>{tp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Checkbox
                id="batch-grades"
                checked={batchForm.includesGrades}
                onCheckedChange={(checked) => setBatchForm((f) => ({ ...f, includesGrades: !!checked }))}
              />
              <Label htmlFor="batch-grades">{t('report_card.include_grades')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleBatchGenerate} disabled={!batchForm.classGroupId}>
              <Users className="h-4 w-4 mr-1" />{t('report_card.generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Management Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('report_card.template_management')}</DialogTitle>
            <DialogDescription>{t('report_card.template_desc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Existing Templates */}
            {templates.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('report_card.existing_templates')}</Label>
                {templates.map((tp) => (
                  <div key={tp.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{tp.name}</p>
                      <p className="text-xs text-muted-foreground">{tp.layout} layout</p>
                    </div>
                    {tp.isDefault && <Badge variant="secondary" className="text-xs">{t('report_card.default')}</Badge>}
                  </div>
                ))}
              </div>
            )}
            <Separator />
            {/* New Template Form */}
            <div>
              <Label>{t('report_card.template_name')}</Label>
              <Input
                value={templateForm.name}
                onChange={(e) => setTemplateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('report_card.template_name_placeholder')}
              />
            </div>
            <div>
              <Label>{t('report_card.template_description')}</Label>
              <Input
                value={templateForm.description}
                onChange={(e) => setTemplateForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={t('report_card.template_desc_placeholder')}
              />
            </div>
            <div>
              <Label>{t('report_card.layout')}</Label>
              <Select value={templateForm.layout} onValueChange={(v) => setTemplateForm((f) => ({ ...f, layout: v as 'default' | 'detailed' | 'compact' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">{t('report_card.layout_default')}</SelectItem>
                  <SelectItem value="detailed">{t('report_card.layout_detailed')}</SelectItem>
                  <SelectItem value="compact">{t('report_card.layout_compact')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="template-default"
                checked={templateForm.isDefault}
                onCheckedChange={(checked) => setTemplateForm((f) => ({ ...f, isDefault: !!checked }))}
              />
              <Label htmlFor="template-default">{t('report_card.set_as_default')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>{t('action.cancel')}</Button>
            <Button onClick={handleCreateTemplate} disabled={!templateForm.name}>
              <Plus className="h-4 w-4 mr-1" />{t('report_card.create_template')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('report_card.delete_confirm_title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('report_card.delete_confirm_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('action.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('action.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Print HTML Generator ────────────────────────────────────────────

function generatePrintHTML(
  reports: ReportCard[],
  school?: { name: string; motto?: string; logoUrl?: string; address?: string; phone?: string; primaryColor?: string }
): string {
  const gradeLabels: Record<number, string> = {
    1: 'Sehr gut', 2: 'Gut', 3: 'Befriedigend', 4: 'Ausreichend', 5: 'Mangelhaft', 6: 'Ungenügend',
  };

  function getGradeColor(grade: number): string {
    if (grade <= 1) return '#059669';
    if (grade <= 2) return '#16a34a';
    if (grade <= 3) return '#ca8a04';
    if (grade <= 4) return '#d97706';
    if (grade <= 5) return '#ea580c';
    return '#dc2626';
  }

  const reportCards = reports.map((report) => {
    const grades = report.computedGrades ?? [];
    const attendance = report.attendanceSummary ? JSON.parse(report.attendanceSummary) : null;

    return `
      <div class="report-card-page">
        <div class="header">
          <h1>${school?.name ?? 'SchulOS'}</h1>
          ${school?.motto ? `<p class="motto">${school.motto}</p>` : ''}
          <h2>Zeugnis / Report Card</h2>
          <p>Schuljahr: ${report.schoolYear.label}</p>
        </div>

        <div class="student-info">
          <div><strong>Name:</strong> ${report.student.firstName} ${report.student.lastName}</div>
          <div><strong>Klasse:</strong> ${report.classGroup.name}</div>
          <div><strong>Zeitraum:</strong> ${report.period}</div>
          <div><strong>Datum:</strong> ${new Date(report.generatedAt).toLocaleDateString('de-DE')}</div>
        </div>

        ${grades.length > 0 ? `
        <h3>Noten / Grades</h3>
        <table>
          <thead>
            <tr><th>Fach</th><th>Note</th><th>Bewertung</th></tr>
          </thead>
          <tbody>
            ${grades.map((g) => {
              const grade = g.overriddenValue ?? g.computedValue;
              const rounded = Math.round(grade * 10) / 10;
              const label = gradeLabels[Math.round(grade)] ?? '';
              return `<tr><td>${g.subject.name}</td><td style="color: ${getGradeColor(Math.round(grade))}; font-weight: bold;">${rounded}</td><td>${label}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        ` : ''}

        ${report.sections.length > 0 ? `
        <h3>Kompetenzbereiche / Competencies</h3>
        ${report.sections.map((s) => `
          <div class="section">
            ${s.competencyCategory?.name ? `<strong>${s.competencyCategory.name}</strong><br/>` : ''}
            ${s.generatedText}
          </div>
        `).join('')}
        ` : ''}

        ${attendance ? `
        <h3>Anwesenheit / Attendance</h3>
        <div class="attendance-grid">
          <div><strong>${attendance.present}</strong> Anwesend</div>
          <div><strong>${attendance.absent}</strong> Fehlend</div>
          <div><strong>${attendance.excused}</strong> Entschuldigt</div>
          <div><strong>${attendance.late}</strong> Verspätet</div>
        </div>
        ` : ''}

        ${report.teacherComments ? `
        <h3>Bemerkungen / Comments</h3>
        <p>${report.teacherComments}</p>
        ` : ''}

        ${report.overallAssessment ? `
        <h3>Gesamtbewertung / Overall Assessment</h3>
        <p>${report.overallAssessment}</p>
        ` : ''}

        <div class="signature-area">
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Lehrkraft / Teacher</p>
          </div>
          <div class="signature-box">
            <div class="signature-line"></div>
            <p>Eltern / Parent</p>
          </div>
        </div>

        <div class="grading-scale">
          <p><strong>Notenskala:</strong> 1 - Sehr gut | 2 - Gut | 3 - Befriedigend | 4 - Ausreichend | 5 - Mangelhaft | 6 - Ungenügend</p>
        </div>

        <div class="page-break"></div>
      </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Report Card Export</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { font-family: 'Inter', 'Helvetica', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #1a1a1a; margin: 0; padding: 0; }
    .report-card-page { max-width: 700px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #10b981; padding-bottom: 16px; }
    .header h1 { font-size: 18pt; margin: 0; color: #10b981; }
    .header h2 { font-size: 14pt; margin: 8px 0 4px; }
    .header .motto { font-style: italic; color: #666; font-size: 10pt; }
    .header p { margin: 4px 0; font-size: 10pt; color: #666; }
    .student-info { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 16px 0; padding: 12px; background: #f9fafb; border-radius: 6px; }
    h3 { font-size: 12pt; color: #10b981; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; font-size: 10pt; }
    .section { padding: 8px 0; border-bottom: 1px dotted #e5e7eb; }
    .attendance-grid { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; text-align: center; }
    .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 40px; }
    .signature-box { text-align: center; }
    .signature-line { border-bottom: 1px solid #333; margin-bottom: 8px; height: 30px; }
    .grading-scale { margin-top: 24px; font-size: 9pt; color: #666; border-top: 1px solid #e5e7eb; padding-top: 8px; }
    .page-break { page-break-after: always; }
  </style>
</head>
<body>
  ${reportCards}
</body>
</html>`;
}
