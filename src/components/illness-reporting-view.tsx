'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart,
  Plus,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Calendar,
  List,
  Shield,
  User,
  Users,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  BadgeCheck,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { toast } from 'sonner';

interface IllnessReport {
  id: string;
  schoolId: string;
  studentId: string;
  reportedBy: string;
  reporterType: string;
  reason: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  documentUrl: string | null;
  parentApprovalStatus: string;
  parentApprovedBy: string | null;
  parentApprovedAt: string | null;
  isVisibleToTeacher: boolean;
  isVisibleToAdmin: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  student?: { id: string; firstName: string; lastName: string };
  reporter?: { id: string; firstName: string; lastName: string };
  approver?: { id: string; firstName: string; lastName: string } | null;
}

export default function IllnessReportingView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [reports, setReports] = useState<IllnessReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const fetchReports = useCallback(async () => {
    try {
      const data = await apiGet<IllnessReport[]>('/api/illness-reports');
      setReports(data);
    } catch (error) {
      console.error('Failed to fetch illness reports:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const role = currentUser?.role;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Heart className="h-7 w-7 text-emerald-500" />
            {t('illness.title')}
          </h1>
          <p className="text-muted-foreground mt-1">
            {role === 'STUDENT' && t('illness.my_reports')}
            {role === 'PARENT' && t('illness.children_reports')}
            {role === 'TEACHER' && t('illness.class_absences')}
            {(role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') && t('illness.all_reports')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
            >
              <List className="h-4 w-4 mr-1" />
              {t('illness.list_view')}
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
              className={viewMode === 'calendar' ? 'bg-emerald-500 hover:bg-emerald-600 text-white' : ''}
            >
              <Calendar className="h-4 w-4 mr-1" />
              {t('illness.calendar_view')}
            </Button>
          </div>
          {(role === 'STUDENT' || role === 'PARENT') && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('illness.report')}
            </Button>
          )}
        </div>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards reports={reports} role={role} />

      {/* Parent Approval Warning for Students */}
      {role === 'STUDENT' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200">{t('illness.parent_approval_needed')}</p>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{t('illness.parent_approval_desc')}</p>
          </div>
        </motion.div>
      )}

      {/* Main Content */}
      {viewMode === 'list' ? (
        <ListView reports={reports} role={role} currentUserId={currentUser?.id || ''} onRefresh={fetchReports} />
      ) : (
        <CalendarView reports={reports} role={role} />
      )}

      {/* Create Dialog */}
      <CreateReportDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        role={role}
        userId={currentUser?.id || ''}
        schoolId={currentUser?.schoolId || ''}
        onCreated={fetchReports}
      />
    </div>
  );
}

function StatsCards({ reports, role }: { reports: IllnessReport[]; role: string | undefined }) {
  const pending = reports.filter((r) => r.parentApprovalStatus === 'pending').length;
  const approved = reports.filter((r) => r.parentApprovalStatus === 'approved').length;
  const rejected = reports.filter((r) => r.parentApprovalStatus === 'rejected').length;
  const totalDays = reports
    .filter((r) => r.parentApprovalStatus === 'approved')
    .reduce((acc, r) => {
      const start = new Date(r.startDate);
      const end = r.endDate ? new Date(r.endDate) : start;
      return acc + Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    }, 0);

  const stats = [
    { label: t('illness.pending_reports'), value: pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: t('illness.approved_reports'), value: approved, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: t('illness.rejected_reports'), value: rejected, icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/30' },
    { label: t('illness.total_absences'), value: totalDays, icon: CalendarDays, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/30' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, idx) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
        >
          <Card className={`border-0 ${stat.bg} overflow-hidden relative`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <motion.p
                    className="text-2xl font-bold mt-1"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.1 + 0.2 }}
                  >
                    {stat.value}
                  </motion.p>
                </div>
                <div className={`h-10 w-10 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-current to-transparent opacity-10" />
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

function ListView({ reports, role, currentUserId, onRefresh }: { reports: IllnessReport[]; role: string | undefined; currentUserId: string; onRefresh: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (reports.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="border-dashed">
          <CardContent className="p-8 flex flex-col items-center justify-center text-center">
            <Heart className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">{t('illness.no_reports')}</p>
            <p className="text-sm text-muted-foreground/70 mt-1">{t('illness.create_first')}</p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  const pendingReports = reports.filter((r) => r.parentApprovalStatus === 'pending');
  const processedReports = reports.filter((r) => r.parentApprovalStatus !== 'pending');

  return (
    <div className="space-y-6">
      {/* Pending Approvals Section (for Parent) */}
      {role === 'PARENT' && pendingReports.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {t('illness.pending_approvals')} ({pendingReports.length})
          </h2>
          <div className="space-y-3">
            {pendingReports.map((report, idx) => (
              <ReportCard
                key={report.id}
                report={report}
                role={role}
                currentUserId={currentUserId}
                expanded={expandedId === report.id}
                onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
                onRefresh={onRefresh}
                idx={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Reports */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-5 w-5 text-emerald-500" />
          {role === 'PARENT' ? t('illness.children_reports') : t('illness.my_reports')}
        </h2>
        <div className="space-y-3">
          {reports.map((report, idx) => (
            <ReportCard
              key={report.id}
              report={report}
              role={role}
              currentUserId={currentUserId}
              expanded={expandedId === report.id}
              onToggle={() => setExpandedId(expandedId === report.id ? null : report.id)}
              onRefresh={onRefresh}
              idx={idx}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ReportCard({
  report,
  role,
  currentUserId,
  expanded,
  onToggle,
  onRefresh,
  idx,
}: {
  report: IllnessReport;
  role: string | undefined;
  currentUserId: string;
  expanded: boolean;
  onToggle: () => void;
  onRefresh: () => void;
  idx: number;
}) {
  const [isApproving, setIsApproving] = useState(false);

  const getStatusBadge = () => {
    switch (report.parentApprovalStatus) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-800"><Clock className="h-3 w-3 mr-1" />{t('illness.pending_approval')}</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-800"><CheckCircle2 className="h-3 w-3 mr-1" />{t('illness.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-800"><XCircle className="h-3 w-3 mr-1" />{t('illness.rejected')}</Badge>;
      default:
        return null;
    }
  };

  const getReasonLabel = (reason: string) => {
    switch (reason) {
      case 'illness': return t('illness.illness');
      case 'doctor_visit': return t('illness.doctor_visit');
      case 'other': return t('illness.other');
      default: return reason;
    }
  };

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await apiPost('/api/illness-reports/approve', { reportId: report.id, action: 'approve' });
      toast.success(t('illness.approve_success'));
      onRefresh();
    } catch (error) {
      toast.error(t('illness.error_approve'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsApproving(true);
    try {
      await apiPost('/api/illness-reports/approve', { reportId: report.id, action: 'reject' });
      toast.success(t('illness.reject_success'));
      onRefresh();
    } catch (error) {
      toast.error(t('illness.error_reject'));
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await apiDelete(`/api/illness-reports/${report.id}`);
      toast.success(t('illness.delete_success'));
      onRefresh();
    } catch (error) {
      toast.error('Error deleting report');
    }
  };

  const startDate = new Date(report.startDate);
  const endDate = report.endDate ? new Date(report.endDate) : null;
  const days = endDate
    ? Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1)
    : 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.05 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{getReasonLabel(report.reason)}</span>
                {getStatusBadge()}
                {report.reporterType === 'student' && (
                  <Badge variant="secondary" className="text-xs"><User className="h-3 w-3 mr-1" />{t('illness.student_report')}</Badge>
                )}
                {report.reporterType === 'parent' && (
                  <Badge variant="secondary" className="text-xs"><BadgeCheck className="h-3 w-3 mr-1" />{t('illness.parent_report')}</Badge>
                )}
                {!report.isVisibleToTeacher && role === 'STUDENT' && (
                  <Badge variant="secondary" className="text-xs"><EyeOff className="h-3 w-3 mr-1" />{t('illness.not_visible_teacher')}</Badge>
                )}
                {report.isVisibleToTeacher && (
                  <Badge variant="secondary" className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"><Eye className="h-3 w-3 mr-1" />{t('illness.visible_teacher')}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {startDate.toLocaleDateString()}
                  {endDate && ` - ${endDate.toLocaleDateString()}`}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {days} {t('illness.days_absent')}
                </span>
              </div>
              {/* Date range visualization */}
              <div className="mt-2 flex items-center gap-1">
                {Array.from({ length: Math.min(days, 14) }).map((_, i) => (
                  <motion.div
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${
                      report.parentApprovalStatus === 'approved' ? 'bg-emerald-400' :
                      report.parentApprovalStatus === 'pending' ? 'bg-amber-400' : 'bg-rose-400'
                    }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    style={{ transformOrigin: 'left' }}
                  />
                ))}
                {days > 14 && <span className="text-xs text-muted-foreground ml-1">+{days - 14}</span>}
              </div>
              {report.student && role !== 'STUDENT' && (
                <p className="text-sm text-muted-foreground mt-1">
                  {report.student.firstName} {report.student.lastName}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1">
              {(role === 'PARENT' && report.parentApprovalStatus === 'pending') && (
                <>
                  <Button
                    size="sm"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
                    onClick={handleApprove}
                    disabled={isApproving}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    {t('illness.approve')}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    onClick={handleReject}
                    disabled={isApproving}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    {t('illness.reject')}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggle}>
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Separator className="my-3" />
                <div className="space-y-2 text-sm">
                  {report.description && (
                    <div>
                      <span className="text-muted-foreground">{t('illness.description')}:</span>
                      <p className="mt-1">{report.description}</p>
                    </div>
                  )}
                  {report.documentUrl && (
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      <a href={report.documentUrl} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline">
                        {t('illness.medical_certificate')}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{t('illness.reported_on')}: {new Date(report.createdAt).toLocaleDateString()}</span>
                    {report.reporter && (
                      <span>{t('illness.reported_by')}: {report.reporter.firstName} {report.reporter.lastName}</span>
                    )}
                  </div>
                  {report.approver && (
                    <div className="text-muted-foreground">
                      <span>{t('illness.approved_by')}: {report.approver.firstName} {report.approver.lastName}</span>
                      {report.parentApprovedAt && (
                        <span className="ml-2">{t('illness.approved_on')}: {new Date(report.parentApprovedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                  )}
                  {(report.reportedBy === currentUserId || role === 'SCHOOL_ADMIN' || role === 'VICE_PRINCIPAL') && (
                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="h-7 text-rose-600" onClick={handleDelete}>
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        {t('action.delete')}
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function CalendarView({ reports, role }: { reports: IllnessReport[]; role: string | undefined }) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

  const getReportsForDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return reports.filter((r) => {
      const start = new Date(r.startDate);
      const end = r.endDate ? new Date(r.endDate) : start;
      return date >= start && date <= end;
    });
  };

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{monthName}</CardTitle>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
          ))}
          {Array.from({ length: adjustedFirstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-16" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dayReports = getReportsForDay(day);
            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
            return (
              <div
                key={day}
                className={`h-16 border rounded-md p-1 text-xs ${
                  isToday ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800' : 'border-muted'
                }`}
              >
                <span className={`font-medium ${isToday ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>{day}</span>
                <div className="mt-0.5 space-y-0.5">
                  {dayReports.slice(0, 2).map((r) => (
                    <div
                      key={r.id}
                      className={`h-1.5 rounded-full ${
                        r.parentApprovalStatus === 'approved' ? 'bg-emerald-400' :
                        r.parentApprovalStatus === 'pending' ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                    />
                  ))}
                  {dayReports.length > 2 && (
                    <div className="text-muted-foreground">+{dayReports.length - 2}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-emerald-400" />{t('illness.approved')}</div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-amber-400" />{t('illness.pending_approval')}</div>
          <div className="flex items-center gap-1"><div className="h-2 w-2 rounded-full bg-rose-400" />{t('illness.rejected')}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateReportDialog({
  open,
  onOpenChange,
  role,
  userId,
  schoolId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: string | undefined;
  userId: string;
  schoolId: string;
  onCreated: () => void;
}) {
  const [reason, setReason] = useState('illness');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [children, setChildren] = useState<Array<{ id: string; firstName: string; lastName: string }>>([]);

  useEffect(() => {
    if (open && role === 'PARENT') {
      apiGet<Array<{ studentId: string; student: { id: string; firstName: string; lastName: string } }>>(
        `/api/parent-links?parentId=${userId}`
      ).then((data) => {
        const kids = data.map((d) => ({ id: d.student.id, firstName: d.student.firstName, lastName: d.student.lastName }));
        setChildren(kids);
        if (kids.length > 0) setSelectedStudentId(kids[0].id);
      }).catch(() => {});
    }
    if (open && role === 'STUDENT') {
      // Find the student record
      apiGet<Array<{ id: string }>>('/api/students?userId=' + userId).then((data) => {
        if (data.length > 0) setSelectedStudentId(data[0].id);
      }).catch(() => {});
    }
  }, [open, role, userId]);

  const handleSubmit = async () => {
    if (!selectedStudentId || !reason || !startDate) return;
    setIsSubmitting(true);
    try {
      await apiPost('/api/illness-reports', {
        studentId: selectedStudentId,
        reason,
        description: description || null,
        startDate,
        endDate: endDate || null,
      });
      toast.success(t('illness.report_success'));
      onOpenChange(false);
      setReason('illness');
      setDescription('');
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate('');
      onCreated();
    } catch (error) {
      toast.error(t('illness.error_create'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-emerald-500" />
            {t('illness.report')}
          </DialogTitle>
          <DialogDescription>
            {role === 'STUDENT' ? t('illness.parent_approval_desc') : t('illness.auto_approved')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Student Selection (Parent only) */}
          {role === 'PARENT' && children.length > 0 && (
            <div>
              <Label>{t('illness.children_reports')}</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {children.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label>{t('illness.reason')}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="illness">{t('illness.illness')}</SelectItem>
                <SelectItem value="doctor_visit">{t('illness.doctor_visit')}</SelectItem>
                <SelectItem value="other">{t('illness.other')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>{t('illness.start_date')}</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <Label>{t('illness.end_date')}</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>{t('illness.description')}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('illness.description')}
              rows={3}
            />
          </div>

          {/* Medical Certificate Upload placeholder */}
          <div>
            <Label>{t('illness.medical_certificate')}</Label>
            <div className="mt-1 border-2 border-dashed border-emerald-300 dark:border-emerald-700 rounded-xl p-6 text-center text-muted-foreground hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all duration-300 cursor-pointer group">
              <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium">{t('illness.upload_certificate')}</p>
              <p className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('action.cancel')}</Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedStudentId || !startDate}
            className="bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : t('action.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
