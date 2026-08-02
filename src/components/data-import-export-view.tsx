// @ts-nocheck
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Upload,
  Download,
  History,
  Trash2,
  FileText,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronRight,
  ChevronDown,
  MapPin,
  Eye,
  Play,
  RefreshCw,
  Archive,
  Shield,
  Users,
  GraduationCap,
  ClipboardCheck,
  CalendarCheck,
  BarChart3,
  X,
  Filter,
  Calendar,
  Clock,
  HardDrive,
  Sparkles,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────

interface ImportJob {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  status: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: string | null;
  createdAt: string;
}

interface ExportJob {
  id: string;
  type: string;
  format: string;
  fileName: string | null;
  fileSize: number;
  status: string;
  fileData: string | null;
  createdAt: string;
}

interface DbStatistics {
  students: number;
  teachers: number;
  grades: number;
  attendance: number;
  competencies: number;
  classes: number;
  subjects: number;
  assessments: number;
  reports: number;
  total: number;
}

interface CleanupInfo {
  orphanedStudents: number;
  orphanedEnrollments: number;
  totalOrphans: number;
}

interface ParsedData {
  headers: string[];
  rows: Record<string, string>[];
}

// ── Column mapping schema per import type ──────────────────────────

const IMPORT_FIELD_SCHEMAS: Record<string, { value: string; label: string; required: boolean }[]> = {
  STUDENT: [
    { value: 'firstName', label: 'First Name', required: true },
    { value: 'lastName', label: 'Last Name', required: true },
    { value: 'externalId', label: 'External ID', required: false },
    { value: 'dateOfBirth', label: 'Date of Birth', required: false },
    { value: 'email', label: 'Email', required: false },
  ],
  TEACHER: [
    { value: 'firstName', label: 'First Name', required: true },
    { value: 'lastName', label: 'Last Name', required: true },
    { value: 'email', label: 'Email', required: true },
    { value: 'role', label: 'Role', required: false },
  ],
  GRADE: [
    { value: 'studentId', label: 'Student ID', required: true },
    { value: 'assessmentId', label: 'Assessment ID', required: true },
    { value: 'score', label: 'Score', required: false },
    { value: 'note', label: 'Note', required: false },
  ],
  ATTENDANCE: [
    { value: 'studentId', label: 'Student ID', required: true },
    { value: 'date', label: 'Date', required: true },
    { value: 'status', label: 'Status', required: false },
    { value: 'sessionId', label: 'Session ID', required: false },
  ],
  COMPETENCY: [
    { value: 'studentId', label: 'Student ID', required: true },
    { value: 'competencyId', label: 'Competency ID', required: true },
    { value: 'level', label: 'Level', required: false },
    { value: 'note', label: 'Note', required: false },
  ],
};

// ── Animated Counter ───────────────────────────────────────────────

function AnimatedCounter({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) { setDisplay(value); return; }
    const startTime = performance.now();
    let raf: number;
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    prevRef.current = value;
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span>{display.toLocaleString()}</span>;
}

// ── Status Badge ───────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; icon: React.ElementType; label: string }> = {
    pending: { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: Clock, label: t('data_import_export.status_pending') },
    processing: { color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: Loader2, label: t('data_import_export.status_processing') },
    completed: { color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300', icon: CheckCircle2, label: t('data_import_export.status_completed') },
    failed: { color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: XCircle, label: t('data_import_export.status_failed') },
  };
  const c = config[status] || config.pending;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={`${c.color} gap-1`}>
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {c.label}
    </Badge>
  );
}

// ── Format file size ──────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ── Main Component ─────────────────────────────────────────────────

