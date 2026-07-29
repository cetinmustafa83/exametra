'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText, Plus, Eye, Download, Check, PenLine, BookOpen, Printer,
  School, Clock, Sparkles, FileEdit, FileCheck, FileType,
  CheckCircle, BarChart3, ClipboardList, FileDown, Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import {
  fetchClasses, fetchClassStudents,
  fetchReports, createReport, updateReport, getReportPdfUrl,
  fetchCompetenceFlower, addNotification,
  type ClassGroup, type Student, type Report,
} from '@/lib/api';
import { toast } from 'sonner';

const relativeDate = (dateStr: string) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor(diffMs / (1000 * 60));
  if (diffMins < 60) return `${Math.max(diffMins, 0)}m`;
  if (diffHrs < 24) return `${diffHrs}h`;
  if (diffDays === 0) return t('date.today');
  if (diffDays === 1) return t('date.yesterday');
  if (diffDays < 7) return t('date.days_ago', { count: diffDays });
  if (diffDays < 30) return t('date.weeks_ago', { count: Math.floor(diffDays / 7) });
  return date.toLocaleDateString();
};

function reportCompletionPct(r: Report): number {
  if (r.sections.length === 0) return 0;
  const filled = r.sections.filter((s) => s.generatedText && s.generatedText.trim().length > 0).length;
  return Math.round((filled / r.sections.length) * 100);
}

