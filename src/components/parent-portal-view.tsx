'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Heart, GraduationCap, Clock, CheckCircle2, XCircle,
  AlertCircle, Loader2, ChevronRight, Calendar, BookOpen,
  Shield, MessageSquare, Thermometer, TrendingUp, Timer,
  Plus, FileText, BarChart3,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { apiPost } from '@/lib/api';
import { toast } from 'sonner';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';
import { de as deLocale, enUS as enLocale } from 'date-fns/locale';

/* ── Types ─────────────────────────────────────────────────────────── */

interface ChildData {
  studentId: string;
  firstName: string;
  lastName: string;
  relationship: string | null;
  userId: string | null;
  classGroups: Array<{ id: string; name: string; gradeLevel: number }>;
  illnessReports: Array<{
    id: string;
    reason: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    parentApprovalStatus: string;
    status: string;
    reporterType: string;
    createdAt: string;
  }>;
  upcomingExams: Array<{
    id: string;
    title: string;
    date: string;
    startTime: string | null;
    endTime: string | null;
    subject: { id: string; name: string } | null;
    classGroup: { id: string; name: string } | null;
    daysUntil: number;
  }>;
  recentGrades: Array<{
    id: string;
    computedValue: number;
    period: string;
    subject: { id: string; name: string };
    classGroup: { id: string; name: string };
    computedAt: string;
  }>;
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    excused: number;
    late: number;
  };
  counselingAppointments: Array<{
    id: string;
    requestType: string;
    status: string;
    scheduledAt: string | null;
    description: string | null;
    counselor: { firstName: string; lastName: string };
  }>;
  disciplinaryCases: Array<{
    id: string;
    caseType: string;
    description: string;
    status: string;
    createdAt: string;
    resolution: string | null;
  }>;
}

