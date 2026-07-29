'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Heart, GraduationCap, Clock, CheckCircle2, XCircle,
  AlertCircle, Loader2, ChevronRight, Calendar, BookOpen,
  Shield, MessageSquare, Thermometer, TrendingUp, Timer,
  Plus, FileText, BarChart3, ArrowUpRight, ArrowDownRight,
  Minus, Megaphone, CalendarDays, Download, Upload,
  BookMarked, ClipboardCheck, Phone, Mail, Bell,
  CalendarClock, StickyNote, Activity,
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
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, BarChart, Bar,
} from 'recharts';

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
    documentUrl: string | null;
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
  homeworkDue: Array<{
    id: string;
    title: string;
    dueDate: string;
    subject: { id: string; name: string } | null;
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

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  announcementType: string;
  isPinned: boolean;
  createdAt: string;
  author: { firstName: string; lastName: string } | null;
}

interface CommRoom {
  id: string;
  status: string;
  roomType: string;
  student: { id: string; firstName: string; lastName: string };
  teacher: { id: string; firstName: string; lastName: string };
  lastMessage: { id: string; content: string; createdAt: string; senderId: string } | null;
  updatedAt: string;
}

interface SchoolEventShort {
  id: string;
  title: string;
  startDate: string;
  eventType: string;
  location: string | null;
}

interface SubjectGrade {
  subject: { id: string; name: string; code: string | null };
  grades: Array<{
    id: string;
    computedValue: number;
    period: string;
    computedAt: string;
    classGroup: { id: string; name: string };
    schoolYear: { id: string; name: string };
  }>;
  average: number;
  trend: 'up' | 'down' | 'stable';
}

interface ChildProgress {
  subjectGrades: SubjectGrade[];
  classAverages: Record<string, number>;
  competencyBySubject: Array<{
    subject: { id: string; name: string };
    competencies: Array<{ id: string; code: string; title: string; level: number; assessedAt: string }>;
    averageLevel: number;
  }>;
  assessments: Array<{
    id: string;
    score: number;
    maxScore: number;
    grade: string | null;
    feedback: string | null;
    assessedAt: string;
    assessment: { id: string; title: string; type: string; date: string; subject: { id: string; name: string } };
  }>;
}

interface ScheduleData {
  timetableSlots: Array<{
    id: string;
    dayOfWeek: number;
    period: number;
    startTime: string;
    endTime: string;
    isBreak: boolean;
    subject: { id: string; name: string; code: string | null } | null;
    teacher: { id: string; firstName: string; lastName: string } | null;
    classGroup: { id: string; name: string };
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
  schoolEvents: Array<{
    id: string;
    title: string;
    description: string | null;
    startDate: string;
    endDate: string | null;
    eventType: string;
    location: string | null;
    organizer: { id: string; firstName: string; lastName: string };
  }>;
  counselingAppointments: Array<{
    id: string;
    requestType: string;
    status: string;
    scheduledAt: string | null;
    description: string | null;
    counselor: { firstName: string; lastName: string };
  }>;
  homeworkDue: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string;
    homeworkType: string;
    subject: { id: string; name: string } | null;
    classGroup: { id: string; name: string };
  }>;
}

/* ── Helpers ───────────────────────────────────────────────────────── */

const fmtDate = (d: string, loc: 'de' | 'en') =>
  format(parseISO(d), 'd. MMM yyyy', { locale: loc === 'de' ? deLocale : enLocale });

const fmtShort = (d: string, loc: 'de' | 'en') =>
  format(parseISO(d), 'd. MMM', { locale: loc === 'de' ? deLocale : enLocale });

const dayNames = (loc: 'de' | 'en') => [
  loc === 'de' ? 'Mo' : 'Mon',
  loc === 'de' ? 'Di' : 'Tue',
  loc === 'de' ? 'Mi' : 'Wed',
  loc === 'de' ? 'Do' : 'Thu',
  loc === 'de' ? 'Fr' : 'Fri',
];

const subjectColors = [
  '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

/* ── Animated Counter ──────────────────────────────────────────────── */

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = value / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { start = value; clearInterval(timer); }
      setDisplay(Math.round(start * 10) / 10);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <>{display}</>;
}

/* ── Circular Progress ─────────────────────────────────────────────── */