export default function ReportsView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const currentClassId = useAppStore((s) => s.currentClassId);

  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingReports, setLoadingReports] = useState(false);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [newStudentId, setNewStudentId] = useState('');
  const [newPeriod, setNewPeriod] = useState('Semester 1');
  const [newIncludesGrades, setNewIncludesGrades] = useState(false);
  const [creating, setCreating] = useState(false);

  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false);

  // PDF generation
  const [pdfTemplate, setPdfTemplate] = useState<'short' | 'full' | 'custom'>('full');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [downloadHistory, setDownloadHistory] = useState<Array<{ id: string; studentName: string; template: string; date: string }>>([]);
  const [batchGenerating, setBatchGenerating] = useState(false);

  // Edit section
  const [editingSection, setEditingSection] = useState<{ id: string; text: string } | null>(null);

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
    setLoadingReports(true);
    try {
      const [s, r] = await Promise.all([
        fetchClassStudents(cls.id),
        fetchReports({ classGroupId: cls.id }),
      ]);
      setStudents(s);
      setReports(r);
    } catch {
      // ignore
    } finally {
      setLoadingReports(false);
    }
  };

  const handleCreateReport = async () => {
    if (!selectedClass || !currentUser || !newStudentId) return;
    setCreating(true);
    try {
      const report = await createReport({
        studentId: newStudentId,
        classGroupId: selectedClass.id,
        schoolYearId: selectedClass.schoolYearId,
        period: newPeriod,
        includesGrades: newIncludesGrades,
      });
      toast.success(t('toast.created'));
      addNotification({
        type: 'report',
        message: `${t('notification.report_generated')}: ${newStudentId}`,
        timestamp: new Date().toISOString(),
      });
      setCreateOpen(false);
      setNewStudentId('');
      const r = await fetchReports({ classGroupId: selectedClass.id });
      setReports(r);
      const newReport = r.find((rp) => rp.id === report.id);
      if (newReport) setSelectedReport(newReport);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    } finally {
      setCreating(false);
    }
  };

  const handleFinalize = async (report: Report) => {
    try {
      await updateReport({ id: report.id, status: 'FINAL' });
      toast.success(t('reports.report_finalized'));
      if (selectedClass) {
        const r = await fetchReports({ classGroupId: selectedClass.id });
        setReports(r);
        const updated = r.find((rp) => rp.id === report.id);
        if (updated) setSelectedReport(updated);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('error.generic'));
    }
  };

  const handleSaveSection = async () => {
    if (!editingSection || !selectedReport) return;
    toast.success(t('toast.saved'));
    setEditingSection(null);
  };

  const handleGeneratePdf = async (reportId: string) => {
    setGeneratingPdf(true);
    try {
      const url = `/api/reports/pdf?reportId=${reportId}&template=${pdfTemplate}`;
      window.open(url, '_blank');
      const student = selectedReport?.student;
      if (student) {
        setDownloadHistory((prev) => [{
          id: Date.now().toString(),
          studentName: `${student.firstName} ${student.lastName}`,
          template: pdfTemplate,
          date: new Date().toLocaleDateString(),
        }, ...prev]);
      }
      toast.success(t('reports.generate_pdf'));
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleBatchGenerate = async () => {
    if (!selectedClass) return;
    setBatchGenerating(true);
    try {
      for (const student of students) {
        const url = `/api/reports/pdf?studentId=${student.id}&template=${pdfTemplate}`;
        window.open(url, '_blank');
        setDownloadHistory((prev) => [{
          id: Date.now().toString() + student.id,
          studentName: `${student.firstName} ${student.lastName}`,
          template: pdfTemplate,
          date: new Date().toLocaleDateString(),
        }, ...prev]);
      }
      toast.success(t('reports.batch_generate'));
    } catch {
      toast.error(t('error.generic'));
    } finally {
      setBatchGenerating(false);
    }
  };

  const draftReports = reports.filter((r) => r.status === 'DRAFT');
  const finalReports = reports.filter((r) => r.status === 'FINAL');

  if (loading) {
    return <div className="space-y-4"><Skeleton className="h-96 rounded-xl" /></div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Section header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-300/30">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('reports.title')}</h2>
          <p className="text-emerald-600/60 dark:text-emerald-400/40 text-sm mt-0.5">{t('reports.empty_subtitle')}</p>
        </div>
      </div>

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
                <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('polish.please_choose')} />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedClass && (
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t('reports.generate')}
                </Button>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>

      {!selectedClass ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="relative border-0 shadow-sm rounded-xl overflow-hidden">
            {/* Subtle dot grid pattern background */}
            <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none" />
            <CardContent className="relative py-16 text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, type: 'spring' }}
                className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20"
              >
                <FileText className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
              </motion.div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_reports')}</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('reports.empty_subtitle')}</p>
            </CardContent>
          </Card>

          {/* Report Templates info card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
          <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-amber-400 overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                  <Sparkles className="h-4 w-4" />
                </div>
                {t('polish.report_templates_title')}
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-1 hidden sm:inline">
                  · {t('polish.report_templates_subtitle')}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Draft */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-50/60 to-amber-50/0 dark:from-amber-900/15 dark:to-amber-900/0 border border-amber-100/60 dark:border-amber-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-sm">
                      <FileEdit className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                      {t('polish.report_template_draft_name')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {t('polish.report_template_draft_desc')}
                  </p>
                </div>
                {/* Final */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-50/60 to-emerald-50/0 dark:from-emerald-900/15 dark:to-emerald-900/0 border border-emerald-100/60 dark:border-emerald-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-400 to-emerald-500 text-white shadow-sm">
                      <FileCheck className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      {t('polish.report_template_final_name')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {t('polish.report_template_final_desc')}
                  </p>
                </div>
                {/* PDF Export */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/60 to-teal-50/0 dark:from-teal-900/15 dark:to-teal-900/0 border border-teal-100/60 dark:border-teal-900/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-teal-500 text-white shadow-sm">
                      <FileType className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-teal-700 dark:text-teal-300">
                      {t('polish.report_template_pdf_name')}
                    </p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-snug">
                    {t('polish.report_template_pdf_desc')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          </motion.div>
        </motion.div>
      ) : loadingReports ? (
        <Skeleton className="h-96 rounded-xl" />
      ) : reports.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="py-16 text-center">
            <div className="flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 mx-auto mb-5 shadow-md shadow-emerald-200/40 dark:shadow-emerald-900/20">
              <FileText className="h-10 w-10 text-emerald-500 dark:text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('polish.empty_title_no_data')}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t('reports.no_reports')}</p>
            <Button className="mt-5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              {t('reports.generate')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Reports list */}
          <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                  <FileText className="h-4 w-4" />
                </div>
                {t('reports.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[70vh] overflow-y-auto scrollbar-education space-y-4">
              {draftReports.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600/60 dark:text-amber-400/40 mb-2">{t('reports.draft_reports')}</p>
                  <div className="space-y-2">
                    {draftReports.map((r) => (
                      <motion.div
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedReport(r)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedReport(r); }}
                        whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(245, 158, 11, 0.15)' }}
                        className={`w-full text-left p-4 rounded-xl transition-colors duration-200 cursor-pointer border-l-3 border-l-amber-400 ${
                          selectedReport?.id === r.id
                            ? 'bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                            : 'bg-gray-50/80 dark:bg-gray-800/50 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/30 dark:to-amber-800/30 text-amber-600 dark:text-amber-300 text-xs font-bold shrink-0">
                              {r.student.firstName[0]}{r.student.lastName[0]}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {r.student.firstName} {r.student.lastName}
                            </p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-medium rounded-xl animate-pulse-soft">
                            <FileText className="w-3 h-3 mr-0.5 inline" /> {t('status.draft')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-10">
                          {r.period} · {new Date(r.generatedAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {finalReports.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600/60 dark:text-emerald-400/40 mb-2">{t('reports.final_reports')}</p>
                  <div className="space-y-2">
                    {finalReports.map((r) => (
                      <motion.div
                        key={r.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedReport(r)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedReport(r); }}
                        whileHover={{ y: -2, boxShadow: '0 8px 25px -5px rgba(16, 185, 129, 0.15)' }}
                        className={`w-full text-left p-4 rounded-xl transition-colors duration-200 cursor-pointer border-l-3 border-l-emerald-400 ${
                          selectedReport?.id === r.id
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                            : 'bg-gray-50/80 dark:bg-gray-800/50 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/30 dark:to-emerald-800/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold shrink-0">
                              {r.student.firstName[0]}{r.student.lastName[0]}
                            </div>
                            <p className="font-semibold text-gray-900 dark:text-gray-100">
                              {r.student.firstName} {r.student.lastName}
                            </p>
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs font-medium rounded-xl">
                            <CheckCircle className="w-3 h-3 mr-0.5 inline" /> {t('status.final')}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-10">
                          {r.period} · {new Date(r.generatedAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Report detail */}
          <div className="lg:col-span-2 space-y-4">
            {!selectedReport ? (
              <Card className="border-0 shadow-sm rounded-xl overflow-hidden">
                <CardContent className="py-16 text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/20 mx-auto mb-4"
                  >
                    <FileText className="h-8 w-8 text-emerald-400 dark:text-emerald-500" />
                  </motion.div>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('action.select')}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Report header */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-emerald-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-emerald-50/50 to-transparent dark:from-emerald-900/10 dark:to-transparent">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                            <FileText className="h-4 w-4" />
                          </div>
                          {t('reports.preview')} — {selectedReport.student.firstName} {selectedReport.student.lastName}
                        </CardTitle>
                        <p className="text-sm text-emerald-600/60 dark:text-emerald-400/40 mt-1 flex items-center gap-1.5 flex-wrap">
                          <span>{selectedReport.period}</span>
                          <span>·</span>
                          <span>{selectedReport.classGroup.name}</span>
                          <span>·</span>
                          <span>{t('reports.generated_by')}: {selectedReport.generatedByUser.firstName} {selectedReport.generatedByUser.lastName}</span>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400">
                            <Clock className="h-3 w-3" />
                            {t('polish.last_edited')} {relativeDate(selectedReport.generatedAt)}
                          </span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {selectedReport.status === 'DRAFT' && (
                          <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-300/20 rounded-xl" onClick={() => handleFinalize(selectedReport)}>
                            <Check className="h-4 w-4 mr-1" />
                            {t('reports.finalize_report')}
                          </Button>
                        )}
                        <Button variant="outline" className="rounded-xl border-emerald-300 dark:border-emerald-700" onClick={() => setPreviewOpen(true)}>
                          <Eye className="h-4 w-4 mr-1" />
                          {t('action.preview')}
                        </Button>
                        <Button variant="outline" className="rounded-xl border-teal-300 dark:border-teal-700" onClick={() => {
                          const pdfUrl = getReportPdfUrl(selectedReport.id);
                          window.open(pdfUrl, '_blank');
                        }}>
                          <Printer className="h-4 w-4 mr-1" />
                          {t('pdf.print_view')}
                        </Button>
                        <Button variant="outline" className="rounded-xl border-emerald-300 dark:border-emerald-700" onClick={() => handleGeneratePdf(selectedReport.id)} disabled={generatingPdf}>
                          <FileDown className="h-4 w-4 mr-1" />
                          {generatingPdf ? t('empty.loading') : t('reports.generate_pdf')}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Status + completion */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={
                        selectedReport.status === 'DRAFT'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 rounded-xl'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-xl'
                      }>
                        {selectedReport.status === 'DRAFT' ? <FileText className="w-3.5 h-3.5 inline mr-0.5" /> : <CheckCircle className="w-3.5 h-3.5 inline mr-0.5" />} {selectedReport.status === 'DRAFT' ? t('status.draft') : t('status.final')}
                      </Badge>
                      {selectedReport.includesGrades && (
                        <Badge className="bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 rounded-xl">
                          <BarChart3 className="w-3.5 h-3.5 inline mr-0.5" /> {t('reports.includes_grades')}
                        </Badge>
                      )}
                    </div>

                    {/* Workflow status visualization */}
                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-50/40 to-teal-50/30 dark:from-emerald-900/10 dark:to-teal-900/10 border border-emerald-200/40 dark:border-emerald-900/20">
                      <div className="flex items-center justify-between gap-1">
                        {[
                          { key: 'draft', label: t('polish.workflow_draft'), active: true, color: 'bg-amber-500' },
                          { key: 'review', label: t('polish.workflow_review'), active: selectedReport.status !== 'DRAFT' || reportCompletionPct(selectedReport) === 100, color: 'bg-teal-500' },
                          { key: 'published', label: t('polish.workflow_published'), active: selectedReport.status === 'FINAL', color: 'bg-emerald-500' },
                        ].map((step, i, arr) => (
                          <React.Fragment key={step.key}>
                            <div className="flex flex-col items-center gap-1 flex-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${step.active ? step.color : 'bg-gray-300 dark:bg-gray-700'}`}>
                                {step.active ? <Check className="h-3.5 w-3.5" /> : i + 1}
                              </div>
                              <span className={`text-[10px] font-medium ${step.active ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>{step.label}</span>
                            </div>
                            {i < arr.length - 1 && (
                              <div className={`h-0.5 flex-1 rounded-full ${arr[i + 1].active ? step.color : 'bg-gray-200 dark:bg-gray-700'}`} />
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>

                    {/* Completion progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600/70 dark:text-emerald-400/60 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {t('polish.report_completion')}
                        </p>
                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {selectedReport.sections.filter((s) => s.generatedText && s.generatedText.trim().length > 0).length} / {selectedReport.sections.length}
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            reportCompletionPct(selectedReport) === 100
                              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
                              : 'bg-gradient-to-r from-amber-400 to-amber-500'
                          }`}
                          style={{ width: `${reportCompletionPct(selectedReport)}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </motion.div>

                {/* Report sections */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                >
                <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
                  <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      {t('reports.sections')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedReport.sections.length === 0 ? (
                      <div className="text-center py-8">
                        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-teal-100 dark:bg-teal-900/20 mx-auto mb-4">
                          <BookOpen className="h-8 w-8 text-teal-400 dark:text-teal-500" />
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('empty.no_items')}</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-education">
                        {selectedReport.sections.map((section) => (
                          <div
                            key={section.id}
                            className="p-5 rounded-xl bg-gray-50/80 dark:bg-gray-800/30 border-l-3 transition-shadow duration-200 hover:shadow-md"
                            style={{ borderLeftColor: section.competencyCategory?.color ?? '#10b981' }}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                {section.competencyCategory && (
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: section.competencyCategory.color ?? '#10b981' }}
                                  />
                                )}
                                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">
                                  {section.competencyCategory?.name ?? `${t('reports.section_text')} ${section.order + 1}`}
                                </p>
                              </div>
                              {selectedReport.status === 'DRAFT' && (
                                <Button size="sm" variant="ghost" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 rounded-xl" onClick={() => setEditingSection({ id: section.id, text: section.generatedText })}>
                                  <PenLine className="h-3 w-3 mr-1" />
                                  {t('action.edit')}
                                </Button>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">{section.generatedText}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
                </motion.div>
              </>
            )}
          </div>
        </motion.div>
      )}

      {/* Create report dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('reports.generate_title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('reports.select_student')}</Label>
              <Select value={newStudentId} onValueChange={setNewStudentId}>
                <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                  <SelectValue placeholder={t('reports.select_student')} />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('reports.select_period')}</Label>
              <Select value={newPeriod} onValueChange={setNewPeriod}>
                <SelectTrigger className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Semester 1">Semester 1</SelectItem>
                  <SelectItem value="Semester 2">Semester 2</SelectItem>
                  <SelectItem value="Halbjahr 1">Halbjahr 1</SelectItem>
                  <SelectItem value="Halbjahr 2">Halbjahr 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10">
              <input
                type="checkbox"
                checked={newIncludesGrades}
                onChange={(e) => setNewIncludesGrades(e.target.checked)}
                className="rounded border-emerald-300 text-emerald-500 focus:ring-emerald-400"
              />
              <Label className="text-sm font-medium">{t('reports.includes_grades')}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={handleCreateReport} disabled={creating || !newStudentId}>
              {creating ? t('empty.loading') : t('reports.generate')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl rounded-xl p-0 gap-0 overflow-hidden">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('polish.print_preview')}</DialogTitle>
          </DialogHeader>
          {/* Paper-style preview */}
          <div className="paper-preview px-8 py-10 sm:px-12 sm:py-14 max-h-[80vh] overflow-y-auto scrollbar-education print-avoid-break">
            {/* School header */}
            <div className="flex items-center justify-between border-b-2 border-emerald-600/30 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-md shadow-emerald-300/30">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight">
                    {selectedReport?.classGroup.name ? `${selectedReport.classGroup.name}` : t('polish.report_header')}
                  </p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">
                    {t('polish.report_logo')} · {selectedReport?.schoolYear?.label ?? ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('polish.report_header')}</p>
                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selectedReport?.period}</p>
              </div>
            </div>

            {/* Student info */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('polish.student_value')}</p>
              <p className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedReport?.student.firstName} {selectedReport?.student.lastName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {selectedReport?.classGroup.name} · {t('label.grade')} {selectedReport?.classGroup.gradeLevel}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-5">
              {selectedReport?.sections.map((section) => (
                <div key={section.id} className="space-y-1.5">
                  {section.competencyCategory && (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: section.competencyCategory.color ?? '#10b981' }}
                      />
                      <p className="font-bold text-gray-900 dark:text-gray-100 text-sm uppercase tracking-wide">
                        {section.competencyCategory.name}
                      </p>
                    </div>
                  )}
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-line leading-relaxed pl-4.5 font-serif">
                    {section.generatedText}
                  </p>
                </div>
              ))}
            </div>

            {/* Footer signature line */}
            <div className="mt-12 pt-6 border-t border-gray-300 dark:border-gray-700 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
              <div>
                <p className="mb-6">{t('reports.generated_by')}:</p>
                <div className="w-32 border-b border-gray-400 dark:border-gray-600" />
                <p className="mt-1">{selectedReport?.generatedByUser.firstName} {selectedReport?.generatedByUser.lastName}</p>
              </div>
              <div className="text-right">
                <p className="mb-6">{t('label.date')}:</p>
                <div className="w-32 border-b border-gray-400 dark:border-gray-600 ml-auto" />
                <p className="mt-1">{selectedReport ? new Date(selectedReport.generatedAt).toLocaleDateString() : ''}</p>
              </div>
            </div>
          </div>

          {/* Footer with action buttons */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-emerald-200/50 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50/30 to-transparent dark:from-emerald-900/10">
            <span className="text-xs text-emerald-600/70 dark:text-emerald-400/60 flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {t('polish.print_preview')}
            </span>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="rounded-xl">{t('action.close')}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* PDF Template Selection + Batch Generate */}
      {selectedClass && students.length > 0 && (
        <Card className="border-0 shadow-sm rounded-xl border-l-3 border-l-teal-500 overflow-hidden">
          <CardHeader className="pb-3 pt-6 bg-gradient-to-r from-teal-50/50 to-transparent dark:from-teal-900/10 dark:to-transparent">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400">
                <FileDown className="h-4 w-4" />
              </div>
              {t('reports.generate_pdf')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('reports.template')}</Label>
              <div className="flex gap-2">
                {(['short', 'full', 'custom'] as const).map((tmpl) => (
                  <Button
                    key={tmpl}
                    variant={pdfTemplate === tmpl ? 'default' : 'outline'}
                    size="sm"
                    className={pdfTemplate === tmpl ? 'bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px] rounded-xl' : 'min-h-[44px] rounded-xl'}
                    onClick={() => setPdfTemplate(tmpl)}
                  >
                    <span className="badge-type">{t(`reports.template_${tmpl}`)}</span>
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md rounded-xl min-h-[44px]"
                onClick={handleBatchGenerate}
                disabled={batchGenerating}
              >
                <Users className="h-4 w-4 mr-1.5" />
                {batchGenerating ? t('empty.loading') : t('reports.batch_generate')}
              </Button>
            </div>
            {downloadHistory.length > 0 && (
              <div className="space-y-2 mt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{t('reports.download_history')}</p>
                <div className="max-h-32 overflow-y-auto scrollbar-education space-y-1">
                  {downloadHistory.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="text-gray-700 dark:text-gray-300">{item.studentName}</span>
                      <span className="text-gray-500 dark:text-gray-400">{item.template} · {item.date}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Edit section dialog */}
      <Dialog open={!!editingSection} onOpenChange={() => setEditingSection(null)}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t('reports.edit_section')}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={editingSection?.text ?? ''}
            onChange={(e) => setEditingSection(editingSection ? { ...editingSection, text: e.target.value } : null)}
            rows={8}
            className="rounded-xl border-emerald-200/50 dark:border-emerald-900/30"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSection(null)} className="rounded-xl">{t('action.cancel')}</Button>
            <Button className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-md shadow-emerald-300/20" onClick={handleSaveSection}>
              {t('action.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