export default function DataImportExportView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [activeTab, setActiveTab] = useState('import');
  const [importType, setImportType] = useState('STUDENT');
  const [exportType, setExportType] = useState('STUDENT');
  const [exportFormat, setExportFormat] = useState('CSV');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [includeHeaders, setIncludeHeaders] = useState(true);
  const [includeMetadata, setIncludeMetadata] = useState(false);

  // Import state
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<Record<string, unknown> | null>(null);

  // Export state
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<Record<string, unknown> | null>(null);

  // History state
  const [importJobs, setImportJobs] = useState<ImportJob[]>([]);
  const [exportJobs, setExportJobs] = useState<ExportJob[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Management state
  const [dbStats, setDbStats] = useState<DbStatistics | null>(null);
  const [cleanupInfo, setCleanupInfo] = useState<CleanupInfo | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; type: string; onConfirm: () => void }>({
    open: false,
    type: '',
    onConfirm: () => {},
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check access
  const role = currentUser?.role || '';
  const isAdmin = role === 'SUPER_ADMIN' || role === 'SCHOOL_ADMIN';
  const isVicePrincipal = role === 'VICE_PRINCIPAL';
  const isTeacher = role === 'TEACHER';
  const canImport = isAdmin || isVicePrincipal || isTeacher;
  const canExport = isAdmin || isVicePrincipal || isTeacher;
  const canManage = isAdmin || isVicePrincipal;
  const canCleanup = isAdmin;

  const schoolId = currentUser?.schoolId || '';

  // ── Parse CSV/JSON locally ──────────────────────────────────────

  const parseLocalFile = useCallback(async (file: File) => {
    const text = await file.text();
    try {
      if (file.name.endsWith('.json')) {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : data.records || data.data || [];
        if (arr.length === 0) {
          toast.error(t('data_import_export.invalid_format'));
          return;
        }
        const headers = Object.keys(arr[0]);
        const rows = arr.slice(0, 10).map((item: Record<string, unknown>) => {
          const row: Record<string, string> = {};
          headers.forEach((h) => {
            row[h] = item[h] !== undefined && item[h] !== null ? String(item[h]) : '';
          });
          return row;
        });
        setParsedData({ headers, rows });
        // Auto-map columns
        const mapping: Record<string, string> = {};
        const fields = IMPORT_FIELD_SCHEMAS[importType] || [];
        headers.forEach((h) => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = fields.find((f) => f.value.toLowerCase() === lower);
          if (match) mapping[h] = match.value;
        });
        setColumnMapping(mapping);
      } else {
        // Parse CSV
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error(t('data_import_export.invalid_format'));
          return;
        }
        const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
        const rows: Record<string, string>[] = [];
        for (let i = 1; i < Math.min(lines.length, 11); i++) {
          const values: string[] = [];
          let current = '';
          let inQuotes = false;
          for (const char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else current += char;
          }
          values.push(current.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });
          rows.push(row);
        }
        setParsedData({ headers, rows });
        // Auto-map columns
        const mapping: Record<string, string> = {};
        const fields = IMPORT_FIELD_SCHEMAS[importType] || [];
        headers.forEach((h) => {
          const lower = h.toLowerCase().replace(/[^a-z0-9]/g, '');
          const match = fields.find((f) => f.value.toLowerCase() === lower);
          if (match) mapping[h] = match.value;
        });
        setColumnMapping(mapping);
      }
    } catch {
      toast.error(t('data_import_export.invalid_format'));
    }
  }, [importType]);

  // ── Handle file selection ───────────────────────────────────────

  const handleFileSelect = useCallback((file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('data_import_export.file_too_large'));
      return;
    }
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.json')) {
      toast.error(t('data_import_export.invalid_format'));
      return;
    }
    setSelectedFile(file);
    setImportResult(null);
    setImportProgress(0);
    parseLocalFile(file);
  }, [parseLocalFile]);

  // ── Drag & Drop handlers ────────────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // ── Import handler ──────────────────────────────────────────────

  const handleImport = useCallback(async () => {
    if (!selectedFile || !schoolId) return;
    setImporting(true);
    setImportProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) { clearInterval(progressInterval); return 90; }
        return prev + Math.random() * 15;
      });
    }, 300);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importType);
      formData.append('schoolId', schoolId);
      if (Object.keys(columnMapping).length > 0) {
        formData.append('columnMapping', JSON.stringify(columnMapping));
      }

      const res = await fetch('/api/data-import', { method: 'POST', body: formData });
      const data = await res.json();

      clearInterval(progressInterval);
      setImportProgress(100);

      if (res.ok) {
        setImportResult(data);
        toast.success(t('data_import_export.import_success'));
      } else {
        toast.error(data.error || t('data_import_export.import_error'));
      }
    } catch {
      clearInterval(progressInterval);
      toast.error(t('data_import_export.import_error'));
    } finally {
      setImporting(false);
    }
  }, [selectedFile, schoolId, importType, columnMapping]);

  // ── Export handler ──────────────────────────────────────────────

  const handleExport = useCallback(async () => {
    if (!schoolId) return;
    setExporting(true);
    setExportResult(null);

    try {
      const filters: Record<string, unknown> = { schoolId };
      if (classFilter) filters.classId = classFilter;
      if (subjectFilter) filters.subjectId = subjectFilter;
      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;

      const res = await fetch('/api/data-export/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: exportType,
          format: exportFormat,
          filters,
        }),
      });
      const data = await res.json();

      if (res.ok) {
        setExportResult(data);
        toast.success(t('data_import_export.export_success'));
      } else {
        toast.error(data.error || t('data_import_export.export_error'));
      }
    } catch {
      toast.error(t('data_import_export.export_error'));
    } finally {
      setExporting(false);
    }
  }, [schoolId, exportType, exportFormat, classFilter, subjectFilter, dateFrom, dateTo]);

  // ── Download handler ────────────────────────────────────────────

  const handleDownload = useCallback((fileData: string, fileName: string) => {
    try {
      const binary = atob(fileData);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('data_import_export.operation_error'));
    }
  }, []);

  // ── Load history ────────────────────────────────────────────────

  const loadHistory = useCallback(async () => {
    if (!schoolId) return;
    setHistoryLoading(true);
    try {
      const [importRes, exportRes] = await Promise.all([
        fetch(`/api/data-import?schoolId=${schoolId}`),
        fetch(`/api/data-export/jobs?schoolId=${schoolId}`),
      ]);
      if (importRes.ok) setImportJobs(await importRes.json());
      if (exportRes.ok) setExportJobs(await exportRes.json());
    } catch {
      // ignore
    } finally {
      setHistoryLoading(false);
    }
  }, [schoolId]);

  // ── Load statistics ─────────────────────────────────────────────

  const loadStats = useCallback(async () => {
    if (!schoolId) return;
    setStatsLoading(true);
    try {
      const res = await fetch(`/api/data-cleanup?schoolId=${schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setDbStats(data.statistics);
        setCleanupInfo(data.cleanup);
      }
    } catch {
      // ignore
    } finally {
      setStatsLoading(false);
    }
  }, [schoolId]);

  // ── Cleanup handler ─────────────────────────────────────────────

  const handleCleanup = useCallback(async (operation: string) => {
    if (!schoolId) return;
    try {
      const res = await fetch('/api/data-cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operation, schoolId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(t('data_import_export.operation_success'));
        loadStats();
      } else {
        toast.error(data.error || t('data_import_export.operation_error'));
      }
    } catch {
      toast.error(t('data_import_export.operation_error'));
    }
    setConfirmDialog({ open: false, type: '', onConfirm: () => {} });
  }, [schoolId, loadStats]);

  // ── Delete export job ───────────────────────────────────────────

  const handleDeleteExport = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/data-export/jobs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setExportJobs((prev) => prev.filter((j) => j.id !== id));
        toast.success(t('data_import_export.operation_success'));
      }
    } catch {
      toast.error(t('data_import_export.operation_error'));
    }
  }, []);

  // ── Load data on tab change ─────────────────────────────────────

  useEffect(() => {
    if (activeTab === 'history') loadHistory();
    if (activeTab === 'management') loadStats();
  }, [activeTab, loadHistory, loadStats]);

  // ── No access view ──────────────────────────────────────────────

  if (!canImport && !canExport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="rounded-full bg-rose-100 dark:bg-rose-900/30 p-6">
          <Shield className="h-12 w-12 text-rose-500" />
        </motion.div>
        <h2 className="text-xl font-semibold text-foreground">{t('data_import_export.no_access')}</h2>
        <p className="text-muted-foreground text-center max-w-md">{t('data_import_export.no_access_desc')}</p>
      </div>
    );
  }

  // ── Stat cards data ─────────────────────────────────────────────

  const statCards = dbStats ? [
    { label: t('data_import_export.students'), value: dbStats.students, icon: GraduationCap, color: 'from-emerald-500 to-teal-600' },
    { label: t('data_import_export.teachers'), value: dbStats.teachers, icon: Users, color: 'from-teal-500 to-cyan-600' },
    { label: t('data_import_export.grades'), value: dbStats.grades, icon: ClipboardCheck, color: 'from-cyan-500 to-sky-600' },
    { label: t('data_import_export.attendance_records'), value: dbStats.attendance, icon: CalendarCheck, color: 'from-sky-500 to-blue-600' },
    { label: t('data_import_export.competency_records'), value: dbStats.competencies, icon: BarChart3, color: 'from-violet-500 to-purple-600' },
    { label: t('data_import_export.total_records'), value: dbStats.total, icon: Database, color: 'from-emerald-500 to-emerald-700' },
  ] : [];

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header Banner */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3QgZmlsbD0idXJsKCNnKSIgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIvPjwvc3ZnPg==')] opacity-50" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="rounded-xl bg-white/20 p-2.5 backdrop-blur-sm">
              <Database className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">{t('data_import_export.title')}</h1>
              <p className="text-emerald-100 text-sm mt-1">{t('data_import_export.subtitle')}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 right-12 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="import" className="gap-1.5">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">{t('data_import_export.tab_import')}</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5">
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{t('data_import_export.tab_export')}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">{t('data_import_export.tab_history')}</span>
          </TabsTrigger>
          <TabsTrigger value="management" className="gap-1.5" disabled={!canManage}>
            <HardDrive className="h-4 w-4" />
            <span className="hidden sm:inline">{t('data_import_export.tab_management')}</span>
          </TabsTrigger>
        </TabsList>

        {/* ── IMPORT TAB ──────────────────────────────────────────── */}
        <TabsContent value="import" className="space-y-6 mt-6">
          {canImport ? (
            <>
              {/* Import Type Selection */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                      {t('data_import_export.import_type')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                      {[
                        { value: 'STUDENT', icon: GraduationCap, label: t('data_import_export.type_student') },
                        { value: 'TEACHER', icon: Users, label: t('data_import_export.type_teacher') },
                        { value: 'GRADE', icon: ClipboardCheck, label: t('data_import_export.type_grade') },
                        { value: 'ATTENDANCE', icon: CalendarCheck, label: t('data_import_export.type_attendance') },
                        { value: 'COMPETENCY', icon: BarChart3, label: t('data_import_export.type_competency') },
                      ].map((item) => (
                        <motion.button
                          key={item.value}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            setImportType(item.value);
                            setParsedData(null);
                            setSelectedFile(null);
                            setColumnMapping({});
                            setImportResult(null);
                          }}
                          className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                            importType === item.value
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md'
                              : 'border-muted hover:border-emerald-300 dark:hover:border-emerald-700'
                          }`}
                        >
                          <item.icon className={`h-6 w-6 ${importType === item.value ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                          <span className={`text-xs font-medium ${importType === item.value ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                            {item.label}
                          </span>
                        </motion.button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* File Upload Zone */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Upload className="h-5 w-5 text-emerald-500" />
                      {t('data_import_export.upload_title')}
                    </CardTitle>
                    <CardDescription>{t('data_import_export.upload_subtitle')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div
                      onDragEnter={handleDragIn}
                      onDragLeave={handleDragOut}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 md:p-12 text-center transition-all ${
                        dragActive
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.02]'
                          : selectedFile
                            ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20'
                            : 'border-muted hover:border-emerald-300 dark:hover:border-emerald-700'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.json"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                        }}
                      />
                      <motion.div
                        animate={dragActive ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className={`rounded-full p-4 ${dragActive ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-muted'}`}>
                          <Upload className={`h-8 w-8 ${dragActive ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {dragActive ? t('data_import_export.drag_drop_active') : t('data_import_export.drag_drop')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {t('data_import_export.supported_formats')} &bull; {t('data_import_export.max_file_size')}
                          </p>
                        </div>
                      </motion.div>
                      {selectedFile && !dragActive && (
                        <div className="mt-4 flex items-center justify-center gap-2">
                          <FileText className="h-4 w-4 text-emerald-500" />
                          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">{selectedFile.name}</span>
                          <span className="text-xs text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 ml-1"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFile(null);
                              setParsedData(null);
                              setColumnMapping({});
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Column Mapping */}
              <AnimatePresence>
                {parsedData && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <MapPin className="h-5 w-5 text-emerald-500" />
                          {t('data_import_export.column_mapping')}
                        </CardTitle>
                        <CardDescription>{t('data_import_export.column_mapping_desc')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {parsedData.headers.map((header) => (
                            <div key={header} className="flex items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-foreground truncate block">{header}</span>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                              <div className="flex-1">
                                <Select
                                  value={columnMapping[header] || ''}
                                  onValueChange={(val) => {
                                    setColumnMapping((prev) => ({ ...prev, [header]: val }));
                                  }}
                                >
                                  <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('data_import_export.db_field')} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="">-- {t('data_import_export.select_all')} --</SelectItem>
                                    {(IMPORT_FIELD_SCHEMAS[importType] || []).map((field) => (
                                      <SelectItem key={field.value} value={field.value}>
                                        {field.label}
                                        {field.required && <span className="text-red-500 ml-1">*</span>}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Data Preview */}
              <AnimatePresence>
                {parsedData && parsedData.rows.length > 0 && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Eye className="h-5 w-5 text-emerald-500" />
                          {t('data_import_export.preview')}
                        </CardTitle>
                        <CardDescription>{t('data_import_export.preview_desc')}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto rounded-lg border">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50">
                              <tr>
                                <th className="px-3 py-2 text-left font-medium text-muted-foreground">#</th>
                                {parsedData.headers.map((h) => (
                                  <th key={h} className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {parsedData.rows.map((row, idx) => (
                                <tr key={idx} className="border-t hover:bg-muted/30">
                                  <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                                  {parsedData.headers.map((h) => (
                                    <td key={h} className="px-3 py-2 max-w-[200px] truncate">{row[h] || '—'}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Import Progress & Result */}
              <AnimatePresence>
                {(importing || importResult) && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          {importing ? (
                            <Loader2 className="h-5 w-5 text-emerald-500 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          )}
                          {t('data_import_export.import_progress')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Progress value={importProgress} className="h-3" />
                        {importing && (
                          <p className="text-sm text-muted-foreground text-center">{t('data_import_export.importing')}</p>
                        )}
                        {importResult && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                            <div className="grid grid-cols-3 gap-4">
                              <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                                <p className="text-2xl font-bold text-emerald-600">{String(importResult.totalRows ?? 0)}</p>
                                <p className="text-xs text-muted-foreground">{t('data_import_export.total_rows')}</p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-teal-50 dark:bg-teal-950/30">
                                <p className="text-2xl font-bold text-teal-600">{String(importResult.created ?? 0)}</p>
                                <p className="text-xs text-muted-foreground">{t('data_import_export.success_rows')}</p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                                <p className="text-2xl font-bold text-amber-600">{String(importResult.skipped ?? 0)}</p>
                                <p className="text-xs text-muted-foreground">{t('data_import_export.error_rows')}</p>
                              </div>
                            </div>
                            {Array.isArray(importResult.errors) && importResult.errors.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium text-destructive">{t('data_import_export.validation_errors')}</p>
                                <div className="max-h-40 overflow-y-auto rounded-lg bg-red-50 dark:bg-red-950/30 p-3">
                                  {(importResult.errors as string[]).map((err: string, idx: number) => (
                                    <p key={idx} className="text-xs text-red-700 dark:text-red-300">{err}</p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Start Import Button */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-end">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-2 px-8"
                  disabled={!selectedFile || importing}
                  onClick={handleImport}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('data_import_export.importing')}
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      {t('data_import_export.start_import')}
                    </>
                  )}
                </Button>
              </motion.div>
            </>
          ) : (
            <NoAccessCard />
          )}
        </TabsContent>

        {/* ── EXPORT TAB ──────────────────────────────────────────── */}
        <TabsContent value="export" className="space-y-6 mt-6">
          {canExport ? (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Export Configuration */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Download className="h-5 w-5 text-emerald-500" />
                        {t('data_import_export.export_title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Export Type */}
                      <div className="space-y-2">
                        <Label>{t('data_import_export.export_type')}</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {[
                            { value: 'STUDENT', icon: GraduationCap, label: t('data_import_export.type_student') },
                            { value: 'GRADE', icon: ClipboardCheck, label: t('data_import_export.type_grade') },
                            { value: 'ATTENDANCE', icon: CalendarCheck, label: t('data_import_export.type_attendance') },
                            { value: 'COMPETENCY', icon: BarChart3, label: t('data_import_export.type_competency') },
                            { value: 'REPORT', icon: FileText, label: t('data_import_export.type_report') },
                          ].map((item) => (
                            <motion.button
                              key={item.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setExportType(item.value)}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border-2 transition-all text-sm ${
                                exportType === item.value
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                                  : 'border-muted hover:border-emerald-300'
                              }`}
                            >
                              <item.icon className={`h-4 w-4 ${exportType === item.value ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                              <span className={exportType === item.value ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-muted-foreground'}>
                                {item.label}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Export Format */}
                      <div className="space-y-2">
                        <Label>{t('data_import_export.export_format')}</Label>
                        <div className="flex gap-3">
                          {[
                            { value: 'CSV', icon: FileSpreadsheet, label: t('data_import_export.format_csv') },
                            { value: 'JSON', icon: FileText, label: t('data_import_export.format_json') },
                          ].map((item) => (
                            <motion.button
                              key={item.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => setExportFormat(item.value)}
                              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                                exportFormat === item.value
                                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30'
                                  : 'border-muted hover:border-emerald-300'
                              }`}
                            >
                              <item.icon className={`h-4 w-4 ${exportFormat === item.value ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                              <span className={exportFormat === item.value ? 'text-emerald-700 dark:text-emerald-300 font-medium' : 'text-muted-foreground'}>
                                {item.label}
                              </span>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      {/* Date Range */}
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {t('data_import_export.date_range')}
                        </Label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('data_import_export.date_from')}</Label>
                            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                          </div>
                          <div>
                            <Label className="text-xs text-muted-foreground">{t('data_import_export.date_to')}</Label>
                            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {/* Class & Subject Filters */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>{t('data_import_export.class_filter')}</Label>
                          <Input placeholder={t('data_import_export.all_classes')} value={classFilter} onChange={(e) => setClassFilter(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <Label>{t('data_import_export.subject_filter')}</Label>
                          <Input placeholder={t('data_import_export.all_subjects')} value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)} />
                        </div>
                      </div>

                      {/* Options */}
                      <div className="space-y-2">
                        <Label>{t('data_import_export.export_options')}</Label>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox id="headers" checked={includeHeaders} onCheckedChange={(v) => setIncludeHeaders(!!v)} />
                            <Label htmlFor="headers" className="text-sm font-normal">{t('data_import_export.include_headers')}</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id="metadata" checked={includeMetadata} onCheckedChange={(v) => setIncludeMetadata(!!v)} />
                            <Label htmlFor="metadata" className="text-sm font-normal">{t('data_import_export.include_metadata')}</Label>
                          </div>
                        </div>
                      </div>

                      {/* Export Button */}
                      <Button
                        size="lg"
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-2"
                        disabled={exporting}
                        onClick={handleExport}
                      >
                        {exporting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {t('data_import_export.exporting')}
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            {t('data_import_export.start_export')}
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Export Templates & Result */}
                <div className="space-y-6">
                  {/* Export Templates */}
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Sparkles className="h-5 w-5 text-emerald-500" />
                          {t('data_import_export.export_templates')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {[
                          { key: 'template_full', types: ['STUDENT', 'GRADE', 'ATTENDANCE', 'COMPETENCY'], formats: ['CSV', 'JSON'] },
                          { key: 'template_grades_only', types: ['GRADE'], formats: ['CSV'] },
                          { key: 'template_attendance_only', types: ['ATTENDANCE'], formats: ['CSV'] },
                          { key: 'template_competency_only', types: ['COMPETENCY'], formats: ['CSV', 'JSON'] },
                        ].map((template) => (
                          <motion.button
                            key={template.key}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => {
                              setExportType(template.types[0]);
                              setExportFormat(template.formats[0]);
                            }}
                            className="w-full flex items-center justify-between p-3 rounded-lg border border-muted hover:border-emerald-300 dark:hover:border-emerald-700 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{t(`data_import_export.${template.key}`)}</span>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </motion.button>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Export Result */}
                  <AnimatePresence>
                    {exportResult && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <Card className="border-emerald-200 dark:border-emerald-800">
                          <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-lg">
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              {t('data_import_export.export_success')}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 rounded-lg bg-muted/50">
                                <p className="text-lg font-bold">{String(exportResult.recordCount ?? 0)}</p>
                                <p className="text-xs text-muted-foreground">{t('data_import_export.records')}</p>
                              </div>
                              <div className="text-center p-3 rounded-lg bg-muted/50">
                                <p className="text-lg font-bold">{formatFileSize(Number(exportResult.fileSize ?? 0))}</p>
                                <p className="text-xs text-muted-foreground">{t('data_import_export.file_size')}</p>
                              </div>
                            </div>
                            {exportResult.fileData && (
                              <Button
                                className="w-full gap-2"
                                variant="outline"
                                onClick={() => handleDownload(
                                  String(exportResult.fileData),
                                  String(exportResult.fileName || 'export')
                                )}
                              >
                                <Download className="h-4 w-4" />
                                {t('data_import_export.download')} — {String(exportResult.fileName)}
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </>
          ) : (
            <NoAccessCard />
          )}
        </TabsContent>

        {/* ── HISTORY TAB ─────────────────────────────────────────── */}
        <TabsContent value="history" className="space-y-6 mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t('data_import_export.history_title')}</h2>
            <Button variant="outline" size="sm" className="gap-2" onClick={loadHistory} disabled={historyLoading}>
              <RefreshCw className={`h-4 w-4 ${historyLoading ? 'animate-spin' : ''}`} />
              {t('action.refresh')}
            </Button>
          </div>

          {/* Import History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5 text-emerald-500" />
                {t('data_import_export.import_history')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {importJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{t('data_import_export.no_history')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.file_name')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.status')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.total_rows')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.success_rows')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.error_rows')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.created_at')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importJobs.map((job) => (
                        <tr key={job.id} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{job.fileName}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                          <td className="px-3 py-2">{job.totalRows}</td>
                          <td className="px-3 py-2 text-emerald-600 font-medium">{job.successRows}</td>
                          <td className="px-3 py-2 text-red-600 font-medium">{job.errorRows}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Export History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5 text-emerald-500" />
                {t('data_import_export.history_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {exportJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Download className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{t('data_import_export.no_history')}</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.file_name')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.export_format')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.file_size')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.status')}</th>
                        <th className="px-3 py-2 text-left font-medium">{t('data_import_export.created_at')}</th>
                        <th className="px-3 py-2 text-left font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {exportJobs.map((job) => (
                        <tr key={job.id} className="border-t hover:bg-muted/30">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="truncate max-w-[200px]">{job.fileName || '—'}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2"><Badge variant="outline">{job.format}</Badge></td>
                          <td className="px-3 py-2 text-muted-foreground">{formatFileSize(job.fileSize)}</td>
                          <td className="px-3 py-2"><StatusBadge status={job.status} /></td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(job.createdAt).toLocaleDateString()}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              {job.status === 'completed' && job.fileData && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1"
                                  onClick={() => handleDownload(job.fileData!, job.fileName || 'export')}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              )}
                              {isAdmin && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 gap-1 text-destructive"
                                  onClick={() => handleDeleteExport(job.id)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MANAGEMENT TAB ──────────────────────────────────────── */}
        <TabsContent value="management" className="space-y-6 mt-6">
          {canManage ? (
            <>
              {/* Database Statistics */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <BarChart3 className="h-5 w-5 text-emerald-500" />
                        {t('data_import_export.db_statistics')}
                      </CardTitle>
                      <Button variant="outline" size="sm" className="gap-2" onClick={loadStats} disabled={statsLoading}>
                        <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                        {t('action.refresh')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {statsLoading && !dbStats ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
                        ))}
                      </div>
                    ) : dbStats ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {statCards.map((card) => (
                          <motion.div
                            key={card.label}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.03 }}
                            className="relative overflow-hidden rounded-xl p-4 border border-muted"
                          >
                            <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-10`} />
                            <div className="relative z-10">
                              <card.icon className="h-5 w-5 text-muted-foreground mb-2" />
                              <p className="text-2xl font-bold text-foreground">
                                <AnimatedCounter value={card.value} />
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Cleanup Tools */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Trash2 className="h-5 w-5 text-emerald-500" />
                        {t('data_import_export.cleanup_tools')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Orphaned Records */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-muted">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-2">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t('data_import_export.remove_orphans')}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('data_import_export.remove_orphans_desc')}
                              {cleanupInfo && ` (${cleanupInfo.totalOrphans} ${t('data_import_export.records')})`}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive"
                          disabled={!canCleanup || !cleanupInfo || cleanupInfo.totalOrphans === 0}
                          onClick={() => {
                            setConfirmDialog({
                              open: true,
                              type: 'cleanup',
                              onConfirm: () => handleCleanup('remove_orphans'),
                            });
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Bulk Delete */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-muted">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-red-100 dark:bg-red-900/30 p-2">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t('data_import_export.bulk_delete')}</p>
                            <p className="text-xs text-muted-foreground">{t('data_import_export.bulk_delete_desc')}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1 text-destructive"
                          disabled={!canCleanup}
                          onClick={() => {
                            toast.info('Use the import/export features to manage specific records');
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Backup & Restore */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Archive className="h-5 w-5 text-emerald-500" />
                        {t('data_import_export.backup')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Create Backup */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-muted">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-emerald-100 dark:bg-emerald-900/30 p-2">
                            <Archive className="h-4 w-4 text-emerald-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t('data_import_export.backup')}</p>
                            <p className="text-xs text-muted-foreground">{t('data_import_export.backup_desc')}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={!canCleanup}
                          onClick={() => handleCleanup('backup')}
                        >
                          <Archive className="h-3 w-3" />
                        </Button>
                      </div>

                      {/* Restore Backup */}
                      <div className="flex items-center justify-between p-3 rounded-lg border border-muted">
                        <div className="flex items-center gap-3">
                          <div className="rounded-lg bg-teal-100 dark:bg-teal-900/30 p-2">
                            <RefreshCw className="h-4 w-4 text-teal-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{t('data_import_export.restore')}</p>
                            <p className="text-xs text-muted-foreground">{t('data_import_export.restore_desc')}</p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={!canCleanup}
                          onClick={() => {
                            toast.info('Backup restore requires server-side access. Contact your administrator.');
                          }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Info Banner */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <Info className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                  <div className="text-sm text-emerald-800 dark:text-emerald-200">
                    <p className="font-medium mb-1">Data Management Best Practices</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Always create a backup before performing bulk operations</li>
                      <li>Review the data preview before importing to catch errors early</li>
                      <li>Use column mapping to ensure correct field alignment</li>
                      <li>Run cleanup periodically to remove orphaned records</li>
                      <li>Export data regularly for archival purposes</li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <NoAccessCard />
          )}
        </TabsContent>
      </Tabs>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, type: confirmDialog.type, onConfirm: confirmDialog.onConfirm })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {confirmDialog.type === 'cleanup' ? t('data_import_export.confirm_cleanup') : t('data_import_export.confirm_delete')}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'cleanup' ? t('data_import_export.confirm_cleanup_msg') : t('data_import_export.confirm_delete_msg')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog({ open: false, type: '', onConfirm: () => {} })}>
              {t('action.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDialog.onConfirm}
            >
              {t('action.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── No Access Card ─────────────────────────────────────────────────

function NoAccessCard() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="rounded-full bg-rose-100 dark:bg-rose-900/30 p-6">
        <Shield className="h-12 w-12 text-rose-500" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">{t('data_import_export.no_access')}</h2>
      <p className="text-muted-foreground text-center max-w-md">{t('data_import_export.no_access_desc')}</p>
    </div>
  );
}