function CircularProgress({ value, size = 120, strokeWidth = 10 }: { value: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  const color = value >= 90 ? '#10b981' : value >= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="currentColor" strokeWidth={strokeWidth} fill="none" className="text-gray-200 dark:text-gray-700" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} stroke="url(#progressGradient)" strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold"
          style={{ color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {value}%
        </motion.span>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────────────────── */

export default function ParentPortalView() {
  const currentUser = useAppStore((s) => s.currentUser);
  const locale = useAppStore((s) => s.locale);
  const loc = (locale === 'en' ? 'en' : 'de') as 'de' | 'en';

  const [children, setChildren] = useState<ChildData[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [commRooms, setCommRooms] = useState<CommRoom[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEventShort[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Sub-data
  const [progressData, setProgressData] = useState<ChildProgress | null>(null);
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingSchedule, setLoadingSchedule] = useState(false);

  // Dialogs
  const [showIllnessDialog, setShowIllnessDialog] = useState(false);
  const [showConversationDialog, setShowConversationDialog] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [illnessForm, setIllnessForm] = useState({
    reason: 'illness',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: '',
  });
  const [conversationForm, setConversationForm] = useState({ message: '' });
  const [meetingForm, setMeetingForm] = useState({ topic: '', preferredDate: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  /* ── Load main data ────────────────────────────────────────────────── */
  const loadData = useCallback(async () => {
    if (!currentUser?.schoolId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/parent-portal?schoolId=${currentUser.schoolId}`);
      if (res.ok) {
        const data = await res.json();
        setChildren(data.children ?? []);
        setPendingApprovals(data.pendingApprovals ?? []);
        setAnnouncements(data.announcements ?? []);
        setCommRooms(data.communicationRooms ?? []);
        setSchoolEvents(data.schoolEvents ?? []);
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

  useEffect(() => { loadData(); }, [loadData]);

  /* ── Load sub-data when child changes ──────────────────────────────── */
  useEffect(() => {
    if (!selectedChild || !currentUser?.schoolId) return;
    setLoadingProgress(true);
    setLoadingSchedule(true);
    fetch(`/api/parent-portal/child-progress?studentId=${selectedChild.studentId}&schoolId=${currentUser.schoolId}`)
      .then((r) => r.json())
      .then((d) => setProgressData(d))
      .catch(() => {})
      .finally(() => setLoadingProgress(false));
    fetch(`/api/parent-portal/child-schedule?studentId=${selectedChild.studentId}&schoolId=${currentUser.schoolId}`)
      .then((r) => r.json())
      .then((d) => setScheduleData(d))
      .catch(() => {})
      .finally(() => setLoadingSchedule(false));
  }, [selectedChild?.studentId, currentUser?.schoolId]);

  /* ── Handlers ──────────────────────────────────────────────────────── */
  const handleApproveIllness = async (reportId: string) => {
    try {
      const res = await fetch('/api/illness-reports/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action: 'approve' }),
      });
      if (res.ok) { toast.success(t('parent_portal.illness_approved')); loadData(); }
      else toast.error('Failed to approve');
    } catch { toast.error('Failed to approve'); }
  };

  const handleRejectIllness = async (reportId: string) => {
    try {
      const res = await fetch('/api/illness-reports/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, action: 'reject' }),
      });
      if (res.ok) { toast.success(t('parent_portal.illness_rejected')); loadData(); }
      else toast.error('Failed to reject');
    } catch { toast.error('Failed to reject'); }
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
    } catch { toast.error('Failed to report illness'); }
    finally { setSubmitting(false); }
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
    } catch { toast.error('Failed to request conversation'); }
    finally { setSubmitting(false); }
  };

  const handleRequestMeeting = async () => {
    if (!currentUser?.schoolId || !selectedChild) return;
    setSubmitting(true);
    try {
      await apiPost('/api/counseling', {
        schoolId: currentUser.schoolId,
        studentId: selectedChild.userId,
        requestType: 'parent_teacher',
        description: `${meetingForm.topic}${meetingForm.preferredDate ? ` | ${loc === 'de' ? 'Gewuenschter Termin' : 'Preferred date'}: ${meetingForm.preferredDate}` : ''}${meetingForm.notes ? ` | ${meetingForm.notes}` : ''}`,
      });
      toast.success(t('parent_portal.request_meeting'));
      setShowMeetingDialog(false);
      setMeetingForm({ topic: '', preferredDate: '', notes: '' });
      loadData();
    } catch { toast.error('Failed to request meeting'); }
    finally { setSubmitting(false); }
  };

  const getAttendanceRate = (summary: { total: number; present: number; excused: number }) => {
    if (summary.total === 0) return 100;
    return Math.round(((summary.present + summary.excused) / summary.total) * 100);
  };

  /* ── Chart data ────────────────────────────────────────────────────── */
  const radarData = useMemo(() => {
    if (!progressData?.competencyBySubject) return [];
    return progressData.competencyBySubject.map((cs) => ({
      subject: cs.subject.name,
      level: cs.averageLevel,
      fullMark: 5,
    }));
  }, [progressData]);

  const gradeHistoryData = useMemo(() => {
    if (!progressData?.subjectGrades) return [];
    const periods = new Set<string>();
    for (const sg of progressData.subjectGrades) {
      for (const g of sg.grades) periods.add(g.period);
    }
    const sortedPeriods = Array.from(periods).sort();
    return sortedPeriods.map((period) => {
      const entry: Record<string, unknown> = { period };
      for (const sg of progressData.subjectGrades) {
        const pg = sg.grades.find((g) => g.period === period);
        if (pg) entry[sg.subject.name] = pg.computedValue;
      }
      return entry;
    });
  }, [progressData]);

  const gradeComparisonData = useMemo(() => {
    if (!progressData?.subjectGrades) return [];
    return progressData.subjectGrades.map((sg) => ({
      subject: sg.subject.name,
      student: sg.average,
      classAvg: progressData.classAverages[sg.subject.id] ?? 0,
    }));
  }, [progressData]);

  /* ── Loading State ─────────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  /* ── Empty State ───────────────────────────────────────────────────── */
  if (children.length === 0) {
    return (
      <div className="space-y-6 pb-6">
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shrink-0">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{t('parent_portal.title')}</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.subtitle')}</p>
            </div>
          </div>
        </motion.div>
        <Card className="border-emerald-100/60 dark:border-emerald-900/30">
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-emerald-300/60 dark:text-emerald-700/50 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{t('parent_portal.no_children')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_children_desc')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ── Render ────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 pb-6">
      {/* ── Gradient Header Banner ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 p-6 text-white shadow-lg shadow-emerald-500/20 dark:shadow-emerald-900/30"
      >
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA4KSIvPjwvc3ZnPg==')] opacity-60" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Heart className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold">{t('parent_portal.title')}</h1>
              <p className="text-emerald-100 text-sm">{t('parent_portal.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {selectedChild && (
              <>
                <Button size="sm" onClick={() => setShowIllnessDialog(true)} className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur-sm min-h-[44px]">
                  <Thermometer className="h-4 w-4 mr-1.5" />{t('parent_portal.report_illness')}
                </Button>
                <Button size="sm" onClick={() => setShowMeetingDialog(true)} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 min-h-[44px]">
                  <Phone className="h-4 w-4 mr-1.5" />{t('parent_portal.request_meeting')}
                </Button>
                <Button size="sm" onClick={() => setShowConversationDialog(true)} variant="outline" className="bg-white/10 hover:bg-white/20 text-white border-white/20 min-h-[44px]">
                  <MessageSquare className="h-4 w-4 mr-1.5" />{t('parent_portal.request_conversation')}
                </Button>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Pending Approvals ───────────────────────────────────────── */}
      {pendingApprovals.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="border-amber-200/60 dark:border-amber-900/30 bg-gradient-to-r from-amber-50/60 to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/10">
            <CardHeader className="pb-2 p-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-300">
                <AlertCircle className="h-4 w-4" />
                {t('parent_portal.pending_approvals')} ({pendingApprovals.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {pendingApprovals.map((pa) => (
                  <div key={pa.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900/40 border border-amber-100 dark:border-amber-900/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{pa.student.firstName} {pa.student.lastName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{pa.reason} - {fmtShort(pa.startDate, loc)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" onClick={() => handleApproveIllness(pa.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs px-3">
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t('parent_portal.approve')}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRejectIllness(pa.id)} className="border-red-200/60 dark:border-red-900/30 text-red-600 dark:text-red-400 h-8 text-xs px-3">
                        <XCircle className="h-3.5 w-3.5 mr-1" />{t('parent_portal.reject')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ── Child Selector ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex items-center gap-2 overflow-x-auto pb-1">
        {children.map((child) => {
          const isActive = selectedChild?.studentId === child.studentId;
          return (
            <motion.button
              key={child.studentId}
              onClick={() => setSelectedChild(child)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 transition-all whitespace-nowrap min-h-[44px] ${isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-emerald-500 shadow-lg shadow-emerald-300/40 dark:shadow-emerald-900/40' : 'bg-white dark:bg-gray-900/40 border-emerald-100 dark:border-emerald-900/30 text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300/60 dark:hover:border-emerald-700/60'}`}
            >
              <Avatar className="h-7 w-7">
                <AvatarFallback className={`text-xs font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'}`}>
                  {child.firstName[0]}{child.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold">{child.firstName}</span>
              {child.classGroups.length > 0 && (
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${isActive ? 'border-white/30 text-white' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30'}`}>
                  {child.classGroups[0].name}
                </Badge>
              )}
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Child Data ──────────────────────────────────────────────── */}
      {selectedChild && (
        <motion.div key={selectedChild.studentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1 bg-emerald-50/60 dark:bg-emerald-950/20 p-1.5 rounded-xl">
              <TabsTrigger value="overview" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs rounded-lg">
                <Activity className="h-3.5 w-3.5 mr-1" />{t('parent_portal.child_dashboard')}
              </TabsTrigger>
              <TabsTrigger value="progress" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs rounded-lg">
                <BarChart3 className="h-3.5 w-3.5 mr-1" />{t('parent_portal.academic_progress')}
              </TabsTrigger>
              <TabsTrigger value="attendance" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs rounded-lg">
                <Clock className="h-3.5 w-3.5 mr-1" />{t('parent_portal.attendance_illness')}
              </TabsTrigger>
              <TabsTrigger value="communication" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs rounded-lg">
                <MessageSquare className="h-3.5 w-3.5 mr-1" />{t('parent_portal.communication')}
              </TabsTrigger>
              <TabsTrigger value="schedule" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs rounded-lg">
                <CalendarDays className="h-3.5 w-3.5 mr-1" />{t('parent_portal.schedule')}
              </TabsTrigger>
              <TabsTrigger value="reports" className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-xs rounded-lg">
                <FileText className="h-3.5 w-3.5 mr-1" />{t('parent_portal.reports_docs')}
              </TabsTrigger>
            </TabsList>

            {/* ═══════════════════════════════════════════════════════════
                OVERVIEW TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="overview">
              <div className="space-y-4">
                {/* Quick Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0 }}>
                    <Card className="border-0 bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-emerald-100">{t('parent_portal.attendance_rate')}</p>
                            <p className="text-2xl font-bold mt-1"><AnimatedCounter value={getAttendanceRate(selectedChild.attendanceSummary)} />%</p>
                          </div>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                            <TrendingUp className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }}>
                    <Card className="border-0 bg-gradient-to-br from-amber-500 to-orange-500 text-white overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-amber-100">{t('parent_portal.recent_grades')}</p>
                            <p className="text-2xl font-bold mt-1"><AnimatedCounter value={selectedChild.recentGrades.length} /></p>
                          </div>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                            <BarChart3 className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                    <Card className="border-0 bg-gradient-to-br from-red-500 to-rose-500 text-white overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-red-100">{t('parent_portal.upcoming_exams')}</p>
                            <p className="text-2xl font-bold mt-1"><AnimatedCounter value={selectedChild.upcomingExams.length} /></p>
                          </div>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                            <GraduationCap className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                    <Card className="border-0 bg-gradient-to-br from-violet-500 to-purple-600 text-white overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-violet-100">{t('parent_portal.counseling_appointments')}</p>
                            <p className="text-2xl font-bold mt-1"><AnimatedCounter value={selectedChild.counselingAppointments.length} /></p>
                          </div>
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-white/20">
                            <MessageSquare className="h-5 w-5" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Two Column: Upcoming Deadlines + Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Upcoming Deadlines */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-amber-50/60 to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/10 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Timer className="h-4 w-4 text-amber-500" />
                        {t('parent_portal.upcoming_deadlines')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {selectedChild.upcomingExams.length === 0 && selectedChild.homeworkDue.length === 0 ? (
                        <div className="text-center py-6">
                          <CalendarClock className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_exams')}</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {selectedChild.upcomingExams.slice(0, 4).map((exam) => (
                            <div key={exam.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                  <GraduationCap className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{exam.title}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{exam.subject?.name ?? ''}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30 shrink-0">
                                <Timer className="h-2.5 w-2.5 mr-0.5" />
                                {exam.daysUntil === 0 ? (loc === 'de' ? 'Heute' : 'Today') : `${exam.daysUntil}d`}
                              </Badge>
                            </div>
                          ))}
                          {selectedChild.homeworkDue.slice(0, 3).map((hw) => (
                            <div key={hw.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  <BookOpen className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{hw.title}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{hw.subject?.name ?? ''}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30 shrink-0">
                                {t('parent_portal.due')}: {fmtShort(hw.dueDate, loc)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-emerald-50/60 to-emerald-50/30 dark:from-emerald-950/20 dark:to-emerald-950/10 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Activity className="h-4 w-4 text-emerald-500" />
                        {t('parent_portal.recent_activity')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {selectedChild.recentGrades.length === 0 && selectedChild.illnessReports.length === 0 ? (
                        <div className="text-center py-6">
                          <Activity className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                          <p className="text-sm text-gray-500 dark:text-gray-400">{loc === 'de' ? 'Keine Aktivitaeten' : 'No activities'}</p>
                        </div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {selectedChild.recentGrades.slice(0, 4).map((g) => (
                            <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                  <BarChart3 className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{g.subject.name}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{g.period}</p>
                                </div>
                              </div>
                              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{g.computedValue.toFixed(1)}</span>
                            </div>
                          ))}
                          {selectedChild.illnessReports.slice(0, 2).map((ir) => (
                            <div key={ir.id} className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                              <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                  <Thermometer className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{ir.reason}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400">{fmtShort(ir.startDate, loc)}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className={`text-[10px] ${ir.parentApprovalStatus === 'approved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30'}`}>
                                {ir.parentApprovalStatus === 'approved' ? t('parent_portal.approved') : t('status.pending')}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardContent className="p-4">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">{t('parent_portal.quick_actions')}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Button onClick={() => setShowIllnessDialog(true)} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 min-h-[44px]">
                        <Thermometer className="h-5 w-5" /><span className="text-xs">{t('parent_portal.report_illness')}</span>
                      </Button>
                      <Button onClick={() => setShowMeetingDialog(true)} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-amber-200/60 dark:border-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 min-h-[44px]">
                        <Phone className="h-5 w-5" /><span className="text-xs">{t('parent_portal.request_meeting')}</span>
                      </Button>
                      <Button onClick={() => setActiveTab('schedule')} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-violet-200/60 dark:border-violet-900/30 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-900/20 min-h-[44px]">
                        <CalendarDays className="h-5 w-5" /><span className="text-xs">{t('parent_portal.schedule')}</span>
                      </Button>
                      <Button onClick={() => setActiveTab('progress')} variant="outline" className="h-auto py-3 flex flex-col items-center gap-1.5 border-rose-200/60 dark:border-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 min-h-[44px]">
                        <BarChart3 className="h-5 w-5" /><span className="text-xs">{t('parent_portal.academic_progress')}</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                ACADEMIC PROGRESS TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="progress">
              {loadingProgress ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
              ) : (
                <div className="space-y-4">
                  {/* Subject Grades with Trends */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <BarChart3 className="h-4 w-4 text-emerald-500" />
                        {t('parent_portal.subject_grades')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {!progressData?.subjectGrades?.length ? (
                        <div className="text-center py-6"><BarChart3 className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_grades')}</p></div>
                      ) : (
                        <div className="space-y-2 max-h-96 overflow-y-auto">
                          {progressData.subjectGrades.map((sg, i) => (
                            <div key={sg.subject.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900/40 border border-emerald-100 dark:border-emerald-900/30">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg text-white font-bold text-sm" style={{ backgroundColor: subjectColors[i % subjectColors.length] }}>
                                  {sg.subject.name.substring(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{sg.subject.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{sg.grades.length} {loc === 'de' ? 'Bewertungen' : 'grades'}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{sg.average.toFixed(1)}</p>
                                  {progressData.classAverages[sg.subject.id] != null && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{t('parent_portal.class')}: {progressData.classAverages[sg.subject.id].toFixed(1)}</p>
                                  )}
                                </div>
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${sg.trend === 'up' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : sg.trend === 'down' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                                  {sg.trend === 'up' ? <ArrowUpRight className="h-4 w-4" /> : sg.trend === 'down' ? <ArrowDownRight className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Charts Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Competency Radar */}
                    <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          <TrendingUp className="h-4 w-4 text-emerald-500" />
                          {t('parent_portal.competency_radar')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {radarData.length < 3 ? (
                          <div className="text-center py-6"><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_grades')}</p></div>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <RadarChart data={radarData}>
                              <PolarGrid stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                              <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
                              <PolarRadiusAxis domain={[0, 5]} tick={{ fontSize: 9 }} />
                              <defs>
                                <linearGradient id="radarFill" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                  <stop offset="100%" stopColor="#14b8a6" stopOpacity={0.15} />
                                </linearGradient>
                              </defs>
                              <Radar name={t('parent_portal.student')} dataKey="level" stroke="#10b981" fill="url(#radarFill)" />
                            </RadarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    {/* Grade Comparison */}
                    <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          <BarChart3 className="h-4 w-4 text-amber-500" />
                          {t('parent_portal.comparison')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {gradeComparisonData.length === 0 ? (
                          <div className="text-center py-6"><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_grades')}</p></div>
                        ) : (
                          <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={gradeComparisonData} barGap={4}>
                              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                              <XAxis dataKey="subject" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
                              <YAxis tick={{ fontSize: 10 }} domain={[0, 6]} />
                              <Tooltip />
                              <Legend wrapperStyle={{ fontSize: 11 }} />
                              <Bar dataKey="student" name={t('parent_portal.student')} fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="classAvg" name={t('parent_portal.class')} fill="#f59e0b" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grade History Chart */}
                  {gradeHistoryData.length > 0 && (
                    <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          <Activity className="h-4 w-4 text-emerald-500" />
                          {t('parent_portal.grade_history')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ResponsiveContainer width="100%" height={260}>
                          <LineChart data={gradeHistoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-200 dark:text-gray-700" />
                            <XAxis dataKey="period" tick={{ fontSize: 10, fill: 'currentColor' }} className="text-gray-600 dark:text-gray-400" />
                            <YAxis tick={{ fontSize: 10 }} domain={[0, 6]} />
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            {progressData?.subjectGrades?.slice(0, 5).map((sg, i) => (
                              <Line key={sg.subject.id} type="monotone" dataKey={sg.subject.name} stroke={subjectColors[i % subjectColors.length]} strokeWidth={2} dot={{ r: 3 }} />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Assessment Results */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <ClipboardCheck className="h-4 w-4 text-amber-500" />
                        {t('parent_portal.assessment_results')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {!progressData?.assessments?.length ? (
                        <div className="text-center py-6"><ClipboardCheck className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_assessments')}</p></div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {progressData.assessments.map((a) => (
                            <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900/40 border border-amber-100 dark:border-amber-900/30">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  <ClipboardCheck className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.assessment.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.assessment.subject?.name ?? ''} - {fmtShort(a.assessedAt, loc)}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{a.score}/{a.maxScore}</p>
                                {a.grade && <p className="text-xs text-gray-500 dark:text-gray-400">{a.grade}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                ATTENDANCE & ILLNESS TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="attendance">
              <div className="space-y-4">
                {/* Attendance Rate Circular */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4 bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      <Clock className="h-4 w-4 text-emerald-500" />
                      {t('parent_portal.attendance_rate_circular')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <CircularProgress value={getAttendanceRate(selectedChild.attendanceSummary)} size={140} strokeWidth={12} />
                      <div className="grid grid-cols-2 gap-3 flex-1 w-full">
                        <div className="p-3 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{selectedChild.attendanceSummary.present}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.days_present')}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-center">
                          <p className="text-xl font-bold text-red-600 dark:text-red-400">{selectedChild.attendanceSummary.absent}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.days_absent')}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 text-center">
                          <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{selectedChild.attendanceSummary.excused}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.days_excused')}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-sky-50/60 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/30 text-center">
                          <p className="text-xl font-bold text-sky-600 dark:text-sky-400">{selectedChild.attendanceSummary.late}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{t('parent_portal.days_late')}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Illness Reports */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Thermometer className="h-4 w-4 text-rose-500" />
                        {t('parent_portal.illness_history')}
                      </CardTitle>
                      <Button size="sm" onClick={() => setShowIllnessDialog(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white h-8 text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" />{t('parent_portal.report_illness')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {selectedChild.illnessReports.length === 0 ? (
                      <div className="text-center py-6"><Thermometer className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_illness_reports')}</p></div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {selectedChild.illnessReports.map((report) => (
                          <div key={report.id} className="flex items-center justify-between p-3 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400">
                                <Thermometer className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{report.reason}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {fmtShort(report.startDate, loc)}
                                  {report.endDate ? ` - ${fmtShort(report.endDate, loc)}` : ''}
                                </p>
                                {report.description && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{report.description}</p>}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-[10px] ${report.parentApprovalStatus === 'approved' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30' : report.parentApprovalStatus === 'rejected' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30'}`}>
                                {report.parentApprovalStatus === 'approved' ? t('parent_portal.approved') : report.parentApprovalStatus === 'rejected' ? t('parent_portal.rejected') : t('status.pending')}
                              </Badge>
                              {report.documentUrl && (
                                <Badge variant="outline" className="text-[10px] bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-900/30">
                                  <FileText className="h-2.5 w-2.5 mr-0.5" />{t('parent_portal.upload_certificate')}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Upload Certificate */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 p-4 rounded-lg border-2 border-dashed border-emerald-200 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('parent_portal.upload_certificate')}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{loc === 'de' ? 'Laden Sie ein aerztliches Attest hoch' : 'Upload a medical certificate'}</p>
                      </div>
                      <Button size="sm" variant="outline" className="border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 min-h-[44px]">
                        <Upload className="h-4 w-4 mr-1.5" />{t('parent_portal.upload_certificate')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                COMMUNICATION TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="communication">
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Messages from Teachers */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-violet-50/60 to-violet-50/30 dark:from-violet-950/20 dark:to-violet-950/10 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Mail className="h-4 w-4 text-violet-500" />
                        {t('parent_portal.messages_teachers')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {commRooms.length === 0 ? (
                        <div className="text-center py-6"><Mail className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_messages')}</p></div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {commRooms.map((room) => (
                            <motion.div
                              key={room.id}
                              whileHover={{ scale: 1.01, x: 2 }}
                              className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-gray-900/40 border border-violet-100 dark:border-violet-900/30 hover:shadow-md hover:border-violet-200/60 dark:hover:border-violet-800/60 transition-all"
                            >
                              <Avatar className="h-8 w-8 shrink-0">
                                <AvatarFallback className="text-xs bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 text-violet-700 dark:text-violet-300">
                                  {room.teacher.firstName[0]}{room.teacher.lastName[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{room.teacher.firstName} {room.teacher.lastName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{room.lastMessage?.content ?? (loc === 'de' ? 'Kein Inhalt' : 'No content')}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{room.lastMessage ? fmtShort(room.lastMessage.createdAt, loc) : ''}</p>
                              </div>
                              <Badge variant="outline" className={`text-[10px] shrink-0 ${room.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30'}`}>
                                {room.status}
                              </Badge>
                            </motion.div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* School Announcements */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-amber-50/60 to-amber-50/30 dark:from-amber-950/20 dark:to-amber-950/10 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <Megaphone className="h-4 w-4 text-amber-500" />
                        {t('parent_portal.school_announcements')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {announcements.length === 0 ? (
                        <div className="text-center py-6"><Megaphone className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_announcements')}</p></div>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {announcements.map((ann) => (
                            <div key={ann.id} className={`p-3 rounded-lg border ${ann.isPinned ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/30' : ann.priority === 'urgent' ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/30' : 'bg-white dark:bg-gray-900/40 border-emerald-100 dark:border-emerald-900/30'}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex-1">{ann.title}</p>
                                {ann.isPinned && <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30 shrink-0"><Bell className="h-2.5 w-2.5 mr-0.5" />{t('parent_portal.pinned')}</Badge>}
                                {ann.priority === 'urgent' && <Badge variant="outline" className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30 shrink-0">{t('parent_portal.urgent')}</Badge>}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{ann.content}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{fmtShort(ann.createdAt, loc)}{ann.author ? ` - ${ann.author.firstName} ${ann.author.lastName}` : ''}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Conversation Rooms */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <MessageSquare className="h-4 w-4 text-violet-500" />
                        {t('parent_portal.conversation_rooms')}
                      </CardTitle>
                      <Button size="sm" onClick={() => setShowConversationDialog(true)} variant="outline" className="border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 h-8 text-xs">
                        <Plus className="h-3.5 w-3.5 mr-1" />{t('parent_portal.request_conversation')}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {commRooms.length === 0 ? (
                      <div className="text-center py-6"><MessageSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_messages')}</p></div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {commRooms.map((room) => (
                          <div key={room.id} className="flex items-center justify-between p-3 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                                <MessageSquare className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{room.teacher.firstName} {room.teacher.lastName}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{loc === 'de' ? 'Fuer' : 'For'} {room.student.firstName} {room.student.lastName}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className={`text-[10px] ${room.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30'}`}>
                              {room.status}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* School Events */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      <CalendarDays className="h-4 w-4 text-amber-500" />
                      {t('parent_portal.school_events')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {schoolEvents.length === 0 ? (
                      <div className="text-center py-6"><CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_events')}</p></div>
                    ) : (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {schoolEvents.map((ev) => (
                          <div key={ev.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                <CalendarDays className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{ev.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{fmtShort(ev.startDate, loc)}{ev.location ? ` - ${ev.location}` : ''}</p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30">
                              {ev.eventType}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                SCHEDULE TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="schedule">
              {loadingSchedule ? (
                <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-emerald-500" /></div>
              ) : (
                <div className="space-y-4">
                  {/* Weekly Timetable */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4 bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <CalendarDays className="h-4 w-4 text-emerald-500" />
                        {t('parent_portal.weekly_timetable')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      {!scheduleData?.timetableSlots?.length ? (
                        <div className="text-center py-6"><CalendarDays className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_schedule')}</p></div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr>
                                <th className="p-2 text-left font-semibold text-gray-500 dark:text-gray-400 border-b border-emerald-100 dark:border-emerald-900/30">{t('parent_portal.period')}</th>
                                {dayNames(loc).map((d) => (
                                  <th key={d} className="p-2 text-center font-semibold text-gray-500 dark:text-gray-400 border-b border-emerald-100 dark:border-emerald-900/30">{d}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: 8 }, (_, p) => p + 1).map((period) => {
                                const slotsForPeriod = scheduleData.timetableSlots.filter((s) => s.period === period && !s.isBreak);
                                const breakSlot = scheduleData.timetableSlots.find((s) => s.period === period && s.isBreak);
                                if (breakSlot) {
                                  return (
                                    <tr key={period}>
                                      <td colSpan={6} className="p-1.5 text-center bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 border-b border-emerald-100 dark:border-emerald-900/30">
                                        {t('parent_portal.break')} ({breakSlot.startTime} - {breakSlot.endTime})
                                      </td>
                                    </tr>
                                  );
                                }
                                return (
                                  <tr key={period}>
                                    <td className="p-2 font-medium text-gray-600 dark:text-gray-400 border-b border-emerald-100 dark:border-emerald-900/30 whitespace-nowrap">
                                      {period}. {t('parent_portal.period')}
                                    </td>
                                    {Array.from({ length: 5 }, (_, d) => d).map((day) => {
                                      const slot = slotsForPeriod.find((s) => s.dayOfWeek === day);
                                      if (!slot) return <td key={day} className="p-1.5 border-b border-emerald-100 dark:border-emerald-900/30" />;
                                      return (
                                        <td key={day} className="p-1.5 border-b border-emerald-100 dark:border-emerald-900/30">
                                          <div className="rounded-lg p-2 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center">
                                            <p className="font-medium text-gray-900 dark:text-gray-100">{slot.subject?.name ?? '-'}</p>
                                            <p className="text-[10px] text-gray-500 dark:text-gray-400">{slot.startTime}-{slot.endTime}</p>
                                            {slot.teacher && <p className="text-[10px] text-gray-400 dark:text-gray-500">{slot.teacher.firstName[0]}. {slot.teacher.lastName}</p>}
                                          </div>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Exam Dates */}
                    <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          <GraduationCap className="h-4 w-4 text-red-500" />
                          {t('parent_portal.exam_dates')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {!scheduleData?.upcomingExams?.length ? (
                          <div className="text-center py-6"><GraduationCap className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_exams')}</p></div>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {scheduleData.upcomingExams.map((exam) => (
                              <div key={exam.id} className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{exam.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{exam.subject?.name ?? ''} - {fmtShort(exam.date, loc)}</p>
                                </div>
                                <Badge variant="outline" className="text-[10px] bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border-red-200/60 dark:border-red-900/30 shrink-0">
                                  <Timer className="h-2.5 w-2.5 mr-0.5" />
                                  {exam.daysUntil === 0 ? (loc === 'de' ? 'Heute' : 'Today') : `${exam.daysUntil}d`}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Counseling Appointments */}
                    <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                      <CardHeader className="pb-2 p-4">
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                          <MessageSquare className="h-4 w-4 text-violet-500" />
                          {t('parent_portal.counseling_appointments_short')}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        {!scheduleData?.counselingAppointments?.length ? (
                          <div className="text-center py-6"><MessageSquare className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_counseling')}</p></div>
                        ) : (
                          <div className="space-y-2 max-h-72 overflow-y-auto">
                            {scheduleData.counselingAppointments.map((apt) => (
                              <div key={apt.id} className="flex items-center justify-between p-2.5 rounded-lg bg-violet-50/60 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30">
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{apt.requestType}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{apt.counselor.firstName} {apt.counselor.lastName}{apt.scheduledAt ? ` - ${fmtShort(apt.scheduledAt, loc)}` : ''}</p>
                                </div>
                                <Badge variant="outline" className={`text-[10px] ${apt.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-900/30' : 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-900/30'}`}>
                                  {apt.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Homework Due */}
                  <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                    <CardHeader className="pb-2 p-4">
                      <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                        <BookOpen className="h-4 w-4 text-amber-500" />
                        {t('parent_portal.homework_due')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      {!scheduleData?.homeworkDue?.length ? (
                        <div className="text-center py-6"><BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_homework')}</p></div>
                      ) : (
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {scheduleData.homeworkDue.map((hw) => (
                            <div key={hw.id} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                              <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  <BookOpen className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{hw.title}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{hw.subject?.name ?? ''} - {hw.classGroup.name}</p>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-900/30 shrink-0">
                                {t('parent_portal.due')}: {fmtShort(hw.dueDate, loc)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            {/* ═══════════════════════════════════════════════════════════
                REPORTS & DOCUMENTS TAB
            ═══════════════════════════════════════════════════════════ */}
            <TabsContent value="reports">
              <div className="space-y-4">
                {/* Report Cards */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4 bg-gradient-to-r from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/20 dark:to-teal-950/10 rounded-t-lg">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      <FileText className="h-4 w-4 text-emerald-500" />
                      {t('parent_portal.report_cards')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-2">
                    {selectedChild.recentGrades.length === 0 ? (
                      <div className="text-center py-6"><FileText className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_grades')}</p></div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {selectedChild.recentGrades.map((g) => (
                          <div key={g.id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900/40 border border-emerald-100 dark:border-emerald-900/30">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                                <span className="text-sm font-bold">{g.computedValue.toFixed(1)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{g.subject.name}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{g.period} - {g.classGroup.name}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="text-emerald-600 dark:text-emerald-400 h-8 w-8 p-0">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Assessment Results */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      <ClipboardCheck className="h-4 w-4 text-amber-500" />
                      {t('parent_portal.assessment_results')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {!progressData?.assessments?.length ? (
                      <div className="text-center py-6"><ClipboardCheck className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" /><p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_assessments')}</p></div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto">
                        {progressData.assessments.map((a) => (
                          <div key={a.id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30">
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                <ClipboardCheck className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{a.assessment.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{a.assessment.subject?.name ?? ''} - {fmtShort(a.assessedAt, loc)}</p>
                                {a.feedback && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t('parent_portal.feedback')}: {a.feedback}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{a.score}/{a.maxScore}</p>
                              {a.grade && <p className="text-xs text-gray-500 dark:text-gray-400">{a.grade}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Portfolio Highlights */}
                <Card className="border-emerald-100/60 dark:border-emerald-900/30">
                  <CardHeader className="pb-2 p-4">
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                      <BookMarked className="h-4 w-4 text-violet-500" />
                      {t('parent_portal.portfolio_highlights')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-center py-6">
                      <BookMarked className="h-8 w-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">{t('parent_portal.no_portfolio')}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{loc === 'de' ? 'Portfolio-Eintraege werden hier angezeigt, sobald sie verfuegbar sind.' : 'Portfolio entries will appear here when available.'}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </motion.div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          DIALOGS
      ═══════════════════════════════════════════════════════════════ */}

      {/* Illness Report Dialog */}
      <Dialog open={showIllnessDialog} onOpenChange={setShowIllnessDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Thermometer className="h-5 w-5 text-emerald-500" />{t('parent_portal.report_illness')}</DialogTitle>
            <DialogDescription>{selectedChild ? `${t('parent_portal.report_illness')} - ${selectedChild.firstName} ${selectedChild.lastName}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('illness.reason')}</Label>
              <select value={illnessForm.reason} onChange={(e) => setIllnessForm((d) => ({ ...d, reason: e.target.value }))} className="w-full h-10 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 px-3 text-sm">
                <option value="illness">{loc === 'de' ? 'Krankheit' : 'Illness'}</option>
                <option value="doctor_visit">{loc === 'de' ? 'Arztbesuch' : 'Doctor Visit'}</option>
                <option value="other">{loc === 'de' ? 'Sonstiges' : 'Other'}</option>
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{loc === 'de' ? 'Von' : 'From'}</Label>
                <Input type="date" value={illnessForm.startDate} onChange={(e) => setIllnessForm((d) => ({ ...d, startDate: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>{loc === 'de' ? 'Bis' : 'Until'}</Label>
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
            <DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-emerald-500" />{t('parent_portal.request_conversation')}</DialogTitle>
            <DialogDescription>{selectedChild ? `${t('parent_portal.request_conversation')} - ${selectedChild.firstName} ${selectedChild.lastName}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{t('label.description')}</Label>
              <Textarea value={conversationForm.message} onChange={(e) => setConversationForm((d) => ({ ...d, message: e.target.value }))} rows={3} placeholder={loc === 'de' ? 'Beschreiben Sie Ihr Anliegen...' : 'Describe your concern...'} />
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

      {/* Meeting Request Dialog */}
      <Dialog open={showMeetingDialog} onOpenChange={setShowMeetingDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Phone className="h-5 w-5 text-amber-500" />{t('parent_portal.request_meeting')}</DialogTitle>
            <DialogDescription>{selectedChild ? `${t('parent_portal.request_meeting')} - ${selectedChild.firstName} ${selectedChild.lastName}` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>{loc === 'de' ? 'Thema' : 'Topic'}</Label>
              <Input value={meetingForm.topic} onChange={(e) => setMeetingForm((d) => ({ ...d, topic: e.target.value }))} placeholder={loc === 'de' ? 'Worum geht es?' : 'What is it about?'} />
            </div>
            <div className="space-y-2">
              <Label>{loc === 'de' ? 'Gewuenschter Termin' : 'Preferred Date'}</Label>
              <Input type="date" value={meetingForm.preferredDate} onChange={(e) => setMeetingForm((d) => ({ ...d, preferredDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>{loc === 'de' ? 'Anmerkungen' : 'Notes'}</Label>
              <Textarea value={meetingForm.notes} onChange={(e) => setMeetingForm((d) => ({ ...d, notes: e.target.value }))} rows={2} placeholder={loc === 'de' ? 'Zusaetzliche Hinweise...' : 'Additional notes...'} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeetingDialog(false)} className="min-h-[44px]">{t('action.cancel')}</Button>
            <Button onClick={handleRequestMeeting} disabled={submitting || !meetingForm.topic.trim()} className="bg-amber-500 hover:bg-amber-600 text-white min-h-[44px]">
              {submitting ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Phone className="h-4 w-4 mr-1.5" />}
              {t('parent_portal.request_meeting')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