interface PendingApproval {
  id: string;
  reason: string;
  description: string | null;
  startDate: string;
  endDate: string | null;
  parentApprovalStatus: string;
  status: string;
  reporterType: string;
  student: { id: string; firstName: string; lastName: string };
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function ParentPortalView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const localeCode = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  const [children, setChildren] = useState<ChildData[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showIllnessDialog, setShowIllnessDialog] = useState(false);
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [illnessForm, setIllnessForm] = useState({
    reason: 'illness',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  });
  const [conversationForm, setConversationForm] = useState({
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/parent-portal?schoolId=${currentUser.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children ?? []);
        setPendingApprovals(data.pendingApprovals ?? []);
        if (data.children?.length > 0 && !selectedChild) {
          setSelectedChild(data.children[0]);
        }
      }
    } catch {
      toast.error('Failed to load parent portal data');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.schoolId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApproveIllness = async (reportId: string) => {
    try {
      const res = await fetch(`/api/illness-reports/approve?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action: 'approve' }),
      });
      if (res.ok) {
        toast.success(t('parent_portal.illness_approved'));
        loadData();
      } else {
        toast.error('Failed to approve illness report');
      }
    } catch {
      toast.error('Failed to approve illness report');
    }
  };

  const handleRejectIllness = async (reportId: string) => {
    try {
      const res = await fetch(`/api/illness-reports/approve?XTransformPort=3000`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action: 'reject' }),
      });
      if (res.ok) {
        toast.success(t('parent_portal.illness_rejected'));
        loadData();
      } else {
        toast.error('Failed to reject illness report');
      }
    } catch {
      toast.error('Failed to reject illness report');
    }
  };

  const handleReportIllness = async () => {
    if (!currentUser?.schoolId || !selectedChild) return;
    setSubmitting(true);
    try {
      await apiPost('/api/illness-reports', {
        schoolId: currentUser.schoolId,
        studentId: selectedChild.studentId,
        reportedBy: currentUser.id,
        reporterType: 'parent',
        reason: illnessForm.reason,
        description: illnessForm.description,
        startDate: illnessForm.startDate,
        endDate: illnessForm.endDate || null,
      });
      toast.success(t('parent_portal.report_illness'));
      setShowIllnessDialog(false);
      setIllnessForm({ reason: 'illness', description: '', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: '' });
      loadData();
    } catch {
      toast.error('Failed to report illness');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestConversation = async () => {
    if (!currentUser?.schoolId || !selectedChild) return;
    setSubmitting(true);
    try {
      await apiPost('/api/counseling', {
        schoolId: currentUser.schoolId,
        studentId: selectedChild.userId,
        requestType: 'guidance',
        description: conversationForm.message,
      });
      toast.success(t('parent_portal.conversation_requested'));
      setShowConversationDialog(false);
      setConversationForm({ message: '' });
      loadData();
    } catch {
      toast.error('Failed to request conversation');
    } finally {
      setSubmitting(false);
    }
  };

  const getAttendanceRate = (summary: { total: number; present: number; excused: number }) => {
    if (summary.total === 0) return 100;
    return Math.round(((summary.present + summary.excused) / summary.total) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="space-y-6 pb-6">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shrink-0">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('parent_portal.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('parent_portal.subtitle')}
              </p>
            </div>
          </div>
        </motion.div>
        <Card className="border-emerald-100/60 dark:border-emerald-900/30">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-emerald-300/60 dark:text-emerald-700/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              {t('parent_portal.no_children')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('parent_portal.no_children_desc')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-300/40 dark:shadow-emerald-900/40 shrink-0">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t('parent_portal.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('parent_portal.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedChild && (
            <>
              <Button
                size="sm"
                onClick={() => setShowIllnessDialog(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]"
              >
                <Thermometer className="h-4 w-4 mr-1.5" />
                {t('parent_portal.report_illness')}
              </Button>
              <Button
                size="sm"
                onClick={() => setShowConversationDialog(true)}
                variant="outline"
                className="border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 min-h-[44px]"
              >
                <MessageSquare className="h-4 w-4 mr-1.5" />
                {t('parent_portal.request_conversation')}
              </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <Card className="border-amber-200/60 dark:border-amber-900/30 bg-amber-50/40 dark:bg-amber-950/20">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
                {t('parent_portal.pending_approvals')} ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingApprovals.map((approval) => (
                  <div key={approval.id} className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-gray-900/40 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {approval.student.firstName} {approval.student.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {approval.reason} - {format(parseISO(approval.startDate), 'd. MMM', { locale: localeCode === 'de' ? deLocale : enLocale })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" onClick={() => handleApproveIllness(approval.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white h-7 text-xs px-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {t('parent_portal.approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectIllness(approval.id)} className="border-red-200/60 dark:border-red-900/30 text-red-600 dark:text-red-400 h-7 text-xs px-2">
                        <XCircle className="h-3 w-3 mr-1" />
                        {t('parent_portal.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Child Selector */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 overflow-x-auto pb-1"
      >
        {children.map((child) => (
          <button
            key={child.studentId}
            onClick={() => setSelectedChild(child)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all whitespace-nowrap min-h-[44px] ${
              selectedChild?.studentId === child.studentId
                ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                : 'bg-white dark:bg-gray-900/40 border-emerald-100 dark:border-emerald-900/30 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
            }`}
          >
            <Avatar className="h-6 w-6">
              <AvatarFallback className={`text-xs ${selectedChild?.studentId === child.studentId ? 'bg-emerald-600 text-white' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
                {child.firstName[0]}{child.lastName[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{child.firstName} {child.lastName}</span>
            {child.classGroups.length > 0 && (
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${selectedChild?.studentId === child.studentId ? 'border-white/30 text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30'}`}>
                {child.classGroups[0].name}
              </Badge>
            )}
          </button>
        ))}
      </motion.div>

      {/* Child Data */}
      {selectedChild && (
        <motion.div
          key={selectedChild.studentId}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-emerald-50/60 dark:bg-emerald-950/20 p-1 rounded-lg">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                {t('parent_portal.child_overview', { name: selectedChild.firstName })}
              </TabsTrigger>
              <TabsTrigger value="exams" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                <GraduationCap className="h-3 w-3 mr-1" />{t('parent_portal.child_exams')}
              </TabsTrigger>
              <TabsTrigger value="grades" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                <BarChart3 className="h-3 w-3 mr-1" />{t('parent_portal.child_grades')}
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                <Clock className="h-3 w-3 mr-1" />{t('parent_portal.child_attendance')}
              </TabsTrigger>
              <TabsTrigger value="illness" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                <Thermometer className="h-3 w-3 mr-1" />{t('parent_portal.illness_reports')}
              </TabsTrigger>
              <TabsTrigger value="counseling" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                <MessageSquare className="h-3 w-3 mr-1" />{t('parent_portal.child_counseling')}
              </TabsTrigger>
              <TabsTrigger value="disciplinary" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs">
                <Shield className="h-3 w-3 mr-1" />{t('parent_portal.child_disciplinary')}
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                        <GraduationCap className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.upcoming_exams')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedChild.upcomingExams.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.attendance_rate')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{getAttendanceRate(selectedChild.attendanceSummary)}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <BarChart3 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.recent_grades')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedChild.recentGrades.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                        <MessageSquare className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.counseling_appointments')}</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{selectedChild.counselingAppointments.length}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick actions */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button onClick={() => setShowIllnessDialog(true)} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]">
                  <Thermometer className="h-5 w-5" />
                  <span className="text-xs">{t('parent_portal.report_illness')}</span>
                </Button>
                <Button onClick={() => setShowConversationDialog(true)} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]">
                  <MessageSquare className="h-5 w-5" />
                  <span className="text-xs">{t('parent_portal.request_conversation')}</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]">
                  <Calendar className="h-5 w-5" />
                  <span className="text-xs">{t('parent_portal.child_exams')}</span>
                </Button>
                <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]">
                  <BarChart3 className="h-5 w-5" />
                  <span className="text-xs">{t('parent_portal.child_grades')}</span>
                </Button>
              </div>
            </TabsContent>

            {/* Exams Tab */}
            <TabsContent value="exams">
              <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <GraduationCap className="h-4 w-4 text-red-500" />
                    {t('parent_portal.upcoming_exams')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {selectedChild.upcomingExams.length === 0 ? (
                    <div className="text-center py-6">
                      <GraduationCap className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_exams')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedChild.upcomingExams.map((exam) => {
                        const countdownText = exam.daysUntil === 0
                          ? t('calendar.today')
                          : exam.daysUntil === 1
                            ? t('calendar.tomorrow')
                            : exam.daysUntil < 7
                              ? t('calendar.in_days', { days: exam.daysUntil })
                              : t('calendar.in_weeks', { weeks: Math.floor(exam.daysUntil / 7) });
                        return (
                          <div key={exam.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                <GraduationCap className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{exam.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {exam.subject?.name ?? ''} {exam.classGroup?.name ?? ''} - {format(parseISO(exam.date), 'd. MMM yyyy', { locale: localeCode === 'de' ? deLocale : enLocale })}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30 shrink-0">
                              <Timer className="h-2.5 w-2.5 mr-0.5" />
                              {countdownText}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Grades Tab */}
            <TabsContent value="grades">
              <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                    {t('parent_portal.recent_grades')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {selectedChild.recentGrades.length === 0 ? (
                    <div className="text-center py-6">
                      <BarChart3 className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_grades')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedChild.recentGrades.map((grade) => (
                        <div key={grade.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                              <span className="text-sm font-bold">{grade.computedValue.toFixed(1)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{grade.subject.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{grade.period} - {grade.classGroup.name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Attendance Tab */}
            <TabsContent value="attendance">
              <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Clock className="h-4 w-4 text-emerald-500" />
                    {t('parent_portal.attendance_summary')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('parent_portal.attendance_rate')}</span>
                        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{getAttendanceRate(selectedChild.attendanceSummary)}%</span>
                      </div>
                      <Progress value={getAttendanceRate(selectedChild.attendanceSummary)} className="h-2" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{selectedChild.attendanceSummary.present}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.days_present')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-center">
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{selectedChild.attendanceSummary.absent}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.days_absent')}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
                      <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{selectedChild.attendanceSummary.excused}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{localeCode === 'de' ? 'Entschuldigt' : 'Excused'}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 text-center">
                      <p className="text-lg font-bold text-sky-600 dark:text-sky-400">{selectedChild.attendanceSummary.late}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{localeCode === 'de' ? 'Verspaetet' : 'Late'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Illness Reports Tab */}
            <TabsContent value="illness">
              <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Thermometer className="h-4 w-4 text-rose-500" />
                    {t('parent_portal.illness_reports')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {selectedChild.illnessReports.length === 0 ? (
                    <div className="text-center py-6">
                      <Thermometer className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_illness_reports')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedChild.illnessReports.map((report) => (
                        <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.reason}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(parseISO(report.startDate), 'd. MMM', { locale: localeCode === 'de' ? deLocale : enLocale })}
                              {report.endDate ? ` - ${format(parseISO(report.endDate), 'd. MMM', { locale: localeCode === 'de' ? deLocale : enLocale })}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className={
                            report.parentApprovalStatus === 'approved'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30'
                              : report.parentApprovalStatus === 'rejected'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30'
                                : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30'
                          }>
                            {report.parentApprovalStatus === 'approved' ? t('parent_portal.approved') : report.parentApprovalStatus === 'rejected' ? t('parent_portal.rejected') : t('status.pending')}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Counseling Tab */}
            <TabsContent value="counseling">
              <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <MessageSquare className="h-4 w-4 text-violet-500" />
                    {t('parent_portal.counseling_appointments')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {selectedChild.counselingAppointments.length === 0 ? (
                    <div className="text-center py-6">
                      <MessageSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_counseling')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedChild.counselingAppointments.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-3 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.requestType}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {apt.counselor.firstName} {apt.counselor.lastName}
                              {apt.scheduledAt ? ` - ${format(parseISO(apt.scheduledAt), 'd. MMM yyyy', { locale: localeCode === 'de' ? deLocale : enLocale })}` : ''}
                            </p>
                          </div>
                          <Badge variant="outline" className="bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/30">
                            {apt.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Disciplinary Tab */}
            <TabsContent value="disciplinary">
              <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                <CardHeader className="pb-2 p-4">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                    <Shield className="h-4 w-4 text-orange-500" />
                    {t('parent_portal.disciplinary_cases')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  {selectedChild.disciplinaryCases.length === 0 ? (
                    <div className="text-center py-6">
                      <Shield className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_disciplinary')}</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {selectedChild.disciplinaryCases.map((dCase) => (
                        <div key={dCase.id} className="flex items-center justify-between p-3 rounded-lg bg-orange-50/60 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/30">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{dCase.caseType}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {format(parseISO(dCase.createdAt), 'd. MMM yyyy', { locale: localeCode === 'de' ? deLocale : enLocale })}
                            </p>
                          </div>
                          <Badge variant="outline" className={
                            dCase.status === 'resolved'
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30'
                              : 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 border-orange-200/60 dark:border-orange-900/30'
                          }>
                            {dCase.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {/* Illness Report Dialog */}
      <Dialog open={showIllnessDialog} onOpenChange={setShowIllnessDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-emerald-500" />
              {t('parent_portal.report_illness')}
            </DialogTitle>
            <DialogDescription>
              {selectedChild ? `${t('parent_portal.report_illness')} - ${selectedChild.firstName} ${selectedChild.lastName}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('illness.reason')}</Label>
              <select
                value={illnessForm.reason}
                onChange={(e) => setIllnessForm((d) => ({ ...d, reason: e.target.value }))}
                className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 text-sm"
              >
                <option value="illness">{localeCode === 'de' ? 'Krankheit' : 'Illness'}</option>
                <option value="doctor_visit">{localeCode === 'de' ? 'Arztbesuch' : 'Doctor Visit'}</option>
                <option value="other">{localeCode === 'de' ? 'Sonstiges' : 'Other'}</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{localeCode === 'de' ? 'Von' : 'From'}</Label>
                <Input type="date" value={illnessForm.startDate} onChange={(e) => setIllnessForm((d) => ({ ...d, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{localeCode === 'de' ? 'Bis' : 'Until'}</Label>
                <Input type="date" value={illnessForm.endDate} onChange={(e) => setIllnessForm((d) => ({ ...d, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('label.description')}</Label>
              <Textarea value={illnessForm.description} onChange={(e) => setIllnessForm((d) => ({ ...d, description: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowIllnessDialog(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button onClick={handleReportIllness} disabled={submitting} className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]">
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Thermometer className="h-4 w-4 mr-1.5" />}
              {t('parent_portal.report_illness')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conversation Request Dialog */}
      <Dialog open={showConversationDialog} onOpenChange={setShowConversationDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-emerald-500" />
              {t('parent_portal.request_conversation')}
            </DialogTitle>
            <DialogDescription>
              {selectedChild ? `${t('parent_portal.request_conversation')} - ${selectedChild.firstName} ${selectedChild.lastName}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('label.description')}</Label>
              <Textarea value={conversationForm.message} onChange={(e) => setConversationForm((d) => ({ ...d, message: e.target.value }))} rows={3} placeholder={localeCode === 'de' ? 'Beschreiben Sie Ihr Anliegen...' : 'Describe your concern...'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConversationDialog(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button onClick={handleRequestConversation} disabled={submitting || !conversationForm.message.trim()} className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[44px]">
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <MessageSquare className="h-4 w-4 mr-1.5" />}
              {t('parent_portal.request_conversation')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
